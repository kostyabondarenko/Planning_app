@echo off
chcp 65001 > nul
cd /d "c:\Работа\Развитие\LLM\Planning\Planning_app\backend"
echo Creating venv...
py -m venv venv
echo Installing requirements...
venv\Scripts\pip install -r requirements.txt
echo Done!
