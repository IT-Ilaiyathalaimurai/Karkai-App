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
import { VoiceJournalModal } from './VoiceJournalModal'
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

  // Data State
  const [journals, setJournals] = useState<VoiceJournalEntry[]>([])
  const [streakInfo, setStreakInfo] = useState<StreakInfo>(() => calculateStreakInfo([]))
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Dedicated Recording Studio Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Load existing journals on mount & when returning to window
  const fetchJournals = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true)
      const data = await getStudentVoiceJournals(currentUserId, currentEmail)
      setJournals(data)
      setStreakInfo(calculateStreakInfo(data))
    } catch (err) {
      console.warn('Failed to load student voice journals:', err)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchJournals()

    // Automatically re-sync when user returns from Supabase or another tab
    const handleFocus = () => {
      fetchJournals(true)
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentUserId, currentEmail])

  // Handle successful submission from modal
  const handleModalSuccess = (newEntry: VoiceJournalEntry) => {
    const updated = [newEntry, ...journals.filter((j) => j.id !== newEntry.id)]
    setJournals(updated)
    setStreakInfo(calculateStreakInfo(updated))
  }

  // Today's entry if already submitted
  const todayDateStr = getLocalDateString(new Date())
  const todayEntry = journals.find((j) => j.task_date === todayDateStr)

  // Format today's date nicely: e.g. "Friday, 2 October"
  const formattedTodayDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date())

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
            onClick={() => fetchJournals(false)}
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
          3. TODAY'S DAILY TASK CARD (If not completed today)
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
            id="btn-launch-daily-journal-task"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Start Voice Journal
          </button>
        </section>
      )}

      {/* =========================================================================
          4. TODAY'S TASK COMPLETED SHOWCASE (High-End Completion Card)
          ========================================================================= */}
      {streakInfo.completedToday && todayEntry && (
        <section className="completed-showcase-container" aria-label="Today's Completed Task">
          {/* Header */}
          <div className="completed-status-header">
            <span className="completed-status-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Today's Task Completed
            </span>
            <span className="completed-streak-tag">
              <span>🔥</span>
              <span>Streak Kept!</span>
            </span>
          </div>

          {/* Paper Title */}
          <div className="completed-paper-title-box">
            <span className="completed-section-mini-label">Article / Research Paper</span>
            <h4 className="completed-paper-heading">📖 {todayEntry.article_title}</h4>
          </div>

          {/* Custom Audio Player */}
          {todayEntry.audio_url && (
            <div className="completed-audio-wrapper">
              <div className="completed-audio-header">
                <span>🎙️ Voice Recording</span>
                <span>Target 3–4 mins</span>
              </div>
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
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
              Tap "Start Voice Journal" above to complete your first reading task.
            </p>
          </div>
        ) : (
          journals.map((entry) => (
            <article key={entry.id} className="history-entry-card">
              <div className="history-entry-top">
                <h4 className="history-paper-title">📖 {entry.article_title}</h4>
                <span className="history-date-label">
                  {entry.task_date || entry.created_at.slice(0, 10)}
                </span>
              </div>

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
    </div>
  )
}

export default HomeTab
