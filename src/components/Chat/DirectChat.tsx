import React, { useState, useEffect, useRef } from 'react'
import {
  type DirectMessage,
  type AcceptedConnection,
  getMessages,
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
} from '../../lib/direct-messages'
import './DirectChat.css'

export interface DirectChatProps {
  connection: AcceptedConnection
  currentUserId: string
  currentUserName: string
  currentUserRole: 'student' | 'mentor'
  onBack: () => void
}

export const DirectChat: React.FC<DirectChatProps> = ({
  connection,
  currentUserId,
  onBack,
}) => {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // 1. Initial Load of Messages
  useEffect(() => {
    let isMounted = true

    const loadChatHistory = async () => {
      setIsLoading(true)
      try {
        const history = await getMessages(connection.connectionId)
        if (isMounted) {
          setMessages(history)
          setTimeout(() => scrollToBottom('auto'), 80)
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Could not load chat history. Check your connection.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadChatHistory()

    // Mark existing incoming messages as read
    markMessagesAsRead(connection.connectionId, currentUserId)

    return () => {
      isMounted = false
    }
  }, [connection.connectionId, currentUserId])

  // 2. Realtime Subscription
  useEffect(() => {
    const unsubscribe = subscribeToMessages(connection.connectionId, (incomingMsg) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        const exists = prev.some((m) => m.id === incomingMsg.id)
        if (exists) {
          return prev.map((m) => (m.id === incomingMsg.id ? incomingMsg : m))
        }
        return [...prev, incomingMsg]
      })

      // If message is addressed to current user, mark it as read immediately
      if (incomingMsg.receiver_id === currentUserId) {
        markMessagesAsRead(connection.connectionId, currentUserId)
      }

      setTimeout(() => scrollToBottom('smooth'), 50)
    })

    return () => {
      unsubscribe()
    }
  }, [connection.connectionId, currentUserId])

  // 3. Send Message Handler
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed || isSending) return

    setErrorMessage(null)
    setIsSending(true)
    setInputText('')

    try {
      const res = await sendMessage({
        connectionId: connection.connectionId,
        senderId: currentUserId,
        receiverId: connection.partnerId,
        messageText: trimmed,
      })

      if (res.message) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === res.message!.id)
          if (!exists) return [...prev, res.message!]
          return prev
        })
        setTimeout(() => scrollToBottom('smooth'), 50)
      }

      if (!res.success && res.error) {
        setErrorMessage(res.error)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending message'
      setErrorMessage(msg)
    } finally {
      setIsSending(false)
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  // Handle Enter key (Shift+Enter allows multi-line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Format timestamp helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const partnerInitials =
    connection.partnerName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P'

  return (
    <div className="direct-chat-container" id={`direct-chat-${connection.connectionId}`}>
      {/* Chat Top Header */}
      <header className="direct-chat-header">
        <div className="direct-chat-header-left">
          <button
            type="button"
            className="direct-chat-back-btn"
            onClick={onBack}
            title="Back to conversations"
            aria-label="Back to conversations"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="direct-chat-avatar-wrap">
            <div className="direct-chat-avatar">
              {connection.partnerAvatar ? (
                <img src={connection.partnerAvatar} alt={connection.partnerName} />
              ) : (
                <span>{partnerInitials}</span>
              )}
            </div>
            <span className="direct-chat-status-dot" title="Active on Karkai" />
          </div>

          <div className="direct-chat-header-meta">
            <div className="direct-chat-partner-name-row">
              <h3 className="direct-chat-partner-name">{connection.partnerName}</h3>
              {connection.partnerRole === 'mentor' ? (
                <>
                  <span className="mentor-blue-check-badge" title="Official Verified Mentor">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="11" fill="#2563EB" />
                      <polyline points="7.5 12 10.5 15 16.5 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="direct-chat-partner-role-pill">Mentor</span>
                </>
              ) : (
                <>
                  <span className="direct-chat-partner-role-pill">Student</span>
                  <span className={`direct-chat-wing-pill ${connection.partnerWing === 'School Wing' ? 'school' : 'senior'}`}>
                    {connection.partnerWing || 'Senior Wing'}
                  </span>
                </>
              )}
            </div>
            {connection.partnerRole === 'mentor' ? (
              <p className="direct-chat-partner-subtitle">
                {connection.partnerTitle || 'Verified Mentor'}
                {connection.partnerCompany ? ` • ${connection.partnerCompany}` : ''}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <main className="direct-chat-messages-body">
        {isLoading ? (
          <div className="direct-chat-loading-wrap">
            <div className="direct-chat-spinner" />
            <p style={{ marginTop: '10px', fontSize: '0.88rem' }}>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="direct-chat-empty-wrap">
            <div className="direct-chat-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h4 className="direct-chat-empty-title">Start your conversation</h4>
            <p className="direct-chat-empty-desc">
              You and {connection.partnerName} are now connected. Say hello and ask any questions!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSentByMe = msg.sender_id === currentUserId

            return (
              <div
                key={msg.id}
                className={`direct-message-row ${isSentByMe ? 'sent' : 'received'}`}
              >
                <div className="direct-message-bubble">
                  <div className="direct-message-text">{msg.message_text}</div>

                  <div className="direct-message-meta">
                    <span>{formatTime(msg.created_at)}</span>

                    {/* Read Receipts for sent messages */}
                    {isSentByMe && (
                      <span className={`direct-message-check ${msg.is_read ? 'read' : ''}`}>
                        {msg.isPending ? (
                          <span style={{ fontSize: '0.65rem' }}>⏳</span>
                        ) : msg.is_read ? (
                          // Double Blue Check (Read)
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 6 9 17 4 12" />
                            <polyline points="22 10 13 19 11 17" />
                          </svg>
                        ) : (
                          // Single Check (Sent / Delivered)
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Error message indicator if sending failed */}
      {errorMessage && (
        <div style={{
          padding: '6px 14px',
          background: '#fef2f2',
          borderTop: '1px solid #fee2e2',
          color: '#b91c1c',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 'bold' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Input Bar */}
      <footer className="direct-chat-input-bar">
        <textarea
          ref={inputRef}
          className="direct-chat-input-field"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
        />

        <button
          type="button"
          className="direct-chat-send-btn"
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isSending}
          title="Send message (Enter)"
          aria-label="Send message"
        >
          {isSending ? (
            <div className="direct-chat-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#fff' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </footer>
    </div>
  )
}
