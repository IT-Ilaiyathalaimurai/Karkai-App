import React, { useState, useEffect } from 'react'
import type { MentorProfileData } from '../Mentors-Onboarding'
import type { UserProfile } from '../SignIn-Screen'
import karkaiLogoImg from '../../assets/Karkai_Logo.png'
import { HomeTab, RequestsTab, InboxStudentTasksTab, ProfileTab } from './tabs'
import { MentorProfileModal } from './MentorProfileModal'
import { getUnreadCounts, type AcceptedConnection } from '../../lib/direct-messages'
import type { MentorMenteeConnection } from '../../lib/mentor-mentee-connections'
import './MentorDashboard.css'

export type MentorDashboardTab = 'home' | 'requests' | 'inbox-tasks' | 'profile'

export interface MentorDashboardProps {
  mentorData: MentorProfileData | null
  user: UserProfile | null
  onSignOut?: () => void
  onEditProfile?: () => void
}

export const MentorDashboard: React.FC<MentorDashboardProps> = ({
  mentorData,
  user,
  onSignOut,
  onEditProfile,
}) => {
  const [activeTab, setActiveTab] = useState<MentorDashboardTab>('home')
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [activeChatConnection, setActiveChatConnection] = useState<AcceptedConnection | null>(null)
  const [unreadTotal, setUnreadTotal] = useState<number>(0)

  const currentUserId = mentorData?.id || mentorData?.userId || user?.id || ''

  useEffect(() => {
    if (!currentUserId) return
    const fetchUnread = async () => {
      try {
        const counts = await getUnreadCounts(currentUserId)
        setUnreadTotal(counts.total)
      } catch (e) {
        console.warn('Failed to fetch unread message count for mentor:', e)
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 15000)
    return () => clearInterval(interval)
  }, [currentUserId])

  const handleOpenChat = (conn: MentorMenteeConnection) => {
    const formatted: AcceptedConnection = {
      connectionId: String(conn.id),
      id: String(conn.id),
      partnerId: String(conn.user_id || conn.id),
      partnerName: String(conn.student_name || 'Student Learner'),
      partnerRole: 'student',
      partnerWing: 'Senior Wing',
      partnerTitle: 'Senior Wing Student',
      partnerAvatar: null,
      partnerCompany: 'Senior Wing',
      status: 'accepted',
      unreadCount: 0,
    }
    setActiveChatConnection(formatted)
    setActiveTab('inbox-tasks')
  }

  const displayName = mentorData?.fullName || user?.name || 'Mentor'
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'M'

  const isVerified = Boolean(mentorData?.isVerified)
  const isRejected = !isVerified && mentorData?.verificationStatus === 'rejected'

  return (
    <div className="mentor-dashboard-root">
      <div className="mentor-mobile-shell">
        {/* =========================================================================
            TOP NAVIGATION / HEADER BAR (Mobile PWA)
            ========================================================================= */}
        <header className="mentor-topbar">
          {/* Brand & Wing Info */}
          <div className="mentor-topbar-brand">
            <img src={karkaiLogoImg} alt="Karkai" className="mentor-topbar-logo" />
            <span className="mentor-wing-pill">
              Mentor Wing
            </span>
            {isVerified ? (
              <span className="mentor-verified-badge verified" title="Official Mentor Verification Active - Blue Badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#2563EB" />
                  <polyline points="8 12 11 15 16 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Verified</span>
              </span>
            ) : isRejected ? (
              <span className="mentor-verified-badge rejected" title="Verification Rejected by Admin">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>Rejected</span>
              </span>
            ) : (
              <span className="mentor-verified-badge queued" title="Verification Process Queued with Admin">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Queued</span>
              </span>
            )}
          </div>

          {/* Top Right Section: Touch to view profile & Sign Out */}
          <div className="mentor-topbar-right">
            <button
              type="button"
              className="mentor-topbar-profile-trigger"
              onClick={() => {
                // If on desktop or mobile, switch tab to profile or open modal
                setActiveTab('profile')
              }}
              title="Touch to view Mentor Profile"
              aria-label="View Mentor Profile"
              id="mentor-topbar-profile-btn"
            >
              <div className="mentor-topbar-profile-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={displayName} />
                ) : (
                  <span>{initials}</span>
                )}
                <span className="mentor-topbar-online-dot" />
              </div>
              <div className="mentor-topbar-profile-label">
                <span className="mentor-topbar-name">{displayName.split(' ')[0]}</span>
                <span className="mentor-topbar-hint">Profile</span>
              </div>
            </button>

            {onSignOut && (
              <button
                type="button"
                className="mentor-topbar-signout-btn"
                onClick={onSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                id="mentor-topbar-signout-btn"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* =========================================================================
            MAIN CONTENT AREA: 4 Tabs
            ========================================================================= */}
        <main className="mentor-main-content">
          {activeTab === 'home' && (
            <HomeTab
              mentorData={mentorData}
              user={user}
              onGiveVerificationAgain={onEditProfile}
              onViewProfile={() => setActiveTab('profile')}
            />
          )}
          {activeTab === 'requests' && (
            <RequestsTab
              mentorData={mentorData}
              user={user}
              onOpenChat={handleOpenChat}
            />
          )}
          {activeTab === 'inbox-tasks' && (
            <InboxStudentTasksTab
              mentorData={mentorData}
              user={user}
              initialConnection={activeChatConnection}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileTab
              mentorData={mentorData}
              user={user}
              onEditProfile={onEditProfile}
              onSignOut={onSignOut}
            />
          )}
        </main>

        {/* =========================================================================
            MOBILE BOTTOM TABBAR (4 Tabs: Home, Requests, Inbox & Tasks, Profile)
            ========================================================================= */}
        <nav className="mentor-bottom-tabbar" aria-label="Mentor Navigation Tabs">
          {/* Tab 1: Home */}
          <button
            type="button"
            className={`mentor-bottom-tab-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
            aria-label="Home Tab"
            id="mentor-tab-home-btn"
          >
            <div className="mentor-bottom-tab-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={activeTab === 'home' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="mentor-bottom-tab-label">Home</span>
          </button>

          {/* Tab 2: Requests */}
          <button
            type="button"
            className={`mentor-bottom-tab-item ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
            aria-label="Requests Tab"
            id="mentor-tab-requests-btn"
          >
            <div className="mentor-bottom-tab-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <span className="mentor-bottom-tab-label">Requests</span>
          </button>

          {/* Tab 3: Inbox and students tasks */}
          <button
            type="button"
            className={`mentor-bottom-tab-item ${activeTab === 'inbox-tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('inbox-tasks')}
            aria-label="Inbox and students tasks Tab"
            id="mentor-tab-inbox-btn"
          >
            <div className="mentor-bottom-tab-icon" style={{ position: 'relative' }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
                <path d="M8 14l2 2 4-4" />
              </svg>
              {unreadTotal > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-7px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    minWidth: '15px',
                    height: '15px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    lineHeight: 1,
                  }}
                >
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </div>
            <span className="mentor-bottom-tab-label">Inbox & Tasks</span>
          </button>

          {/* Tab 4: Profile */}
          <button
            type="button"
            className={`mentor-bottom-tab-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            aria-label="Profile Tab"
            id="mentor-tab-profile-btn"
          >
            <div className="mentor-bottom-tab-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={activeTab === 'profile' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="mentor-bottom-tab-label">Profile</span>
          </button>
        </nav>

        {/* =========================================================================
            MENTOR PROFILE MODAL (Optional bottom sheet)
            ========================================================================= */}
        <MentorProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          mentorData={mentorData}
          user={user}
          onEditProfile={onEditProfile}
          onSignOut={onSignOut}
        />
      </div>
    </div>
  )
}

export default MentorDashboard
