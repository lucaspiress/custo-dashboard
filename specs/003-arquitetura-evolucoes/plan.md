# 🏗️ Plano de Implementação da Nova Arquitetura — Custo Dashboard

## 1. Abordagem de Refatoração Seguro-Garantida (Surgical & Safe)
Seguindo as **Karpathy Guidelines**, a refatoração será realizada em fases incrementais com verificação automatizada a cada passo (`verify: [pytest / npm run build]`), garantindo que nenhuma funcionalidade existente seja afetada.

---

## 2. Estrutura de Schemas Pydantic (`backend/schemas.py`)

Criar o arquivo `backend/schemas.py` com as definições de entrada e saída:

```python
from pydantic import BaseModel, Field

class ProjetoCreateSchema(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255)
    cliente: str | None = None

class LocalCreateSchema(BaseModel):
    nome: str = Field(..., min_length=1)
    valor_mensal: float = 0.0
    taxa_instalacao: float = 0.0
    custo_manutencao: float = 0.0
    mensal_terceirizada: float = 0.0
    chip_mensal: float = 0.0
    custos_softwares: float = 0.0
    mao_de_obra: float = 0.0
    data_inst: str | None = None

class ItemCreateSchema(BaseModel):
    categoria: str = Field(..., min_length=1)
    cod: str | None = ""
    material: str = Field(..., min_length=1)
    qtd: float = 0.0
    valor_unit: float = 0.0

class CenarioCreateSchema(BaseModel):
    nome: str = Field(..., min_length=1)
    variacao_mensal: float = 0.0
    variacao_instalacao: float = 0.0
```

---

## 3. Refatoração dos Routers do FastAPI

- Atualizar `backend/routers/projetos.py` para injetar os Schemas Pydantic:
  - `def criar(dados: ProjetoCreateSchema, ...)`
  - `def criar_local(id: int, dados: LocalCreateSchema, ...)`
  - `def criar_item(lid: int, dados: ItemCreateSchema, ...)`
  - `def criar_cenario(id: int, dados: CenarioCreateSchema, ...)`

---

## 4. Estratégia de Verificação

1. **Passo 1:** Criar `backend/schemas.py` e refatorar endpoints em `backend/routers/projetos.py`.
2. **Passo 2:** Executar suíte de testes `pytest` no backend para confirmar compatibilidade de 100%.
3. **Passo 3:** Verificar build do frontend com `npm run build`.
