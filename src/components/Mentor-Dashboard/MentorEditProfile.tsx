import React, { useState, useRef } from 'react'
import type { MentorProfileData } from '../../lib/Mentors-details'
import type { UserProfile } from '../SignIn-Screen'
import { updateMentorProfile } from '../../lib/Mentors-details'
import './MentorEditProfile.css'

export interface MentorEditProfileProps {
  mentorData: MentorProfileData | null
  user: UserProfile | null
  onSaveSuccess: (updated: MentorProfileData) => void
  onCancel: () => void
}

export const MentorEditProfile: React.FC<MentorEditProfileProps> = ({
  mentorData,
  user,
  onSaveSuccess,
  onCancel,
}) => {
  // Personal & Professional Fields
  const [fullName, setFullName] = useState<string>(mentorData?.fullName || user?.name || '')
  const [phoneNumber, setPhoneNumber] = useState<string>(mentorData?.phoneNumber || '')
  const [countryCode, setCountryCode] = useState<string>(mentorData?.countryCode || '+91')
  const [workingAs, setWorkingAs] = useState<string>(mentorData?.workingAs || '')
  const [workingIn, setWorkingIn] = useState<string>(mentorData?.workingIn || '')
  const [city, setCity] = useState<string>(mentorData?.city || '')
  const [region, setRegion] = useState<string>(mentorData?.region || 'Tamil Nadu')

  // Skills & Bio
  const [technicalSkills, setTechnicalSkills] = useState<string[]>(mentorData?.technicalSkills || [])
  const [newTechSkillInput, setNewTechSkillInput] = useState<string>('')
  const [softSkills, setSoftSkills] = useState<string[]>(mentorData?.softSkills || [])
  const [newSoftSkillInput, setNewSoftSkillInput] = useState<string>('')
  const [bio, setBio] = useState<string>(mentorData?.bio || '')
  const [linkedinUrl, setLinkedinUrl] = useState<string>(mentorData?.linkedinUrl || '')

  // Documents & Assets (ID Card & Resume)
  const [idCardPhotoUrl, setIdCardPhotoUrl] = useState<string>(mentorData?.idCardPhotoUrl || '')
  const [idCardFileName, setIdCardFileName] = useState<string>(mentorData?.idCardFileName || 'Work-ID-Card.jpg')
  const [resumeUrl, setResumeUrl] = useState<string>(mentorData?.resumeUrl || '')
  const [resumeFileName, setResumeFileName] = useState<string>(mentorData?.resumeFileName || 'Mentor-Resume.pdf')

  // File Inputs Refs
  const idFileInputRef = useRef<HTMLInputElement | null>(null)
  const resumeInputRef = useRef<HTMLInputElement | null>(null)

  // Status & Feedback
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isRejected = mentorData?.verificationStatus === 'rejected'
  const rejectionReason = mentorData?.rejectionReason

  // Handle ID Card file select
  const handleIdCardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIdCardFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setIdCardPhotoUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  // Handle Resume file select
  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setResumeFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setResumeUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  // Tag Helpers
  const addTag = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    input: string,
    setInput: (val: string) => void
  ) => {
    const trimmed = input.trim()
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed])
      setInput('')
    }
  }

  const removeTag = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    setList(list.filter((t) => t !== item))
  }

  // Submit / Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!fullName.trim()) {
      setErrorMessage('Full Name is required.')
      return
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Phone Number is required.')
      return
    }
    if (!workingAs.trim()) {
      setErrorMessage('Designation / Role is required.')
      return
    }
    if (!workingIn.trim()) {
      setErrorMessage('Company / Organization is required.')
      return
    }
    if (!city.trim()) {
      setErrorMessage('City is required.')
      return
    }
    if (!idCardPhotoUrl) {
      setErrorMessage('Work ID Card is required for mentor verification.')
      return
    }
    if (!resumeUrl) {
      setErrorMessage('Resume / CV is required for mentor review.')
      return
    }

    setIsSaving(true)

    try {
      const updatedProfile: MentorProfileData = {
        ...(mentorData || {}),
        id: mentorData?.id,
        userId: mentorData?.userId || user?.id,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        countryCode,
        workingAs: workingAs.trim(),
        workingIn: workingIn.trim(),
        city: city.trim(),
        region: region.trim(),
        technicalSkills,
        softSkills,
        bio: bio.trim(),
        linkedinUrl: linkedinUrl.trim(),
        idCardPhotoUrl,
        idCardFileName,
        resumeUrl,
        resumeFileName,
        // If previously rejected, re-submitting resets status to pending review
        isVerified: isRejected ? false : (mentorData?.isVerified ?? false),
        verificationStatus: isRejected ? 'pending' : (mentorData?.verificationStatus || 'pending'),
        rejectionReason: isRejected ? null : (mentorData?.rejectionReason || null),
      }

      const res = await updateMentorProfile(updatedProfile, user?.id, user?.email)
      if (!res.success) {
        throw new Error(res.error || 'Failed to overwrite mentor profile in backend.')
      }

      setSuccessMessage('Mentor profile successfully updated!')
      setTimeout(() => {
        onSaveSuccess(res.data || updatedProfile)
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating mentor profile'
      setErrorMessage(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mentor-edit-page" id="mentor-edit-profile-view">
      <div className="mentor-edit-container">
        {/* Header */}
        <header className="mentor-edit-header">
          <button
            type="button"
            className="mentor-edit-back-btn"
            onClick={onCancel}
            id="mentor-edit-back-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Cancel</span>
          </button>

          <div className="mentor-edit-title-wrap">
            <h1 className="mentor-edit-title">Edit Mentor Profile</h1>
            <p className="mentor-edit-subtitle">Overwrite your professional info, skills, and documents</p>
          </div>

          <button
            type="button"
            className="mentor-edit-header-save-btn"
            onClick={() => handleSave()}
            disabled={isSaving}
            id="mentor-edit-save-top-btn"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </header>

        {/* Notices */}
        {isRejected && (
          <div className="mentor-edit-notice warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <strong>Re-Verification Mode</strong>
              <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                Previous Admin Note: "{rejectionReason || 'Credentials unverified'}". Saving your updated profile & documents will re-submit your application for admin approval.
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mentor-edit-notice error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mentor-edit-notice success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Section 1: Professional Details */}
          <section className="mentor-edit-section">
            <h2 className="mentor-edit-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Professional Information
            </h2>
            <p className="mentor-edit-section-desc">Details shown to students in the verified mentors directory</p>

            <div className="mentor-edit-grid">
              <div className="student-edit-field">
                <label>
                  Full Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. A. Ramanathan"
                  required
                />
              </div>

              <div className="mentor-edit-field">
                <label>
                  Mobile Number <span className="req">*</span>
                </label>
                <div className="mentor-edit-phone-row">
                  <select
                    className="mentor-edit-country-select"
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
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>
              </div>

              <div className="mentor-edit-grid two-col">
                <div className="mentor-edit-field">
                  <label>Current Designation / Role <span className="req">*</span></label>
                  <input
                    type="text"
                    value={workingAs}
                    onChange={(e) => setWorkingAs(e.target.value)}
                    placeholder="e.g. Senior Tech Lead"
                    required
                  />
                </div>

                <div className="mentor-edit-field">
                  <label>Company / Organization <span className="req">*</span></label>
                  <input
                    type="text"
                    value={workingIn}
                    onChange={(e) => setWorkingIn(e.target.value)}
                    placeholder="e.g. Google, Infosys"
                    required
                  />
                </div>
              </div>

              <div className="mentor-edit-grid two-col">
                <div className="mentor-edit-field">
                  <label>City <span className="req">*</span></label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Chennai"
                    required
                  />
                </div>

                <div className="mentor-edit-field">
                  <label>State / Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. Tamil Nadu"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Skills & Bio */}
          <section className="mentor-edit-section">
            <h2 className="mentor-edit-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Expertise & Biography
            </h2>

            {/* Technical Skills */}
            <div className="mentor-edit-field" style={{ marginBottom: '14px' }}>
              <label>Technical Skills / Areas of Guidance</label>
              <div className="mentor-edit-tag-wrap">
                {technicalSkills.map((sk) => (
                  <span key={sk} className="mentor-edit-tag">
                    {sk}
                    <button type="button" onClick={() => removeTag(technicalSkills, setTechnicalSkills, sk)}>
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="mentor-edit-add-tag-row">
                <input
                  type="text"
                  value={newTechSkillInput}
                  onChange={(e) => setNewTechSkillInput(e.target.value)}
                  placeholder="e.g. Machine Learning, System Design"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(technicalSkills, setTechnicalSkills, newTechSkillInput, setNewTechSkillInput)
                    }
                  }}
                />
                <button
                  type="button"
                  className="mentor-edit-add-tag-btn"
                  onClick={() => addTag(technicalSkills, setTechnicalSkills, newTechSkillInput, setNewTechSkillInput)}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Soft Skills */}
            <div className="mentor-edit-field" style={{ marginBottom: '14px' }}>
              <label>Soft Skills</label>
              <div className="mentor-edit-tag-wrap">
                {softSkills.map((sk) => (
                  <span key={sk} className="mentor-edit-tag">
                    {sk}
                    <button type="button" onClick={() => removeTag(softSkills, setSoftSkills, sk)}>
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="mentor-edit-add-tag-row">
                <input
                  type="text"
                  value={newSoftSkillInput}
                  onChange={(e) => setNewSoftSkillInput(e.target.value)}
                  placeholder="e.g. Interview Prep, Leadership"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(softSkills, setSoftSkills, newSoftSkillInput, setNewSoftSkillInput)
                    }
                  }}
                />
                <button
                  type="button"
                  className="mentor-edit-add-tag-btn"
                  onClick={() => addTag(softSkills, setSoftSkills, newSoftSkillInput, setNewSoftSkillInput)}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Bio */}
            <div className="mentor-edit-field" style={{ marginBottom: '14px' }}>
              <label>Professional Bio / Summary</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your industry experience and how you can guide students..."
              />
            </div>

            {/* LinkedIn */}
            <div className="mentor-edit-field">
              <label>LinkedIn Profile URL</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </section>

          {/* Section 3: Documents & Assets */}
          <section className="mentor-edit-section">
            <h2 className="mentor-edit-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Verification Documents & Assets
            </h2>
            <p className="mentor-edit-section-desc">Update your company identification card and resume</p>

            {/* Hidden inputs */}
            <input
              ref={idFileInputRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={handleIdCardFileChange}
            />
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              style={{ display: 'none' }}
              onChange={handleResumeFileChange}
            />

            {/* 1. Work ID Card Card */}
            <div className="mentor-edit-asset-card">
              <div className="mentor-edit-asset-header">
                <span className="mentor-edit-asset-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <circle cx="9" cy="10" r="2" />
                    <line x1="15" y1="8" x2="17" y2="8" />
                    <line x1="15" y1="12" x2="17" y2="12" />
                  </svg>
                  Official Work ID Card
                </span>
                <span className={`mentor-edit-asset-badge ${idCardPhotoUrl ? 'uploaded' : ''}`}>
                  {idCardPhotoUrl ? 'Uploaded' : 'Required'}
                </span>
              </div>

              <div className="mentor-edit-asset-preview-row">
                {idCardPhotoUrl && (
                  <img
                    src={idCardPhotoUrl}
                    alt="ID Card Preview"
                    className="mentor-edit-id-preview-thumb"
                  />
                )}
                <div className="mentor-edit-asset-meta">
                  <div className="mentor-edit-asset-file-name">{idCardFileName}</div>
                  {idCardPhotoUrl.startsWith('http') && (
                    <a
                      href={idCardPhotoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mentor-edit-asset-view-link"
                    >
                      View Current Document
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  className="mentor-edit-asset-upload-btn"
                  onClick={() => idFileInputRef.current?.click()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Replace ID Card
                </button>
              </div>
            </div>

            {/* 2. Resume Card */}
            <div className="mentor-edit-asset-card">
              <div className="mentor-edit-asset-header">
                <span className="mentor-edit-asset-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Resume / Curriculum Vitae
                </span>
                <span className={`mentor-edit-asset-badge ${resumeUrl ? 'uploaded' : ''}`}>
                  {resumeUrl ? 'Uploaded' : 'Required'}
                </span>
              </div>

              <div className="mentor-edit-asset-preview-row">
                <div className="mentor-edit-asset-meta">
                  <div className="mentor-edit-asset-file-name">{resumeFileName}</div>
                  {resumeUrl.startsWith('http') && (
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mentor-edit-asset-view-link"
                    >
                      View Current Resume
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  className="mentor-edit-asset-upload-btn"
                  onClick={() => resumeInputRef.current?.click()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Replace Resume
                </button>
              </div>
            </div>
          </section>

          {/* Bottom Fixed Action Bar */}
          <div className="mentor-edit-bottom-bar">
            <div className="mentor-edit-bottom-content">
              <button
                type="button"
                className="mentor-edit-cancel-btn"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="mentor-edit-save-btn"
                disabled={isSaving}
                id="mentor-edit-save-bottom-btn"
              >
                {isSaving ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" className="animate-spin">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="16" />
                    </svg>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Save & Overwrite Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
