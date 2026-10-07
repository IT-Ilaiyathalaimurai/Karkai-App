import React, { useState, useEffect } from 'react'
import type { MentorProfileData } from '../../../lib/Mentors-details'
import type { UserProfile } from '../../SignIn-Screen'
import {
  getMentorRequests,
  updateConnectionStatus,
  type MentorMenteeConnection,
} from '../../../lib/mentor-mentee-connections'
import { StudentProfileViewerModal } from '../StudentProfileViewerModal'

export interface RequestsTabProps {
  mentorData?: MentorProfileData | null
  user?: UserProfile | null
  onOpenChat?: (connection: MentorMenteeConnection) => void
}

export const RequestsTab: React.FC<RequestsTabProps> = ({ mentorData, user, onOpenChat }) => {
  const [requests, setRequests] = useState<MentorMenteeConnection[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeFilter, setActiveFilter] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('pending')

  // Student Profile Viewer Modal State
  const [viewingStudent, setViewingStudent] = useState<MentorMenteeConnection | null>(null)

  // Reject Modal State
  const [rejectingRequest, setRejectingRequest] = useState<MentorMenteeConnection | null>(null)
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('')
  const [rejectionError, setRejectionError] = useState<string | null>(null)

  // Feedback Toast Notice
  const [toastNotice, setToastNotice] = useState<string | null>(null)

  const mentorIdentifier = {
    id: mentorData?.id || mentorData?.userId || user?.id,
    email: user?.email || mentorData?.email,
    fullName: mentorData?.fullName || user?.name,
  }

  const loadRequests = async () => {
    setIsLoading(true)
    try {
      const data = await getMentorRequests(mentorIdentifier)
      setRequests(data)
    } catch (err) {
      console.warn('Error loading mentor requests:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [mentorData, user])

  // Quick Accept action
  const handleAccept = async (req: MentorMenteeConnection) => {
    const res = await updateConnectionStatus(req.id, 'accepted')
    if (res.success) {
      setToastNotice(`Accepted mentorship connection with ${req.student_name}!`)
      setTimeout(() => setToastNotice(null), 4000)
      loadRequests()
    }
  }

  // Open Reject Modal
  const handleOpenReject = (req: MentorMenteeConnection) => {
    setRejectingRequest(req)
    setRejectionReasonInput('')
    setRejectionError(null)
  }

  // Confirm Reject with reason
  const handleConfirmReject = async () => {
    if (!rejectingRequest) return
    const cleanReason = rejectionReasonInput.trim()

    if (!cleanReason) {
      setRejectionError('Please provide a reason so the student understands your feedback.')
      return
    }

    const res = await updateConnectionStatus(rejectingRequest.id, 'rejected', cleanReason)
    if (res.success) {
      const studentName = rejectingRequest.student_name
      setRejectingRequest(null)
      setToastNotice(`Request from ${studentName} rejected with feedback reason.`)
      setTimeout(() => setToastNotice(null), 4000)
      loadRequests()
    }
  }

  // Counts
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const acceptedCount = requests.filter((r) => r.status === 'accepted').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length

  // Filtered List
  const filteredRequests = requests.filter((r) => {
    if (activeFilter === 'all') return true
    return r.status === activeFilter
  })

  // Format request timestamp
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Recently'
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Recently'
    }
  }

  return (
    <div className="mentor-requests-tab-content" id="mentor-requests-tab">
      {/* Toast Notification */}
      {toastNotice && (
        <div className="mentor-requests-toast" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Header */}
      <section className="mentor-requests-page-header">
        <div className="mentor-requests-header-row">
          <div>
            <h2 className="mentor-requests-title">Mentorship Requests</h2>
            <p className="mentor-requests-sub">
              Review and respond to incoming 1-on-1 mentorship inquiries from learners.
            </p>
          </div>

          <button
            type="button"
            className="mentor-requests-refresh-btn"
            onClick={loadRequests}
            title="Refresh requests"
            aria-label="Refresh requests"
            disabled={isLoading}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className={isLoading ? 'spinning-icon' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="mentor-requests-filter-bar" role="tablist">
          <button
            type="button"
            className={`mentor-req-filter-pill ${activeFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveFilter('pending')}
          >
            <span>Pending Review</span>
            <span className="req-filter-count pending">{pendingCount}</span>
          </button>

          <button
            type="button"
            className={`mentor-req-filter-pill ${activeFilter === 'accepted' ? 'active' : ''}`}
            onClick={() => setActiveFilter('accepted')}
          >
            <span>Accepted</span>
            <span className="req-filter-count accepted">{acceptedCount}</span>
          </button>

          <button
            type="button"
            className={`mentor-req-filter-pill ${activeFilter === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveFilter('rejected')}
          >
            <span>Rejected</span>
            <span className="req-filter-count rejected">{rejectedCount}</span>
          </button>

          <button
            type="button"
            className={`mentor-req-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <span>All ({requests.length})</span>
          </button>
        </div>
      </section>

      {/* Main Content / Requests List */}
      {isLoading ? (
        <div className="mentor-requests-loading">
          <div className="mentors-loading-spinner" />
          <p>Loading incoming mentorship requests...</p>
        </div>
      ) : filteredRequests.length > 0 ? (
        <section className="mentor-requests-cards-list">
          {filteredRequests.map((req) => {
            const initials =
              req.student_name
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'S'



            return (
              <article key={req.id} className="mentor-request-card" id={`request-card-${req.id}`}>
                {/* Header row */}
                <div className="request-card-top">
                  <div className="request-student-avatar">
                    <span>{initials}</span>
                    <span className="request-avatar-dot" />
                  </div>

                  <div className="request-student-meta">
                    <h3 className="request-student-name">{req.student_name}</h3>
                    <p className="request-student-contact">
                      <span>Requested on {formatTime(req.created_at)}</span>
                    </p>
                  </div>

                  <div className="request-card-badge-col">
                    <span className={`request-status-pill ${req.status}`}>
                      {req.status === 'pending' && (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>Pending</span>
                        </>
                      )}
                      {req.status === 'accepted' && (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Accepted</span>
                        </>
                      )}
                      {req.status === 'rejected' && (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                          <span>Rejected</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* If rejected, show rejection feedback reason */}
                {req.status === 'rejected' && req.rejection_reason && (
                  <div className="request-rejection-reason-box">
                    <div className="rejection-reason-header">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>Rejection Feedback Given to Student</span>
                    </div>
                    <p className="rejection-reason-quote">
                      "{req.rejection_reason}"
                    </p>
                  </div>
                )}

                {/* Pending Actions */}
                {req.status === 'pending' && (
                  <div className="request-actions-row">
                    <button
                      type="button"
                      className="request-view-profile-btn"
                      onClick={() => setViewingStudent(req)}
                      id={`view-profile-req-${req.id}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>View Profile</span>
                    </button>

                    <button
                      type="button"
                      className="request-accept-btn"
                      onClick={() => handleAccept(req)}
                      id={`accept-req-${req.id}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Accept Request</span>
                    </button>

                    <button
                      type="button"
                      className="request-reject-btn"
                      onClick={() => handleOpenReject(req)}
                      id={`reject-req-${req.id}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      <span>Reject with Reason</span>
                    </button>
                  </div>
                )}

                {/* Accepted Action - View Profile & Message Student */}
                {req.status === 'accepted' && (
                  <div className="request-actions-row" style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className="request-view-profile-btn"
                      onClick={() => setViewingStudent(req)}
                      id={`view-profile-req-${req.id}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>View Profile</span>
                    </button>

                    {onOpenChat && (
                      <button
                        type="button"
                        className="request-accept-btn"
                        onClick={() => onOpenChat(req)}
                        id={`chat-req-${req.id}`}
                        style={{ background: '#2563eb' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>Open Direct Chat</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Rejected Action - View Profile */}
                {req.status === 'rejected' && (
                  <div className="request-actions-row" style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className="request-view-profile-btn"
                      onClick={() => setViewingStudent(req)}
                      id={`view-profile-req-${req.id}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>View Profile</span>
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </section>
      ) : (
        /* Empty State */
        <div className="mentor-requests-empty-card">
          <div className="mentor-requests-empty-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h3 className="mentor-requests-empty-title">
            No {activeFilter === 'all' ? '' : `${activeFilter} `}requests found
          </h3>
          <p className="mentor-requests-empty-desc">
            {activeFilter === 'pending'
              ? 'You do not have any pending mentorship inquiries at this time.'
              : `There are currently no requests matching the "${activeFilter}" filter.`}
          </p>
        </div>
      )}

      {/* =========================================================================
          REJECTION FEEDBACK MODAL
          ========================================================================= */}
      {rejectingRequest && (
        <div
          className="mentor-reject-modal-backdrop"
          onClick={() => setRejectingRequest(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="mentor-reject-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mentor-reject-modal-header">
              <div>
                <span className="reject-modal-tag">Mentorship Rejection</span>
                <h3 className="mentor-reject-modal-title">
                  Reject Request from {rejectingRequest.student_name}
                </h3>
                <p className="mentor-reject-modal-sub">
                  Provide a clear reason so the student understands your feedback and can re-apply appropriately.
                </p>
              </div>
              <button
                type="button"
                className="mentor-reject-modal-close"
                onClick={() => setRejectingRequest(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="mentor-reject-modal-body">
              <label className="reject-field-label" htmlFor="reject-reason-textarea">
                Rejection Reason (Visible to Student)
              </label>

              {/* Quick Preset Reasons */}
              <div className="quick-reasons-grid">
                {[
                  'Currently at maximum mentee capacity for this month.',
                  'Looking for students matching my specific technical stack.',
                  'Please review basic prerequisites and re-apply in the next cohort.',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className="quick-reason-pill"
                    onClick={() => {
                      setRejectionReasonInput(reason)
                      setRejectionError(null)
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                id="reject-reason-textarea"
                rows={4}
                className="reject-textarea"
                placeholder="Type a constructive reason for rejecting this mentorship request..."
                value={rejectionReasonInput}
                onChange={(e) => {
                  setRejectionReasonInput(e.target.value)
                  if (rejectionError) setRejectionError(null)
                }}
              />

              {rejectionError && <p className="reject-error-text">{rejectionError}</p>}
            </div>

            <div className="mentor-reject-modal-footer">
              <button
                type="button"
                className="mentor-reject-cancel-btn"
                onClick={() => setRejectingRequest(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mentor-reject-confirm-btn"
                onClick={handleConfirmReject}
                id="confirm-reject-req-btn"
              >
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW FULL STUDENT PROFILE MODAL
          ========================================================================= */}
      <StudentProfileViewerModal
        connection={viewingStudent}
        isOpen={Boolean(viewingStudent)}
        onClose={() => setViewingStudent(null)}
        onAccept={(conn) => {
          handleAccept(conn)
          setViewingStudent(null)
        }}
        onReject={(conn) => {
          handleOpenReject(conn)
          setViewingStudent(null)
        }}
        onOpenChat={
          onOpenChat
            ? (conn) => {
                onOpenChat(conn)
                setViewingStudent(null)
              }
            : undefined
        }
      />
    </div>
  )
}

export default RequestsTab
