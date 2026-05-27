-- 003_tailored_resumes.sql

create table if not exists tailored_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  job_id bigint references jobs(id) not null,
  content text not null,
  created_at timestamptz default now(),
  unique(user_id, job_id)
);

-- Enable RLS
alter table tailored_resumes enable row level security;

create policy "Users can view their own tailored resumes"
  on tailored_resumes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tailored resumes"
  on tailored_resumes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tailored resumes"
  on tailored_resumes for update
  using (auth.uid() = user_id);
