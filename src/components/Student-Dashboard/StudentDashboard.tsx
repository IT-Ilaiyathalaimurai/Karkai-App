import React, { useState, useEffect } from 'react'
import type { StudentProfileData } from '../Students-Onboarding'
import type { UserProfile } from '../SignIn-Screen'
import karkaiLogoImg from '../../assets/Karkai_Logo.png'
import { StudentProfileModal } from './StudentProfileModal'
import { HomeTab, MentorsTab, InboxTasksTab, ProfileTab } from './tabs'
import { getUnreadCounts, type AcceptedConnection } from '../../lib/direct-messages'
import type { MentorMenteeConnection } from '../../lib/mentor-mentee-connections'
import './StudentDashboard.css'

export type DashboardTab = 'home' | 'mentors' | 'inbox-tasks' | 'profile'

export interface StudentDashboardProps {
  studentData: StudentProfileData | null
  user: UserProfile | null
  onSignOut?: () => void
  onEditProfile?: () => void
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  studentData,
  user,
  onSignOut,
  onEditProfile,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('home')
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [activeChatConnection, setActiveChatConnection] = useState<AcceptedConnection | null>(null)
  const [unreadTotal, setUnreadTotal] = useState<number>(0)

  const currentUserId =
    user?.id ||
    (studentData && 'userId' in studentData ? String((studentData as Record<string, unknown>).userId) : '') ||
    ''

  useEffect(() => {
    if (!currentUserId) return
    const fetchUnread = async () => {
      try {
        const counts = await getUnreadCounts(currentUserId)
        setUnreadTotal(counts.total)
      } catch (e) {
        console.warn('Failed to fetch unread message count:', e)
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
      partnerId: String(conn.mentor_user_id || conn.id),
      partnerName: String(conn.mentor_name || 'Mentor'),
      partnerRole: 'mentor',
      isVerifiedMentor: true,
      partnerTitle: 'Verified Industry Mentor',
      partnerAvatar: null,
      status: 'accepted',
      unreadCount: 0,
    }
    setActiveChatConnection(formatted)
    setActiveTab('inbox-tasks')
  }

  const isMinor = studentData?.isMinor ?? (studentData?.age ? studentData.age < 18 : false)
  const displayName = studentData?.fullName || user?.name || 'Student'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'S'

  return (
    <div className="student-dashboard-root">
      <div className="dashboard-mobile-shell">
        {/* =========================================================================
            TOP NAVIGATION / HEADER BAR (Mobile PWA)
            ========================================================================= */}
        <header className="dashboard-topbar">
          {/* Brand / Logo */}
          <div className="topbar-brand-section">
            <img src={karkaiLogoImg} alt="Karkai" className="topbar-logo" />
            <span className={`topbar-wing-pill ${isMinor ? 'school' : 'senior'}`}>
              {isMinor ? 'School Wing' : 'Senior Wing'}
            </span>
            {isMinor && (
              <span className="topbar-consent-badge" title="Parent consent have to be done!">
                <span className="badge-dot warning" />
                Consent Pending
              </span>
            )}
          </div>

          {/* Top Right Section: Profile Symbol (Touch to view Student Profile) */}
          <div className="topbar-right-section">
            <button
              type="button"
              className="topbar-profile-trigger"
              onClick={() => setActiveTab('profile')}
              title="Touch to view Student Profile"
              aria-label="View Student Profile"
              id="student-topbar-profile-btn"
            >
              <div className="topbar-profile-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={displayName} />
                ) : (
                  <span>{initials}</span>
                )}
                <span className="topbar-online-indicator" />
              </div>
              <div className="topbar-profile-label">
                <span className="topbar-profile-name">{displayName.split(' ')[0]}</span>
                <span className="topbar-profile-hint">Profile</span>
              </div>
            </button>

            {onSignOut && (
              <button
                type="button"
                className="topbar-signout-btn"
                onClick={onSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                id="student-topbar-signout-btn"
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
        <main className="dashboard-main-content">
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'mentors' && (
            <MentorsTab
              studentData={studentData}
              user={user}
              onOpenChat={handleOpenChat}
            />
          )}
          {activeTab === 'inbox-tasks' && (
            <InboxTasksTab
              studentData={studentData}
              user={user}
              initialConnection={activeChatConnection}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileTab
              studentData={studentData}
              user={user}
              onEditProfile={onEditProfile}
              onSignOut={onSignOut}
            />
          )}
        </main>

        {/* =========================================================================
            MOBILE BOTTOM TABBAR (4 Tabs: Home, Mentors, Inbox & Tasks, Profile)
            ========================================================================= */}
        <nav className="mobile-bottom-tabbar" aria-label="Bottom Navigation Tabs">
          {/* Tab 1: Home */}
          <button
            type="button"
            className={`bottom-tab-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
            aria-label="Home Tab"
            id="student-tab-home-btn"
          >
            <div className="bottom-tab-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="bottom-tab-label">Home</span>
          </button>

          {/* Tab 2: Mentors */}
          <button
            type="button"
            className={`bottom-tab-item ${activeTab === 'mentors' ? 'active' : ''}`}
            onClick={() => setActiveTab('mentors')}
            aria-label="Mentors Tab"
            id="student-tab-mentors-btn"
          >
            <div className="bottom-tab-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </div>
            <span className="bottom-tab-label">Mentors</span>
          </button>

          {/* Tab 3: Inbox and Tasks */}
          <button
            type="button"
            className={`bottom-tab-item ${activeTab === 'inbox-tasks' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('inbox-tasks')
            }}
            aria-label="Inbox and Tasks Tab"
            id="student-tab-inbox-btn"
          >
            <div className="bottom-tab-icon-wrapper" style={{ position: 'relative' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
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
            <span className="bottom-tab-label">Inbox & Tasks</span>
          </button>

          {/* Tab 4: Profile */}
          <button
            type="button"
            className={`bottom-tab-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            aria-label="Profile Tab"
            id="student-tab-profile-btn"
          >
            <div className="bottom-tab-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill={activeTab === 'profile' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="bottom-tab-label">Profile</span>
          </button>
        </nav>

        {/* =========================================================================
            STUDENT PROFILE MODAL / BOTTOM SHEET (Touch Top-Right Profile Symbol)
            ========================================================================= */}
        <StudentProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          studentData={studentData}
          user={user}
          onEditProfile={onEditProfile}
          onSignOut={onSignOut}
        />
      </div>
    </div>
  )
}

export default StudentDashboard
