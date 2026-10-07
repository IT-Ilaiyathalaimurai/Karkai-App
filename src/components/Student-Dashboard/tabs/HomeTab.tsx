import React, { useState, useEffect } from 'react'
import type { StudentProfileData } from '../../Students-Onboarding'
import type { UserProfile } from '../../SignIn-Screen'
import {
  type VoiceJournalEntry,
  type StreakInfo,
  getStudentVoiceJournals,
  calculateStreakInfo,
  getLocalDateString,
} from '../../../lib/student-tasks'
import {
  type MentorAssignedTask,
  getTasksForStudent,
} from '../../../lib/mentor-assigned-tasks'
import { VoiceJournalModal } from './VoiceJournalModal'
import { StudentSubmitTaskModal } from '../StudentSubmitTaskModal'
import { CustomAudioPlayer } from './CustomAudioPlayer'
import './HomeTab.css'

export interface HomeTabProps {
  studentData?: StudentProfileData | null
  user?: UserProfile | null
}

export const HomeTab: React.FC<HomeTabProps> = ({ studentData, user }) => {
  const studentObj = studentData as unknown as Record<string, unknown> | null
  const currentUserId =
    user?.id ||
    (studentObj && 'userId' in studentObj ? String(studentObj.userId) : '') ||
    'student'
  const currentEmail =
    user?.email ||
    (studentObj && 'email' in studentObj ? String(studentObj.email) : '')
  const currentStudentName = studentData?.fullName || user?.name || 'Student'

  // Voice Journal Data State
  const [journals, setJournals] = useState<VoiceJournalEntry[]>([])
  const [streakInfo, setStreakInfo] = useState<StreakInfo>(() => calculateStreakInfo([]))
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Mentor Assigned Tasks State
  const [mentorTasks, setMentorTasks] = useState<MentorAssignedTask[]>([])
  const [selectedTaskForSubmit, setSelectedTaskForSubmit] = useState<MentorAssignedTask | null>(null)

  // Fetch Voice Journals & Mentor Tasks
  const fetchAllData = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true)
      const [journalData, tasksData] = await Promise.all([
        getStudentVoiceJournals(currentUserId, currentEmail),
        getTasksForStudent(currentUserId, currentStudentName),
      ])
      setJournals(journalData)
      setStreakInfo(calculateStreakInfo(journalData))
      setMentorTasks(tasksData)
    } catch (err) {
      console.warn('Failed to load student data:', err)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()

    const handleFocus = () => {
      fetchAllData(true)
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentUserId, currentEmail, currentStudentName])

  // Handle successful voice journal submission
  const handleModalSuccess = (newEntry: VoiceJournalEntry) => {
    const updated = [newEntry, ...journals.filter((j) => j.id !== newEntry.id)]
    setJournals(updated)
    setStreakInfo(calculateStreakInfo(updated))
  }

  // Today's voice journal entry
  const todayDateStr = getLocalDateString(new Date())
  const todayEntry = journals.find((j) => j.task_date === todayDateStr)

  // Format today's date
  const formattedTodayDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date())

  // Format deadline for task
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
    <div className="student-home-tab">
      {/* =========================================================================
          1. COMPACT TOP GREETING & STREAK BADGE
          ========================================================================= */}
      <header className="home-header-row">
        <div className="home-greeting-col">
          <span className="home-today-date">{formattedTodayDate}</span>
          <h2 className="home-student-name">Welcome, {currentStudentName.split(' ')[0]} 👋</h2>
        </div>

        <div className="home-header-actions">
          <div className={`home-streak-pill ${streakInfo.currentStreak > 0 ? 'is-active' : ''}`}>
            <span>🔥</span>
            <span>{streakInfo.currentStreak} {streakInfo.currentStreak === 1 ? 'Day' : 'Days'}</span>
          </div>

          <button
            type="button"
            className="home-sync-btn"
            onClick={() => fetchAllData(false)}
            title="Refresh daily task and streak from backend"
            aria-label="Refresh daily task and streak"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. MINIMALIST STREAK & WEEKLY TRACKER
          ========================================================================= */}
      <section className="streak-tracker-card" aria-label="Weekly streak tracker">
        <div className="streak-tracker-top">
          <div className="streak-flame-headline">
            <div className="streak-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.5 6 6 9 6 13a6 6 0 0012 0c0-4-2.5-7-6-11z" fill="#ffffff" />
                <path d="M12 10c-1.5 2-2.5 3.5-2.5 5.5a2.5 2.5 0 005 0c0-2-1-3.5-2.5-5.5z" fill="#fef08a" />
              </svg>
            </div>
            <div className="streak-text-group">
              <h3 className="streak-title-count">
                {streakInfo.currentStreak} Day Reading Streak
              </h3>
              <p className="streak-status-hint">
                {streakInfo.completedToday
                  ? "Today's journal completed! Streak maintained."
                  : 'Record today’s voice journal to keep your streak.'}
              </p>
            </div>
          </div>

          <span className="streak-records-pill">
            🏆 Best: {streakInfo.bestStreak}d
          </span>
        </div>

        {/* 7-Day Clean Week Strip */}
        <div className="week-strip-row">
          {streakInfo.weekDaysStatus.map((day, idx) => (
            <div
              key={`${day.dateStr}-${idx}`}
              className={`week-day-cell ${day.isCompleted ? 'is-completed' : ''} ${
                day.isToday ? 'is-today' : ''
              }`}
            >
              <span className="day-cell-letter">{day.dayName}</span>
              <div className="day-cell-number">
                {day.isCompleted ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  day.dayNumber
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          3. MENTOR ASSIGNED TASKS (If any mentor has assigned tasks)
          ========================================================================= */}
      {mentorTasks.length > 0 && (
        <section className="student-mentor-tasks-section" aria-label="Tasks Assigned by Mentors">
          <div className="student-tasks-section-header">
            <div className="student-tasks-section-title-wrap">
              <h3 className="student-tasks-section-title">Tasks Assigned by Mentors</h3>
              <span className="student-tasks-badge-count">
                {mentorTasks.length} {mentorTasks.length === 1 ? 'Task' : 'Tasks'}
              </span>
            </div>
          </div>

          {mentorTasks.map((task) => {
            const deadlineStatus = getDeadlineStatus(task)
            const mentorInitials =
              task.mentor_name
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'M'

            return (
              <article key={task.id} className="student-task-card">
                {/* Top Row: Mentor Avatar & Status */}
                <div className="student-task-top-row">
                  <div className="student-task-mentor-info">
                    <div className="student-task-mentor-avatar">
                      <span>{mentorInitials}</span>
                    </div>
                    <div className="student-task-mentor-texts">
                      <h4 className="student-task-mentor-name">{task.mentor_name}</h4>
                      <p className="student-task-assigned-by">Mentor Task</p>
                    </div>
                  </div>

                  <div>
                    {task.status === 'assigned' && (
                      <span className="student-task-status-badge assigned">
                        ⏱️ Action Required
                      </span>
                    )}
                    {task.status === 'submitted' && (
                      <span className="student-task-status-badge submitted">
                        ● Submitted (Awaiting Review)
                      </span>
                    )}
                    {task.status === 'reviewed' && (
                      <span className="student-task-status-badge reviewed">
                        ✓ Feedback Received
                      </span>
                    )}
                  </div>
                </div>

                {/* Task Details */}
                <div className="student-task-body">
                  <h4 className="student-task-title">{task.title}</h4>
                  {task.description && (
                    <p className="student-task-desc">{task.description}</p>
                  )}
                  <span
                    className={`student-task-deadline-pill ${
                      deadlineStatus.isOverdue ? 'overdue' : ''
                    }`}
                  >
                    {deadlineStatus.label}
                  </span>
                </div>

                {/* If submitted: display student submission summary */}
                {task.status === 'submitted' && (
                  <div className="student-submission-summary">
                    <span className="student-submission-summary-header">Your Submitted Work:</span>
                    {task.submission_link && (
                      <a
                        href={task.submission_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="student-submission-link-pill"
                      >
                        <span>🔗 {task.submission_link}</span>
                        <span>↗</span>
                      </a>
                    )}
                    {task.submission_notes && (
                      <div style={{ fontSize: '12.5px', color: '#475569', fontStyle: 'italic' }}>
                        "{task.submission_notes}"
                      </div>
                    )}

                    <button
                      type="button"
                      className="student-task-edit-submission-btn"
                      onClick={() => setSelectedTaskForSubmit(task)}
                    >
                      Update Submission
                    </button>
                  </div>
                )}

                {/* If reviewed: show mentor feedback & star rating! */}
                {task.status === 'reviewed' && (
                  <div className="student-mentor-feedback-card">
                    <div className="mentor-feedback-card-header">
                      <span className="mentor-feedback-card-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Mentor Review & Feedback
                      </span>

                      {task.rating && (
                        <span className="mentor-feedback-rating">
                          {'★'.repeat(task.rating)} {task.rating}/5
                        </span>
                      )}
                    </div>

                    {task.feedback && (
                      <p className="mentor-feedback-card-text">
                        "{task.feedback}"
                      </p>
                    )}

                    <div style={{ fontSize: '11px', color: '#166534', marginTop: 2 }}>
                      Evaluated on {task.reviewed_at ? new Date(task.reviewed_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                )}

                {/* If assigned: Action Button to Submit Work */}
                {task.status === 'assigned' && (
                  <button
                    type="button"
                    className="student-task-submit-btn"
                    onClick={() => setSelectedTaskForSubmit(task)}
                    id={`submit-work-btn-${task.id}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    <span>Submit Work & Attach Review Link</span>
                  </button>
                )}
              </article>
            )
          })}
        </section>
      )}

      {/* =========================================================================
          4. TODAY'S DAILY VOICE JOURNAL TASK
          ========================================================================= */}
      {!streakInfo.completedToday && (
        <section className="daily-task-hero-card" aria-label="Today's Daily Task">
          <div className="task-hero-tag-row">
            <span className="task-hero-badge">Daily Task</span>
            <span className="task-hero-time-target">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Target: 3 - 4 min voice
            </span>
          </div>

          <div className="task-hero-content">
            <h3 className="task-hero-title">Research Paper Voice Journal</h3>
            <p className="task-hero-description">
              Read an article or research paper today. Record <strong>3 to 4 minutes</strong> of your voice reading, capture new vocabulary, and log your takeaways.
            </p>
          </div>

          <div className="task-hero-features-row">
            <span className="task-feature-chip">🎙️ Microphone Reading</span>
            <span className="task-feature-chip">💡 New Vocabulary</span>
            <span className="task-feature-chip">🧠 Key Takeaways</span>
          </div>

          <button
            type="button"
            className="btn-launch-task"
            onClick={() => setIsModalOpen(true)}
            id="student-launch-voice-task-btn"
          >
            <div className="btn-mic-icon-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <span>Start Reading & Recording</span>
          </button>
        </section>
      )}

      {/* Completed Showcase if voice journal finished today */}
      {streakInfo.completedToday && todayEntry && (
        <section className="completed-showcase-container" aria-label="Completed Journal Summary">
          <div className="completed-showcase-badge-row">
            <span className="completed-check-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Journal Completed
            </span>
            <span className="completed-time-tag">
              ⏱️ {Math.round(todayEntry.audio_duration / 60)} min recording
            </span>
          </div>

          <h3 className="completed-paper-heading">{todayEntry.article_title}</h3>

          {todayEntry.audio_url && (
            <div className="completed-audio-wrapper">
              <CustomAudioPlayer
                src={todayEntry.audio_url}
                duration={todayEntry.audio_duration}
              />
            </div>
          )}

          {/* Vocabulary Review */}
          {todayEntry.new_words && todayEntry.new_words.length > 0 && (
            <div className="completed-vocab-section">
              <span className="completed-section-mini-label">Vocabulary Learned ({todayEntry.new_words.length})</span>
              <div className="completed-words-grid">
                {todayEntry.new_words.map((w, idx) => (
                  <div key={w.id || idx} className="completed-word-item">
                    <span className="completed-word-term">{w.word}</span>
                    <span className="completed-word-meaning">{w.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learnings Reflection */}
          <div className="completed-learnings-section">
            <span className="completed-section-mini-label">Key Insights & Takeaways</span>
            <blockquote className="completed-quote-box">
              {todayEntry.key_learnings}
            </blockquote>
          </div>

          {/* Record Another Entry CTA */}
          <button
            type="button"
            className="btn-secondary-record"
            onClick={() => setIsModalOpen(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Record Another Journal Today
          </button>
        </section>
      )}

      {/* =========================================================================
          5. PAST JOURNAL HISTORY FEED
          ========================================================================= */}
      <section className="history-feed-section" aria-label="Journal History">
        <div className="history-feed-header">
          <h3 className="history-feed-title">My Voice Journal History</h3>
          <span className="history-count-badge">{journals.length} {journals.length === 1 ? 'Entry' : 'Entries'}</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
            Loading your voice journals...
          </div>
        ) : journals.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 16px',
              background: '#ffffff',
              borderRadius: '20px',
              border: '1.5px dashed #e2e8f0',
              color: '#64748b',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎙️</div>
            <p style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '0.96rem' }}>
              No Voice Journals yet
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem' }}>
              Tap 'Start Reading & Recording' above to log your first entry and kick off your streak!
            </p>
          </div>
        ) : (
          journals.map((entry) => (
            <article key={entry.id} className="history-entry-card">
              <div className="history-card-top-row">
                <span className="history-date-pill">
                  {new Date(entry.task_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="history-duration-tag">
                  ⏱️ {Math.round(entry.audio_duration / 60)} min
                </span>
              </div>

              <h4 className="history-article-title">{entry.article_title}</h4>

              {entry.audio_url && (
                <CustomAudioPlayer
                  src={entry.audio_url}
                  duration={entry.audio_duration}
                />
              )}

              {entry.new_words && entry.new_words.length > 0 && (
                <div className="history-words-pills">
                  {entry.new_words.map((w, idx) => (
                    <div key={w.id || idx} className="history-word-tag">
                      <strong>{w.word}:</strong>
                      <span>{w.meaning}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="history-learnings-quote">
                <strong>Takeaways: </strong>
                {entry.key_learnings}
              </p>
            </article>
          ))
        )}
      </section>

      {/* =========================================================================
          6. DEDICATED DISTRACTION-FREE VOICE JOURNAL MODAL
          ========================================================================= */}
      <VoiceJournalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        currentUserId={currentUserId}
        currentEmail={currentEmail}
        currentStudentName={currentStudentName}
      />

      {/* =========================================================================
          7. STUDENT SUBMIT MENTOR TASK MODAL
          ========================================================================= */}
      <StudentSubmitTaskModal
        isOpen={Boolean(selectedTaskForSubmit)}
        onClose={() => setSelectedTaskForSubmit(null)}
        task={selectedTaskForSubmit}
        onSubmitted={(updatedTask) => {
          setMentorTasks((prev) =>
            prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
          )
          setSelectedTaskForSubmit(null)
        }}
      />
    </div>
  )
}

export default HomeTab
