import React, { useState } from 'react'
import { GoogleSignIn } from './GoogleSignIn'
import type { UserProfile } from './GoogleSignIn'
import { RoleSelection } from './RoleSelection'
import type { UserRole } from './RoleSelection'

export interface UserSession extends UserProfile {
  role: UserRole
}

export interface SignInFlowProps {
  onComplete: (session: UserSession) => void
  initialStep?: 'signin' | 'role-selection'
  initialUser?: UserProfile | null
}

export const SignInFlow: React.FC<SignInFlowProps> = ({
  onComplete,
  initialStep = 'signin',
  initialUser = null,
}) => {
  const [step, setStep] = useState<'signin' | 'role-selection'>(initialStep)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(initialUser)

  const handleSignInSuccess = (user: UserProfile) => {
    setCurrentUser(user)
    setStep('role-selection')
  }

  const handleRoleSelected = (role: UserRole) => {
    const session: UserSession = {
      name: currentUser?.name || 'User',
      email: currentUser?.email || 'user@example.com',
      avatar: currentUser?.avatar,
      role,
    }
    onComplete(session)
  }

  const handleBackToSignIn = () => {
    setStep('signin')
  }

  if (step === 'role-selection') {
    return (
      <RoleSelection
        user={currentUser}
        onRoleSelected={handleRoleSelected}
        onBack={handleBackToSignIn}
      />
    )
  }

  return (
    <GoogleSignIn
      onSignInSuccess={handleSignInSuccess}
      currentUser={currentUser}
    />
  )
}

export default SignInFlow
