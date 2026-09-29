import React, { useState } from 'react'
import type { StudentProfileData } from '../../Students-Onboarding'
import type { UserProfile } from '../../SignIn-Screen'

export interface ProfileTabProps {
  studentData: StudentProfileData | null
  user: UserProfile | null
  onEditProfile?: () => void
  onSignOut?: () => void
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  studentData,
  user,
  onEditProfile,
  onSignOut,
}) => {
  const [isIdCardPreviewOpen, setIsIdCardPreviewOpen] = useState(false)
  const [isResumePreviewOpen, setIsResumePreviewOpen] = useState(false)

  const isMinor = studentData?.isMinor ?? (studentData?.age ? studentData.age < 18 : false)
  const displayName = studentData?.fullName || user?.name || 'Student'
  const displayEmail = user?.email || 'student@karkai.edu'
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'S'

  const locationText = studentData?.city
    ? `${studentData.city}${studentData.district ? `, ${studentData.district}` : ''}`
    : 'Tamil Nadu, India'

  return (
    <div className="student-profile-tab-content" id="student-profile-tab-content">
      {/* 1. Minor Wing Consent Banner if Age < 18 */}
      {isMinor && (
        <section className="student-consent-alert-banner" id="student-consent-alert-banner">
          <div className="student-consent-banner-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="student-consent-banner-text">
            <div className="student-consent-title-row">
              <span className="student-consent-badge">Action Pending</span>
              <h4 className="student-consent-heading">Parent Consent Have To Be Done!</h4>
            </div>
            <p className="student-consent-desc">
              As a school wing learner under 18, parental or guardian consent is mandatory under safety guidelines. Digital guardian verification module is scheduled for upcoming rollout.
            </p>
          </div>
        </section>
      )}

      {/* 2. Student Hero Card */}
      <section className="student-profile-hero-card">
        <div className="student-hero-avatar-row">
          <div className="student-hero-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={displayName} />
            ) : (
              <span>{initials}</span>
            )}
            <span className="student-online-badge" />
          </div>

          <div className="student-hero-meta">
            <div className="student-hero-name-row">
              <h2 className="student-hero-name">{displayName}</h2>
              <span className={`student-wing-badge ${isMinor ? 'school' : 'senior'}`}>
                {isMinor ? 'School Wing' : 'Senior Wing'}
              </span>
            </div>

            <p className="student-hero-role">
              {isMinor
                ? `${studentData?.currentYear || 'High School Student'} • ${studentData?.mediumOfStudy || 'English Medium'}`
                : `${studentData?.degree || 'Undergraduate'} • ${studentData?.branch || 'Engineering'}`}
            </p>

            <p className="student-hero-institution">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              <span>{studentData?.institutionName || 'Karkai Learning Network'}</span>
            </p>

            <p className="student-hero-location">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{locationText}</span>
            </p>
          </div>
        </div>

        {/* Quick Actions (Edit Profile & Sign Out) */}
        <div className="student-profile-quick-actions">
          {onEditProfile && (
            <button
              type="button"
              className="student-action-btn edit"
              onClick={onEditProfile}
              id="student-profile-edit-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit Profile</span>
            </button>
          )}

          {onSignOut && (
            <button
              type="button"
              className="student-action-btn signout"
              onClick={onSignOut}
              id="student-profile-signout-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </section>

      {/* 3. Quick Highlight Summary Chips */}
      <section className="student-profile-highlights">
        <div className="student-highlight-box">
          <span className="highlight-box-label">Age & DOB</span>
          <span className="highlight-box-val">
            {studentData?.age ? `${studentData.age} yrs` : '—'}
            {studentData?.dateOfBirth && (
              <span className="highlight-sub"> ({studentData.dateOfBirth})</span>
            )}
          </span>
        </div>

        <div className="student-highlight-box">
          <span className="highlight-box-label">Location</span>
          <span className="highlight-box-val">{studentData?.city || 'Tamil Nadu'}</span>
        </div>

        <div className="student-highlight-box">
          <span className="highlight-box-label">Medium</span>
          <span className="highlight-box-val medium">
            {studentData?.mediumOfStudy || 'English Medium'}
          </span>
        </div>

        <div className="student-highlight-box">
          <span className="highlight-box-label">{isMinor ? 'Standard' : 'CGPA'}</span>
          <span className="highlight-box-val accent">
            {isMinor
              ? studentData?.currentYear || 'High School'
              : studentData?.currentCgpa ? `${studentData.currentCgpa} CGPA` : 'Active'}
          </span>
        </div>
      </section>

      {/* 4. Personal & Contact Information Card */}
      <section className="student-section-card">
        <h3 className="student-section-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>Personal & Contact Information</span>
        </h3>

        <div className="student-info-grid">
          <div className="student-info-item">
            <span className="student-info-label">Email Address</span>
            <span className="student-info-value">{displayEmail}</span>
          </div>

          <div className="student-info-item">
            <span className="student-info-label">Phone Number</span>
            <span className="student-info-value">
              {studentData?.mobileNumber
                ? `${studentData.countryCode || '+91'} ${studentData.mobileNumber}`
                : 'Not provided'}
            </span>
          </div>

          <div className="student-info-item">
            <span className="student-info-label">Gender</span>
            <span className="student-info-value">{studentData?.gender || 'Not specified'}</span>
          </div>

          <div className="student-info-item">
            <span className="student-info-label">Medium of Study</span>
            <span className="student-info-value">{studentData?.mediumOfStudy || 'English Medium'}</span>
          </div>

          <div className="student-info-item">
            <span className="student-info-label">City / Town</span>
            <span className="student-info-value">{studentData?.city || 'Not specified'}</span>
          </div>

          <div className="student-info-item">
            <span className="student-info-label">District & State</span>
            <span className="student-info-value">
              {studentData?.district ? `${studentData.district}, Tamil Nadu` : 'Tamil Nadu, India'}
            </span>
          </div>
        </div>
      </section>

      {/* 5. Academic Details Card */}
      <section className="student-section-card">
        <h3 className="student-section-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          <span>{isMinor ? 'School Details' : 'Higher Education Details'}</span>
        </h3>

        <div className="student-info-grid">
          <div className="student-info-item">
            <span className="student-info-label">{isMinor ? 'School Name' : 'College / University'}</span>
            <span className="student-info-value">{studentData?.institutionName || 'Not specified'}</span>
          </div>

          <div className="student-info-item">
            <span className="student-info-label">{isMinor ? 'Board' : 'Degree'}</span>
            <span className="student-info-value">{studentData?.degree || (isMinor ? 'State Board' : 'B.E / B.Tech')}</span>
          </div>

          <div className="student-info-item">
            <span className="student-info-label">{isMinor ? 'Standard & Group' : 'Branch / Specialization'}</span>
            <span className="student-info-value">
              {studentData?.branch || (isMinor ? 'General Studies' : 'Computer Science')}
            </span>
          </div>

          <div className="student-info-item">
            <span className="student-info-label">Current Year</span>
            <span className="student-info-value">{studentData?.currentYear || 'Current'}</span>
          </div>

          {!isMinor && (
            <div className="student-info-item">
              <span className="student-info-label">Current CGPA</span>
              <span className="student-info-value highlight">
                {studentData?.currentCgpa ? `${studentData.currentCgpa} / 10.0` : 'Good Standing'}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 6. Senior Wing: 10th & 12th Schooling Background */}
      {!isMinor && (studentData?.tenthSchoolName || studentData?.twelfthSchoolName || studentData?.tenthMarks) && (
        <section className="student-section-card">
          <h3 className="student-section-heading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>10th & 12th Schooling Background</span>
          </h3>

          <div className="student-schooling-grid">
            <div className="student-schooling-card">
              <div className="student-schooling-head">
                <span className="student-school-tag tenth">10th Standard</span>
                {studentData?.tenthPercentage && (
                  <span className="student-school-score-tag">{studentData.tenthPercentage}</span>
                )}
              </div>
              <p className="student-school-detail">
                <strong>School:</strong> {studentData?.tenthSchoolName || 'Not specified'}
              </p>
              <p className="student-school-detail">
                <strong>Score:</strong> {studentData?.tenthMarks || '—'}
              </p>
            </div>

            <div className="student-schooling-card">
              <div className="student-schooling-head">
                <span className="student-school-tag twelfth">12th / Diploma</span>
                {studentData?.twelfthPercentage && (
                  <span className="student-school-score-tag">{studentData.twelfthPercentage}</span>
                )}
              </div>
              <p className="student-school-detail">
                <strong>School:</strong> {studentData?.twelfthSchoolName || 'Not specified'}
              </p>
              <p className="student-school-detail">
                <strong>Score:</strong> {studentData?.twelfthMarks || '—'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 7. School Wing (Minor): Parent / Guardian Consent Details */}
      {isMinor && (
        <section className="student-section-card">
          <div className="student-section-header-row">
            <h3 className="student-section-heading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Parent / Guardian Consent</span>
            </h3>
            <span className="student-consent-pending-pill">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Consent Pending
            </span>
          </div>

          <div className="student-consent-notice-box">
            Notice: Digital parent consent verification module is scheduled for upcoming development. Guardian details recorded below for safety compliance.
          </div>

          {studentData?.parentConsent ? (
            <div className="student-info-grid">
              <div className="student-info-item">
                <span className="student-info-label">Guardian Name</span>
                <span className="student-info-value">{studentData.parentConsent.parentName}</span>
              </div>

              <div className="student-info-item">
                <span className="student-info-label">Relationship</span>
                <span className="student-info-value">{studentData.parentConsent.relationship}</span>
              </div>

              <div className="student-info-item">
                <span className="student-info-label">Contact Number</span>
                <span className="student-info-value">{studentData.parentConsent.parentMobile}</span>
              </div>

              <div className="student-info-item">
                <span className="student-info-label">Verification Status</span>
                <span className="student-info-value warning">Pending Digital Flow</span>
              </div>
            </div>
          ) : (
            <p className="student-empty-desc">
              Parent contact recorded during registration. Verification module is in upcoming rollout.
            </p>
          )}
        </section>
      )}

      {/* 8. Skills & Learning Interests Card */}
      <section className="student-section-card">
        <div className="student-section-header-row">
          <h3 className="student-section-heading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{isMinor ? 'Learning Interests & Activities' : 'Technical & Soft Skills'}</span>
          </h3>
          <span className="student-count-badge">
            {isMinor
              ? (studentData?.learningInterests?.length || 0) + (studentData?.extracurricularActivities?.length || 0)
              : (studentData?.skills?.length || 0) + (studentData?.softSkills?.length || 0)}{' '}
            items
          </span>
        </div>

        <div className="student-tags-cloud">
          {isMinor ? (
            <>
              {studentData?.learningInterests && studentData.learningInterests.length > 0 ? (
                studentData.learningInterests.map((interest) => (
                  <span key={interest} className="student-pill-chip interest">
                    {interest}
                  </span>
                ))
              ) : (
                <span className="student-pill-chip interest">Science & Coding</span>
              )}
              {studentData?.extracurricularActivities?.map((act) => (
                <span key={act} className="student-pill-chip extra">
                  {act}
                </span>
              ))}
            </>
          ) : (
            <>
              {studentData?.skills && studentData.skills.length > 0 ? (
                studentData.skills.map((skill) => (
                  <span key={skill} className="student-pill-chip tech">
                    {skill}
                  </span>
                ))
              ) : (
                <>
                  <span className="student-pill-chip tech">Python</span>
                  <span className="student-pill-chip tech">Web Development</span>
                </>
              )}
              {studentData?.softSkills?.map((ss) => (
                <span key={ss} className="student-pill-chip soft">
                  {ss}
                </span>
              ))}
            </>
          )}
        </div>
      </section>

      {/* 9. Documents & Identification Card */}
      <section className="student-section-card">
        <h3 className="student-section-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Credentials & Documents</span>
        </h3>

        <div className="student-docs-list">
          {/* Student ID Card */}
          <div className="student-doc-row">
            <div className="student-doc-left">
              <div className="student-doc-icon idcard">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <line x1="8" y1="2" x2="8" y2="4" />
                  <line x1="16" y1="2" x2="16" y2="4" />
                  <circle cx="9" cy="11" r="2" />
                  <path d="M15 15h2M7 16h4" />
                </svg>
              </div>
              <div className="student-doc-info">
                <p className="student-doc-name">
                  {isMinor ? 'School Student ID / Bonafide' : 'College ID Card / Enrollment Proof'}
                </p>
                <p className="student-doc-status">
                  {studentData?.idCardFileName || (studentData?.idCardPhotoUrl ? 'Student ID Attached' : 'Attached during onboarding')}
                </p>
              </div>
            </div>

            <div className="student-doc-actions">
              <span className="student-doc-badge uploaded">Attached</span>
              {studentData?.idCardPhotoUrl && (
                <button
                  type="button"
                  className="student-doc-preview-btn"
                  onClick={() => setIsIdCardPreviewOpen(true)}
                  id="student-preview-idcard-btn"
                  title="Preview uploaded ID Card"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>Preview</span>
                </button>
              )}
            </div>
          </div>

          {/* LinkedIn Profile (Senior Wing) */}
          {!isMinor && (
            <div className="student-doc-row">
              <div className="student-doc-left">
                <div className="student-doc-icon linkedin">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.62 1.62 0 0 0-1.62 1.62 1.62 1.62 0 0 0 1.62 1.62 1.62 1.62 0 0 0 1.62-1.62A1.62 1.62 0 0 0 7.83 6.3Z" />
                  </svg>
                </div>
                <div className="student-doc-info">
                  <p className="student-doc-name">LinkedIn Profile</p>
                  <p className="student-doc-status">
                    {studentData?.linkedinUrl ? 'Connected profile' : 'Not added yet'}
                  </p>
                </div>
              </div>

              {studentData?.linkedinUrl ? (
                <a
                  href={studentData.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="student-doc-link-btn"
                  id="student-view-linkedin-btn"
                >
                  <span>View Profile</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              ) : (
                <span className="student-doc-empty">Optional</span>
              )}
            </div>
          )}

          {/* Resume / CV (Senior Wing) */}
          {!isMinor && (studentData?.resumeFileName || studentData?.resumeUrl) && (
            <div className="student-doc-row">
              <div className="student-doc-left">
                <div className="student-doc-icon resume">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="student-doc-info">
                  <p className="student-doc-name">Curriculum Vitae / Resume</p>
                  <p className="student-doc-status">
                    {studentData.resumeFileName || 'Resume Attached'}
                  </p>
                </div>
              </div>

              <div className="student-doc-actions">
                <span className="student-doc-badge uploaded">Attached</span>
                {studentData.resumeUrl && (
                  <button
                    type="button"
                    className="student-doc-preview-btn primary"
                    onClick={() => setIsResumePreviewOpen(true)}
                    id="student-preview-resume-btn"
                    title="Preview uploaded Resume"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>Preview CV</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          ID CARD PREVIEW LIGHTBOX MODAL
          ========================================================================= */}
      {isIdCardPreviewOpen && studentData?.idCardPhotoUrl && (
        <div
          className="student-doc-modal-backdrop"
          onClick={() => setIsIdCardPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="student-doc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="student-doc-modal-header">
              <div className="student-modal-header-meta">
                <span className="student-modal-doc-pill idcard">
                  {isMinor ? 'School ID Proof' : 'Student Credential'}
                </span>
                <h3 className="student-modal-doc-title">
                  {studentData.idCardFileName || 'Student Identification Document'}
                </h3>
                <p className="student-modal-doc-sub">
                  Uploaded by {displayName} &bull; {studentData.institutionName || 'Institution'}
                </p>
              </div>
              <button
                type="button"
                className="student-doc-modal-close"
                onClick={() => setIsIdCardPreviewOpen(false)}
                aria-label="Close Preview"
              >
                &times;
              </button>
            </div>

            <div className="student-doc-modal-body image">
              <img
                src={studentData.idCardPhotoUrl}
                alt={studentData.idCardFileName || 'Student ID Document'}
                className="student-doc-full-img"
              />
            </div>

            <div className="student-doc-modal-footer">
              <a
                href={studentData.idCardPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="student-modal-action-btn secondary"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>Open Full Image</span>
              </a>
              <button
                type="button"
                className="student-modal-action-btn primary"
                onClick={() => setIsIdCardPreviewOpen(false)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESUME / CV PREVIEW MODAL
          ========================================================================= */}
      {isResumePreviewOpen && studentData?.resumeUrl && (
        <div
          className="student-doc-modal-backdrop"
          onClick={() => setIsResumePreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="student-doc-modal-card resume" onClick={(e) => e.stopPropagation()}>
            <div className="student-doc-modal-header">
              <div className="student-modal-header-meta">
                <span className="student-modal-doc-pill resume">Curriculum Vitae</span>
                <h3 className="student-modal-doc-title">
                  {studentData.resumeFileName || 'Resume / CV Document'}
                </h3>
                <p className="student-modal-doc-sub">
                  Academic & Technical Qualifications &bull; {displayName}
                </p>
              </div>
              <button
                type="button"
                className="student-doc-modal-close"
                onClick={() => setIsResumePreviewOpen(false)}
                aria-label="Close Preview"
              >
                &times;
              </button>
            </div>

            <div className="student-doc-modal-body resume">
              <iframe
                src={studentData.resumeUrl}
                title="Student Resume Document Preview"
                className="student-doc-resume-frame"
              />
            </div>

            <div className="student-doc-modal-footer">
              <a
                href={studentData.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="student-modal-action-btn secondary"
                download={studentData.resumeFileName || 'student-resume.pdf'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download / View in New Tab</span>
              </a>
              <button
                type="button"
                className="student-modal-action-btn primary"
                onClick={() => setIsResumePreviewOpen(false)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileTab
