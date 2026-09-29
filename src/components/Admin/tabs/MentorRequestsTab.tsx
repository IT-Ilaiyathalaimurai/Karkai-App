import React, { useState, useEffect } from 'react'
import {
  getAllMentors,
  updateMentorVerification,
  type MentorProfileData,
} from '../../../lib/Mentors-details'
import './MentorRequestsTab.css'

export const MentorRequestsTab: React.FC = () => {
  const [mentors, setMentors] = useState<MentorProfileData[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Lightbox modal for ID Card
  const [idCardModal, setIdCardModal] = useState<{ url: string; name: string; title: string } | null>(null)

  // Rejection modal
  const [rejectingMentor, setRejectingMentor] = useState<MentorProfileData | null>(null)
  const [rejectionReasonInput, setRejectionReasonInput] = useState('')
  const [rejectionError, setRejectionError] = useState<string | null>(null)

  // Feedback banner
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const loadMentors = async () => {
    setIsLoading(true)
    try {
      const data = await getAllMentors()
      setMentors(data)
    } catch (e) {
      console.warn('Error loading mentors for admin:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMentors()
  }, [])

  // Helper to determine status strictly based on backend is_verified & verificationStatus
  const getMentorStatus = (m: MentorProfileData): 'pending' | 'approved' | 'rejected' => {
    if (m.isVerified) return 'approved'
    if (m.verificationStatus === 'rejected') return 'rejected'
    return 'pending'
  }

  // Action: Approve (Rewrites is_verified to true in Mentor-details)
  const handleApprove = async (mentor: MentorProfileData) => {
    const identifier = mentor.id || mentor.userId || mentor.fullName
    await updateMentorVerification(identifier, true, 'approved', null)

    // Reload directly from backend table Mentor-details to ensure source of truth
    await loadMentors()

    setNoticeMessage(`Approved ${mentor.fullName}! is_verified rewritten to true in Mentor-details.`)
    setTimeout(() => setNoticeMessage(null), 4000)
  }

  // Action: Open Reject Modal
  const handleOpenRejectModal = (mentor: MentorProfileData) => {
    setRejectingMentor(mentor)
    setRejectionReasonInput('')
    setRejectionError(null)
  }

  // Action: Confirm Rejection with Reason (Rewrites is_verified to false in Mentor-details)
  const handleConfirmReject = async () => {
    if (!rejectingMentor) return
    const cleanReason = rejectionReasonInput.trim()

    if (!cleanReason) {
      setRejectionError('Please provide a reason so the mentor knows what to correct for re-verification.')
      return
    }

    const identifier = rejectingMentor.id || rejectingMentor.userId || rejectingMentor.fullName
    await updateMentorVerification(identifier, false, 'rejected', cleanReason)

    // Reload directly from backend table Mentor-details to ensure source of truth
    await loadMentors()

    const targetName = rejectingMentor.fullName
    setRejectingMentor(null)
    setNoticeMessage(`Mentor ${targetName} rejected. is_verified rewritten to false in Mentor-details with feedback reason.`)
    setTimeout(() => setNoticeMessage(null), 4000)
  }

  // Preset quick reasons
  const quickReasons = [
    'Work ID card image is blurry or unreadable.',
    'LinkedIn profile does not match specified current designation or company.',
    'Official identity credential appears expired or invalid.',
    'Resume missing detailed engineering project or career history.',
  ]

  // Filter & Search computation (Strictly based on is_verified)
  const filteredMentors = mentors.filter((m) => {
    const status = getMentorStatus(m)
    if (filter !== 'all' && status !== filter) return false

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const matchName = m.fullName.toLowerCase().includes(q)
      const matchRole = m.workingAs.toLowerCase().includes(q)
      const matchComp = m.workingIn.toLowerCase().includes(q)
      const matchCity = m.city.toLowerCase().includes(q)
      return matchName || matchRole || matchComp || matchCity
    }
    return true
  })

  const pendingCount = mentors.filter((m) => getMentorStatus(m) === 'pending').length
  const approvedCount = mentors.filter((m) => getMentorStatus(m) === 'approved').length
  const rejectedCount = mentors.filter((m) => getMentorStatus(m) === 'rejected').length

  return (
    <div className="mentor-requests-container">
      {/* Toast Notice */}
      {noticeMessage && (
        <div className="admin-toast-notice">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="mentor-requests-header">
        <div>
          <h2 className="requests-heading">Mentor Verification Requests</h2>
        </div>

        {/* Filter Pills */}
        <div className="requests-filter-bar">
          <button
            type="button"
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            <span>Pending Review</span>
            <span className="filter-count pending">{pendingCount}</span>
          </button>

          <button
            type="button"
            className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            <span>Approved</span>
            <span className="filter-count approved">{approvedCount}</span>
          </button>

          <button
            type="button"
            className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            <span>Rejected</span>
            <span className="filter-count rejected">{rejectedCount}</span>
          </button>

          <button
            type="button"
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span>All ({mentors.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="requests-search-row">
          <input
            type="text"
            className="requests-search-input"
            placeholder="Search by mentor name, designation, company, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Mentors List */}
      {isLoading ? (
        <div className="requests-loading-box">
          <div className="admin-btn-spinner dark" />
          <span>Loading mentor profiles from Mentor-details table...</span>
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="requests-empty-box">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <h3>No mentor applications found</h3>
          <p>
            {mentors.length === 0
              ? 'No mentor profiles currently exist in the backend table "Mentor-details". New mentor onboarding submissions will appear here.'
              : `There are no applications matching the "${filter}" filter.`}
          </p>
        </div>
      ) : (
        <div className="requests-cards-grid">
          {filteredMentors.map((mentor) => {
            const isApproved = Boolean(mentor.isVerified)
            const isRejected = !isApproved && mentor.verificationStatus === 'rejected'
            const isPending = !isApproved && !isRejected

            return (
              <div key={mentor.id || mentor.userId || mentor.fullName} className={`mentor-request-card ${isApproved ? 'approved' : isRejected ? 'rejected' : 'pending'}`}>
                {/* Card Top: Avatar, Name, Company, Status */}
                <div className="request-card-header">
                  <div className="mentor-applicant-left">
                    <div className="mentor-applicant-avatar">
                      {mentor.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="applicant-name-row">
                        <h3 className="applicant-name">{mentor.fullName}</h3>
                        {isApproved && (
                          <span className="applicant-blue-badge" title="Blue Verification Badge Granted">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                      <p className="applicant-role">
                        {mentor.workingAs} &bull; <strong className="applicant-company">{mentor.workingIn}</strong>
                      </p>
                      <p className="applicant-location">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{mentor.city}, {mentor.region} &bull; {mentor.countryCode} {mentor.phoneNumber}</span>
                      </p>
                    </div>
                  </div>

                  <div className="applicant-status-wrap">
                    {isPending && (
                      <span className="status-pill pending">
                        <span className="dot" />
                        Pending Review
                      </span>
                    )}
                    {isApproved && (
                      <span className="status-pill approved">
                        <span className="dot" />
                        Approved (Verified)
                      </span>
                    )}
                    {isRejected && (
                      <span className="status-pill rejected">
                        <span className="dot" />
                        Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="applicant-bio-box">
                  <span className="bio-label">Professional Bio:</span>
                  <p className="bio-text">&ldquo;{mentor.bio}&rdquo;</p>
                </div>

                {/* Skills Cloud */}
                <div className="applicant-skills-section">
                  <div className="skills-block">
                    <span className="skills-heading">Technical Domains:</span>
                    <div className="skills-tags-wrap">
                      {mentor.technicalSkills.map((sk) => (
                        <span key={sk} className="domain-pill tech">{sk}</span>
                      ))}
                    </div>
                  </div>

                  <div className="skills-block">
                    <span className="skills-heading">Mentorship Strengths:</span>
                    <div className="skills-tags-wrap">
                      {mentor.softSkills.map((ssk) => (
                        <span key={ssk} className="domain-pill soft">{ssk}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Verification Documents Review Section */}
                <div className="applicant-docs-panel">
                  <h4 className="docs-panel-title">Verification Documents</h4>

                  <div className="docs-buttons-row">
                    {/* 1. LinkedIn */}
                    {mentor.linkedinUrl ? (
                      <a
                        href={mentor.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="doc-eval-btn linkedin"
                        title="Open LinkedIn profile in new tab"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.62 1.62 0 0 0-1.62 1.62 1.62 1.62 0 0 0 1.62 1.62 1.62 1.62 0 0 0 1.62-1.62A1.62 1.62 0 0 0 7.83 6.3Z" />
                        </svg>
                        <span>Check LinkedIn Profile</span>
                      </a>
                    ) : (
                      <span className="doc-missing-text">No LinkedIn Provided</span>
                    )}

                    {/* 2. Work ID Card */}
                    {mentor.idCardPhotoUrl ? (
                      <button
                        type="button"
                        className="doc-eval-btn idcard"
                        onClick={() =>
                          setIdCardModal({
                            url: mentor.idCardPhotoUrl,
                            name: mentor.idCardFileName || 'Work Identification Card',
                            title: mentor.fullName,
                          })
                        }
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <circle cx="9" cy="11" r="2" />
                          <path d="M15 15h2M7 16h4" />
                        </svg>
                        <span>Inspect Work ID Card</span>
                      </button>
                    ) : (
                      <span className="doc-missing-text">No ID Card Attached</span>
                    )}

                    {/* 3. Resume */}
                    {mentor.resumeUrl ? (
                      <a
                        href={mentor.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="doc-eval-btn resume"
                        download={mentor.resumeFileName || 'mentor-resume.pdf'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>
                          Inspect Resume ({mentor.resumeFileSize || 'PDF'})
                        </span>
                      </a>
                    ) : (
                      <span className="doc-missing-text">No Resume Attached</span>
                    )}
                  </div>
                </div>

                {/* If rejected: show reason banner */}
                {isRejected && (
                  <div className="applicant-rejection-notice">
                    <strong>Rejection Reason Recorded:</strong>
                    <p>&ldquo;{mentor.rejectionReason || 'Documents did not meet verification criteria.'}&rdquo;</p>
                  </div>
                )}

                {/* Action Buttons: Approve / Reject */}
                <div className="applicant-actions-bar">
                  {!isApproved && (
                    <button
                      type="button"
                      className="eval-action-btn approve"
                      onClick={() => handleApprove(mentor)}
                      id={`approve-mentor-${mentor.id || mentor.fullName}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Approve &amp; Grant Blue Badge</span>
                    </button>
                  )}

                  {!isRejected && (
                    <button
                      type="button"
                      className="eval-action-btn reject"
                      onClick={() => handleOpenRejectModal(mentor)}
                      id={`reject-mentor-${mentor.id || mentor.fullName}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Reject Application</span>
                    </button>
                  )}

                  {isApproved && (
                    <span className="eval-status-done approved">
                      Verified &amp; Active
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* =========================================================================
          ID CARD LIGHTBOX MODAL
          ========================================================================= */}
      {idCardModal && (
        <div className="admin-lightbox-backdrop" onClick={() => setIdCardModal(null)}>
          <div className="admin-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <div>
                <h3 className="lightbox-title">Official Work ID Verification</h3>
                <p className="lightbox-subtitle">{idCardModal.title} &bull; {idCardModal.name}</p>
              </div>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setIdCardModal(null)}
              >
                &times;
              </button>
            </div>

            <div className="lightbox-image-container">
              <img src={idCardModal.url} alt="Official Work Identification" className="lightbox-img" />
            </div>

            <div className="lightbox-footer">
              <span className="lightbox-note">Official credential uploaded during mentor onboarding</span>
              <button
                type="button"
                className="lightbox-done-btn"
                onClick={() => setIdCardModal(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REJECTION MODAL WITH REASON PROMPT
          ========================================================================= */}
      {rejectingMentor && (
        <div className="admin-reject-modal-backdrop" onClick={() => setRejectingMentor(null)}>
          <div className="admin-reject-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="reject-modal-header">
              <div className="reject-modal-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h3 className="reject-modal-title">Reject Mentor Verification</h3>
                <p className="reject-modal-subtitle">
                  Applicant: <strong>{rejectingMentor.fullName}</strong> ({rejectingMentor.workingAs})
                </p>
              </div>
            </div>

            <p className="reject-modal-desc">
              Please specify the rejection reason below. This explanation will be displayed directly on the mentor&rsquo;s dashboard so they understand what needs correction to submit re-verification:
            </p>

            {/* Quick Reasons */}
            <div className="quick-reasons-wrap">
              <span className="quick-reasons-title">Quick Select Reason:</span>
              <div className="quick-reasons-buttons">
                {quickReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className="quick-reason-btn"
                    onClick={() => setRejectionReasonInput(reason)}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="reject-textarea-field">
              <label htmlFor="rejection-reason-textarea" className="reject-field-label">
                Detailed Rejection Reason <span className="req">*</span>
              </label>
              <textarea
                id="rejection-reason-textarea"
                rows={3}
                className="reject-textarea"
                placeholder="Explain why the credentials were rejected (e.g. Work ID is expired, LinkedIn profile missing work history)..."
                value={rejectionReasonInput}
                onChange={(e) => {
                  setRejectionReasonInput(e.target.value)
                  if (rejectionError) setRejectionError(null)
                }}
              />
            </div>

            {rejectionError && (
              <div className="reject-error-alert">{rejectionError}</div>
            )}

            {/* Modal Actions */}
            <div className="reject-modal-actions">
              <button
                type="button"
                className="reject-cancel-btn"
                onClick={() => setRejectingMentor(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reject-confirm-btn"
                onClick={handleConfirmReject}
                id="confirm-mentor-rejection-btn"
              >
                Confirm Rejection &amp; Notify Mentor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MentorRequestsTab
