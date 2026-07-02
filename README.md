# 🎓 KZ TYCOON

> Jeu **point-and-click** incrémental (façon "clicker/tycoon") réalisé en **Python / Flask / SQLite**.
> Projet **Semaine Startup** — BTS CIEL 1ʳᵉ année. MVP livré en 4 jours, déployé sur Debian.

---

## 🕹️ Le concept

KZ, professeur accro à Discord, se fait quitter par Océane et **perd tout**.
Le joueur repart de **0 €** et doit faire de KZ **le professeur le plus riche et puissant du monde**,
en cliquant sur des zones d'écrans illustrés, en débloquant **15 étages** et en achetant des améliorations.

Chaque écran est une **image de fond fixe** ; par-dessus, des zones `<div>` positionnées en **pourcentage**
sont cliquables (point-and-click, façon escape game). **Aucun moteur 3D.**

---

## 🚀 Démarrage rapide (développement local)

```bash
# 1. Créer et activer un environnement virtuel
python3 -m venv venv
source venv/bin/activate        # (Windows : venv\Scripts\activate)

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Préparer les secrets
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"   # -> à coller dans SECRET_KEY

# 4. Lancer le jeu
python app.py
```

> ⚠️ Le fichier `.env` (secrets) n'est **jamais** versionné. Seul `.env.example` l'est.

---

## 📁 Structure du projet

```
kz-tycoon/
├── app.py            # Logique : routes Flask, sessions (AUCUN SQL ici)
├── database.py       # Données : SQLite, requêtes 100 % paramétrées (?)
├── config_jeu.py     # Équilibrage : toutes les valeurs de gameplay
├── zones.py          # Zones cliquables (recopie de coordonnees.md)
├── requirements.txt  # Dépendances Python
├── .env.example      # Modèle de configuration (le vrai .env est ignoré)
├── .gitignore
├── templates/        # Pages HTML (Jinja)
├── static/
│   ├── css/          # Styles (palette dans variables.css)
│   ├── js/           # Interactions point-and-click
│   ├── img/          # Copie de kz-tycoon-assets/ (images du jeu)
│   └── sounds/       # Effets sonores
├── database/         # Fichier SQLite (ignoré par git)
├── saves/            # Sauvegardes de parties
└── docs/             # prd.md, technique.md, deploiement.md
```

---

## 📚 Documentation

- [docs/prd.md](docs/prd.md) — le "quoi" : univers, gameplay, fonctionnalités.
- [docs/technique.md](docs/technique.md) — le "comment" : routes, schéma BDD, zones cliquables.
- [docs/deploiement.md](docs/deploiement.md) — mise en ligne sur Debian.

---

## 🔒 Sécurité (règles du projet)

- Mots de passe **hachés** (jamais en clair).
- Requêtes SQL **paramétrées** (`?`) uniquement — pas de concaténation.
- Secrets dans `.env` (ignoré par git), `SECRET_KEY` **aléatoire**.
- `debug` piloté par variable d'environnement, jamais en dur.

---

*Ce README évolue à chaque étape du développement.*
