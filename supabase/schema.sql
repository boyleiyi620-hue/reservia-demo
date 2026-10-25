-- Randevu demo Supabase schema
-- Apply this file in the Supabase SQL Editor as a privileged database role.
-- No service-role key is required by the application. Public clients should call
-- the SECURITY DEFINER RPCs below rather than writing directly to protected tables.

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (length(btrim(name)) between 1 and 160),
  category text not null default '' check (length(category) <= 120),
  location text not null default '' check (length(location) <= 300),
  about text not null default '' check (length(about) <= 4000),
  theme_color text not null default '#2563eb' check (theme_color ~ '^#[0-9A-Fa-f]{6}$'),
  timezone text not null default 'Europe/Istanbul' check (length(timezone) between 1 and 100),
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 1440),
  capacity integer not null default 1 check (capacity between 1 and 100000),
  advance_booking_days integer not null default 30 check (advance_booking_days between 0 and 3650),
  weekdays smallint[] not null default '{1,2,3,4,5}'::smallint[] check (
    cardinality(weekdays) between 0 and 7
    and weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table if not exists public.business_hours (
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time not null,
  close_time time not null,
  primary key (business_id, weekday),
  check (close_time > open_time)
);

create table if not exists public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  booking_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  local_date date not null,
  local_time time not null,
  service text not null check (length(btrim(service)) between 1 and 160),
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 1440),
  party integer not null check (party between 1 and 100000),
  customer_name text not null check (length(btrim(customer_name)) between 1 and 200),
  customer_email text not null check (length(btrim(customer_email)) between 3 and 320),
  customer_phone text not null default '' check (length(customer_phone) <= 80),
  notes text not null default '' check (length(notes) <= 4000),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings add column if not exists duration_minutes integer not null default 30
  check (duration_minutes between 5 and 1440);

create index if not exists business_members_user_idx on public.business_members(user_id, business_id);
create index if not exists business_services_public_idx on public.business_services(business_id, active, sort_order);
create index if not exists bookings_business_slot_idx on public.bookings(business_id, local_date, local_time)
  where status in ('pending', 'confirmed');
create index if not exists bookings_business_status_idx on public.bookings(business_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at before update on public.businesses
for each row execute function public.set_updated_at();
drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings
for each row execute function public.set_updated_at();

create or replace function public.guard_cancelled_booking()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'cancelled booking cannot be reactivated';
  end if;
  return new;
end;
$$;
drop trigger if exists bookings_guard_cancelled on public.bookings;
create trigger bookings_guard_cancelled before update of status on public.bookings
for each row execute function public.guard_cancelled_booking();

-- Public-facing business data is exposed only when published. Membership rows,
-- booking rows, customer data, and owner IDs are never public.
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_hours enable row level security;
alter table public.business_services enable row level security;
alter table public.bookings enable row level security;

drop policy if exists businesses_public_read on public.businesses;
create policy businesses_public_read on public.businesses for select to anon, authenticated
  using (published);
drop policy if exists businesses_owner_read on public.businesses;
create policy businesses_owner_read on public.businesses for select to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = businesses.id and m.user_id = (select auth.uid())
  ));
drop policy if exists businesses_owner_update on public.businesses;
create policy businesses_owner_update on public.businesses for update to authenticated
  using (exists (select 1 from public.business_members m where m.business_id = businesses.id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.business_members m where m.business_id = businesses.id and m.user_id = (select auth.uid())));

drop policy if exists hours_public_read on public.business_hours;
create policy hours_public_read on public.business_hours for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id = business_hours.business_id and b.published));
drop policy if exists hours_owner_read on public.business_hours;
create policy hours_owner_read on public.business_hours for select to authenticated
  using (exists (select 1 from public.business_members m where m.business_id = business_hours.business_id and m.user_id = (select auth.uid())));
drop policy if exists services_public_read on public.business_services;
create policy services_public_read on public.business_services for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id = business_services.business_id and b.published));
drop policy if exists services_owner_read on public.business_services;
create policy services_owner_read on public.business_services for select to authenticated
  using (exists (select 1 from public.business_members m where m.business_id = business_services.business_id and m.user_id = (select auth.uid())));

drop policy if exists members_owner_read on public.business_members;
create policy members_owner_read on public.business_members for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists bookings_owner_read on public.bookings;
create policy bookings_owner_read on public.bookings for select to authenticated
  using (exists (select 1 from public.business_members m where m.business_id = bookings.business_id and m.user_id = (select auth.uid())));
drop policy if exists bookings_owner_update on public.bookings;
create policy bookings_owner_update on public.bookings for update to authenticated
  using (exists (select 1 from public.business_members m where m.business_id = bookings.business_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.business_members m where m.business_id = bookings.business_id and m.user_id = (select auth.uid())));

-- Public tables are deliberately not writable. RPCs below are the only public
-- booking/business creation paths.
revoke all on table public.businesses, public.business_members, public.business_hours,
  public.business_services, public.bookings from public, anon, authenticated;
grant select on public.businesses, public.business_hours, public.business_services to anon, authenticated;
revoke update on public.businesses from authenticated;
grant select on public.business_members, public.bookings to authenticated;
grant update (status) on public.bookings to authenticated;

create or replace function public.create_business(
  p_name text, p_category text, p_location text, p_about text, p_timezone text
) returns uuid
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_slug text;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 160 then raise exception 'invalid business name'; end if;
  if p_timezone is null or not exists (select 1 from pg_timezone_names where name = p_timezone) then raise exception 'invalid timezone'; end if;
  v_slug := lower(regexp_replace(regexp_replace(btrim(p_name), '[^[:alnum:]]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  insert into public.businesses(name, slug, category, location, about, timezone)
    values (btrim(p_name), v_slug, coalesce(btrim(p_category), ''), coalesce(btrim(p_location), ''), coalesce(btrim(p_about), ''), p_timezone)
    returning id into v_id;
  insert into public.business_members(business_id, user_id, role) values (v_id, v_user, 'owner');
  insert into public.business_hours(business_id, weekday, open_time, close_time)
    values (v_id, 1, '09:00', '17:00'), (v_id, 2, '09:00', '17:00'), (v_id, 3, '09:00', '17:00'),
           (v_id, 4, '09:00', '17:00'), (v_id, 5, '09:00', '17:00');
  insert into public.business_services(business_id, name, sort_order)
    values (v_id, 'Randevu', 0);
  return v_id;
end;
$$;

create or replace function public.update_business_settings(
  p_business_id uuid, p_name text, p_category text, p_location text, p_about text,
  p_theme_color text, p_timezone text, p_duration_minutes integer, p_capacity integer,
  p_advance_booking_days integer, p_weekdays smallint[], p_services text[],
  p_hours jsonb, p_published boolean
) returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_business public.businesses%rowtype;
  v_hour jsonb;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select b.* into v_business from public.businesses b
    where b.id = p_business_id and exists (
      select 1 from public.business_members m where m.business_id = b.id and m.user_id = v_user
    ) for update;
  if not found then raise exception 'business not found'; end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 160 then raise exception 'invalid business name'; end if;
  if p_theme_color is null or p_theme_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid theme color'; end if;
  if p_timezone is null or not exists (select 1 from pg_timezone_names where name = p_timezone) then raise exception 'invalid timezone'; end if;
  if p_duration_minutes is null or p_duration_minutes not between 5 and 1440 then raise exception 'invalid appointment duration'; end if;
  if p_capacity is null or p_capacity not between 1 and 100000 then raise exception 'invalid capacity'; end if;
  if p_advance_booking_days is null or p_advance_booking_days not between 0 and 3650 then raise exception 'invalid booking range'; end if;
  if coalesce(cardinality(p_weekdays),0) = 0 or not (p_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]) then raise exception 'select at least one valid weekday'; end if;
  if coalesce(cardinality(p_services),0) = 0 or exists (
    select 1 from unnest(p_services) as s(name) where length(btrim(s.name)) not between 1 and 160
  ) then raise exception 'add at least one valid service'; end if;
  if p_hours is null or jsonb_typeof(p_hours) <> 'array' then raise exception 'invalid opening hours'; end if;
  if jsonb_array_length(p_hours) <> cardinality(p_weekdays) then raise exception 'invalid opening hours'; end if;
  update public.businesses set name=btrim(p_name), category=coalesce(btrim(p_category),''),
    location=coalesce(btrim(p_location),''), about=coalesce(btrim(p_about),''), theme_color=p_theme_color,
    timezone=p_timezone, duration_minutes=p_duration_minutes, capacity=p_capacity,
    advance_booking_days=p_advance_booking_days, weekdays=p_weekdays, published=coalesce(p_published,false)
    where id=p_business_id;
  delete from public.business_hours where business_id=p_business_id;
  for v_hour in select value from jsonb_array_elements(p_hours) loop
    if (v_hour->>'weekday')::smallint <> all(p_weekdays) then raise exception 'opening day does not match selected weekday'; end if;
    insert into public.business_hours(business_id, weekday, open_time, close_time)
      values (p_business_id, (v_hour->>'weekday')::smallint,
        (v_hour->>'open_time')::time, (v_hour->>'close_time')::time);
  end loop;
  delete from public.business_services where business_id=p_business_id;
  insert into public.business_services(business_id, name, sort_order, active)
    select p_business_id, btrim(s.name), s.ordinality::integer - 1, true
    from unnest(p_services) with ordinality as s(name, ordinality);
end;
$$;

-- Internal helper: maximum simultaneous occupancy within a proposed interval.
create or replace function public.slot_peak_load(p_business_id uuid, p_date date, p_time time, p_duration integer)
returns integer language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(max((select coalesce(sum(x.party),0) from public.bookings x
    where x.business_id=p_business_id and x.local_date=p_date and x.status in ('pending','confirmed')
      and x.local_date+x.local_time <= points.point
      and x.local_date+x.local_time+make_interval(mins=>x.duration_minutes) > points.point)),0)::integer
  from (
    select p_date+p_time as point
    union
    select y.local_date+y.local_time from public.bookings y
      where y.business_id=p_business_id and y.local_date=p_date and y.status in ('pending','confirmed')
        and y.local_date+y.local_time > p_date+p_time
        and y.local_date+y.local_time < p_date+p_time+make_interval(mins=>p_duration)
  ) points;
$$;
revoke all on function public.slot_peak_load(uuid,date,time,integer) from public, anon, authenticated;

create or replace function public.available_slots(p_slug text, p_date date, p_party integer)
returns table(slot_time time, available boolean, remaining integer)
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare
  b public.businesses%rowtype;
  h public.business_hours%rowtype;
  v_dow integer;
  v_today date;
  v_last date;
begin
  if p_party is null or p_party < 1 then return; end if;
  select * into b from public.businesses where slug = p_slug
    and (published = true or exists (select 1 from public.business_members m where m.business_id = businesses.id and m.user_id = auth.uid())) limit 1;
  if not found or p_date is null then return; end if;
  if not exists (select 1 from pg_timezone_names where name = b.timezone) then return; end if;
  v_today := (now() at time zone b.timezone)::date;
  v_last := v_today + b.advance_booking_days;
  if p_date < v_today or p_date > v_last then return; end if;
  v_dow := extract(dow from p_date)::integer;
  if not (v_dow::smallint = any(b.weekdays)) then return; end if;
  select * into h from public.business_hours where business_id = b.id and weekday = v_dow;
  if not found then return; end if;
  return query
  select gs::time,
    greatest(b.capacity - public.slot_peak_load(b.id,p_date,gs::time,b.duration_minutes),0) >= p_party,
    greatest(b.capacity - public.slot_peak_load(b.id,p_date,gs::time,b.duration_minutes),0)::integer
  from generate_series(p_date + h.open_time, (p_date + h.close_time) - make_interval(mins => b.duration_minutes), make_interval(mins => b.duration_minutes)) gs
  where gs > (now() at time zone b.timezone);
end;
$$;

create or replace function public.create_public_booking(
  p_slug text, p_date date, p_time time, p_service text, p_party integer,
  p_customer_name text, p_email text, p_phone text, p_notes text
) returns table(booking_id uuid, booking_code text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  b public.businesses%rowtype;
  h public.business_hours%rowtype;
  v_dow integer;
  v_today date;
  v_last date;
  v_load integer;
  v_id uuid;
  v_code text;
  v_allowed boolean;
begin
  if p_party is null or p_party < 1 or p_party > 100000 then raise exception 'invalid party size'; end if;
  if p_date is null or p_time is null or p_service is null or length(btrim(p_service)) not between 1 and 160 then raise exception 'invalid booking details'; end if;
  if p_customer_name is null or length(btrim(p_customer_name)) not between 1 and 200 then raise exception 'invalid customer name'; end if;
  if p_email is null or length(btrim(p_email)) not between 3 and 320 then raise exception 'invalid email'; end if;
  select * into b from public.businesses where slug=p_slug
    and (published=true or exists (select 1 from public.business_members m where m.business_id = businesses.id and m.user_id = auth.uid())) for share;
  if not found then raise exception 'business unavailable'; end if;
  if not exists (select 1 from pg_timezone_names where name=b.timezone) then raise exception 'business unavailable'; end if;
  v_today := (now() at time zone b.timezone)::date;
  v_last := v_today + b.advance_booking_days;
  if p_date < v_today or p_date > v_last then raise exception 'date outside booking window'; end if;
  v_dow := extract(dow from p_date)::integer;
  if not (v_dow::smallint = any(b.weekdays)) then raise exception 'business closed'; end if;
  select * into h from public.business_hours where business_id=b.id and weekday=v_dow;
  if not found or p_time < h.open_time or p_date+p_time+make_interval(mins=>b.duration_minutes) > p_date+h.close_time or p_date+p_time <= (now() at time zone b.timezone) then raise exception 'time unavailable'; end if;
  v_allowed := extract(epoch from (p_time - h.open_time))::bigint % (b.duration_minutes * 60) = 0;
  if not v_allowed then raise exception 'time is not an available slot'; end if;
  if not exists (select 1 from public.business_services s where s.business_id=b.id and s.active=true and lower(s.name)=lower(btrim(p_service))) then raise exception 'service unavailable'; end if;
  -- Serialize all writers for this business/day, including overlapping durations.
  perform pg_advisory_xact_lock(hashtextextended(b.id::text || '|' || p_date::text, 0));
  select public.slot_peak_load(b.id,p_date,p_time,b.duration_minutes) into v_load;
  if v_load + p_party > b.capacity then raise exception 'slot is full'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.bookings(business_id, booking_code, local_date, local_time, service, duration_minutes, party, customer_name, customer_email, customer_phone, notes)
        values (b.id, v_code, p_date, p_time, btrim(p_service), b.duration_minutes, p_party, btrim(p_customer_name), btrim(p_email), coalesce(btrim(p_phone),''), coalesce(btrim(p_notes),''))
        returning id into v_id;
      exit;
    exception when unique_violation then
      -- Extremely unlikely code collision; retry with a new cryptographic code.
    end;
  end loop;
  return query select v_id, v_code;
end;
$$;

revoke all on function public.create_business(text,text,text,text,text) from public;
grant execute on function public.create_business(text,text,text,text,text) to authenticated;
revoke all on function public.update_business_settings(uuid,text,text,text,text,text,text,integer,integer,integer,smallint[],text[],jsonb,boolean) from public;
grant execute on function public.update_business_settings(uuid,text,text,text,text,text,text,integer,integer,integer,smallint[],text[],jsonb,boolean) to authenticated;
revoke all on function public.available_slots(text,date,integer) from public;
grant execute on function public.available_slots(text,date,integer) to anon, authenticated;
revoke all on function public.create_public_booking(text,date,time,text,integer,text,text,text,text) from public;
grant execute on function public.create_public_booking(text,date,time,text,integer,text,text,text,text) to anon, authenticated;

-- Optional owner-side writes to services/hours can be added later through
-- authenticated, owner-checked RPCs; direct anon writes remain impossible.
comment on table public.business_members is 'Private ownership mapping; never expose user_id through public business queries.';
comment on function public.available_slots(text,date,integer) is 'Public availability only: slot_time, available, remaining; no customer or booking identifiers.';
comment on function public.create_public_booking(text,date,time,text,integer,text,text,text,text) is 'Atomic public booking creation with per-business/date/time advisory locking.';

-- Enable owner-side live booking updates when Supabase Realtime is available.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
     ) then
    execute 'alter publication supabase_realtime add table public.bookings';
  end if;
end;
$$;
