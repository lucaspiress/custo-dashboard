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

create index if not exists usuarios_papel_ativo_idx
    on public.usuarios (papel, ativo);
