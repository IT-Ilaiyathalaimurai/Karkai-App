import React from 'react'

export const AdminHomeTab: React.FC = () => {
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
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <h2 className="tab-center-title">Home</h2>
      <p className="tab-center-line">Karkai Master Administration &amp; Platform Governance Workspace.</p>
    </div>
  )
}

export default AdminHomeTab
