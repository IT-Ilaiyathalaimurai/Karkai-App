import React, { useState, useRef } from 'react'
import type { StudentProfileData } from '../Students-Onboarding'
import type { UserProfile } from '../SignIn-Screen'
import { updateStudentProfile } from '../../lib/Students-details'
import './StudentEditProfile.css'

const MAX_RESUME_SIZE_BYTES = 100 * 1024
const MAX_RESUME_SIZE_LABEL = '100KB'

export interface StudentEditProfileProps {
  studentData: StudentProfileData | null
  user: UserProfile | null
  onSaveSuccess: (updated: StudentProfileData) => void
  onCancel: () => void
}

export const StudentEditProfile: React.FC<StudentEditProfileProps> = ({
  studentData,
  user,
  onSaveSuccess,
  onCancel,
}) => {
  const isMinorInitial = Boolean(studentData?.isMinor)

  // Personal Information
  const [fullName, setFullName] = useState<string>(studentData?.fullName || user?.name || '')
  const [mobileNumber, setMobileNumber] = useState<string>(studentData?.mobileNumber || '')
  const [countryCode, setCountryCode] = useState<string>(studentData?.countryCode || '+91')
  const [dateOfBirth, setDateOfBirth] = useState<string>(studentData?.dateOfBirth || '')
  const [gender, setGender] = useState<string>(studentData?.gender || 'Prefer not to say')
  const [city, setCity] = useState<string>(studentData?.city || '')
  const [district, setDistrict] = useState<string>(studentData?.district || '')
  const [state, setState] = useState<string>(studentData?.state || 'Tamil Nadu')

  // Wing & Age
  const [isMinor, setIsMinor] = useState<boolean>(isMinorInitial)
  const [age, setAge] = useState<number>(studentData?.age || 18)

  // School Wing: Parent Consent
  const [parentName, setParentName] = useState<string>(studentData?.parentConsent?.parentName || '')
  const [relationship, setRelationship] = useState<'father' | 'mother' | 'guardian'>(
    (studentData?.parentConsent?.relationship as 'father' | 'mother' | 'guardian') || 'father'
  )
  const [parentMobile, setParentMobile] = useState<string>(studentData?.parentConsent?.parentMobile || '')
  const [consentGiven, setConsentGiven] = useState<boolean>(studentData?.parentConsent?.consentGiven ?? true)
  const [mediumOfStudy, setMediumOfStudy] = useState<string>(studentData?.mediumOfStudy || 'English Medium')

  // Senior Wing: Schooling
  const [tenthSchoolName, setTenthSchoolName] = useState<string>(studentData?.tenthSchoolName || '')
  const [tenthMarks, setTenthMarks] = useState<string>(studentData?.tenthMarks || '')
  const [tenthPercentage, setTenthPercentage] = useState<string>(studentData?.tenthPercentage || '')
  const [twelfthSchoolName, setTwelfthSchoolName] = useState<string>(studentData?.twelfthSchoolName || '')
  const [twelfthMarks, setTwelfthMarks] = useState<string>(studentData?.twelfthMarks || '')
  const [twelfthPercentage, setTwelfthPercentage] = useState<string>(studentData?.twelfthPercentage || '')

  // College / Academic Details
  const [institutionName, setInstitutionName] = useState<string>(studentData?.institutionName || '')
  const [degree, setDegree] = useState<string>(studentData?.degree || 'B.E / B.Tech')
  const [customDegree, setCustomDegree] = useState<string>(studentData?.customDegree || '')
  const [branch, setBranch] = useState<string>(studentData?.branch || '')
  const [currentYear, setCurrentYear] = useState<string>(studentData?.currentYear || '1st Year')
  const [currentCgpa, setCurrentCgpa] = useState<string>(studentData?.currentCgpa || '')

  // Skills & Interests
  const [skills, setSkills] = useState<string[]>(studentData?.skills || [])
  const [newSkillInput, setNewSkillInput] = useState<string>('')
  const [softSkills, setSoftSkills] = useState<string[]>(studentData?.softSkills || [])
  const [newSoftSkillInput, setNewSoftSkillInput] = useState<string>('')
  const [learningInterests, setLearningInterests] = useState<string[]>(studentData?.learningInterests || [])
  const [newInterestInput, setNewInterestInput] = useState<string>('')
  const [extracurriculars, setExtracurriculars] = useState<string[]>(studentData?.extracurricularActivities || [])
  const [newExtraInput, setNewExtraInput] = useState<string>('')

  // Assets (Resume & LinkedIn)
  const [linkedinUrl, setLinkedinUrl] = useState<string>(studentData?.linkedinUrl || '')
  const [resumeUrl, setResumeUrl] = useState<string>(studentData?.resumeUrl || '')
  const [resumeFileName, setResumeFileName] = useState<string>(studentData?.resumeFileName || '')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // UI State
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Handle Date of Birth change (auto calculate age & minor status)
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setDateOfBirth(val)
    if (val) {
      const birthDate = new Date(val)
      const today = new Date()
      let calculatedAge = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--
      }
      setAge(calculatedAge)
      setIsMinor(calculatedAge < 18)
    }
  }

  // Handle Resume File Select
  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    const validExtensions = ['.pdf', '.doc', '.docx']
    const hasValidExtension = validExtensions.some((extension) => fileName.endsWith(extension))
    const validMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const hasValidMimeType = validMimeTypes.includes(file.type)

    if (!hasValidExtension && !hasValidMimeType && file.type !== '') {
      setErrorMessage('Resume must be a PDF or Word document.')
      e.target.value = ''
      return
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      setErrorMessage(`Your file is too large (${Math.round(file.size / 1024)}KB). Please choose a file <= ${MAX_RESUME_SIZE_LABEL}.`)
      e.target.value = ''
      return
    }

    setErrorMessage(null)
    setResumeFileName(file.name)

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setResumeUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  // Tag helper functions
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
    tagToRemove: string
  ) => {
    setList(list.filter((t) => t !== tagToRemove))
  }

  // Form Submit / Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!fullName.trim()) {
      setErrorMessage('Full Name is required.')
      return
    }
    if (!mobileNumber.trim()) {
      setErrorMessage('Mobile Number is required.')
      return
    }
    if (!institutionName.trim()) {
      setErrorMessage('School / College name is required.')
      return
    }

    setIsSaving(true)

    try {
      const updatedProfile: StudentProfileData = {
        ...(studentData || {}),
        id: (studentData as any)?.id,
        idCardPhotoUrl: studentData?.idCardPhotoUrl || '',
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        countryCode,
        dateOfBirth,
        age,
        isMinor,
        gender,
        city: city.trim(),
        district: district.trim(),
        state: state.trim(),

        parentConsent: isMinor
          ? {
              parentName: parentName.trim(),
              relationship,
              parentMobile: parentMobile.trim(),
              consentGiven,
            }
          : undefined,

        tenthSchoolName: !isMinor ? tenthSchoolName.trim() : undefined,
        tenthMarks: !isMinor ? tenthMarks.trim() : undefined,
        tenthPercentage: !isMinor ? tenthPercentage.trim() : undefined,
        twelfthSchoolName: !isMinor ? twelfthSchoolName.trim() : undefined,
        twelfthMarks: !isMinor ? twelfthMarks.trim() : undefined,
        twelfthPercentage: !isMinor ? twelfthPercentage.trim() : undefined,
        mediumOfStudy,

        institutionName: institutionName.trim(),
        degree: isMinor ? 'School Student' : degree,
        customDegree: !isMinor && degree === 'Other' ? customDegree.trim() : undefined,
        branch: isMinor ? 'High School' : branch.trim(),
        currentYear,
        currentCgpa: !isMinor ? currentCgpa.trim() : undefined,

        skills,
        softSkills,
        learningInterests,
        extracurricularActivities: extracurriculars,

        linkedinUrl: linkedinUrl.trim() || undefined,
        resumeUrl: resumeUrl || undefined,
        resumeFileName: resumeFileName || undefined,
      }

      const res = await updateStudentProfile(updatedProfile, user?.id, user?.email)
      if (!res.success) {
        throw new Error(res.error || 'Failed to overwrite student profile in backend.')
      }

      setSuccessMessage('Profile successfully updated!')
      setTimeout(() => {
        onSaveSuccess(res.data || updatedProfile)
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating student profile'
      setErrorMessage(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="student-edit-page" id="student-edit-profile-view">
      <div className="student-edit-container">
        {/* Header */}
        <header className="student-edit-header">
          <button
            type="button"
            className="student-edit-back-btn"
            onClick={onCancel}
            id="student-edit-back-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Cancel</span>
          </button>

          <div className="student-edit-title-wrap">
            <h1 className="student-edit-title">Edit Student Profile</h1>
            <p className="student-edit-subtitle">Overwrite and keep your details up to date</p>
          </div>

          <button
            type="button"
            className="student-edit-header-save-btn"
            onClick={() => handleSave()}
            disabled={isSaving}
            id="student-edit-save-top-btn"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </header>

        {/* Notices */}
        {errorMessage && (
          <div className="student-edit-notice error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="student-edit-notice success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Section 1: Personal Details */}
          <section className="student-edit-section">
            <h2 className="student-edit-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Personal Details
            </h2>
            <p className="student-edit-section-desc">Your basic profile information</p>

            <div className="student-edit-grid">
              <div className="student-edit-field">
                <label>
                  Full Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="student-edit-field">
                <label>
                  Mobile Number <span className="req">*</span>
                </label>
                <div className="student-edit-phone-row">
                  <select
                    className="student-edit-country-select"
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
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>
              </div>

              <div className="student-edit-grid two-col">
                <div className="student-edit-field">
                  <label>Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={handleDobChange} />
                </div>

                <div className="student-edit-field">
                  <label>Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="student-edit-grid two-col">
                <div className="student-edit-field">
                  <label>City / Town</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Tiruvallur"
                  />
                </div>

                <div className="student-edit-field">
                  <label>District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Chennai"
                  />
                </div>
              </div>

              <div className="student-edit-field">
                <label>State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Tamil Nadu"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Wing & Academic Details */}
          <section className="student-edit-section">
            <h2 className="student-edit-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              Academic Background
            </h2>
            <div className="student-edit-wing-badge">
              <span>{isMinor ? '🏫 School Student Wing (< 18)' : '🎓 Senior Student Wing (18+)'}</span>
            </div>

            <div className="student-edit-grid">
              {/* School Wing Details */}
              {isMinor && (
                <>
                  <div className="student-edit-field">
                    <label>School Name <span className="req">*</span></label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="e.g. Govt Higher Secondary School"
                      required
                    />
                  </div>

                  <div className="student-edit-grid two-col">
                    <div className="student-edit-field">
                      <label>Class / Grade</label>
                      <select value={currentYear} onChange={(e) => setCurrentYear(e.target.value)}>
                        <option value="9th Standard">9th Standard</option>
                        <option value="10th Standard">10th Standard</option>
                        <option value="11th Standard">11th Standard</option>
                        <option value="12th Standard">12th Standard</option>
                      </select>
                    </div>

                    <div className="student-edit-field">
                      <label>Medium of Study</label>
                      <select value={mediumOfStudy} onChange={(e) => setMediumOfStudy(e.target.value)}>
                        <option value="Tamil Medium">Tamil Medium</option>
                        <option value="English Medium">English Medium</option>
                      </select>
                    </div>
                  </div>

                  {/* Parent Consent */}
                  <div className="student-edit-field">
                    <label>Parent / Guardian Name</label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Guardian name"
                    />
                  </div>

                  <div className="student-edit-grid two-col">
                    <div className="student-edit-field">
                      <label>Relationship</label>
                      <select
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value as 'father' | 'mother' | 'guardian')}
                      >
                        <option value="father">Father</option>
                        <option value="mother">Mother</option>
                        <option value="guardian">Guardian</option>
                      </select>
                    </div>

                    <div className="student-edit-field">
                      <label>Parent Mobile</label>
                      <input
                        type="tel"
                        value={parentMobile}
                        onChange={(e) => setParentMobile(e.target.value)}
                        placeholder="Guardian contact"
                      />
                    </div>
                  </div>

                  <div className="student-edit-checkbox-row">
                    <input
                      type="checkbox"
                      id="parent-consent-checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                    />
                    <label htmlFor="parent-consent-checkbox">
                      Parent / Guardian has provided consent for participation in mentorship programs.
                    </label>
                  </div>
                </>
              )}

              {/* Senior / College Wing Details */}
              {!isMinor && (
                <>
                  <div className="student-edit-field">
                    <label>College / University Name <span className="req">*</span></label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="e.g. Anna University, IIT Madras"
                      required
                    />
                  </div>

                  <div className="student-edit-grid two-col">
                    <div className="student-edit-field">
                      <label>Degree</label>
                      <select value={degree} onChange={(e) => setDegree(e.target.value)}>
                        <option value="B.E / B.Tech">B.E / B.Tech</option>
                        <option value="B.Sc">B.Sc</option>
                        <option value="B.Com">B.Com</option>
                        <option value="BCA">BCA</option>
                        <option value="B.A">B.A</option>
                        <option value="M.E / M.Tech">M.E / M.Tech</option>
                        <option value="MCA">MCA</option>
                        <option value="M.Sc">M.Sc</option>
                        <option value="MBA">MBA</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {degree === 'Other' && (
                      <div className="student-edit-field">
                        <label>Custom Degree</label>
                        <input
                          type="text"
                          value={customDegree}
                          onChange={(e) => setCustomDegree(e.target.value)}
                          placeholder="Specify degree"
                        />
                      </div>
                    )}

                    <div className="student-edit-field">
                      <label>Branch / Department</label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                  </div>

                  <div className="student-edit-grid two-col">
                    <div className="student-edit-field">
                      <label>Current Year</label>
                      <select value={currentYear} onChange={(e) => setCurrentYear(e.target.value)}>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="Graduated">Graduated / Alum</option>
                      </select>
                    </div>

                    <div className="student-edit-field">
                      <label>Current CGPA / Percentage</label>
                      <input
                        type="text"
                        value={currentCgpa}
                        onChange={(e) => setCurrentCgpa(e.target.value)}
                        placeholder="e.g. 8.5 CGPA or 85%"
                      />
                    </div>
                  </div>

                  {/* Schooling Marks */}
                  <div className="student-edit-grid two-col">
                    <div className="student-edit-field">
                      <label>10th School Name</label>
                      <input
                        type="text"
                        value={tenthSchoolName}
                        onChange={(e) => setTenthSchoolName(e.target.value)}
                        placeholder="e.g. St. Xavier's High School"
                      />
                    </div>

                    <div className="student-edit-field">
                      <label>10th Marks / Percentage</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={tenthMarks}
                          onChange={(e) => setTenthMarks(e.target.value)}
                          placeholder="e.g. 450/500"
                          style={{ flex: 1 }}
                        />
                        <input
                          type="text"
                          value={tenthPercentage}
                          onChange={(e) => setTenthPercentage(e.target.value)}
                          placeholder="e.g. 90%"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="student-edit-grid two-col">
                    <div className="student-edit-field">
                      <label>12th School Name</label>
                      <input
                        type="text"
                        value={twelfthSchoolName}
                        onChange={(e) => setTwelfthSchoolName(e.target.value)}
                        placeholder="e.g. St. Xavier's Higher Secondary"
                      />
                    </div>

                    <div className="student-edit-field">
                      <label>12th Marks / Percentage</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={twelfthMarks}
                          onChange={(e) => setTwelfthMarks(e.target.value)}
                          placeholder="e.g. 540/600"
                          style={{ flex: 1 }}
                        />
                        <input
                          type="text"
                          value={twelfthPercentage}
                          onChange={(e) => setTwelfthPercentage(e.target.value)}
                          placeholder="e.g. 90%"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Section 3: Skills & Interests */}
          <section className="student-edit-section">
            <h2 className="student-edit-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Skills & Interests
            </h2>

            {/* Technical Skills */}
            <div className="student-edit-field" style={{ marginBottom: '14px' }}>
              <label>Technical Skills</label>
              <div className="student-edit-tag-wrap">
                {skills.map((s) => (
                  <span key={s} className="student-edit-tag">
                    {s}
                    <button type="button" onClick={() => removeTag(skills, setSkills, s)}>
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="student-edit-add-tag-row">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="e.g. Python, React, SQL"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(skills, setSkills, newSkillInput, setNewSkillInput)
                    }
                  }}
                />
                <button
                  type="button"
                  className="student-edit-add-tag-btn"
                  onClick={() => addTag(skills, setSkills, newSkillInput, setNewSkillInput)}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Soft Skills */}
            <div className="student-edit-field" style={{ marginBottom: '14px' }}>
              <label>Soft Skills</label>
              <div className="student-edit-tag-wrap">
                {softSkills.map((s) => (
                  <span key={s} className="student-edit-tag">
                    {s}
                    <button type="button" onClick={() => removeTag(softSkills, setSoftSkills, s)}>
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="student-edit-add-tag-row">
                <input
                  type="text"
                  value={newSoftSkillInput}
                  onChange={(e) => setNewSoftSkillInput(e.target.value)}
                  placeholder="e.g. Communication, Problem Solving"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(softSkills, setSoftSkills, newSoftSkillInput, setNewSoftSkillInput)
                    }
                  }}
                />
                <button
                  type="button"
                  className="student-edit-add-tag-btn"
                  onClick={() => addTag(softSkills, setSoftSkills, newSoftSkillInput, setNewSoftSkillInput)}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Learning Interests */}
            <div className="student-edit-field" style={{ marginBottom: '14px' }}>
              <label>Learning Interests / Career Goals</label>
              <div className="student-edit-tag-wrap">
                {learningInterests.map((item) => (
                  <span key={item} className="student-edit-tag">
                    {item}
                    <button type="button" onClick={() => removeTag(learningInterests, setLearningInterests, item)}>
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="student-edit-add-tag-row">
                <input
                  type="text"
                  value={newInterestInput}
                  onChange={(e) => setNewInterestInput(e.target.value)}
                  placeholder="e.g. AI & ML, Web Development, Public Speaking"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(learningInterests, setLearningInterests, newInterestInput, setNewInterestInput)
                    }
                  }}
                />
                <button
                  type="button"
                  className="student-edit-add-tag-btn"
                  onClick={() => addTag(learningInterests, setLearningInterests, newInterestInput, setNewInterestInput)}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Extracurricular Activities */}
            <div className="student-edit-field">
              <label>Extracurricular Activities</label>
              <div className="student-edit-tag-wrap">
                {extracurriculars.map((item) => (
                  <span key={item} className="student-edit-tag">
                    {item}
                    <button type="button" onClick={() => removeTag(extracurriculars, setExtracurriculars, item)}>
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="student-edit-add-tag-row">
                <input
                  type="text"
                  value={newExtraInput}
                  onChange={(e) => setNewExtraInput(e.target.value)}
                  placeholder="e.g. Debate, Sports, Cultural Activities"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(extracurriculars, setExtracurriculars, newExtraInput, setNewExtraInput)
                    }
                  }}
                />
                <button
                  type="button"
                  className="student-edit-add-tag-btn"
                  onClick={() => addTag(extracurriculars, setExtracurriculars, newExtraInput, setNewExtraInput)}
                >
                  Add
                </button>
              </div>
            </div>
          </section>

          {/* Section 4: Assets & Documents */}
          <section className="student-edit-section">
            <h2 className="student-edit-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Documents & Assets
            </h2>
            <p className="student-edit-section-desc">Manage your resume and professional link</p>

            <div className="student-edit-grid">
              {/* Resume Upload / Overwrite */}
              <div className="student-edit-field">
                <label>Resume / Curriculum Vitae (Max {MAX_RESUME_SIZE_LABEL})</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: 'none' }}
                  onChange={handleResumeFileChange}
                />

                {resumeUrl ? (
                  <div className="student-edit-asset-current">
                    <div className="student-edit-asset-info">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <div>
                        <div className="student-edit-asset-name">{resumeFileName || 'Student-Resume.pdf'}</div>
                        {resumeUrl.startsWith('http') && (
                          <a
                            href={resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="student-edit-asset-link"
                          >
                            View Current File
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="student-edit-asset-actions">
                      <button
                        type="button"
                        className="student-edit-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Replace File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="student-edit-asset-box" onClick={() => fileInputRef.current?.click()}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                      Click to upload your resume
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>PDF or Word file (Max {MAX_RESUME_SIZE_LABEL})</span>
                  </div>
                )}
              </div>

              {/* LinkedIn URL */}
              <div className="student-edit-field">
                <label>LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </div>
          </section>

          {/* Bottom Fixed Action Bar */}
          <div className="student-edit-bottom-bar">
            <div className="student-edit-bottom-content">
              <button
                type="button"
                className="student-edit-cancel-btn"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="student-edit-save-btn"
                disabled={isSaving}
                id="student-edit-save-bottom-btn"
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
