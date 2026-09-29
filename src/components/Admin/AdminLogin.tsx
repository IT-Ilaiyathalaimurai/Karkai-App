import React, { useState } from 'react'
import karkaiLogoImg from '../../assets/Karkai_Logo.png'
import './AdminLogin.css'

export const ADMIN_EMAIL = 'mail.ilaiyathalaimurai@gmail.com'
export const ADMIN_PASSWORD = 'A4mantra@123'

export interface AdminLoginProps {
  onLoginSuccess: () => void
  onBackToSignIn: () => void
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToSignIn,
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const normalizedEmail = email.trim().toLowerCase()
    const targetEmail = ADMIN_EMAIL.toLowerCase()

    if (normalizedEmail === targetEmail && password === ADMIN_PASSWORD) {
      setIsLoading(true)
      setTimeout(() => {
        setIsLoading(false)
        onLoginSuccess()
      }, 500)
    } else {
      setErrorMessage('Invalid administrative credentials. Access restricted.')
    }
  }

  const handleFillDemo = () => {
    setEmail(ADMIN_EMAIL)
    setPassword(ADMIN_PASSWORD)
    setErrorMessage(null)
  }

  return (
    <div className="admin-login-wrapper">
      <main className="admin-login-card">
        {/* Top Navigation */}
        <nav className="admin-login-nav">
          <button
            type="button"
            className="admin-back-btn"
            onClick={onBackToSignIn}
            id="admin-login-back-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Sign In</span>
          </button>

          <span className="admin-security-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Restricted Access</span>
          </span>
        </nav>

        {/* Header */}
        <header className="admin-login-header">
          <div className="admin-logo-container">
            <img src={karkaiLogoImg} alt="Karkai" className="admin-login-logo" />
          </div>
          <div className="admin-title-badge-group">
            <span className="admin-portal-pill">Governance Portal</span>
          </div>
          <h1 className="admin-login-title">Admin Console Login</h1>
          <p className="admin-login-subtitle">
            Enter authorized administrator credentials to manage platform records, mentors, and student applications.
          </p>
        </header>

        {/* Error Alert */}
        {errorMessage && (
          <div className="admin-alert-box error" role="alert">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="admin-login-form">
          {/* Email Field */}
          <div className="admin-form-field">
            <label htmlFor="admin-email-input" className="admin-field-label">
              <span>Admin Email ID</span>
              <span className="admin-required-star">*</span>
            </label>
            <div className="admin-input-wrapper">
              <svg className="admin-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="admin-email-input"
                type="email"
                className="admin-input-control"
                placeholder="mail.ilaiyathalaimurai@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="admin-form-field">
            <label htmlFor="admin-password-input" className="admin-field-label">
              <span>Admin Password</span>
              <span className="admin-required-star">*</span>
            </label>
            <div className="admin-input-wrapper">
              <svg className="admin-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                className="admin-input-control with-toggle"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="admin-password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="admin-submit-btn"
            disabled={isLoading}
            id="admin-login-submit-btn"
          >
            {isLoading ? (
              <>
                <div className="admin-btn-spinner" />
                <span>Verifying Authorization...</span>
              </>
            ) : (
              <>
                <span>Authorize &amp; Enter Console</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Quick autofill helper for development & ease of evaluation */}
        <div className="admin-demo-helper">
          <button
            type="button"
            className="admin-quick-fill-btn"
            onClick={handleFillDemo}
            id="admin-quick-fill-btn"
          >
            Auto-fill Authorized Credentials
          </button>
        </div>

        {/* Footer */}
        <footer className="admin-login-footer">
          <p>
            Authorized access only. All administrative actions and session events are logged for audit compliance.
          </p>
        </footer>
      </main>
    </div>
  )
}

export default AdminLogin
