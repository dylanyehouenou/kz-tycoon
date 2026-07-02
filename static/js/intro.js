/* ==========================================================================
   intro.js — Déroulé de la cinématique d'ouverture + faux site d'emploi.

   Séquence :
     1) Réveil (flou -> net, paupières) géré en CSS.
     2) Bandeau "UTILISATEUR BLOQUÉ".
     3) Notification Discord d'Océane.
     4) Overlay "KZ a tout perdu" + bouton "Chercher un métier".
     5) Faux site "VIENS GAGNER ARGENT" : on postule, tout refuse sauf Ynov.
   ========================================================================== */

// --- Les annonces d'emploi (parodie). Seule Ynov accepte (ok: true). ---
const ANNONCES = [
  { emoji: "💎", titre: "Influenceur crypto",        desc: "Deviens riche en dormant !",                    ok: false, msg: "❌ Refusé : vous avez déjà tout perdu. Ironique." },
  { emoji: "🪑", titre: "Testeur de chaises gaming",  desc: "Payé à rester assis toute la journée.",         ok: false, msg: "❌ Refusé : poste déjà pris par un vrai no-life." },
  { emoji: "🍪", titre: "Modérateur Biscotte (payé)", desc: "Enfin payé pour ce que tu fais gratuitement.",  ok: false, msg: "❌ Refusé : conflit d'intérêt évident. Beaucoup trop de Biscotte." },
  { emoji: "🐱", titre: "Vendeur de NFT de chats",    desc: "Le web3, soi-disant l'avenir.",                 ok: false, msg: "❌ Refusé : le marché s'est effondré ce matin. Désolé." },
  { emoji: "🌙", titre: "Streamer de 3h du matin",    desc: "0 viewer garanti.",                             ok: false, msg: "❌ Refusé : reviens quand t'as une communauté." },
  { emoji: "🎓", titre: "Professeur à Ynov",          desc: "Formez la future génération (ou pas).",         ok: true,  msg: "✅ Félicitations ! Ynov vous accepte. Vous êtes maintenant PROFESSEUR." },
];

// Petit raccourci pour récupérer un élément par son id.
const el = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  // --- Enchaînement des moments de la cinématique (en millisecondes) ---
  setTimeout(() => el("banniere").classList.add("visible"), 2600);  // bandeau bloqué
  setTimeout(() => el("notif").classList.add("visible"), 3600);     // notif Océane
  setTimeout(() => el("overlayPerdu").classList.add("visible"), 6000); // "tout perdu"

  // Bouton "Chercher un métier" -> ouvre le faux site d'emploi.
  el("btnMetier").addEventListener("click", ouvrirSite);

  // (Le bouton OK de la popup est géré dans postuler(), selon refus/acceptation.)

  // On construit la liste des annonces dans le site.
  construireAnnonces();
});

// Affiche le faux site "VIENS GAGNER ARGENT".
function ouvrirSite() {
  el("overlayPerdu").classList.remove("visible");
  el("banniere").classList.remove("visible");
  el("siteEmploi").classList.add("visible");
}

// Crée une carte cliquable pour chaque annonce.
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
    // Au clic sur "Postuler", on affiche le résultat.
    carte.querySelector("button").addEventListener("click", () => postuler(job));
    conteneur.appendChild(carte);
  });
}

// Gère une candidature : refus (drôle) ou acceptation (Ynov).
function postuler(job) {
  el("popupMsg").textContent = job.msg;
  const boutonOk = el("popupOk");

  if (job.ok) {
    // Accepté : le bouton OK envoie vers l'écran de jeu.
    boutonOk.textContent = "Commencer à Ynov →";
    boutonOk.onclick = () => { window.location.href = "/jouer"; };
  } else {
    // Refusé : le bouton OK ferme simplement la popup.
    boutonOk.textContent = "OK";
    boutonOk.onclick = () => el("popup").classList.remove("visible");
  }
  el("popup").classList.add("visible");
}
