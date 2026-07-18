-- ChapterLens production schema. Run with `supabase db push`.
create extension if not exists vector with schema extensions;

create table public.analyses (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  source_text text not null check (char_length(source_text) between 120 and 50000),
  report jsonb not null,
  status text not null default 'completed' check (status in ('processing', 'completed', 'failed')),
  word_count integer not null default 0,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12,6),
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index analyses_user_created_idx on public.analyses(user_id, created_at desc);

create table public.document_chunks (
  id bigint generated always as identity primary key,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  start_offset integer not null,
  end_offset integer not null,
  embedding extensions.vector(1536),
  unique (analysis_id, chunk_index)
);

create index document_chunks_analysis_idx on public.document_chunks(analysis_id, chunk_index);
create index document_chunks_embedding_idx on public.document_chunks using hnsw (embedding vector_cosine_ops);

create table public.feedback (
  id bigint generated always as identity primary key,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  helpful boolean not null,
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (analysis_id, user_id)
);

create table public.daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (now() at time zone 'utc')::date,
  analysis_count integer not null default 0 check (analysis_count >= 0),
  estimated_cost_usd numeric(12,6) not null default 0,
  primary key (user_id, usage_date)
);

create table public.monthly_budget_reservations (
  month_start date primary key,
  reserved_cost_usd numeric(12,6) not null default 0 check (reserved_cost_usd >= 0),
  updated_at timestamptz not null default now()
);

create table public.app_config (
  key text primary key,
  numeric_value numeric not null check (numeric_value >= 0)
);

insert into public.app_config(key, numeric_value) values
  ('daily_analysis_limit', 5),
  ('monthly_budget_usd', 25),
  ('request_reservation_usd', 0.25);

alter table public.analyses enable row level security;
alter table public.document_chunks enable row level security;
alter table public.feedback enable row level security;
alter table public.daily_usage enable row level security;
alter table public.monthly_budget_reservations enable row level security;
alter table public.app_config enable row level security;

create policy "Users read their analyses" on public.analyses for select using (auth.uid() = user_id);
create policy "Users create their analyses" on public.analyses for insert with check (auth.uid() = user_id);
create policy "Users update their analyses" on public.analyses for update using (auth.uid() = user_id);
create policy "Users delete their analyses" on public.analyses for delete using (auth.uid() = user_id);

create policy "Users read their chunks" on public.document_chunks for select using (auth.uid() = user_id);
create policy "Users create their chunks" on public.document_chunks for insert with check (auth.uid() = user_id);
create policy "Users delete their chunks" on public.document_chunks for delete using (auth.uid() = user_id);

create policy "Users read their feedback" on public.feedback for select using (auth.uid() = user_id);
create policy "Users create their feedback" on public.feedback for insert with check (auth.uid() = user_id);
create policy "Users update their feedback" on public.feedback for update using (auth.uid() = user_id);

create policy "Users read their usage" on public.daily_usage for select using (auth.uid() = user_id);

create or replace function public.consume_analysis_quota()
returns table(allowed boolean, remaining integer, reset_at timestamptz, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_date date := (now() at time zone 'utc')::date;
  v_count integer;
  v_reserved_cost numeric;
  v_daily_limit integer;
  v_monthly_budget_usd numeric;
  v_request_reservation_usd numeric;
begin
  if v_user_id is null then
    return query select false, 0, date_trunc('day', now() at time zone 'utc') + interval '1 day', 'authentication_required'::text;
    return;
  end if;

  select numeric_value::integer into strict v_daily_limit
    from public.app_config where key = 'daily_analysis_limit';
  select numeric_value into strict v_monthly_budget_usd
    from public.app_config where key = 'monthly_budget_usd';
  select numeric_value into strict v_request_reservation_usd
    from public.app_config where key = 'request_reservation_usd';

  if v_request_reservation_usd > v_monthly_budget_usd then
    return query select false, 0,
      date_trunc('month', now() at time zone 'utc') + interval '1 month',
      'monthly_budget_reached'::text;
    return;
  end if;

  insert into public.monthly_budget_reservations(month_start, reserved_cost_usd)
  values (date_trunc('month', v_date)::date, v_request_reservation_usd)
  on conflict (month_start) do update
    set reserved_cost_usd = public.monthly_budget_reservations.reserved_cost_usd + excluded.reserved_cost_usd,
        updated_at = now()
    where public.monthly_budget_reservations.reserved_cost_usd + excluded.reserved_cost_usd <= v_monthly_budget_usd
  returning reserved_cost_usd into v_reserved_cost;

  if v_reserved_cost is null then
    return query select false, 0,
      date_trunc('month', now() at time zone 'utc') + interval '1 month',
      'monthly_budget_reached'::text;
    return;
  end if;

  insert into public.daily_usage(user_id, usage_date, analysis_count)
  values (v_user_id, v_date, 1)
  on conflict (user_id, usage_date) do update
    set analysis_count = public.daily_usage.analysis_count + 1
    where public.daily_usage.analysis_count < v_daily_limit
  returning analysis_count into v_count;

  if v_count is null then
    update public.monthly_budget_reservations
      set reserved_cost_usd = greatest(0, reserved_cost_usd - v_request_reservation_usd),
          updated_at = now()
      where month_start = date_trunc('month', v_date)::date;
    select analysis_count into v_count from public.daily_usage
      where user_id = v_user_id and usage_date = v_date;
    return query select false, 0, (v_date + 1)::timestamp at time zone 'utc', 'daily_limit_reached'::text;
  else
    return query select true, greatest(0, v_daily_limit - v_count), (v_date + 1)::timestamp at time zone 'utc', 'allowed'::text;
  end if;
end;
$$;

revoke all on function public.consume_analysis_quota() from public;
grant execute on function public.consume_analysis_quota() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manuscripts', 'manuscripts', false, 1048576, array['text/plain'])
on conflict (id) do nothing;

create policy "Users own manuscript uploads" on storage.objects for all
using (bucket_id = 'manuscripts' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'manuscripts' and (storage.foldername(name))[1] = auth.uid()::text);
