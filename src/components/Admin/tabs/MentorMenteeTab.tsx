import React, { useState, useEffect, useMemo } from 'react'
import {
  getAllConnections,
  type MentorMenteeConnection,
  type ConnectionStatus,
} from '../../../lib/mentor-mentee-connections'
import { getAllMentors, type MentorProfileData } from '../../../lib/Mentors-details'
import { getAllStudents, type StudentDetailsPayload } from '../../../lib/Students-details'
import './MentorMenteeTab.css'

export type ViewMode = 'mentor-grouped' | 'connection-pairs'
export type ConnectionFilter = 'all' | 'accepted' | 'pending' | 'rejected'

export interface PairedMentee {
  connectionId: string
  studentName: string
  studentUserId?: string | null
  status: ConnectionStatus
  createdAt: string
  studentDetails?: StudentDetailsPayload | null
}

export interface MentorWithMentees {
  mentorId: string
  mentorName: string
  mentorUserId?: string | null
  mentorDetails?: MentorProfileData | null
  company?: string | null
  workingAs?: string | null
  isVerified?: boolean
  mentees: PairedMentee[]
  totalMentees: number
  activeMentees: number
  pendingMentees: number
}

export const MentorMenteeTab: React.FC = () => {
  const [connections, setConnections] = useState<MentorMenteeConnection[]>([])
  const [mentors, setMentors] = useState<MentorProfileData[]>([])
  const [students, setStudents] = useState<StudentDetailsPayload[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConnectionFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('mentor-grouped')

  // Load all connections, mentors, and students from Supabase
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [connectionsData, mentorsData, studentsData] = await Promise.all([
        getAllConnections(),
        getAllMentors(),
        getAllStudents(),
      ])

      setConnections(connectionsData)
      setMentors(mentorsData)
      setStudents(studentsData)
    } catch (err) {
      console.warn('Error loading mentor-mentee connections:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Metrics summary
  const metrics = useMemo(() => {
    const total = connections.length
    const accepted = connections.filter((c) => c.status === 'accepted').length
    const pending = connections.filter((c) => c.status === 'pending').length
    const rejected = connections.filter((c) => c.status === 'rejected').length

    // Mentors with at least 1 mentee
    const mentorNamesWithStudents = new Set(
      connections
        .filter((c) => c.status === 'accepted')
        .map((c) => c.mentor_name.trim().toLowerCase())
    )

    return {
      total,
      accepted,
      pending,
      rejected,
      activeMentorsCount: mentorNamesWithStudents.size,
    }
  }, [connections])

  // Filtered connections list based on status and search query
  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      // Status filter
      if (statusFilter !== 'all' && conn.status !== statusFilter) {
        return false
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase()
        const matchMentor = conn.mentor_name.toLowerCase().includes(q)
        const matchStudent = conn.student_name.toLowerCase().includes(q)
        return matchMentor || matchStudent
      }

      return true
    })
  }, [connections, statusFilter, searchTerm])

  // Grouped structure: Mentor -> List of Students connected to that mentor
  const mentorsWithMentees = useMemo(() => {
    const mentorMap = new Map<string, MentorWithMentees>()

    // 1. Initialize with all registered mentors from Mentor-details table
    mentors.forEach((m) => {
      const key = (m.fullName || '').trim().toLowerCase()
      if (!key) return
      mentorMap.set(key, {
        mentorId: m.id || m.userId || `mentor-${m.fullName}`,
        mentorName: m.fullName,
        mentorUserId: m.userId,
        mentorDetails: m,
        company: m.workingIn,
        workingAs: m.workingAs,
        isVerified: m.isVerified,
        mentees: [],
        totalMentees: 0,
        activeMentees: 0,
        pendingMentees: 0,
      })
    })

    // 2. Associate each connection to its respective mentor
    filteredConnections.forEach((conn) => {
      const key = (conn.mentor_name || '').trim().toLowerCase()
      if (!key) return

      // Find matching student details from Student-details table
      const matchedStudent = students.find((s) => {
        if (conn.user_id && s.user_id && s.user_id === conn.user_id) return true
        return (s.full_name || '').trim().toLowerCase() === (conn.student_name || '').trim().toLowerCase()
      })

      const menteeItem: PairedMentee = {
        connectionId: conn.id,
        studentName: conn.student_name,
        studentUserId: conn.user_id,
        status: conn.status,
        createdAt: conn.created_at,
        studentDetails: matchedStudent || null,
      }

      if (mentorMap.has(key)) {
        const entry = mentorMap.get(key)!
        entry.mentees.push(menteeItem)
        entry.totalMentees++
        if (conn.status === 'accepted') entry.activeMentees++
        if (conn.status === 'pending') entry.pendingMentees++
      } else {
        // Mentor exists in connection table but not in mentor details
        mentorMap.set(key, {
          mentorId: conn.mentor_user_id || conn.mentor_id || `mentor-${conn.mentor_name}`,
          mentorName: conn.mentor_name,
          mentorUserId: conn.mentor_user_id,
          mentorDetails: null,
          company: null,
          workingAs: null,
          isVerified: false,
          mentees: [menteeItem],
          totalMentees: 1,
          activeMentees: conn.status === 'accepted' ? 1 : 0,
          pendingMentees: conn.status === 'pending' ? 1 : 0,
        })
      }
    })

    // Convert map to array and sort by number of total mentees descending
    const list = Array.from(mentorMap.values())

    // If searching, filter mentors who match or whose mentees match
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      return list.filter((m) => {
        const mentorMatch = m.mentorName.toLowerCase().includes(q) || (m.company || '').toLowerCase().includes(q)
        const menteeMatch = m.mentees.some((me) => me.studentName.toLowerCase().includes(q))
        return mentorMatch || menteeMatch
      })
    }

    // Default: mentors with students first, then others
    list.sort((a, b) => {
      if (b.totalMentees !== a.totalMentees) {
        return b.totalMentees - a.totalMentees
      }
      return a.mentorName.localeCompare(b.mentorName)
    })

    return list
  }, [mentors, filteredConnections, students, searchTerm])

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent'
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return 'Recent'
    }
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase() || 'U'
  }

  return (
    <div className="mm-container">
      {/* Top Header */}
      <div className="mm-header">
        <h2 className="mm-heading">Mentor-Mentee Connections</h2>
        <p className="mm-subheading">
          Real-time tracking of mentorship pairings: which student connects with which mentor, and student load per mentor.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="mm-metrics-grid">
        {/* Total Connections */}
        <div className="mm-metric-card">
          <div className="mm-metric-top">
            <span className="mm-metric-label">Total Pairings</span>
            <div className="mm-metric-icon-wrap total">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
          </div>
          <span className="mm-metric-val">{metrics.total}</span>
          <span className="mm-metric-subtext">Registered requests</span>
        </div>

        {/* Active Mentorships */}
        <div className="mm-metric-card">
          <div className="mm-metric-top">
            <span className="mm-metric-label">Active / Accepted</span>
            <div className="mm-metric-icon-wrap active">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <span className="mm-metric-val">{metrics.accepted}</span>
          <span className="mm-metric-subtext">Ongoing guidance</span>
        </div>

        {/* Pending Requests */}
        <div className="mm-metric-card">
          <div className="mm-metric-top">
            <span className="mm-metric-label">Pending</span>
            <div className="mm-metric-icon-wrap pending">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <span className="mm-metric-val">{metrics.pending}</span>
          <span className="mm-metric-subtext">Awaiting mentor review</span>
        </div>

        {/* Engaged Mentors */}
        <div className="mm-metric-card">
          <div className="mm-metric-top">
            <span className="mm-metric-label">Active Mentors</span>
            <div className="mm-metric-icon-wrap mentors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 11l-3 3-1.5-1.5" />
              </svg>
            </div>
          </div>
          <span className="mm-metric-val">{metrics.activeMentorsCount}</span>
          <span className="mm-metric-subtext">Mentoring &ge;1 student</span>
        </div>
      </div>

      {/* Controls: Search, View Mode, and Refresh */}
      <div className="mm-controls-bar">
        {/* Search */}
        <div className="mm-search-wrap">
          <svg className="mm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="mm-search-input"
            placeholder="Search by mentor or student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="mm-search-input"
          />
          {searchTerm && (
            <button
              type="button"
              className="mm-search-clear"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* View Switcher */}
        <div className="mm-view-toggle">
          <button
            type="button"
            className={`mm-view-btn ${viewMode === 'mentor-grouped' ? 'active' : ''}`}
            onClick={() => setViewMode('mentor-grouped')}
            id="mm-view-grouped-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>By Mentor (Mentees List)</span>
          </button>

          <button
            type="button"
            className={`mm-view-btn ${viewMode === 'connection-pairs' ? 'active' : ''}`}
            onClick={() => setViewMode('connection-pairs')}
            id="mm-view-pairs-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>All Connection Pairs</span>
          </button>
        </div>

        {/* Refresh */}
        <button
          type="button"
          className={`mm-refresh-btn ${isLoading ? 'spinning' : ''}`}
          onClick={loadData}
          disabled={isLoading}
          title="Refresh connections from database"
          id="mm-refresh-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Status Filter Bar */}
      <div className="mm-status-filter-bar">
        <button
          type="button"
          className={`mm-status-pill ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <span>All Statuses</span>
          <span className="mm-status-badge-count">{metrics.total}</span>
        </button>

        <button
          type="button"
          className={`mm-status-pill ${statusFilter === 'accepted' ? 'active' : ''}`}
          onClick={() => setStatusFilter('accepted')}
        >
          <span>Active / Accepted</span>
          <span className="mm-status-badge-count">{metrics.accepted}</span>
        </button>

        <button
          type="button"
          className={`mm-status-pill ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          <span>Pending Requests</span>
          <span className="mm-status-badge-count">{metrics.pending}</span>
        </button>

        <button
          type="button"
          className={`mm-status-pill ${statusFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          <span>Rejected</span>
          <span className="mm-status-badge-count">{metrics.rejected}</span>
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="mm-loading-skeleton">
          <div className="mm-skeleton-card" />
          <div className="mm-skeleton-card" />
          <div className="mm-skeleton-card" />
        </div>
      ) : viewMode === 'mentor-grouped' ? (
        /* ====================================================================
           VIEW 1: MENTOR-GROUPED VIEW (Mentor Card with their Mentees Breakdown)
           ==================================================================== */
        mentorsWithMentees.length === 0 ? (
          <div className="mm-empty-state">
            <div className="mm-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h4 className="mm-empty-title">No Mentor Connections Found</h4>
            <p className="mm-empty-desc">
              {searchTerm
                ? `No results match "${searchTerm}".`
                : 'There are currently no mentor-mentee pairing records matching the selected status.'}
            </p>
          </div>
        ) : (
          <div className="mm-mentor-cards-container">
            {mentorsWithMentees.map((mentor) => (
              <div key={mentor.mentorId} className="mm-mentor-card">
                {/* Mentor Card Top */}
                <div className="mm-mentor-card-top">
                  <div className="mm-mentor-info">
                    <div className="mm-avatar mentor">
                      {getInitials(mentor.mentorName)}
                    </div>
                    <div className="mm-mentor-details">
                      <div className="mm-mentor-name-row">
                        <h4 className="mm-mentor-name">{mentor.mentorName}</h4>
                        {mentor.isVerified && (
                          <span
                            title="Verified Mentor"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: '#059669',
                              fontSize: '12px',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="mm-mentor-meta">
                        {mentor.workingAs ? `${mentor.workingAs} • ` : ''}
                        {mentor.company || 'Mentor on Karkai'}
                      </p>
                    </div>
                  </div>

                  {/* Mentees Count Badge */}
                  <div className={`mm-mentees-count-badge ${mentor.totalMentees === 0 ? 'zero' : ''}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    <span>
                      {mentor.totalMentees} {mentor.totalMentees === 1 ? 'Mentee' : 'Mentees'}
                    </span>
                  </div>
                </div>

                {/* Mentees List for this Mentor */}
                <div className="mm-mentees-section">
                  <div className="mm-mentees-section-title">
                    <span>Assigned Students &amp; Requests ({mentor.mentees.length})</span>
                    {mentor.mentees.length > 0 && (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {mentor.activeMentees} Active • {mentor.pendingMentees} Pending
                      </span>
                    )}
                  </div>

                  {mentor.mentees.length === 0 ? (
                    <div style={{ padding: '10px 0', fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                      No students connected to this mentor yet under current filter.
                    </div>
                  ) : (
                    <div className="mm-mentees-list">
                      {mentor.mentees.map((mentee) => {
                        const student = mentee.studentDetails
                        const isSchool = student?.wing === 'school' || student?.is_minor

                        return (
                          <div key={mentee.connectionId} className="mm-mentee-row">
                            <div className="mm-mentee-info">
                              <div className="mm-avatar student" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                                {getInitials(mentee.studentName)}
                              </div>
                              <div className="mm-mentee-name-group">
                                <span className="mm-mentee-name">{mentee.studentName}</span>
                                <span className="mm-mentee-details">
                                  {student?.institution_name || 'Student Learner'}
                                  {student?.district ? ` • ${student.district}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="mm-mentee-badges">
                              {student && (
                                <span className={`mm-wing-pill ${isSchool ? 'school' : ''}`}>
                                  {isSchool ? 'School' : 'College'}
                                </span>
                              )}

                              <span className={`mm-status-pill-badge ${mentee.status}`}>
                                {mentee.status === 'accepted' ? 'Active' : mentee.status}
                              </span>

                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {formatDate(mentee.createdAt)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ====================================================================
           VIEW 2: CONNECTION PAIRS (Student -> Mentor Linear Matrix)
           ==================================================================== */
        filteredConnections.length === 0 ? (
          <div className="mm-empty-state">
            <div className="mm-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h4 className="mm-empty-title">No Connections Found</h4>
            <p className="mm-empty-desc">
              {searchTerm
                ? `No pairing matched "${searchTerm}".`
                : 'There are currently no connection records in the database matching the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="mm-pairs-container">
            {filteredConnections.map((conn) => {
              // Find matching student details
              const matchedStudent = students.find((s) => {
                if (conn.user_id && s.user_id && s.user_id === conn.user_id) return true
                return (s.full_name || '').trim().toLowerCase() === (conn.student_name || '').trim().toLowerCase()
              })

              // Find matching mentor details
              const matchedMentor = mentors.find((m) => {
                if (conn.mentor_user_id && m.userId && m.userId === conn.mentor_user_id) return true
                return (m.fullName || '').trim().toLowerCase() === (conn.mentor_name || '').trim().toLowerCase()
              })

              return (
                <div key={conn.id} className="mm-pair-card">
                  <div className="mm-pair-flow">
                    {/* Student Side */}
                    <div className="mm-pair-side">
                      <span className="mm-pair-role-tag">Student</span>
                      <h4 className="mm-pair-person-name">{conn.student_name}</h4>
                      <p className="mm-pair-person-sub">
                        {matchedStudent?.institution_name || (matchedStudent?.wing === 'school' ? 'School Wing' : 'College Student')}
                      </p>
                    </div>

                    {/* Arrow Connector */}
                    <div className="mm-pair-connector">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>

                    {/* Mentor Side */}
                    <div className="mm-pair-side">
                      <span className="mm-pair-role-tag">Mentor</span>
                      <h4 className="mm-pair-person-name">{conn.mentor_name}</h4>
                      <p className="mm-pair-person-sub">
                        {matchedMentor?.workingIn || matchedMentor?.workingAs || 'Registered Mentor'}
                      </p>
                    </div>
                  </div>

                  {/* Status & Timestamp */}
                  <div className="mm-pair-meta">
                    <span className={`mm-status-pill-badge ${conn.status}`}>
                      {conn.status === 'accepted' ? 'Active Mentorship' : conn.status}
                    </span>
                    <span className="mm-pair-date">
                      {formatDate(conn.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

export default MentorMenteeTab
