-- Journal : distinguer l'invité qui accepte son invitation (« a rejoint l'espace »)
-- d'un accès ouvert par un membre.

create or replace function public.log_access_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.workspace_access;
  v_who text;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  v_row := coalesce(new, old);
  if tg_op <> 'INSERT'
     and not exists (select 1 from public.workspaces where id = v_row.workspace_id) then
    return old;
  end if;

  if v_row.user_id is not null then
    select coalesce(p.full_name, p.email) into v_who from public.profiles p where p.id = v_row.user_id;
  else
    select g.name into v_who from public.organization_groups g where g.id = v_row.group_id;
  end if;

  insert into public.activity_events (
    organization_id, workspace_id, actor_id, event_type, metadata
  ) values (
    v_row.organization_id,
    v_row.workspace_id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'access_granted' else 'access_revoked' end,
    jsonb_build_object('title', v_who, 'access_level', v_row.access_level,
                       'guest', v_row.user_id is not null
                                and public.is_org_guest(v_row.organization_id, v_row.user_id),
                       'self', coalesce(v_row.user_id = auth.uid(), false))
  );
  return coalesce(new, old);
end;
$$;
