@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo Abrindo Custo Dashboard...
echo Para encerrar, feche esta janela.
echo.
".venv\Scripts\streamlit.exe" run app.py
pause
