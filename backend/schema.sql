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
