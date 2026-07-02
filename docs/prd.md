# PRD — KZ TYCOON (le "quoi")

> Document produit : ce que le jeu doit être et faire. Le "comment" technique est dans [technique.md](technique.md).

## 1. Vision

Jeu **point-and-click incrémental** parodique. Le joueur incarne **KZ**, professeur ruiné
(sa copine Océane l'a quitté car il passait sa vie sur Discord), qui doit **repartir de 0 €**
et devenir **le professeur le plus riche et puissant du monde**.

Public : démo "Semaine Startup" devant investisseur/formateur. Ton : **parodie assumée**, humoristique.

## 2. Boucle de jeu

1. **Cinématique d'ouverture** façon Discord : Océane quitte KZ → écran noir → « KZ a tout perdu ».
2. Le joueur arrive dans le **premier écran** (`setuppov` : KZ devant son double écran).
3. Il **clique** sur des zones (ex. « Punir un étudiant ») pour **gagner de l'argent**.
4. Un **fake Discord** cliquable propose des **quêtes / missions**.
5. Avec l'argent : **améliorations** (revenu par clic / passif en %) et **déblocage d'étages**.
6. **Revenu passif** qui tombe automatiquement (par tick).
7. Progression sur **15 étages** (chaque étage = un nouvel écran point-and-click).
8. **Écran de fin** : confettis + texte de parodie.

## 3. Fonctionnalités (MVP)

| # | Fonctionnalité | Priorité |
|---|---|---|
| 1 | Comptes joueur (inscription / connexion, mot de passe haché) | ⭐⭐⭐ |
| 2 | Clic principal qui rapporte de l'argent | ⭐⭐⭐ |
| 3 | Sauvegarde (auto + manuelle) et réinitialisation | ⭐⭐⭐ |
| 4 | Boutique : améliorations + déblocage des 15 étages | ⭐⭐⭐ |
| 5 | Revenu passif par tick | ⭐⭐ |
| 6 | Classement Top 10 (SQLite) | ⭐⭐ |
| 7 | Missions / quêtes (via le fake Discord) | ⭐⭐ |
| 8 | Succès / badges | ⭐ |
| 9 | Événements aléatoires humoristiques | ⭐ |
| 10 | Écran de fin + confettis | ⭐ |
| 11 | Sons | ⭐ |

## 4. Univers / contenu

- **Personnages** : KZ (début ruiné → boss), Océane, étudiants (PNJ).
- **Écran 1** : `setuppov` — KZ à son double écran, fake Discord, zone « gagner de l'argent ».
- **Écrans 2 à 15** : décors d'étages successifs (fournis plus tard).
- **Économie** : gérée par l'équipe de dev (valeurs par défaut équilibrées dans `config_jeu.py`,
  ajustables). Voir [technique.md](technique.md).

## 4 bis. Menu de début (écran titre — style Minecraft)

Écran d'accueil inspiré du **menu titre de Minecraft** : logo en haut, pile de gros
boutons "blocky" centrés, fond illustré assombri. Style pixel cohérent avec le logo.

- **Logo** : `static/img/ui/logo.png` (pixel-art KZ TYCOON), centré en haut.
- **Fond** : `classepov.png` **flouté + assombri** (voile sombre pour lisibilité).
- **Boutons** (chunky, bord net, ombre portée, s'éclaircissent au survol) :
  - **NOUVELLE PARTIE** → `/new` (si non connecté → inscription d'abord)
  - **CONTINUER** → `/continue` (charge la sauvegarde, connexion requise)
  - **CLASSEMENT** → `/leaderboard`
  - **SUCCÈS** → `/achievements`
  - **CRÉDITS** → `/credits`
  - **Connexion / Déconnexion** en coin haut-droit, selon l'état du joueur.
- **Réalisation** : structure HTML à l'étape 4, style complet (boutons, fond, survol)
  à l'étape 10. Couleurs uniquement via `variables.css`.

## 5. Décisions de cadrage (validées)

- **Identité joueur** : comptes avec **mot de passe haché** (pas de simple pseudo).
- **Zones cliquables** : lues depuis une **structure Python/JSON** (`zones.py`), recopiée de `coordonnees.md`.
- **Équilibrage** : **défini par l'équipe de dev**, centralisé dans `config_jeu.py`.
- **Assets** : images fournies au fur et à mesure ; **placeholders** en attendant (jamais de blocage).

## 6. Hors périmètre (YAGNI pour le MVP)

- Multijoueur temps réel, chat, paiements réels, moteur 3D, application mobile native.
