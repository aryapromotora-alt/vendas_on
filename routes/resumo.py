from flask import Blueprint, render_template
from datetime import datetime, timedelta, date
from models.archive import DailySales
from sqlalchemy import extract
from calendar import monthrange
from collections import defaultdict

resumo_bp = Blueprint("resumo", __name__)

@resumo_bp.route("/resumo")
def resumo_page():
    hoje = datetime.utcnow().date()
    ano = hoje.year
    mes = hoje.month

    # --- Totais do dia ---
    registros_hoje = DailySales.query.filter_by(dia=hoje).all()
    total_dia = sum(r.total for r in registros_hoje)

    # --- Totais da semana (segunda a sexta) ---
    inicio_semana = hoje - timedelta(days=hoje.weekday())
    fim_semana = inicio_semana + timedelta(days=4)
    registros_semana = DailySales.query.filter(
        DailySales.dia >= inicio_semana,
        DailySales.dia <= fim_semana
    ).all()
    total_semana = sum(r.total for r in registros_semana)

    # --- Totais do mês atual ---
    registros_mes = DailySales.query.filter(
        extract("month", DailySales.dia) == mes,
        extract("year", DailySales.dia) == ano
    ).all()
    total_mes = sum(r.total for r in registros_mes)

    # --- Histórico diário (segunda a sexta) ---
    dias_labels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
    nomes_campos = ["segunda", "terca", "quarta", "quinta", "sexta"]
    
    historico_diario = {}
    for i, label in enumerate(dias_labels):
        dia_atual = inicio_semana + timedelta(days=i)
        registros_dia = DailySales.query.filter_by(dia=dia_atual).all()
        
        # Soma apenas o campo correspondente ao dia
        valor_dia = sum(getattr(r, nomes_campos[i]) for r in registros_dia)
        historico_diario[label] = valor_dia

    # --- Totais semanais do mês atual ---
    primeiro_dia = date(ano, mes, 1)
    ultimo_dia = date(ano, mes, monthrange(ano, mes)[1])
    dias_no_mes = (ultimo_dia - primeiro_dia).days + 1
    num_semanas = ((dias_no_mes + primeiro_dia.weekday()) // 7) + 1

    totais_mes = [0 for _ in range(num_semanas)]
    for r in registros_mes:  # ✅ Agora 'registros_mes' já está definido
        semana_index = ((r.dia.day + primeiro_dia.weekday() - 1) // 7)
        if 0 <= semana_index < num_semanas:
            totais_mes[semana_index] += r.total

    mes_nome = hoje.strftime("%B").capitalize()
    mes_atual = f"{ano}-{mes:02d}"

    # --- Histórico mensal completo para o <select> ---
    historico_mensal = defaultdict(float)
    for r in DailySales.query.all():
        chave = f"{r.dia.year}-{r.dia.month:02d}"
        historico_mensal[chave] += r.total
    historico_mensal = dict(sorted(historico_mensal.items()))

    # --- Lista de anos e meses ---
    anos_disponiveis = list(range(2025, 2031))
    meses_nomes = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]

    return render_template(
        "resumo.html",
        hoje=hoje,
        total_dia=total_dia,
        total_semana=total_semana,
        total_mes=total_mes,
        total_seg=historico_diario.get("Segunda", 0),
        total_ter=historico_diario.get("Terça", 0),
        total_qua=historico_diario.get("Quarta", 0),
        total_qui=historico_diario.get("Quinta", 0),
        total_sex=historico_diario.get("Sexta", 0),
        totais_mes=totais_mes,
        num_semanas=num_semanas,
        mes_nome=mes_nome,
        mes_atual=mes_atual,
        historico_mensal=historico_mensal,
        anos_disponiveis=anos_disponiveis,
        meses_nomes=meses_nomes
    )