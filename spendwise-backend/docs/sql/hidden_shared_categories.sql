begin;

create table if not exists public.user_hidden_categories (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    category_id bigint not null references public.categories(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint user_hidden_categories_user_category_unique unique (user_id, category_id)
);

create index if not exists user_hidden_categories_user_id_idx
on public.user_hidden_categories(user_id);

create index if not exists user_hidden_categories_category_id_idx
on public.user_hidden_categories(category_id);

alter table public.user_hidden_categories enable row level security;

drop policy if exists "user_hidden_categories_select_owned" on public.user_hidden_categories;
create policy "user_hidden_categories_select_owned"
on public.user_hidden_categories
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_hidden_categories_insert_owned" on public.user_hidden_categories;
create policy "user_hidden_categories_insert_owned"
on public.user_hidden_categories
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_hidden_categories_delete_owned" on public.user_hidden_categories;
create policy "user_hidden_categories_delete_owned"
on public.user_hidden_categories
for delete
to authenticated
using (auth.uid() = user_id);

commit;
