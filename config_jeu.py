"""
config_jeu.py — ÉQUILIBRAGE du jeu KZ TYCOON.

Toutes les VALEURS DE GAMEPLAY sont ici (et nulle part ailleurs) :
argent de départ, revenus, prix des étages, pourcentages d'améliorations...
=> Pour rééquilibrer le jeu, on modifie UNIQUEMENT ce fichier, une ligne à la fois.

⚠️ VALEURS PROVISOIRES (étape 1). Elles seront complétées et affinées à l'ÉTAPE 6.
   L'économie complète (les 15 étages détaillés, la liste des améliorations)
   sera ajoutée ici sous forme de listes/dictionnaires.
"""

# --- Argent de départ : KZ a tout perdu, il repart de zéro ---
ARGENT_DEPART = 0            # € au tout début de la partie

# --- Revenu du clic principal "Punir un étudiant" ---
REVENU_CLIC_BASE = 1         # € gagnés à chaque clic au début du jeu

# --- Revenu passif (argent gagné automatiquement, sans cliquer) ---
DUREE_TICK_SECONDES = 1      # toutes les X secondes, on ajoute le revenu passif
REVENU_PASSIF_DEPART = 0     # € par tick au début (aucun revenu passif au départ)

# --- Progression : le nombre d'étages à gravir ---
NB_ETAGES = 15               # objectif final : atteindre le 15e étage

# NOTE (étape 6) : ici viendront par exemple
#   ETAGES = [ {prix, revenu_passif, image, ...}, ... ]  (15 entrées)
#   AMELIORATIONS = [ {nom, prix, effet_pourcentage, ...}, ... ]
