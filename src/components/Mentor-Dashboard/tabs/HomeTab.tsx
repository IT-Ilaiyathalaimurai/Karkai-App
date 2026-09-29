import React from 'react'
import type { MentorProfileData } from '../../../lib/Mentors-details'

export interface HomeTabProps {
  mentorData?: MentorProfileData | null
  onGiveVerificationAgain?: () => void
  onViewProfile?: () => void
}

export const HomeTab: React.FC<HomeTabProps> = ({
  mentorData,
  onGiveVerificationAgain,
  onViewProfile,
}) => {
  const isVerified = Boolean(mentorData?.isVerified)
  const isRejected = !isVerified && mentorData?.verificationStatus === 'rejected'
  const isPending = !isVerified && !isRejected

  return (
    <div className="mentor-home-tab-wrapper">
      {/* Rejection Alert Banner if admin rejected */}
      {isRejected && (
        <div className="home-verification-banner rejected">
          <div className="home-banner-icon rejected">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="home-banner-content">
            <h4 className="home-banner-title">Verification Rejected by Admin</h4>
            <p className="home-banner-desc">
              Reason: <em>"{mentorData?.rejectionReason || 'Uploaded documents could not be verified.'}"</em>
            </p>
            {onGiveVerificationAgain && (
              <button
                type="button"
                className="home-reverify-btn"
                onClick={onGiveVerificationAgain}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span>Give Verification Again</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Queued Notice Banner */}
      {isPending && (
        <div className="home-verification-banner queued">
          <div className="home-banner-icon queued">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="home-banner-content">
            <h4 className="home-banner-title">Verification Process Queued</h4>
            <p className="home-banner-desc">
              Your credentials (ID card, resume, and LinkedIn) have been submitted to the admin for review. Once verified, you will receive the official <strong>blue verification badge</strong> on your profile.
            </p>
            {onViewProfile && (
              <button
                type="button"
                className="home-reverify-btn"
                style={{ background: '#d97706' }}
                onClick={onViewProfile}
              >
                <span>Check Verification Status</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Verified Congratulatory Banner */}
      {isVerified && (
        <div className="home-verification-banner approved">
          <div className="home-banner-icon approved">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#2563EB" />
              <polyline points="8 12 11 15 16 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="home-banner-content">
            <h4 className="home-banner-title">Verified Mentor Badge Active</h4>
            <p className="home-banner-desc">
              Your credentials are authenticated. The official blue verification badge is displayed along with your name.
            </p>
            {onViewProfile && (
              <button
                type="button"
                className="home-reverify-btn"
                style={{ background: '#2563eb' }}
                onClick={onViewProfile}
              >
                <span>View Verified Profile</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="tab-single-line-center">
        <div className="tab-center-icon-box">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h2 className="tab-center-title">Mentor Workspace</h2>
        <p className="tab-center-line">Welcome to your Karkai mentor workspace. Guiding learners toward engineering and career excellence.</p>
      </div>
    </div>
  )
}

export default HomeTab

