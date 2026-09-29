import React, { useState } from 'react'
import karkaiLogoImg from '../../assets/Karkai_Logo.png'
import {
  AdminHomeTab,
  MentorRequestsTab,
  UserManagementTab,
  MentorMenteeTab,
} from './tabs'
import './AdminDashboard.css'

export type AdminDashboardTab = 'home' | 'mentor-requests' | 'user-management' | 'mentor-mentee'

export interface AdminDashboardProps {
  onBackToSignIn: () => void
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToSignIn }) => {
  const [activeTab, setActiveTab] = useState<AdminDashboardTab>('home')

  return (
    <div className="admin-dashboard-root">
      <div className="admin-mobile-shell">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-brand">
            <img src={karkaiLogoImg} alt="Karkai" className="admin-topbar-logo" />
            <span className="admin-console-pill">
              Admin Console
            </span>
            <span className="admin-status-badge">
              Master Governance
            </span>
          </div>

          <div className="admin-topbar-right">
            <button
              type="button"
              className="admin-exit-btn"
              onClick={onBackToSignIn}
              title="Exit Admin Console"
              id="admin-exit-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Exit</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="admin-main-content">
          {activeTab === 'home' && <AdminHomeTab />}
          {activeTab === 'mentor-requests' && <MentorRequestsTab />}
          {activeTab === 'user-management' && <UserManagementTab />}
          {activeTab === 'mentor-mentee' && <MentorMenteeTab />}
        </main>

        {/* Bottom Navigation Tabbar */}
        <nav className="admin-bottom-tabbar" aria-label="Admin Navigation Tabs">
          {/* Tab 1: Home */}
          <button
            type="button"
            className={`admin-bottom-tab-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
            aria-label="Admin Home Tab"
            id="admin-tab-home-btn"
          >
            <div className="admin-bottom-tab-icon">
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
            <span className="admin-bottom-tab-label">Home</span>
          </button>

          {/* Tab 2: Mentor Requests */}
          <button
            type="button"
            className={`admin-bottom-tab-item ${activeTab === 'mentor-requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('mentor-requests')}
            aria-label="Mentor Requests Tab"
            id="admin-tab-mentor-requests-btn"
          >
            <div className="admin-bottom-tab-icon">
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
                <polyline points="17 11 19 13 23 9" />
              </svg>
            </div>
            <span className="admin-bottom-tab-label">Mentor Requests</span>
          </button>

          {/* Tab 3: User Management */}
          <button
            type="button"
            className={`admin-bottom-tab-item ${activeTab === 'user-management' ? 'active' : ''}`}
            onClick={() => setActiveTab('user-management')}
            aria-label="User Management Tab"
            id="admin-tab-user-mgmt-btn"
          >
            <div className="admin-bottom-tab-icon">
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="admin-bottom-tab-label">Users</span>
          </button>

          {/* Tab 4: MentorMentee Connection Management */}
          <button
            type="button"
            className={`admin-bottom-tab-item ${activeTab === 'mentor-mentee' ? 'active' : ''}`}
            onClick={() => setActiveTab('mentor-mentee')}
            aria-label="Mentor-Mentee Connections Tab"
            id="admin-tab-connections-btn"
          >
            <div className="admin-bottom-tab-icon">
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
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <span className="admin-bottom-tab-label">Connections</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

export default AdminDashboard
