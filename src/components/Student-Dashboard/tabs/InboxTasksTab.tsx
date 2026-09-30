import React, { useState } from 'react'
import type { StudentProfileData } from '../../Students-Onboarding'
import type { UserProfile } from '../../SignIn-Screen'
import { ConversationsList, DirectChat } from '../../Chat'
import type { AcceptedConnection } from '../../../lib/direct-messages'

export interface InboxTasksTabProps {
  studentData?: StudentProfileData | null
  user?: UserProfile | null
  initialConnection?: AcceptedConnection | null
}

export const InboxTasksTab: React.FC<InboxTasksTabProps> = ({
  studentData,
  user,
  initialConnection = null,
}) => {
  const [activeConnection, setActiveConnection] = useState<AcceptedConnection | null>(initialConnection)
  const [prevInitial, setPrevInitial] = useState<AcceptedConnection | null>(initialConnection)

  if (initialConnection !== prevInitial) {
    setPrevInitial(initialConnection)
    setActiveConnection(initialConnection)
  }

  const currentUserId =
    user?.id ||
    (studentData && 'userId' in studentData ? String((studentData as Record<string, unknown>).userId) : '') ||
    'student'
  const currentUserName = studentData?.fullName || user?.name || 'Student Learner'

  return (
    <div
      className="student-inbox-tab-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#ffffff',
        position: 'relative',
      }}
    >
      {activeConnection ? (
        <DirectChat
          connection={activeConnection}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserRole="student"
          onBack={() => setActiveConnection(null)}
        />
      ) : (
        <ConversationsList
          currentUserId={currentUserId}
          currentUserRole="student"
          onSelectConnection={(conn) => setActiveConnection(conn)}
        />
      )}
    </div>
  )
}
