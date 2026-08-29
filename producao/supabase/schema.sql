-- ============================================================================
-- Unit0 — schema para Supabase (Postgres)
-- Cole tudo no SQL Editor do Supabase e rode uma vez.
--
-- Como funciona a alçada: a tabela `membros` liga o e-mail de login ao papel
-- (admin, coord, fin, equipe). As policies de RLS abaixo aplicam esse papel
-- direto no banco — não dá para burlar pelo app.
--
-- Datas são TEXT no formato 'aaaa-mm-dd' porque o app envia string vazia
-- quando o campo não foi preenchido.
-- ============================================================================

-- ---------------------------------------------------------------- tabelas ---
create table if not exists projetos (
  id text primary key,
  criado_em timestamptz default now(),
  criado_por text,
  nome text not null,
  cliente text, agencia text, formato text, status text,
  inicio text, entrega text,
  valor_contrato_cents bigint default 0,
  imposto_regime text, imposto_aliquota numeric default 0,
  aceite_dias int default 5, aceite_uteis boolean default true, rodadas_max int default 3,
  seed_versao int,
  obs text
);

create table if not exists membros (
  id text primary key,
  criado_em timestamptz default now(),
  criado_por text,
  projeto_id text references projetos(id) on delete cascade,
  nome text not null,
  email text, papel text not null default 'equipe',
  funcao text, telefone text, doc text,
  chave_pix text, banco text, agencia text, conta_banco text, titular text,
  cache_cents bigint default 0,               -- cachê negociado, por diária
  cache_orcado_cents bigint default 0,        -- cachê orçado, por diária
  perdiem_cents bigint default 0,
  diarias numeric default 1,
  contrato_status text default 'na', ativo boolean default true,
  tipo text default 'pf',                     -- pf (recibo) ou pj (nota fiscal)
  rg text, nascimento text,
  pin_hash text,                              -- senha de 4 dígitos (só o hash)
  obs text
);
create index if not exists membros_email_idx on membros (lower(email));

create table if not exists etapas (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  fase text, nome text not null, status text default 'nao',
  responsavel_id text, prazo text, depende_de jsonb default '[]'::jsonb,
  ordem int default 0, obs text,
  -- etapa feita em partes (6 escolas, 40 peças): o progresso sai daqui
  meta int default 0, feitos int default 0, unidade text
);

create table if not exists tarefas (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  etapa_id text, titulo text not null, descricao text,
  responsavel_id text, prazo text,
  status text default 'aberta',               -- aberta | fazendo | feita
  feito boolean default false,                -- espelho de status, para o checklist
  cobrado_em text,                            -- quando a produção cobrou
  -- [{de, para, motivo, por, em}] — toda mudança de prazo fica registrada
  remarcacoes jsonb default '[]'::jsonb
);

create table if not exists eventos (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  titulo text not null, tipo text, data text,
  hora_inicio text, hora_fim text, "local" text,
  participantes jsonb default '[]'::jsonb,
  chamadas jsonb default '[]'::jsonb,         -- [{membro_id, hora, obs}] — ordem do dia
  locacao_id text, viagem_id text, endereco text, mapa text,
  contato_nome text, contato_tel text, levar text, roteiro_dia text,
  confirmado boolean default true,            -- false = data ainda não confirmada
  obs text
);

create table if not exists entregas (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  titulo text not null, prazo text, status text default 'pendente',
  responsavel_id text, formato text, link text, obs text
);

create table if not exists orcamento (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  rubrica text not null, descricao text,
  previsto_cents bigint default 0,            -- orçado
  negociado_cents bigint default 0,           -- já fechado com a pessoa/fornecedor
  obs text
);

create table if not exists lancamentos (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  tipo text not null default 'saida',
  descricao text not null, valor_cents bigint default 0, rubrica text,
  data text, fornecedor text, forma text,
  membro_id text, evento_id text,             -- a qual diária o gasto pertence
  viagem_id text,                             -- a qual viagem o gasto pertence
  reembolso boolean default false,
  sem_comprovante boolean default false,
  fonte text default 'empresa',               -- empresa | caixinha | proprio
  status text default 'pendente', aprovado_por text, conta_id text, obs text
);

create table if not exists contas (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  tipo text not null default 'pagar',
  descricao text not null, contraparte text, valor_cents bigint default 0,
  venc text, status text default 'aberto', quitado_em text,
  nf_status text default 'na', nf_numero text, nf_data text,
  membro_id text, lancamento_id text, contrato_id text, parcela_id text,
  viagem_id text, parcela text, categoria text, rubrica text, obs text
);

create table if not exists contratos (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  titulo text not null, tipo text default 'cliente',
  contratante text, contratado text, valor_total_cents bigint default 0,
  assinado_em text, objeto text, entregaveis text, prazo_entrega text,
  direitos text, praca text, janela text, exclusividade text, multa text,
  condicoes_pagto text, obs text,
  parcelas jsonb default '[]'::jsonb
);

create table if not exists documentos (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  tipo text default 'nf', titulo text, valor_cents bigint default 0,
  data text, emissor text, numero text,
  lancamento_id text, conta_id text, contrato_id text, confirmacao_id text,
  chave text,                                 -- chave de acesso da NFC-e lida do QR
  membro_id text, path text, nome text, tamanho bigint, mime text,
  link text, obs text
);

create table if not exists confirmacoes (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  membro_id text not null, tipo text default 'presenca', ref_id text,
  titulo text not null, status text default 'pendente',
  respondido_em timestamptz, obs text
);

create table if not exists atividades (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  texto text, tipo text, quando timestamptz default now()
);

create table if not exists locacoes (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  nome text not null, cidade text, uf text, endereco text,
  contato text, telefone text, autorizacao text default 'pendente',
  horario text, valor_cents bigint default 0, obs text
);

create table if not exists contatos (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  nome text not null, papel text, empresa text, tipo text default 'cliente',
  email text, telefone text, obs text
);

-- Caixinha de produção: dinheiro adiantado e devolvido.
create table if not exists caixa (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  membro_id text not null, tipo text not null default 'adiantamento',
  valor_cents bigint default 0, data text, forma text, obs text
);

-- Rodadas de aprovação com o cliente (prazo de aceite, silêncio = aceite).
create table if not exists aprovacoes (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  entrega_id text, rodada int default 1, titulo text, link text,
  enviado_em text, prazo text, status text default 'enviado',
  feedback text, respondido_em text, obs text
);


-- Links vivos do projeto: planilha, agenda, contrato, cronograma. É de onde
-- a informação vem, e o que precisa ser reconferido antes de decidir.
create table if not exists fontes (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  titulo text not null, url text, tipo text default 'link',
  responsavel_id text, frequencia text,       -- diaria | semanal | quando_mudar
  conferido_em text, obs text
);

-- Viagens do projeto: cada ida e volta com orçado próprio.
create table if not exists viagens (
  id text primary key, criado_em timestamptz default now(), criado_por text,
  chave text,                                 -- chave estável da carga inicial
  projeto_id text references projetos(id) on delete cascade,
  numero text, titulo text not null, ida text, volta text,
  origem text, destino text, cidade text, uf text,
  participantes jsonb default '[]'::jsonb,
  status text default 'prevista',             -- prevista | confirmada | feita
  orcado_cents bigint default 0, negociado_cents bigint default 0, obs text
);

-- ------------------------------------------------------- quem sou eu aqui ---
create or replace function public.membro_atual() returns text
language sql stable security definer set search_path = public as $$
  select id from membros
   where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     and coalesce(ativo, true)
   limit 1;
$$;

create or replace function public.papel_atual() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select papel from membros
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(ativo, true) limit 1), 'nenhum');
$$;

-- Atalhos de alçada.
create or replace function public.eh_producao() returns boolean
language sql stable as $$ select public.papel_atual() in ('admin','coord'); $$;

create or replace function public.eh_financeiro() returns boolean
language sql stable as $$ select public.papel_atual() in ('admin','fin'); $$;

create or replace function public.eh_gestao() returns boolean
language sql stable as $$ select public.papel_atual() in ('admin','coord','fin'); $$;

create or replace function public.eh_membro() returns boolean
language sql stable as $$ select public.papel_atual() <> 'nenhum'; $$;

-- --------------------------------------------------------------- policies ---
do $$
declare t text;
begin
  foreach t in array array['projetos','membros','etapas','tarefas','eventos','entregas',
                           'orcamento','lancamentos','contas','contratos','documentos',
                           'confirmacoes','atividades','locacoes','caixa','aprovacoes','contatos',
                           'viagens','fontes']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists p_sel on %I', t);
    execute format('drop policy if exists p_ins on %I', t);
    execute format('drop policy if exists p_upd on %I', t);
    execute format('drop policy if exists p_del on %I', t);
  end loop;
end $$;

-- Projeto, etapas, agenda e entregas: todo mundo do projeto lê; produção escreve.
create policy p_sel on projetos for select using (public.eh_membro());
create policy p_ins on projetos for insert with check (public.papel_atual() = 'admin');
create policy p_upd on projetos for update using (public.eh_producao());
create policy p_del on projetos for delete using (public.papel_atual() = 'admin');

create policy p_sel on membros for select using (public.eh_membro());
create policy p_ins on membros for insert with check (public.eh_producao());
create policy p_upd on membros for update using (public.eh_producao() or id = public.membro_atual());
create policy p_del on membros for delete using (public.papel_atual() = 'admin');

create policy p_sel on etapas for select using (public.eh_membro());
create policy p_ins on etapas for insert with check (public.eh_producao());
create policy p_upd on etapas for update using (public.eh_producao() or responsavel_id = public.membro_atual());
create policy p_del on etapas for delete using (public.eh_producao());

create policy p_sel on tarefas for select using (public.eh_membro());
create policy p_ins on tarefas for insert with check (public.eh_producao());
create policy p_upd on tarefas for update using (public.eh_producao() or responsavel_id = public.membro_atual());
create policy p_del on tarefas for delete using (public.eh_producao());

create policy p_sel on eventos for select using (public.eh_membro());
create policy p_ins on eventos for insert with check (public.eh_producao());
create policy p_upd on eventos for update using (public.eh_producao());
create policy p_del on eventos for delete using (public.eh_producao());

create policy p_sel on entregas for select using (public.eh_membro());
create policy p_ins on entregas for insert with check (public.eh_producao());
create policy p_upd on entregas for update using (public.eh_producao() or responsavel_id = public.membro_atual());
create policy p_del on entregas for delete using (public.eh_producao());

-- Orçamento: só gestão enxerga.
create policy p_sel on orcamento for select using (public.eh_gestao());
create policy p_ins on orcamento for insert with check (public.eh_gestao());
create policy p_upd on orcamento for update using (public.eh_gestao());
create policy p_del on orcamento for delete using (public.eh_gestao());

-- Lançamentos: gestão vê tudo; a equipe vê e cria só o que é dela, e só
-- consegue alterar enquanto estiver pendente de aprovação.
create policy p_sel on lancamentos for select
  using (public.eh_gestao() or membro_id = public.membro_atual() or criado_por = public.membro_atual());
create policy p_ins on lancamentos for insert with check (
  public.eh_gestao()
  or (criado_por = public.membro_atual() and status = 'pendente')
);
create policy p_upd on lancamentos for update using (
  public.eh_gestao()
  or (criado_por = public.membro_atual() and status = 'pendente')
);
create policy p_del on lancamentos for delete using (public.eh_gestao());

-- Contas a pagar/receber: gestão; a pessoa vê as contas dela (o próprio cachê).
create policy p_sel on contas for select using (public.eh_gestao() or membro_id = public.membro_atual());
create policy p_ins on contas for insert with check (public.eh_gestao());
create policy p_upd on contas for update using (public.eh_gestao());
create policy p_del on contas for delete using (public.eh_financeiro());

-- Contratos: gestão. (Valor e margem ficam escondidos na interface para a
-- coordenação; se quiser esconder no banco também, troque por eh_financeiro.)
create policy p_sel on contratos for select using (public.eh_gestao());
create policy p_ins on contratos for insert with check (public.eh_financeiro());
create policy p_upd on contratos for update using (public.eh_financeiro());
create policy p_del on contratos for delete using (public.papel_atual() = 'admin');

-- Documentos: gestão vê tudo; a equipe vê e sobe os próprios.
create policy p_sel on documentos for select using (public.eh_gestao() or membro_id = public.membro_atual() or criado_por = public.membro_atual());
create policy p_ins on documentos for insert with check (public.eh_membro());
create policy p_upd on documentos for update using (public.eh_gestao() or criado_por = public.membro_atual());
create policy p_del on documentos for delete using (public.eh_gestao() or criado_por = public.membro_atual());

-- Confirmações: cada um responde a sua; produção pede e acompanha todas.
create policy p_sel on confirmacoes for select using (public.eh_gestao() or membro_id = public.membro_atual());
create policy p_ins on confirmacoes for insert with check (public.eh_producao());
create policy p_upd on confirmacoes for update using (public.eh_producao() or membro_id = public.membro_atual());
create policy p_del on confirmacoes for delete using (public.eh_producao());

-- Locações e contatos: todo mundo do projeto lê (a equipe precisa do endereço
-- e do telefone no dia); produção escreve.
create policy p_sel on fontes for select using (public.eh_membro());
create policy p_ins on fontes for insert with check (public.eh_producao());
create policy p_upd on fontes for update using (public.eh_producao());
create policy p_del on fontes for delete using (public.eh_producao());

create policy p_sel on viagens for select using (public.eh_membro());
create policy p_ins on viagens for insert with check (public.eh_producao());
create policy p_upd on viagens for update using (public.eh_producao());
create policy p_del on viagens for delete using (public.eh_producao());

create policy p_sel on locacoes for select using (public.eh_membro());
create policy p_ins on locacoes for insert with check (public.eh_producao());
create policy p_upd on locacoes for update using (public.eh_producao());
create policy p_del on locacoes for delete using (public.eh_producao());

create policy p_sel on contatos for select using (public.eh_membro());
create policy p_ins on contatos for insert with check (public.eh_producao());
create policy p_upd on contatos for update using (public.eh_producao());
create policy p_del on contatos for delete using (public.eh_producao());

-- Caixinha: gestão vê e movimenta tudo; cada pessoa vê só a caixinha dela.
create policy p_sel on caixa for select using (public.eh_gestao() or membro_id = public.membro_atual());
create policy p_ins on caixa for insert with check (
  public.eh_gestao() or (membro_id = public.membro_atual() and tipo = 'devolucao')
);
create policy p_upd on caixa for update using (public.eh_gestao());
create policy p_del on caixa for delete using (public.eh_gestao());

-- Aprovações do cliente: todo mundo lê o status; produção registra.
create policy p_sel on aprovacoes for select using (public.eh_membro());
create policy p_ins on aprovacoes for insert with check (public.eh_producao());
create policy p_upd on aprovacoes for update using (public.eh_producao());
create policy p_del on aprovacoes for delete using (public.eh_producao());

create policy p_sel on atividades for select using (public.eh_membro());
create policy p_ins on atividades for insert with check (public.eh_membro());
create policy p_upd on atividades for update using (public.papel_atual() = 'admin');
create policy p_del on atividades for delete using (public.papel_atual() = 'admin');

-- ---------------------------------------------------------------- storage ---
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists doc_ler on storage.objects;
drop policy if exists doc_subir on storage.objects;
drop policy if exists doc_apagar on storage.objects;

create policy doc_ler on storage.objects for select
  using (bucket_id = 'documentos' and public.eh_membro());
create policy doc_subir on storage.objects for insert
  with check (bucket_id = 'documentos' and public.eh_membro());
create policy doc_apagar on storage.objects for delete
  using (bucket_id = 'documentos' and public.eh_gestao());

-- ------------------------------------------------------------ primeiro uso --
-- Troque pelo seu e-mail (o mesmo que você vai usar no login) e rode:
--
-- insert into membros (id, nome, email, papel, funcao)
-- values ('mem_admin', 'Seu Nome', 'voce@email.com', 'admin', 'Produção executiva');
--
-- Depois é só entrar no app: o resto (projeto, etapas, orçamento) você cria por lá.
