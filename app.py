"""
app.py — LOGIQUE de l'application KZ TYCOON (la couche "contrôleur").

Rôle de CE fichier uniquement :
    - Charger la configuration depuis .env (secrets, host, port, debug).
    - Créer l'application Flask.
    - Définir les routes (les URL du jeu).

RÈGLE D'OR (séparation stricte) :
    Ce fichier ne contient AUCUNE requête SQL.
    Toute la base de données sera gérée dans database.py (à partir de l'étape 3).

ÉTAT ACTUEL : ÉTAPE 2 — squelette Flask minimal.
    Une seule route "/" qui prouve que le serveur fonctionne.
"""

import os                        # pour lire les variables d'environnement (.env)
from flask import Flask          # le micro-framework web
from dotenv import load_dotenv   # pour charger le fichier .env dans l'environnement

# 1) On charge les variables du fichier .env (SECRET_KEY, HOST, PORT, ...).
#    Ainsi, aucun secret n'est écrit en dur dans le code.
load_dotenv()

# 2) On crée l'application Flask.
app = Flask(__name__)

# 3) Clé secrète (protège sessions/cookies) : LUE depuis .env, jamais écrite ici.
app.secret_key = os.environ.get("SECRET_KEY")


# 4) Première route : la page d'accueil du jeu.
@app.route("/")
def accueil():
    """Affiche une page minimale prouvant que le serveur Flask fonctionne."""
    # À l'étape 4, ce texte sera remplacé par un vrai template HTML (Jinja).
    return (
        "<h1>Hello KZ TYCOON</h1>"
        "<p>Le serveur Flask fonctionne. (etape 2)</p>"
    )


# 5) Point d'entrée : lance le serveur en lisant host/port/debug depuis .env.
if __name__ == "__main__":
    # host : 0.0.0.0 pour être accessible sur le serveur Debian (valeur dans .env).
    host = os.environ.get("HOST", "127.0.0.1")
    # port : les variables d'environnement sont du TEXTE, on convertit en entier.
    port = int(os.environ.get("PORT", "5000"))
    # debug : True UNIQUEMENT si FLASK_DEBUG vaut "1" -> jamais True codé en dur.
    debug = os.environ.get("FLASK_DEBUG") == "1"

    app.run(host=host, port=port, debug=debug)
