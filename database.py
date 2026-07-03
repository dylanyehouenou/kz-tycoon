"""
database.py — DONNÉES de KZ TYCOON (couche "modèle").

Utilise Cloudflare D1 (SQLite cloud persistant) via l'API HTTP.
Les données survivent aux redémarrages et redéploiements sur Render.
"""

import os
import json
import requests
from dotenv import load_dotenv

import config_jeu

load_dotenv()

_CF_ACCOUNT  = os.environ.get("CF_ACCOUNT_ID", "")
_CF_TOKEN    = os.environ.get("CF_API_TOKEN",  "")
_D1_DB_ID    = os.environ.get("D1_DATABASE_ID", "")
_D1_URL      = f"https://api.cloudflare.com/client/v4/accounts/{_CF_ACCOUNT}/d1/database/{_D1_DB_ID}/query"


# ==========================================================================
#  REQUÊTES D1
# ==========================================================================
def _query(sql, params=None):
    """Envoie une requête SQL à Cloudflare D1 et renvoie la liste de résultats."""
    payload = {"sql": sql}
    if params:
        payload["params"] = [str(p) if p is not None else None for p in params]
    r = requests.post(
        _D1_URL,
        headers={
            "Authorization": f"Bearer {_CF_TOKEN}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=10,
    )
    r.raise_for_status()
    data = r.json()
    # D1 renvoie une liste de résultats (un par statement)
    if isinstance(data, list):
        return data[0].get("results", [])
    return data.get("result", [{}])[0].get("results", [])


def _execute(sql, params=None):
    """Exécute une requête sans retour de données (INSERT/UPDATE)."""
    _query(sql, params)


def _fetchone(sql, params=None):
    """Exécute et renvoie la première ligne (dict) ou None."""
    rows = _query(sql, params)
    return rows[0] if rows else None


# ==========================================================================
#  INIT
# ==========================================================================
def init_db():
    """Crée les tables si elles n'existent pas (idempotent)."""
    _execute("""
        CREATE TABLE IF NOT EXISTS joueurs (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            pseudo            TEXT NOT NULL UNIQUE,
            mot_de_passe_hash TEXT NOT NULL,
            date_creation     TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    _execute("""
        CREATE TABLE IF NOT EXISTS sauvegardes (
            joueur_id        INTEGER PRIMARY KEY,
            argent           REAL    NOT NULL DEFAULT 0,
            patrimoine_total REAL    NOT NULL DEFAULT 0,
            etage_max        INTEGER NOT NULL DEFAULT 1,
            revenu_clic      REAL    NOT NULL DEFAULT 1,
            revenu_passif    REAL    NOT NULL DEFAULT 0,
            ameliorations    TEXT    NOT NULL DEFAULT '{}',
            badges           TEXT    NOT NULL DEFAULT '[]',
            missions         TEXT    NOT NULL DEFAULT '[]',
            date_maj         TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (joueur_id) REFERENCES joueurs(id) ON DELETE CASCADE
        )
    """)


# ==========================================================================
#  JOUEURS
# ==========================================================================
def creer_joueur(pseudo, mot_de_passe_hash):
    """Crée un joueur. Renvoie son id ou None si le pseudo est déjà pris."""
    try:
        _execute(
            "INSERT INTO joueurs (pseudo, mot_de_passe_hash) VALUES (?, ?)",
            (pseudo, mot_de_passe_hash),
        )
        row = _fetchone("SELECT id FROM joueurs WHERE pseudo = ?", (pseudo,))
        return int(row["id"]) if row else None
    except Exception:
        return None


def get_joueur_par_pseudo(pseudo):
    """Renvoie le joueur (dict) ou None."""
    return _fetchone("SELECT * FROM joueurs WHERE pseudo = ?", (pseudo,))


def get_joueur_par_id(joueur_id):
    """Renvoie le joueur (dict) ou None."""
    return _fetchone("SELECT * FROM joueurs WHERE id = ?", (joueur_id,))


# ==========================================================================
#  SAUVEGARDES
# ==========================================================================
def creer_sauvegarde(joueur_id):
    """Crée la sauvegarde de départ."""
    _execute(
        """
        INSERT INTO sauvegardes
            (joueur_id, argent, patrimoine_total, etage_max,
             revenu_clic, revenu_passif, ameliorations, badges, missions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            joueur_id,
            config_jeu.ARGENT_DEPART,
            0,
            1,
            config_jeu.REVENU_CLIC_BASE,
            config_jeu.REVENU_PASSIF_DEPART,
            "{}",
            "[]",
            "[]",
        ),
    )


def get_sauvegarde(joueur_id):
    """Renvoie la sauvegarde (dict) ou None."""
    return _fetchone(
        "SELECT * FROM sauvegardes WHERE joueur_id = ?", (joueur_id,)
    )


def maj_sauvegarde(joueur_id, argent, patrimoine_total, etage_max,
                   revenu_clic, revenu_passif, ameliorations, badges, missions):
    """Met à jour la sauvegarde."""
    _execute(
        """
        UPDATE sauvegardes
           SET argent = ?, patrimoine_total = ?, etage_max = ?,
               revenu_clic = ?, revenu_passif = ?,
               ameliorations = ?, badges = ?, missions = ?,
               date_maj = datetime('now')
         WHERE joueur_id = ?
        """,
        (
            argent, patrimoine_total, etage_max,
            revenu_clic, revenu_passif,
            json.dumps(ameliorations),
            json.dumps(badges),
            json.dumps(missions),
            joueur_id,
        ),
    )


def reset_sauvegarde(joueur_id):
    """Remet la sauvegarde à zéro."""
    _execute(
        """
        UPDATE sauvegardes
           SET argent = ?, patrimoine_total = 0, etage_max = 1,
               revenu_clic = ?, revenu_passif = ?,
               ameliorations = '{}', badges = '[]', missions = '[]',
               date_maj = datetime('now')
         WHERE joueur_id = ?
        """,
        (
            config_jeu.ARGENT_DEPART,
            config_jeu.REVENU_CLIC_BASE,
            config_jeu.REVENU_PASSIF_DEPART,
            joueur_id,
        ),
    )


# ==========================================================================
#  CLASSEMENT
# ==========================================================================
def niveau_depuis_xp(xp):
    try:
        xp = float(xp or 0)
    except (ValueError, TypeError):
        xp = 0
    niveau, seuil = 1, 150
    while xp >= seuil and niveau < 999:
        xp -= seuil
        niveau += 1
        seuil = int(seuil * 1.35)
    return niveau


def get_top10():
    """Renvoie les 10 meilleurs joueurs pour le classement."""
    lignes = _query(
        """
        SELECT j.pseudo AS pseudo, s.patrimoine_total AS patrimoine,
               s.ameliorations AS blob
          FROM sauvegardes s
          JOIN joueurs j ON j.id = s.joueur_id
      ORDER BY s.patrimoine_total DESC
         LIMIT 10
        """
    )
    resultat = []
    for ligne in lignes:
        try:
            blob = json.loads(ligne.get("blob") or "{}") or {}
        except (ValueError, TypeError):
            blob = {}
        try:
            avion = int(blob.get("avion", 0))
        except (ValueError, TypeError):
            avion = 0
        resultat.append({
            "pseudo":     ligne["pseudo"],
            "patrimoine": ligne["patrimoine"],
            "avion":      avion,
            "niveau":     niveau_depuis_xp(blob.get("xp", 0)),
        })
    return resultat


if __name__ == "__main__":
    init_db()
    print("Base D1 prête.")
