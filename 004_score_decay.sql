-- 004_score_decay.sql
-- Function to decay scores over time for stale recommendations

create or replace function decay_recommendation_scores()
returns void
language sql
security definer
as $$
  -- Decay freshness by 0.05 per day since generated_at, minimum 0.1
  update recommendations
  set 
    freshness_score = greatest(0.1, 1.0 - (extract(epoch from (now() - generated_at)) / 86400) * 0.05),
    -- Re-calculate overall score (e.g. 80% original score, 20% freshness)
    score = (
      (score_factors->>'skills_overlap')::float * 0.4 +
      (score_factors->>'experience_fit')::float * 0.4 +
      (score_factors->>'domain_match')::float * 0.2
    ) * 0.8 + greatest(0.1, 1.0 - (extract(epoch from (now() - generated_at)) / 86400) * 0.05) * 0.2,
    updated_at = now()
  where 
    status = 'active'
    and swiped = false;
$$;
