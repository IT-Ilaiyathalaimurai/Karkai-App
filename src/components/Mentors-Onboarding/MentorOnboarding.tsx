import React, { useState, useRef, useEffect } from 'react'
import type { UserProfile } from '../SignIn-Screen'
import {
  saveMentorDetails,
  uploadMentorAsset,
  type MentorProfileData,
} from '../../lib/Mentors-details'
import {
  getMentorDraft,
  saveMentorDraft,
  clearMentorDraft,
  clearActiveOnboardingRole,
} from '../../lib/onboarding-persistence'
import './MentorOnboarding.css'

export interface MentorOnboardingProps {
  user: UserProfile | null
  onBackToRoles?: () => void
  onComplete: (data: MentorProfileData) => void
}

export type MentorStep = 'information' | 'skills-bio' | 'documents'

export const POPULAR_TECH_SKILLS = [
  'Full Stack Development',
  'React & TypeScript',
  'Python & Django',
  'AI & Machine Learning',
  'Cloud Architecture (AWS / GCP / Azure)',
  'System Design & Microservices',
  'Data Science & Analytics',
  'Mobile App Development (React Native / Flutter)',
  'DevOps & CI/CD Pipelines',
  'Database Design & SQL',
  'Cybersecurity & Ethical Hacking',
  'UI/UX Product Design',
  'Java & Spring Boot',
  'Embedded Systems & IoT',
  'Blockchain & Web3',
]

export const POPULAR_SOFT_SKILLS = [
  'Career Mentorship & Guidance',
  'Resume & Portfolio Reviews',
  'Mock Interview Preparation',
  'Communication & Storytelling',
  'Engineering Leadership & Management',
  'Problem Solving & Critical Thinking',
  'Agile Project Management',
  'Startup Building & Entrepreneurship',
  'Public Speaking',
  'Networking & Professional Growth',
]

export const MentorOnboarding: React.FC<MentorOnboardingProps> = ({
  user,
  onBackToRoles,
  onComplete,
}) => {
  const userKey = user?.id || user?.email || 'default'
  const [initialDraft] = useState(() => getMentorDraft(userKey))
  const [showRestoredNotice, setShowRestoredNotice] = useState(() => Boolean(initialDraft))

  // Step state
  const [currentStep, setCurrentStep] = useState<MentorStep>(initialDraft?.currentStep || 'information')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Clear a specific field error when the user modifies it
  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }

  // Smooth scroll to a specific field when clicked from consolidated errors
  const scrollToField = (fieldKey: string) => {
    const elementMap: Record<string, string> = {
      fullName: 'mentor-fullname',
      phoneNumber: 'mentor-phone',
      workingAs: 'mentor-working-as',
      workingIn: 'mentor-working-in',
      city: 'mentor-city',
      region: 'mentor-region',
      techSkills: 'mentor-tech-skills-section',
      softSkills: 'mentor-soft-skills-section',
      bio: 'mentor-bio',
      linkedinUrl: 'mentor-linkedin',
      idCard: 'mentor-id-card-section',
      resume: 'mentor-resume-section',
    }
    const id = elementMap[fieldKey] || fieldKey
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (typeof (el as HTMLElement).focus === 'function') {
        ;(el as HTMLElement).focus()
      }
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 1: YOUR INFORMATION
  // ---------------------------------------------------------------------------
  const [fullName, setFullName] = useState(initialDraft?.fullName || user?.name || '')
  const [countryCode, setCountryCode] = useState(initialDraft?.countryCode || '+91')
  const [phoneNumber, setPhoneNumber] = useState(initialDraft?.phoneNumber || '')
  const [workingAs, setWorkingAs] = useState(initialDraft?.workingAs || '')
  const [workingIn, setWorkingIn] = useState(initialDraft?.workingIn || '')
  const [city, setCity] = useState(initialDraft?.city || '')
  const [region, setRegion] = useState(initialDraft?.region || 'Tamil Nadu')

  // ---------------------------------------------------------------------------
  // STEP 2: TECHNICAL SKILLS, SOFT SKILLS & BIO
  // ---------------------------------------------------------------------------
  const [selectedTechSkills, setSelectedTechSkills] = useState<string[]>(initialDraft?.selectedTechSkills || [])
  const [customTechInput, setCustomTechInput] = useState('')
  const [selectedSoftSkills, setSelectedSoftSkills] = useState<string[]>(initialDraft?.selectedSoftSkills || [])
  const [customSoftInput, setCustomSoftInput] = useState('')
  const [bio, setBio] = useState(initialDraft?.bio || '')

  // ---------------------------------------------------------------------------
  // STEP 3: DOCUMENTS UPLOAD (ALL MANDATORY)
  // ---------------------------------------------------------------------------
  const [linkedinUrl, setLinkedinUrl] = useState(initialDraft?.linkedinUrl || '')
  const [idCardPhotoUrl, setIdCardPhotoUrl] = useState<string | null>(initialDraft?.idCardPhotoUrl || null)
  const [idCardFileName, setIdCardFileName] = useState<string>(initialDraft?.idCardFileName || '')
  const [isDraggingId, setIsDraggingId] = useState(false)

  const [resumeUrl, setResumeUrl] = useState<string | null>(initialDraft?.resumeUrl || null)
  const [resumeFileName, setResumeFileName] = useState<string>(initialDraft?.resumeFileName || '')
  const [resumeFileSize, setResumeFileSize] = useState<string>(initialDraft?.resumeFileSize || '')

  // File input refs
  const idFileInputRef = useRef<HTMLInputElement | null>(null)
  const idCameraInputRef = useRef<HTMLInputElement | null>(null)
  const resumeInputRef = useRef<HTMLInputElement | null>(null)

  // Determine current step index for the progress indicator
  const stepNumber = currentStep === 'information' ? 1 : currentStep === 'skills-bio' ? 2 : 3

  // Automatically persist mentor draft whenever any field or step changes
  useEffect(() => {
    saveMentorDraft(userKey, {
      currentStep,
      fullName,
      countryCode,
      phoneNumber,
      workingAs,
      workingIn,
      city,
      region,
      selectedTechSkills,
      selectedSoftSkills,
      bio,
      linkedinUrl,
      idCardPhotoUrl,
      idCardFileName,
      resumeUrl,
      resumeFileName,
      resumeFileSize,
    })
  }, [
    userKey,
    currentStep,
    fullName,
    countryCode,
    phoneNumber,
    workingAs,
    workingIn,
    city,
    region,
    selectedTechSkills,
    selectedSoftSkills,
    bio,
    linkedinUrl,
    idCardPhotoUrl,
    idCardFileName,
    resumeUrl,
    resumeFileName,
    resumeFileSize,
  ])

  const handleStartOver = () => {
    clearMentorDraft(userKey)
    setShowRestoredNotice(false)
    setCurrentStep('information')
    setFieldErrors({})
    setErrorMessage(null)
    setFullName(user?.name || '')
    setCountryCode('+91')
    setPhoneNumber('')
    setWorkingAs('')
    setWorkingIn('')
    setCity('')
    setRegion('Tamil Nadu')
    setSelectedTechSkills([])
    setSelectedSoftSkills([])
    setBio('')
    setLinkedinUrl('')
    setIdCardPhotoUrl(null)
    setIdCardFileName('')
    setResumeUrl(null)
    setResumeFileName('')
    setResumeFileSize('')
    setSuccessNotice('Draft reset. Starting fresh!')
    setTimeout(() => setSuccessNotice(null), 3000)
  }

  // ---------------------------------------------------------------------------
  // STEP 1 HANDLERS
  // ---------------------------------------------------------------------------
  const handleInformationContinue = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!fullName.trim()) {
      errors.fullName = 'Full Name: Please enter your full name.'
    }

    const cleanPhone = phoneNumber.replace(/[\s-]/g, '')
    if (!cleanPhone || cleanPhone.length < 8 || !/^[0-9]+$/.test(cleanPhone)) {
      errors.phoneNumber = 'Phone Number: Please enter a valid phone number (digits only, min 8 digits).'
    }

    if (!workingAs.trim()) {
      errors.workingAs = 'Designation: Please enter your current designation / role.'
    }

    if (!workingIn.trim()) {
      errors.workingIn = 'Organization: Please enter your current company or organization.'
    }

    if (!city.trim()) {
      errors.city = 'City: Please enter your native or current city.'
    }

    if (!region.trim()) {
      errors.region = 'State / Region: Please enter your state or region.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setErrorMessage(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setFieldErrors({})
    setErrorMessage(null)
    setCurrentStep('skills-bio')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ---------------------------------------------------------------------------
  // STEP 2 HANDLERS
  // ---------------------------------------------------------------------------
  const toggleTechSkill = (skill: string) => {
    setSelectedTechSkills((prev) => {
      const next = prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
      if (next.length > 0) clearFieldError('techSkills')
      return next
    })
  }

  const handleAddCustomTechSkill = () => {
    const trimmed = customTechInput.trim()
    if (!trimmed) return
    if (!selectedTechSkills.includes(trimmed)) {
      setSelectedTechSkills((prev) => [...prev, trimmed])
      clearFieldError('techSkills')
    }
    setCustomTechInput('')
  }

  const removeTechSkill = (skill: string) => {
    setSelectedTechSkills((prev) => prev.filter((s) => s !== skill))
  }

  const toggleSoftSkill = (skill: string) => {
    setSelectedSoftSkills((prev) => {
      const next = prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
      if (next.length > 0) clearFieldError('softSkills')
      return next
    })
  }

  const handleAddCustomSoftSkill = () => {
    const trimmed = customSoftInput.trim()
    if (!trimmed) return
    if (!selectedSoftSkills.includes(trimmed)) {
      setSelectedSoftSkills((prev) => [...prev, trimmed])
      clearFieldError('softSkills')
    }
    setCustomSoftInput('')
  }

  const removeSoftSkill = (skill: string) => {
    setSelectedSoftSkills((prev) => prev.filter((s) => s !== skill))
  }

  const handleSkillsBioContinue = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (selectedTechSkills.length === 0) {
      errors.techSkills = 'Technical & Domain Skills: Please select or add at least one technical domain skill.'
    }

    if (selectedSoftSkills.length === 0) {
      errors.softSkills = 'Soft Skills: Please select or add at least one soft skill / mentorship strength.'
    }

    if (!bio.trim()) {
      errors.bio = 'Professional Bio: Please enter a brief professional bio (minimum 25 characters) to help students learn about your background.'
    } else if (bio.trim().length < 25) {
      errors.bio = `Professional Bio: Minimum 25 characters required (currently ${bio.trim().length} characters).`
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setErrorMessage(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setFieldErrors({})
    setErrorMessage(null)
    setCurrentStep('documents')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ---------------------------------------------------------------------------
  // STEP 3 HANDLERS (DOCUMENTS UPLOAD)
  // ---------------------------------------------------------------------------
  const handleIdCardFileSelect = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setFieldErrors((prev) => ({ ...prev, idCard: 'ID Card: Please upload an image file (JPG, PNG) or PDF of your ID card.' }))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, idCard: 'ID Card: File is too large. Maximum file size is 8MB.' }))
      return
    }

    setIdCardFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setIdCardPhotoUrl(reader.result as string)
      clearFieldError('idCard')
    }
    reader.readAsDataURL(file)
  }


  const handleResumeFileSelect = (file: File) => {
    const validExts = ['.pdf', '.doc', '.docx']
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext))

    if (!hasValidExt) {
      setFieldErrors((prev) => ({ ...prev, resume: 'Resume: Please upload your resume in .pdf or .doc format.' }))
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, resume: 'Resume: File is too large. Maximum file size is 2MB.' }))
      return
    }

    const kb = (file.size / 1024).toFixed(1)
    setResumeFileSize(`${kb} KB`)
    setResumeFileName(file.name)

    const reader = new FileReader()
    reader.onload = () => {
      setResumeUrl(reader.result as string)
      clearFieldError('resume')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveIdCard = () => {
    setIdCardPhotoUrl(null)
    setIdCardFileName('')
  }

  const handleRemoveResume = () => {
    setResumeUrl(null)
    setResumeFileName('')
    setResumeFileSize('')
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    // Validate LinkedIn URL
    const cleanLinkedin = linkedinUrl.trim()
    if (!cleanLinkedin) {
      errors.linkedinUrl = 'LinkedIn URL: Profile URL is mandatory for mentor verification.'
    } else if (!cleanLinkedin.toLowerCase().includes('linkedin.com')) {
      errors.linkedinUrl = 'LinkedIn URL: Please enter a valid profile link containing linkedin.com.'
    }

    // Validate ID Card
    if (!idCardPhotoUrl) {
      errors.idCard = 'ID Card: Official work identification document is mandatory for mentor verification.'
    }

    // Validate Resume
    if (!resumeUrl) {
      errors.resume = 'Resume: Curriculum Vitae upload is mandatory for mentor review.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setErrorMessage(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setFieldErrors({})
    setErrorMessage(null)
    setIsLoading(true)

    try {
      // 1. Upload ID card if available
      let uploadedIdUrl = idCardPhotoUrl
      if (idCardPhotoUrl && idCardFileName) {
        const remoteId = await uploadMentorAsset(idCardPhotoUrl, idCardFileName, 'id-cards')
        if (remoteId) uploadedIdUrl = remoteId
      }

      // 2. Upload Resume if available
      let uploadedResumeUrl = resumeUrl
      if (resumeUrl && resumeFileName) {
        const remoteResume = await uploadMentorAsset(resumeUrl, resumeFileName, 'resumes')
        if (remoteResume) uploadedResumeUrl = remoteResume
      }

      const mentorProfile: MentorProfileData = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        countryCode,
        workingAs: workingAs.trim(),
        workingIn: workingIn.trim(),
        city: city.trim(),
        region: region.trim(),
        technicalSkills: selectedTechSkills,
        softSkills: selectedSoftSkills,
        bio: bio.trim(),
        linkedinUrl: cleanLinkedin,
        idCardPhotoUrl: uploadedIdUrl || '',
        idCardFileName: idCardFileName || 'mentor-id-card.jpg',
        resumeUrl: uploadedResumeUrl || '',
        resumeFileName: resumeFileName || 'mentor-resume.pdf',
        resumeFileSize: resumeFileSize || undefined,
        completedAt: new Date().toISOString(),
        isVerified: false,
        verificationStatus: 'pending',
        rejectionReason: null,
      }

      // 3. Save to backend and local storage cache
      const saveRes = await saveMentorDetails(mentorProfile, user?.id, user?.email)
      if (!saveRes.success) {
        throw new Error(saveRes.error || 'Failed to persist mentor profile in database.')
      }

      setSuccessNotice('Mentor profile successfully registered!')
      clearMentorDraft(userKey)
      clearActiveOnboardingRole(userKey)
      setTimeout(() => {
        onComplete(mentorProfile)
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving mentor profile.'
      console.error('Onboarding save error:', err)
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mentor-onboarding-wrapper">
      {/* Hidden file inputs */}
      <input
        ref={idFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) handleIdCardFileSelect(e.target.files[0])
        }}
      />
      <input
        ref={idCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) handleIdCardFileSelect(e.target.files[0])
        }}
      />
      <input
        ref={resumeInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) handleResumeFileSelect(e.target.files[0])
        }}
      />

      <main className="mentor-onboarding-card">
        {/* Navigation Bar */}
        <nav className="mentor-nav">
          <button
            type="button"
            className="mentor-back-btn"
            onClick={() => {
              setFieldErrors({})
              setErrorMessage(null)
              if (currentStep === 'documents') setCurrentStep('skills-bio')
              else if (currentStep === 'skills-bio') setCurrentStep('information')
              else onBackToRoles?.()
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>{currentStep === 'information' ? 'Change Role' : 'Back'}</span>
          </button>

          <span className="mentor-step-badge">
            Step {stepNumber} of 3 &bull; Mentor Verification
          </span>
        </nav>

        {/* Resumed Draft Notice */}
        {showRestoredNotice && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              marginBottom: '16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              color: '#166534',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💾</span>
              <span><strong>Resuming draft:</strong> Continuing from where you left off.</span>
            </div>
            <button
              type="button"
              onClick={handleStartOver}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#dc2626',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Start Fresh
            </button>
          </div>
        )}

        {/* Multi-Step Indicator */}
        <div className="mentor-stepper-container">
          <div className="mentor-stepper-track">
            <div className="mentor-stepper-line" />
            <div
              className="mentor-stepper-progress"
              style={{
                width: stepNumber === 1 ? '16%' : stepNumber === 2 ? '50%' : '100%',
              }}
            />

            {/* Step 1 Node */}
            <div className={`mentor-step-item ${stepNumber >= 1 ? (stepNumber > 1 ? 'completed' : 'active') : ''}`}>
              <div className={`mentor-step-node ${stepNumber >= 1 ? (stepNumber > 1 ? 'completed' : 'active') : ''}`}>
                {stepNumber > 1 ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '1'}
              </div>
              <span className="mentor-step-node-label">Your Info</span>
            </div>

            {/* Step 2 Node */}
            <div className={`mentor-step-item ${stepNumber >= 2 ? (stepNumber > 2 ? 'completed' : 'active') : ''}`}>
              <div className={`mentor-step-node ${stepNumber >= 2 ? (stepNumber > 2 ? 'completed' : 'active') : ''}`}>
                {stepNumber > 2 ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '2'}
              </div>
              <span className="mentor-step-node-label">Skills & Bio</span>
            </div>

            {/* Step 3 Node */}
            <div className={`mentor-step-item ${stepNumber >= 3 ? 'active' : ''}`}>
              <div className={`mentor-step-node ${stepNumber >= 3 ? 'active' : ''}`}>
                3
              </div>
              <span className="mentor-step-node-label">Documents</span>
            </div>
          </div>
        </div>

        {/* Global Notifications: Consolidated Errors Summary at Top */}
        {(Object.keys(fieldErrors).length > 0 || errorMessage) && (
          <div className="mentor-consolidated-error-card" role="alert" id="mentor-error-summary">
            <div className="mentor-consolidated-error-header">
              <div className="mentor-consolidated-error-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="mentor-consolidated-error-title-wrap">
                <h4 className="mentor-consolidated-error-title">
                  {Object.keys(fieldErrors).length > 1
                    ? `Please resolve the following ${Object.keys(fieldErrors).length} issues to continue:`
                    : 'Please resolve the highlighted issue to continue:'}
                </h4>
                {errorMessage && <p className="mentor-consolidated-error-desc">{errorMessage}</p>}
              </div>
            </div>

            {Object.keys(fieldErrors).length > 0 && (
              <ul className="mentor-consolidated-error-list">
                {Object.entries(fieldErrors).map(([key, msg]) => (
                  <li key={key} className="mentor-consolidated-error-item">
                    <button
                      type="button"
                      className="mentor-error-jump-link"
                      onClick={() => scrollToField(key)}
                    >
                      <span>&bull;</span>
                      <span>{msg}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {successNotice && (
          <div className="mentor-alert-box success" role="status">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{successNotice}</span>
          </div>
        )}

        {/* =====================================================================
            STEP 1: YOUR INFORMATION
            ===================================================================== */}
        {currentStep === 'information' && (
          <div>
            <header className="mentor-header">
              <div className="mentor-badge-title-group">
                <div className="mentor-title-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h1 className="mentor-title">Mentor Information</h1>
              </div>
              <p className="mentor-subtitle">
                Provide your contact details and professional background so learners can connect with your expertise. All fields are mandatory.
              </p>
            </header>

            <form onSubmit={handleInformationContinue} className="mentor-form">
              {/* Full Name */}
              <div className={`form-field ${fieldErrors.fullName ? 'field-has-error' : ''}`}>
                <label htmlFor="mentor-fullname" className="field-label">
                  <span>Full Name <span className="required-star">*</span></span>
                </label>
                <input
                  id="mentor-fullname"
                  type="text"
                  className={`input-control ${fieldErrors.fullName ? 'has-error' : ''}`}
                  placeholder="e.g. Dr. K. Anand or Priya Sundaram"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    clearFieldError('fullName')
                  }}
                  required
                />
                {fieldErrors.fullName && (
                  <div className="field-error-notice" role="alert">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fieldErrors.fullName}</span>
                  </div>
                )}
              </div>

              {/* Phone Number with Country Code */}
              <div className={`form-field ${fieldErrors.phoneNumber ? 'field-has-error' : ''}`}>
                <label htmlFor="mentor-phone" className="field-label">
                  <span>Phone Number <span className="required-star">*</span></span>
                </label>
                <div className="phone-input-row">
                  <select
                    className="input-control country-select"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+65">+65 (SG)</option>
                    <option value="+971">+971 (UAE)</option>
                  </select>
                  <input
                    id="mentor-phone"
                    type="tel"
                    inputMode="numeric"
                    className={`input-control phone-input ${fieldErrors.phoneNumber ? 'has-error' : ''}`}
                    placeholder="9876543210"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value)
                      clearFieldError('phoneNumber')
                    }}
                    required
                  />
                </div>
                {fieldErrors.phoneNumber && (
                  <div className="field-error-notice" role="alert">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fieldErrors.phoneNumber}</span>
                  </div>
                )}
                <span className="field-hint">Used for session notifications & coordinator contact</span>
              </div>

              {/* Working As A (Job Designation) */}
              <div className={`form-field ${fieldErrors.workingAs ? 'field-has-error' : ''}`}>
                <label htmlFor="mentor-working-as" className="field-label">
                  <span>Working as a (Designation / Role) <span className="required-star">*</span></span>
                </label>
                <input
                  id="mentor-working-as"
                  type="text"
                  className={`input-control ${fieldErrors.workingAs ? 'has-error' : ''}`}
                  placeholder="e.g. Senior Software Engineer, Lead AI Scientist, Product Director"
                  value={workingAs}
                  onChange={(e) => {
                    setWorkingAs(e.target.value)
                    clearFieldError('workingAs')
                  }}
                  required
                />
                {fieldErrors.workingAs && (
                  <div className="field-error-notice" role="alert">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fieldErrors.workingAs}</span>
                  </div>
                )}
              </div>

              {/* Working In (Company / Organization) */}
              <div className={`form-field ${fieldErrors.workingIn ? 'field-has-error' : ''}`}>
                <label htmlFor="mentor-working-in" className="field-label">
                  <span>Working in (Company / Organization) <span className="required-star">*</span></span>
                </label>
                <input
                  id="mentor-working-in"
                  type="text"
                  className={`input-control ${fieldErrors.workingIn ? 'has-error' : ''}`}
                  placeholder="e.g. Zoho, Microsoft, Google, TCS, IIT Madras, Self-Employed"
                  value={workingIn}
                  onChange={(e) => {
                    setWorkingIn(e.target.value)
                    clearFieldError('workingIn')
                  }}
                  required
                />
                {fieldErrors.workingIn && (
                  <div className="field-error-notice" role="alert">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fieldErrors.workingIn}</span>
                  </div>
                )}
              </div>

              {/* City and Region */}
              <div className="form-field-row">
                <div className={`form-field ${fieldErrors.city ? 'field-has-error' : ''}`}>
                  <label htmlFor="mentor-city" className="field-label">
                    <span>City <span className="required-star">*</span></span>
                  </label>
                  <input
                    id="mentor-city"
                    type="text"
                    className={`input-control ${fieldErrors.city ? 'has-error' : ''}`}
                    placeholder="e.g. Chennai"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value)
                      clearFieldError('city')
                    }}
                    required
                  />
                  {fieldErrors.city && (
                    <div className="field-error-notice" role="alert">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{fieldErrors.city}</span>
                    </div>
                  )}
                </div>
                <div className={`form-field ${fieldErrors.region ? 'field-has-error' : ''}`}>
                  <label htmlFor="mentor-region" className="field-label">
                    <span>Region / State <span className="required-star">*</span></span>
                  </label>
                  <input
                    id="mentor-region"
                    type="text"
                    className={`input-control ${fieldErrors.region ? 'has-error' : ''}`}
                    placeholder="e.g. Tamil Nadu"
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value)
                      clearFieldError('region')
                    }}
                    required
                  />
                  {fieldErrors.region && (
                    <div className="field-error-notice" role="alert">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{fieldErrors.region}</span>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="mentor-submit-btn" id="mentor-step1-continue-btn">
                <span>Continue to Skills & Bio (Step 2 of 3)</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* =====================================================================
            STEP 2: TECHNICAL SKILLS, SOFT SKILLS & BIO
            ===================================================================== */}
        {currentStep === 'skills-bio' && (
          <div>
            <header className="mentor-header">
              <div className="mentor-badge-title-group">
                <div className="mentor-title-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <h1 className="mentor-title">Skills & Professional Bio</h1>
              </div>
              <p className="mentor-subtitle">
                Select your technical strengths and introduce your mentorship philosophy to students. All fields are mandatory.
              </p>
            </header>

            <form onSubmit={handleSkillsBioContinue} className="mentor-form">
              {/* 1. Technical Skills */}
              <div
                className={`form-field ${fieldErrors.techSkills ? 'field-has-error' : ''}`}
                id="mentor-tech-skills-section"
              >
                <div className="field-label-group">
                  <label className="field-label">
                    <span>Technical & Domain Skills <span className="required-star">*</span></span>
                  </label>
                  <span className="selected-counter-badge">
                    {selectedTechSkills.length} selected
                  </span>
                </div>

                {fieldErrors.techSkills && (
                  <div className="field-error-notice" role="alert" style={{ marginBottom: '10px', marginTop: '0' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fieldErrors.techSkills}</span>
                  </div>
                )}

                <div className={`mentor-pills-cloud ${fieldErrors.techSkills ? 'has-error' : ''}`}>
                  {POPULAR_TECH_SKILLS.map((sk) => {
                    const isSelected = selectedTechSkills.includes(sk)
                    return (
                      <button
                        key={sk}
                        type="button"
                        className={`mentor-pill-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleTechSkill(sk)}
                      >
                        <span className="pill-check-icon">
                          {isSelected ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : '+'}
                        </span>
                        <span>{sk}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Add Custom Tech Skill */}
                <div className="mentor-custom-input-row">
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Add custom domain / tool skill (e.g. Kubernetes, Rust, Solana)"
                    value={customTechInput}
                    onChange={(e) => setCustomTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCustomTechSkill()
                      }
                    }}
                  />
                  <button type="button" className="mentor-add-pill-btn" onClick={handleAddCustomTechSkill}>
                    + Add Skill
                  </button>
                </div>

                {/* Selected Tech Skills Tags */}
                {selectedTechSkills.length > 0 && (
                  <div className="selected-tags-container">
                    {selectedTechSkills.map((sk) => (
                      <span key={sk} className="mentor-tag-chip">
                        <span>{sk}</span>
                        <button type="button" className="tag-remove-btn" onClick={() => removeTechSkill(sk)}>
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Soft Skills */}
              <div
                className={`form-field ${fieldErrors.softSkills ? 'field-has-error' : ''}`}
                id="mentor-soft-skills-section"
                style={{ marginTop: '22px' }}
              >
                <div className="field-label-group">
                  <label className="field-label">
                    <span>Soft Skills & Mentorship Strengths <span className="required-star">*</span></span>
                  </label>
                  <span className="selected-counter-badge accent">
                    {selectedSoftSkills.length} selected
                  </span>
                </div>

                {fieldErrors.softSkills && (
                  <div className="field-error-notice" role="alert" style={{ marginBottom: '10px', marginTop: '0' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fieldErrors.softSkills}</span>
                  </div>
                )}

                <div className={`mentor-pills-cloud ${fieldErrors.softSkills ? 'has-error' : ''}`}>
                  {POPULAR_SOFT_SKILLS.map((ssk) => {
                    const isSelected = selectedSoftSkills.includes(ssk)
                    return (
                      <button
                        key={ssk}
                        type="button"
                        className={`mentor-pill-btn soft ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSoftSkill(ssk)}
                      >
                        <span className="pill-check-icon">
                          {isSelected ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : '+'}
                        </span>
                        <span>{ssk}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Add Custom Soft Skill */}
                <div className="mentor-custom-input-row">
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Add custom strength (e.g. Technical Writing, Pitching)"
                    value={customSoftInput}
                    onChange={(e) => setCustomSoftInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCustomSoftSkill()
                      }
                    }}
                  />
                  <button type="button" className="mentor-add-pill-btn" onClick={handleAddCustomSoftSkill}>
                    + Add Strength
                  </button>
                </div>

                {/* Selected Soft Skills Tags */}
                {selectedSoftSkills.length > 0 && (
                  <div className="selected-tags-container">
                    {selectedSoftSkills.map((ssk) => (
                      <span key={ssk} className="mentor-tag-chip soft">
                        <span>{ssk}</span>
                        <button type="button" className="tag-remove-btn" onClick={() => removeSoftSkill(ssk)}>
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Bio */}
              <div className={`form-field ${fieldErrors.bio ? 'field-has-error' : ''}`} style={{ marginTop: '22px' }}>
                <div className="field-label-group">
                  <label htmlFor="mentor-bio" className="field-label">
                    <span>Professional Bio & Guidance Philosophy <span className="required-star">*</span></span>
                  </label>
                  <span
                    className="bio-char-counter"
                    style={{
                      color: fieldErrors.bio ? '#dc2626' : undefined,
                      fontWeight: fieldErrors.bio ? 650 : undefined,
                    }}
                  >
                    {bio.length} characters (min 25)
                  </span>
                </div>
                <textarea
                  id="mentor-bio"
                  rows={4}
                  className={`input-control mentor-textarea ${fieldErrors.bio ? 'has-error' : ''}`}
                  placeholder="Share a short bio summarizing your professional career, key projects, and how you wish to mentor and guide students (minimum 25 characters)..."
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value)
                    if (e.target.value.trim().length >= 25) {
                      clearFieldError('bio')
                    }
                  }}
                  required
                />
                {fieldErrors.bio && (
                  <div className="field-error-notice" role="alert">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fieldErrors.bio}</span>
                  </div>
                )}
                <span className="field-hint">
                  Students will read this on your mentor profile before requesting 1-on-1 mentorship sessions.
                </span>
              </div>

              <button type="submit" className="mentor-submit-btn" id="mentor-step2-continue-btn">
                <span>Continue to Documents Upload (Step 3 of 3)</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* =====================================================================
            STEP 3: DOCUMENTS UPLOAD (ALL MANDATORY)
            ===================================================================== */}
        {currentStep === 'documents' && (
          <div>
            <header className="mentor-header">
              <div className="mentor-badge-title-group">
                <div className="mentor-title-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <h1 className="mentor-title">Documents & Verification</h1>
              </div>
              <p className="mentor-subtitle">
                To safeguard student safety and maintain educational excellence, all mentors must upload verification documents. All fields are mandatory.
              </p>
            </header>

            <form onSubmit={handleFinalSubmit} className="mentor-form">
              {/* 1. LinkedIn URL (Mandatory) */}
              <div className={`form-field ${fieldErrors.linkedinUrl ? 'field-has-error' : ''}`}>
                <label htmlFor="mentor-linkedin" className="field-label">
                  <span>LinkedIn Profile URL <span className="required-star">*</span></span>
                </label>
                <div className="mentor-linkedin-input-wrapper">
                  <svg className="linkedin-svg-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.62 1.62 0 0 0-1.62 1.62 1.62 1.62 0 0 0 1.62 1.62 1.62 1.62 0 0 0 1.62-1.62A1.62 1.62 0 0 0 7.83 6.3Z" />
                  </svg>
                  <input
                    id="mentor-linkedin"
                    type="url"
                    className={`input-control linkedin-control ${fieldErrors.linkedinUrl ? 'has-error' : ''}`}
                    placeholder="https://www.linkedin.com/in/yourprofile"
                    value={linkedinUrl}
                    onChange={(e) => {
                      setLinkedinUrl(e.target.value)
                      clearFieldError('linkedinUrl')
                    }}
                    required
                  />
                </div>
                {fieldErrors.linkedinUrl && (
                  <div className="field-error-notice" role="alert">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fieldErrors.linkedinUrl}</span>
                  </div>
                )}
                <span className="field-hint">Public LinkedIn profile for verification of your professional experience</span>
              </div>

              {/* 2. ID Card Upload (Mandatory) */}
              <div
                className={`form-field ${fieldErrors.idCard ? 'field-has-error' : ''}`}
                id="mentor-id-card-section"
                style={{ marginTop: '20px' }}
              >
                <div className="field-label-group">
                  <label className="field-label">
                    <span>Work ID Card / Official Identification <span className="required-star">*</span></span>
                  </label>
                  <span className="mandatory-badge">Mandatory Verification</span>
                </div>

                {fieldErrors.idCard && (
                  <div className="field-error-notice" role="alert" style={{ marginBottom: '10px', marginTop: '0' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fieldErrors.idCard}</span>
                  </div>
                )}

                {!idCardPhotoUrl ? (
                  <div
                    className={`mentor-upload-dropzone ${fieldErrors.idCard ? 'has-error' : ''} ${isDraggingId ? 'dragging' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDraggingId(true)
                    }}
                    onDragLeave={() => setIsDraggingId(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDraggingId(false)
                      if (e.dataTransfer.files?.[0]) handleIdCardFileSelect(e.dataTransfer.files[0])
                    }}
                  >
                    <div className="upload-circle-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <line x1="8" y1="2" x2="8" y2="4" />
                        <line x1="16" y1="2" x2="16" y2="4" />
                        <circle cx="9" cy="11" r="2" />
                        <path d="M15 15h2M7 16h4" />
                      </svg>
                    </div>

                    <p className="dropzone-primary-text">Upload Work ID Card or Official Government ID</p>
                    <p className="dropzone-secondary-text">Supported: JPG, PNG, PDF (Max 8MB)</p>

                    <div className="dropzone-buttons-row">
                      <button
                        type="button"
                        className="dropzone-action-btn primary"
                        onClick={() => idFileInputRef.current?.click()}
                        id="mentor-browse-id-btn"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Browse File</span>
                      </button>

                      <button
                        type="button"
                        className="dropzone-action-btn"
                        onClick={() => idCameraInputRef.current?.click()}
                        id="mentor-camera-id-btn"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span>Take Photo</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="id-card-preview-box">
                    <div className="preview-image-container">
                      <img src={idCardPhotoUrl} alt="Uploaded Work ID Card" className="preview-image" />
                      <div className="id-verified-overlay-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>ID Card Attached</span>
                      </div>
                    </div>

                    <div className="preview-file-actions">
                      <span className="preview-filename-text" title={idCardFileName}>
                        {idCardFileName || 'mentor-work-id.jpg'}
                      </span>
                      <div className="preview-btns-group">
                        <button
                          type="button"
                          className="preview-btn replace"
                          onClick={() => idFileInputRef.current?.click()}
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          className="preview-btn remove"
                          onClick={handleRemoveIdCard}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Resume Upload (Mandatory) */}
              <div
                className={`form-field ${fieldErrors.resume ? 'field-has-error' : ''}`}
                id="mentor-resume-section"
                style={{ marginTop: '20px' }}
              >
                <div className="field-label-group">
                  <label className="field-label">
                    <span>Resume / Curriculum Vitae <span className="required-star">*</span></span>
                  </label>
                  <span className="mandatory-badge">Mandatory Document</span>
                </div>

                {fieldErrors.resume && (
                  <div className="field-error-notice" role="alert" style={{ marginBottom: '10px', marginTop: '0' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fieldErrors.resume}</span>
                  </div>
                )}

                {!resumeUrl ? (
                  <div
                    className={`mentor-resume-dropzone ${fieldErrors.resume ? 'has-error' : ''}`}
                    onClick={() => resumeInputRef.current?.click()}
                    id="mentor-browse-resume-card"
                  >
                    <div className="upload-circle-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>

                    <p className="dropzone-primary-text">Click to Browse and Upload Resume</p>
                    <p className="dropzone-secondary-text">PDF or DOC format (Max 2MB)</p>
                  </div>
                ) : (
                  <div className="mentor-resume-attached-box">
                    <div className="resume-left-info">
                      <div className="resume-doc-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <div>
                        <p className="resume-name-text">{resumeFileName || 'mentor-resume.pdf'}</p>
                        <p className="resume-size-text">{resumeFileSize ? `${resumeFileSize} • Ready to verify` : 'Resume attached'}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="preview-btn remove"
                      onClick={handleRemoveResume}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Complete Profile Button */}
              <button
                type="submit"
                className="mentor-submit-btn complete-btn"
                disabled={isLoading}
                id="mentor-complete-onboarding-btn"
                style={{ marginTop: '26px' }}
              >
                {isLoading ? (
                  <>
                    <div className="mentor-btn-spinner" />
                    <span>Verifying & Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Mentor Registration</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}

export default MentorOnboarding
