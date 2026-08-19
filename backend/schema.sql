create table if not exists public.usuarios (
    id bigint generated always as identity primary key,
    username text not null unique,
    nome text not null,
    senha_hash text not null,
    salt text not null,
    papel text not null default 'usuario' check (papel in ('admin', 'usuario', 'cliente')),
    ativo boolean not null default true,
    criado_em timestamptz not null default now()
);

create index if not exists usuarios_papel_ativo_idx
    on public.usuarios (papel, ativo);

create table if not exists public.projetos (
    id bigint generated always as identity primary key,
    nome text not null,
    cliente text,
    cliente_usuario_id bigint references public.usuarios(id) on delete set null,
    criado_em timestamptz not null default now()
);

create table if not exists public.locais (
    id bigint generated always as identity primary key,
    projeto_id bigint not null references public.projetos(id) on delete cascade,
    nome text not null,
    valor_mensal numeric(14, 2) not null default 0,
    taxa_instalacao numeric(14, 2) not null default 0,
    custo_manutencao numeric(14, 2) not null default 0,
    mensal_terceirizada numeric(14, 2) not null default 0,
    chip_mensal numeric(14, 2) not null default 0,
    custos_softwares numeric(14, 2) not null default 0,
    mao_de_obra numeric(14, 2) not null default 0,
    data_inst date
);

create table if not exists public.itens (
    id bigint generated always as identity primary key,
    local_id bigint not null references public.locais(id) on delete cascade,
    categoria text not null,
    cod text,
    material text not null,
    qtd numeric(14, 3) not null default 0,
    valor_unit numeric(14, 2) not null default 0,
    valor_total numeric(14, 2) not null default 0
);

create index if not exists locais_projeto_id_idx
    on public.locais (projeto_id);
create index if not exists itens_local_id_idx
    on public.itens (local_id);

create table if not exists public.datasets (
    id bigint generated always as identity primary key,
    projeto_id bigint not null references public.projetos(id) on delete cascade,
    nome text not null,
    schema_json jsonb not null default '{}'::jsonb,
    fonte text not null default 'livre',
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create index if not exists idx_datasets_projeto
    on public.datasets (projeto_id);

create table if not exists public.dataset_rows (
    id bigint generated always as identity primary key,
    dataset_id bigint not null references public.datasets(id) on delete cascade,
    row_index integer not null,
    data_json jsonb not null default '{}'::jsonb,
    criado_em timestamptz not null default now(),
    unique (dataset_id, row_index)
);

create index if not exists idx_dataset_rows_dataset
    on public.dataset_rows (dataset_id, row_index);

create table if not exists public.dashboards (
    id bigint generated always as identity primary key,
    projeto_id bigint not null references public.projetos(id) on delete cascade,
    nome text not null,
    layout_json jsonb not null default '{}'::jsonb,
    eh_interno boolean not null default false,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create index if not exists idx_dashboards_projeto
    on public.dashboards (projeto_id);
create index if not exists idx_dashboards_interno
    on public.dashboards (eh_interno) where eh_interno = true;

create table if not exists public.widgets (
    id bigint generated always as identity primary key,
    dashboard_id bigint not null references public.dashboards(id) on delete cascade,
    type text not null,
    dataset_id text not null,
    config_json jsonb not null default '{}'::jsonb,
    position_json jsonb not null default '{"x":0,"y":0,"w":4,"h":3}'::jsonb,
    ordem integer not null default 0
);

create index if not exists idx_widgets_dashboard
    on public.widgets (dashboard_id, ordem);

create table if not exists public.slicers (
    id bigint generated always as identity primary key,
    dashboard_id bigint not null references public.dashboards(id) on delete cascade,
    dataset_id text not null,
    field text not null,
    values_json jsonb not null default '[]'::jsonb,
    tipo text not null
);

create index if not exists idx_slicers_dashboard
    on public.slicers (dashboard_id);

create table if not exists public.campos_calculados (
    id bigint generated always as identity primary key,
    dataset_id bigint not null references public.datasets(id) on delete cascade,
    nome text not null,
    formula text not null,
    dependencias_json jsonb not null default '[]'::jsonb,
    ordem integer not null default 0
);

create index if not exists idx_campos_calculados_dataset
    on public.campos_calculados (dataset_id);
