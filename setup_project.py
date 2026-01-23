import os
import subprocess
import sys

base_path = r"c:\Работа\Развитие\LLM\Planning\Planning_app"

def run_in(path, args):
    print(f"Running in {path}: {' '.join(args)}")
    try:
        os.chdir(path)
        subprocess.run(args, check=True, shell=True)
    except Exception as e:
        print(f"Error: {e}")

# Backend
backend_path = os.path.join(base_path, "backend")
if os.path.exists(backend_path):
    run_in(backend_path, ["py", "-m", "venv", "venv"])
    pip_path = os.path.join(backend_path, "venv", "Scripts", "pip")
    run_in(backend_path, [pip_path, "install", "-r", "requirements.txt"])

# Frontend
frontend_path = os.path.join(base_path, "frontend")
npm_path = r"C:\Program Files\nodejs\npm.cmd"
if os.path.exists(frontend_path):
    run_in(frontend_path, [npm_path, "install"])
