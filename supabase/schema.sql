-- LabTask: 研究室タスク共有アプリ スキーマ
-- Supabase SQL Editorで実行してください

-- =====================
-- テーブル作成
-- =====================

-- users テーブル（auth.usersを拡張）
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null default '',
  push_subscription jsonb,
  partner_id uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- categories テーブル
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('mine', 'partner', 'shared')),
  name text not null,
  color text not null default '#00d4ff',
  sort_order int not null default 0,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- tasks テーブル
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  owner_type text not null check (owner_type in ('mine', 'partner', 'shared')),
  title text not null,
  description text,
  due_date date,
  notify_start_date date,
  notify_end_date date,
  sort_order int not null default 0,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- task_completions テーブル
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(task_id, user_id)
);

-- push_subscriptions テーブル（複数デバイス対応）
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subscription jsonb not null,
  device_name text,
  created_at timestamptz not null default now()
);

-- =====================
-- インデックス
-- =====================
create index idx_categories_created_by on public.categories(created_by);
create index idx_tasks_category_id on public.tasks(category_id);
create index idx_tasks_created_by on public.tasks(created_by);
create index idx_task_completions_task_id on public.task_completions(task_id);
create index idx_task_completions_user_id on public.task_completions(user_id);
create index idx_push_subscriptions_user_id on public.push_subscriptions(user_id);

-- =====================
-- updated_at 自動更新トリガー
-- =====================
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at();

-- =====================
-- auth.users に連動してusersレコードを自動作成
-- =====================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================
-- 招待コード用テーブル
-- =====================
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  used_by uuid references public.users(id),
  used_at timestamptz
);

create index idx_invite_codes_code on public.invite_codes(code);

-- =====================
-- Row Level Security (RLS)
-- =====================
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.invite_codes enable row level security;

-- users: 自分とパートナーのみ読み取り可能
create policy "users_select" on public.users
  for select using (
    auth.uid() = id or
    auth.uid() = partner_id or
    id = (select partner_id from public.users where id = auth.uid())
  );

create policy "users_update_self" on public.users
  for update using (auth.uid() = id);

-- categories: 自分とパートナーの両方が読み書き可能
create policy "categories_select" on public.categories
  for select using (
    created_by = auth.uid() or
    created_by = (select partner_id from public.users where id = auth.uid())
  );

create policy "categories_insert" on public.categories
  for insert with check (created_by = auth.uid());

create policy "categories_update" on public.categories
  for update using (
    created_by = auth.uid() or
    created_by = (select partner_id from public.users where id = auth.uid())
  );

create policy "categories_delete" on public.categories
  for delete using (created_by = auth.uid());

-- tasks: 自分とパートナーが読み書き可能
create policy "tasks_select" on public.tasks
  for select using (
    created_by = auth.uid() or
    created_by = (select partner_id from public.users where id = auth.uid()) or
    owner_type = 'shared'
  );

create policy "tasks_insert" on public.tasks
  for insert with check (created_by = auth.uid());

create policy "tasks_update" on public.tasks
  for update using (
    created_by = auth.uid() or
    created_by = (select partner_id from public.users where id = auth.uid())
  );

create policy "tasks_delete" on public.tasks
  for delete using (created_by = auth.uid());

-- task_completions: 自分の完了レコードのみ操作可能、閲覧はパートナーも可
create policy "completions_select" on public.task_completions
  for select using (
    user_id = auth.uid() or
    user_id = (select partner_id from public.users where id = auth.uid())
  );

create policy "completions_insert" on public.task_completions
  for insert with check (user_id = auth.uid());

create policy "completions_delete" on public.task_completions
  for delete using (user_id = auth.uid());

-- push_subscriptions: 自分のみ
create policy "push_select" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_insert" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push_delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- invite_codes: 自分が作成したもの＋コードで参照（未使用のみ）
create policy "invite_select" on public.invite_codes
  for select using (
    created_by = auth.uid() or
    (used_by is null and expires_at > now())
  );

create policy "invite_insert" on public.invite_codes
  for insert with check (created_by = auth.uid());

create policy "invite_update" on public.invite_codes
  for update using (true);

-- =====================
-- Realtime有効化
-- =====================
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_completions;
alter publication supabase_realtime add table public.categories;
