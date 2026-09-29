import React, { useState, useEffect } from 'react'
import type { StudentProfileData } from '../../Students-Onboarding'
import type { UserProfile } from '../../SignIn-Screen'
import {
  getVerifiedMentors,
  type MentorProfileData,
} from '../../../lib/Mentors-details'
import {
  sendMentorshipRequest,
  getStudentRequests,
  type MentorMenteeConnection,
} from '../../../lib/mentor-mentee-connections'

export interface MentorsTabProps {
  studentData?: StudentProfileData | null
  user?: UserProfile | null
}

export const MentorsTab: React.FC<MentorsTabProps> = ({ studentData, user }) => {
  const [mentors, setMentors] = useState<MentorProfileData[]>([])
  const [studentRequests, setStudentRequests] = useState<MentorMenteeConnection[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Sub-tab: 'my-mentors' | 'verified'
  const [subTab, setSubTab] = useState<'my-mentors' | 'verified'>('my-mentors')

  // Full Profile Details Modal
  const [selectedMentor, setSelectedMentor] = useState<MentorProfileData | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const studentIdentifier = {
        id: user?.id || studentData?.mobileNumber,
        email: user?.email,
        fullName: studentData?.fullName || user?.name,
      }

      const [mentorsList, requestsList] = await Promise.all([
        getVerifiedMentors(),
        getStudentRequests(studentIdentifier),
      ])

      const verifiedOnly = mentorsList.filter((m: MentorProfileData) => Boolean(m.isVerified))
      setMentors(verifiedOnly)
      setStudentRequests(requestsList)
    } catch (err) {
      console.warn('Error loading mentors or student requests:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [studentData, user])

  // Action: Student touches Request or Request Again -> sends real connection request
  const handleRequestMentor = async (mentor: MentorProfileData) => {
    try {
      const res = await sendMentorshipRequest(mentor, studentData || null, user || null)
      if (res.connection) {
        setStudentRequests((prev) => {
          const filtered = prev.filter(
            (c) =>
              c.id !== res.connection!.id &&
              c.mentor_name?.trim().toLowerCase() !== mentor.fullName?.trim().toLowerCase()
          )
          return [res.connection!, ...filtered]
        })
      }
    } catch (err) {
      console.warn('Error sending mentorship request:', err)
    }
  }

  // Find connection record for a mentor (match by name only)
  const findConnection = (mentor: MentorProfileData): MentorMenteeConnection | undefined => {
    return studentRequests.find(
      (c) => c.mentor_name?.toLowerCase() === mentor.fullName?.toLowerCase()
    )
  }

  // Derived: accepted connections (My Mentors tab)
  const acceptedConnections = studentRequests.filter((c) => c.status === 'accepted')
  const hasAccepted = acceptedConnections.length > 0

  // Auto-switch to verified tab if no accepted mentors yet
  const activeSubTab = hasAccepted ? subTab : 'verified'

  return (
    <div className="dashboard-mentors-tab" id="student-mentors-tab">
      {/* ---- Pill Toggle Tab Switcher ---- */}
      {hasAccepted && (
        <div className="mentors-pill-switcher-wrap">
          <div className="mentors-pill-switcher" role="tablist">
            <button
              type="button"
              role="tab"
              className={`mentors-pill-tab ${activeSubTab === 'my-mentors' ? 'active' : ''}`}
              onClick={() => setSubTab('my-mentors')}
              id="sub-tab-my-mentors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              My Mentors
              {acceptedConnections.length > 0 && (
                <span className="mentors-pill-badge">{acceptedConnections.length}</span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              className={`mentors-pill-tab ${activeSubTab === 'verified' ? 'active' : ''}`}
              onClick={() => setSubTab('verified')}
              id="sub-tab-verified-mentors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" />
                <polyline points="8 12 11 15 16 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verified Mentors
            </button>
          </div>

          <button
            type="button"
            className="mentors-refresh-btn"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh"
            aria-label="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isLoading ? 'spinning-icon' : ''}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      )}

      {/* ---- Header when NO sub-tab bar (no accepted mentor yet) ---- */}
      {!hasAccepted && (
        <section className="mentors-page-header">
          <div className="mentors-header-top-row">
            <h2 className="mentors-page-title">Verified Mentors</h2>
            <button
              type="button"
              className="mentors-refresh-btn"
              onClick={loadData}
              title="Refresh verified mentors list"
              aria-label="Refresh mentors"
              disabled={isLoading}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isLoading ? 'spinning-icon' : ''}>
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </section>
      )}

      {/* 2. Loading State */}
      {isLoading ? (
        <div className="mentors-loading-container">
          <div className="mentors-loading-spinner" />
          <p className="mentors-loading-text">Loading verified mentors from Karkai network...</p>
        </div>
      ) : activeSubTab === 'my-mentors' ? (
        /* ---- MY MENTORS: Accepted connections ---- */
        <section className="my-mentors-list" id="my-mentors-section">
          {acceptedConnections.map((conn) => {
            const mentor = mentors.find(
              (m) => m.fullName?.toLowerCase() === conn.mentor_name?.toLowerCase()
            )
            const initials = conn.mentor_name
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'M'

            return (
              <article key={conn.id} className="my-mentor-card">
                {/* Gradient top band */}
                <div className="my-mentor-card-band" />

                <div className="my-mentor-card-body">
                  {/* Avatar + Core Info */}
                  <div className="my-mentor-card-top">
                    <div className="my-mentor-avatar-wrap">
                      <div className="my-mentor-avatar">
                        <span>{initials}</span>
                      </div>
                      <span className="my-mentor-online-ring" />
                    </div>

                    <div className="my-mentor-core">
                      <div className="my-mentor-name-row">
                        <h3 className="my-mentor-name">{conn.mentor_name}</h3>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="11" fill="#2563EB" />
                          <polyline points="7.5 12 10.5 15 16.5 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      {mentor && (
                        <p className="my-mentor-role">
                          {mentor.workingAs || 'Industry Mentor'}
                          {mentor.workingIn ? ` · ${mentor.workingIn}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer: status + action */}
                  <div className="my-mentor-card-footer">
                    <span className="my-mentor-connected-chip">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Mentor Connected
                    </span>
                    {mentor && (
                      <button
                        type="button"
                        className="my-mentor-view-btn"
                        onClick={() => setSelectedMentor(mentor)}
                      >
                        View Profile
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      ) : mentors.length > 0 ? (
        /* 3. Verified Mentors Cards Grid */
        <section className="mentors-cards-grid" id="verified-mentors-grid">
          {mentors.map((mentor) => {
            const initials =
              mentor.fullName
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'M'

            const mentorKey = mentor.id || mentor.userId || mentor.fullName
            const connection = findConnection(mentor)
            const isPending = connection?.status === 'pending'
            const isAccepted = connection?.status === 'accepted'
            const isRejected = connection?.status === 'rejected'
            const rejectionReason = connection?.rejection_reason

            return (
              <article key={mentorKey} className="mentor-card-full">
                {/* Header */}
                <div className="mentor-card-header">
                  <div className="mentor-avatar-lg" style={{ background: 'linear-gradient(135deg, #0f1e36, #1e3a8a)' }}>
                    <span>{initials}</span>
                    <span className="mentor-online-badge-dot" />
                  </div>

                  <div className="mentor-header-info">
                    <div className="mentor-name-row">
                      <h3 className="mentor-card-name">
                        <span>{mentor.fullName}</span>
                        {/* Blue Checkmark Badge */}
                        <span className="mentor-blue-check-badge" title="Official Verified Mentor - Admin Approved">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="11" fill="#2563EB" />
                            <polyline points="7.5 12 10.5 15 16.5 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </h3>

                      <span className="mentor-verified-check-pill verified">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Verified</span>
                      </span>
                    </div>

                    <p className="mentor-card-title">{mentor.workingAs || 'Senior Technical Mentor'}</p>
                    <p className="mentor-card-org">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                      <span>{mentor.workingIn || 'Karkai Global'}</span>
                      <span className="meta-separator">&bull;</span>
                      <span className="mentor-card-city">
                        {mentor.city ? `${mentor.city}${mentor.region ? `, ${mentor.region}` : ''}` : 'Tamil Nadu'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Professional Bio */}
                <p className="mentor-bio-text">
                  {mentor.bio ||
                    'Experienced practitioner passionate about guiding students through technical concepts, career advice, and real-world coding.'}
                </p>

                {/* Technical Skills Pills */}
                {mentor.technicalSkills && mentor.technicalSkills.length > 0 && (
                  <div className="mentor-skills-list">
                    {mentor.technicalSkills.slice(0, 5).map((sk) => (
                      <span key={sk} className="mentor-skill-pill">
                        {sk}
                      </span>
                    ))}
                    {mentor.technicalSkills.length > 5 && (
                      <span className="mentor-skill-pill more">
                        +{mentor.technicalSkills.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                {/* CRITICAL: If rejected by mentor, show reason to student */}
                {isRejected && (
                  <div className="mentor-rejected-feedback-card" id={`rejection-notice-${mentorKey}`}>
                    <div className="rejection-feedback-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span className="rejection-feedback-title">Request Rejected by Mentor</span>
                    </div>
                    <p className="rejection-feedback-text">
                      "{rejectionReason || 'Mentor is currently at maximum capacity for this cohort.'}"
                    </p>
                  </div>
                )}

                {/* If accepted by mentor, show connected notice */}
                {isAccepted && (
                  <div className="mentor-accepted-feedback-card">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Connected! Mentor accepted your 1-on-1 mentorship request.</span>
                  </div>
                )}

                {/* Card Action Footer */}
                <div className="mentor-card-footer">
                  <div className="mentor-connect-actions-row">
                    <button
                      type="button"
                      className="mentor-view-profile-btn"
                      onClick={() => setSelectedMentor(mentor)}
                      id={`mentor-view-profile-${mentor.fullName.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>View Profile</span>
                    </button>

                    {/* Request / Requested / Connected / Request Again Button */}
                    {isAccepted ? (
                      <button
                        type="button"
                        className="mentor-request-btn accepted"
                        disabled
                        title="You are connected with this mentor"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Connected</span>
                      </button>
                    ) : isRejected ? (
                      <button
                        type="button"
                        className="mentor-request-btn re-request"
                        onClick={() => handleRequestMentor(mentor)}
                        id={`mentor-request-btn-${mentor.fullName.replace(/\s+/g, '-').toLowerCase()}`}
                        title="Send request again to this mentor"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M23 4v6h-6" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        <span>Request Again</span>
                      </button>
                    ) : isPending ? (
                      <button
                        type="button"
                        className="mentor-request-btn requested"
                        disabled
                        id={`mentor-request-btn-${mentor.fullName.replace(/\s+/g, '-').toLowerCase()}`}
                        title="Mentorship request sent, waiting for mentor response"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Requested</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="mentor-request-btn"
                        onClick={() => handleRequestMentor(mentor)}
                        id={`mentor-request-btn-${mentor.fullName.replace(/\s+/g, '-').toLowerCase()}`}
                        title="Send mentorship request"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="8.5" cy="7" r="4" />
                          <line x1="20" y1="8" x2="20" y2="14" />
                          <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                        <span>Request</span>
                      </button>
                    )}

                    {mentor.linkedinUrl && (
                      <a
                        href={mentor.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mentor-linkedin-icon-btn"
                        title="View LinkedIn Profile"
                        aria-label="LinkedIn Profile"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.62 1.62 0 0 0-1.62 1.62 1.62 1.62 0 0 0 1.62 1.62 1.62 1.62 0 0 0 1.62-1.62A1.62 1.62 0 0 0 7.83 6.3Z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        /* 4. Empty State: No Verified Mentors Available */
        <div className="mentors-empty-card" id="mentors-empty-card">
          <div className="mentors-empty-icon-box">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#0284c7" strokeWidth="1.8" />
              <polyline points="8 12 11 15 16 9" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h3 className="mentors-empty-title">No Verified Mentors Available Yet</h3>

          <p className="mentors-empty-desc">
            Mentor applications are currently under credential review by the admin console. As soon as a mentor is approved, their verified profile will appear here automatically.
          </p>

          <div className="mentors-empty-actions">
            <button
              type="button"
              className="mentors-empty-action-btn"
              onClick={loadData}
            >
              Check for Newly Approved Mentors
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW FULL MENTOR PROFILE MODAL
          ========================================================================= */}
      {selectedMentor && (() => {
        const modalConn = findConnection(selectedMentor)
        const isModalPending = modalConn?.status === 'pending'
        const isModalAccepted = modalConn?.status === 'accepted'
        const isModalRejected = modalConn?.status === 'rejected'

        return (
          <div
            className="mentor-detail-modal-backdrop"
            onClick={() => setSelectedMentor(null)}
            role="dialog"
            aria-modal="true"
          >
            <div className="mentor-detail-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="mentor-detail-modal-header">
                <div className="mentor-detail-meta">
                  <span className="mentor-verified-check-pill verified">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Verified Mentor Profile</span>
                  </span>
                  <h3 className="mentor-detail-name">
                    <span>{selectedMentor.fullName}</span>
                    <span className="mentor-blue-check-badge">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="11" fill="#2563EB" />
                        <polyline points="7.5 12 10.5 15 16.5 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </h3>
                  <p className="mentor-detail-sub">
                    {selectedMentor.workingAs} &bull; {selectedMentor.workingIn}
                  </p>
                </div>
                <button
                  type="button"
                  className="mentor-detail-modal-close"
                  onClick={() => setSelectedMentor(null)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <div className="mentor-detail-modal-body">
                {/* Location & Contact Information */}
                <div className="mentor-detail-section">
                  <h4 className="detail-section-title">Current Role & Location</h4>
                  <div className="mentor-detail-grid">
                    <div className="mentor-detail-item">
                      <span className="detail-item-label">Designation</span>
                      <span className="detail-item-val">{selectedMentor.workingAs}</span>
                    </div>
                    <div className="mentor-detail-item">
                      <span className="detail-item-label">Organization</span>
                      <span className="detail-item-val">{selectedMentor.workingIn}</span>
                    </div>
                    <div className="mentor-detail-item">
                      <span className="detail-item-label">Location</span>
                      <span className="detail-item-val">
                        {selectedMentor.city ? `${selectedMentor.city}, ${selectedMentor.region}` : 'Tamil Nadu, India'}
                      </span>
                    </div>
                    <div className="mentor-detail-item">
                      <span className="detail-item-label">Verification Badge</span>
                      <span className="detail-item-val verified-text">Active Blue Check</span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="mentor-detail-section">
                  <h4 className="detail-section-title">Professional Bio & Philosophy</h4>
                  <p className="mentor-detail-bio-text">
                    {selectedMentor.bio || 'Committed to mentoring the next generation of engineers and problem solvers.'}
                  </p>
                </div>

                {/* Technical Skills */}
                {selectedMentor.technicalSkills && selectedMentor.technicalSkills.length > 0 && (
                  <div className="mentor-detail-section">
                    <h4 className="detail-section-title">Technical & Domain Skills</h4>
                    <div className="mentor-tags-cloud">
                      {selectedMentor.technicalSkills.map((sk) => (
                        <span key={sk} className="mentor-pill-chip tech">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Soft Skills */}
                {selectedMentor.softSkills && selectedMentor.softSkills.length > 0 && (
                  <div className="mentor-detail-section">
                    <h4 className="detail-section-title">Mentorship Strengths & Soft Skills</h4>
                    <div className="mentor-tags-cloud">
                      {selectedMentor.softSkills.map((ssk) => (
                        <span key={ssk} className="mentor-pill-chip soft">
                          {ssk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Professional Links */}
                {selectedMentor.linkedinUrl && (
                  <div className="mentor-detail-section">
                    <h4 className="detail-section-title">Professional Social Profile</h4>
                    <a
                      href={selectedMentor.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mentor-linkedin-link-card"
                    >
                      <div className="linkedin-card-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.62 1.62 0 0 0-1.62 1.62 1.62 1.62 0 0 0 1.62 1.62 1.62 1.62 0 0 0 1.62-1.62A1.62 1.62 0 0 0 7.83 6.3Z" />
                        </svg>
                      </div>
                      <div className="linkedin-card-meta">
                        <span className="linkedin-card-title">LinkedIn Profile</span>
                        <span className="linkedin-card-sub">View career experience & network</span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>

              <div className="mentor-detail-modal-footer">
                <button
                  type="button"
                  className="mentor-detail-cancel-btn"
                  onClick={() => setSelectedMentor(null)}
                >
                  Close
                </button>

                {isModalAccepted ? (
                  <button type="button" className="mentor-detail-book-btn accepted" disabled>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Connected</span>
                  </button>
                ) : isModalRejected ? (
                  <button
                    type="button"
                    className="mentor-detail-book-btn re-request"
                    onClick={() => {
                      handleRequestMentor(selectedMentor)
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M23 4v6h-6" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    <span>Request Again</span>
                  </button>
                ) : isModalPending ? (
                  <button type="button" className="mentor-detail-book-btn requested" disabled>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Requested</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mentor-detail-book-btn"
                    onClick={() => {
                      handleRequestMentor(selectedMentor)
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    <span>Request</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default MentorsTab
