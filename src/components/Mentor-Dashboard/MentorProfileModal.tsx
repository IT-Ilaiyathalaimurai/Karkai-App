import React from 'react'
import type { MentorProfileData } from '../Mentors-Onboarding'
import type { UserProfile } from '../SignIn-Screen'

export interface MentorProfileModalProps {
  isOpen: boolean
  onClose: () => void
  mentorData: MentorProfileData | null
  user: UserProfile | null
  onEditProfile?: () => void
  onSignOut?: () => void
}

export const MentorProfileModal: React.FC<MentorProfileModalProps> = ({
  isOpen,
  onClose,
  mentorData,
  user,
  onEditProfile,
  onSignOut,
}) => {
  if (!isOpen) return null

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
              <span className="profile-status-dot" title="Active Mentor" />
            </div>

            <div className="profile-header-meta">
              <div className="profile-header-title-row">
                <h2 className="profile-user-name">
                  <span>{displayName}</span>
                  {isVerified && (
                    <span className="mentor-blue-check-badge" title="Verified Mentor - Official Blue Badge Active">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="11" fill="#2563EB" />
                        <polyline points="7.5 12 10.5 15 16.5 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </h2>

                {isVerified ? (
                  <span className="mentor-verified-pill modal verified">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Verified Mentor</span>
                  </span>
                ) : isRejected ? (
                  <span className="mentor-verified-pill modal rejected">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span>Rejected</span>
                  </span>
                ) : (
                  <span className="mentor-verified-pill modal queued">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Queued</span>
                  </span>
                )}
              </div>

              <p className="mentor-modal-designation">
                {mentorData?.workingAs || 'Senior Technical Mentor'}
                {mentorData?.workingIn ? ` • ${mentorData.workingIn}` : ''}
              </p>

              <p className="profile-user-email">{displayEmail}</p>

              {mentorData?.phoneNumber && (
                <p className="profile-user-phone">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>
                    {mentorData.countryCode || '+91'} {mentorData.phoneNumber}
                  </span>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="profile-modal-body">
          {/* If rejected by admin, display reason notice right in modal */}
          {isRejected && (
            <div className="profile-modal-rejection-banner">
              <div className="modal-rejection-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Admin Rejection Reason:</span>
              </div>
              <p className="modal-rejection-text">
                "{mentorData?.rejectionReason || 'Submitted credentials could not be verified. Please give verification again.'}"
              </p>
            </div>
          )}

          {/* Quick Highlight Cards */}
          <div className="profile-highlight-cards">
            <div className="profile-highlight-item">
              <span className="highlight-value">{mentorData?.technicalSkills?.length || 0}</span>
              <span className="highlight-label">Tech Domains</span>
            </div>

            <div className="profile-highlight-item">
              <span className="highlight-value">{mentorData?.softSkills?.length || 0}</span>
              <span className="highlight-label">Strengths</span>
            </div>

            <div className="profile-highlight-item">
              <span className="highlight-value">
                {isVerified ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#2563EB" />
                    <polyline points="8 12 11 15 16 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isRejected ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
              </span>
              <span className="highlight-label">
                {isVerified ? 'Verified' : isRejected ? 'Rejected' : 'Queued'}
              </span>
            </div>
          </div>

          {/* Location */}
          <div className="profile-modal-card">
            <h4 className="profile-card-title">Location & Base</h4>
            <p className="profile-card-text">
              {mentorData?.city ? `${mentorData.city}, ${mentorData.region}` : 'Tamil Nadu, India'}
            </p>
          </div>

          {/* Professional Bio */}
          <div className="profile-modal-card">
            <h4 className="profile-card-title">Guidance Philosophy</h4>
            <p className="profile-card-text">
              {mentorData?.bio ||
                'Guiding next-generation engineers with code architecture, problem-solving, and career pathways.'}
            </p>
          </div>

          {/* Technical Skills */}
          {mentorData?.technicalSkills && mentorData.technicalSkills.length > 0 && (
            <div className="profile-modal-card">
              <h4 className="profile-card-title">Technical Domains</h4>
              <div className="mentor-tags-cloud">
                {mentorData.technicalSkills.map((sk) => (
                  <span key={sk} className="mentor-pill-chip tech">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="profile-modal-actions-row">
            {onEditProfile && (
              <button
                type="button"
                className="profile-modal-btn edit"
                onClick={() => {
                  onClose()
                  onEditProfile()
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit Profile</span>
              </button>
            )}

            {onSignOut && (
              <button
                type="button"
                className="profile-modal-btn signout"
                onClick={() => {
                  onClose()
                  onSignOut()
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MentorProfileModal
