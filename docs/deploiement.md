# Déploiement — KZ TYCOON (serveur Debian)

> Ce document se complète au fil du projet. Version étape 1 (cadrage).

## 1. Objectif

Faire tourner le jeu sur un serveur **Debian** simple, accessible sur le réseau
(`host 0.0.0.0`, port configurable), pour la démo devant l'investisseur/formateur.

## 2. Prérequis serveur

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git
```

## 3. Installation

```bash
# 1. Récupérer le code
git clone <url-du-depot> kz-tycoon
cd kz-tycoon

# 2. Environnement virtuel + dépendances
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Configurer les secrets (fichier .env, NON versionné)
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"   # -> coller dans SECRET_KEY
# Éditer .env : FLASK_DEBUG=0 en production, PORT au choix.
```

## 4. Lancement

```bash
source venv/bin/activate
python3 app.py
```

Le jeu écoute alors sur `http://<ip-serveur>:<PORT>`.

## 5. À compléter aux étapes suivantes

- [ ] Procédure de création automatique de la base SQLite au premier lancement (étape 3).
- [ ] Service `systemd` pour relancer le jeu automatiquement (optionnel).
- [ ] Rappels de sécurité de production (`FLASK_DEBUG=0`, pare-feu, sauvegardes).

> ⚠️ **En production : `FLASK_DEBUG=0`.** Le mode debug ne doit jamais être actif en ligne.
