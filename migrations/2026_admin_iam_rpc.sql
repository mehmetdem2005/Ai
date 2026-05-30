-- IAM modülü için ek RPC: e-posta arama ve admin_users join'li liste.

create or replace function public.admin_lookup_user(p_email text)
returns table(user_id uuid, email text)
language sql security definer set search_path = public as $$
  select id, email
  from auth.users
  where lower(email) = lower(coalesce(p_email, ''))
  limit 1;
$$;

create or replace function public.admin_list_users()
returns table(
  user_id uuid, email text, role text, active boolean,
  granted_at timestamptz, granted_by_email text
)
language sql security definer set search_path = public as $$
  select au.user_id, u.email, au.role, au.active, au.granted_at,
         (select email from auth.users where id = au.granted_by) as granted_by_email
  from public.admin_users au
  join auth.users u on u.id = au.user_id
  order by au.granted_at desc;
$$;

-- Yalnızca admin'ler bu RPC'leri çağırabilir
revoke all on function public.admin_lookup_user(text) from public;
revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_lookup_user(text) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
