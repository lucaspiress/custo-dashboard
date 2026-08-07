create table if not exists public.usuarios (
    id bigint generated always as identity primary key,
    username text not null unique,
    nome text not null,
    senha_hash text not null,
    salt text not null,
    papel text not null default 'usuario' check (papel in ('admin', 'usuario')),
    ativo boolean not null default true,
    criado_em timestamptz not null default now()
);

create table if not exists public.uploads (
    id bigint generated always as identity primary key,
    user_id bigint not null references public.usuarios(id) on delete cascade,
    sha256 text not null,
    filename text not null,
    arquivo bytea not null,
    uploaded_at timestamptz not null default now(),
    unique (user_id, sha256)
);

create table if not exists public.locais (
    id bigint generated always as identity primary key,
    upload_id bigint not null references public.uploads(id) on delete cascade,
    nome text not null,
    valor_mensal numeric(14, 2) not null default 0,
    taxa_instalacao numeric(14, 2) not null default 0,
    custo_manutencao numeric(14, 2) not null default 0,
    mensal_terceirizada numeric(14, 2) not null default 0,
    chip_mensal numeric(14, 2) not null default 0,
    custos_softwares numeric(14, 2) not null default 0,
    mao_de_obra numeric(14, 2) not null default 0,
    data_inst date,
    saldo_mensal numeric(14, 2) not null default 0,
    investimento numeric(14, 2) not null default 0,
    equipamento numeric(14, 2) not null default 0,
    tempo_retorno numeric(12, 4),
    meses_retorno integer,
    margem numeric(10, 6)
);

alter table public.locais add column if not exists saldo_mensal numeric(14, 2) not null default 0;
alter table public.locais add column if not exists investimento numeric(14, 2) not null default 0;
alter table public.locais add column if not exists equipamento numeric(14, 2) not null default 0;
alter table public.locais add column if not exists tempo_retorno numeric(12, 4);
alter table public.locais add column if not exists meses_retorno integer;
alter table public.locais add column if not exists margem numeric(10, 6);

create table if not exists public.itens (
    id bigint generated always as identity primary key,
    upload_id bigint not null references public.uploads(id) on delete cascade,
    local_id bigint not null references public.locais(id) on delete cascade,
    categoria text not null,
    cod text,
    material text not null,
    qtd numeric(14, 3) not null default 0,
    valor_unit numeric(14, 2) not null default 0,
    valor_total numeric(14, 2) not null default 0
);

alter table public.itens add column if not exists local_id bigint;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'itens_local_id_fkey'
          and conrelid = 'public.itens'::regclass
    ) then
        alter table public.itens
            add constraint itens_local_id_fkey
            foreign key (local_id) references public.locais(id) on delete cascade;
    end if;
end
$$;

create index if not exists usuarios_papel_ativo_idx
    on public.usuarios (papel, ativo);
create index if not exists uploads_user_id_idx
    on public.uploads (user_id, uploaded_at desc);
create index if not exists locais_upload_id_idx
    on public.locais (upload_id);
create index if not exists itens_upload_id_idx
    on public.itens (upload_id);
create index if not exists itens_local_id_idx
    on public.itens (local_id);

alter table public.uploads enable row level security;
alter table public.uploads force row level security;
alter table public.locais enable row level security;
alter table public.locais force row level security;
alter table public.itens enable row level security;
alter table public.itens force row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'uploads'
          and policyname = 'uploads_user_isolation'
    ) then
        create policy uploads_user_isolation on public.uploads
            for all
            using (user_id = nullif(current_setting('app.current_user_id', true), '')::bigint)
            with check (user_id = nullif(current_setting('app.current_user_id', true), '')::bigint);
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'locais'
          and policyname = 'locais_user_isolation'
    ) then
        create policy locais_user_isolation on public.locais
            for all
            using (exists (
                select 1 from public.uploads u
                where u.id = upload_id
                  and u.user_id = nullif(current_setting('app.current_user_id', true), '')::bigint
            ))
            with check (exists (
                select 1 from public.uploads u
                where u.id = upload_id
                  and u.user_id = nullif(current_setting('app.current_user_id', true), '')::bigint
            ));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'itens'
          and policyname = 'itens_user_isolation'
    ) then
        create policy itens_user_isolation on public.itens
            for all
            using (exists (
                select 1 from public.uploads u
                where u.id = upload_id
                  and u.user_id = nullif(current_setting('app.current_user_id', true), '')::bigint
            ))
            with check (exists (
                select 1 from public.uploads u
                where u.id = upload_id
                  and u.user_id = nullif(current_setting('app.current_user_id', true), '')::bigint
            ));
    end if;
end
$$;
