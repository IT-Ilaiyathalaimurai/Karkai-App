import React, { useState, useEffect } from 'react'
import {
  type MentorAssignedTask,
  submitStudentTask,
} from '../../lib/mentor-assigned-tasks'
import './StudentSubmitTaskModal.css'

export interface StudentSubmitTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: MentorAssignedTask | null
  onSubmitted?: (updatedTask: MentorAssignedTask) => void
}

export const StudentSubmitTaskModal: React.FC<StudentSubmitTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onSubmitted,
}) => {
  const [submissionLink, setSubmissionLink] = useState<string>('')
  const [submissionNotes, setSubmissionNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    if (task) {
      setSubmissionLink(task.submission_link || '')
      setSubmissionNotes(task.submission_notes || '')
      setErrorMsg('')
      setIsSubmitting(false)
    }
  }, [task, isOpen])

  if (!isOpen || !task) return null

  // Format deadline
  const formatDeadline = (isoStr?: string) => {
    if (!isoStr) return 'No deadline'
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(isoStr))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!submissionLink.trim() && !submissionNotes.trim()) {
      setErrorMsg('Please attach a reviewable link or add notes explaining your work.')
      return
    }

    // Basic URL check if link is entered
    if (submissionLink.trim()) {
      const link = submissionLink.trim()
      if (!link.startsWith('http://') && !link.startsWith('https://')) {
        setErrorMsg('Please enter a valid URL starting with https:// or http://')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const res = await submitStudentTask(
        task.id,
        submissionLink.trim(),
        submissionNotes.trim()
      )

      if (res.success && res.task) {
        if (onSubmitted) {
          onSubmitted(res.task)
        }
        onClose()
      } else {
        setErrorMsg(res.error || 'Failed to submit task. Please try again.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred during submission.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="submit-task-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div className="submit-task-card" role="dialog" aria-modal="true">
        <div className="stm-drag-handle" />

        {/* Header */}
        <div className="stm-header">
          <div className="stm-header-left">
            <div className="stm-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <h3 className="stm-header-title">Submit Task Work</h3>
              <p className="stm-header-subtitle">Attach reviewable link & submit for mentor feedback</p>
            </div>
          </div>

          <button
            type="button"
            className="stm-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="stm-body">
          {errorMsg && <div className="stm-error-banner">{errorMsg}</div>}

          {/* Task Info Recap */}
          <div className="stm-task-recap-box">
            <h4 className="stm-recap-headline">{task.title}</h4>
            <div className="stm-recap-mentor">
              <span>Assigned by {task.mentor_name}</span>
            </div>
            {task.description && (
              <p className="stm-recap-desc">{task.description}</p>
            )}
            <div className="stm-recap-deadline">
              ⏱️ Deadline: {formatDeadline(task.deadline)}
            </div>
          </div>

          {/* Reviewable Link */}
          <div className="stm-field">
            <label className="stm-label" htmlFor="stm-link-input">
              Reviewable Link (GitHub / Figma / Docs / Live App)
            </label>
            <input
              id="stm-link-input"
              type="url"
              className="stm-input"
              placeholder="https://github.com/your-username/your-repo"
              value={submissionLink}
              onChange={(e) => setSubmissionLink(e.target.value)}
              disabled={isSubmitting}
            />
            <span className="stm-hint">
              Your mentor will directly open this link to test and evaluate your work.
            </span>
          </div>

          {/* Submission Notes */}
          <div className="stm-field">
            <label className="stm-label" htmlFor="stm-notes-input">
              Submission Notes / Summary of Work
            </label>
            <textarea
              id="stm-notes-input"
              className="stm-textarea"
              placeholder="Explain what you implemented, key challenges solved, or specific areas you want feedback on..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Footer Actions */}
          <div className="stm-footer">
            <button
              type="button"
              className="stm-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="stm-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Submitting Work...</span>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>Submit to Mentor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StudentSubmitTaskModal
