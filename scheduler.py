from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import timezone

# imports diretos sem src/
from routes.data import load_data
from models.user import db

# Scheduler global
scheduler = BackgroundScheduler()

# ---------------------------
# Filtro para moeda brasileira
# ---------------------------
def format_brl(value):
    try:
        return f"{float(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return "0,00"

# ---------------------------
# Função que salva resumo diário
# ---------------------------
def salvar_resumo_diario(app):
    with app.app_context():
        try:
            data = load_data()
            spreadsheet = data.get("spreadsheetData", {})

            dias_semana = ["monday", "tuesday", "wednesday", "thursday", "friday"]
            nomes_dias = ["segunda", "terca", "quarta", "quinta", "sexta"]

            hoje = datetime.now(timezone("America/Sao_Paulo"))
            dia_semana = hoje.weekday()

            if dia_semana >= 5:
                print(f"[INFO] Fim de semana ({hoje.date()}) — não salva resumo diário")
                return

            campo_dia = dias_semana[dia_semana]
            nome_dia = nomes_dias[dia_semana]

            print(f"[INFO] Salvando resumo diário para {nome_dia} ({hoje.date()})")

            today = hoje.date()
            total_dia = 0
            breakdown = {}

            for nome, valores in spreadsheet.items():
                valor_dia = float(valores.get(campo_dia, 0) or 0)
                breakdown[nome] = valor_dia
                total_dia += valor_dia

            try:
                from models.archive import DailySales
                for nome, valores in spreadsheet.items():
                    valor_dia = float(valores.get(campo_dia, 0) or 0)
                    record = DailySales(
                        vendedor=nome,
                        dia=today,
                        segunda=valor_dia if nome_dia == "segunda" else 0,
                        terca=valor_dia if nome_dia == "terca" else 0,
                        quarta=valor_dia if nome_dia == "quarta" else 0,
                        quinta=valor_dia if nome_dia == "quinta" else 0,
                        sexta=valor_dia if nome_dia == "sexta" else 0,
                        total=valor_dia
                    )
                    db.session.add(record)
            except Exception as e:
                print(f"[FALLBACK] Erro ao usar DailySales: {e}")
                from models.archive import ResumoHistory
                registro = ResumoHistory(
                    week_label=f"Auto {today} - {nome_dia}",
                    started_at=hoje,
                    ended_at=hoje,
                    total=total_dia,
                    breakdown=breakdown,
                    created_at=hoje
                )
                db.session.add(registro)

            db.session.commit()
            print(f"[OK] Resumo diário salvo em {hoje} — Total: R$ {format_brl(total_dia)}")

        except Exception as e:
            print(f"[ERRO] salvar_resumo_diario: {e}")

# ---------------------------
# Função que zera a planilha semanal
# ---------------------------
def reset_planilha_semanal(app):
    with app.app_context():
        try:
            data = load_data()
            spreadsheet = data.get("spreadsheetData", {})

            for nome in spreadsheet:
                spreadsheet[nome] = {
                    "monday": 0,
                    "tuesday": 0,
                    "wednesday": 0,
                    "thursday": 0,
                    "friday": 0
                }

            from models.user import SpreadsheetData
            for vendedor in spreadsheet:
                record = SpreadsheetData.query.filter_by(vendedor=vendedor).first()
                if record:
                    record.monday = 0
                    record.tuesday = 0
                    record.wednesday = 0
                    record.thursday = 0
                    record.friday = 0

            db.session.commit()
            print(f"[OK] Planilha semanal zerada em {datetime.now(timezone('America/Sao_Paulo'))}")

        except Exception as e:
            print(f"[ERRO] reset_planilha_semanal: {e}")

# ---------------------------
# Inicializa o scheduler
# ---------------------------
def start_scheduler(app):
    if not scheduler.get_jobs():
        scheduler.add_job(
            func=lambda: salvar_resumo_diario(app),
            trigger="cron",
            hour=18,
            minute=20,
            timezone=timezone("America/Sao_Paulo")
        )
        scheduler.add_job(
            func=lambda: reset_planilha_semanal(app),
            trigger="cron",
            day_of_week="mon",
            hour=0,
            minute=1,
            timezone=timezone("America/Sao_Paulo")
        )
        scheduler.start()
        print("[INFO] Scheduler iniciado: resumo diário às 18:20 e reset semanal às 00:01 de segunda")