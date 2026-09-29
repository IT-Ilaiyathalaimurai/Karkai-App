import React from 'react'
import type { MentorProfileData } from '../../lib/Mentors-details'
import karkaiLogoImg from '../../assets/Karkai_Logo.png'
import './MentorVerificationQueued.css'

export interface MentorVerificationQueuedProps {
  mentorData: MentorProfileData | null
  onProceedToDashboard: () => void
  onSignOut?: () => void
}

export const MentorVerificationQueued: React.FC<MentorVerificationQueuedProps> = ({
  mentorData,
  onProceedToDashboard,
  onSignOut,
}) => {
  return (
    <div className="mentor-queued-wrapper">
      <main className="mentor-queued-card">
        {/* Header Branding */}
        <header className="mentor-queued-header">
          <img src={karkaiLogoImg} alt="Karkai" className="mentor-queued-logo" />
          <div className="mentor-queued-status-pill">
            <span className="queued-pulse-dot" />
            <span>Verification Process Queued</span>
          </div>
          <h1 className="mentor-queued-title">Verification Request Submitted</h1>
          <p className="mentor-queued-subtitle">
            Your mentor credentials have been queued for administrative review.
          </p>
        </header>

        {/* Informational Hero Alert */}
        <div className="mentor-queued-info-box">
          <div className="mentor-queued-info-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="mentor-queued-info-text">
            <h3 className="queued-info-heading">What happens next?</h3>
            <p className="queued-info-desc">
              To safeguard learners and maintain educational excellence, the Karkai Admin Board reviews every mentor's Work ID Card, Resume, and LinkedIn profile.
            </p>
            <p className="queued-info-desc highlight">
              Once approved by the admin, your profile will be awarded the official <strong>blue verification badge</strong> automatically.
            </p>
          </div>
        </div>

        {/* Application Summary Card */}
        <div className="mentor-queued-summary-card">
          <h4 className="queued-summary-title">Submitted Application Details</h4>

          <div className="queued-summary-grid">
            <div className="queued-summary-item">
              <span className="queued-label">Full Name</span>
              <span className="queued-value">{mentorData?.fullName || 'Mentor'}</span>
            </div>

            <div className="queued-summary-item">
              <span className="queued-label">Professional Role</span>
              <span className="queued-value">{mentorData?.workingAs || 'Senior Engineer'}</span>
            </div>

            <div className="queued-summary-item">
              <span className="queued-label">Organization</span>
              <span className="queued-value">{mentorData?.workingIn || 'Tech Industry'}</span>
            </div>

            <div className="queued-summary-item">
              <span className="queued-label">Base Location</span>
              <span className="queued-value">
                {mentorData?.city ? `${mentorData.city}, ${mentorData.region}` : 'Tamil Nadu'}
              </span>
            </div>
          </div>

          <div className="queued-docs-review-list">
            <div className="queued-doc-item">
              <div className="queued-doc-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                <span>LinkedIn Profile URL</span>
              </div>
              <span className="queued-check-tag">Submitted</span>
            </div>

            <div className="queued-doc-item">
              <div className="queued-doc-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="11" r="2" />
                  <path d="M15 15h2M7 16h4" />
                </svg>
                <span>Work ID Card Attached</span>
              </div>
              <span className="queued-check-tag">Attached</span>
            </div>

            <div className="queued-doc-item">
              <div className="queued-doc-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>Resume / CV Document</span>
              </div>
              <span className="queued-check-tag">Attached</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mentor-queued-actions">
          <button
            type="button"
            className="mentor-queued-primary-btn"
            onClick={onProceedToDashboard}
            id="mentor-proceed-dashboard-btn"
          >
            <span>Proceed to Mentor Workspace</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {onSignOut && (
            <button
              type="button"
              className="mentor-queued-signout-btn"
              onClick={onSignOut}
              id="mentor-queued-signout-btn"
            >
              Sign Out
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

export default MentorVerificationQueued
