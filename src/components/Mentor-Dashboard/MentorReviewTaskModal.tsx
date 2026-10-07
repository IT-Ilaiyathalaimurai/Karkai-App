import React, { useState, useEffect } from 'react'
import {
  type MentorAssignedTask,
  reviewTaskFeedback,
} from '../../lib/mentor-assigned-tasks'
import './MentorReviewTaskModal.css'

export interface MentorReviewTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: MentorAssignedTask | null
  onReviewed?: (updatedTask: MentorAssignedTask) => void
}

const FEEDBACK_PRESETS = [
  'Outstanding execution! Clean structure and well formatted.',
  'Great effort! Attention to detail is evident, ready for the next level.',
  'Good progress! Please review the notes and polish the edge cases.',
  'Strong foundation. Recommend refining responsiveness on mobile.',
]

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Needs Revision',
  2: 'Developing - Work Needed',
  3: 'Good Attempt',
  4: 'Great Job - High Quality',
  5: 'Outstanding / Exceptional!',
}

const getPlatformBadge = (url?: string | null) => {
  if (!url) return null
  const lower = url.toLowerCase()
  if (lower.includes('github.com')) return { label: 'GitHub Repo', color: '#181717', bg: '#f6f8fa' }
  if (lower.includes('figma.com')) return { label: 'Figma Design', color: '#a259ff', bg: '#f8f5ff' }
  if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) return { label: 'Google Drive', color: '#0f9d58', bg: '#f0fdf4' }
  if (lower.includes('loom.com')) return { label: 'Loom Video', color: '#625df5', bg: '#f5f3ff' }
  if (lower.includes('notion.site') || lower.includes('notion.so')) return { label: 'Notion Doc', color: '#000000', bg: '#f7f6f3' }
  return { label: 'Review Link', color: '#2563eb', bg: '#eff6ff' }
}

export const MentorReviewTaskModal: React.FC<MentorReviewTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onReviewed,
}) => {
  const [feedback, setFeedback] = useState<string>('')
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    if (task) {
      setFeedback(task.feedback || '')
      setRating(task.rating || 5)
      setHoverRating(0)
      setErrorMsg('')
      setIsSubmitting(false)
    }
  }, [task, isOpen])

  if (!isOpen || !task) return null

  const platformInfo = getPlatformBadge(task.submission_link)
  const effectiveRating = hoverRating || rating

  // Check if submitted on time
  const isSubmittedOnTime =
    task.submitted_at && task.deadline
      ? new Date(task.submitted_at).getTime() <= new Date(task.deadline).getTime()
      : true

  // Format date
  const formatDateTime = (isoStr?: string | null) => {
    if (!isoStr) return 'Not submitted'
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(isoStr))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!feedback.trim()) {
      setErrorMsg('Please write your review feedback for the student.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await reviewTaskFeedback(task.id, feedback.trim(), rating, 'reviewed')
      if (res.success && res.task) {
        if (onReviewed) {
          onReviewed(res.task)
        }
        onClose()
      } else {
        setErrorMsg(res.error || 'Failed to submit feedback. Please try again.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred while submitting feedback.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="review-task-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div className="review-task-card" role="dialog" aria-modal="true">
        <div className="rtm-drag-handle" />

        {/* Header */}
        <div className="rtm-header">
          <div className="rtm-header-left">
            <div className="rtm-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3 className="rtm-header-title">Review Student Work</h3>
              <p className="rtm-header-subtitle">Evaluate submission and provide constructive feedback</p>
            </div>
          </div>

          <button
            type="button"
            className="rtm-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="rtm-body">
          {errorMsg && <div className="rtm-error-banner">{errorMsg}</div>}

          {/* Student & Submission Details */}
          <div className="rtm-submission-box">
            <div className="rtm-student-header">
              <div className="rtm-student-name">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{task.student_name}</span>
              </div>

              {task.submitted_at && (
                <span className={`rtm-timing-badge ${isSubmittedOnTime ? 'on-time' : 'late'}`}>
                  {isSubmittedOnTime ? '✓ On Time' : '⚠️ Submitted Past Deadline'}
                </span>
              )}
            </div>

            <p className="rtm-task-headline">
              <strong>Task:</strong> {task.title}
            </p>

            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Submitted on: {formatDateTime(task.submitted_at)}
            </div>

            {/* Attached Reviewable Link */}
            {task.submission_link ? (
              <div className="rtm-link-panel">
                <div className="rtm-link-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="rtm-link-label">Student Attached Link</span>
                    {platformInfo && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 750,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: platformInfo.bg,
                          color: platformInfo.color,
                        }}
                      >
                        {platformInfo.label}
                      </span>
                    )}
                  </div>
                  <span className="rtm-link-url-text" title={task.submission_link}>
                    {task.submission_link}
                  </span>
                </div>

                <a
                  href={task.submission_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rtm-open-link-btn"
                >
                  <span>Open Link</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            ) : (
              <div style={{ fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                No external link was attached with this submission.
              </div>
            )}

            {/* Student's Notes */}
            {task.submission_notes && (
              <div className="rtm-notes-box">
                <span className="rtm-notes-label">Student Submission Notes:</span>
                <p className="rtm-notes-text">"{task.submission_notes}"</p>
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="rtm-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="rtm-label">
                Rating & Performance
              </label>
              <span className="rtm-rating-desc-badge">
                {RATING_DESCRIPTIONS[effectiveRating] || ''}
              </span>
            </div>

            <div className="rtm-rating-wrap">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`rtm-star-btn ${star <= effectiveRating ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  title={`${star} Star${star > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
              <span className="rtm-rating-numeric-text">
                {rating} / 5 Stars
              </span>
            </div>
          </div>

          {/* Mentor Feedback Textarea */}
          <div className="rtm-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="rtm-label" htmlFor="rtm-feedback-input">
                Mentor Review Feedback <span className="req">*</span>
              </label>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Quick suggestions below:</span>
            </div>

            {/* Feedback Presets */}
            <div className="rtm-presets-scroll">
              {FEEDBACK_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="rtm-preset-btn"
                  onClick={() => setFeedback(preset)}
                  disabled={isSubmitting}
                >
                  <span>"{preset.substring(0, 32)}..."</span>
                </button>
              ))}
            </div>

            <textarea
              id="rtm-feedback-input"
              className="rtm-textarea"
              placeholder="Provide constructive feedback, praise good implementation, point out areas for improvement, or recommend next steps..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              required
            />
            <span className="rtm-hint">
              This feedback will immediately reflect on the student's dashboard.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="rtm-footer">
            <button
              type="button"
              className="rtm-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rtm-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Publishing Feedback...</span>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Publish Feedback to Student</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MentorReviewTaskModal
