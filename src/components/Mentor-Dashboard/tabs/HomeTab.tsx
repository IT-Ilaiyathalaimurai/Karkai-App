import React, { useState, useEffect, useCallback } from 'react'
import type { MentorProfileData } from '../../../lib/Mentors-details'
import type { UserProfile } from '../../SignIn-Screen'
import {
  type MentorAssignedTask,
  getTasksForMentor,
} from '../../../lib/mentor-assigned-tasks'
import { AssignTaskModal } from '../AssignTaskModal'
import { MentorReviewTaskModal } from '../MentorReviewTaskModal'

export interface HomeTabProps {
  mentorData?: MentorProfileData | null
  user?: UserProfile | null
  onGiveVerificationAgain?: () => void
  onViewProfile?: () => void
}

type FilterType = 'all' | 'needs_review' | 'in_progress' | 'reviewed'

export const HomeTab: React.FC<HomeTabProps> = ({
  mentorData,
  user,
  onGiveVerificationAgain,
  onViewProfile,
}) => {
  const isVerified = Boolean(mentorData?.isVerified)
  const isRejected = !isVerified && mentorData?.verificationStatus === 'rejected'
  const isPending = !isVerified && !isRejected

  const mentorId =
    user?.id || mentorData?.id || mentorData?.userId || 'mentor'
  const mentorName = mentorData?.fullName || user?.name || 'Mentor'

  // Task states
  const [tasks, setTasks] = useState<MentorAssignedTask[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false)
  const [reviewingTask, setReviewingTask] = useState<MentorAssignedTask | null>(null)

  // Fetch tasks
  const fetchTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const list = await getTasksForMentor(mentorId, mentorName)
      setTasks(list)
    } catch (e) {
      console.warn('Failed to load mentor assigned tasks:', e)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [mentorId, mentorName])

  useEffect(() => {
    fetchTasks()

    const handleFocus = () => fetchTasks(true)
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchTasks])

  // Metrics count
  const needsReviewCount = tasks.filter((t) => t.status === 'submitted').length
  const inProgressCount = tasks.filter((t) => t.status === 'assigned').length
  const reviewedCount = tasks.filter((t) => t.status === 'reviewed').length

  // Filtered task list
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'needs_review') return t.status === 'submitted'
    if (activeFilter === 'in_progress') return t.status === 'assigned'
    if (activeFilter === 'reviewed') return t.status === 'reviewed'
    return true
  })

  // Format deadline and check status
  const formatDeadline = (isoStr: string) => {
    const d = new Date(isoStr)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d)
  }

  const getDeadlineStatus = (task: MentorAssignedTask) => {
    const now = new Date().getTime()
    const due = new Date(task.deadline).getTime()
    const diffHours = Math.round((due - now) / (1000 * 60 * 60))

    if (task.status === 'submitted' || task.status === 'reviewed') {
      return { label: `Deadline: ${formatDeadline(task.deadline)}`, isOverdue: false }
    }

    if (diffHours < 0) {
      const days = Math.abs(Math.round(diffHours / 24))
      return {
        label: `⚠️ Overdue by ${days === 0 ? 'few hours' : `${days} day${days > 1 ? 's' : ''}`}`,
        isOverdue: true,
      }
    }
    if (diffHours <= 24) {
      return { label: `⏱️ Due today (${diffHours}h left)`, isOverdue: false }
    }
    const days = Math.round(diffHours / 24)
    return { label: `⏱️ Due in ${days} day${days > 1 ? 's' : ''}`, isOverdue: false }
  }

  return (
    <div className="mentor-home-tab-wrapper">
      {/* 1. Admin Verification Alert Banner */}
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
              Your credentials have been submitted to admin. Once verified, you will receive the official <strong>blue badge</strong>.
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
              Your credentials are authenticated. Blue badge active across your profile and mentee network.
            </p>
          </div>
        </div>
      )}

      {/* 2. STUDENT ASSIGNED TASKS & SUBMISSIONS SECTION */}
      <section className="mentor-tasks-section" aria-label="Student Assigned Tasks">
        {/* Header with "+ Assign Task" button */}
        <div className="mentor-tasks-header-card">
          <div className="mentor-tasks-header-left">
            <h3 className="mentor-tasks-title">Student Tasks & Reviews</h3>
            <p className="mentor-tasks-subtitle">
              Assign individual tasks, track deadlines, and review student work submissions
            </p>
          </div>

          <button
            type="button"
            className="mentor-assign-task-cta-btn"
            onClick={() => setIsAssignModalOpen(true)}
            id="mentor-assign-new-task-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ Assign Task</span>
          </button>
        </div>

        {/* Metrics Row */}
        <div className="mentor-tasks-metrics-row">
          <div className="mentor-metric-card">
            <div className="mentor-metric-icon needs-review">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="mentor-metric-texts">
              <span className="mentor-metric-val">{needsReviewCount}</span>
              <span className="mentor-metric-label">Needs Review</span>
            </div>
          </div>

          <div className="mentor-metric-card">
            <div className="mentor-metric-icon in-progress">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="mentor-metric-texts">
              <span className="mentor-metric-val">{inProgressCount}</span>
              <span className="mentor-metric-label">In Progress</span>
            </div>
          </div>

          <div className="mentor-metric-card">
            <div className="mentor-metric-icon reviewed">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="mentor-metric-texts">
              <span className="mentor-metric-val">{reviewedCount}</span>
              <span className="mentor-metric-label">Reviewed</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mentor-tasks-filter-bar" role="tablist">
          <button
            type="button"
            className={`mentor-tasks-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <span>All Tasks</span>
            <span className="count">{tasks.length}</span>
          </button>

          <button
            type="button"
            className={`mentor-tasks-filter-pill ${activeFilter === 'needs_review' ? 'active' : ''}`}
            onClick={() => setActiveFilter('needs_review')}
          >
            <span>Needs Review</span>
            {needsReviewCount > 0 && <span className="count">{needsReviewCount}</span>}
          </button>

          <button
            type="button"
            className={`mentor-tasks-filter-pill ${activeFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setActiveFilter('in_progress')}
          >
            <span>In Progress</span>
            <span className="count">{inProgressCount}</span>
          </button>

          <button
            type="button"
            className={`mentor-tasks-filter-pill ${activeFilter === 'reviewed' ? 'active' : ''}`}
            onClick={() => setActiveFilter('reviewed')}
          >
            <span>Reviewed</span>
            <span className="count">{reviewedCount}</span>
          </button>
        </div>

        {/* Task Cards Feed */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
            <span>Loading assigned tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="mentor-tasks-empty-card">
            <div className="mentor-tasks-empty-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h4 className="mentor-tasks-empty-title">
              {activeFilter === 'all'
                ? 'No Tasks Assigned Yet'
                : activeFilter === 'needs_review'
                ? 'No Pending Submissions to Review'
                : activeFilter === 'in_progress'
                ? 'No Tasks In Progress'
                : 'No Tasks Reviewed Yet'}
            </h4>
            <p className="mentor-tasks-empty-desc">
              {activeFilter === 'all'
                ? 'Assign structured tasks to your connected mentees with deadlines. Once submitted, their reviewable links and work will appear here.'
                : 'When students submit their work, you can review it directly from this tab.'}
            </p>
            {activeFilter === 'all' && (
              <button
                type="button"
                className="mentor-assign-task-cta-btn"
                onClick={() => setIsAssignModalOpen(true)}
              >
                + Assign Your First Task
              </button>
            )}
          </div>
        ) : (
          <div className="mentor-tasks-list">
            {filteredTasks.map((task) => {
              const deadlineStatus = getDeadlineStatus(task)
              const initials =
                task.student_name
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'S'

              return (
                <article key={task.id} className="mentor-task-card">
                  {/* Card Top: Student Avatar + Status */}
                  <div className="mentor-task-card-top">
                    <div className="mentor-task-student-meta">
                      <div className="mentor-task-avatar">
                        <span>{initials}</span>
                      </div>
                      <div className="mentor-task-student-info">
                        <h4 className="mentor-task-student-name">{task.student_name}</h4>
                        <p className="mentor-task-date-info">
                          Assigned on {new Date(task.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {task.status === 'submitted' && (
                        <span className="mentor-task-status-pill needs_review">
                          ● Work Submitted
                        </span>
                      )}
                      {task.status === 'assigned' && (
                        <span className="mentor-task-status-pill in_progress">
                          ⏱️ In Progress
                        </span>
                      )}
                      {task.status === 'reviewed' && (
                        <span className="mentor-task-status-pill reviewed">
                          ✓ Reviewed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="mentor-task-body">
                    <h4 className="mentor-task-title">{task.title}</h4>
                    {task.description && (
                      <p className="mentor-task-desc">{task.description}</p>
                    )}
                    <span
                      className={`mentor-task-deadline-tag ${
                        deadlineStatus.isOverdue ? 'overdue' : ''
                      }`}
                    >
                      {deadlineStatus.label}
                    </span>
                  </div>

                  {/* If student submitted work: show submission details & link */}
                  {task.status === 'submitted' && (
                    <div className="mentor-task-submission-box">
                      <div className="submission-box-header">
                        <span className="submission-box-title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Student Completed & Attached Work
                        </span>

                        {task.submission_link && (
                          <a
                            href={task.submission_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="submission-box-link-btn"
                          >
                            <span>Open Review Link</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        )}
                      </div>

                      {task.submission_notes && (
                        <p className="submission-box-notes">
                          "{task.submission_notes}"
                        </p>
                      )}

                      <div style={{ fontSize: '11px', color: '#166534' }}>
                        Submitted {task.submitted_at ? new Date(task.submitted_at).toLocaleString() : ''}
                      </div>

                      {/* Action Button: Review & Give Feedback */}
                      <div className="mentor-task-actions-row">
                        <button
                          type="button"
                          className="mentor-review-btn"
                          onClick={() => setReviewingTask(task)}
                          id={`review-task-btn-${task.id}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                          <span>Review & Give Feedback</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* If task was reviewed: show feedback & rating */}
                  {task.status === 'reviewed' && (
                    <div className="mentor-task-feedback-box">
                      <div className="feedback-box-header">
                        <span className="feedback-box-title">Your Feedback Given:</span>
                        {task.rating && (
                          <span className="feedback-box-rating">
                            {'★'.repeat(task.rating)} {task.rating}/5
                          </span>
                        )}
                      </div>

                      {task.feedback && (
                        <p className="feedback-box-text">"{task.feedback}"</p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Reviewed on {task.reviewed_at ? new Date(task.reviewed_at).toLocaleDateString() : ''}
                        </span>

                        <button
                          type="button"
                          className="mentor-update-feedback-btn"
                          onClick={() => setReviewingTask(task)}
                        >
                          Update Feedback
                        </button>
                      </div>
                    </div>
                  )}

                  {/* If still waiting for student */}
                  {task.status === 'assigned' && (
                    <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', paddingTop: 2 }}>
                      ⏳ Student has not submitted their work yet.
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* 3. Assign Task Modal */}
      <AssignTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        mentorId={mentorId}
        mentorName={mentorName}
        onTaskAssigned={(newTask) => {
          setTasks((prev) => [newTask, ...prev])
        }}
      />

      {/* 4. Mentor Review & Feedback Modal */}
      <MentorReviewTaskModal
        isOpen={Boolean(reviewingTask)}
        onClose={() => setReviewingTask(null)}
        task={reviewingTask}
        onReviewed={(updatedTask) => {
          setTasks((prev) =>
            prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
          )
          setReviewingTask(null)
        }}
      />
    </div>
  )
}

export default HomeTab
