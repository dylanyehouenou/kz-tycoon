# Documentation technique — KZ TYCOON (le "comment")

> Architecture, base de données, zones cliquables, routes et sécurité.

## 1. Pile technique

- **Backend** : Python 3 + Flask.
- **Base de données** : SQLite (fichier local, requêtes paramétrées).
- **Frontend** : HTML (Jinja) + CSS (palette imposée) + JavaScript "vanilla".
- **Pas de** : moteur 3D, framework JS lourd, ORM. On reste simple et lisible.

## 2. Séparation des responsabilités (1 fichier = 1 rôle)

| Fichier | Rôle | Contient | Ne contient JAMAIS |
|---|---|---|---|
| `app.py` | Logique / routes | Routes Flask, sessions, appels à `database.py` | ❌ de SQL |
| `database.py` | Données | Connexion SQLite, requêtes paramétrées | ❌ de logique de routes |
| `config_jeu.py` | Équilibrage | Valeurs de gameplay | ❌ de code |
| `zones.py` | Point-and-click | Coordonnées des zones | ❌ de logique |
| `templates/` | Présentation | HTML Jinja | ❌ de SQL |
| `static/` | Présentation | CSS / JS / images / sons | — |

## 3. Schéma de la base de données

**Table `joueurs`**

| Colonne | Type | Détail |
|---|---|---|
| `id` | INTEGER PK | identifiant unique |
| `pseudo` | TEXT UNIQUE | nom du joueur |
| `mot_de_passe_hash` | TEXT | mot de passe **haché** (werkzeug) |
| `date_creation` | TEXT | date d'inscription |

**Table `sauvegardes`** (1 sauvegarde par compte)

| Colonne | Type | Détail |
|---|---|---|
| `joueur_id` | INTEGER FK | référence `joueurs.id` |
| `argent` | REAL | argent actuel |
| `patrimoine_total` | REAL | sert au **classement Top 10** |
| `etage_max` | INTEGER | plus haut étage débloqué |
| `revenu_clic` | REAL | gain par clic |
| `revenu_passif` | REAL | gain par tick |
| `ameliorations` | TEXT | JSON des améliorations achetées |
| `badges` | TEXT | JSON des succès obtenus |
| `missions` | TEXT | JSON de l'avancement des missions |
| `date_maj` | TEXT | dernière sauvegarde |

**Classement Top 10** : simple requête paramétrée
`SELECT pseudo, patrimoine_total FROM ... ORDER BY patrimoine_total DESC LIMIT 10`.

## 4. Sécurité (règles non négociables)

- **Requêtes paramétrées** (`?`) partout — jamais de f-string / concaténation SQL.
- **Mots de passe hachés** via `werkzeug.security` (jamais en clair).
- **Secrets** dans `.env` (ignoré par git) ; `.env.example` versionné.
- **`SECRET_KEY`** générée aléatoirement (`secrets.token_hex`).
- **`debug`** piloté par `FLASK_DEBUG` (variable d'env), jamais `True` en dur.
- **`host` / `port`** configurables via `.env` (déploiement Debian : `0.0.0.0`).

## 5. Routes Flask prévues

| Route | Méthode | Rôle |
|---|---|---|
| `/` | GET | Accueil / cinématique |
| `/register` | GET/POST | Inscription (compte + mot de passe haché) *(ajout)* |
| `/login` | GET/POST | Connexion *(ajout)* |
| `/logout` | GET | Déconnexion *(ajout)* |
| `/new` | POST | Nouvelle partie (après inscription) |
| `/continue` | GET | Charger la sauvegarde (après connexion) |
| `/shop` | GET | Boutique (améliorations + étages) |
| `/leaderboard` | GET | Classement Top 10 |
| `/achievements` | GET | Succès / badges |
| `/credits` | GET | Crédits |
| `/save` | POST | Sauvegarde manuelle |
| `/reset` | POST | Réinitialiser la partie |
| `/api/update` | POST | Tick : mise à jour revenu passif |
| `/api/buy` | POST | Acheter une amélioration / un étage |
| `/api/click` | POST | Clic principal (gagner de l'argent) |

## 6. Structure des zones cliquables

Définies dans `zones.py`, recopiées de `kz-tycoon-assets/coordonnees.md`.
Chaque écran : une image de fond + une liste de zones (id, top/left/width/height en **%**,
action, libellé). Flask injecte cette structure dans le template ; Jinja génère les `<div>`
absolus ; le JS lit l'attribut `data-action` et appelle l'API correspondante.

## 7. Palette imposée (dans `static/css/variables.css`)

| Variable | Couleur |
|---|---|
| `--violet-profond` | `#5B2A86` |
| `--rose-neon` | `#E0399B` |
| `--orange-dore` | `#F5A623` |
| `--bleu-nuit` | `#141127` |

Aucune couleur codée en dur ailleurs : tout passe par ces variables.
