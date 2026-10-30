-- =============================================================================
-- Tamurt Events — 0200 : référentiels (pays, divisions administratives, villes,
-- catégories, paramètres applicatifs)
-- Les référentiels sont nécessaires en production : ils sont donc dans une
-- migration (et non dans le seed de démonstration).
-- =============================================================================

create table public.countries (
  code char(2) primary key check (code ~ '^[A-Z]{2}$'),
  names jsonb not null check (jsonb_typeof(names) = 'object' and names ? 'fr' and names ? 'en'),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  default_timezone text not null,
  default_locale text not null check (default_locale in ('fr', 'en', 'ar')),
  locales text[] not null,
  distance_unit text not null check (distance_unit in ('km', 'mi')),
  phone_prefix text not null check (phone_prefix ~ '^\+[0-9]{1,4}$'),
  region_type public.region_type not null,
  first_day_of_week smallint not null check (first_day_of_week between 0 and 6),
  weekend_days smallint[] not null,
  tax_display text not null check (tax_display in ('inclusive', 'exclusive')),
  is_active boolean not null default true,
  -- Activation de la vente réelle : uniquement après validation juridique et contractuelle.
  ticket_sales_live_enabled boolean not null default false,
  resale_live_enabled boolean not null default false,
  resale_legal_status text not null default 'not_reviewed'
    check (resale_legal_status in ('not_reviewed', 'allowed_with_conditions', 'prohibited')),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.countries.ticket_sales_live_enabled is
  'Vente réelle de billets autorisée dans ce pays. FALSE tant que les accords et obligations ne sont pas validés.';

create trigger countries_set_updated_at before update on public.countries
  for each row execute function public.set_updated_at();

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries (code) on delete cascade,
  code text not null check (char_length(code) between 1 and 12),
  names jsonb not null check (jsonb_typeof(names) = 'object' and names ? 'fr'),
  type public.region_type not null,
  parent_id uuid references public.regions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (country_code, code)
);

create index regions_country_idx on public.regions (country_code);
create index regions_parent_idx on public.regions (parent_id);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries (code) on delete cascade,
  region_id uuid references public.regions (id) on delete set null,
  slug text not null check (public.is_valid_slug(slug)),
  names jsonb not null check (jsonb_typeof(names) = 'object' and names ? 'fr'),
  timezone text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(Point, 4326) generated always as (public.make_geo_point(lat, lng)) stored,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, slug)
);

create index cities_country_idx on public.cities (country_code);
create index cities_region_idx on public.cities (region_id);
create index cities_location_idx on public.cities using gist (location);
create index cities_name_trgm_idx on public.cities using gin (public.search_normalize(names ->> 'fr') extensions.gin_trgm_ops);

create trigger cities_set_updated_at before update on public.cities
  for each row execute function public.set_updated_at();

create or replace function public.cities_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_valid_timezone(new.timezone) then
    raise exception 'invalid_timezone: %', new.timezone using errcode = '22023';
  end if;
  if new.region_id is not null and not exists (
    select 1 from public.regions r where r.id = new.region_id and r.country_code = new.country_code
  ) then
    raise exception 'region_country_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger cities_validate before insert or update on public.cities
  for each row execute function public.cities_validate();

create table public.event_categories (
  slug text primary key check (public.is_valid_slug(slug)),
  names jsonb not null check (jsonb_typeof(names) = 'object' and names ? 'fr' and names ? 'en'),
  icon text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Paramètres applicatifs (clé/valeur). is_public = lisible par tous les clients.
create table public.app_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_.]*$'),
  value jsonb not null,
  is_public boolean not null default false,
  description text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger app_settings_set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Données de référence
-- -----------------------------------------------------------------------------
insert into public.countries
  (code, names, currency, default_timezone, default_locale, locales, distance_unit, phone_prefix,
   region_type, first_day_of_week, weekend_days, tax_display, sort_order)
values
  ('FR', '{"fr":"France","en":"France","ar":"فرنسا"}', 'EUR', 'Europe/Paris', 'fr', '{fr,en,ar}', 'km', '+33',
   'department', 1, '{6,0}', 'inclusive', 1),
  ('DZ', '{"fr":"Algérie","en":"Algeria","ar":"الجزائر"}', 'DZD', 'Africa/Algiers', 'fr', '{fr,ar,en}', 'km', '+213',
   'wilaya', 6, '{5,6}', 'inclusive', 2),
  ('US', '{"fr":"États-Unis","en":"United States","ar":"الولايات المتحدة"}', 'USD', 'America/New_York', 'en', '{en,fr,ar}', 'mi', '+1',
   'state', 0, '{6,0}', 'exclusive', 3),
  ('CA', '{"fr":"Canada","en":"Canada","ar":"كندا"}', 'CAD', 'America/Toronto', 'en', '{en,fr,ar}', 'km', '+1',
   'province', 0, '{6,0}', 'exclusive', 4);

-- Divisions administratives : seules celles nécessaires aux villes de lancement sont
-- pré-remplies. Les listes complètes doivent être importées depuis des sources officielles
-- (INSEE, Journal officiel algérien, USPS, Statistique Canada) via l'administration.
insert into public.regions (country_code, code, names, type) values
  ('FR', 'IDF', '{"fr":"Île-de-France","en":"Île-de-France","ar":"إيل دو فرانس"}', 'region'),
  ('FR', 'PAC', '{"fr":"Provence-Alpes-Côte d''Azur","en":"Provence-Alpes-Côte d''Azur","ar":"بروفانس ألب كوت دازور"}', 'region'),
  ('FR', 'ARA', '{"fr":"Auvergne-Rhône-Alpes","en":"Auvergne-Rhône-Alpes","ar":"أوفيرن رون ألب"}', 'region'),
  ('DZ', '16', '{"fr":"Alger","en":"Algiers","ar":"الجزائر"}', 'wilaya'),
  ('DZ', '15', '{"fr":"Tizi Ouzou","en":"Tizi Ouzou","ar":"تيزي وزو"}', 'wilaya'),
  ('DZ', '06', '{"fr":"Béjaïa","en":"Béjaïa","ar":"بجاية"}', 'wilaya'),
  ('DZ', '31', '{"fr":"Oran","en":"Oran","ar":"وهران"}', 'wilaya'),
  ('DZ', '25', '{"fr":"Constantine","en":"Constantine","ar":"قسنطينة"}', 'wilaya'),
  ('US', 'NY', '{"fr":"État de New York","en":"New York","ar":"ولاية نيويورك"}', 'state'),
  ('US', 'FL', '{"fr":"Floride","en":"Florida","ar":"فلوريدا"}', 'state'),
  ('US', 'CA', '{"fr":"Californie","en":"California","ar":"كاليفورنيا"}', 'state'),
  ('CA', 'QC', '{"fr":"Québec","en":"Quebec","ar":"كيبك"}', 'province'),
  ('CA', 'ON', '{"fr":"Ontario","en":"Ontario","ar":"أونتاريو"}', 'province');

insert into public.regions (country_code, code, names, type, parent_id)
select 'FR', d.code, d.names::jsonb, 'department', (select id from public.regions where country_code = 'FR' and code = d.parent)
from (values
  ('75', '{"fr":"Paris","en":"Paris","ar":"باريس"}', 'IDF'),
  ('13', '{"fr":"Bouches-du-Rhône","en":"Bouches-du-Rhône","ar":"بوش دو رون"}', 'PAC'),
  ('06', '{"fr":"Alpes-Maritimes","en":"Alpes-Maritimes","ar":"ألب ماريتيم"}', 'PAC'),
  ('69', '{"fr":"Rhône","en":"Rhône","ar":"الرون"}', 'ARA')
) as d(code, names, parent);

insert into public.cities (country_code, region_id, slug, names, timezone, lat, lng, is_featured, sort_order)
select c.country_code, (select id from public.regions r where r.country_code = c.country_code and r.code = c.region_code),
       c.slug, c.names::jsonb, c.tz, c.lat, c.lng, true, c.sort_order
from (values
  ('FR', '75', 'paris', '{"fr":"Paris","en":"Paris","ar":"باريس"}', 'Europe/Paris', 48.8566, 2.3522, 1),
  ('FR', '13', 'marseille', '{"fr":"Marseille","en":"Marseille","ar":"مرسيليا"}', 'Europe/Paris', 43.2965, 5.3698, 2),
  ('FR', '69', 'lyon', '{"fr":"Lyon","en":"Lyon","ar":"ليون"}', 'Europe/Paris', 45.7640, 4.8357, 3),
  ('FR', '06', 'nice', '{"fr":"Nice","en":"Nice","ar":"نيس"}', 'Europe/Paris', 43.7102, 7.2620, 4),
  ('DZ', '16', 'alger', '{"fr":"Alger","en":"Algiers","ar":"الجزائر العاصمة"}', 'Africa/Algiers', 36.7538, 3.0588, 1),
  ('DZ', '15', 'tizi-ouzou', '{"fr":"Tizi Ouzou","en":"Tizi Ouzou","ar":"تيزي وزو"}', 'Africa/Algiers', 36.7169, 4.0497, 2),
  ('DZ', '06', 'bejaia', '{"fr":"Béjaïa","en":"Béjaïa","ar":"بجاية"}', 'Africa/Algiers', 36.7509, 5.0567, 3),
  ('DZ', '31', 'oran', '{"fr":"Oran","en":"Oran","ar":"وهران"}', 'Africa/Algiers', 35.6971, -0.6308, 4),
  ('DZ', '25', 'constantine', '{"fr":"Constantine","en":"Constantine","ar":"قسنطينة"}', 'Africa/Algiers', 36.3650, 6.6147, 5),
  ('US', 'NY', 'new-york', '{"fr":"New York","en":"New York","ar":"نيويورك"}', 'America/New_York', 40.7128, -74.0060, 1),
  ('US', 'FL', 'miami', '{"fr":"Miami","en":"Miami","ar":"ميامي"}', 'America/New_York', 25.7617, -80.1918, 2),
  ('US', 'CA', 'los-angeles', '{"fr":"Los Angeles","en":"Los Angeles","ar":"لوس أنجلوس"}', 'America/Los_Angeles', 34.0522, -118.2437, 3),
  ('CA', 'QC', 'montreal', '{"fr":"Montréal","en":"Montreal","ar":"مونتريال"}', 'America/Toronto', 45.5017, -73.5673, 1),
  ('CA', 'ON', 'toronto', '{"fr":"Toronto","en":"Toronto","ar":"تورونتو"}', 'America/Toronto', 43.6532, -79.3832, 2),
  ('CA', 'ON', 'ottawa', '{"fr":"Ottawa","en":"Ottawa","ar":"أوتاوا"}', 'America/Toronto', 45.4215, -75.6972, 3)
) as c(country_code, region_code, slug, names, tz, lat, lng, sort_order);

insert into public.event_categories (slug, names, icon, color, sort_order) values
  ('concerts',    '{"fr":"Concerts","en":"Concerts","ar":"حفلات موسيقية"}', 'music', '#FF5B2E', 1),
  ('festivals',   '{"fr":"Festivals","en":"Festivals","ar":"مهرجانات"}', 'festival', '#F59E0B', 2),
  ('shows',       '{"fr":"Spectacles","en":"Shows","ar":"عروض"}', 'sparkles', '#E11D74', 3),
  ('theatre',     '{"fr":"Théâtre","en":"Theatre","ar":"مسرح"}', 'theater', '#7C3AED', 4),
  ('comedy',      '{"fr":"Humour","en":"Comedy","ar":"كوميديا"}', 'laugh', '#EAB308', 5),
  ('conferences', '{"fr":"Conférences","en":"Conferences","ar":"مؤتمرات"}', 'mic', '#2563EB', 6),
  ('fairs',       '{"fr":"Salons","en":"Fairs & trade shows","ar":"صالونات ومعارض تجارية"}', 'store', '#0891B2', 7),
  ('exhibitions', '{"fr":"Expositions","en":"Exhibitions","ar":"معارض فنية"}', 'frame', '#0D9488', 8),
  ('sports',      '{"fr":"Sport","en":"Sports","ar":"رياضة"}', 'trophy', '#16A34A', 9),
  ('community',   '{"fr":"Associatif","en":"Community","ar":"جمعيات"}', 'hands', '#65A30D', 10),
  ('culture',     '{"fr":"Culture","en":"Culture","ar":"ثقافة"}', 'landmark', '#C2410C', 11),
  ('family',      '{"fr":"Famille","en":"Family","ar":"عائلة"}', 'family', '#DB2777', 12),
  ('other',       '{"fr":"Autres événements","en":"Other events","ar":"فعاليات أخرى"}', 'calendar', '#64748B', 13);

insert into public.app_settings (key, value, is_public, description) values
  ('beta', '{"mode":"closed","max_testers":200,"testflight_url":null,"play_testing_url":null}', true,
   'Programme Tamurt Beta : mode (open|closed), nombre de places, liens de distribution.'),
  ('commerce', '{"demo_enabled":true,"live_enabled":false,"reservation_ttl_seconds":600,"max_tickets_per_order":10,"max_active_reservations_per_user":3}', true,
   'Billetterie intégrée. live_enabled reste FALSE tant qu''aucun accord fournisseur et validation juridique n''existent.'),
  ('resale', '{"demo_enabled":true,"live_enabled":false,"listing_reservation_ttl_seconds":600,"max_active_listings_per_user":20,"max_active_listings_per_event":8}', true,
   'Revente entre particuliers. Mode démonstration uniquement tant que le transfert sécurisé n''est pas garanti.');
