import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ExternalLink, MapPin, Users, Calendar, Briefcase, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default async function CompanyProfilePage({ params }: { params: { slug: string } }) {
  const supabase = await createServerSupabaseClient()

  // 1. Fetch Company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!company) {
    notFound()
  }

  // 2. Fetch Open Jobs for this company
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, location, remote_ok, salary_min, salary_max, job_type')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" />
        <Link href="/feed" className="text-sm font-bold font-mono uppercase tracking-wider">Back to Feed</Link>
      </div>

      <div className="glass-card overflow-hidden rounded-3xl border border-outline-variant/30">
        <div className="h-32 md:h-48 bg-gradient-to-br from-primary-container/40 via-surface to-tertiary-container/40 relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,var(--primary)_0,transparent_100%)] blur-2xl mix-blend-screen" />
        </div>
        
        <div className="px-6 md:px-10 pb-10 relative">
          <div className="flex flex-col md:flex-row gap-6 md:items-end -mt-12 md:-mt-16 mb-8">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-surface-container-highest border-4 border-surface shadow-xl flex items-center justify-center text-4xl font-black text-on-surface overflow-hidden shrink-0">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                company.name.charAt(0)
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-5xl font-display font-black text-on-surface">{company.name}</h1>
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" className="p-2 bg-surface-container hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-on-surface-variant">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {company.location}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {company.employee_count || '50-200'}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Est. {company.founded_year || '2010'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-bold font-display text-on-surface mb-3">About the Company</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  {company.description || `${company.name} is a leading technology company focused on delivering innovative solutions. With a strong engineering culture, they are building the future of their industry.`}
                </p>
                {company.culture_summary && (
                  <div className="mt-4 p-4 rounded-xl bg-primary-container/20 border border-primary-container/30">
                    <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                      ✨ AI Culture Summary
                    </h4>
                    <p className="text-sm text-on-surface-variant">{company.culture_summary}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold font-display text-on-surface mb-3">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {company.tech_stack?.length > 0 ? company.tech_stack.map((tech: string) => (
                    <span key={tech} className="px-3 py-1 rounded-full bg-surface-container text-on-surface text-sm font-medium border border-outline-variant/50">
                      {tech}
                    </span>
                  )) : (
                    <span className="text-on-surface-variant text-sm italic">Not specified</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold font-display text-on-surface">Open Roles ({jobs?.length || 0})</h3>
              <div className="space-y-3">
                {jobs?.map((job) => (
                  <div key={job.id} className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/40 transition-colors group cursor-pointer">
                    <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{job.title}</h4>
                    <div className="flex items-center gap-3 mt-2 text-xs text-on-surface-variant font-mono">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.remote_ok ? 'Remote' : 'Onsite'}</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.job_type}</span>
                    </div>
                  </div>
                ))}
                {(!jobs || jobs.length === 0) && (
                  <p className="text-sm text-on-surface-variant">No open roles currently listed.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
