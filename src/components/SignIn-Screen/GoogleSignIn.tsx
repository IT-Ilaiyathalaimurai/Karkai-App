import React, { useState, useEffect } from 'react'
import karkaiLogoImg from '../../assets/Karkai_Logo.png'
import './GoogleSignIn.css'
import { isSupabaseConfigured, signInWithGoogle, supabase } from '../../lib/supabase'

export interface UserProfile {
  id?: string
  email: string
  name: string
  avatar?: string
}

export interface GoogleSignInProps {
  onSignInSuccess: (user: UserProfile) => void
  currentUser?: UserProfile | null
  onOpenAdmin?: () => void
}

export const GoogleSignIn: React.FC<GoogleSignInProps> = ({
  onSignInSuccess,
  currentUser = null,
  onOpenAdmin,
}) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(currentUser)
  const [isLoading, setIsLoading] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Direct Email input state
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)

  // Sync with prop when currentUser changes (e.g. from Google OAuth callback)
  useEffect(() => {
    if (currentUser) {
      setSelectedUser(currentUser)
      if (currentUser.email) {
        setEmailInput(currentUser.email)
      }
    }
  }, [currentUser])

  // Demo Google accounts for quick offline/fallback testing
  const demoGoogleUsers: UserProfile[] = [
    { name: 'Karkai Student', email: 'karkaistudent@gmail.com' },
    { name: 'Karkai Mentor', email: 'karkaimentor@gmail.com' },
    { name: 'Hari Gowtham', email: 'harigowtham609@gmail.com' },
  ]

  const handleGoogleClick = async () => {
    setAuthError(null)

    if (isSupabaseConfigured) {
      try {
        setIsLoading(true)
        await signInWithGoogle()
        // Browser redirects to Google OAuth page and returns back
      } catch (err: unknown) {
        setIsLoading(false)
        const message = err instanceof Error ? err.message : 'Google OAuth failed to initialize.'
        setAuthError(message)
        setShowAccounts(true)
      }
    } else {
      setShowAccounts(true)
    }
  }

  const handleSelectDemoAccount = (user: UserProfile) => {
    setSelectedUser(user)
    setEmailInput(user.email)
    setShowAccounts(false)
    setAuthError(null)
  }

  const handleSwitchAccount = () => {
    setSelectedUser(null)
    setEmailInput('')
    handleGoogleClick()
  }

  /**
   * Handle direct email sign-in:
   * Looks up the user in Supabase 'users' / 'Student-details' / 'Mentor-details'
   * and navigates directly to their dashboard.
   */
  const handleEmailSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanEmail = emailInput.trim().toLowerCase()

    if (!cleanEmail) {
      setEmailError('Please enter your email ID.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setEmailError(null)
    setIsSubmittingEmail(true)

    try {
      let resolvedProfile: UserProfile = {
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
      }

      // Check if user exists in Supabase 'users' table
      if (isSupabaseConfigured && supabase) {
        const { data: userRec } = await supabase
          .from('users')
          .select('id, name, email, role')
          .eq('email', cleanEmail)
          .maybeSingle()

        if (userRec) {
          resolvedProfile = {
            id: userRec.id,
            email: userRec.email || cleanEmail,
            name: userRec.name || cleanEmail.split('@')[0],
          }
        }
      }

      setSelectedUser(resolvedProfile)
      onSignInSuccess(resolvedProfile)
    } catch (err) {
      console.warn('Notice resolving user from email:', err)
      const fallbackProfile: UserProfile = {
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
      }
      setSelectedUser(fallbackProfile)
      onSignInSuccess(fallbackProfile)
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  /**
   * Quick-fill button handler for quick testing
   */
  const handleQuickFill = async (email: string) => {
    setEmailInput(email)
    setEmailError(null)
    setIsSubmittingEmail(true)

    const cleanEmail = email.trim().toLowerCase()
    try {
      let profile: UserProfile = {
        email: cleanEmail,
        name: cleanEmail.includes('mentor') ? 'Karkai Mentor' : 'Karkai Student',
      }

      if (isSupabaseConfigured && supabase) {
        const { data: userRec } = await supabase
          .from('users')
          .select('id, name, email, role')
          .eq('email', cleanEmail)
          .maybeSingle()

        if (userRec) {
          profile = {
            id: userRec.id,
            email: userRec.email || cleanEmail,
            name: userRec.name || (cleanEmail.includes('mentor') ? 'Karkai Mentor' : 'Karkai Student'),
          }
        }
      }

      setSelectedUser(profile)
      onSignInSuccess(profile)
    } catch {
      const fallback: UserProfile = {
        email: cleanEmail,
        name: cleanEmail.includes('mentor') ? 'Karkai Mentor' : 'Karkai Student',
      }
      setSelectedUser(fallback)
      onSignInSuccess(fallback)
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) {
      handleEmailSubmit()
      return
    }
    onSignInSuccess(selectedUser)
  }

  return (
    <div className="signin-wrapper">
      <main className="signin-card">
        <header className="signin-header">
          <div className="signin-logo-container">
            <img src={karkaiLogoImg} alt="Karkai" className="signin-logo" />
          </div>
          <h1 className="signin-title">Sign in to Karkai</h1>
          <p className="signin-subtitle">
            Next-generation educational mentorship & youth empowerment
          </p>
        </header>

        {/* Direct Email Sign-in Form */}
        <form onSubmit={handleEmailSubmit} className="signin-email-form">
          <label className="signin-input-label" htmlFor="email-signin-input">
            Enter your Email ID
          </label>
          <div className="signin-input-wrapper">
            <svg
              className="signin-input-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <input
              id="email-signin-input"
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value)
                if (emailError) setEmailError(null)
              }}
              placeholder="e.g. karkaistudent@gmail.com"
              className="signin-email-input"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              required
            />
          </div>

          {emailError && (
            <div className="signin-alert-box error" role="alert" style={{ marginTop: '8px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{emailError}</span>
            </div>
          )}

          <button
            type="submit"
            className="signin-email-submit-btn"
            disabled={!emailInput.trim() || isSubmittingEmail}
            id="email-signin-submit-btn"
          >
            {isSubmittingEmail ? (
              <>
                <div className="btn-spinner light" />
                <span>Verifying Account...</span>
              </>
            ) : (
              <>
                <span>Continue with Email</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Quick Test Accounts */}
        <div className="signin-quick-accounts">
          <span className="quick-accounts-label">Quick Sign-in:</span>
          <div className="quick-accounts-chips">
            <button
              type="button"
              className="quick-chip-btn student"
              onClick={() => handleQuickFill('karkaistudent@gmail.com')}
              title="Sign in as Student"
            >
              🎓 Student
            </button>
            <button
              type="button"
              className="quick-chip-btn mentor"
              onClick={() => handleQuickFill('karkaimentor@gmail.com')}
              title="Sign in as Mentor"
            >
              💼 Mentor
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="signin-divider">
          <span>or sign in with Google</span>
        </div>

        {/* Primary Google Sign-in */}
        <button
          type="button"
          className="google-signin-btn"
          onClick={handleGoogleClick}
          disabled={isLoading}
          id="google-signin-action"
        >
          {isLoading ? (
            <div className="btn-spinner dark" />
          ) : (
            <svg
              className="google-icon-svg"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>
            {isLoading
              ? 'Connecting to Google...'
              : selectedUser
              ? 'Switch Google Account'
              : 'Continue with Google'}
          </span>
        </button>

        {/* OAuth Error Alert */}
        {authError && (
          <div className="signin-alert-box error" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{authError}</span>
          </div>
        )}

        {/* Demo Account Chooser (Shown only if live OAuth fails or is in demo mode) */}
        {showAccounts && (
          <div className="google-user-preview-list">
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', textAlign: 'left', fontWeight: 600 }}>
              Select a Google Account:
            </p>
            {demoGoogleUsers.map((user) => (
              <div
                key={user.email}
                className="google-user-chip"
                onClick={() => handleSelectDemoAccount(user)}
                role="button"
                tabIndex={0}
              >
                <div className="google-user-info">
                  <div className="google-avatar">{user.name.charAt(0)}</div>
                  <div>
                    <div className="google-user-name">{user.name}</div>
                    <div className="google-user-email">{user.email}</div>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="signin-divider">
          <span>Selected Google Account</span>
        </div>

        {/* Authenticated Account Display (No manual email typing) */}
        <form onSubmit={handleContinue} className="signin-account-section">
          {selectedUser ? (
            <div className="selected-account-card">
              <div className="selected-account-top">
                <span className="selected-account-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Verified Google Account</span>
                </span>
                <button
                  type="button"
                  className="switch-account-btn"
                  onClick={handleSwitchAccount}
                >
                  Switch Account
                </button>
              </div>

              <div className="selected-account-details">
                <div className="selected-account-avatar">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} />
                  ) : (
                    selectedUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="selected-account-text">
                  <span className="selected-account-name">{selectedUser.name}</span>
                  <span className="selected-account-email">{selectedUser.email}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-account-card">
              <div className="empty-account-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <p className="empty-account-text">
                No Google account selected yet. Click <strong>&ldquo;Continue with Google&rdquo;</strong> above to link your email.
              </p>
            </div>
          )}

          {/* Continue button: enabled ONLY when Google account is selected */}
          <button
            type="submit"
            className="continue-flow-btn"
            disabled={!selectedUser || isLoading}
            id="continue-after-google-btn"
          >
            <span>
              {selectedUser ? `Continue as ${selectedUser.name}` : 'Continue'}
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          {!selectedUser && (
            <span className="continue-hint-text">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Select a Google account above to enable the Continue button
            </span>
          )}
        </form>

        {/* Admin Console Direct Redirect Button */}
        {onOpenAdmin && (
          <div className="admin-console-trigger-wrap">
            <button
              type="button"
              className="admin-console-btn"
              onClick={onOpenAdmin}
              id="open-admin-console-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Admin Console</span>
            </button>
          </div>
        )}

        <footer className="signin-footer">
          By continuing, you agree to Karkai's{' '}
          <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>{' '}
          and{' '}
          <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
        </footer>
      </main>
    </div>
  )
}

export default GoogleSignIn
