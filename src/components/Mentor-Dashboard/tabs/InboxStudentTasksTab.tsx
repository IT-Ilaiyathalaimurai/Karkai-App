import React, { useState } from 'react'
import type { MentorProfileData } from '../../../lib/Mentors-details'
import type { UserProfile } from '../../SignIn-Screen'
import { ConversationsList, DirectChat } from '../../Chat'
import type { AcceptedConnection } from '../../../lib/direct-messages'

export interface InboxStudentTasksTabProps {
  mentorData?: MentorProfileData | null
  user?: UserProfile | null
  initialConnection?: AcceptedConnection | null
}

export const InboxStudentTasksTab: React.FC<InboxStudentTasksTabProps> = ({
  mentorData,
  user,
  initialConnection = null,
}) => {
  const [activeConnection, setActiveConnection] = useState<AcceptedConnection | null>(initialConnection)
  const [prevInitial, setPrevInitial] = useState<AcceptedConnection | null>(initialConnection)

  if (initialConnection !== prevInitial) {
    setPrevInitial(initialConnection)
    setActiveConnection(initialConnection)
  }

  const currentUserId = user?.id || mentorData?.id || mentorData?.userId || 'mentor'
  const currentUserName = mentorData?.fullName || user?.name || 'Mentor'

  return (
    <div
      className="mentor-inbox-tab-wrapper"
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
          currentUserRole="mentor"
          onBack={() => setActiveConnection(null)}
        />
      ) : (
        <ConversationsList
          currentUserId={currentUserId}
          currentUserRole="mentor"
          onSelectConnection={(conn) => setActiveConnection(conn)}
        />
      )}
    </div>
  )
}

export default InboxStudentTasksTab
