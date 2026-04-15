create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text,
  first_name text not null,
  skin_goal text not null default 'Calm acne without guessing every trigger',
  created_at timestamptz not null default now()
);

create table if not exists reminder_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  preferred_time text not null default '20:30',
  channel text not null default 'in_app',
  enabled boolean not null default true,
  last_sent_on date,
  updated_at timestamptz not null default now()
);

alter table profiles add column if not exists email text;
alter table reminder_preferences add column if not exists last_sent_on date;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null,
  status text not null default 'confirmed',
  raw_text text,
  transcript text,
  structured_log jsonb not null,
  input_modes text[] not null default '{}',
  streak_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table if not exists entry_attachments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references daily_entries(id) on delete cascade,
  kind text not null,
  storage_path text,
  public_url text,
  created_at timestamptz not null default now()
);

insert into profiles (id, first_name, skin_goal)
values ('00000000-0000-0000-0000-000000000001', 'Vinayak', 'Calm acne without overthinking every meal')
on conflict (id) do nothing;

insert into reminder_preferences (user_id, preferred_time, channel, enabled)
values ('00000000-0000-0000-0000-000000000001', '20:30', 'in_app', true)
on conflict (user_id) do nothing;
