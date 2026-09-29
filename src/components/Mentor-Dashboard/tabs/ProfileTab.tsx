import React, { useState } from 'react'
import type { MentorProfileData } from '../../Mentors-Onboarding'
import type { UserProfile } from '../../SignIn-Screen'

export interface ProfileTabProps {
  mentorData: MentorProfileData | null
  user: UserProfile | null
  onEditProfile?: () => void
  onSignOut?: () => void
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  mentorData,
  user,
  onEditProfile,
  onSignOut,
}) => {
  const [isIdCardPreviewOpen, setIsIdCardPreviewOpen] = useState(false)
  const [isResumePreviewOpen, setIsResumePreviewOpen] = useState(false)
  const displayName = mentorData?.fullName || user?.name || 'Mentor'
  const displayEmail = user?.email || 'mentor@karkai.edu'
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'M'

  const isVerified = Boolean(mentorData?.isVerified)
  const isRejected = !isVerified && mentorData?.verificationStatus === 'rejected'
  const isPending = !isVerified && !isRejected
  const rejectionReason = mentorData?.rejectionReason

  return (
    <div className="mentor-profile-tab-content">
      {/* 1. Verification Alert: Rejected by Admin (Requires resubmission) */}
      {isRejected && (
        <section className="mentor-verification-rejection-card" id="mentor-verification-rejection-card">
          <div className="mentor-rejection-top">
            <div className="mentor-rejection-icon-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="mentor-rejection-header-text">
              <span className="mentor-rejection-badge">Action Required</span>
              <h3 className="mentor-rejection-title">Verification Request Rejected</h3>
              <p className="mentor-rejection-sub">
                The Karkai admin board reviewed your submitted credentials and requested updates before granting your verification badge.
              </p>
            </div>
          </div>

          <div className="mentor-rejection-reason-container">
            <div className="rejection-reason-tag">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Admin Rejection Reason</span>
            </div>
            <p className="rejection-reason-content">
              "{rejectionReason || 'Submitted credentials or documents could not be verified. Please re-upload clear credentials.'}"
            </p>
          </div>

          <div className="mentor-rejection-footer">
            <button
              type="button"
              className="mentor-give-verification-again-btn"
              onClick={onEditProfile}
              id="mentor-give-verification-again-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>Give Verification Again</span>
            </button>
            <span className="rejection-footer-hint">
              Review and update your ID card, resume, and profile details for re-approval.
            </span>
          </div>
        </section>
      )}

      {/* 2. Verification Alert: Process Queued */}
      {isPending && (
        <section className="mentor-verification-queued-banner" id="mentor-verification-queued-banner">
          <div className="mentor-queued-banner-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="mentor-queued-banner-text">
            <h4 className="queued-banner-heading">Verification Process Queued</h4>
            <p className="queued-banner-desc">
              Your credentials (Work ID card, resume, and LinkedIn profile) are queued for review by the admin team. Once approved, the official <strong>blue verification badge</strong> will appear alongside your name.
            </p>
          </div>
        </section>
      )}

      {/* Mentor Hero Card */}
      <section className="mentor-profile-hero-card">
        <div className="mentor-hero-avatar-row">
          <div className="mentor-hero-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={displayName} />
            ) : (
              <span>{initials}</span>
            )}
            <span className="mentor-online-badge" />
          </div>

          <div className="mentor-hero-meta">
            <div className="mentor-hero-name-row">
              <h2 className="mentor-hero-name">
                <span>{displayName}</span>
                {isVerified && (
                  <span className="mentor-blue-check-badge" title="Verified Mentor - Official Blue Badge Active">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="11" fill="#2563EB" />
                      <polyline points="7.5 12 10.5 15 16.5 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </h2>

              {isVerified ? (
                <span className="mentor-verified-pill verified">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Verified Mentor</span>
                </span>
              ) : isRejected ? (
                <span className="mentor-verified-pill rejected">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>Verification Rejected</span>
                </span>
              ) : (
                <span className="mentor-verified-pill queued">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Verification Queued</span>
                </span>
              )}
            </div>

            <p className="mentor-hero-role">
              {mentorData?.workingAs || 'Senior Technical Mentor'}
            </p>
            <p className="mentor-hero-company">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span>{mentorData?.workingIn || 'Karkai Global Network'}</span>
            </p>
            <p className="mentor-hero-location">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>
                {mentorData?.city ? `${mentorData.city}, ${mentorData.region}` : 'Tamil Nadu, India'}
              </span>
            </p>
          </div>
        </div>

        <div className="mentor-profile-quick-actions">
          {onEditProfile && (
            <button
              type="button"
              className="mentor-action-btn edit"
              onClick={onEditProfile}
              id="mentor-profile-edit-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit Profile</span>
            </button>
          )}

          {onSignOut && (
            <button
              type="button"
              className="mentor-action-btn signout"
              onClick={onSignOut}
              id="mentor-profile-signout-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </section>

      {/* Contact Details Card */}
      <section className="mentor-section-card">
        <h3 className="mentor-section-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>Contact & Communication</span>
        </h3>

        <div className="mentor-info-grid">
          <div className="mentor-info-item">
            <span className="mentor-info-label">Email Address</span>
            <span className="mentor-info-value">{displayEmail}</span>
          </div>

          <div className="mentor-info-item">
            <span className="mentor-info-label">Phone Number</span>
            <span className="mentor-info-value">
              {mentorData?.phoneNumber
                ? `${mentorData.countryCode || '+91'} ${mentorData.phoneNumber}`
                : 'Not provided'}
            </span>
          </div>

          <div className="mentor-info-item">
            <span className="mentor-info-label">Current Role</span>
            <span className="mentor-info-value">{mentorData?.workingAs || 'Senior Software Engineer'}</span>
          </div>

          <div className="mentor-info-item">
            <span className="mentor-info-label">Organization</span>
            <span className="mentor-info-value">{mentorData?.workingIn || 'Karkai Labs'}</span>
          </div>
        </div>
      </section>

      {/* Professional Bio */}
      <section className="mentor-section-card">
        <h3 className="mentor-section-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Professional Bio & Philosophy</span>
        </h3>
        <p className="mentor-bio-text">
          {mentorData?.bio ||
            'Experienced technical leader committed to providing hands-on mentorship, code guidance, and career pathways for next-generation learners.'}
        </p>
      </section>

      {/* Technical Domain Skills */}
      <section className="mentor-section-card">
        <div className="mentor-section-header-row">
          <h3 className="mentor-section-heading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>Technical & Domain Skills</span>
          </h3>
          <span className="mentor-count-badge">
            {mentorData?.technicalSkills?.length || 0} skills
          </span>
        </div>

        <div className="mentor-tags-cloud">
          {mentorData?.technicalSkills && mentorData.technicalSkills.length > 0 ? (
            mentorData.technicalSkills.map((sk) => (
              <span key={sk} className="mentor-pill-chip tech">
                {sk}
              </span>
            ))
          ) : (
            <span className="mentor-empty-notice">No technical skills recorded yet.</span>
          )}
        </div>
      </section>

      {/* Soft Skills & Mentorship Strengths */}
      <section className="mentor-section-card">
        <div className="mentor-section-header-row">
          <h3 className="mentor-section-heading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Soft Skills & Mentorship Strengths</span>
          </h3>
          <span className="mentor-count-badge soft">
            {mentorData?.softSkills?.length || 0} strengths
          </span>
        </div>

        <div className="mentor-tags-cloud">
          {mentorData?.softSkills && mentorData.softSkills.length > 0 ? (
            mentorData.softSkills.map((ssk) => (
              <span key={ssk} className="mentor-pill-chip soft">
                {ssk}
              </span>
            ))
          ) : (
            <span className="mentor-empty-notice">No soft skills recorded yet.</span>
          )}
        </div>
      </section>

      {/* Verified Credentials & Documents */}
      <section className="mentor-section-card">
        <h3 className="mentor-section-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Verification & Documents</span>
        </h3>

        <div className="mentor-docs-list">
          {/* LinkedIn Profile */}
          <div className="mentor-doc-row">
            <div className="mentor-doc-left">
              <div className="mentor-doc-icon linkedin">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.62 1.62 0 0 0-1.62 1.62 1.62 1.62 0 0 0 1.62 1.62 1.62 1.62 0 0 0 1.62-1.62A1.62 1.62 0 0 0 7.83 6.3Z" />
                </svg>
              </div>
              <div className="mentor-doc-info">
                <p className="mentor-doc-name">LinkedIn Profile</p>
                <p className="mentor-doc-status verified">Connected & Verified</p>
              </div>
            </div>

            {mentorData?.linkedinUrl ? (
              <a
                href={mentorData.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mentor-doc-link-btn"
              >
                <span>View Profile</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            ) : (
              <span className="mentor-doc-empty">Pending</span>
            )}
          </div>

          {/* Work ID Card */}
          <div className="mentor-doc-row">
            <div className="mentor-doc-left">
              <div className="mentor-doc-icon idcard">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <line x1="8" y1="2" x2="8" y2="4" />
                  <line x1="16" y1="2" x2="16" y2="4" />
                  <circle cx="9" cy="11" r="2" />
                  <path d="M15 15h2M7 16h4" />
                </svg>
              </div>
              <div className="mentor-doc-info">
                <p className="mentor-doc-name">Work ID / Official Credential</p>
                <p className="mentor-doc-status">
                  {mentorData?.idCardFileName || (mentorData?.idCardPhotoUrl ? 'Official ID Card Attached' : 'Not Uploaded')}
                </p>
              </div>
            </div>

            <div className="mentor-doc-actions">
              {isVerified ? (
                <span className="mentor-verified-check-pill approved">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Verified</span>
                </span>
              ) : isRejected ? (
                <span className="mentor-verified-check-pill rejected">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>Rejected</span>
                </span>
              ) : (
                <span className="mentor-verified-check-pill queued">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>In Review</span>
                </span>
              )}

              {mentorData?.idCardPhotoUrl && (
                <button
                  type="button"
                  className="mentor-doc-preview-btn"
                  onClick={() => setIsIdCardPreviewOpen(true)}
                  id="mentor-preview-idcard-btn"
                  title="Preview uploaded ID Card"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>Preview ID</span>
                </button>
              )}
            </div>
          </div>

          {/* Resume / CV */}
          <div className="mentor-doc-row">
            <div className="mentor-doc-left">
              <div className="mentor-doc-icon resume">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="mentor-doc-info">
                <p className="mentor-doc-name">Curriculum Vitae / Resume</p>
                <p className="mentor-doc-status">
                  {mentorData?.resumeFileName || (mentorData?.resumeUrl ? 'Resume Attached' : 'Not Uploaded')}
                  {mentorData?.resumeFileSize ? ` • ${mentorData.resumeFileSize}` : ''}
                </p>
              </div>
            </div>

            <div className="mentor-doc-actions">
              {isVerified ? (
                <span className="mentor-verified-check-pill approved">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Verified</span>
                </span>
              ) : isRejected ? (
                <span className="mentor-verified-check-pill rejected">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>Rejected</span>
                </span>
              ) : (
                <span className="mentor-verified-check-pill queued">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>In Review</span>
                </span>
              )}

              {mentorData?.resumeUrl && (
                <button
                  type="button"
                  className="mentor-doc-preview-btn"
                  onClick={() => setIsResumePreviewOpen(true)}
                  id="mentor-preview-resume-btn"
                  title="Preview uploaded Resume"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>Preview CV</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          WORK ID CARD PREVIEW MODAL
          ========================================================================= */}
      {isIdCardPreviewOpen && mentorData?.idCardPhotoUrl && (
        <div
          className="mentor-doc-modal-backdrop"
          onClick={() => setIsIdCardPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="mentor-doc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mentor-doc-modal-header">
              <div className="modal-header-meta">
                <span className="modal-doc-pill idcard">Work ID Credential</span>
                <h3 className="modal-doc-title">{mentorData.idCardFileName || 'Work Identification Card'}</h3>
                <p className="modal-doc-sub">Uploaded by {displayName} &bull; {mentorData.workingIn || 'Organization'}</p>
              </div>
              <button
                type="button"
                className="mentor-doc-modal-close"
                onClick={() => setIsIdCardPreviewOpen(false)}
                aria-label="Close Preview"
              >
                &times;
              </button>
            </div>

            <div className="mentor-doc-modal-body image">
              <img
                src={mentorData.idCardPhotoUrl}
                alt={mentorData.idCardFileName || 'Work Identification Card'}
                className="mentor-doc-full-img"
              />
            </div>

            <div className="mentor-doc-modal-footer">
              <a
                href={mentorData.idCardPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mentor-modal-action-btn secondary"
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
                className="mentor-modal-action-btn primary"
                onClick={() => setIsIdCardPreviewOpen(false)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESUME / CV DOCUMENT PREVIEW MODAL
          ========================================================================= */}
      {isResumePreviewOpen && mentorData?.resumeUrl && (
        <div
          className="mentor-doc-modal-backdrop"
          onClick={() => setIsResumePreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="mentor-doc-modal-card resume" onClick={(e) => e.stopPropagation()}>
            <div className="mentor-doc-modal-header">
              <div className="modal-header-meta">
                <span className="modal-doc-pill resume">Curriculum Vitae</span>
                <h3 className="modal-doc-title">{mentorData.resumeFileName || 'Resume / CV'}</h3>
                <p className="modal-doc-sub">
                  {mentorData.resumeFileSize ? `${mentorData.resumeFileSize} &bull; ` : ''}
                  Professional Experience & Credentials
                </p>
              </div>
              <button
                type="button"
                className="mentor-doc-modal-close"
                onClick={() => setIsResumePreviewOpen(false)}
                aria-label="Close Preview"
              >
                &times;
              </button>
            </div>

            <div className="mentor-doc-modal-body resume">
              <iframe
                src={mentorData.resumeUrl}
                title="Resume Document Preview"
                className="mentor-doc-resume-frame"
              />
            </div>

            <div className="mentor-doc-modal-footer">
              <a
                href={mentorData.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mentor-modal-action-btn secondary"
                download={mentorData.resumeFileName || 'mentor-resume.pdf'}
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
                className="mentor-modal-action-btn primary"
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
