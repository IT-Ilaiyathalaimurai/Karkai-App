import React, { useState } from 'react'
import './RoleSelection.css'
import type { UserProfile } from './GoogleSignIn'

export type UserRole = 'student' | 'mentor'

export interface RoleSelectionProps {
  user?: UserProfile | null
  onRoleSelected: (role: UserRole) => void
  onBack?: () => void
  initialRole?: UserRole | null
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({
  user,
  onRoleSelected,
  onBack,
  initialRole = null,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(initialRole)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedRole) {
      onRoleSelected(selectedRole)
    }
  }

  return (
    <div className="roles-wrapper">
      <main className="roles-card">
        {/* Navigation / Step header */}
        <div className="roles-nav">
          {onBack ? (
            <button
              type="button"
              className="roles-back-btn"
              onClick={onBack}
              aria-label="Go back to Sign In"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}
          <span className="roles-step-badge">Step 2 of 2</span>
        </div>

        {/* Header */}
        <header className="roles-header">
          {user?.name && (
            <p className="roles-user-greeting">Welcome, {user.name}</p>
          )}
          <h1 className="roles-title">Select Your Role</h1>
          <p className="roles-subtitle">
            Personalize your Karkai experience. How will you be participating?
          </p>
        </header>

        {/* Roles Grid */}
        <form onSubmit={handleSubmit}>
          <div className="roles-grid" role="radiogroup" aria-label="Select your role">
            {/* Student Role */}
            <div
              className={`role-card ${selectedRole === 'student' ? 'selected' : ''}`}
              onClick={() => setSelectedRole('student')}
              role="radio"
              aria-checked={selectedRole === 'student'}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  setSelectedRole('student')
                }
              }}
              id="role-option-student"
            >
              <div className="role-card-top">
                <div className="role-icon-box student">
                  {/* Graduation Cap SVG */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <div className="role-radio-check" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              <div className="role-info">
                <div className="role-name-wrapper">
                  <h2 className="role-name">Student</h2>
                  <span className="role-tag student">Learner</span>
                </div>
                <p className="role-desc">
                  Learn skills, ask questions, attend workshops, and receive guidance from experienced mentors.
                </p>

                <ul className="role-perks">
                  <li>
                    <span className="perk-bullet">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Access structured learning pathways</span>
                  </li>
                  <li>
                    <span className="perk-bullet">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Request 1-on-1 mentorship sessions</span>
                  </li>
                  <li>
                    <span className="perk-bullet">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Earn skill badges and project certificates</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Mentor Role */}
            <div
              className={`role-card ${selectedRole === 'mentor' ? 'selected' : ''}`}
              onClick={() => setSelectedRole('mentor')}
              role="radio"
              aria-checked={selectedRole === 'mentor'}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  setSelectedRole('mentor')
                }
              }}
              id="role-option-mentor"
            >
              <div className="role-card-top">
                <div className="role-icon-box mentor">
                  {/* Compass / Guiding Star SVG */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                </div>
                <div className="role-radio-check" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              <div className="role-info">
                <div className="role-name-wrapper">
                  <h2 className="role-name">Mentor</h2>
                  <span className="role-tag mentor">Guide</span>
                </div>
                <p className="role-desc">
                  Share your expertise, review student work, host interactive sessions, and empower young minds.
                </p>

                <ul className="role-perks">
                  <li>
                    <span className="perk-bullet">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Mentor ambitious students in your field</span>
                  </li>
                  <li>
                    <span className="perk-bullet">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Conduct AMA & workshop sessions</span>
                  </li>
                  <li>
                    <span className="perk-bullet">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Build your recognized mentorship profile</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="roles-action-container">
            <button
              type="submit"
              className="roles-submit-btn"
              disabled={!selectedRole}
              id="role-submit-action"
            >
              <span>
                {selectedRole === 'student'
                  ? 'Continue as Student'
                  : selectedRole === 'mentor'
                  ? 'Continue as Mentor'
                  : 'Select a Role to Continue'}
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default RoleSelection
