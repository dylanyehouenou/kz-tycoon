"""
app.py — LOGIQUE de l'application KZ TYCOON (la couche "contrôleur").

Rôle de CE fichier uniquement :
    - Charger la configuration depuis .env (secrets, host, port, debug).
    - Créer l'application Flask.
    - Définir les routes (les URL du jeu) et gérer la session du joueur.
    - Appeler database.py pour lire/écrire les données.

RÈGLE D'OR (séparation stricte) :
    Ce fichier ne contient AUCUNE requête SQL. Tout passe par database.py.

ÉTAT ACTUEL : ÉTAPE 4 — templates Jinja + authentification (inscription/connexion).
    Le hachage des mots de passe se fait ICI (werkzeug), puis on stocke le hash.
"""

import os                        # pour lire les variables d'environnement (.env)
import json                      # pour (dé)sérialiser l'état de jeu (JSON <-> texte)
from flask import (              # les outils de Flask utilisés dans les routes
    Flask, render_template, request, redirect, url_for, session, flash, jsonify
)
from dotenv import load_dotenv   # pour charger le fichier .env
from werkzeug.security import generate_password_hash, check_password_hash

import database                  # notre couche de données (SQLite)

# 1) Charger les variables du .env (SECRET_KEY, HOST, PORT, DATABASE...).
load_dotenv()

# 2) Créer l'application Flask.
app = Flask(__name__)

# 3) Clé secrète (signe les cookies de session) : lue depuis .env, jamais en dur.
app.secret_key = os.environ.get("SECRET_KEY")

# 4) S'assurer que la base et les tables existent dès le démarrage.
database.init_db()

# 5) CDN Cloudflare Pages : si STATIC_CDN est défini, url_for('static', ...)
#    renvoie l'URL CDN au lieu de l'URL locale — sans modifier les templates.
_STATIC_CDN = os.environ.get("STATIC_CDN", "").rstrip("/")

def _url_for(endpoint, **values):
    if endpoint == "static" and _STATIC_CDN:
        return f"{_STATIC_CDN}/{values.get('filename', '')}"
    return url_for(endpoint, **values)

app.jinja_env.globals["url_for"] = _url_for


# ==========================================================================
#  Petite aide interne
# ==========================================================================
def joueur_connecte():
    """Renvoie l'id du joueur connecté (stocké en session), ou None si personne."""
    return session.get("joueur_id")


# Comptes ayant des droits ADMIN (cheat) : le pseudo est vérifié via la session.
PSEUDOS_ADMIN = {"Mok"}


def est_admin():
    """Vrai si le joueur connecté est un compte admin (ex. Mok)."""
    return session.get("pseudo") in PSEUDOS_ADMIN


# ==========================================================================
#  ACCUEIL / MENU
# ==========================================================================
@app.route("/")
def accueil():
    """Affiche le menu principal (les boutons Nouvelle partie, Continuer, ...)."""
    return render_template("menu.html")


# ==========================================================================
#  INSCRIPTION
# ==========================================================================
@app.route("/register", methods=["GET", "POST"])
def register():
    """Crée un compte joueur (mot de passe haché) puis connecte automatiquement."""
    if request.method == "POST":
        # On récupère les champs du formulaire (jamais de valeur par défaut secrète).
        pseudo = request.form.get("pseudo", "").strip()
        mot_de_passe = request.form.get("mot_de_passe", "")

        # Validations simples et lisibles.
        if len(pseudo) < 3 or len(mot_de_passe) < 4:
            flash("Pseudo (3 caractères min) et mot de passe (4 min) obligatoires.", "erreur")
            return redirect(url_for("register"))

        # On HACHE le mot de passe AVANT de le stocker (jamais en clair).
        hash_mdp = generate_password_hash(mot_de_passe)

        # creer_joueur renvoie None si le pseudo est déjà pris.
        joueur_id = database.creer_joueur(pseudo, hash_mdp)
        if joueur_id is None:
            flash("Ce pseudo est déjà pris, choisis-en un autre.", "erreur")
            return redirect(url_for("register"))

        # On crée sa sauvegarde de départ, puis on le connecte.
        database.creer_sauvegarde(joueur_id)
        session["joueur_id"] = joueur_id
        session["pseudo"] = pseudo
        flash("Compte créé, bienvenue %s !" % pseudo, "succes")
        return redirect(url_for("accueil"))

    # Méthode GET : on affiche le formulaire d'inscription.
    return render_template("register.html")


# ==========================================================================
#  CONNEXION
# ==========================================================================
@app.route("/login", methods=["GET", "POST"])
def login():
    """Vérifie le pseudo + mot de passe et ouvre la session."""
    if request.method == "POST":
        pseudo = request.form.get("pseudo", "").strip()
        mot_de_passe = request.form.get("mot_de_passe", "")

        joueur = database.get_joueur_par_pseudo(pseudo)
        # check_password_hash compare le mot de passe saisi au hash stocké.
        if joueur is None or not check_password_hash(joueur["mot_de_passe_hash"], mot_de_passe):
            flash("Pseudo ou mot de passe incorrect.", "erreur")
            return redirect(url_for("login"))

        session["joueur_id"] = joueur["id"]
        session["pseudo"] = joueur["pseudo"]
        flash("Content de te revoir %s !" % joueur["pseudo"], "succes")
        return redirect(url_for("accueil"))

    return render_template("login.html")


# ==========================================================================
#  DÉCONNEXION
# ==========================================================================
@app.route("/logout", methods=["POST"])
def logout():
    """Vide la session (déconnexion). En POST pour éviter les déconnexions accidentelles."""
    session.clear()
    flash("À bientôt !", "succes")
    return redirect(url_for("accueil"))


# ==========================================================================
#  NOUVELLE PARTIE / CONTINUER / ÉCRAN DE JEU
# ==========================================================================
@app.route("/new", methods=["POST"])
def nouvelle_partie():
    """Remet la sauvegarde à zéro (KZ repart de 0 €) puis va à l'écran de jeu."""
    joueur_id = joueur_connecte()
    if joueur_id is None:
        flash("Connecte-toi pour lancer une partie.", "erreur")
        return redirect(url_for("login"))
    database.reset_sauvegarde(joueur_id)
    # Nouvelle partie -> on joue d'abord la cinématique d'introduction.
    return redirect(url_for("intro"))


@app.route("/intro")
def intro():
    """Intro immersive + jeu (bureau, garage, jour/nuit). Réservée aux connectés."""
    if joueur_connecte() is None:
        return redirect(url_for("login"))
    return render_template("intro.html", est_admin=est_admin(), reprendre=False)


@app.route("/continue")
def continuer():
    """Reprend la partie en cours : même page que le jeu, mais on SAUTE la cinématique
    d'intro (le JS charge la sauvegarde et affiche directement le jeu)."""
    joueur_id = joueur_connecte()
    if joueur_id is None:
        flash("Connecte-toi pour continuer ta partie.", "erreur")
        return redirect(url_for("login"))
    return render_template("intro.html", est_admin=est_admin(), reprendre=True)


@app.route("/jouer")
def jouer():
    """Écran de jeu. PLACEHOLDER étape 4 : le point-and-click arrive à l'étape 5."""
    joueur_id = joueur_connecte()
    if joueur_id is None:
        return redirect(url_for("login"))
    save = database.get_sauvegarde(joueur_id)
    return render_template("jouer.html", save=save)


# ==========================================================================
#  CLASSEMENT / SUCCÈS / BOUTIQUE / CRÉDITS
# ==========================================================================
@app.route("/leaderboard")
def leaderboard():
    """Classement Top 10 (données réelles depuis la base)."""
    top = database.get_top10()
    return render_template("leaderboard.html", top=top)


@app.route("/achievements")
def achievements():
    """Succès / badges du joueur connecté (lus depuis sa sauvegarde)."""
    badges = []
    joueur_id = joueur_connecte()
    if joueur_id is not None:
        save = database.get_sauvegarde(joueur_id)
        if save is not None:
            badges = json.loads(save["badges"] or "[]")
    return render_template("achievements.html", badges=badges)


@app.route("/shop")
def shop():
    """Boutique. PLACEHOLDER (contenu réel à l'étape 7)."""
    return render_template("shop.html")


@app.route("/credits")
def credits():
    """Page des crédits."""
    return render_template("credits.html")


# ==========================================================================
#  API DU JEU (JSON) : état, sauvegarde, cheat admin.
#  NB : l'état de jeu (argent, pièces, jour...) est calculé côté client puis
#  sauvegardé ici. Toutes les écritures passent par database.py (requêtes "?").
# ==========================================================================
@app.route("/api/etat")
def api_etat():
    """Renvoie la sauvegarde du joueur connecté (argent, état de jeu, badges)."""
    joueur_id = joueur_connecte()
    if joueur_id is None:
        return jsonify({"erreur": "non connecte"}), 401
    save = database.get_sauvegarde(joueur_id)
    if save is None:
        return jsonify({"erreur": "pas de sauvegarde"}), 404
    return jsonify({
        "argent": save["argent"],
        "patrimoine": save["patrimoine_total"],
        "etat": json.loads(save["ameliorations"] or "{}"),   # notre "blob" d'état de jeu
        "badges": json.loads(save["badges"] or "[]"),
        "est_admin": est_admin(),
        "pseudo": session.get("pseudo"),
    })


@app.route("/api/sauver", methods=["POST"])
def api_sauver():
    """Sauvegarde l'argent, le patrimoine, l'état de jeu (blob) et les badges."""
    joueur_id = joueur_connecte()
    if joueur_id is None:
        return jsonify({"erreur": "non connecte"}), 401
    save = database.get_sauvegarde(joueur_id)
    if save is None:
        return jsonify({"erreur": "pas de sauvegarde"}), 404

    donnees = request.get_json(silent=True) or {}
    argent = float(donnees.get("argent", save["argent"]) or 0)
    patrimoine = float(donnees.get("patrimoine", save["patrimoine_total"]) or 0)
    etat = donnees.get("etat", json.loads(save["ameliorations"] or "{}"))
    badges = donnees.get("badges", json.loads(save["badges"] or "[]"))

    database.maj_sauvegarde(
        joueur_id, argent, patrimoine,
        save["etage_max"], save["revenu_clic"], save["revenu_passif"],
        etat,       # rangé dans la colonne "ameliorations" (JSON)
        badges,     # colonne "badges" (JSON)
        json.loads(save["missions"] or "[]"),
    )
    return jsonify({"ok": True})


@app.route("/api/cheat", methods=["POST"])
def api_cheat():
    """CHEAT réservé aux comptes admin (ex. Mok) : met l'argent au maximum."""
    joueur_id = joueur_connecte()
    if joueur_id is None or not est_admin():
        return jsonify({"ok": False, "erreur": "interdit"}), 403
    save = database.get_sauvegarde(joueur_id)
    if save is None:
        return jsonify({"ok": False}), 404
    argent = 999_999_999
    patrimoine = max(save["patrimoine_total"], argent)
    database.maj_sauvegarde(
        joueur_id, argent, patrimoine,
        save["etage_max"], save["revenu_clic"], save["revenu_passif"],
        json.loads(save["ameliorations"] or "{}"),
        json.loads(save["badges"] or "[]"),
        json.loads(save["missions"] or "[]"),
    )
    return jsonify({"ok": True, "argent": argent, "patrimoine": patrimoine})


# ==========================================================================
#  Point d'entrée : lance le serveur avec la config du .env.
# ==========================================================================
if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG") == "1"
    app.run(host=host, port=port, debug=debug)
