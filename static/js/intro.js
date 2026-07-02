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

const el = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  construireAnnonces();

  // Enchaînement de la cinématique (en millisecondes).
  setTimeout(() => {
    el("bloqueTag").classList.add("visible");   // bandeau bloqué (écran droit)
    el("notif").classList.add("visible");       // notif Océane (écran droit)
  }, 2600);

  setTimeout(() => {
    montrerLegende("💔 KZ a tout perdu. Ouvre le navigateur sur l'écran de gauche pour trouver un job.");
  }, 5200);

  // Clic sur l'icône navigateur (écran gauche) -> ouvre le faux site.
  el("btnMetier").addEventListener("click", ouvrirSite);

  // Clic sur la notif -> on peut la refermer.
  el("notif").addEventListener("click", () => el("notif").classList.remove("visible"));
});

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
