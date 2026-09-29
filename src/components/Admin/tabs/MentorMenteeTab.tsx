import React from 'react'

export const MentorMenteeTab: React.FC = () => {
  return (
    <div className="tab-single-line-center">
      <div className="tab-center-icon-box">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>
      <h2 className="tab-center-title">Mentor-Mentee Connections</h2>
      <p className="tab-center-line">Supervise active mentorship pairings, session bookings, and learning milestones.</p>
    </div>
  )
}

export default MentorMenteeTab
