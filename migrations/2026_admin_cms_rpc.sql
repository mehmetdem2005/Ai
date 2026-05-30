-- site_strings için dedikli SECURITY DEFINER upsert/delete.
-- admin_upsert (page_slug,key,lang) composite unique'i otomatik handle etmediği için
-- bu RPC açıkça onu yönetir.

create or replace function public.cms_set_string(
  p_page_slug text,
  p_key       text,
  p_lang      text,
  p_value     text,
  p_value_md  text default null
) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_before  jsonb;
  v_after   jsonb;
  v_actor   uuid := auth.uid();
  v_email   text;
begin
  if not public.has_capability('cms.write') then
    raise exception 'forbidden: cms.write yetkisi gerekli';
  end if;
  if not exists (select 1 from public.site_pages where slug = p_page_slug) then
    raise exception 'unknown page_slug: %', p_page_slug;
  end if;

  select to_jsonb(s.*) into v_before from public.site_strings s
   where page_slug = p_page_slug and key = p_key and lang = p_lang;

  insert into public.site_strings(page_slug, key, lang, value, value_md, updated_by, updated_at)
  values (p_page_slug, p_key, p_lang, p_value, p_value_md, v_actor, now())
  on conflict (page_slug, key, lang) do update
    set value      = excluded.value,
        value_md   = excluded.value_md,
        updated_by = v_actor,
        updated_at = now()
  returning to_jsonb(public.site_strings.*) into v_after;

  select email into v_email from auth.users where id = v_actor;
  insert into public.admin_audit(actor_id, actor_email, op, entity_table, entity_id, before, after)
  values (v_actor, v_email,
          case when v_before is null then 'insert' else 'update' end,
          'site_strings',
          p_page_slug || ':' || p_key || ':' || p_lang,
          v_before, v_after);

  return v_after;
end$$;

create or replace function public.cms_delete_string(
  p_page_slug text,
  p_key       text,
  p_lang      text
) returns boolean
  language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb;
  v_actor  uuid := auth.uid();
  v_email  text;
begin
  if not public.has_capability('cms.write') then
    raise exception 'forbidden';
  end if;

  select to_jsonb(s.*) into v_before from public.site_strings s
   where page_slug = p_page_slug and key = p_key and lang = p_lang;
  if v_before is null then return false; end if;

  delete from public.site_strings
   where page_slug = p_page_slug and key = p_key and lang = p_lang;

  select email into v_email from auth.users where id = v_actor;
  insert into public.admin_audit(actor_id, actor_email, op, entity_table, entity_id, before)
  values (v_actor, v_email, 'delete', 'site_strings',
          p_page_slug || ':' || p_key || ':' || p_lang, v_before);

  return true;
end$$;
