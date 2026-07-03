@echo off
setlocal enabledelayedexpansion
title KZ TYCOON - Lanceur
chcp 65001 >nul
REM Se place TOUJOURS dans le dossier du .bat (meme si glisse dans le terminal)
cd /d "%~dp0"

echo ==================================================
echo            KZ TYCOON - demarrage du jeu
echo ==================================================
echo.

REM --- Config serveur (prioritaire sur le .env grace a override=False) ---
set "HOST=127.0.0.1"
set "PORT=5000"
set "FLASK_DEBUG=0"

REM --- 1) Cree l'environnement Python si absent ---
if not exist "venv\Scripts\python.exe" (
    echo [1/3] Premier lancement : creation de l'environnement Python...
    python -m venv venv
    if errorlevel 1 (
        echo.
        echo   ERREUR : Python est introuvable sur ce PC.
        echo   Installe Python 3 depuis https://www.python.org puis relance ce fichier.
        echo.
        pause
        exit /b 1
    )
    echo       Installation des dependances ^(Flask^)...
    "venv\Scripts\python.exe" -m pip install --upgrade pip >nul
    "venv\Scripts\python.exe" -m pip install -r requirements.txt
) else (
    echo [1/3] Environnement Python OK.
)

REM --- 2) Demarre le serveur dans une fenetre a part ---
echo [2/3] Demarrage du serveur sur http://%HOST%:%PORT%/ ...
start "KZ TYCOON - serveur (ne pas fermer)" "venv\Scripts\python.exe" app.py

REM --- 3) Attend que le serveur reponde puis ouvre le navigateur ---
echo [3/3] Ouverture du navigateur...
set "ATTENTE=0"
:attente
ping -n 2 127.0.0.1 >nul
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://%HOST%:%PORT%/' -UseBasicParsing -TimeoutSec 2 > $null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto pret
set /a ATTENTE+=1
if %ATTENTE% GEQ 15 goto pret
goto attente

:pret
start "" "http://%HOST%:%PORT%/"

echo.
echo ==================================================
echo   Le jeu tourne : http://%HOST%:%PORT%/
echo   Connecte-toi, puis joue !
echo.
echo   Pour ARRETER le jeu : ferme la fenetre
echo   "KZ TYCOON - serveur (ne pas fermer)".
echo ==================================================
echo.
pause
endlocal
