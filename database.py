"""
database.py — DONNÉES de KZ TYCOON (la couche "modèle").

Rôle de CE fichier uniquement :
    - Ouvrir la connexion à la base SQLite.
    - Créer les tables (joueurs, sauvegardes).
    - Fournir des petites fonctions pour lire/écrire les données.

RÈGLE DE SÉCURITÉ ABSOLUE :
    Toutes les requêtes qui manipulent des DONNÉES utilisateur utilisent des
    paramètres "?" (requêtes paramétrées). On n'écrit JAMAIS de SQL par
    concaténation ou f-string -> cela protège contre les injections SQL.

Note : le HACHAGE des mots de passe se fait dans app.py (couche logique).
       Ici, on reçoit et on stocke un mot de passe DÉJÀ HACHÉ.
"""

import os                         # pour lire le chemin de la base dans .env
import json                       # pour stocker les listes/dictionnaires en texte
import sqlite3                    # la base de données, incluse dans Python
from dotenv import load_dotenv    # pour charger .env quand ce fichier est lancé seul

import config_jeu                 # les valeurs de départ (argent, revenu par clic...)

# On charge .env (utile si on lance "python database.py" tout seul).
load_dotenv()

# Chemin du fichier base de données (défini dans .env, avec une valeur par défaut).
CHEMIN_BDD = os.environ.get("DATABASE", "database/kz_tycoon.db")


# ==========================================================================
#  CONNEXION
# ==========================================================================
def get_connexion():
    """Ouvre une connexion à la base SQLite et la renvoie.

    - row_factory = sqlite3.Row : permet d'accéder aux colonnes par leur nom
      (ex. joueur["pseudo"]) au lieu d'un simple numéro.
    - PRAGMA foreign_keys = ON : active les clés étrangères (liens entre tables).
    """
    connexion = sqlite3.connect(CHEMIN_BDD)
    connexion.row_factory = sqlite3.Row
    connexion.execute("PRAGMA foreign_keys = ON")
    return connexion


# ==========================================================================
#  CRÉATION DES TABLES
# ==========================================================================
def init_db():
    """Crée le dossier de la base puis les tables si elles n'existent pas encore.

    Le SQL ci-dessous est FIXE (aucune donnée utilisateur) : il est donc écrit
    en clair, ce n'est pas concerné par le risque d'injection.
    """
    # On s'assure que le dossier "database/" existe (sinon SQLite échoue).
    dossier = os.path.dirname(CHEMIN_BDD)
    if dossier:
        os.makedirs(dossier, exist_ok=True)

    connexion = get_connexion()
    # executescript permet de lancer plusieurs requêtes d'un coup.
    connexion.executescript(
        """
        -- Table des comptes joueurs
        CREATE TABLE IF NOT EXISTS joueurs (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            pseudo            TEXT NOT NULL UNIQUE,       -- deux comptes ne peuvent pas avoir le même
            mot_de_passe_hash TEXT NOT NULL,             -- mot de passe HACHÉ (jamais en clair)
            date_creation     TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Table des sauvegardes : UNE seule sauvegarde par joueur
        CREATE TABLE IF NOT EXISTS sauvegardes (
            joueur_id        INTEGER PRIMARY KEY,        -- = clé étrangère ET clé unique (1 save/joueur)
            argent           REAL    NOT NULL DEFAULT 0,
            patrimoine_total REAL    NOT NULL DEFAULT 0, -- sert au classement Top 10
            etage_max        INTEGER NOT NULL DEFAULT 1, -- plus haut étage débloqué
            revenu_clic      REAL    NOT NULL DEFAULT 1,
            revenu_passif    REAL    NOT NULL DEFAULT 0,
            ameliorations    TEXT    NOT NULL DEFAULT '{}',  -- JSON (texte)
            badges           TEXT    NOT NULL DEFAULT '[]',  -- JSON (texte)
            missions         TEXT    NOT NULL DEFAULT '[]',  -- JSON (texte)
            date_maj         TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (joueur_id) REFERENCES joueurs(id) ON DELETE CASCADE
        );
        """
    )
    connexion.commit()
    connexion.close()


# ==========================================================================
#  JOUEURS (comptes)
# ==========================================================================
def creer_joueur(pseudo, mot_de_passe_hash):
    """Crée un joueur avec un mot de passe DÉJÀ HACHÉ. Renvoie son id, ou None
    si le pseudo est déjà pris.
    """
    connexion = get_connexion()
    try:
        curseur = connexion.execute(
            # Les valeurs viennent de "?" : requête paramétrée = sûre.
            "INSERT INTO joueurs (pseudo, mot_de_passe_hash) VALUES (?, ?)",
            (pseudo, mot_de_passe_hash),
        )
        connexion.commit()
        return curseur.lastrowid          # l'id du joueur créé
    except sqlite3.IntegrityError:
        # Se déclenche si le pseudo existe déjà (contrainte UNIQUE).
        return None
    finally:
        connexion.close()


def get_joueur_par_pseudo(pseudo):
    """Renvoie la ligne du joueur portant ce pseudo (ou None). Utilisé à la connexion."""
    connexion = get_connexion()
    joueur = connexion.execute(
        "SELECT * FROM joueurs WHERE pseudo = ?",   # paramétré
        (pseudo,),
    ).fetchone()
    connexion.close()
    return joueur


def get_joueur_par_id(joueur_id):
    """Renvoie la ligne du joueur portant cet id (ou None)."""
    connexion = get_connexion()
    joueur = connexion.execute(
        "SELECT * FROM joueurs WHERE id = ?",       # paramétré
        (joueur_id,),
    ).fetchone()
    connexion.close()
    return joueur


# ==========================================================================
#  SAUVEGARDES (état de la partie)
# ==========================================================================
def creer_sauvegarde(joueur_id):
    """Crée la sauvegarde de départ d'un joueur (valeurs issues de config_jeu)."""
    connexion = get_connexion()
    connexion.execute(
        """
        INSERT INTO sauvegardes
            (joueur_id, argent, patrimoine_total, etage_max,
             revenu_clic, revenu_passif, ameliorations, badges, missions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            joueur_id,
            config_jeu.ARGENT_DEPART,        # argent de départ (0)
            0,                                # patrimoine total au début
            1,                                # on commence au 1er étage
            config_jeu.REVENU_CLIC_BASE,     # revenu par clic de base
            config_jeu.REVENU_PASSIF_DEPART, # revenu passif de départ
            "{}",                             # aucune amélioration achetée (JSON vide)
            "[]",                             # aucun badge (JSON vide)
            "[]",                             # aucune mission avancée (JSON vide)
        ),
    )
    connexion.commit()
    connexion.close()


def get_sauvegarde(joueur_id):
    """Renvoie la sauvegarde d'un joueur (ou None)."""
    connexion = get_connexion()
    save = connexion.execute(
        "SELECT * FROM sauvegardes WHERE joueur_id = ?",   # paramétré
        (joueur_id,),
    ).fetchone()
    connexion.close()
    return save


def maj_sauvegarde(joueur_id, argent, patrimoine_total, etage_max,
                   revenu_clic, revenu_passif, ameliorations, badges, missions):
    """Met à jour la sauvegarde d'un joueur. Les champs JSON (dict/list) sont
    convertis en texte automatiquement.
    """
    connexion = get_connexion()
    connexion.execute(
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
            json.dumps(ameliorations),   # dict -> texte JSON
            json.dumps(badges),          # list -> texte JSON
            json.dumps(missions),        # list -> texte JSON
            joueur_id,
        ),
    )
    connexion.commit()
    connexion.close()


def reset_sauvegarde(joueur_id):
    """Remet la sauvegarde d'un joueur à zéro (bouton "Réinitialiser")."""
    connexion = get_connexion()
    connexion.execute(
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
    connexion.commit()
    connexion.close()


# ==========================================================================
#  CLASSEMENT
# ==========================================================================
def get_top10():
    """Renvoie les 10 meilleurs joueurs (pseudo + patrimoine), du plus riche au moins riche."""
    connexion = get_connexion()
    lignes = connexion.execute(
        """
        SELECT j.pseudo AS pseudo, s.patrimoine_total AS patrimoine
          FROM sauvegardes s
          JOIN joueurs j ON j.id = s.joueur_id
      ORDER BY s.patrimoine_total DESC
         LIMIT 10
        """
    ).fetchall()
    connexion.close()
    return lignes


# ==========================================================================
#  Lancement direct : "python database.py" crée la base et les tables.
# ==========================================================================
if __name__ == "__main__":
    init_db()
    print("Base de donnees prete :", CHEMIN_BDD)
