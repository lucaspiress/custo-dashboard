from pydantic import BaseModel, Field, ConfigDict

class ProjetoCreateSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nome: str = Field(..., min_length=1, max_length=255)
    cliente: str | None = None

class ProjetoUpdateSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nome: str | None = None
    cliente: str | None = None

class LocalCreateSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
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
    model_config = ConfigDict(extra="ignore")
    categoria: str = Field(..., min_length=1)
    cod: str | None = ""
    material: str = Field(..., min_length=1)
    qtd: float = 0.0
    valor_unit: float = 0.0

class CenarioCreateSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nome: str = Field(..., min_length=1)
    variacao_mensal: float = 0.0
    variacao_instalacao: float = 0.0
