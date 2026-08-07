# Custo Dashboard

Sistema local que transforma planilhas de custo (.xlsx, template padrão) em dashboards
automatizados com insights por regras, em português.

## Setup

```
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

## Rodar

```
.venv\Scripts\streamlit run app.py
```

## Testar sem interface

```
.venv\Scripts\python -X utf8 test_validate.py "C:\Users\assistentesolucoes\Desktop\opencode base.xlsx"
```

## Arquitetura

- `app.py` — interface Streamlit (único arquivo que importa streamlit)
- `loader.py` — leitura/validação do template (dataclasses `Item`, `Local`, `WorkbookData`)
- `analysis.py` — KPIs, composição, pareto, anomalias (z-score), curva de payback
- `insights.py` — regras de insight em PT-BR (severidade: ok/atencao/alerta/dica)
- `charts.py` — figuras plotly
- `report.py` — relatório PDF (reportlab + matplotlib)
- `formatos.py` — formatação BR (moeda/número) compartilhada
- `history.py` — snapshots por upload em SQLite (re-upload do mesmo arquivo substitui; `carregar_workbook` reconstrói análise completa)
- `config.py` — schema do template (abas RELATORIO/GRÁFICOS, colunas A–O, taxa 15%)

## Template esperado

- Aba `RELATORIO`: cabeçalho com `LOCAL` na coluna A; uma linha por local (colunas B–O).
- Aba por local (ex.: `SESC PASSO FUNDO`): blocos `MATERIAL ALARME` e `MATERIAL CFTV`
  com colunas COD, material, QTD, VALOR UNIT, VALOR TOTAL; linha `TOTAL` encerra cada bloco.
- Aba `GRÁFICOS`: ignorada (dados de gráfico embutido do Excel).
- Números derivados (impostos 15%, saldo, investimento, retorno) são recalculados em código.

## Convenções

- UI em PT-BR; moeda `R$ 18.733,68`; sem emojis; sem comentários no código.
- Comandos aprovados: `python`, `pip`, `streamlit`, `git status/diff/log` etc.
