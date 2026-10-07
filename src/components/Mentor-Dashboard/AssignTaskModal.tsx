import React, { useState, useEffect } from 'react'
import {
  type ConnectedMentee,
  type MentorAssignedTask,
  getConnectedStudentsForMentor,
  assignTask,
} from '../../lib/mentor-assigned-tasks'
import './AssignTaskModal.css'

export interface AssignTaskModalProps {
  isOpen: boolean
  onClose: () => void
  mentorId: string
  mentorName: string
  onTaskAssigned?: (task: MentorAssignedTask) => void
}

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  isOpen,
  onClose,
  mentorId,
  mentorName,
  onTaskAssigned,
}) => {
  const [mentees, setMentees] = useState<ConnectedMentee[]>([])
  const [selectedMentee, setSelectedMentee] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [deadline, setDeadline] = useState<string>('')
  const [activeDeadlinePreset, setActiveDeadlinePreset] = useState<number>(3) // days
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Compute deadline given days offset
  const computeDeadline = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(23, 59, 0, 0)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${mins}`
  }

  const applyDeadlinePreset = (days: number) => {
    setActiveDeadlinePreset(days)
    setDeadline(computeDeadline(days))
  }

  // Load connected mentees on modal open
  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    const loadMentees = async () => {
      try {
        const list = await getConnectedStudentsForMentor(mentorId, mentorName)
        if (isMounted) {
          setMentees(list)
          if (list.length > 0) {
            setSelectedMentee(list[0].student_id)
          }
        }
      } catch (err) {
        console.warn('Failed to load mentees:', err)
      }
    }

    loadMentees()
    applyDeadlinePreset(3)
    setTitle('')
    setDescription('')
    setErrorMsg('')
    setIsSubmitting(false)

    return () => {
      isMounted = false
    }
  }, [isOpen, mentorId, mentorName])

  if (!isOpen) return null

  // Calculate live deadline summary
  const deadlineSummary = (() => {
    if (!deadline) return null
    try {
      const target = new Date(deadline)
      const now = new Date()
      const diffMs = target.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      const formatted = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(target)

      if (diffDays <= 0) {
        return { label: `Due today at ${target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, urgency: 'urgent' }
      }
      if (diffDays === 1) {
        return { label: `Due tomorrow • ${formatted}`, urgency: 'warning' }
      }
      return { label: `Due in ${diffDays} days • ${formatted}`, urgency: 'normal' }
    } catch {
      return null
    }
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!selectedMentee) {
      setErrorMsg('Please select a student to assign this task to.')
      return
    }

    if (!title.trim()) {
      setErrorMsg('Please enter a task title.')
      return
    }

    if (!deadline) {
      setErrorMsg('Please choose a deadline date and time.')
      return
    }

    const chosenMentee = mentees.find((m) => m.student_id === selectedMentee)
    if (!chosenMentee) {
      setErrorMsg('Selected student could not be verified in your mentee list.')
      return
    }

    setIsSubmitting(true)
    try {
      const deadlineISO = new Date(deadline).toISOString()

      const res = await assignTask({
        connection_id: chosenMentee.connection_id,
        mentor_id: mentorId,
        mentor_name: mentorName,
        student_id: chosenMentee.student_id,
        student_name: chosenMentee.student_name,
        title: title.trim(),
        description: description.trim(),
        deadline: deadlineISO,
      })

      if (res.success && res.task) {
        if (onTaskAssigned) {
          onTaskAssigned(res.task)
        }
        onClose()
      } else {
        setErrorMsg(res.error || 'Failed to assign task. Please try again.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error while assigning task.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedStudentObj = mentees.find((m) => m.student_id === selectedMentee)

  return (
    <div
      className="assign-task-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose()
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="assign-task-card">
        <div className="atm-drag-handle" />

        {/* Animated Header */}
        <div className="atm-header">
          <div className="atm-header-left">
            <div className="atm-header-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div className="atm-header-titles">
              <div className="atm-header-badge">
                <span className="atm-pulse-dot" />
                <span>1-on-1 Task Assignment</span>
              </div>
              <h3 className="atm-header-title">Assign Task to Student</h3>
              <p className="atm-header-subtitle">Set milestone goals, requirements & reviewable deadline</p>
            </div>
          </div>

          <button
            type="button"
            className="atm-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="atm-body">
          {errorMsg && (
            <div className="atm-error-banner" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Choose Connected Mentee */}
          <div className="atm-field">
            <div className="atm-label-row">
              <label className="atm-label" htmlFor="atm-student-select">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Select Connected Mentee</span>
                <span className="req">*</span>
              </label>
              {mentees.length > 0 && (
                <span className="atm-badge-counter">{mentees.length} Connected</span>
              )}
            </div>

            {mentees.length === 0 ? (
              <div className="atm-no-mentees-card">
                <div className="no-mentees-icon-ring">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="no-mentees-text-col">
                  <strong>No Connected Mentees Yet</strong>
                  <p>Accept a student's mentorship request in the <strong>Requests Tab</strong> first to assign individual tasks.</p>
                </div>
              </div>
            ) : (
              <div className="atm-mentee-select-container">
                {/* Visual Mentee Chips */}
                <div className="atm-mentee-chips-row">
                  {mentees.map((m) => {
                    const isSelected = selectedMentee === m.student_id
                    const initials =
                      m.student_name
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'S'

                    return (
                      <button
                        key={m.student_id}
                        type="button"
                        className={`atm-mentee-chip ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedMentee(m.student_id)}
                        disabled={isSubmitting}
                      >
                        <div className="mentee-chip-avatar">
                          <span>{initials}</span>
                        </div>
                        <div className="mentee-chip-info">
                          <span className="mentee-chip-name">{m.student_name}</span>
                          <span className="mentee-chip-role">Mentee</span>
                        </div>
                        {isSelected && (
                          <div className="mentee-chip-check">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Accessible Select Fallback for large lists */}
                {mentees.length > 4 && (
                  <select
                    id="atm-student-select"
                    className="atm-select"
                    value={selectedMentee}
                    onChange={(e) => setSelectedMentee(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {mentees.map((m) => (
                      <option key={m.student_id} value={m.student_id}>
                        {m.student_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Task Title */}
          <div className="atm-field">
            <div className="atm-label-row">
              <label className="atm-label" htmlFor="atm-title-input">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Task Title</span>
                <span className="req">*</span>
              </label>
              <span className={`atm-char-counter ${title.length > 100 ? 'near-limit' : ''}`}>
                {title.length}/120
              </span>
            </div>
            <div className="atm-input-wrapper">
              <input
                id="atm-title-input"
                type="text"
                className="atm-input"
                placeholder="e.g. Build Mobile-First Navigation with Drawer Animation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                maxLength={120}
                required
              />
            </div>
          </div>

          {/* Section 3: Task Instructions & Requirements */}
          <div className="atm-field">
            <div className="atm-label-row">
              <label className="atm-label" htmlFor="atm-desc-input">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>Instructions & Review Criteria</span>
              </label>
              <span className="atm-label-hint">What the student will see</span>
            </div>
            <textarea
              id="atm-desc-input"
              className="atm-textarea"
              placeholder="Detail specific requirements, reviewable deliverables (GitHub repo, live URL, Figma link), and success criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          {/* Section 4: Submission Deadline */}
          <div className="atm-field">
            <div className="atm-label-row">
              <label className="atm-label" htmlFor="atm-deadline-input">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Submission Deadline</span>
                <span className="req">*</span>
              </label>
              <span className="atm-label-hint">Quick Presets</span>
            </div>

            {/* Quick Presets Row */}
            <div className="atm-presets-row">
              {[
                { label: '+1 Day', days: 1 },
                { label: '+3 Days', days: 3 },
                { label: '+5 Days', days: 5 },
                { label: '+1 Week', days: 7 },
                { label: '+2 Weeks', days: 14 },
              ].map((preset) => {
                const isActive = activeDeadlinePreset === preset.days
                return (
                  <button
                    key={preset.days}
                    type="button"
                    className={`atm-preset-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => applyDeadlinePreset(preset.days)}
                    disabled={isSubmitting}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            {/* Datetime Input with Live Dynamic Preview */}
            <div className="atm-datetime-box">
              <input
                id="atm-deadline-input"
                type="datetime-local"
                className="atm-datetime-input"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value)
                  setActiveDeadlinePreset(-1)
                }}
                disabled={isSubmitting}
                required
              />

              {deadlineSummary && (
                <div className={`atm-deadline-live-badge ${deadlineSummary.urgency}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{deadlineSummary.label}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="atm-footer">
            <button
              type="button"
              className="atm-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="atm-submit-btn"
              disabled={isSubmitting || mentees.length === 0}
            >
              {isSubmitting ? (
                <>
                  <span className="atm-spinner" />
                  <span>Assigning to {selectedStudentObj?.student_name.split(' ')[0] || 'Student'}...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>Assign Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
