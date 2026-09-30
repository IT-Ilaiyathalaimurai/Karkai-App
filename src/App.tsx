import { useState, useEffect } from 'react'
import { SplashScreen } from './components/Splash-Screen'
import { GoogleSignIn, RoleSelection } from './components/SignIn-Screen'
import type { UserProfile, UserRole } from './components/SignIn-Screen'
import { StudentOnboarding } from './components/Students-Onboarding'
import type { StudentProfileData } from './components/Students-Onboarding'
import { MentorOnboarding, MentorVerificationQueued } from './components/Mentors-Onboarding'
import type { MentorProfileData } from './components/Mentors-Onboarding'
import { StudentDashboard, StudentEditProfile } from './components/Student-Dashboard'
import { MentorDashboard, MentorEditProfile } from './components/Mentor-Dashboard'
import { AdminDashboard, AdminLogin } from './components/Admin'
import { onAuthStateChange, getSession, signOut, isSupabaseConfigured } from './lib/supabase'

import { saveUser, resolveUserStatus } from './lib/user'
import { cacheStudentProfile, clearCachedStudentProfile } from './lib/Students-details'
import { cacheMentorProfile, clearCachedMentorProfile } from './lib/Mentors-details'
import {
  setActiveOnboardingRole,
  getActiveOnboardingRole,
  clearActiveOnboardingRole,
  clearStudentDraft,
  clearMentorDraft,
} from './lib/onboarding-persistence'
import heroImg from './assets/hero.png'
import logoImg from './assets/Karkai_Logo.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

type AppView =
  | 'splash'
  | 'signin'
  | 'role-selection'
  | 'student-onboarding'
  | 'student-edit-profile'
  | 'student-dashboard'
  | 'mentor-onboarding'
  | 'mentor-edit-profile'
  | 'mentor-verification-queued'
  | 'mentor-dashboard'
  | 'admin-login'
  | 'admin-dashboard'
  | 'app'



function App() {
  const [currentView, setCurrentView] = useState<AppView>('splash')
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [studentData, setStudentData] = useState<StudentProfileData | null>(null)
  const [mentorData, setMentorData] = useState<MentorProfileData | null>(null)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)


  const [authStatusMessage, setAuthStatusMessage] = useState('Verifying your account...')
  const [count, setCount] = useState(0)

  /**
   * Check if user already exists in Supabase ('users' or 'Student-details' tables)
   * and route them directly to their destination (e.g. Student Dashboard for existing students).
   */
  const checkAndNavigateUser = async (user: UserProfile) => {
    setIsCheckingAuth(true)
    setAuthStatusMessage('Checking existing student profile...')

    try {
      const result = await resolveUserStatus(user.id, user.email, user.name)

      if (result.role) {
        setSelectedRole(result.role)
      }
      if (result.studentData) {
        setStudentData(result.studentData)
      }
      if (result.mentorData) {
        setMentorData(result.mentorData)
      }

      // Route directly based on existing record
      if (result.destination === 'student-dashboard') {
        setCurrentView('student-dashboard')
      } else if (result.destination === 'student-onboarding') {
        setCurrentView('student-onboarding')
      } else if (result.destination === 'mentor-dashboard') {
        setCurrentView('mentor-dashboard')
      } else if (result.destination === 'mentor-onboarding') {
        setCurrentView('mentor-onboarding')
      } else if (result.destination === 'app') {
        setCurrentView('app')
      } else {
        // Fallback: Check if user was midway in onboarding before app reload or exit
        const pendingRole = getActiveOnboardingRole(user.id || user.email)
        if (pendingRole === 'student') {
          setSelectedRole('student')
          setCurrentView('student-onboarding')
        } else if (pendingRole === 'mentor') {
          setSelectedRole('mentor')
          setCurrentView('mentor-onboarding')
        } else {
          setCurrentView('role-selection')
        }
      }
    } catch (err) {
      console.warn('Error resolving user destination from Supabase:', err)
      setCurrentView('role-selection')
    } finally {
      setIsCheckingAuth(false)
    }
  }

  // Listen for Supabase OAuth redirect and session
  useEffect(() => {
    // 1. Initial check for existing authenticated session
    getSession().then(async (session) => {
      if (session?.user) {
        const user = session.user
        const userProfile: UserProfile = {
          id: user.id,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'Learner',
          email: user.email || '',
          avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        }
        setCurrentUser(userProfile)

        // Pre-resolve destination in background so splash dismissal goes directly to their dashboard
        try {
          const result = await resolveUserStatus(user.id, user.email, userProfile.name)
          if (result.role) setSelectedRole(result.role)
          if (result.studentData) setStudentData(result.studentData)
          if (result.mentorData) setMentorData(result.mentorData)
        } catch (e) {
          console.warn('Pre-resolve session error:', e)
        }
      }
    })

    // 2. Real-time auth state changes (e.g. Google OAuth redirect callback)
    const { data: { subscription } } = onAuthStateChange(async (_session, user) => {
      if (user) {
        const userProfile: UserProfile = {
          id: user.id,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'Learner',
          email: user.email || '',
          avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        }
        setCurrentUser(userProfile)
        await checkAndNavigateUser(userProfile)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  /**
   * Sign out properly: clear Supabase session, local caches, and React states
   */
  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.warn('Supabase sign out notice:', err)
    }
    const userKey = currentUser?.id || currentUser?.email
    clearCachedStudentProfile(userKey)
    clearCachedMentorProfile(userKey)
    clearActiveOnboardingRole(userKey)
    clearStudentDraft(userKey)
    clearMentorDraft(userKey)
    setCurrentUser(null)
    setSelectedRole(null)
    setStudentData(null)
    setMentorData(null)
    setCurrentView('signin')
  }

  const handleSplashDismiss = async () => {
    if (!currentUser) {
      setCurrentView('signin')
      return
    }

    // If student details are already loaded, jump straight to the student dashboard
    if (selectedRole === 'student' && studentData) {
      setCurrentView('student-dashboard')
      return
    }

    // If mentor details are already loaded, jump straight to the mentor dashboard
    if (selectedRole === 'mentor' && mentorData) {
      setCurrentView('mentor-dashboard')
      return
    }

    // If user was midway in onboarding before reload/exit
    const pendingRole = getActiveOnboardingRole(currentUser.id || currentUser.email)
    if (pendingRole === 'student' && !studentData) {
      setSelectedRole('student')
      setCurrentView('student-onboarding')
      return
    }
    if (pendingRole === 'mentor' && !mentorData) {
      setSelectedRole('mentor')
      setCurrentView('mentor-onboarding')
      return
    }

    // Otherwise dynamically check Supabase database
    await checkAndNavigateUser(currentUser)
  }

  const handleSignInSuccess = async (user: UserProfile) => {
    setCurrentUser(user)
    await checkAndNavigateUser(user)
  }

  const handleRoleSelected = async (role: UserRole) => {
    setSelectedRole(role)
    const userKey = currentUser?.id || currentUser?.email
    if (role === 'student' || role === 'mentor') {
      setActiveOnboardingRole(userKey, role)
    }

    // Persist to Supabase 'users' table
    try {
      await saveUser({
        id: currentUser?.id,
        name: currentUser?.name || 'User',
        role,
        email: currentUser?.email,
      })
    } catch (err) {
      console.warn('Note: Could not save to "users" table. Ensure the table exists in Supabase:', err)
    }

    if (role === 'student') {
      setCurrentView('student-onboarding')
    } else if (role === 'mentor') {
      setCurrentView('mentor-onboarding')
    } else {
      setCurrentView('app')
    }
  }

  const handleStudentComplete = async (data: StudentProfileData) => {
    setStudentData(data)
    setSelectedRole('student')
    const userKey = currentUser?.id || currentUser?.email
    clearActiveOnboardingRole(userKey)
    clearStudentDraft(userKey)

    if (currentUser) {
      cacheStudentProfile(data, currentUser.id || currentUser.email)
      try {
        await saveUser({
          id: currentUser.id,
          name: data.fullName || currentUser.name,
          role: 'student',
          email: currentUser.email,
        })
      } catch (err) {
        console.warn('Notice saving user to users table on completion:', err)
      }
    }

    setCurrentView('student-dashboard')
  }

  const handleMentorComplete = async (data: MentorProfileData) => {
    setMentorData(data)
    setSelectedRole('mentor')
    const userKey = currentUser?.id || currentUser?.email
    clearActiveOnboardingRole(userKey)
    clearMentorDraft(userKey)

    if (currentUser) {
      cacheMentorProfile(data, currentUser.id || currentUser.email)
      try {
        await saveUser({
          id: currentUser.id,
          name: data.fullName || currentUser.name,
          role: 'mentor',
          email: currentUser.email,
        })
      } catch (err) {
        console.warn('Notice saving mentor user to users table on completion:', err)
      }
    }

    // Redirect newly completed mentor to verification queued notification screen
    setCurrentView('mentor-verification-queued')
  }


  if (currentView === 'splash') {
    return (
      <SplashScreen
        autoDismiss={true}
        duration={2200}
        onDismiss={handleSplashDismiss}
      />
    )
  }

  // Loading / Auth resolving screen
  if (isCheckingAuth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <img
          src={logoImg}
          alt="Karkai"
          style={{ width: '80px', height: '80px', marginBottom: '20px', borderRadius: '18px' }}
        />
        <div className="btn-spinner" style={{ width: '32px', height: '32px', marginBottom: '16px', borderTopColor: '#2563eb' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
          Welcome back{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}!
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b' }}>{authStatusMessage}</p>
      </div>
    )
  }

  if (currentView === 'signin') {
    return (
      <GoogleSignIn
        currentUser={currentUser}
        onSignInSuccess={handleSignInSuccess}
        onOpenAdmin={() => setCurrentView(isAdminAuthenticated ? 'admin-dashboard' : 'admin-login')}
      />
    )
  }



  if (currentView === 'role-selection') {
    return (
      <RoleSelection
        user={currentUser}
        initialRole={selectedRole}
        onRoleSelected={handleRoleSelected}
        onBack={() => setCurrentView('signin')}
      />
    )
  }

  if (currentView === 'student-onboarding') {
    return (
      <StudentOnboarding
        initialName={currentUser?.name || ''}
        initialEmail={currentUser?.email || ''}
        onComplete={handleStudentComplete}
        onBack={() => setCurrentView('role-selection')}
      />
    )
  }

  if (currentView === 'mentor-onboarding') {
    return (
      <MentorOnboarding
        user={currentUser}
        onBackToRoles={() => setCurrentView('role-selection')}
        onComplete={handleMentorComplete}
      />
    )
  }

  if (currentView === 'mentor-verification-queued') {
    return (
      <MentorVerificationQueued
        mentorData={mentorData}
        onProceedToDashboard={() => setCurrentView('mentor-dashboard')}
        onSignOut={handleSignOut}
      />
    )
  }

  if (currentView === 'student-edit-profile') {
    return (
      <StudentEditProfile
        studentData={studentData}
        user={currentUser}
        onCancel={() => setCurrentView('student-dashboard')}
        onSaveSuccess={(updated) => {
          setStudentData(updated)
          setCurrentView('student-dashboard')
        }}
      />
    )
  }

  if (currentView === 'mentor-edit-profile') {
    return (
      <MentorEditProfile
        mentorData={mentorData}
        user={currentUser}
        onCancel={() => setCurrentView('mentor-dashboard')}
        onSaveSuccess={(updated) => {
          setMentorData(updated)
          setCurrentView('mentor-dashboard')
        }}
      />
    )
  }

  if (currentView === 'student-dashboard' || (currentView === 'app' && selectedRole === 'student')) {
    return (
      <StudentDashboard
        studentData={studentData}
        user={currentUser}
        onSignOut={handleSignOut}
        onEditProfile={() => setCurrentView('student-edit-profile')}
      />
    )
  }

  if (currentView === 'mentor-dashboard' || (currentView === 'app' && selectedRole === 'mentor')) {
    return (
      <MentorDashboard
        mentorData={mentorData}
        user={currentUser}
        onSignOut={handleSignOut}
        onEditProfile={() => setCurrentView('mentor-edit-profile')}
      />
    )
  }

  if (currentView === 'admin-login') {
    return (
      <AdminLogin
        onLoginSuccess={() => {
          setIsAdminAuthenticated(true)
          setCurrentView('admin-dashboard')
        }}
        onBackToSignIn={() => setCurrentView('signin')}
      />
    )
  }

  if (currentView === 'admin-dashboard') {
    return (
      <AdminDashboard
        onBackToSignIn={() => {
          setIsAdminAuthenticated(false)
          setCurrentView('signin')
        }}
      />
    )
  }





  return (
    <>
      {/* Main App Bar */}
      <header className="app-header">
        <div className="app-brand">
          <img src={logoImg} alt="Karkai Logo" className="header-logo" />
          <span className="pwa-badge">PWA</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              background: isSupabaseConfigured ? '#dcfce7' : '#fef3c7',
              color: isSupabaseConfigured ? '#15803d' : '#b45309',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSupabaseConfigured ? '#16a34a' : '#d97706' }} />
            {isSupabaseConfigured ? 'Supabase Live' : 'Supabase Demo'}
          </span>
          {selectedRole && (
            <span className={`user-role-badge ${selectedRole}`}>
              {selectedRole === 'student' ? 'Student' : 'Mentor'}
            </span>
          )}
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="splash-control-btn"
            onClick={() => setCurrentView(isAdminAuthenticated ? 'admin-dashboard' : 'admin-login')}
          >
            <span>Admin Console</span>
          </button>

          <button
            type="button"
            className="splash-control-btn"
            onClick={() => setCurrentView('mentor-onboarding')}
          >
            <span>Mentor Onboarding</span>
          </button>
          <button
            type="button"
            className="splash-control-btn"
            onClick={() => setCurrentView('mentor-dashboard')}
          >
            <span>Mentor Dashboard</span>
          </button>

          <button
            type="button"
            className="splash-control-btn"
            onClick={() => setCurrentView('student-dashboard')}
          >
            <span>Student Dashboard</span>
          </button>
          <button
            type="button"
            className="splash-control-btn"
            onClick={() => setCurrentView('student-onboarding')}
          >
            <span>Student Onboarding</span>
          </button>
          <button
            type="button"
            className="splash-control-btn"
            onClick={() => setCurrentView('role-selection')}
          >
            <span>Role Selection</span>
          </button>
          <button
            type="button"
            className="splash-control-btn"
            onClick={() => setCurrentView('signin')}
          >
            <span>Sign In</span>
          </button>
          {currentUser && (
            <button
              type="button"
              className="splash-control-btn"
              onClick={handleSignOut}
              style={{ color: '#dc2626' }}
            >
              <span>Sign Out</span>
            </button>
          )}
          <button
            type="button"
            className="splash-control-btn primary"
            onClick={() => setCurrentView('splash')}
          >
            <span>Replay Splash</span>
          </button>
        </div>
      </header>

      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Welcome, {studentData?.fullName || currentUser?.name || 'Learner'}!</h1>
          <p>
            {selectedRole === 'student' ? (
              <span>
                {studentData?.isMinor ? 'School Student (Parent Consent Recorded)' : 'Verified Senior Student'} &bull; Age: <strong>{studentData?.age || 20} yrs</strong> &bull; DOB: <strong>{studentData?.dateOfBirth || '2005-05-14'}</strong>
              </span>
            ) : (
              <span>You are signed in on Karkai.</span>
            )}
          </p>

          {studentData && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  Verified ID & DOB
                </span>
                {studentData.city && (
                  <span style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                    {studentData.city}, {studentData.district}
                  </span>
                )}
                {studentData.institutionName && (
                  <span style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                    {studentData.institutionName} ({studentData.degree} - {studentData.branch}){studentData.currentCgpa ? ` • CGPA: ${studentData.currentCgpa}` : ''}
                  </span>
                )}
                {studentData.tenthMarks && studentData.twelfthMarks && (
                  <span style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                    10th: {studentData.tenthMarks} | 12th: {studentData.twelfthMarks}
                  </span>
                )}
                {studentData.parentConsent && (
                  <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                    Parent: {studentData.parentConsent.parentName} ({studentData.parentConsent.relationship})
                  </span>
                )}
              </div>

              {studentData.skills && studentData.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', maxWidth: '500px', marginTop: '4px' }}>
                  {studentData.skills.map((sk) => (
                    <span key={sk} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      {sk}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>PWA & Splash Features</h2>
          <p>Optimized for mobile and desktop screens</p>
          <ul className="splash-feature-list">
            <li><strong>White Background:</strong> Pure #ffffff canvas with full viewport support</li>
            <li><strong>Centered Logo:</strong> Responsive, high-res centered logo rendering</li>
            <li><strong>PWA Ready:</strong> Instant HTML pre-render fallback + manifest icons</li>
            <li><strong>Smooth Animation:</strong> Gentle entrance scaling & sleek loading indicator</li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank" rel="noreferrer">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank" rel="noreferrer">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank" rel="noreferrer">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank" rel="noreferrer">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App

