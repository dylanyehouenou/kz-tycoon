"""
app.py — LOGIQUE de l'application KZ TYCOON (la couche "contrôleur").

Rôle de CE fichier uniquement :
    - Définir les routes Flask (les URL du jeu : /, /login, /shop, ...).
    - Gérer les sessions (savoir si un joueur est connecté).
    - Appeler database.py pour lire/écrire les données.

RÈGLE D'OR (séparation stricte) :
    Ce fichier ne contient AUCUNE requête SQL.
    Toute la base de données est gérée dans database.py.

ÉTAT ACTUEL : squelette de l'ÉTAPE 1 (arborescence).
    Le vrai serveur Flask ("Hello World") arrive à l'ÉTAPE 2.
"""

# À l'étape 2, on importera Flask et on créera l'application ici, par exemple :
#     from flask import Flask, render_template
#     app = Flask(__name__)


if __name__ == "__main__":
    # Pour l'instant, lancer "python app.py" affiche juste ce message,
    # ce qui prouve que le fichier est exécutable sans erreur.
    # (Le serveur web sera branché à l'étape 2.)
    print("KZ TYCOON — squelette OK. Le serveur Flask sera ajoute a l'etape 2.")
