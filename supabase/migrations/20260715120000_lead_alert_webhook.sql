-- Lead alert webhook: on every studio_leads INSERT, POST the standard
-- Supabase webhook payload to the lead-alert edge function via pg_net.
-- pg_net is async (queued, sent after commit), so the HTTP call can never
-- block or fail the insert; the exception guard covers everything else.
--
-- The shared secret is NOT stored here — it lives in Vault under
-- 'lead_alert_secret' (created out-of-band) and must match the function's
-- LEAD_ALERT_SECRET secret. Missing secret => alert skipped, insert unharmed.

create extension if not exists pg_net;

create or replace function public.notify_lead_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  alert_secret text;
begin
  begin
    select decrypted_secret into alert_secret
      from vault.decrypted_secrets
     where name = 'lead_alert_secret'
     limit 1;

    if alert_secret is null then
      raise warning 'lead-alert: vault secret lead_alert_secret missing — alert skipped';
      return new;
    end if;

    perform net.http_post(
      url := 'https://sypqfpfkymproolyebon.supabase.co/functions/v1/lead-alert',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-lead-alert-secret', alert_secret
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'schema', tg_table_schema,
        'table', tg_table_name,
        'record', to_jsonb(new)
      ),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'lead-alert webhook failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists studio_leads_lead_alert on public.studio_leads;
create trigger studio_leads_lead_alert
  after insert on public.studio_leads
  for each row execute function public.notify_lead_alert();
