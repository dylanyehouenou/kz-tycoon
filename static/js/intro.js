/* ==========================================================================
   intro.js — Déroulé de l'intro IMMERSIVE (tout se passe sur les écrans du PC).

   Séquence :
     1) Réveil (flou -> net + paupières) : géré en CSS.
     2) Écran DROIT : bandeau "UTILISATEUR BLOQUÉ" + notif Biscotte d'Océane.
     3) Narration "KZ a tout perdu".
     4) Écran GAUCHE : on clique l'icône "Viens Chercher Argent" -> le site s'ouvre.
     5) On postule ; tout refuse sauf "Professeur à Ynov" -> on rejoint le jeu.
   ========================================================================== */

// --- Les annonces (parodie). Seule Ynov accepte (ok: true). ---
const ANNONCES = [
  { emoji: "💎", titre: "Influenceur crypto",         desc: "Deviens riche en dormant !",                    ok: false, msg: "❌ Refusé : vous avez déjà tout perdu. Ironique." },
  { emoji: "🪑", titre: "Testeur de chaises gaming",   desc: "Payé à rester assis toute la journée.",         ok: false, msg: "❌ Refusé : poste déjà pris par un vrai no-life." },
  { emoji: "🍪", titre: "Modérateur Biscotte (payé)",  desc: "Enfin payé pour ce que tu fais gratuitement.",  ok: false, msg: "❌ Refusé : conflit d'intérêt évident. Beaucoup trop de Biscotte." },
  { emoji: "🐱", titre: "Vendeur de NFT de chats",     desc: "Le web3, soi-disant l'avenir.",                 ok: false, msg: "❌ Refusé : le marché s'est effondré ce matin. Désolé." },
  { emoji: "🌙", titre: "Streamer de 3h du matin",     desc: "0 viewer garanti.",                             ok: false, msg: "❌ Refusé : reviens quand t'as une communauté." },
  { emoji: "🎓", titre: "Professeur à Ynov",           desc: "Formez la future génération (ou pas).",         ok: true,  msg: "✅ Félicitations ! Ynov vous accepte. Vous êtes maintenant PROFESSEUR." },
];

// --- Astuces "troll" (parodie) affichées dans la bulle : elles n'aident JAMAIS. ---
const ASTUCES = [
  "Dylan est inscrit dans la classe. Personne ne l'a jamais vu en cours.",
  "Léonard a dit « j'arrive dans 5 min ». C'était en septembre.",
  "Souffler sur l'écran ne nettoie pas ton casier judiciaire.",
  "La Miata de KZ démarre à la motivation. D'où le problème.",
  "Mot de passe Biscotte : kz1234. Garde-le secret. (Trop tard.)",
  "Cliquer plus vite ne rend pas KZ plus riche. Ni plus beau.",
  "Ynov n'approuve pas et ne connaît pas ce jeu.",
  "Ne range jamais ton bureau : ça fait perdre 2 h de jeu.",
  "Cette astuce arrive à 3 %. Comme Dylan aux examens.",
  "Lire les astuces ne sert à rien. Celle-ci y compris.",
  "Un Neon Rush ne régénère pas ta mana. Tu n'as pas de mana.",
  "Alt+F4 double tes gains. (Surtout, ne fais pas ça.)",
];

// --- Durées (en millisecondes), faciles à ajuster ---
const DUREE_CHARGEMENT = 12000;   // faux chargement entre la vidéo et le spawn (~10-13 s)
const ROTATION_ASTUCE  = 5000;    // on change d'astuce toutes les 5 s
const ROTATION_IMG     = 4200;    // on change de fond + perso dans le loader
const NB_FONDS = 3, NB_PERSOS = 3;

const el = (id) => document.getElementById(id);

// --- Sons (souris + clavier) : petit lecteur réutilisable ---
const SON_CLIC = "/static/sounds/click.mp3";
const SON_CLAVIER = "/static/sounds/keyboard.mp3";
function jouerSon(url, volume) {
  try { const a = new Audio(url); a.volume = (volume == null ? 1 : volume); a.play().catch(() => {}); } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
  initJeu();   // moteur : bureau, navigation, boutique, sommeil, admin, chargement de l'état

  // "Continuer" (reprendre=1) : on saute la cinématique et on reprend la sauvegarde.
  const reprendre = el("intro") && el("intro").dataset.reprendre === "1";
  if (reprendre) {
    reprendrePartie();
  } else {
    // La bulle "Astuce" apparaît tout de suite (visible pendant la vidéo ET le chargement).
    demarrerAstuces();
    // On commence par la VIDÉO d'accroche ; puis le CHARGEMENT ; puis le réveil de KZ.
    lancerVideoPuisReveil();
  }
});

// ==========================================================================
//  MOTEUR DU JEU : économie, décors, jour/nuit, sauvegarde en base.
//  (Sons supplémentaires)
// ==========================================================================
const SON_CASH = "/static/sounds/cash.mp3";              // argent gagné
const SON_SUCCESS = "/static/sounds/success.mp3";       // botw (RÉSERVÉ, pas utilisé pour l'instant)
const SON_ACHIEVEMENT = "/static/sounds/achievement.mp3"; // succès / déblocage
const SON_SPAS = "/static/sounds/spas.mp3";             // supprimer un spam (troll)
const SON_67 = "/static/sounds/67.mp3";                 // Lucas fait "67"
const SON_ERROR = "/static/sounds/error.mp3";           // erreur (mauvaise action)
const SON_POP = "/static/sounds/popsfx.mp3";            // "pop" de la carte Merci chef

// Décors : image + ratio (pour le cadre) + couche interactive
const SCENES = {
  setup:  { bg: "/static/img/backgrounds/setuppov.png",  w: 2752, h: 1536, couche: "scene-setup" },
  garage: { bg: "/static/img/backgrounds/garage.png",    w: 1672, h: 941,  couche: "scene-garage" },
  classe: { bg: "/static/img/backgrounds/classepov.png", w: 2752, h: 1536, couche: "scene-classe" },
};

// Équilibrage (front-end)
const ECO = {
  gainModo: 5, penaliteModo: 3,
  pieces: [
    { id: "batterie", nom: "Batterie NeonCell", prix: 60,  emoji: "🔋" },
    { id: "huile",    nom: "Huile KAZE 5W-30",  prix: 40,  emoji: "🛢️" },
    { id: "bougies",  nom: "Bougies NGK",        prix: 70,  emoji: "🔌" },
    { id: "phares",   nom: "Paire de phares",    prix: 110, emoji: "💡" },
    { id: "pneus",    nom: "Jeu de pneus",       prix: 150, emoji: "🛞" },
    { id: "moteur",   nom: "Bloc moteur",        prix: 280, emoji: "⚙️" },
  ],
  ameliorations: [
    { id: "cafe",      nom: "Café serré ☕",         prix: 40,    bonus: 2,   emoji: "☕" },
    { id: "souris",    nom: "Souris gaming",         prix: 90,    bonus: 3,   emoji: "🖱️" },
    { id: "clavier",   nom: "Clavier mécanique",     prix: 220,   bonus: 8,   emoji: "⌨️" },
    { id: "chaise",    nom: "Chaise gaming",         prix: 350,   bonus: 12,  emoji: "🪑" },
    { id: "bot",       nom: "Bot Biscotte",          prix: 500,   passif: 3,  emoji: "🤖" },
    { id: "dualsc",    nom: "Double écran",          prix: 600,   bonus: 22,  emoji: "🖥️" },
    { id: "stagiaire", nom: "Stagiaire (non payé)",  prix: 900,   passif: 6,  emoji: "🧑‍🎓" },
    { id: "fibre",     nom: "Fibre optique",         prix: 1500,  bonus: 60,  emoji: "🌐" },
    { id: "rtx",       nom: "Carte RTX 5090",        prix: 2500,  bonus: 120, emoji: "🎮" },
    { id: "serveur",   nom: "Ferme de serveurs",     prix: 4000,  passif: 25, emoji: "🖧" },
    { id: "assistant", nom: "Assistant IA « KZ-GPT »", prix: 8000, passif: 70, emoji: "🧠" },
    { id: "empire",    nom: "Empire Biscotte",       prix: 20000, passif: 200, emoji: "🏰" },
  ],
};

// Améliorations de DÉCOR (visuelles). Index des tableaux = NIVEAU visé.
// setup : 3 niveaux (pauvre -> cosy(actuel) -> max). garage : 2 niveaux (pauvre -> pro).
const NIVEAUX = {
  setup: {
    nom: "Setup", emoji: "🖥️", max: 3,
    prix:    [0, 0, 800, 4000],            // coût pour ATTEINDRE le niveau
    mult:    [0, 1, 1.15, 1.35],           // multiplicateur des gains PC (modo + mails)
    libelle: ["", "PC de galère", "Setup cosy", "Battlestation de dictateur"],
    apercu:  ["", "setup1", "setup2", "setup3"],
  },
  garage: {
    nom: "Garage", emoji: "🔧", max: 3,
    prix:    [0, 0, 3000, 12000],
    mult:    [0, 1, 1.25, 1.6],            // multiplicateur du revenu passif
    libelle: ["", "Garage délabré", "Atelier de tuning", "Garage de luxe MAX"],
    apercu:  ["", "garage1", "garage2", "garage3"],
  },
};

// Améliorations vendues par la MÉCANO. Palier 1 (niv 2) puis palier 2 (niv 3, plus cher).
const MECANO_ITEMS = [
  { id: "turbo",  nom: "Turbo compresseur", prix: 3000,  passif: 40,  emoji: "🌀", niv: 2 },
  { id: "nitro",  nom: "Kit Nitro NOS",     prix: 7000,  passif: 90,  emoji: "💨", niv: 2 },
  { id: "echapp", nom: "Échappement néon",  prix: 5000,  bonus: 50,   emoji: "🔥", niv: 2 },
  { id: "v8",     nom: "Swap moteur V8",    prix: 20000, passif: 250, emoji: "🏎️", niv: 3 },
  { id: "aero",   nom: "Kit aéro carbone",  prix: 15000, bonus: 150,  emoji: "🪽", niv: 3 },
  { id: "or",     nom: "Carrosserie dorée", prix: 50000, passif: 600, emoji: "🏆", niv: 3 },
];

// Faux messages Discord à modérer (troll). type "spam" -> Supprimer ; "ok" -> Garder.
const MESSAGES_MODO = [
  { pseudo: "crypto_king_92",  type: "spam", texte: "💎 DOUBLE TON ARGENT EN 24H → bit.ly/pas-une-arnaque" },
  { pseudo: "Dylan",           type: "ok",   texte: "je serai en cours demain promis (mytho)" },
  { pseudo: "freenitro_bot",   type: "spam", texte: "@everyone NITRO GRATUIT 🎁 connecte ton compte ici" },
  { pseudo: "Léonard",         type: "ok",   texte: "quelqu'un a les notes du cours de KZ ?" },
  { pseudo: "h4ck3rman",       type: "spam", texte: "télécharge ce .exe pour des V-Bucks gratuits" },
  { pseudo: "prof_kz",         type: "ok",   texte: "n'oubliez pas le rendu de vendredi." },
  { pseudo: "ronflex_spam",    type: "spam", texte: "AAAAA achète mes NFT de biscuits AAAAAA" },
  { pseudo: "Océane",          type: "ok",   texte: "franchement lâche un peu Biscotte KZ." },
  { pseudo: "vends_compte",    type: "spam", texte: "vends compte lvl 100 dm moi (arnaque garantie)" },
  { pseudo: "etudiant_random", type: "ok",   texte: "la wifi de Ynov marche toujours pas..." },
  { pseudo: "Samy",            type: "ok",   texte: "je serai là dans 10 min (Samy est en retard depuis 2019)" },
  { pseudo: "Samy",            type: "ok",   texte: "le bus était en retard. le bus. pas moi hein." },
  { pseudo: "Billy",           type: "ok",   texte: "on est OBLIGÉ de chercher un stage ? j'ai pas envie…" },
  { pseudo: "Billy",           type: "ok",   texte: "un stage chez mon oncle ça compte ? il a pas d'entreprise" },
  { pseudo: "Etienne",         type: "ok",   texte: "KZ laisse-moi faire le cours à ta place, je gère mieux" },
  { pseudo: "Etienne",         type: "ok",   texte: "j'ai préparé un cours de 2h sur moi-même, ça intéresse ?" },
  { pseudo: "Kevin",           type: "ok",   texte: "quelqu'un pour faire binôme sur le projet ?" },
  { pseudo: "Léa",             type: "ok",   texte: "le rendu c'est pour quand déjà ? 😅" },
  { pseudo: "steam_free",      type: "spam", texte: "🎁 cadeau Steam GRATUIT → steamcommunlty-cadeau.ru" },
  { pseudo: "admin0fficiel",   type: "spam", texte: "sécurité : renvoie ton mot de passe pour vérifier ton compte" },
  { pseudo: "boost_bot",       type: "spam", texte: "+5000 abonnés en 1 clic, paye en carte cadeau 💳" },
  { pseudo: "prime_gratuit",   type: "spam", texte: "réclame ta PRIME de 500€ de l'État → lien-pas-net.co" },
];

let ETAT = {
  argent: 0, patrimoine: 0,
  jour: 1, heure: 8 * 60,
  pieces: {}, miata: false, ameliorations: {},
  debloque: { setup: true, garage: true, classe: false },
  badges: [],
  credibilite: 100,      // baisse si mauvais appel de Dylan
  avion: 0,              // pièces d'avion trouvées (0..10)
  avionRevele: -1,       // index de la pièce actuellement révélée par Léonard (-1 = aucune)
  dylanPresent: true,    // Dylan peut disparaître (séchage) lors des allers-retours
  xp: 0,                 // expérience (donne des niveaux -> +5 % de gains/niveau)
  setupNiveau: 1,        // niveau visuel du bureau (1 pauvre -> 2 actuel -> 3 max)
  garageNiveau: 1,       // niveau visuel du garage (1 pauvre -> 2 max, débloque la mécano)
  mecano: {},            // améliorations bonus achetées à la mécano (garage niv. 2)
};
let EST_ADMIN = false, sceneActive = "setup", msgCourant = null;

function fmtEuro(n) { return Math.floor(n).toLocaleString("fr-FR") + " €"; }
function majArgent() { document.querySelectorAll(".argent-val").forEach(e => e.textContent = fmtEuro(ETAT.argent)); }
// Multiplicateurs des améliorations de DÉCOR.
function setupMult() { return NIVEAUX.setup.mult[ETAT.setupNiveau] || 1; }     // gains PC
function garageMult() { return NIVEAUX.garage.mult[ETAT.garageNiveau] || 1; }  // revenu passif
function mecanoDebloquee() { return ETAT.garageNiveau >= 2; }

function gainParModo() {
  let g = ECO.gainModo;
  ECO.ameliorations.forEach(a => { if (a.bonus && ETAT.ameliorations[a.id]) g += a.bonus; });
  MECANO_ITEMS.forEach(a => { if (a.bonus && ETAT.mecano[a.id]) g += a.bonus; });   // bonus mécano
  return Math.round(g * niveauMult() * setupMult());   // +niveau XP et +niveau setup
}

function gagner(montant, x, y) {
  ETAT.argent += montant; ETAT.patrimoine += Math.max(0, montant);
  majArgent(); jouerSon(SON_CASH, 0.5);
  ajouterXp(Math.max(0, montant));   // gagner de l'argent donne de l'XP
  if (x != null) gainFlottant("+" + fmtEuro(montant), x, y);
  planifierSauvegarde();
}
function gainFlottant(txt, x, y) {
  const d = document.createElement("div");
  d.className = "gain-flottant"; d.textContent = txt;
  d.style.left = x + "px"; d.style.top = y + "px";
  el("intro").appendChild(d); setTimeout(() => d.remove(), 1000);
}
function debloquerBadge(nom) {
  if (ETAT.badges.includes(nom)) return;
  ETAT.badges.push(nom); jouerSon(SON_ACHIEVEMENT, 0.6);   // vrai son de succès (botw réservé)
  montrerLegende("🏆 Succès débloqué : " + nom); planifierSauvegarde();
}

// ---------- Sauvegarde / chargement en BASE ----------
let timerSave = null;
function planifierSauvegarde() { clearTimeout(timerSave); timerSave = setTimeout(sauvegarder, 1200); }
function sauvegarder() {
  fetch("/api/sauver", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      argent: ETAT.argent, patrimoine: ETAT.patrimoine, badges: ETAT.badges,
      etat: { jour: ETAT.jour, heure: ETAT.heure, pieces: ETAT.pieces, miata: ETAT.miata,
              ameliorations: ETAT.ameliorations, debloque: ETAT.debloque,
              credibilite: ETAT.credibilite, avion: ETAT.avion, avionRevele: ETAT.avionRevele,
              dylanPresent: ETAT.dylanPresent, xp: ETAT.xp,
              setupNiveau: ETAT.setupNiveau, garageNiveau: ETAT.garageNiveau, mecano: ETAT.mecano },
    }),
  }).catch(() => {});
}
function chargerEtat() {
  return fetch("/api/etat").then(r => r.json()).then(d => {
    EST_ADMIN = !!d.est_admin;
    ETAT.argent = d.argent || 0; ETAT.patrimoine = d.patrimoine || 0; ETAT.badges = d.badges || [];
    const e = d.etat || {};
    if (e.jour) ETAT.jour = e.jour;
    if (typeof e.heure === "number") ETAT.heure = e.heure;
    ETAT.pieces = e.pieces || {}; ETAT.miata = !!e.miata; ETAT.ameliorations = e.ameliorations || {};
    ETAT.debloque = Object.assign({ setup: true, garage: true, classe: false }, e.debloque || {});
    if (ETAT.miata) ETAT.debloque.classe = true;
    if (typeof e.credibilite === "number") ETAT.credibilite = e.credibilite;
    ETAT.avion = e.avion || 0;
    ETAT.avionRevele = (typeof e.avionRevele === "number") ? e.avionRevele : -1;
    ETAT.dylanPresent = (e.dylanPresent === false) ? false : true;
    ETAT.xp = e.xp || 0;
    ETAT.setupNiveau = Math.min(3, Math.max(1, e.setupNiveau || 1));
    ETAT.garageNiveau = Math.min(3, Math.max(1, e.garageNiveau || 1));
    ETAT.mecano = e.mecano || {};
  }).catch(() => {});
}

// ---------- Bureau : icônes -> fenêtre ----------
function initBureau() {
  document.querySelectorAll(".app-icone").forEach((btn) => {
    btn.addEventListener("click", () => { jouerSon(SON_CLIC, 0.5); ouvrirFenetre(btn.getAttribute("data-app")); });
  });
  el("fenetreFermer").addEventListener("click", () => { jouerSon(SON_CLIC, 0.5); el("fenetre").hidden = true; });
}
function ouvrirFenetre(cle) {
  if (cle === "biscotte") {
    el("fenetreIcone").src = "/static/img/ui/biscotte.png";
    el("fenetreTitre").textContent = "Biscotte — Modération";
    el("fenetreCorps").innerHTML = "";
    el("fenetreCorps").appendChild(construireModo());
  } else if (cle === "mails") {
    el("fenetreIcone").src = ICON_MAIL;
    el("fenetreTitre").textContent = "Mails — Boîte de KZ";
    el("fenetreCorps").innerHTML = "";
    el("fenetreCorps").appendChild(construireMails());
  } else if (cle === "site") {
    el("fenetreIcone").src = "/static/img/ui/logovienchercherargent.png";
    el("fenetreTitre").textContent = "Viens Chercher Argent";
    el("fenetreCorps").innerHTML = htmlSite(); brancherSite();
  } else return;
  el("fenetre").hidden = false;
}

// ---------- Modo Biscotte (faux Discord, troll) ----------
function construireModo() {
  const wrap = document.createElement("div");
  wrap.className = "modo";
  wrap.innerHTML =
    '<div class="modo-intro">🍪 <b>#modération</b> — <b>Supprime</b> les spams 🗑️, <b>Garde</b> les vrais messages ✅. +' + gainParModo() + ' € par bonne décision.</div>' +
    '<div class="modo-msg" id="modoMsg"></div>' +
    '<div class="modo-actions"><button class="modo-garder" id="modoGarder">✅ Garder</button><button class="modo-suppr" id="modoSuppr">🗑️ Supprimer</button></div>' +
    '<div class="modo-feedback" id="modoFeedback"></div>';
  setTimeout(() => {
    prochainMessage();
    el("modoGarder").addEventListener("click", (e) => deciderModo("ok", e));
    el("modoSuppr").addEventListener("click", (e) => deciderModo("spam", e));
  }, 0);
  return wrap;
}
function prochainMessage() {
  const m = el("modoMsg"); if (!m) return;
  msgCourant = MESSAGES_MODO[Math.floor(Math.random() * MESSAGES_MODO.length)];
  m.innerHTML = '<span class="pseudo">' + msgCourant.pseudo + ' :</span> ' + msgCourant.texte;
  jouerSon(SON_CLAVIER, 0.3);
}
function deciderModo(choix, ev) {
  if (!msgCourant) return;
  const fb = el("modoFeedback"), bon = (choix === msgCourant.type);
  if (choix === "spam") jouerSon(SON_SPAS, 0.4); else jouerSon(SON_CLIC, 0.5);
  if (bon) {
    const g = gainParModo();
    gagner(g, ev ? ev.clientX : null, ev ? ev.clientY : null);
    fb.className = "modo-feedback ok"; fb.textContent = "Bien vu ! +" + g + " €";
    if (!ETAT.badges.includes("Premier euro")) debloquerBadge("Premier euro");
  } else {
    jouerSon(SON_ERROR, .5);
    ETAT.argent = Math.max(0, ETAT.argent - ECO.penaliteModo); majArgent(); planifierSauvegarde();
    fb.className = "modo-feedback ko"; fb.textContent = "Raté… -" + ECO.penaliteModo + " €";
  }
  setTimeout(prochainMessage, 500);
}

// ---------- Site "Viens Chercher Argent" (hub d'emploi) ----------
function htmlSite() {
  const ynov = ETAT.miata;
  return '<div style="text-align:left">' +
    '<p style="opacity:.85">💼 <b>Offres d\'emploi</b> (fiables à 2 %)</p>' +
    '<div class="achat-item"><span class="emoji">🍪</span><div class="infos"><div class="nom">Modérateur Biscotte</div><div class="detail">Payé pour supprimer des spams. Ouvre l\'icône Biscotte sur le bureau.</div></div></div>' +
    '<div class="achat-item ' + (ynov ? 'possede' : '') + '"><span class="emoji">🎓</span><div class="infos"><div class="nom">Professeur à Ynov</div><div class="detail">' +
    (ynov ? 'Débloqué ! Ta Miata roule → tu peux aller à Ynov.' : '🔒 Nécessite une voiture qui roule (répare ta Miata au garage).') +
    '</div></div>' + (ynov ? '<button id="allerYnov">Y aller →</button>' : '') + '</div></div>';
}
function brancherSite() {
  const b = el("allerYnov");
  if (b) b.addEventListener("click", () => { jouerSon(SON_CLIC, .5); el("fenetre").hidden = true; allerScene("classe"); });
}

// ---------- Navigation entre décors (menu radial) ----------
function estDebloquee(n) { return !!ETAT.debloque[n]; }
// Image de fond selon la scène ET le niveau de décor (setup 1-3, garage 1-2).
function fondScene(nom) {
  if (nom === "setup")  return "/static/img/backgrounds/setup" + ETAT.setupNiveau + ".png";
  if (nom === "garage") return "/static/img/backgrounds/garage" + ETAT.garageNiveau + ".png";
  return SCENES[nom].bg;
}
function allerScene(nom) {
  const s = SCENES[nom]; if (!s) return;
  if (!estDebloquee(nom)) { jouerSon(SON_CLIC, .25); montrerLegende("🔒 Zone verrouillée pour l'instant."); return; }
  jouerSon(SON_CLIC, .5);
  const scene = el("scene");
  scene.style.setProperty("--scw", s.w);
  scene.style.setProperty("--sch", s.h);
  scene.style.setProperty("--scene-bg", "url('" + fondScene(nom) + "')");
  document.querySelectorAll(".couche-scene").forEach(c => c.hidden = true);
  el(s.couche).hidden = false;
  sceneActive = nom;
  if (nom === "garage") { rendreGarage(); majMecano(); }
  if (nom === "classe") entrerClasse();
  majVoileNuit();   // l'assombrissement de nuit ne s'applique qu'au setup et au garage
  majNavRadial(); fermerRadial();
}
function majNavRadial() {
  document.querySelectorAll(".nav-scene").forEach(b => {
    const n = b.getAttribute("data-scene");
    b.classList.toggle("actif", n === sceneActive);
    b.classList.toggle("verrou", !estDebloquee(n));
  });
}
function fermerRadial() { el("navRadial").classList.remove("ouvert"); }
function initNav() {
  el("navBouton").addEventListener("click", () => { jouerSon(SON_CLIC, .5); el("navRadial").classList.toggle("ouvert"); });
  document.querySelectorAll(".nav-scene").forEach(b => b.addEventListener("click", () => allerScene(b.getAttribute("data-scene"))));
  majNavRadial();
}

// ---------- Garage : réparer la Miata (acheter les pièces) ----------
function rendreGarage() {
  const total = ECO.pieces.length, posees = ECO.pieces.filter(p => ETAT.pieces[p.id]).length;
  const pct = Math.round((posees / total) * 100);
  let html = '<h2>🔧 Réparer la Miata</h2><div class="detail" style="opacity:.8">Achète les pièces pour la remettre en route.</div>' +
    '<div class="miata-jauge"><i style="width:' + pct + '%"></i></div><div style="margin:6px 0 12px;font-size:13px;opacity:.8">' + posees + '/' + total + ' pièces posées</div>';
  ECO.pieces.forEach(p => {
    const owned = ETAT.pieces[p.id];
    html += '<div class="achat-item ' + (owned ? 'possede' : '') + '"><span class="emoji">' + p.emoji + '</span><div class="infos"><div class="nom">' + p.nom + '</div><div class="detail">' + fmtEuro(p.prix) + '</div></div>' +
      (owned ? '<button disabled>✅ Posée</button>' : '<button data-piece="' + p.id + '">Acheter</button>') + '</div>';
  });
  if (ETAT.miata) html += '<div style="margin-top:8px;color:var(--succes);font-weight:800">🏁 Miata réparée ! Va sur « Viens Chercher Argent » → Professeur à Ynov.</div>';
  const pan = el("garagePanneau"); pan.innerHTML = html;
  pan.querySelectorAll("button[data-piece]").forEach(b => b.addEventListener("click", () => acheterPiece(b.getAttribute("data-piece"))));
}
function acheterPiece(id) {
  const p = ECO.pieces.find(x => x.id === id); if (!p || ETAT.pieces[id]) return;
  if (ETAT.argent < p.prix) { jouerSon(SON_CLIC, .25); montrerLegende("Pas assez d'argent pour " + p.nom + "."); return; }
  ETAT.argent -= p.prix; majArgent(); jouerSon(SON_CASH, .5); ETAT.pieces[id] = true;
  if (ECO.pieces.every(x => ETAT.pieces[x.id])) {
    ETAT.miata = true; ETAT.debloque.classe = true; debloquerBadge("Miata réparée"); majNavRadial();
  }
  planifierSauvegarde(); rendreGarage();
}

// ---------- Boutique d'améliorations ----------
function initBoutique() {
  el("btnBoutique").addEventListener("click", () => { jouerSon(SON_CLIC, .5); rendreBoutique(); el("modalBoutique").classList.add("visible"); });
  el("fermerBoutique").addEventListener("click", () => { jouerSon(SON_CLIC, .5); el("modalBoutique").classList.remove("visible"); });
}
function rendreBoutique() {
  let html = "";
  ECO.ameliorations.forEach(a => {
    const owned = ETAT.ameliorations[a.id];
    const eff = a.bonus ? ("+" + a.bonus + " € / action") : ("+" + a.passif + " € / sec (auto)");
    html += '<div class="achat-item ' + (owned ? 'possede' : '') + '"><span class="emoji">' + a.emoji + '</span><div class="infos"><div class="nom">' + a.nom + '</div><div class="detail">' + eff + ' · ' + fmtEuro(a.prix) + '</div></div>' +
      (owned ? '<button disabled>✅ Acheté</button>' : '<button data-amel="' + a.id + '">Acheter</button>') + '</div>';
  });
  const liste = el("boutiqueListe"); liste.innerHTML = html;
  liste.querySelectorAll("button[data-amel]").forEach(b => b.addEventListener("click", () => acheterAmelioration(b.getAttribute("data-amel"))));
}
function acheterAmelioration(id) {
  const a = ECO.ameliorations.find(x => x.id === id); if (!a || ETAT.ameliorations[id]) return;
  if (ETAT.argent < a.prix) { jouerSon(SON_CLIC, .25); montrerLegende("Pas assez d'argent."); return; }
  ETAT.argent -= a.prix; majArgent(); jouerSon(SON_CASH, .5); ETAT.ameliorations[id] = true;
  debloquerBadge("Setup amélioré"); planifierSauvegarde(); rendreBoutique();
}

// ==========================================================================
//  AMÉLIORATIONS DE DÉCOR (setup / garage) : modale avec cartes + cadenas.
// ==========================================================================
function initUpgrade() {
  el("btnUpgrade").addEventListener("click", () => { jouerSon(SON_CLIC, .5); rendreUpgrade(); el("modalUpgrade").classList.add("visible"); });
  el("fermerUpgrade").addEventListener("click", () => { jouerSon(SON_CLIC, .5); el("modalUpgrade").classList.remove("visible"); });
}
function rendreUpgrade() {
  el("upgradeCorps").innerHTML = blocNiveaux("setup") + blocNiveaux("garage");
  el("upgradeCorps").querySelectorAll("button[data-up]").forEach(b =>
    b.addEventListener("click", () => acheterNiveau(b.getAttribute("data-up"))));
}
// Un bloc = un type de décor, avec une carte par niveau (fait / actuel / suivant / verrouillé).
function blocNiveaux(cle) {
  const cfg = NIVEAUX[cle], cur = (cle === "setup") ? ETAT.setupNiveau : ETAT.garageNiveau;
  let cartes = "";
  for (let n = 1; n <= cfg.max; n++) {
    const etat = (n < cur) ? "fait" : (n === cur) ? "actuel" : (n === cur + 1) ? "suivant" : "verrou";
    const pct = Math.round((cfg.mult[n] - 1) * 100);
    const bonus = (cle === "setup" ? "+" + pct + "% gains PC" : "+" + pct + "% revenu passif");
    let action;
    if (etat === "fait")         action = '<span class="up-tag ok">✅ Débloqué</span>';
    else if (etat === "actuel")  action = '<span class="up-tag now">⭐ Niveau actuel</span>';
    else if (etat === "suivant") action = '<button class="up-buy" data-up="' + cle + '">Améliorer — ' + fmtEuro(cfg.prix[n]) + '</button>';
    else                         action = '<span class="up-tag lock">🔒 Verrouillé</span>';
    cartes += '<div class="up-carte ' + etat + '">' +
      '<div class="up-thumb" style="background-image:url(/static/img/backgrounds/' + cfg.apercu[n] + '.png)">' +
        (etat === "verrou" ? '<span class="up-cadenas">🔒</span>' : '') + '</div>' +
      '<div class="up-info"><div class="up-nom">Niv ' + n + ' · ' + cfg.libelle[n] + '</div>' +
      '<div class="up-bonus">' + (n === 1 ? "Niveau de départ" : bonus) + '</div>' + action + '</div></div>';
  }
  return '<h3 class="up-titre">' + cfg.emoji + ' ' + cfg.nom + '</h3><div class="up-grille">' + cartes + '</div>';
}
function acheterNiveau(cle) {
  const cfg = NIVEAUX[cle];
  const cur = (cle === "setup") ? ETAT.setupNiveau : ETAT.garageNiveau;
  const cible = cur + 1;
  if (cible > cfg.max) return;
  const prix = cfg.prix[cible];
  if (ETAT.argent < prix) { jouerSon(SON_CLIC, .25); montrerLegende("Pas assez d'argent pour améliorer le " + cfg.nom.toLowerCase() + "."); return; }
  ETAT.argent -= prix; majArgent(); jouerSon(SON_CASH, .5);
  if (cle === "setup") ETAT.setupNiveau = cible; else ETAT.garageNiveau = cible;
  debloquerBadge(cfg.nom + " amélioré");
  if (sceneActive === cle) el("scene").style.setProperty("--scene-bg", "url('" + fondScene(cle) + "')");
  if (cle === "garage") { majMecano(); if (cible === 2) montrerLegende("🔧 Une mécano débarque au garage ! Va la voir pour des améliorations bonus."); }
  planifierSauvegarde(); rendreUpgrade();
}

// ==========================================================================
//  MÉCANO (Schanice) : vendeuse d'améliorations bonus, apparaît au garage niveau 2.
// ==========================================================================
function initMecano() {
  const m = el("mecano"); if (m) m.addEventListener("click", () => { jouerSon(SON_CLIC, .5); rendreMecano(); el("modalMecano").classList.add("visible"); });
  const f = el("fermerMecano"); if (f) f.addEventListener("click", () => { jouerSon(SON_CLIC, .5); el("modalMecano").classList.remove("visible"); });
}
function majMecano() {
  const m = el("mecano"); if (m) m.hidden = !(sceneActive === "garage" && mecanoDebloquee());
}
function rendreMecano() {
  let html = '<div class="meca-intro"><img src="/static/img/ui/mecanogirl.png" alt="Schanice">' +
    '<div><b>Schanice</b>, la mécano.<br><span class="sous">« Tu répares la caisse, moi je la rends MÉCHANTE. Chaque pièce booste ton revenu passif. »</span></div></div>';
  MECANO_ITEMS.forEach(a => {
    const owned = ETAT.mecano[a.id];
    const verrou = a.niv > ETAT.garageNiveau;   // palier 2 = garage niveau 3
    const eff = a.bonus ? ("+" + a.bonus + " € / action") : ("+" + a.passif + " € / sec (auto)");
    let btn;
    if (verrou)     btn = '<button disabled>🔒 Garage niv ' + a.niv + '</button>';
    else if (owned) btn = '<button disabled>✅ Posée</button>';
    else            btn = '<button data-meca="' + a.id + '">Acheter</button>';
    html += '<div class="achat-item ' + (owned ? 'possede' : '') + (verrou ? ' verrou-meca' : '') + '"><span class="emoji">' + a.emoji + '</span><div class="infos"><div class="nom">' + a.nom + '</div><div class="detail">' + eff + ' · ' + fmtEuro(a.prix) + '</div></div>' +
      btn + '</div>';
  });
  el("mecanoCorps").innerHTML = html;
  el("mecanoCorps").querySelectorAll("button[data-meca]").forEach(b => b.addEventListener("click", () => acheterMecano(b.getAttribute("data-meca"))));
}
function acheterMecano(id) {
  const a = MECANO_ITEMS.find(x => x.id === id); if (!a || ETAT.mecano[id] || a.niv > ETAT.garageNiveau) return;
  if (ETAT.argent < a.prix) { jouerSon(SON_CLIC, .25); montrerLegende("Pas assez d'argent."); return; }
  ETAT.argent -= a.prix; majArgent(); jouerSon(SON_CASH, .5); ETAT.mecano[id] = true;
  debloquerBadge("Miata boostée"); planifierSauvegarde(); rendreMecano();
}

// ==========================================================================
//  APPLI MAILS (bureau du PC) : trier vrais mails vs phishing/arnaques (troll).
// ==========================================================================
const ICON_MAIL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='2' y='4.5' width='20' height='15' rx='2.5' fill='%23F5A623'/%3E%3Cpath d='M3 6l9 6.5L21 6' fill='none' stroke='%235B2A86' stroke-width='2.2'/%3E%3C/svg%3E";
const MAILS = [
  { exp: "Ynov Admin",          type: "ok",       sujet: "Rappel de rendu",            corps: "Le projet Semaine Startup est à rendre vendredi. Pas d'excuse (Dylan, on te voit)." },
  { exp: "no-reply@1ntox.ru",   type: "phishing", sujet: "🚗 Ta Miata a GAGNÉ un prix !", corps: "Réclame 5000 € de pièces gratuites : entre juste ton IBAN et ta CB ici." },
  { exp: "securite-biscotte",   type: "phishing", sujet: "Compte bloqué",              corps: "Ton compte Biscotte est suspendu. Renvoie ton mot de passe pour le débloquer." },
  { exp: "Océane",              type: "ok",       sujet: "Alors ce voyage ?",          corps: "Répare ta Miata et viens me chercher ✈️❤️ (et lâche Biscotte 2 minutes)." },
  { exp: "CAF-remboursement",   type: "phishing", sujet: "Remboursement 431,20 €",     corps: "Vous êtes éligible à un remboursement. Confirmez votre carte bancaire ici." },
  { exp: "Prince du Wakanda",   type: "phishing", sujet: "AFFAIRE CONFIDENTIELLE",      corps: "Je dois transférer 12 millions €. Tu touches 30 %. Envoie 200 € de frais d'abord." },
  { exp: "Léonard",             type: "ok",       sujet: "Rapport de mission",         corps: "Chef, j'ai repéré 3 pièces d'avion en salle. Permission d'engager ?" },
  { exp: "ynov-diplome.verify", type: "phishing", sujet: "Validez votre diplôme",      corps: "Cliquez pour valider votre diplôme. (Ynov ne fait JAMAIS ça.)" },
  { exp: "Neon Rush",           type: "ok",       sujet: "Sponsoring",                 corps: "On t'offre 50 € si tu bois une canette en plein cours. Cash facile." },
  { exp: "steamgift-free.ru",   type: "phishing", sujet: "🎁 Jeu offert",              corps: "Steam t'offre un jeu ! Connecte ton compte via ce lien pas-officiel." },
  { exp: "Dylan",               type: "ok",       sujet: "je serai là promis",         corps: "M'sieur je viens demain juré (envoyé depuis son lit, 14h)." },
  { exp: "impots-gouv.co",      type: "phishing", sujet: "Trop-perçu à récupérer",     corps: "Un trop-perçu de 288 € vous attend. Saisissez vos identifiants bancaires." },
];
let mailCourant = null;
function construireMails() {
  const wrap = document.createElement("div");
  wrap.className = "modo mails";
  wrap.innerHTML =
    '<div class="modo-intro">📧 <b>Boîte mail de KZ</b> — <b>Garde</b> les vrais mails 📩, <b>Signale</b> les arnaques/phishing 🚨. +' + gainParModo() + ' € par bon tri.</div>' +
    '<div class="mail-carte" id="mailCarte"></div>' +
    '<div class="modo-actions"><button class="modo-garder" id="mailGarder">📩 Garder</button><button class="modo-suppr" id="mailSuppr">🚨 Signaler</button></div>' +
    '<div class="modo-feedback" id="mailFeedback"></div>';
  setTimeout(() => {
    prochainMail();
    el("mailGarder").addEventListener("click", (e) => deciderMail("ok", e));
    el("mailSuppr").addEventListener("click", (e) => deciderMail("phishing", e));
  }, 0);
  return wrap;
}
function prochainMail() {
  const m = el("mailCarte"); if (!m) return;
  mailCourant = MAILS[Math.floor(Math.random() * MAILS.length)];
  m.innerHTML = '<div class="mail-tete">De : <b>' + mailCourant.exp + '</b></div>' +
    '<div class="mail-sujet">' + mailCourant.sujet + '</div><div class="mail-corps">' + mailCourant.corps + '</div>';
  jouerSon(SON_CLAVIER, 0.25);
}
function deciderMail(choix, ev) {
  if (!mailCourant) return;
  const fb = el("mailFeedback"), bon = (choix === mailCourant.type);
  if (choix === "phishing") jouerSon(SON_SPAS, 0.4); else jouerSon(SON_CLIC, 0.5);
  if (bon) {
    const g = gainParModo();
    gagner(g, ev ? ev.clientX : null, ev ? ev.clientY : null);
    fb.className = "modo-feedback ok"; fb.textContent = (mailCourant.type === "phishing" ? "🚨 Phishing bloqué ! +" : "📩 Bien trié ! +") + g + " €";
    if (!ETAT.badges.includes("Anti-phishing")) debloquerBadge("Anti-phishing");
  } else {
    jouerSon(SON_ERROR, .5);
    const perte = (mailCourant.type === "phishing") ? 20 : ECO.penaliteModo;   // se faire avoir coûte plus cher
    ETAT.argent = Math.max(0, ETAT.argent - perte); majArgent(); planifierSauvegarde();
    fb.className = "modo-feedback ko"; fb.textContent = (mailCourant.type === "phishing" ? "😱 Arnaque ! Tu t'es fait avoir : -" : "Raté… -") + perte + " €";
  }
  setTimeout(prochainMail, 600);
}

// ==========================================================================
//  CLASSE (Acte 2) : Dylan (appel), Léonard (indices avion), Lucas (67).
// ==========================================================================
const AVION_SPOTS = [
  { left: "80%", top: "30%", indice: "Recrue ! Un morceau traîne près du grand tableau blanc." },
  { left: "10%", top: "44%", indice: "Objectif repéré : dans l'étagère à magazines, à gauche." },
  { left: "13%", top: "80%", indice: "Sous le canapé bleu. Baisse-toi, soldat." },
  { left: "47%", top: "44%", indice: "Près de la porte de secours jaune, au fond." },
  { left: "50%", top: "84%", indice: "Sur la tablette graphique, juste devant toi." },
  { left: "89%", top: "42%", indice: "Contre la fenêtre de droite. Ne tombe pas." },
  { left: "62%", top: "80%", indice: "Coincé sous une chaise bleue au centre." },
  { left: "38%", top: "56%", indice: "Sur les casiers du fond, planqué." },
  { left: "27%", top: "68%", indice: "À côté du bureau de Lucas (il n'a rien vu)." },
  { left: "55%", top: "13%", indice: "Au plafond, dans les gaines. Mission commando." },
];

function majCred() { const e = el("credVal"); if (e) e.textContent = Math.max(0, Math.round(ETAT.credibilite)); }
function majAvion() { const e = el("avionVal"); if (e) e.textContent = ETAT.avion; }
// Position d'une pièce dans le sprite (5 colonnes x 2 lignes)
function spritePos(i) { const col = i % 5, row = Math.floor(i / 5); return (col * 25) + "% " + (row * 100) + "%"; }

function initClasse() {
  document.querySelectorAll(".perso-zone").forEach(z => {
    z.addEventListener("click", () => {
      const p = z.getAttribute("data-perso");
      if (p === "lucas") lucas67();
      else if (p === "dylan") ouvrirAppel();
      else if (p === "leonard") leonardIndice();
    });
  });
  el("avionPart").addEventListener("click", collecterPart);
  el("fermerAppel").addEventListener("click", () => { jouerSon(SON_CLIC, .5); el("modalAppel").classList.remove("visible"); });
  el("btnAvion").addEventListener("click", () => { jouerSon(SON_CLIC, .5); ouvrirAvion(); });
  el("fermerAvion").addEventListener("click", () => { jouerSon(SON_CLIC, .5); el("modalAvion").classList.remove("visible"); });
  el("btnPunir").addEventListener("click", punirEleve);
  el("btnSignaler").addEventListener("click", signalerDylan);
}

// ---- Système de PUNITION (revenu au tableau) + repérage de Dylan absent ----
const PUNITIONS = [
  "Colle pour Dylan !", "Deux heures de retenue !", "Copie 100 fois « je serai à l'heure »",
  "Exclu du Discord pédagogique", "Privé de pause", "Un mot dans le carnet !",
  "Interro surprise pour tout le monde", "Ramassage des copies immédiat",
];
function punirEleve() {
  const g = gainParModo();   // même gain que la modération (boosté par la boutique)
  gagner(g);
  montrerLegende("🔨 " + PUNITIONS[Math.floor(Math.random() * PUNITIONS.length)] + " +" + g + " €");
}
function signalerDylan() {
  if (!ETAT.dylanPresent) {
    gagner(80);
    ETAT.dylanPresent = true;
    ETAT.credibilite = Math.min(100, ETAT.credibilite + 5); majCred();
    appliquerDylan(); planifierSauvegarde();
    jouerSon(SON_ACHIEVEMENT, .6);
    montrerLegende("👀 Bien vu ! Dylan avait séché → tu le signales. +80 € !");
    if (!ETAT.badges.includes("Radar à absents")) debloquerBadge("Radar à absents");
  } else {
    jouerSon(SON_ERROR, .6);
    ETAT.credibilite = Math.max(0, ETAT.credibilite - 5); majCred();
    planifierSauvegarde();
    montrerLegende("🙄 Fausse alerte : Dylan est là. -5 crédibilité.");
  }
}

// (Ré)entrée dans la classe : réaffiche la pièce révélée si pas encore ramassée.
function rendreClasse() {
  const part = el("avionPart");
  if (ETAT.avion < 10 && ETAT.avionRevele >= 0) {
    const s = AVION_SPOTS[ETAT.avionRevele];
    part.style.left = s.left; part.style.top = s.top; part.hidden = false;
  } else { part.hidden = true; }
  appliquerDylan();
}

// Présence de Dylan : gère sa zone, puis délègue le choix du décor à majDecorClasse.
function appliquerDylan() {
  const zd = el("zoneDylan"); if (zd) zd.style.display = ETAT.dylanPresent ? "" : "none";
  majDecorClasse();
}

// Décide le décor de la classe : fantôme (après 3 h) OU classe normale (avec/sans Dylan).
function majDecorClasse() {
  const fz = el("fantomeZone");
  if (sceneActive !== "classe") { if (fz) fz.hidden = true; return; }
  const fantome = (ETAT.heure >= HEURE_FANTOME);
  if (fz) fz.hidden = !fantome;
  let bg;
  if (fantome) {
    bg = "/static/img/backgrounds/classnuitfantom.png";   // classe de nuit + fantôme
  } else {
    bg = ETAT.dylanPresent ? "/static/img/backgrounds/classepov.png"
                           : "/static/img/backgrounds/classepovsandylan.png";
  }
  el("scene").style.setProperty("--scene-bg", "url('" + bg + "')");
}

// Entrée dans la classe : un aller-retour peut faire disparaître Dylan (il sèche).
function entrerClasse() {
  if (ETAT.dylanPresent && Math.random() < 0.4) { ETAT.dylanPresent = false; planifierSauvegarde(); }
  rendreClasse();
}

// ---- Lucas : "67" + bascule d'écran gauche-droite ----
function lucas67() {
  jouerSon(SON_67, 0.7);
  const z = el("zoom");
  z.classList.remove("sway67"); void z.offsetWidth; z.classList.add("sway67");
  setTimeout(() => z.classList.remove("sway67"), 1600);
  montrerLegende("Lucas : « 6‑7 » 🤷");
}

// ---- Léonard : donne un indice et révèle la prochaine pièce ----
function leonardIndice() {
  if (ETAT.avion >= 10) { montrerLegende("Léonard : « Mission accomplie, l'avion est complet ! »"); return; }
  ETAT.avionRevele = ETAT.avion;
  const s = AVION_SPOTS[ETAT.avionRevele], part = el("avionPart");
  part.style.left = s.left; part.style.top = s.top; part.hidden = false;
  montrerLegende("🎖️ Léonard : « " + s.indice + " » (clique l'étoile ⭐)");
  planifierSauvegarde();
}
function collecterPart() {
  if (ETAT.avion >= 10) return;
  ETAT.avion += 1; ETAT.avionRevele = -1;
  el("avionPart").hidden = true; jouerSon(SON_ACHIEVEMENT, 0.6); majAvion();
  if (ETAT.avion >= 10) {
    debloquerBadge("Avion complet ✈️");
    montrerLegende("🎉 Avion terminé ! KZ peut voyager avec Océane quand il veut ✈️❤️");
  } else {
    montrerLegende("✈️ Pièce " + ETAT.avion + "/10 récupérée ! Retourne voir Léonard.");
  }
  planifierSauvegarde();
  if (el("modalAvion").classList.contains("visible")) rendreAvion();
}
function ouvrirAvion() { rendreAvion(); el("modalAvion").classList.add("visible"); }
function rendreAvion() {
  let html = '<div class="miata-jauge"><i style="width:' + (ETAT.avion * 10) + '%"></i></div>' +
    '<p class="sous">' + ETAT.avion + '/10 pièces. Va voir <b>Léonard</b> (le militaire) pour un indice, puis clique la pièce dans la classe.</p>';
  for (let i = 0; i < 10; i++) {
    const ok = i < ETAT.avion;
    html += '<div class="achat-item ' + (ok ? 'possede' : '') + '"><div class="piece-thumb ' + (ok ? '' : 'manquante') + '" style="background-position:' + spritePos(i) + '"></div><div class="infos"><div class="nom">Pièce ' + (i + 1) + '</div><div class="detail">' + (ok ? 'Trouvée' : 'À trouver') + '</div></div></div>';
  }
  if (ETAT.avion >= 10) html += '<div style="margin-top:10px;color:var(--succes);font-weight:800">🛩️ Avion complet : KZ voyage avec Océane quand il veut !</div><img class="avion-fini" src="/static/img/ui/avioncomplet.png" alt="Avion complet">';
  el("avionCorps").innerHTML = html;
}

// ---- Dylan : compter les absences (appel) ----
let appelReponse = 0;
function ouvrirAppel() {
  const nbCases = 14;
  appelReponse = 2 + Math.floor(Math.random() * 6);      // 2..7 absences
  const cases = [];
  for (let i = 0; i < nbCases; i++) cases.push(i < appelReponse ? "❌" : "✅");
  for (let i = cases.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = cases[i]; cases[i] = cases[j]; cases[j] = t; }
  const choix = new Set([appelReponse]);
  while (choix.size < 4) { choix.add(Math.max(0, appelReponse + (Math.floor(Math.random() * 7) - 3))); }
  const choixArr = Array.from(choix).sort((a, b) => a - b);
  const html = '<p class="sous">Registre de présence de <b>Dylan</b>. Compte ses absences (❌) et fais le check‑in.</p>' +
    '<div class="appel-grille">' + cases.map(c => '<div class="appel-case">' + c + '</div>').join("") + '</div>' +
    '<div class="appel-choix">' + choixArr.map(n => '<button data-rep="' + n + '">' + n + ' absences</button>').join("") + '</div>' +
    '<div class="appel-res" id="appelRes"></div>';
  el("appelCorps").innerHTML = html;
  el("appelCorps").querySelectorAll("button[data-rep]").forEach(b => b.addEventListener("click", () => validerAppel(parseInt(b.getAttribute("data-rep"), 10))));
  el("modalAppel").classList.add("visible");
}
function validerAppel(rep) {
  const res = el("appelRes");
  el("appelCorps").querySelectorAll("button[data-rep]").forEach(b => b.disabled = true);
  if (rep === appelReponse) {
    gagner(25);
    ETAT.credibilite = Math.min(100, ETAT.credibilite + 3); majCred();
    res.className = "appel-res ok"; res.textContent = "✅ Bon compte ! +25 € (Dylan est démasqué).";
    if (!ETAT.badges.includes("Prof rigoureux")) debloquerBadge("Prof rigoureux");
  } else {
    jouerSon(SON_ERROR, .6);
    ETAT.argent = Math.max(0, ETAT.argent - 15); majArgent();
    ETAT.credibilite = Math.max(0, ETAT.credibilite - 10); majCred();
    res.className = "appel-res ko"; res.textContent = "❌ Faux ! C'était " + appelReponse + " absences. -15 € et -10 crédibilité.";
    planifierSauvegarde();
  }
  // Actualise DIRECT : un nouveau registre apparaît juste après (si la modale reste ouverte).
  setTimeout(() => { if (el("modalAppel").classList.contains("visible")) ouvrirAppel(); }, 1300);
}

// ==========================================================================
//  ÉVÉNEMENTS ALÉATOIRES + XP/NIVEAUX + REVENU PASSIF.
// ==========================================================================
const EVENEMENTS = [
  { emoji: "🕵️", titre: "Inspection Ynov",   texte: "Amende pour « ambiance trop détendue ».", argent: -40 },
  { emoji: "📶", titre: "Panne de wifi",     texte: "Le wifi de Ynov lâche. Panique générale.", argent: -15 },
  { emoji: "❤️", titre: "Océane t'écrit",    texte: "« Reviens vite ✈️ » — KZ est reboosté !", argent: 30, cred: 3 },
  { emoji: "🥤", titre: "Sponsor Neon Rush", texte: "Neon Rush sponsorise ta classe. Cash facile.", argent: 50 },
  { emoji: "🍪", titre: "Biscotte en panne", texte: "Serveurs Biscotte down : tes modos boudent.", argent: -20 },
  { emoji: "💸", titre: "Prime surprise",    texte: "Ynov verse une prime « performance douteuse ».", argent: 35 },
  { emoji: "🚔", titre: "PV sur la Miata",   texte: "Stationnement gênant. La Miata prend un PV.", argent: -25 },
  { emoji: "🏆", titre: "Élève de l'année",  texte: "Étienne se déclare élève de l'année. Personne n'a voté.", cred: 1 },
  { emoji: "😴", titre: "Coup de mou",       texte: "Nuit blanche sur Biscotte. Tu bâilles en cours.", cred: -3 },
  { emoji: "😱", titre: "Dylan revient !",   texte: "Incroyable : Dylan est en cours. Standing ovation.", cred: 2, special: "dylanRevient" },
  { emoji: "🎁", titre: "Colis mystère",     texte: "Un carton « LEONARD LE CHEF » arrive. Bonus !", argent: 45 },
  { emoji: "🐛", titre: "Bug de notes",      texte: "Tu mets 20 à toute la classe par erreur. Ils t'adorent.", cred: 4 },
];
function declencherEvenement() {
  if (!reveilLance || jumpscareEnCours) return;   // pas d'événement pendant un jumpscare
  const ev = EVENEMENTS[Math.floor(Math.random() * EVENEMENTS.length)];
  if (ev.argent > 0) gagner(ev.argent);
  else if (ev.argent < 0) { ETAT.argent = Math.max(0, ETAT.argent + ev.argent); majArgent(); jouerSon(SON_ERROR, .5); }
  if (ev.cred) { ETAT.credibilite = Math.max(0, Math.min(100, ETAT.credibilite + ev.cred)); majCred(); }
  if (ev.special === "dylanRevient") { ETAT.dylanPresent = true; appliquerDylan(); }
  afficherEvenement(ev); planifierSauvegarde();
}
function afficherEvenement(ev) {
  el("evEmoji").textContent = ev.emoji;
  el("evTitre").textContent = ev.titre;
  const suff = ev.argent ? "  (" + (ev.argent > 0 ? "+" : "") + ev.argent + " €)"
             : ev.cred ? "  (" + (ev.cred > 0 ? "+" : "") + ev.cred + " crédibilité)" : "";
  el("evTexte").textContent = ev.texte + suff;
  const e = el("evenement"); e.hidden = false;
  requestAnimationFrame(() => e.classList.add("visible"));
  clearTimeout(e._t); e._t = setTimeout(() => { e.classList.remove("visible"); setTimeout(() => { e.hidden = true; }, 400); }, 4800);
}
let timerEvent = null;
function initEvenements() {
  clearInterval(timerEvent);
  timerEvent = setInterval(declencherEvenement, 70000);   // ~toutes les 70 s
  setTimeout(declencherEvenement, 25000);                 // un premier vers 25 s
}

// --- XP / niveaux : chaque euro gagné = 1 XP ; chaque niveau = +5 % de gains ---
const NIVEAU_MAX = 999;   // plafond (sécurité anti-boucle + cheat admin "Nv Max")
function niveauDepuisXp(xp) { let n = 1, seuil = 150; while (xp >= seuil && n < NIVEAU_MAX) { xp -= seuil; n++; seuil = Math.floor(seuil * 1.35); } return { niveau: n, xpDansNiveau: xp, seuil: seuil }; }
function niveauMult() { return 1 + (niveauDepuisXp(ETAT.xp).niveau - 1) * 0.05; }
function majXp() {
  const info = niveauDepuisXp(ETAT.xp);
  const nv = el("niveauVal"); if (nv) nv.textContent = info.niveau;
  const bar = el("xpBarre"); if (bar) bar.style.width = Math.min(100, (info.xpDansNiveau / info.seuil) * 100) + "%";
}
function ajouterXp(montant) {
  if (montant <= 0) return;
  const avant = niveauDepuisXp(ETAT.xp).niveau;
  ETAT.xp += montant;
  const apres = niveauDepuisXp(ETAT.xp);
  majXp();
  if (apres.niveau > avant) { jouerSon(SON_ACHIEVEMENT, .5); montrerLegende("⬆️ Niveau " + apres.niveau + " ! Tes gains augmentent (+5 %/niveau)."); }
}

// --- Revenu passif : matériel qui rapporte tout seul, chaque seconde ---
function revenuPassif() {
  let p = 0;
  ECO.ameliorations.forEach(a => { if (a.passif && ETAT.ameliorations[a.id]) p += a.passif; });
  MECANO_ITEMS.forEach(a => { if (a.passif && ETAT.mecano[a.id]) p += a.passif; });   // pièces mécano
  return Math.round(p * garageMult());   // bonus de niveau du garage
}

// ---------- Jour / nuit : le temps NE bloque PLUS (KZ peut se balader la nuit) ----------
const HEURE_FANTOME = 3 * 60 + 24 * 60;   // 3 h du matin = 1620 min (le fantôme apparaît)
let horlogeLancee = false;
function demarrerHorloge() {
  if (horlogeLancee) return; horlogeLancee = true; majHorloge();
  setInterval(() => {
    if (jumpscareEnCours) return;                           // temps figé pendant le jumpscare
    ETAT.heure += 3;                                        // 3 min de jeu / seconde réelle
    const pas = revenuPassif();                             // matériel qui rapporte tout seul
    if (pas > 0) { ETAT.argent += pas; ETAT.patrimoine += pas; majArgent(); }
    majHorloge();                                           // le temps continue APRÈS minuit
    majRappelNuit();                                        // rappel "va dormir" (non bloquant)
    majAmbianceNuit();                                      // son d'ambiance à partir de minuit
    majMusiqueJeu();                                        // musique de fond en journée
    if (sceneActive === "classe") majDecorClasse();         // fait apparaître le fantôme à 3 h
  }, 1000);
}
function majHorloge() {
  const h = Math.floor(ETAT.heure / 60) % 24, m = ETAT.heure % 60;
  el("hudHeure").textContent = (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  el("hudJour").textContent = ETAT.jour;
  majVoileNuit();
}
// Assombrissement de nuit : UNIQUEMENT sur le setup et le garage, et pas trop fort
// (plafond bas -> le décor reste bien visible). La classe garde sa propre ambiance.
function majVoileNuit() {
  let opac = 0;
  const decorSombrable = (sceneActive === "setup" || sceneActive === "garage");
  if (decorSombrable && ETAT.heure > 19 * 60) {
    opac = Math.min(0.4, (ETAT.heure - 19 * 60) / (5 * 60) * 0.4);
  }
  el("nuit").style.opacity = opac;
}
// Rappel de nuit NON bloquant : dès minuit, on invite (sans forcer) KZ à dormir.
function majRappelNuit() {
  const r = el("rappelNuit"); if (!r) return;
  r.hidden = (ETAT.heure < 24 * 60);   // visible à partir de minuit, KZ peut quand même jouer
}
// Ambiance sonore de nuit : démarre à minuit (en boucle), s'arrête quand il fait jour.
function majAmbianceNuit() {
  const s = el("nightSound"); if (!s) return;
  const nuit = (ETAT.heure >= 24 * 60);
  if (nuit && s.paused) { s.volume = 0.35; const p = s.play(); if (p && p.catch) p.catch(() => {}); }
  else if (!nuit && !s.paused) { s.pause(); try { s.currentTime = 0; } catch (e) {} }
}
// Musique de fond du JEU : uniquement en JOURNÉE et une fois le jeu lancé
// (jamais pendant l'intro/loading, ni la nuit à partir de 20 h).
const HEURE_NUIT_MUSIQUE = 20 * 60;   // à partir de 20:00, on coupe la musique (c'est la nuit)
function majMusiqueJeu() {
  const m = el("gameMusic"); if (!m) return;
  const jour = reveilLance && !jumpscareEnCours && ETAT.heure < HEURE_NUIT_MUSIQUE;
  if (jour && m.paused) { m.volume = 0.3; const p = m.play(); if (p && p.catch) p.catch(() => {}); }
  else if (!jour && !m.paused) { m.pause(); }
}
function dormir() {
  ETAT.jour += 1; ETAT.heure = 8 * 60; el("nuit").style.opacity = 0;
  el("rappelNuit").hidden = true;
  jouerSon(SON_CLIC, .4); montrerLegende("☀️ Jour " + ETAT.jour + " — au boulot !");
  if (ETAT.jour >= 3) debloquerBadge("Marmotte");
  majHorloge(); majAmbianceNuit(); majMusiqueJeu();   // coupe le son de nuit, relance la musique de jour
  if (sceneActive === "classe") majDecorClasse();   // le fantôme disparaît (il fait jour)
  planifierSauvegarde();
}
function initSommeil() { el("btnDormir").addEventListener("click", () => { jouerSon(SON_CLIC, .5); dormir(); }); }

// ---------- FANTÔME (après 3 h) + JUMPSCARE ----------
let jumpscareEnCours = false;
function initFantome() {
  const z = el("fantomeZone"); if (z) z.addEventListener("click", declencherJumpscare);
}
function declencherJumpscare() {
  if (jumpscareEnCours) return;
  jumpscareEnCours = true;
  el("fantomeZone").hidden = true;

  const ov = el("jumpscare"), v = el("jumpscareVideo");
  ov.hidden = false;
  requestAnimationFrame(() => ov.classList.add("visible"));

  // Après la vidéo : -150 €, puis réveil de KZ au bureau (nouveau jour, 8 h).
  let fini = false;
  function apresJumpscare() {
    if (fini) return; fini = true;
    if (v) { try { v.pause(); } catch (e) {} }
    ov.classList.remove("visible");
    setTimeout(() => { ov.hidden = true; }, 300);

    ETAT.argent = Math.max(0, ETAT.argent - 150); majArgent();
    jouerSon(SON_ERROR, .7);
    montrerLegende("👻 Le fantôme t'a fait fuir ! -150 € — KZ se réveille au bureau, en sueur…");
    if (!ETAT.badges.includes("Nuit blanche")) debloquerBadge("Nuit blanche");

    respawnSetupReveil();
    jumpscareEnCours = false;
  }

  // Lancer la vidéo AVEC le son fort. On enchaîne à la fin (ou via un filet de sécurité).
  if (v) {
    v.currentTime = 0; v.volume = 1;
    v.onended = apresJumpscare;
    const p = v.play(); if (p && p.catch) p.catch(() => {});
  }
  setTimeout(apresJumpscare, 9000);   // filet de sécurité si la vidéo ne se termine pas
}
// Réapparition au bureau (SETUP) avec l'effet réveil (flou -> net), nouveau matin.
function respawnSetupReveil() {
  ETAT.jour += 1; ETAT.heure = 8 * 60;
  el("nuit").style.opacity = 0;
  majRappelNuit(); majAmbianceNuit(); majMusiqueJeu();   // coupe le son de nuit, relance la musique de jour
  allerScene("setup");
  rejouerReveil();
  majHorloge(); planifierSauvegarde();
}
// Rejoue l'animation "réveil" (flou -> net) sur la scène.
function rejouerReveil() {
  const sc = el("scene"); if (!sc) return;
  sc.classList.remove("reveil-again");
  void sc.offsetWidth;                 // force le navigateur à repartir de zéro
  sc.classList.add("reveil-again");
  setTimeout(() => sc.classList.remove("reveil-again"), 2300);
}

// ---------- Carte "Merci chef" : glisse depuis un bord toutes les ~3-4 min ----------
function planifierMerciChef(delai) {
  setTimeout(() => {
    mercichefPop();
    planifierMerciChef(180000 + Math.random() * 60000);   // ensuite toutes les 3 à 4 min
  }, delai);
}
function mercichefPop() {
  if (!reveilLance || jumpscareEnCours) return;            // pas pendant l'intro / un jumpscare
  const img = el("mercichef"); if (!img) return;
  const cote = (Math.random() < 0.5) ? "cote-gauche" : "cote-droite";
  img.className = "mercichef " + cote;                     // repart de l'état "hors écran"
  img.hidden = false;
  void img.offsetWidth;                                    // reflow -> l'animation se rejoue
  jouerSon(SON_POP, 0.7);
  requestAnimationFrame(() => img.classList.add("entre"));  // glisse vers l'intérieur
  setTimeout(() => img.classList.remove("entre"), 2800);    // ressort du même côté
  setTimeout(() => { img.hidden = true; }, 3500);
}

// ---------- Admin (Mok) : cheat max argent ----------
function initAdmin() {
  const b = el("btnAdmin"); if (!b) return;   // n'existe que pour le compte admin
  b.addEventListener("click", () => {
    jouerSon(SON_CASH, .6);
    fetch("/api/cheat", { method: "POST" }).then(r => r.json()).then(d => {
      if (d && d.ok) { ETAT.argent = d.argent; ETAT.patrimoine = d.patrimoine; majArgent(); montrerLegende("👑 Cheat admin : argent au max !"); }
    }).catch(() => {});
  });

  // Bouton "Nv 999" (admin) : passe KZ au niveau maximum d'un coup.
  const bn = el("btnNiveauMax");
  if (bn) bn.addEventListener("click", () => {
    jouerSon(SON_ACHIEVEMENT, .6);
    ETAT.xp = 1e250;   // valeur finie mais énorme -> le cap NIVEAU_MAX (999) s'applique
    majXp(); montrerLegende("⭐ Admin : niveau MAX (" + NIVEAU_MAX + ") !");
    planifierSauvegarde();
  });

  // Boutons "voyager dans le temps" (admin) : règlent l'heure en direct pour tester.
  document.querySelectorAll(".temps-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      jouerSon(SON_CLIC, .5);
      ETAT.heure = parseInt(btn.getAttribute("data-heure"), 10) || (8 * 60);
      majHorloge(); majRappelNuit(); majAmbianceNuit(); majMusiqueJeu();
      if (sceneActive === "classe") majDecorClasse();   // apparition/disparition du fantôme
      montrerLegende("🕹️ Admin : voyage dans le temps → " + el("hudHeure").textContent);
      planifierSauvegarde();
    });
  });
}

// ---------- Initialisation globale du jeu ----------
// Force la lecture en boucle d'un <audio> (attribut + filet de sécurité si "ended").
function boucler(id) {
  const a = el(id); if (!a) return;
  a.loop = true;
  a.addEventListener("ended", () => { try { a.currentTime = 0; } catch (e) {} a.play().catch(() => {}); });
}
function initJeu() {
  initBureau(); initNav(); initBoutique(); initSommeil(); initAdmin(); initClasse(); initFantome();
  initUpgrade(); initMecano();
  boucler("gameMusic"); boucler("nightSound");   // musique de jeu + ambiance de nuit en boucle
  chargerEtat().then(() => {
    majArgent(); majHorloge(); majRappelNuit(); majNavRadial(); majCred(); majAvion(); majXp();
    // Applique le décor du setup au bon niveau dès le chargement (le setup est la scène de départ).
    const scene = el("scene");
    scene.style.setProperty("--scw", SCENES.setup.w);
    scene.style.setProperty("--sch", SCENES.setup.h);
    scene.style.setProperty("--scene-bg", "url('" + fondScene("setup") + "')");
  });
  setInterval(sauvegarder, 15000);   // autosave régulier (inclut le revenu passif)
}

// ==========================================================================
//  BULLE "ASTUCE" (troll) : affiche une astuce au hasard et en change régulièrement.
// ==========================================================================
function tirerIndex(max, precedent) {
  // Renvoie un index 0..max-1 différent du précédent (évite de répéter).
  if (max <= 1) return 0;
  let i = precedent;
  while (i === precedent) { i = Math.floor(Math.random() * max); }
  return i;
}
let astuceIndex = -1;
function nouvelleAstuce() {
  astuceIndex = tirerIndex(ASTUCES.length, astuceIndex);
  const t = el("astuceTexte");
  if (t) t.textContent = ASTUCES[astuceIndex];
}
function demarrerAstuces() {
  nouvelleAstuce();
  el("astuce").classList.add("visible");
  setInterval(nouvelleAstuce, ROTATION_ASTUCE);
}

// ==========================================================================
//  ÉCRAN DE CHARGEMENT (façon GTA) : entre la vidéo et le spawn.
// ==========================================================================
let fondIndex = -1, persoIndex = -1;
function rotationLoading() {
  const bg = el("loadingBg"), perso = el("loadingPerso");
  // Petit fondu : on éteint, on change l'image, on rallume (relance les animations).
  bg.classList.remove("on"); perso.classList.remove("on");
  setTimeout(() => {
    fondIndex  = tirerIndex(NB_FONDS, fondIndex);
    persoIndex = tirerIndex(NB_PERSOS, persoIndex);
    bg.src    = "/static/img/loading/background/" + (fondIndex + 1) + ".jpg";
    perso.src = "/static/img/loading/characters/" + (persoIndex + 1) + ".png";
    // Forcer le navigateur à rejouer les animations CSS.
    void bg.offsetWidth;
    bg.classList.add("on"); perso.classList.add("on");
  }, 500);
}
function demarrerChargement() {
  const loading = el("loading");
  loading.classList.add("visible");

  // Musique du chargement (en boucle, volume doux). Peut être bloquée -> reprend au 1er clic.
  const son = el("loadingSound");
  if (son) { son.volume = 0.5; const p = son.play(); if (p && p.catch) p.catch(() => {}); }

  // Première image + rotation régulière.
  rotationLoading();
  const minuterieImg = setInterval(rotationLoading, ROTATION_IMG);

  // Barre de progression 0 -> 100 % sur DUREE_CHARGEMENT.
  const barre = el("loadingBarre"), txt = el("loadingTxt");
  const debut = Date.now();
  const minuterieBarre = setInterval(() => {
    const p = Math.min(100, Math.round(((Date.now() - debut) / DUREE_CHARGEMENT) * 100));
    barre.style.width = p + "%";
    txt.textContent = "CHARGEMENT… " + p + "%";
    if (p >= 100) clearInterval(minuterieBarre);
  }, 100);

  // Fin du chargement -> on éteint tout et KZ apparaît devant le PC.
  setTimeout(() => {
    clearInterval(minuterieImg);
    finChargement(son);
  }, DUREE_CHARGEMENT);
}
function finChargement(son) {
  const loading = el("loading");
  loading.classList.add("termine");                 // fondu de l'écran de chargement
  el("astuce").classList.remove("visible");         // la bulle disparaît au spawn
  if (son) { try { son.pause(); } catch (e) {} }
  setTimeout(() => { loading.style.display = "none"; }, 800);
  demarrerReveil();                                 // spawn : KZ se réveille devant le PC
}

// --- Le réveil (paupières + narration) : déclenché SEULEMENT à la fin de la vidéo ---
let reveilLance = false;
function demarrerReveil(avecNarration) {
  if (reveilLance) return;                     // sécurité : une seule fois
  reveilLance = true;
  el("intro").classList.add("reveil-on");      // relance les animations CSS mises en pause
  el("ecran").classList.add("allume");         // le bureau de l'ordi "s'allume"
  demarrerHorloge();                           // le temps commence à s'écouler (jour/nuit)
  initEvenements();                            // les événements aléatoires commencent à tomber
  planifierMerciChef(60000 + Math.random() * 30000);   // 1re carte "Merci chef" vers 60-90 s
  majMusiqueJeu();                             // démarre la musique de fond si on est de jour

  if (avecNarration === false) return;         // reprise de partie : pas de narration d'intro

  setTimeout(() => {
    montrerLegende("🚗 KZ se réveille… et sa Mazda Miata 98 est EN PANNE. Il lui faut de l'argent pour la réparer.");
  }, 2600);

  setTimeout(() => {
    montrerLegende("💻 Sur le PC : ouvre « Viens Chercher Argent » pour trouver un job.");
  }, 6200);
}

// Reprise de partie ("Continuer") : on saute la vidéo + le chargement et on va au jeu.
function reprendrePartie() {
  const ov = el("videoOverlay"); if (ov) ov.style.display = "none";
  const ld = el("loading"); if (ld) ld.style.display = "none";
  el("astuce").classList.remove("visible");
  demarrerReveil(false);                       // ouvre les yeux, démarre l'horloge, sans narration
  majRappelNuit(); majAmbianceNuit(); majMusiqueJeu();   // ambiance nuit / musique jour selon l'heure
  setTimeout(() => montrerLegende("▶️ Reprise de ta partie. Bon retour, KZ !"), 1000);
}

// --- Vidéo d'accroche : démarrage auto AVEC son, bouton ▶ de secours si bloqué ---
function lancerVideoPuisReveil() {
  const overlay = el("videoOverlay");
  const video = el("introVideo");
  const btnPlay = el("btnPlayVideo");

  // Pas de vidéo (ex. fichier absent) -> on passe direct au réveil.
  if (!overlay || !video) { demarrerReveil(); return; }

  // Fin de la vidéo (ou clic "Passer") : fondu de l'overlay, puis ÉCRAN DE CHARGEMENT.
  function finVideo() {
    if (videoFinie) return;             // sécurité : une seule fois (ended + skip)
    videoFinie = true;
    overlay.classList.add("termine");
    setTimeout(() => { overlay.style.display = "none"; }, 700);
    demarrerChargement();
  }
  var videoFinie = false;
  video.addEventListener("ended", finVideo);
  video.addEventListener("error", finVideo);   // si la vidéo ne charge pas, on ne bloque pas le jeu
  el("skipVideo").addEventListener("click", (e) => { e.preventDefault(); video.pause(); finVideo(); });

  // On tente le démarrage automatique AVEC le son.
  const essai = video.play();
  if (essai && typeof essai.then === "function") {
    essai.catch(() => { btnPlay.classList.add("visible"); });   // bloqué -> on affiche ▶
  }
  // Le bouton ▶ relance la lecture (un clic = geste utilisateur = son autorisé).
  btnPlay.addEventListener("click", () => {
    btnPlay.classList.remove("visible");
    video.play();
  });
}

// Affiche un texte de narration en bas de l'écran.
function montrerLegende(texte) {
  const l = el("legende");
  l.textContent = texte;
  l.classList.add("visible");
}

// Ouvre le faux site "Viens Chercher Argent" dans l'écran de gauche.
function ouvrirSite() {
  el("btnMetier").classList.add("cache");        // on cache l'icône
  el("navigateur").classList.add("visible");     // on affiche le site
  montrerLegende("📄 Postule aux annonces… une seule acceptera KZ.");
}

// Crée une carte cliquable par annonce.
function construireAnnonces() {
  const conteneur = el("annonces");
  ANNONCES.forEach((job) => {
    const carte = document.createElement("div");
    carte.className = "annonce" + (job.ok ? " ynov" : "");
    carte.innerHTML =
      '<span class="emoji">' + job.emoji + '</span>' +
      '<div class="infos"><div class="titre">' + job.titre + '</div>' +
      '<div class="desc">' + job.desc + '</div></div>' +
      '<button type="button">Postuler</button>';
    carte.querySelector("button").addEventListener("click", () => postuler(job));
    conteneur.appendChild(carte);
  });
}

// Résultat d'une candidature : refus (drôle) ou acceptation (Ynov).
function postuler(job) {
  el("popupMsg").textContent = job.msg;
  const boutonOk = el("popupOk");

  if (job.ok) {
    boutonOk.textContent = "Commencer à Ynov →";
    boutonOk.onclick = () => { window.location.href = "/jouer"; };
  } else {
    boutonOk.textContent = "OK";
    boutonOk.onclick = () => el("popup").classList.remove("visible");
  }
  el("popup").classList.add("visible");
}

/* ==========================================================================
   ZOOM molette + déplacement (glisser) + double-clic pour réinitialiser.
   On transforme la couche #zoom : translate(tx,ty) scale(s), origine (0,0).
   ========================================================================== */
(function () {
  return; // Zoom molette DÉSACTIVÉ : l'UI du jeu est intégrée au décor et cliquable.
  const intro = el("intro");
  const zoom = el("zoom");
  if (!intro || !zoom) return;

  let s = 1, tx = 0, ty = 0;          // échelle et déplacement courants
  const S_MIN = 1, S_MAX = 4;

  function appliquer() {
    zoom.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
    intro.classList.toggle("zoomable", s > 1);
  }

  // Empêche de se déplacer hors de l'image (garde l'écran couvert).
  function borner(rect) {
    const minX = rect.width * (1 - s), minY = rect.height * (1 - s);
    tx = Math.min(0, Math.max(minX, tx));
    ty = Math.min(0, Math.max(minY, ty));
  }

  // Molette : zoom vers le curseur. Au-dessus du site (non zoomé), on laisse défiler la liste.
  intro.addEventListener("wheel", (e) => {
    if (s <= 1 && e.target.closest && e.target.closest("#navigateur")) return;
    e.preventDefault();
    const rect = intro.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const wx = (cx - tx) / s, wy = (cy - ty) / s;     // point "monde" sous le curseur
    const facteur = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    s = Math.min(S_MAX, Math.max(S_MIN, s * facteur));
    tx = cx - wx * s; ty = cy - wy * s;               // garder ce point sous le curseur
    if (s === 1) { tx = 0; ty = 0; }
    borner(rect);
    appliquer();
  }, { passive: false });

  // Glisser pour se déplacer (seulement quand c'est zoomé).
  let drag = false, lastX = 0, lastY = 0;
  intro.addEventListener("mousedown", (e) => {
    if (s <= 1) return;
    drag = true; lastX = e.clientX; lastY = e.clientY;
    intro.classList.add("grabbing");
  });
  window.addEventListener("mousemove", (e) => {
    if (!drag) return;
    tx += e.clientX - lastX; ty += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    borner(intro.getBoundingClientRect());
    appliquer();
  });
  window.addEventListener("mouseup", () => { drag = false; intro.classList.remove("grabbing"); });

  // Double-clic (hors bouton) : réinitialise le zoom.
  intro.addEventListener("dblclick", (e) => {
    if (e.target.closest && e.target.closest("button")) return;
    s = 1; tx = 0; ty = 0; appliquer();
  });

  // On efface l'indice de zoom après quelques secondes.
  setTimeout(() => { const h = el("zoomHint"); if (h) h.classList.add("efface"); }, 6000);
})();
