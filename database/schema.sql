create extension if not exists "uuid-ossp";

-- =========================
-- 0) NARRATIVA GLOBAL DEL JUEGO
-- =========================
create table if not exists game_narrative (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,           -- ej: 'historia-base'
  title text not null,
  body_markdown text not null,         -- narrativa larga (Markdown)
  locale text not null default 'es-CO',
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function game_narrative_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_game_narrative_updated on game_narrative;
create trigger trg_game_narrative_updated
before update on game_narrative
for each row execute function game_narrative_set_updated_at();


-- =========================
-- 1) TABLAS BASE DEL JUEGO (NIVELES Y CONTEXTO)
-- =========================
create table if not exists level (
  key text primary key,                -- 'junior' | 'senior' | 'master'
  display_name text not null,
  rules_json jsonb not null default '{}'::jsonb
);

create table if not exists level_context (
  id uuid primary key default uuid_generate_v4(),
  level_key text not null references level(key) on delete cascade,
  title text not null,
  summary text not null,
  intro_markdown text not null,
  objectives jsonb not null default '[]'::jsonb,
  locale text not null default 'es-CO',
  version int not null default 1
);
create index if not exists idx_level_context_level on level_context(level_key);


-- =========================
-- 2) PERSONAJES / MENTORES
-- =========================
create table if not exists character (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text not null,
  bio text not null,
  image_url text,
  is_mentor boolean not null default false
);

create table if not exists level_character (
  level_key text not null references level(key) on delete cascade,
  character_id uuid not null references character(id) on delete cascade,
  position int not null default 0,
  primary key (level_key, character_id)
);
create index if not exists idx_level_character_level on level_character(level_key);


-- =========================
-- 3) PROMPTS / PLANTILLAS DE IA
-- =========================
create table if not exists prompt_template (
  id uuid primary key default uuid_generate_v4(),
  level_key text not null references level(key) on delete cascade,
  version int not null default 1,
  template_text text not null,
  constraints_json jsonb not null default '{}'::jsonb,
  unique(level_key, version)
);


-- =========================
-- 4) SETS DE RETOS
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'set_status') then
    create type set_status as enum ('open','completed','failed');
  end if;
end$$;

create table if not exists generated_set (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  level_key text not null references level(key) on delete cascade,
  provider text not null default 'mock',
  seed text,
  prompt_version int not null default 1,
  status set_status not null default 'open',
  next_index int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un solo set ABIERTO por usuario + nivel
create unique index if not exists uniq_open_set_per_level_user
  on generated_set(user_id, level_key)
  where status = 'open';

create index if not exists idx_generated_set_user on generated_set(user_id);
create index if not exists idx_generated_set_level on generated_set(level_key);


-- =========================
-- 5) ÍTEMS (RETOS INDIVIDUALES)
-- =========================
create table if not exists generated_item (
  id uuid primary key default uuid_generate_v4(),
  set_id uuid not null references generated_set(id) on delete cascade,
  item_index int not null check (item_index between 1 and 20),
  kind text not null check (kind in ('main','random','boss')),
  question text not null,
  options_json jsonb not null,         -- ["A","B","C","D"]
  answer_index int not null,           -- 1..4
  explanation text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  mentor_id uuid references character(id), -- main/random con mentor; boss NULL
  unique(set_id, item_index)
);
create index if not exists idx_generated_item_set on generated_item(set_id);
create index if not exists idx_generated_item_mentor on generated_item(mentor_id);


-- =========================
-- 6) USUARIOS / PROGRESO
-- =========================
create table if not exists app_user (
  id uuid primary key default uuid_generate_v4(),
  email text unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists player_state (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references app_user(id) on delete cascade,
  level_key text not null references level(key) on delete cascade,
  current_set_id uuid references generated_set(id) on delete set null,
  next_index int not null default 1,
  score int not null default 0,
  flags_json jsonb not null default '{}'::jsonb,
  unique(user_id, level_key)
);
create index if not exists idx_player_state_user on player_state(user_id);


-- =========================
-- 7) INTENTOS (RESPUESTAS DEL JUGADOR)
-- =========================
create table if not exists attempt (
  id uuid primary key default uuid_generate_v4(),
  set_id uuid not null references generated_set(id) on delete cascade,
  user_id uuid not null references app_user(id) on delete cascade,
  item_index int not null,
  answer_given int not null,
  is_correct boolean not null,
  taken_at timestamptz not null default now(),
  unique(set_id, item_index, user_id)
);
create index if not exists idx_attempt_user on attempt(user_id);
create index if not exists idx_attempt_set on attempt(set_id);


-- =========================
-- 8) TRIGGERS DE updated_at
-- =========================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_generated_set_updated on generated_set;
create trigger trg_generated_set_updated
before update on generated_set
for each row execute function set_updated_at();
