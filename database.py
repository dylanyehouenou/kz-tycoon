"""
database.py — DONNÉES de KZ TYCOON (la couche "modèle").

Rôle de CE fichier uniquement :
    - Ouvrir la connexion à la base SQLite.
    - Créer les tables (joueurs, sauvegardes).
    - Fournir des petites fonctions pour lire/écrire les données.

RÈGLE DE SÉCURITÉ ABSOLUE :
    Toutes les requêtes SQL utiliseront des paramètres "?" (requêtes paramétrées).
    On n'écrit JAMAIS de SQL par concaténation ou f-string
    -> cela protège contre les injections SQL.

ÉTAT ACTUEL : squelette de l'ÉTAPE 1. Le vrai code SQL arrive à l'ÉTAPE 3.
"""

# Schéma des tables prévu (sera réellement créé à l'étape 3) :
#
#   joueurs(
#       id                 -> identifiant unique
#       pseudo             -> UNIQUE (deux joueurs ne peuvent pas avoir le même)
#       mot_de_passe_hash  -> mot de passe HACHÉ (jamais en clair)
#       date_creation
#   )
#
#   sauvegardes(
#       joueur_id          -> clé étrangère vers joueurs (1 sauvegarde par compte)
#       argent
#       patrimoine_total   -> sert au classement Top 10
#       etage_max          -> plus haut étage débloqué
#       revenu_clic
#       revenu_passif
#       ameliorations      -> texte JSON
#       badges             -> texte JSON
#       missions           -> texte JSON
#       date_maj
#   )
