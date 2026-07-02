"""
zones.py — Définition des ZONES CLIQUABLES du jeu (le "point-and-click").

RAPPEL DU PRINCIPE DU JEU :
    Chaque écran = une image de fond fixe (position: relative).
    Par-dessus, des <div> transparents positionnés en POURCENTAGE (%)
    forment les zones cliquables (position: absolute).
    Un clic sur une zone déclenche une action JS (gagner de l'argent, etc.).
    => Aucun moteur 3D : uniquement du CSS positionné sur des images.

Ce fichier est la RECOPIE FIDÈLE de kz-tycoon-assets/coordonnees.md,
qui est la source de vérité fournie par l'équipe.
On ne réinvente jamais les coordonnées : on recopie celles mesurées.

⚠️ COORDONNÉES PROVISOIRES / VIDES (étape 1). Elles seront réellement
   remplies à l'ÉTAPE 5, une fois l'image "setuppov" et coordonnees.md fournis.
"""

# Structure de données :
#   pour chaque écran (étage) -> l'image de fond + la liste des zones.
#   chaque zone -> id, position en % (top/left/width/height), action, libellé.
ZONES = {
    "etage_1": {
        "image": "backgrounds/setuppov.png",   # KZ devant son double écran
        "zones": [
            # Exemple de zone (commenté tant que coordonnees.md n'est pas fourni) :
            # {
            #     "id": "punir_etudiant",
            #     "top": "40%", "left": "55%", "width": "20%", "height": "15%",
            #     "action": "gagner_argent",
            #     "label": "Punir un étudiant",
            # },
        ],
    },
}
