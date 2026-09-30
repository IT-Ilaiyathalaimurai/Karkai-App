import React, { useState, useEffect, useCallback } from 'react'
import {
  type AcceptedConnection,
  getAcceptedConnections,
} from '../../lib/direct-messages'
import './ConversationsList.css'

export interface ConversationsListProps {
  currentUserId: string
  currentUserRole: 'student' | 'mentor'
  onSelectConnection: (connection: AcceptedConnection) => void
  selectedConnectionId?: string
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  currentUserId,
  currentUserRole,
  onSelectConnection,
  selectedConnectionId,
}) => {
  const [connections, setConnections] = useState<AcceptedConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchConnections = useCallback(() => {
    getAcceptedConnections(currentUserId, currentUserRole)
      .then((data) => {
        setConnections(data)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Error loading messages'
        setErrorMessage(msg)
        setIsLoading(false)
      })
  }, [currentUserId, currentUserRole])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const handleManualRefresh = () => {
    setIsLoading(true)
    setErrorMessage(null)
    fetchConnections()
  }

  // Format relative timestamp helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const isStudent = currentUserRole === 'student'

  return (
    <div className="conversations-container">
      {/* Header */}
      <header className="conversations-header">
        <div className="conversations-title-wrap">
          <div className="conversations-title-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="conversations-title">Direct Messages</h2>
        </div>

        <button
          type="button"
          className="conversations-refresh-btn"
          onClick={handleManualRefresh}
          disabled={isLoading}
          title="Refresh conversations"
          aria-label="Refresh conversations"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </header>

      {/* Body List */}
      <main className="conversations-list-body">
        {isLoading ? (
          <div className="conversations-loading-wrap">
            <div className="direct-chat-spinner" />
            <p style={{ marginTop: '12px', fontSize: '0.88rem' }}>Loading conversations...</p>
          </div>
        ) : errorMessage ? (
          <div className="conversations-error-wrap">
            <p style={{ color: '#dc2626', marginBottom: '10px' }}>{errorMessage}</p>
            <button
              type="button"
              className="conversations-refresh-btn"
              onClick={handleManualRefresh}
              style={{ width: 'auto', padding: '6px 14px' }}
            >
              Retry
            </button>
          </div>
        ) : connections.length === 0 ? (
          <div className="conversations-empty-wrap">
            <div className="conversations-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="conversations-empty-title">No conversations yet</h3>
            <p className="conversations-empty-desc">
              {isStudent
                ? 'When a mentor accepts your connection request, they will appear here and you can message them directly!'
                : 'When you accept student mentorship inquiries, they will appear here for 1-on-1 direct messaging!'}
            </p>
          </div>
        ) : (
          connections.map((conn) => {
            const initials =
              conn.partnerName
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'P'

            const hasUnread = conn.unreadCount > 0

            return (
              <button
                key={conn.connectionId}
                type="button"
                className={`conversation-card-item ${hasUnread ? 'has-unread' : ''} ${conn.connectionId === selectedConnectionId ? 'active' : ''}`}
                onClick={() => onSelectConnection(conn)}
                id={`conversation-item-${conn.connectionId}`}
              >
                {/* Avatar */}
                <div className="conversation-avatar-wrap">
                  <div className="conversation-avatar">
                    {conn.partnerAvatar ? (
                      <img src={conn.partnerAvatar} alt={conn.partnerName} />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <span className="conversation-online-badge" />
                </div>

                {/* Content */}
                <div className="conversation-card-content">
                  <div className="conversation-card-top-row">
                    <div className="conversation-name-badge-group">
                      <h4 className="conversation-partner-name">{conn.partnerName}</h4>
                      {conn.partnerRole === 'mentor' ? (
                        <>
                          <span className="partner-blue-check-badge" title="Official Verified Mentor">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="11" fill="#2563EB" />
                              <polyline points="7.5 12 10.5 15 16.5 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <span className="conversation-role-badge">Mentor</span>
                        </>
                      ) : (
                        <>
                          <span className="conversation-role-badge">Student</span>
                          <span className={`partner-wing-pill ${conn.partnerWing === 'School Wing' ? 'school' : 'senior'}`}>
                            {conn.partnerWing || 'Senior Wing'}
                          </span>
                        </>
                      )}
                    </div>
                    {conn.lastMessageTime && (
                      <span className="conversation-time">{formatTime(conn.lastMessageTime)}</span>
                    )}
                  </div>

                  <div className="conversation-card-bottom-row">
                    <p className="conversation-last-message">
                      {conn.lastMessage || 'No messages yet. Tap to start chatting.'}
                    </p>

                    {hasUnread && (
                      <span className="conversation-unread-badge">
                        {conn.unreadCount > 9 ? '9+' : conn.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </main>
    </div>
  )
}
