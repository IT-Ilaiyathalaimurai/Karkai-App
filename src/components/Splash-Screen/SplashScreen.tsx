import React, { useState, useEffect } from 'react'
import karkaiLogoImg from '../../assets/Karkai_Logo.png'
import poweredByLogoImg from '../../assets/logo.png'
import './SplashScreen.css'

export interface SplashScreenProps {
  /**
   * Callback fired when the splash screen dismiss animation completes.
   */
  onDismiss?: () => void
  /**
   * If true, automatically dismisses after `duration` ms.
   * Default: false (or true when used as an introductory splash screen).
   */
  autoDismiss?: boolean
  /**
   * Duration in milliseconds before initiating dismissal if autoDismiss is true.
   * Default: 2200 ms.
   */
  duration?: number
  /**
   * If true, displays a direct button to proceed.
   * Default: false
   */
  showContinueButton?: boolean
  /**
   * Optional custom status label beneath the loading bar.
   */
  statusText?: string
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onDismiss,
  autoDismiss = false,
  duration = 2200,
  showContinueButton = false,
  statusText = 'Loading Application...',
}) => {
  const [isFading, setIsFading] = useState(false)

  const handleDismiss = () => {
    if (isFading) return
    setIsFading(true)
    setTimeout(() => {
      onDismiss?.()
    }, 500) // matches CSS 0.5s transition
  }

  useEffect(() => {
    if (!autoDismiss) return

    const timer = setTimeout(() => {
      handleDismiss()
    }, duration)

    return () => clearTimeout(timer)
  }, [autoDismiss, duration])

  return (
    <div
      className={`splash-container ${isFading ? 'fading-out' : ''}`}
      role="region"
      aria-label="Application Splash Screen"
    >
      <div className="splash-bg-decor" aria-hidden="true" />

      <main className="splash-content">
        <div className="splash-logo-wrapper">
          <img
            src={karkaiLogoImg}
            alt="Karkai"
            className="splash-logo"
            loading="eager"
            fetchPriority="high"
          />
        </div>

        {autoDismiss && (
          <div className="splash-progress-wrapper" aria-hidden="true">
            <div className="splash-progress-track">
              <div className="splash-progress-bar" />
            </div>
            {statusText && <p className="splash-status-text">{statusText}</p>}
          </div>
        )}

        {showContinueButton && (
          <button
            type="button"
            className="splash-action-btn"
            onClick={handleDismiss}
          >
            <span>Get Started</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        )}
      </main>

      <footer className="splash-footer">
        <div className="splash-powered-wrapper">
          <span className="splash-powered-label">powered by</span>
          <img
            src={poweredByLogoImg}
            alt="Ilaiya Thalaimurai"
            className="splash-powered-logo"
            loading="eager"
          />
        </div>
      </footer>
    </div>
  )
}

// Aliases for convenience whether named SplashScreen or SplashPage
export const SplashPage = SplashScreen
export default SplashScreen
