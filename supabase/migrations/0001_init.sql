-- SiCart: dynamic tables only. The catalog, store map, pairings and recipes are static typed data in the repo.
-- Mutations go through server route handlers with the service-role key. The browser only reads (anon) and
-- subscribes to the Realtime broadcast channel `cart:{id}`.

create extension if not exists pgcrypto;

-- people -------------------------------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key default gen_random_uuid(),
  persona_key text unique,                       -- 'aysel' | 'murad' for seeded personas, null for guests
  name        text not null,
  avatar      text,
  a11y_mode   boolean not null default false,
  is_guest    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.purchase_history (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  product_id  text not null,                     -- id from the static catalog
  count       integer not null default 1 check (count > 0),
  last_bought timestamptz not null default now(),
  primary key (profile_id, product_id)
);

create table public.offers (
  id           uuid primary key default gen_random_uuid(),
  product_id   text not null,
  profile_id   uuid references public.profiles(id) on delete cascade,   -- null = offer for everyone
  discount_pct integer not null check (discount_pct between 1 and 90),
  reason       text,
  created_at   timestamptz not null default now()
);
create index offers_profile_idx on public.offers (profile_id);

-- shopping lists -----------------------------------------------------------------------------------------
create table public.lists (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name       text not null default 'Weekly list',
  created_at timestamptz not null default now()
);

create table public.list_items (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists(id) on delete cascade,
  product_id text not null,
  qty        integer not null default 1 check (qty > 0),
  checked    boolean not null default false
);
create index list_items_list_idx on public.list_items (list_id);

-- carts and live sessions --------------------------------------------------------------------------------
create table public.carts (
  id             integer primary key,            -- the number on the cart, e.g. 12
  active_session uuid
);

create table public.cart_sessions (
  id         uuid primary key default gen_random_uuid(),
  cart_id    integer not null references public.carts(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  status     text not null default 'idle'
             check (status in ('idle', 'connected', 'shopping', 'checkout', 'paid')),
  position   jsonb not null default '{}'::jsonb, -- { x, y } on the store grid
  version    integer not null default 0,         -- incremented on every mutation, clients ignore stale snapshots
  state      jsonb not null default '{}'::jsonb, -- full session snapshot (cart items, list, route, offers ...)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cart_sessions_cart_idx on public.cart_sessions (cart_id, created_at desc);

alter table public.carts
  add constraint carts_active_session_fk
  foreign key (active_session) references public.cart_sessions(id) on delete set null;

create table public.receipts (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references public.cart_sessions(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  items      jsonb not null default '[]'::jsonb,
  total      numeric(10, 2) not null default 0,
  savings    numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index receipts_profile_idx on public.receipts (profile_id, created_at desc);

-- row level security: demo-grade (see plan assumption A4) --------------------------------------------------
-- Everything is readable by the browser (anon). Nothing is writable by anon: all writes go through the server
-- with the service-role key, which bypasses RLS.
alter table public.profiles         enable row level security;
alter table public.purchase_history enable row level security;
alter table public.offers           enable row level security;
alter table public.lists            enable row level security;
alter table public.list_items       enable row level security;
alter table public.carts            enable row level security;
alter table public.cart_sessions    enable row level security;
alter table public.receipts         enable row level security;

create policy "demo read" on public.profiles         for select to anon, authenticated using (true);
create policy "demo read" on public.purchase_history for select to anon, authenticated using (true);
create policy "demo read" on public.offers           for select to anon, authenticated using (true);
create policy "demo read" on public.lists            for select to anon, authenticated using (true);
create policy "demo read" on public.list_items       for select to anon, authenticated using (true);
create policy "demo read" on public.carts            for select to anon, authenticated using (true);
create policy "demo read" on public.cart_sessions    for select to anon, authenticated using (true);
create policy "demo read" on public.receipts         for select to anon, authenticated using (true);
