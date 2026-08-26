-- Aviso por email de mensaje nuevo en el chat de la propuesta (chef <-> cliente).
--
-- Estrategia anti-spam: "un aviso por conversación hasta que se lea", vía
-- claim atómico (mismo patrón que bookings.chef_notified_at en
-- notifyChefOfBookingConfirmed / notify-chefs.ts):
--   1. Al insertar un mensaje, el caller reclama la columna de alerta del
--      DESTINATARIO con UPDATE ... WHERE alert_sent_at IS NULL. Si gana el
--      claim, manda el email; si ya había una alerta pendiente sin leer, no
--      reenvía (evita el spam de 5 mensajes seguidos = 5 emails).
--   2. Al abrir la conversación, mark_conversation_read() resetea a NULL la
--      columna del que la abre, para que el próximo mensaje sin leer pueda
--      volver a disparar un aviso.

alter table public.proposals
  add column if not exists chef_msg_alert_sent_at   timestamptz,
  add column if not exists client_msg_alert_sent_at timestamptz;

-- Resetea la alerta de mensajes del lado que abre la conversación. Detecta el
-- rol del caller (chef dueño de la propuesta vs. cliente dueño de la
-- solicitud ligada) igual que las validaciones de ownership en
-- sendMessage()/sendClientMessage() (actions.ts) -- no hay un "role" explícito
-- que pasar, se resuelve contra auth.uid().
create or replace function public.mark_conversation_read(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_chef boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select exists (
    select 1
    from proposals p
    join chef_profiles cp on cp.id = p.chef_id
    where p.id = p_proposal_id and cp.user_id = v_uid
  ) into v_is_chef;

  if v_is_chef then
    update proposals set chef_msg_alert_sent_at = null where id = p_proposal_id;
    return;
  end if;

  if exists (
    select 1
    from proposals p
    join service_requests sr on sr.id = p.request_id
    where p.id = p_proposal_id and sr.user_id = v_uid
  ) then
    update proposals set client_msg_alert_sent_at = null where id = p_proposal_id;
    return;
  end if;

  raise exception 'not_authorized';
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;
