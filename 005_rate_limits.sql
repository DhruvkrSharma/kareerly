-- 005_rate_limits.sql

create table if not exists rate_limits (
  id text primary key,
  hits int not null default 1,
  reset_at timestamptz not null
);

-- Enable RLS (though accessed by service role only, good practice)
alter table rate_limits enable row level security;

create or replace function check_rate_limit(
  p_id text,
  p_window_ms int,
  p_max_requests int
)
returns json
language plpgsql
security definer
as $$
declare
  v_hits int;
  v_reset_at timestamptz;
  v_now timestamptz = now();
  v_reset_interval interval;
  v_success boolean;
  v_remaining int;
  v_reset_ms bigint;
begin
  v_reset_interval = (p_window_ms || ' milliseconds')::interval;

  -- Upsert logic
  insert into rate_limits (id, hits, reset_at)
  values (p_id, 1, v_now + v_reset_interval)
  on conflict (id) do update
  set
    hits = case
      when rate_limits.reset_at < v_now then 1
      else rate_limits.hits + 1
    end,
    reset_at = case
      when rate_limits.reset_at < v_now then v_now + v_reset_interval
      else rate_limits.reset_at
    end
  returning hits, reset_at into v_hits, v_reset_at;

  v_success = v_hits <= p_max_requests;
  v_remaining = greatest(0, p_max_requests - v_hits);
  v_reset_ms = extract(epoch from v_reset_at) * 1000;

  return json_build_object(
    'success', v_success,
    'remaining', v_remaining,
    'reset', v_reset_ms
  );
end;
$$;
