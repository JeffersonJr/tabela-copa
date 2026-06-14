-- 1. Criar a tabela de palpites (predictions)
create table if not exists public.predictions (
  id text primary key, -- Código curto para compartilhamento (ex: nanoid)
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar Row Level Security (RLS)
alter table public.predictions enable row level security;

-- 3. Políticas de Segurança (RLS)
-- Qualquer pessoa pode ver um palpite usando o link curto
create policy "Qualquer um pode ver palpites"
on public.predictions
for select
using (true);

-- Apenas o usuário dono do palpite pode criar
create policy "Apenas o dono pode criar palpite"
on public.predictions
for insert
with check (auth.uid() = user_id);

-- Apenas o usuário dono do palpite pode alterar
create policy "Apenas o dono pode alterar palpite"
on public.predictions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
