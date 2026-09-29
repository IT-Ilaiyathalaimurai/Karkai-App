import React from 'react'

export const InboxTasksTab: React.FC = () => {
  return (
    <div className="tab-single-line-center">
      <div className="tab-center-icon-box">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <h2 className="tab-center-title">Inbox & Tasks</h2>
      <p className="tab-center-line">Review mentor communications and manage action items.</p>
    </div>
  )
}
