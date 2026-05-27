'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, MapPin, Briefcase, Calendar, Edit2, Share2, 
  Bolt, CheckCircle, Plus, Trash2, Download, UploadCloud, X, FileText, Check 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Toast } from '@/components/ui/Navigation'

interface ProfileData {
  name: string
  title: string
  location: string
  experience: string
  avatarUrl: string
  skills: string[]
  softSkills: string[]
  preferredRoles: Array<{
    title: string
    skills: string
    type: string
    workplace: string
  }>
  documents: Array<{
    name: string
    size: string
    date: string
  }>
}

const DEFAULT_PROFILE: ProfileData = {
  name: 'Alex Chen',
  title: 'Senior Frontend Engineer',
  location: 'San Francisco, CA',
  experience: '6 Years Exp.',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256',
  skills: ['React.js', 'TypeScript', 'Tailwind CSS', 'Next.js', 'Node.js'],
  softSkills: ['Agile/Scrum', 'Team Leadership', 'UI/UX Design', 'Technical Writing'],
  preferredRoles: [
    { title: 'Lead Frontend Engineer', skills: 'React, Vue, Architecture', type: 'Full-Time', workplace: 'Remote' },
    { title: 'UI/UX Developer', skills: 'Design Systems, Tailwind CSS', type: 'Contract', workplace: 'Hybrid' }
  ],
  documents: [
    { name: 'Alex_Chen_Resume_2024.pdf', size: '2.4 MB', date: '2 days ago' }
  ]
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null)
  
  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false)
  
  // Form states
  const [editName, setEditName] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editExperience, setEditExperience] = useState('')
  
  const [newRoleTitle, setNewRoleTitle] = useState('')
  const [newRoleSkills, setNewRoleSkills] = useState('')
  const [newRoleType, setNewRoleType] = useState('Full-Time')
  const [newRoleWorkplace, setNewRoleWorkplace] = useState('Remote')

  const [newSkill, setNewSkill] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  function showToast(message: string, type: 'success' | 'info' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load profile from localStorage or fallback
  useEffect(() => {
    async function loadProfile() {
      try {
        const stored = localStorage.getItem('kareerly_profile')
        if (stored) {
          setProfile(JSON.parse(stored))
        } else {
          // Attempt to check if logged in and fetch email at least
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setProfile(prev => ({
              ...prev,
              name: user.user_metadata?.full_name || prev.name,
              avatarUrl: user.user_metadata?.avatar_url || prev.avatarUrl
            }))
          }
        }
      } catch (err) {
        console.error('Failed to load profile details', err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  // Save profile helper
  const saveProfileData = (updated: ProfileData) => {
    setProfile(updated)
    localStorage.setItem('kareerly_profile', JSON.stringify(updated))
  }

  // Edit Profile Form Submit
  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updated = {
      ...profile,
      name: editName,
      title: editTitle,
      location: editLocation,
      experience: editExperience
    }
    saveProfileData(updated)
    setIsEditProfileOpen(false)
    showToast('Profile updated successfully!')
  }

  // Open Edit Profile Form
  const openEditProfile = () => {
    setEditName(profile.name)
    setEditTitle(profile.title)
    setEditLocation(profile.location)
    setEditExperience(profile.experience)
    setIsEditProfileOpen(true)
  }

  // Add Preferred Role
  const handleAddRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleTitle.trim()) return
    
    const updatedRoles = [
      ...profile.preferredRoles,
      {
        title: newRoleTitle,
        skills: newRoleSkills,
        type: newRoleType,
        workplace: newRoleWorkplace
      }
    ]
    saveProfileData({
      ...profile,
      preferredRoles: updatedRoles
    })
    
    // reset form
    setNewRoleTitle('')
    setNewRoleSkills('')
    setIsAddRoleOpen(false)
    showToast('Preferred role added!')
  }

  // Delete Preferred Role
  const handleDeleteRole = (index: number) => {
    const updatedRoles = profile.preferredRoles.filter((_, i) => i !== index)
    saveProfileData({
      ...profile,
      preferredRoles: updatedRoles
    })
    showToast('Role removed')
  }

  // Add Tech Skill
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSkill.trim()) return
    if (profile.skills.includes(newSkill.trim())) {
      showToast('Skill already exists', 'info')
      return
    }
    const updatedSkills = [...profile.skills, newSkill.trim()]
    saveProfileData({
      ...profile,
      skills: updatedSkills
    })
    setNewSkill('')
    showToast('Skill added!')
  }

  // Delete Tech Skill
  const handleDeleteSkill = (skillToDelete: string) => {
    const updatedSkills = profile.skills.filter(s => s !== skillToDelete)
    saveProfileData({
      ...profile,
      skills: updatedSkills
    })
  }

  // File Upload simulation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be under 10MB', 'info')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
            const updatedDocs = [
              ...profile.documents,
              {
                name: file.name,
                size: `${sizeMB} MB`,
                date: 'Just now'
              }
            ]
            saveProfileData({
              ...profile,
              documents: updatedDocs
            })
            setIsUploading(false)
            showToast('Document uploaded successfully!')
          }, 300)
          return 100
        }
        return prev + 25
      })
    }, 200)
  }

  const handleDeleteDocument = (index: number) => {
    const updatedDocs = profile.documents.filter((_, i) => i !== index)
    saveProfileData({
      ...profile,
      documents: updatedDocs
    })
    showToast('Document deleted')
  }

  // Copy Profile Link to Clipboard
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    showToast('Profile link copied to clipboard!')
  }

  // Calculate profile strength
  const getProfileStrength = () => {
    let score = 30 // Base score for having an account
    if (profile.name !== 'Alex Chen' || profile.title !== 'Senior Frontend Engineer') score += 15
    if (profile.skills.length >= 5) score += 15
    if (profile.preferredRoles.length > 0) score += 20
    if (profile.documents.length > 0) score += 20
    return Math.min(score, 100)
  }

  const strengthScore = getProfileStrength()
  const strengthLevel = strengthScore >= 90 ? 'Expert' : strengthScore >= 70 ? 'Intermediate' : 'Beginner'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-4 border-primary-container border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Page Title */}
      <section className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-on-surface tracking-tight">
            My Profile
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Manage your personal identity, skill sets, and active resumes
          </p>
        </div>
      </section>

      {/* Profile Header & Progress Bento */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar & Identity Card */}
        <div className="lg:col-span-2 glass-card p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
          {/* Background Glow */}
          <div 
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 blur-2xl pointer-events-none"
            style={{ background: 'var(--primary-container)' }}
          />

          <div className="relative w-32 h-32 shrink-0 rounded-full border-2 border-primary-container overflow-hidden bg-surface-container-low flex items-center justify-center group">
            <img 
              alt="User Profile Avatar" 
              className="w-full h-full object-cover" 
              src={profile.avatarUrl}
            />
            <button 
              onClick={openEditProfile}
              className="absolute bottom-0 w-full bg-surface-container/80 py-1.5 text-center hover:bg-primary-container hover:text-on-primary-container transition-colors backdrop-blur-sm flex justify-center items-center"
            >
              <Edit2 className="w-4 h-4 text-on-surface" />
            </button>
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
            <h2 className="text-headline-lg text-on-surface mb-1 font-display font-black">
              {profile.name}
            </h2>
            <p className="text-body-lg text-on-surface-variant mb-4 font-semibold">
              {profile.title}
            </p>
            
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 bg-surface-container-highest px-3 py-1 rounded-full text-xs font-semibold border border-outline-variant text-on-surface-variant">
                <MapPin className="w-3.5 h-3.5" />
                {profile.location}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-surface-container-highest px-3 py-1 rounded-full text-xs font-semibold border border-outline-variant text-on-surface-variant">
                <Briefcase className="w-3.5 h-3.5" />
                {profile.experience}
              </span>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={openEditProfile}
                className="flex-1 sm:flex-initial btn-primary"
              >
                Edit Profile
              </button>
              <button 
                onClick={handleShare}
                className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface px-6 py-2.5 rounded-full font-display font-bold text-sm hover:bg-surface-container transition-all"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>
        </div>

        {/* Completion Progress Card */}
        <div className="glass-card p-8 flex flex-col justify-center">
          <h3 className="font-display font-bold text-lg text-on-surface mb-2 flex items-center gap-2">
            Profile Strength
            <Bolt className="w-5 h-5 text-primary-container fill-primary-container" />
          </h3>
          <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
            Complete your profile to stand out to top tech recruiters in India.
          </p>

          <div className="relative w-full h-3 bg-surface-container-lowest rounded-full overflow-hidden mb-2 border border-outline-variant/30">
            <motion.div 
              className="absolute top-0 left-0 h-full rounded-full" 
              style={{ background: 'var(--primary-container)' }}
              initial={{ width: 0 }}
              animate={{ width: `${strengthScore}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>

          <div className="flex justify-between text-xs font-bold mb-6">
            <span className="text-on-surface">{strengthLevel}</span>
            <span className="text-primary-container font-mono">{strengthScore}%</span>
          </div>

          <ul className="space-y-3">
            {[
              { text: 'Add Work Experience', done: profile.title !== 'Senior Frontend Engineer' || profile.name !== 'Alex Chen' },
              { text: 'Upload Resume', done: profile.documents.length > 0 },
              { text: 'Add Preferred Roles', done: profile.preferredRoles.length > 0 },
            ].map((item, i) => (
              <li 
                key={i} 
                className={`flex items-center gap-3 text-sm ${item.done ? 'text-on-surface' : 'text-on-surface-variant opacity-60'}`}
              >
                <div 
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.done ? 'bg-tertiary text-on-tertiary' : 'border-2 border-outline-variant'
                  }`}
                >
                  {item.done && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                </div>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Grid Layout for Roles & Skills */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preferred Roles Bento */}
        <div className="glass-card p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-lg text-on-surface">Preferred Roles</h3>
            <button 
              onClick={() => setIsAddRoleOpen(true)}
              className="text-primary-container hover:bg-surface-container rounded-full p-2 flex items-center justify-center transition-colors border border-outline-variant"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {profile.preferredRoles.map((role, i) => (
              <div 
                key={i} 
                className="bg-surface-container rounded-xl p-4 border border-outline-variant/40 hover:border-primary-container/30 transition-colors group relative"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-display font-bold text-sm text-on-surface mb-1">
                      {role.title}
                    </h4>
                    <p className="text-xs text-on-surface-variant mb-3">
                      {role.skills}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteRole(i)}
                    className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-surface-container-high"
                  >
                    <Trash2 className="w-3.8 h-3.8" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <span className="bg-primary-container/10 text-primary-container px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-primary-container/20">
                    {role.type}
                  </span>
                  <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-secondary/20">
                    {role.workplace}
                  </span>
                </div>
              </div>
            ))}

            {profile.preferredRoles.length === 0 && (
              <div className="text-center py-10 border border-dashed border-outline-variant rounded-xl">
                <p className="text-sm text-on-surface-variant">No preferred roles added yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Professional Skills Bento */}
        <div className="glass-card p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-lg text-on-surface">Professional Skills</h3>
          </div>

          {/* Add Tech Skill Form */}
          <form onSubmit={handleAddSkill} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Add skill (e.g. Go, Kubernetes)..."
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              className="flex-1 bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
            />
            <button 
              type="submit" 
              className="bg-primary-container text-on-primary-container px-4 rounded-xl flex items-center justify-center hover:opacity-95 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Core Technologies */}
          <div>
            <h4 className="text-[10px] font-mono font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
              Core Technologies
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(skill => (
                <div 
                  key={skill}
                  className="bg-surface-container border border-outline-variant/60 pl-3 pr-2 py-1.5 rounded-xl flex items-center gap-1.5 text-xs text-on-surface hover:border-error transition-colors group cursor-default"
                >
                  <span>{skill}</span>
                  <X 
                    onClick={() => handleDeleteSkill(skill)}
                    className="w-3 h-3 text-on-surface-variant hover:text-error cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Soft Skills */}
          <div>
            <h4 className="text-[10px] font-mono font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
              Soft Skills & Methods
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.softSkills.map(skill => (
                <span 
                  key={skill}
                  className="bg-surface-container-lowest border border-outline-variant/40 px-3 py-1.5 rounded-xl text-xs text-on-surface-variant cursor-default"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Resume & Documents Bento */}
      <section className="glass-card p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display font-bold text-lg text-on-surface">Resume & Documents</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Uploaded Documents List */}
          <div className="space-y-3">
            {profile.documents.map((doc, i) => (
              <div 
                key={i} 
                className="bg-surface-container rounded-xl p-4 border border-outline-variant/60 flex items-center gap-4 hover:border-primary-container transition-colors group"
              >
                <div className="w-12 h-12 bg-primary-container/10 rounded-xl flex items-center justify-center shrink-0 border border-primary-container/20">
                  <FileText className="w-6 h-6 text-primary-container" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-on-surface truncate">
                    {doc.name}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Updated {doc.date} · {doc.size}
                  </p>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => showToast('Downloading file...')}
                    className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteDocument(i)}
                    className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {profile.documents.length === 0 && (
              <div className="text-center py-8 border border-dashed border-outline-variant rounded-xl">
                <p className="text-sm text-on-surface-variant">No resumes uploaded yet.</p>
              </div>
            )}
          </div>

          {/* Upload Dropzone */}
          <div>
            <label className="border-2 border-dashed border-outline-variant hover:border-primary-container hover:bg-surface-container-lowest rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group relative">
              <input 
                type="file" 
                accept=".pdf,.docx"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden" 
              />
              
              {isUploading ? (
                <div className="space-y-3 w-full max-w-[200px]">
                  <div className="w-8 h-8 rounded-full border-4 border-primary-container border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-on-surface-variant font-mono">Uploading... {uploadProgress}%</p>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center mb-3 group-hover:bg-primary-container/10 group-hover:text-primary-container transition-colors">
                    <UploadCloud className="w-5 h-5 text-on-surface-variant group-hover:text-primary-container" />
                  </div>
                  <p className="font-display font-bold text-sm text-on-surface mb-1">
                    Upload New Document
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    PDF, DOCX up to 10MB
                  </p>
                </>
              )}
            </label>
          </div>
        </div>
      </section>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditProfileOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-md p-6 relative z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display font-black text-xl text-on-surface">Edit Profile</h3>
                <button 
                  onClick={() => setIsEditProfileOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-container rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1.5 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1.5 uppercase">Professional Title</label>
                  <input 
                    type="text" 
                    required
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary-container"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1.5 uppercase">Location</label>
                    <input 
                      type="text" 
                      required
                      value={editLocation}
                      onChange={e => setEditLocation(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary-container"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1.5 uppercase">Experience</label>
                    <input 
                      type="text" 
                      required
                      value={editExperience}
                      onChange={e => setEditExperience(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary-container"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditProfileOpen(false)}
                    className="flex-1 border border-outline-variant text-on-surface py-2.5 rounded-full font-display font-bold text-sm hover:bg-surface-container transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 btn-primary"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Preferred Role Modal */}
      <AnimatePresence>
        {isAddRoleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddRoleOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-md p-6 relative z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display font-black text-xl text-on-surface">Add Preferred Role</h3>
                <button 
                  onClick={() => setIsAddRoleOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-container rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddRoleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1.5 uppercase">Role Title</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Frontend Team Lead"
                    value={newRoleTitle}
                    onChange={e => setNewRoleTitle(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1.5 uppercase">Key Skills (comma separated)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. React, Next.js, Redux"
                    value={newRoleSkills}
                    onChange={e => setNewRoleSkills(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary-container"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1.5 uppercase">Commitment</label>
                    <select 
                      value={newRoleType}
                      onChange={e => setNewRoleType(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary-container"
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1.5 uppercase">Workplace</label>
                    <select 
                      value={newRoleWorkplace}
                      onChange={e => setNewRoleWorkplace(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary-container"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAddRoleOpen(false)}
                    className="flex-1 border border-outline-variant text-on-surface py-2.5 rounded-full font-display font-bold text-sm hover:bg-surface-container transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 btn-primary"
                  >
                    Add Role
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Toast message={toast.message} type={toast.type} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
