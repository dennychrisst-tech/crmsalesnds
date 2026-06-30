-- Convert pic from text[] to jsonb array of {name, phone} objects
alter table clients alter column pic drop default;
alter table clients
  alter column pic type jsonb
  using coalesce(
    (select jsonb_agg(jsonb_build_object('name', p, 'phone', ''))
     from unnest(pic) as p
     where p != ''),
    '[]'::jsonb
  );
alter table clients alter column pic set default '[]'::jsonb;
