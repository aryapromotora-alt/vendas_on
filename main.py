import os
import time
from sqlalchemy.exc import OperationalError
from flask import Flask, request, abort
from flask_login import LoginManager, current_user

# Importações locais
from models.user import db
from scheduler import start_scheduler

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Inicializa extensões
    db.init_app(app)
    login_manager = LoginManager()
    login_manager.init_app(app)

    # Importe e registre blueprints aqui, se usar

    @app.before_request
    def restringir_acesso_externo():
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)
        ip = ip.split(",")[0].strip()
        ip_interno = (
            ip.startswith("192.168.") or
            ip.startswith("10.") or
            ip.startswith("172.")
        )
        if not ip_interno:
            if not current_user.is_authenticated or getattr(current_user, "role", "") != "admin":
                print(f"[BLOQUEIO] Acesso externo negado para IP {ip}")
                abort(403)

    return app

# Cria a app
app = create_app()

# Cria tabelas com retry
with app.app_context():
    for tentativa in range(10):
        try:
            db.create_all()
            print("✅ Tabelas criadas com sucesso.")
            break
        except OperationalError as e:
            print(f"⚠️ Tentativa {tentativa + 1}: banco ainda não está pronto. Aguardando...")
            time.sleep(3)
    else:
        print("❌ Erro: banco não respondeu após múltiplas tentativas.")

# Inicia scheduler
try:
    start_scheduler(app)
    print("🕒 Agendador iniciado com sucesso.")
except Exception as e:
    print(f"⚠️ Erro ao iniciar scheduler: {e}")

# Para Gunicorn
application = app

# Para execução local
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)