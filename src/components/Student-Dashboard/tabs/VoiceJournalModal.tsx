import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  type VoiceJournalEntry,
  type NewWordEntry,
  submitVoiceJournal,
  uploadVoiceRecording,
} from '../../../lib/student-tasks'
import { CustomAudioPlayer } from './CustomAudioPlayer'
import './VoiceJournalModal.css'

export interface VoiceJournalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newEntry: VoiceJournalEntry) => void
  currentUserId: string
  currentEmail: string
  currentStudentName: string
}

export const VoiceJournalModal: React.FC<VoiceJournalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
  currentEmail,
  currentStudentName,
}) => {
  // Step: 1 = Title, 2 = Voice, 3 = Words, 4 = Reflection
  const [currentStep, setCurrentStep] = useState<number>(1)

  // Form Fields
  const [articleTitle, setArticleTitle] = useState<string>('')
  const [newWords, setNewWords] = useState<NewWordEntry[]>([
    { id: '1', word: '', meaning: '' },
  ])
  const [keyLearnings, setKeyLearnings] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isCelebration, setIsCelebration] = useState<boolean>(false)
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0)

  // Audio Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Track mobile visual viewport (keyboard opening on iOS & Android) + lock body scroll
  useEffect(() => {
    if (!isOpen) {
      setKeyboardHeight(0)
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) {
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }

    const updateKeyboard = () => {
      if (!window.visualViewport) return
      const diff = window.innerHeight - window.visualViewport.height
      setKeyboardHeight(diff > 60 ? diff : 0)
    }

    vv.addEventListener('resize', updateKeyboard)
    vv.addEventListener('scroll', updateKeyboard)
    updateKeyboard()

    return () => {
      document.body.style.overflow = originalOverflow
      vv.removeEventListener('resize', updateKeyboard)
      vv.removeEventListener('scroll', updateKeyboard)
    }
  }, [isOpen])

  // Reset or cleanup on open/close
  useEffect(() => {
    if (!isOpen) {
      cleanupAudio()
      setCurrentStep(1)
      setIsCelebration(false)
      setErrorMsg(null)
    }
  }, [isOpen])

  const cleanupAudio = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  if (!isOpen) return null

  // -------------------------------------------------------------------------
  // Voice Recording
  // -------------------------------------------------------------------------
  const startRecording = async () => {
    setErrorMsg(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('Microphone recording is not supported in this browser. Please use a browser with microphone access.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      audioChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setRecordedBlob(audioBlob)
        const url = URL.createObjectURL(audioBlob)
        setRecordedAudioUrl(url)
      }

      recorder.start(250)
      setIsRecording(true)
      setIsPaused(false)
      setRecordingSeconds(0)

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } catch (err: any) {
      console.warn('Microphone error:', err)
      setErrorMsg('Could not access microphone. Please enable microphone permissions in your browser.')
      setIsRecording(false)
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    }
  }

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    setIsPaused(false)
  }

  const discardRecording = () => {
    cleanupAudio()
    if (recordedAudioUrl && recordedAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(recordedAudioUrl)
    }
    setRecordedBlob(null)
    setRecordedAudioUrl(null)
    setRecordingSeconds(0)
    setIsRecording(false)
    setIsPaused(false)
  }

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // -------------------------------------------------------------------------
  // Vocabulary
  // -------------------------------------------------------------------------
  const handleAddWord = () => {
    setNewWords((prev) => [
      ...prev,
      { id: String(Date.now()) + Math.random().toString(36).slice(2, 6), word: '', meaning: '' },
    ])
  }

  const handleRemoveWord = (id: string) => {
    setNewWords((prev) => prev.filter((w) => w.id !== id))
  }

  const handleWordChange = (id: string, field: 'word' | 'meaning', value: string) => {
    setNewWords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    )
  }

  // -------------------------------------------------------------------------
  // Step Navigation Validation
  // -------------------------------------------------------------------------
  const handleNextStep = () => {
    setErrorMsg(null)
    if (currentStep === 1) {
      if (!articleTitle.trim()) {
        setErrorMsg('Please enter the title or topic of what you read today.')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (isRecording) {
        setErrorMsg('Please finish your recording before moving to the next step.')
        return
      }
      if (!recordedBlob && !recordedAudioUrl) {
        setErrorMsg('Please record your voice reading before proceeding.')
        return
      }
      setCurrentStep(3)
    } else if (currentStep === 3) {
      const valid = newWords.some((w) => w.word.trim().length > 0 || w.meaning.trim().length > 0)
      if (!valid) {
        setErrorMsg('Please add at least one new word and its definition.')
        return
      }
      setCurrentStep(4)
    }
  }

  const handleBackStep = () => {
    setErrorMsg(null)
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  // -------------------------------------------------------------------------
  // Final Submission
  // -------------------------------------------------------------------------
  const handleFinishMission = async () => {
    setErrorMsg(null)
    if (!keyLearnings.trim()) {
      setErrorMsg('Please write what you learned from this article or paper.')
      return
    }

    const filteredWords = newWords
      .map((w) => ({ ...w, word: w.word.trim(), meaning: w.meaning.trim() }))
      .filter((w) => w.word.length > 0 || w.meaning.length > 0)

    try {
      setIsSubmitting(true)
      let finalAudioUrl = recordedAudioUrl || ''
      if (recordedBlob) {
        finalAudioUrl = await uploadVoiceRecording(recordedBlob, currentUserId)
      }

      const res = await submitVoiceJournal({
        student_id: currentUserId,
        student_email: currentEmail,
        student_name: currentStudentName,
        article_title: articleTitle.trim(),
        audio_url: finalAudioUrl,
        audio_duration: recordingSeconds,
        new_words: filteredWords,
        key_learnings: keyLearnings.trim(),
      })

      if (res.success && res.data) {
        setIsCelebration(true)
        setTimeout(() => {
          onSuccess(res.data!)
          onClose()
        }, 2200)
      } else {
        setErrorMsg(res.error || 'Failed to save voice journal. Please try again.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong while submitting your journal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="vj-modal-overlay"
      onClick={onClose}
      style={{
        bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px',
      }}
    >
      <div className="vj-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Drag Indicator */}
        <div className="vj-sheet-handle" />

        {/* Celebration State Overlay */}
        {isCelebration && (
          <div className="vj-celebration-overlay">
            <div className="vj-celebration-flame">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.5 6 6 9 6 13a6 6 0 0012 0c0-4-2.5-7-6-11z" fill="#ffffff" />
                <path d="M12 10c-1.5 2-2.5 3.5-2.5 5.5a2.5 2.5 0 005 0c0-2-1-3.5-2.5-5.5z" fill="#fde047" />
              </svg>
            </div>
            <h3 className="vj-celebration-title">Daily Streak Extended! 🔥</h3>
            <p className="vj-celebration-desc">
              Awesome job! Your 3-4 minute reading journal and learnings have been recorded.
            </p>
            <button
              type="button"
              className="vj-btn-claim"
              onClick={() => {
                onClose()
              }}
            >
              Continue to Dashboard 🚀
            </button>
          </div>
        )}

        {/* Modal Top Header */}
        <header className="vj-modal-header">
          <div className="vj-header-top-row">
            <span className="vj-quest-badge">⚡ Daily Quest</span>
            <button
              type="button"
              className="vj-close-btn"
              onClick={onClose}
              title="Close modal"
              aria-label="Close modal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* 4-Step Progress Indicator */}
          <div className="vj-steps-progress-row">
            <div className={`vj-step-pill ${currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : ''}`} />
            <div className={`vj-step-pill ${currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : ''}`} />
            <div className={`vj-step-pill ${currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : ''}`} />
            <div className={`vj-step-pill ${currentStep === 4 ? 'active' : ''}`} />
            <span className="vj-step-counter-text">Step {currentStep} of 4</span>
          </div>
        </header>

        {/* Modal Body */}
        <main className="vj-modal-body">
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '14px',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: ARTICLE TITLE */}
          {currentStep === 1 && (
            <div>
              <div className="vj-step-heading-group">
                <div className="vj-step-emoji">📖</div>
                <h3 className="vj-step-title">What did you read today?</h3>
                <p className="vj-step-subtitle">
                  Enter the title or core topic of the article or research paper.
                </p>
              </div>

              <div className="vj-input-card">
                <input
                  type="text"
                  className="vj-text-input"
                  placeholder="e.g. Attention Is All You Need — Transformer Architecture"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* STEP 2: VOICE RECORDING STUDIO */}
          {currentStep === 2 && (
            <div>
              <div className="vj-step-heading-group">
                <div className="vj-step-emoji">🎙️</div>
                <h3 className="vj-step-title">Record Your Voice Reading</h3>
                <p className="vj-step-subtitle">
                  Read out loud clearly. Aim for <strong>3 to 4 minutes</strong> of reading.
                </p>
              </div>

              <div className="vj-voice-stage">
                <div
                  className={`vj-voice-target-chip ${
                    recordingSeconds >= 180 ? 'target-reached' : ''
                  }`}
                >
                  {recordingSeconds >= 180
                    ? '🎯 3-4 Min Target Achieved!'
                    : '⏱️ Target: 3:00 - 4:00 Minutes'}
                </div>

                <div className={`vj-voice-clock ${isRecording ? 'recording' : ''}`}>
                  {formatTimer(recordingSeconds)}
                </div>

                {/* Oscillating soundwaves when recording */}
                {isRecording && !isPaused && (
                  <div className="vj-soundwave-bars">
                    <span className="vj-wave-bar" />
                    <span className="vj-wave-bar" />
                    <span className="vj-wave-bar" />
                    <span className="vj-wave-bar" />
                    <span className="vj-wave-bar" />
                    <span className="vj-wave-bar" />
                    <span className="vj-wave-bar" />
                  </div>
                )}

                {/* Orb Buttons */}
                {!isRecording && !recordedAudioUrl && (
                  <button
                    type="button"
                    className="vj-record-orb-btn"
                    onClick={startRecording}
                    title="Start Voice Recording"
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button>
                )}

                {isRecording && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {isPaused ? (
                        <button
                          type="button"
                          className="vj-pill-btn"
                          onClick={resumeRecording}
                          title="Resume Recording"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          Resume
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="vj-pill-btn"
                          onClick={pauseRecording}
                          title="Pause Recording"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                          Pause
                        </button>
                      )}

                      <button
                        type="button"
                        className="vj-stop-orb-btn"
                        onClick={stopRecording}
                        title="Stop Recording"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="5" y="5" width="14" height="14" rx="2" />
                        </svg>
                      </button>
                    </div>

                    <span style={{ fontSize: '0.78rem', color: isPaused ? '#fef08a' : '#f87171', fontWeight: 700 }}>
                      {isPaused ? 'Recording Paused — Tap Resume when ready' : 'Recording... Tap Square to Finish'}
                    </span>
                  </div>
                )}

                {recordedAudioUrl && !isRecording && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.08)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.14)' }}>
                      <CustomAudioPlayer src={recordedAudioUrl} duration={recordingSeconds} />
                    </div>
                    <button
                      type="button"
                      className="vj-pill-btn"
                      onClick={discardRecording}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      Re-record
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: NEW VOCABULARY */}
          {currentStep === 3 && (
            <div>
              <div className="vj-step-heading-group">
                <div className="vj-step-emoji">💡</div>
                <h3 className="vj-step-title">New Words Discovered</h3>
                <p className="vj-step-subtitle">
                  List new terms, scientific words, or concepts and what they mean.
                </p>
              </div>

              <div className="vj-vocab-card-list">
                {newWords.map((item, idx) => (
                  <div key={item.id} className="vj-vocab-card">
                    <div className="vj-vocab-fields">
                      <input
                        type="text"
                        className="vj-text-input vj-vocab-term-input"
                        placeholder={`Word ${idx + 1} (e.g. Heuristic)`}
                        value={item.word}
                        onChange={(e) => handleWordChange(item.id, 'word', e.target.value)}
                      />
                      <input
                        type="text"
                        className="vj-text-input"
                        placeholder="Meaning or context..."
                        value={item.meaning}
                        onChange={(e) => handleWordChange(item.id, 'meaning', e.target.value)}
                      />
                    </div>
                    {newWords.length > 1 && (
                      <button
                        type="button"
                        className="vj-delete-word-btn"
                        onClick={() => handleRemoveWord(item.id)}
                        title="Remove word"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="vj-add-word-btn"
                  onClick={handleAddWord}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  + Add Another Word
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: KEY LEARNINGS */}
          {currentStep === 4 && (
            <div>
              <div className="vj-step-heading-group">
                <div className="vj-step-emoji">🧠</div>
                <h3 className="vj-step-title">What did you learn?</h3>
                <p className="vj-step-subtitle">
                  Summarize key ideas, core findings, or your own personal reflection.
                </p>
              </div>

              <div className="vj-input-card">
                <textarea
                  className="vj-textarea-input"
                  placeholder="In this paper, I discovered that... The authors demonstrated... This is important because..."
                  value={keyLearnings}
                  onChange={(e) => setKeyLearnings(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}
        </main>

        {/* Modal Bottom Footer Navigation */}
        <footer className="vj-modal-footer">
          {currentStep > 1 && (
            <button
              type="button"
              className="vj-btn-back"
              onClick={handleBackStep}
              disabled={isSubmitting}
            >
              Back
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              className="vj-btn-next"
              onClick={handleNextStep}
              disabled={isRecording}
            >
              Continue &rarr;
            </button>
          ) : (
            <button
              type="button"
              className="vj-btn-finish"
              onClick={handleFinishMission}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving Quest...' : 'Complete Quest & Keep Streak 🔥'}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  )
}
