import React from 'react'
import type { StudentProfileData } from '../Students-Onboarding'
import type { UserProfile } from '../SignIn-Screen'

interface StudentProfileModalProps {
  isOpen: boolean
  onClose: () => void
  studentData: StudentProfileData | null
  user: UserProfile | null
  onEditProfile?: () => void
  onSignOut?: () => void
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  studentData,
  user,
  onEditProfile,
  onSignOut,
}) => {
  if (!isOpen) return null

  const isMinor = studentData?.isMinor ?? false
  const displayName = studentData?.fullName || user?.name || 'Student'
  const displayEmail = user?.email || 'student@karkai.edu'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'S'

  return (
    <div className="profile-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Drag Indicator */}
        <div className="modal-drag-indicator" />

        {/* Modal Header */}
        <div className="profile-modal-header">
          <div className="profile-header-user">
            <div className="profile-header-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={displayName} className="profile-avatar-img" />
              ) : (
                <span className="profile-avatar-initials">{initials}</span>
              )}
              <span className="profile-status-dot" title="Active Student" />
            </div>
            <div className="profile-header-meta">
              <div className="profile-header-title-row">
                <h2 className="profile-user-name">{displayName}</h2>
                <span className={`profile-wing-pill ${isMinor ? 'school' : 'senior'}`}>
                  {isMinor ? 'School Wing' : 'Senior Wing'}
                </span>
              </div>
              {isMinor && (
                <div style={{ marginTop: '5px' }}>
                  <span className="profile-consent-pending-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Parent consent have to be done!
                  </span>
                </div>
              )}
              <p className="profile-user-email">{displayEmail}</p>
              {studentData?.mobileNumber && (
                <p className="profile-user-phone">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>{studentData.countryCode || '+91'} {studentData.mobileNumber}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            className="profile-modal-close-btn"
            onClick={onClose}
            aria-label="Close profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="profile-modal-body">
          {/* Quick Summary Highlights */}
          <div className="profile-highlight-cards">
            <div className="profile-highlight-item">
              <span className="highlight-label">Age & DOB</span>
              <span className="highlight-value">
                {studentData?.age ? `${studentData.age} yrs` : '—'}
                {studentData?.dateOfBirth && (
                  <span className="highlight-sub"> ({studentData.dateOfBirth})</span>
                )}
              </span>
            </div>

            <div className="profile-highlight-item">
              <span className="highlight-label">Location</span>
              <span className="highlight-value">
                {studentData?.city ? `${studentData.city}, ${studentData.district}` : 'Tamil Nadu, India'}
              </span>
            </div>

            <div className="profile-highlight-item">
              <span className="highlight-label">Medium of Study</span>
              <span className="highlight-value medium-badge">
                {studentData?.mediumOfStudy || 'English Medium'}
              </span>
            </div>

            <div className="profile-highlight-item">
              <span className="highlight-label">{isMinor ? 'Class' : 'Current CGPA'}</span>
              <span className="highlight-value highlight-accent">
                {isMinor
                  ? studentData?.currentYear || 'High School'
                  : studentData?.currentCgpa ? studentData.currentCgpa : 'Good Standing'}
              </span>
            </div>
          </div>

          {/* Senior Wing: 10th & 12th Schooling Details */}
          {!isMinor && (
            <div className="profile-section-card">
              <div className="profile-section-heading">
                <span className="section-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </span>
                <h3>10th & 12th Schooling Background</h3>
              </div>

              <div className="schooling-details-grid">
                <div className="schooling-box">
                  <div className="schooling-box-header">
                    <span className="school-std-badge">10th Standard</span>
                    {studentData?.tenthPercentage && (
                      <span className="school-pct-badge">{studentData.tenthPercentage}</span>
                    )}
                  </div>
                  <p className="school-name-text">
                    <strong>School:</strong> {studentData?.tenthSchoolName || 'Not specified'}
                  </p>
                  <p className="school-marks-text">
                    <strong>Score:</strong> {studentData?.tenthMarks || '—'}
                  </p>
                </div>

                <div className="schooling-box">
                  <div className="schooling-box-header">
                    <span className="school-std-badge twelfth">12th / Diploma</span>
                    {studentData?.twelfthPercentage && (
                      <span className="school-pct-badge">{studentData.twelfthPercentage}</span>
                    )}
                  </div>
                  <p className="school-name-text">
                    <strong>School:</strong> {studentData?.twelfthSchoolName || 'Not specified'}
                  </p>
                  <p className="school-marks-text">
                    <strong>Score:</strong> {studentData?.twelfthMarks || '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Academic / College Details */}
          <div className="profile-section-card">
            <div className="profile-section-heading">
              <span className="section-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </span>
              <h3>{isMinor ? 'School Details' : 'Higher Education Details'}</h3>
            </div>

            <div className="profile-info-grid">
              <div className="profile-info-row">
                <span className="info-label">{isMinor ? 'School Name' : 'College / University'}</span>
                <span className="info-val">{studentData?.institutionName || 'Not specified'}</span>
              </div>

              <div className="profile-info-row">
                <span className="info-label">{isMinor ? 'Board' : 'Degree'}</span>
                <span className="info-val">{studentData?.degree || 'State Board'}</span>
              </div>

              <div className="profile-info-row">
                <span className="info-label">{isMinor ? 'Standard & Group' : 'Branch / Specialization'}</span>
                <span className="info-val">
                  {studentData?.branch || (isMinor ? 'General' : 'Computer Science & Engineering')}
                </span>
              </div>

              <div className="profile-info-row">
                <span className="info-label">Year of Study</span>
                <span className="info-val">{studentData?.currentYear || 'Current'}</span>
              </div>
            </div>
          </div>

          {/* Minor Student Wing: Parent Consent Info */}
          {isMinor && (
            <div className="profile-section-card">
              <div className="profile-section-heading">
                <span className="section-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <h3>Parent / Guardian Consent</h3>
                <span className="consent-pending-tag" style={{ marginLeft: 'auto' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Parent consent have to be done!
                </span>
              </div>

              <div className="consent-upcoming-notice">
                Notice: Digital parent consent verification module is scheduled for upcoming development. Parent details recorded below.
              </div>

              {studentData?.parentConsent ? (
                <div className="profile-info-grid">
                  <div className="profile-info-row">
                    <span className="info-label">Guardian Name</span>
                    <span className="info-val">{studentData.parentConsent.parentName}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="info-label">Relationship</span>
                    <span className="info-val">{studentData.parentConsent.relationship}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="info-label">Contact Number</span>
                    <span className="info-val">{studentData.parentConsent.parentMobile}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="info-label">Status</span>
                    <span className="consent-pending-tag">Pending Digital Verification</span>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Parent details recorded. Verification module is in upcoming development.
                </p>
              )}
            </div>
          )}

          {/* Skills / Interests Section */}
          <div className="profile-section-card">
            <div className="profile-section-heading">
              <span className="section-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <h3>{isMinor ? 'Learning Interests & Activities' : 'Technical & Soft Skills'}</h3>
            </div>

            <div className="profile-tags-container">
              {isMinor ? (
                <>
                  {studentData?.learningInterests && studentData.learningInterests.length > 0 ? (
                    studentData.learningInterests.map((interest) => (
                      <span key={interest} className="profile-tag interest">
                        {interest}
                      </span>
                    ))
                  ) : (
                    <span className="profile-tag interest">Science Exploration</span>
                  )}
                  {studentData?.extracurricularActivities?.map((act) => (
                    <span key={act} className="profile-tag extra">
                      {act}
                    </span>
                  ))}
                </>
              ) : (
                <>
                  {studentData?.skills && studentData.skills.length > 0 ? (
                    studentData.skills.map((skill) => (
                      <span key={skill} className="profile-tag tech">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <>
                      <span className="profile-tag tech">Python</span>
                      <span className="profile-tag tech">Web Development</span>
                    </>
                  )}
                  {studentData?.softSkills?.map((ss) => (
                    <span key={ss} className="profile-tag soft">
                      {ss}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Professional Links (Senior Wing) */}
          {!isMinor && (studentData?.linkedinUrl || studentData?.resumeFileName) && (
            <div className="profile-section-card">
              <div className="profile-section-heading">
                <span className="section-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </span>
                <h3>Resume & Professional Links</h3>
              </div>

              <div className="profile-links-list">
                {studentData.linkedinUrl && (
                  <a
                    href={studentData.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-link-btn linkedin"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.62 1.62 0 0 0-1.62 1.62 1.62 1.62 0 0 0 1.62 1.62 1.62 1.62 0 0 0 1.62-1.62A1.62 1.62 0 0 0 7.83 6.3Z" />
                    </svg>
                    <span>View LinkedIn Profile</span>
                  </a>
                )}

                {studentData.resumeFileName && (
                  <div className="profile-resume-box">
                    <span className="resume-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </span>
                    <div className="resume-meta">
                      <span className="resume-name">{studentData.resumeFileName}</span>
                      <span className="resume-status">Attached document (max 100KB)</span>
                    </div>
                    {studentData.resumeUrl && (
                      <a
                        href={studentData.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="resume-view-link"
                      >
                        Preview
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="profile-modal-footer">
          <div style={{ display: 'flex', gap: '8px' }}>
            {onEditProfile && (
              <button
                type="button"
                className="profile-edit-btn"
                onClick={() => {
                  onClose()
                  onEditProfile()
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit Profile</span>
              </button>
            )}

            {onSignOut && (
              <button
                type="button"
                className="profile-edit-btn"
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => {
                  onClose()
                  onSignOut()
                }}
              >
                <span>Sign Out</span>
              </button>
            )}
          </div>

          <button type="button" className="profile-close-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
