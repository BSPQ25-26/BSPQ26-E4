begin;

-- Add support for global categories plus user-owned categories.
-- Global categories are represented by NULL user_id.

alter table public.categories
add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists categories_user_id_idx
on public.categories(user_id);

create unique index if not exists categories_global_name_unique_idx
on public.categories (lower(name))
where user_id is null;

create unique index if not exists categories_user_name_unique_idx
on public.categories (user_id, lower(name))
where user_id is not null;

alter table public.categories enable row level security;

drop policy if exists "categories_select_global_or_owned" on public.categories;
create policy "categories_select_global_or_owned"
on public.categories
for select
to authenticated
using (user_id is null or auth.uid() = user_id);

drop policy if exists "categories_insert_owned" on public.categories;
create policy "categories_insert_owned"
on public.categories
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "categories_update_owned" on public.categories;
create policy "categories_update_owned"
on public.categories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "categories_delete_owned" on public.categories;
create policy "categories_delete_owned"
on public.categories
for delete
to authenticated
using (auth.uid() = user_id);

commit;
