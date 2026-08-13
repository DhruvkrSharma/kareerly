'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UploadCloud, FileText, Check, Loader2, Plus, X, 
  User, Briefcase, GraduationCap, MapPin, Sliders, 
  DollarSign, AlertCircle
} from 'lucide-react'

interface ParsedProfile {
  full_name: string
  email: string
  location: string
  education: {
    degree: string
    university: string
    graduation_year: number
  }
  experience_years: number
  preferred_roles: string[]
  skills: string[]
  preferences: {
    remote_preference: string
    preferred_cities: string[]
    salary_expectations: string
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState<'upload' | 'parsing' | 'review'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState<ParsedProfile>({
    full_name: '',
    email: '',
    location: '',
    education: {
      degree: '',
      university: '',
      graduation_year: new Date().getFullYear()
    },
    experience_years: 0,
    preferred_roles: [],
    skills: [],
    preferences: {
      remote_preference: 'Any',
      preferred_cities: [],
      salary_expectations: ''
    }
  })

  // Inputs for adding skills & roles & cities
  const [newSkill, setNewSkill] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newCity, setNewCity] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    document.documentElement.classList.add('dark')
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email ?? null)
        setFormData(prev => ({
          ...prev,
          email: user.email ?? '',
          full_name: user.user_metadata?.full_name ?? ''
        }))
      } else {
        router.push('/auth/login')
      }
    }
    getUser()
  }, [supabase, router])

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      const ext = droppedFile.name.split('.').pop()?.toLowerCase()
      if (ext === 'pdf' || ext === 'txt') {
        setFile(droppedFile)
      } else {
        setError('Only PDF and TXT files are supported.')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  // Parse Resume via Backend
  const handleParse = async () => {
    if (!file) return
    setStep('parsing')
    setLoading(true)
    setError(null)

    const uploadData = new FormData()
    uploadData.append('file', file)

    try {
      const response = await authFetch('/api/resume/parse', {
        method: 'POST',
        body: uploadData
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.detail || 'Failed to parse resume. Try manually filling the form.')
      }

      const data = await response.json()
      setFormData({
        full_name: data.full_name || formData.full_name || '',
        email: data.email || formData.email || userEmail || '',
        location: data.location || '',
        education: {
          degree: data.education?.degree || '',
          university: data.education?.university || '',
          graduation_year: data.education?.graduation_year || new Date().getFullYear()
        },
        experience_years: data.experience_years || 0,
        preferred_roles: data.preferred_roles || [],
        skills: data.skills || [],
        preferences: {
          remote_preference: data.preferences?.remote_preference || 'Any',
          preferred_cities: data.preferences?.preferred_cities || [],
          salary_expectations: data.preferences?.salary_expectations || ''
        }
      })
      setStep('review')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred during parsing.')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  // Handle manual skip
  const handleSkip = () => {
    setStep('review')
  }

  // Save profile to backend
  const handleSaveProfile = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await authFetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          skills: formData.skills,
          preferred_roles: formData.preferred_roles,
          experience_years: formData.experience_years,
          preferred_locations: formData.preferences.preferred_cities,
          resume_url: null // We will add supabase storage integration later if needed
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile.')
      }

      // Success - Redirect to dashboard
      router.push('/feed')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Helper arrays update
  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }))
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))
  }

  const addRole = () => {
    if (newRole.trim() && !formData.preferred_roles.includes(newRole.trim())) {
      setFormData(prev => ({ ...prev, preferred_roles: [...prev.preferred_roles, newRole.trim()] }))
      setNewRole('')
    }
  }

  const removeRole = (role: string) => {
    setFormData(prev => ({ ...prev, preferred_roles: prev.preferred_roles.filter(r => r !== role) }))
  }

  const addCity = () => {
    if (newCity.trim() && !formData.preferences.preferred_cities.includes(newCity.trim())) {
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          preferred_cities: [...prev.preferences.preferred_cities, newCity.trim()]
        }
      }))
      setNewCity('')
    }
  }

  const removeCity = (city: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        preferred_cities: prev.preferences.preferred_cities.filter(c => c !== city)
      }
    }))
  }

  // Calculate profile strength
  const getProfileStrength = () => {
    let score = 0
    if (formData.full_name.trim()) score += 20
    if (formData.skills.length > 0) score += 30
    if (formData.preferred_roles.length > 0) score += 25
    if (formData.experience_years > 0) score += 15
    if (formData.preferences.preferred_cities.length > 0) score += 10
    return score
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center" style={{ background: 'var(--surface)' }}>
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px] pointer-events-none" style={{ background: 'var(--primary-container)' }} />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full opacity-5 blur-[80px] pointer-events-none" style={{ background: 'var(--secondary)' }} />

      <div className="w-full max-w-2xl relative z-10">
        <AnimatePresence mode="wait">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-3xl p-8 border"
              style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            >
              <div className="text-center mb-8">
                <h1 className="text-headline-lg font-bold mb-2" style={{ color: 'var(--on-surface)' }}>
                  Let&apos;s Set Up Your Profile
                </h1>
                <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  Upload your resume to pre-fill your career interests, skills, and preferences using AI.
                </p>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors relative cursor-pointer ${
                  dragActive ? 'border-primary' : 'border-outline-variant'
                }`}
                style={{
                  background: dragActive ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'var(--surface-container)'
                }}
              >
                <input
                  type="file"
                  id="resume-upload"
                  className="hidden"
                  accept=".pdf,.txt"
                  onChange={handleFileChange}
                />
                <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center">
                  <UploadCloud className="w-12 h-12 mb-4" style={{ color: 'var(--primary)' }} />
                  <span className="text-base font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
                    {file ? file.name : 'Drag and drop your resume here'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                    Supports PDF and TXT formats
                  </span>
                </label>
              </div>

              {/* Error display */}
              {error && (
                <div className="mt-4 p-4 rounded-xl border flex items-center gap-3 text-sm" style={{ background: 'color-mix(in srgb, var(--error) 10%, transparent)', borderColor: 'var(--error-container)', color: 'var(--error)' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleSkip}
                  className="btn-secondary flex-1 py-3 text-center rounded-xl font-semibold border transition-all"
                  style={{ color: 'var(--on-surface-variant)', borderColor: 'var(--outline)' }}
                >
                  Fill Manually
                </button>
                <button
                  onClick={handleParse}
                  disabled={!file}
                  className="btn-primary flex-1 py-3 rounded-xl font-semibold justify-center flex items-center gap-2"
                  style={{
                    opacity: file ? 1 : 0.5,
                    cursor: file ? 'pointer' : 'not-allowed'
                  }}
                >
                  Continue with AI
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: PARSING LOADING */}
          {step === 'parsing' && (
            <motion.div
              key="parsing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-3xl p-12 border text-center"
              style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            >
              <Loader2 className="w-16 h-16 animate-spin mx-auto mb-6" style={{ color: 'var(--primary)' }} />
              <h2 className="text-headline-md font-bold mb-2" style={{ color: 'var(--on-surface)' }}>
                Analyzing Your Resume
              </h2>
              <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--on-surface-variant)' }}>
                Our AI-native engine is extracting your career accomplishments, skills, and preferences...
              </p>
            </motion.div>
          )}

          {/* STEP 3: REVIEW PROFILE */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-3xl p-8 border max-h-[85vh] overflow-y-auto"
              style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-headline-md font-bold" style={{ color: 'var(--on-surface)' }}>
                    Review Your Profile
                  </h1>
                  <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                    Confirm these details are accurate to build your personalization engine.
                  </p>
                </div>
                {/* Profile Strength */}
                <div className="text-right">
                  <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Profile Strength</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-container)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${getProfileStrength()}%`, background: 'var(--primary)' }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>{getProfileStrength()}%</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm" style={{ background: 'color-mix(in srgb, var(--error) 10%, transparent)', borderColor: 'var(--error-container)', color: 'var(--error)' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-6">
                {/* Personal Information */}
                <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}>
                  <h3 className="text-title-sm font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                    <User className="w-4 h-4" /> Personal Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>Full Name</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-colors"
                        style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-colors"
                        style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Education */}
                <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}>
                  <h3 className="text-title-sm font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                    <GraduationCap className="w-4 h-4" /> Education
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>University</label>
                      <input
                        type="text"
                        value={formData.education.university}
                        onChange={e => setFormData({
                          ...formData,
                          education: { ...formData.education, university: e.target.value }
                        })}
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-colors"
                        style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>Degree</label>
                      <input
                        type="text"
                        value={formData.education.degree}
                        onChange={e => setFormData({
                          ...formData,
                          education: { ...formData.education, degree: e.target.value }
                        })}
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-colors"
                        style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Experience & Roles */}
                <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}>
                  <h3 className="text-title-sm font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                    <Briefcase className="w-4 h-4" /> Career details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>Years of Experience</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.experience_years}
                        onChange={e => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                        className="w-full max-w-[150px] rounded-xl px-4 py-2.5 text-sm outline-none border transition-colors"
                        style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                      />
                    </div>

                    {/* Preferred Roles Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>Preferred Roles</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newRole}
                          onChange={e => setNewRole(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addRole()}
                          placeholder="e.g. ML Engineer"
                          className="flex-1 rounded-xl px-4 py-2 text-sm outline-none border"
                          style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                        />
                        <button onClick={addRole} className="px-4 py-2 rounded-xl btn-primary text-sm font-semibold flex items-center gap-1">
                          <Plus className="w-4 h-4" /> Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.preferred_roles.map(role => (
                          <span key={role} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}>
                            {role}
                            <button onClick={() => removeRole(role)} className="hover:text-error transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Core Skills */}
                <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}>
                  <h3 className="text-title-sm font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                    <Sliders className="w-4 h-4" /> Core Skills
                  </h3>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addSkill()}
                        placeholder="Add a skill..."
                        className="flex-1 rounded-xl px-4 py-2 text-sm outline-none border"
                        style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                      />
                      <button onClick={addSkill} className="px-4 py-2 rounded-xl btn-primary text-sm font-semibold flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.skills.map(skill => (
                        <span key={skill} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}>
                          {skill}
                          <button onClick={() => removeSkill(skill)} className="hover:text-error transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}>
                  <h3 className="text-title-sm font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                    <DollarSign className="w-4 h-4" /> Preferences
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>Remote Policy</label>
                        <select
                          value={formData.preferences.remote_preference}
                          onChange={e => setFormData({
                            ...formData,
                            preferences: { ...formData.preferences, remote_preference: e.target.value }
                          })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
                          style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                        >
                          <option value="Any">Any Policy</option>
                          <option value="Remote">Remote Only</option>
                          <option value="Hybrid">Hybrid</option>
                          <option value="Onsite">Onsite</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>Salary Expectations</label>
                        <input
                          type="text"
                          placeholder="e.g. 15-25 LPA"
                          value={formData.preferences.salary_expectations}
                          onChange={e => setFormData({
                            ...formData,
                            preferences: { ...formData.preferences, salary_expectations: e.target.value }
                          })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
                          style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                        />
                      </div>
                    </div>

                    {/* Preferred Cities */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>Preferred Cities</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCity}
                          onChange={e => setNewCity(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCity()}
                          placeholder="e.g. Bangalore"
                          className="flex-1 rounded-xl px-4 py-2 text-sm outline-none border"
                          style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                        />
                        <button onClick={addCity} className="px-4 py-2 rounded-xl btn-primary text-sm font-semibold flex items-center gap-1">
                          <Plus className="w-4 h-4" /> Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.preferences.preferred_cities.map(city => (
                          <span key={city} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}>
                            {city}
                            <button onClick={() => removeCity(city)} className="hover:text-error transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setStep('upload')}
                  className="btn-secondary py-3 px-6 rounded-xl font-semibold border"
                  style={{ color: 'var(--on-surface-variant)', borderColor: 'var(--outline)' }}
                >
                  Back
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="btn-primary flex-1 py-3 rounded-xl font-semibold justify-center flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Save & Complete Onboarding
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
