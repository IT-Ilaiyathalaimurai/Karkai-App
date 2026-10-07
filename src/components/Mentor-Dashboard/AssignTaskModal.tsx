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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Compute default deadline (3 days from now at 23:59)
  const getDefaultDeadline = () => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    d.setHours(23, 59, 0, 0)
    // Format YYYY-MM-DDTHH:mm
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${mins}`
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
    setDeadline(getDefaultDeadline())
    setTitle('')
    setDescription('')
    setErrorMsg('')
    setIsSubmitting(false)

    return () => {
      isMounted = false
    }
  }, [isOpen, mentorId, mentorName])

  if (!isOpen) return null

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
      setErrorMsg('Selected student could not be verified.')
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

  return (
    <div
      className="assign-task-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div className="assign-task-card" role="dialog" aria-modal="true">
        <div className="atm-drag-handle" />

        {/* Header */}
        <div className="atm-header">
          <div className="atm-header-left">
            <div className="atm-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div>
              <h3 className="atm-header-title">Assign Task to Student</h3>
              <p className="atm-header-subtitle">Individual assignment with deadline & reviewable link</p>
            </div>
          </div>

          <button
            type="button"
            className="atm-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="atm-body">
          {errorMsg && <div className="atm-error-banner">{errorMsg}</div>}

          {/* Select Mentee */}
          <div className="atm-field">
            <label className="atm-label" htmlFor="atm-student-select">
              Connected Student <span className="req">*</span>
            </label>
            {mentees.length === 0 ? (
              <div className="atm-no-mentees-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>
                  You don't have any connected mentees yet. Once you accept a student's mentorship request in the <strong>Requests Tab</strong>, you can assign individual tasks here.
                </span>
              </div>
            ) : (
              <select
                id="atm-student-select"
                className="atm-select"
                value={selectedMentee}
                onChange={(e) => setSelectedMentee(e.target.value)}
                disabled={isSubmitting}
                required
              >
                {mentees.map((m) => (
                  <option key={m.student_id} value={m.student_id}>
                    {m.student_name}
                  </option>
                ))}
              </select>
            )}
            <span className="atm-hint">Task will be directly assigned to this student.</span>
          </div>

          {/* Task Title */}
          <div className="atm-field">
            <label className="atm-label" htmlFor="atm-title-input">
              Task Title <span className="req">*</span>
            </label>
            <input
              id="atm-title-input"
              type="text"
              className="atm-input"
              placeholder="e.g. Build Responsive Portfolio Navbar"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              maxLength={120}
              required
            />
          </div>

          {/* Task Instructions */}
          <div className="atm-field">
            <label className="atm-label" htmlFor="atm-desc-input">
              Task Instructions & Requirements
            </label>
            <textarea
              id="atm-desc-input"
              className="atm-textarea"
              placeholder="Specify requirements, what to practice, expected outputs, or guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={4}
            />
            <span className="atm-hint">The student will see these instructions along with the deadline.</span>
          </div>

          {/* Deadline */}
          <div className="atm-field">
            <label className="atm-label" htmlFor="atm-deadline-input">
              Submission Deadline <span className="req">*</span>
            </label>
            <input
              id="atm-deadline-input"
              type="datetime-local"
              className="atm-input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <span className="atm-hint">Student must submit their work and review link before this deadline.</span>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                    <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                  </svg>
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <polyline points="20 6 9 17 4 12" />
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

export default AssignTaskModal
