COR = {
    "primaria": "#1E40AF",
    "secundaria": "#3B82F6",
    "destaque": "#D97706",
    "fundo": "#F8FAFC",
    "superficie": "#FFFFFF",
    "sidebar": "#F1F5F9",
    "borda": "#DBEAFE",
    "mutado": "#64748B",
    "tinta": "#0F172A",
    "sucesso": "#16A34A",
    "alerta": "#DC2626",
    "dica": "#1E40AF",
    "grid": "#E9EEF6",
    "ciano": "#0EA5E9",
    "violeta": "#8B5CF6",
    "cinza": "#94A3B8",
    "rosa": "#EC4899",
}

KPI_CORES = {
    "Receita mensal": COR["primaria"],
    "Receita anual": COR["secundaria"],
    "Saldo mensal": COR["sucesso"],
    "Impostos (15%)": COR["cinza"],
    "Investimento": COR["destaque"],
    "Equipamento": COR["ciano"],
    "Tempo de retorno": COR["alerta"],
    "Instalação": COR["violeta"],
}

SEVERIDADE_COR = {
    "ok": COR["sucesso"],
    "atencao": COR["destaque"],
    "alerta": COR["alerta"],
    "dica": COR["dica"],
}

SEVERIDADE_FUNDO = {
    "ok": "#F0FDF4",
    "atencao": "#FFF7ED",
    "alerta": "#FEF2F2",
    "dica": "#EFF6FF",
}

SEVERIDADE_BORDA = {
    "ok": "#BBF7D0",
    "atencao": "#FED7AA",
    "alerta": "#FECACA",
    "dica": "#BFDBFE",
}

PALETA_GRAFICOS = [
    "#1E40AF",
    "#3B82F6",
    "#D97706",
    "#16A34A",
    "#DC2626",
    "#8B5CF6",
    "#0EA5E9",
    "#F59E0B",
    "#EC4899",
    "#14B8A6",
]

FONTE_UI = "Fira Sans, Segoe UI, sans-serif"
FONTE_NUMERO = "Fira Code, Consolas, monospace"

CSS_APP = f"""
@import url('https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;500;600;700&family=Fira+Code:wght@400;500;600&display=swap');

html, body, [class*="css"], [data-testid="stAppViewContainer"],
[data-testid="stHeader"], [data-testid="stSidebar"], .stMarkdown, .stDataFrame {{
    font-family: 'Fira Sans', 'Segoe UI', sans-serif;
}}

.stApp {{ background: {COR['fundo']}; }}
[data-testid="stHeader"] {{ background: transparent; }}

section[data-testid="stSidebar"] {{
    background: {COR['sidebar']};
    border-right: 1px solid {COR['borda']};
}}
section[data-testid="stSidebar"] hr {{ border-color: {COR['borda']}; }}

h1, h2, h3, h4 {{ color: {COR['tinta']}; font-weight: 600; }}

.cabecalho-marca {{ display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }}
.cabecalho-marca .marca {{
    width: 40px; height: 40px; border-radius: 10px;
    background: {COR['primaria']}; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}}
.cabecalho-marca .titulo {{ font-size: 22px; font-weight: 700; color: {COR['tinta']}; line-height: 1.2; }}
.cabecalho-marca .subtitulo {{ font-size: 13px; color: {COR['mutado']}; }}
.cabecalho-fonte {{ font-size: 12.5px; color: {COR['mutado']}; margin-bottom: 14px; }}
.cabecalho-fonte span {{ color: {COR['primaria']}; font-weight: 600; }}

.kpi-card {{
    background: {COR['superficie']};
    border: 1px solid {COR['borda']};
    border-bottom: 3px solid var(--kpi-cor, {COR['primaria']});
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 12px;
    animation: fadeInUp .4s ease-out both;
    transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
}}
.kpi-card:hover {{
    transform: translateY(-2px);
    box-shadow: 0 4px 14px rgba(30, 64, 175, 0.08);
    border-color: var(--kpi-cor, {COR['primaria']});
}}
.kpi-topo {{ display: flex; align-items: center; margin-bottom: 4px; }}
.kpi-ponto {{
    width: 8px; height: 8px; border-radius: 999px;
    background: var(--kpi-cor, {COR['primaria']});
    margin-right: 7px; flex-shrink: 0;
}}
.kpi-label {{
    font-size: 11.5px; font-weight: 500; letter-spacing: 0.04em;
    text-transform: uppercase; color: {COR['mutado']};
}}
.kpi-value {{
    font-family: 'Fira Code', Consolas, monospace;
    font-size: 23px; font-weight: 600; color: {COR['tinta']};
    line-height: 1.25;
}}
.kpi-sub {{ font-size: 12px; color: {COR['mutado']}; margin-top: 3px; }}

.insight-card {{
    border: 1px solid var(--insight-borda);
    background: var(--insight-fundo);
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 8px;
    animation: fadeInUp .4s ease-out both;
    transition: transform 200ms ease, box-shadow 200ms ease;
}}
.insight-card:hover {{
    transform: translateX(3px);
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.06);
}}
.insight-pill {{
    display: inline-block;
    background: var(--insight-cor);
    color: #ffffff;
    font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase;
    border-radius: 999px;
    padding: 2px 10px;
    margin-right: 8px;
    vertical-align: 1px;
}}
.insight-texto {{ color: {COR['tinta']}; font-size: 13.5px; }}

.secao-titulo {{ font-size: 15px; font-weight: 600; color: {COR['tinta']}; margin: 6px 0 10px; }}

.stDownloadButton button, .stButton button {{
    border-radius: 8px;
    font-weight: 500;
    transition: background 150ms ease, border-color 150ms ease;
}}
.stDownloadButton button {{
    background: {COR['primaria']}; border: 1px solid {COR['primaria']}; color: #ffffff;
}}
.stDownloadButton button:hover {{
    background: #1E3A8A; border-color: #1E3A8A; color: #ffffff;
}}
.stButton button {{ border: 1px solid {COR['borda']}; color: {COR['mutado']}; background: {COR['superficie']}; }}
.stButton button:hover {{ border-color: {COR['primaria']}; color: {COR['primaria']}; }}

[data-testid="stFileUploaderDropzone"] {{
    border: 1px dashed {COR['primaria']};
    border-radius: 10px;
    background: {COR['superficie']};
}}

button[data-testid="stTab"] {{
    font-size: 13.5px; font-weight: 500; color: {COR['mutado']};
}}
button[data-testid="stTab"][aria-selected="true"] {{
    color: {COR['primaria']};
}}
[data-baseweb="tab-highlight"] {{ background-color: {COR['primaria']}; }}

.stDataFrame {{ font-size: 13px; }}
[data-testid="stDataFrame"] thead th {{
    font-weight: 600; color: {COR['tinta']};
}}
[data-testid="stDataFrame"] tbody td {{ font-family: 'Fira Code', Consolas, monospace; }}

.stCaption, [data-testid="stCaptionContainer"] p {{ color: {COR['mutado']}; }}

@keyframes fadeInUp {{
    from {{ opacity: 0; transform: translateY(8px); }}
    to {{ opacity: 1; transform: none; }}
}}

.stTabs [data-baseweb="tab"] {{
    transition: color 200ms ease;
}}
[data-baseweb="tab-highlight"] {{
    transition: all 200ms ease;
}}

.stDataFrame tbody tr {{
    transition: background 150ms ease;
}}
.stDataFrame tbody tr:hover {{ background: #EFF6FF !important; }}

@media (prefers-reduced-motion: reduce) {{
    .kpi-card, .insight-card, .stButton button, .stDownloadButton button {{
        animation: none !important;
        transition: none !important;
    }}
    .kpi-card:hover, .insight-card:hover {{ transform: none !important; box-shadow: none !important; }}
}}
"""
