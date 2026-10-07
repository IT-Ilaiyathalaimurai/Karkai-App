import React, { useState, useEffect, useMemo } from 'react'
import { getAllStudents, type StudentDetailsPayload } from '../../../lib/Students-details'
import { getAllMentors, type MentorProfileData } from '../../../lib/Mentors-details'
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'
import './UserManagementTab.css'

export type UserRoleFilter = 'all' | 'student' | 'mentor'
export type StudentWingFilter = 'all' | 'school' | 'senior'
export type MentorStatusFilter = 'all' | 'verified' | 'pending' | 'rejected'

export interface ManagedUser {
  id: string
  userId?: string
  fullName: string
  role: 'student' | 'mentor'
  studentWing?: 'school' | 'senior'
  email: string | null
  mobileNumber: string | null
  district: string | null
  state: string | null
  institutionOrCompany: string | null
  degreeOrDesignation: string | null
  status: 'active' | 'verified' | 'pending' | 'rejected'
  createdAt?: string
  studentRecord?: StudentDetailsPayload
  mentorRecord?: MentorProfileData
}

export const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all')
  const [studentWingFilter, setStudentWingFilter] = useState<StudentWingFilter>('all')
  const [mentorStatusFilter, setMentorStatusFilter] = useState<MentorStatusFilter>('all')
  const [selectedUserModal, setSelectedUserModal] = useState<ManagedUser | null>(null)

  // Fetch all user records from both Student-details and Mentor-details tables
  const loadUsers = async () => {
    setIsLoading(true)
    const combined: ManagedUser[] = []

    try {
      // 1. Fetch Students
      const studentRows = await getAllStudents()
      studentRows.forEach((s) => {
        const raw = s.raw_data || {}
        const email =
          s.raw_data?.email ||
          s.raw_data?.userEmail ||
          s.raw_data?.initialEmail ||
          (s as any).email ||
          null

        combined.push({
          id: s.id || s.user_id || `student-${s.full_name}`,
          userId: s.user_id,
          fullName: s.full_name || raw.fullName || 'Student',
          role: 'student',
          studentWing: s.wing === 'school' || s.is_minor ? 'school' : 'senior',
          email,
          mobileNumber: s.mobile_number || raw.mobileNumber || null,
          district: s.district || raw.district || null,
          state: s.state || raw.state || 'Tamil Nadu',
          institutionOrCompany: s.institution_name || raw.institutionName || null,
          degreeOrDesignation: s.degree ? `${s.degree} ${s.branch ? `• ${s.branch}` : ''}` : raw.currentYear || null,
          status: 'active',
          createdAt: s.created_at || raw.createdAt || new Date().toISOString(),
          studentRecord: s,
        })
      })

      // 2. Fetch Mentors
      const mentorRows = await getAllMentors()
      mentorRows.forEach((m) => {
        let status: 'verified' | 'pending' | 'rejected' = 'pending'
        if (m.isVerified) status = 'verified'
        else if (m.verificationStatus === 'rejected') status = 'rejected'

        combined.push({
          id: m.id || m.userId || `mentor-${m.fullName}`,
          userId: m.userId,
          fullName: m.fullName || 'Mentor',
          role: 'mentor',
          email: m.email || null,
          mobileNumber: m.phoneNumber ? `${m.countryCode || '+91'} ${m.phoneNumber}` : null,
          district: m.city || null,
          state: m.region || 'Tamil Nadu',
          institutionOrCompany: m.workingIn || null,
          degreeOrDesignation: m.workingAs || null,
          status,
          createdAt: m.completedAt || new Date().toISOString(),
          mentorRecord: m,
        })
      })

      // 3. Fallback check for any general auth users not yet onboarded
      if (supabase && isSupabaseConfigured) {
        try {
          const { data: generalUsers } = await supabase.from('users').select('*')
          if (Array.isArray(generalUsers)) {
            generalUsers.forEach((gu) => {
              const alreadyExists = combined.some(
                (u) => (u.userId && u.userId === gu.id) || (u.email && gu.email && u.email === gu.email)
              )
              if (!alreadyExists) {
                combined.push({
                  id: gu.id,
                  userId: gu.id,
                  fullName: gu.name || 'Registered User',
                  role: gu.role === 'mentor' ? 'mentor' : 'student',
                  email: gu.email,
                  mobileNumber: null,
                  district: null,
                  state: 'Tamil Nadu',
                  institutionOrCompany: null,
                  degreeOrDesignation: 'Pending Onboarding',
                  status: 'pending',
                  createdAt: gu.created_at || new Date().toISOString(),
                })
              }
            })
          }
        } catch {
          // General users table check optional
        }
      }

      // Sort by newest first
      combined.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })

      setUsers(combined)
    } catch (err) {
      console.warn('Error loading users for UserManagementTab:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Metrics summary
  const metrics = useMemo(() => {
    const totalUsers = users.length
    const students = users.filter((u) => u.role === 'student')
    const mentors = users.filter((u) => u.role === 'mentor')

    const schoolStudents = students.filter((u) => u.studentWing === 'school').length
    const seniorStudents = students.filter((u) => u.studentWing === 'senior').length

    const verifiedMentors = mentors.filter((u) => u.status === 'verified').length
    const pendingMentors = mentors.filter((u) => u.status === 'pending').length

    return {
      totalUsers,
      totalStudents: students.length,
      schoolStudents,
      seniorStudents,
      totalMentors: mentors.length,
      verifiedMentors,
      pendingMentors,
    }
  }, [users])

  // Filtered users list based on role, sub-filters, and search query
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // 1. Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false
      }

      // 2. Student Sub-filter
      if (roleFilter === 'student' && studentWingFilter !== 'all') {
        if (user.studentWing !== studentWingFilter) return false
      }

      // 3. Mentor Sub-filter
      if (roleFilter === 'mentor' && mentorStatusFilter !== 'all') {
        if (user.status !== mentorStatusFilter) return false
      }

      // 4. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase()
        const matchName = user.fullName.toLowerCase().includes(q)
        const matchEmail = (user.email || '').toLowerCase().includes(q)
        const matchPhone = (user.mobileNumber || '').includes(q)
        const matchInst = (user.institutionOrCompany || '').toLowerCase().includes(q)
        const matchDist = (user.district || '').toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchPhone && !matchInst && !matchDist) {
          return false
        }
      }

      return true
    })
  }, [users, roleFilter, studentWingFilter, mentorStatusFilter, searchTerm])

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
    <div className="user-management-container">
      {/* Top Header */}
      <div className="um-header">
        <h2 className="um-heading">User Management</h2>
        <p className="um-subheading">
          Real-time registry of all students, mentors, and platform user records from the database.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="um-metrics-grid">
        {/* Total Users */}
        <div className="um-metric-card">
          <div className="um-metric-top">
            <span className="um-metric-label">Total Users</span>
            <div className="um-metric-icon-wrap users">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <span className="um-metric-val">{metrics.totalUsers}</span>
          <span className="um-metric-subtext">Registered across roles</span>
        </div>

        {/* Total Students */}
        <div className="um-metric-card">
          <div className="um-metric-top">
            <span className="um-metric-label">Students</span>
            <div className="um-metric-icon-wrap students">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
          </div>
          <span className="um-metric-val">{metrics.totalStudents}</span>
          <span className="um-metric-subtext">
            {metrics.schoolStudents} School • {metrics.seniorStudents} College
          </span>
        </div>

        {/* Total Mentors */}
        <div className="um-metric-card">
          <div className="um-metric-top">
            <span className="um-metric-label">Mentors</span>
            <div className="um-metric-icon-wrap mentors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            </div>
          </div>
          <span className="um-metric-val">{metrics.totalMentors}</span>
          <span className="um-metric-subtext">
            {metrics.verifiedMentors} Verified • {metrics.pendingMentors} Pending
          </span>
        </div>
      </div>

      {/* Controls: Search & Refresh */}
      <div className="um-controls-bar">
        <div className="um-search-wrap">
          <svg className="um-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="um-search-input"
            placeholder="Search by name, email, mobile, institution, or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="um-search-input"
          />
          {searchTerm && (
            <button
              type="button"
              className="um-search-clear"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          className={`um-refresh-btn ${isLoading ? 'spinning' : ''}`}
          onClick={loadUsers}
          disabled={isLoading}
          title="Refresh user records from Supabase"
          id="um-refresh-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Role Filter Tabs */}
      <div className="um-role-tabs">
        <button
          type="button"
          className={`um-role-tab-btn ${roleFilter === 'all' ? 'active' : ''}`}
          onClick={() => {
            setRoleFilter('all')
            setStudentWingFilter('all')
            setMentorStatusFilter('all')
          }}
          id="um-role-tab-all"
        >
          <span>All Users</span>
          <span className="um-role-pill">{metrics.totalUsers}</span>
        </button>

        <button
          type="button"
          className={`um-role-tab-btn ${roleFilter === 'student' ? 'active' : ''}`}
          onClick={() => setRoleFilter('student')}
          id="um-role-tab-student"
        >
          <span>Students</span>
          <span className="um-role-pill">{metrics.totalStudents}</span>
        </button>

        <button
          type="button"
          className={`um-role-tab-btn ${roleFilter === 'mentor' ? 'active' : ''}`}
          onClick={() => setRoleFilter('mentor')}
          id="um-role-tab-mentor"
        >
          <span>Mentors</span>
          <span className="um-role-pill">{metrics.totalMentors}</span>
        </button>
      </div>

      {/* Sub-filter Bar for Role Specific breakdowns */}
      {roleFilter === 'student' && (
        <div className="um-subfilter-bar">
          <span style={{ fontSize: '12px', fontWeight: 650, color: '#64748b' }}>Wing:</span>
          <button
            type="button"
            className={`um-subfilter-pill ${studentWingFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStudentWingFilter('all')}
          >
            All ({metrics.totalStudents})
          </button>
          <button
            type="button"
            className={`um-subfilter-pill ${studentWingFilter === 'school' ? 'active' : ''}`}
            onClick={() => setStudentWingFilter('school')}
          >
            School Wing ({metrics.schoolStudents})
          </button>
          <button
            type="button"
            className={`um-subfilter-pill ${studentWingFilter === 'senior' ? 'active' : ''}`}
            onClick={() => setStudentWingFilter('senior')}
          >
            College Wing ({metrics.seniorStudents})
          </button>
        </div>
      )}

      {roleFilter === 'mentor' && (
        <div className="um-subfilter-bar">
          <span style={{ fontSize: '12px', fontWeight: 650, color: '#64748b' }}>Status:</span>
          <button
            type="button"
            className={`um-subfilter-pill ${mentorStatusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setMentorStatusFilter('all')}
          >
            All ({metrics.totalMentors})
          </button>
          <button
            type="button"
            className={`um-subfilter-pill ${mentorStatusFilter === 'verified' ? 'active' : ''}`}
            onClick={() => setMentorStatusFilter('verified')}
          >
            Verified ({metrics.verifiedMentors})
          </button>
          <button
            type="button"
            className={`um-subfilter-pill ${mentorStatusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setMentorStatusFilter('pending')}
          >
            Pending ({metrics.pendingMentors})
          </button>
        </div>
      )}

      {/* Users List */}
      {isLoading ? (
        <div className="um-loading-skeleton">
          <div className="um-skeleton-card" />
          <div className="um-skeleton-card" />
          <div className="um-skeleton-card" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="um-empty-state">
          <div className="um-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h4 className="um-empty-title">No User Records Found</h4>
          <p className="um-empty-desc">
            {searchTerm
              ? `No user matches "${searchTerm}". Try checking your spelling or clearing filters.`
              : 'There are currently no records registered under this category in the database.'}
          </p>
        </div>
      ) : (
        <div className="um-cards-list">
          {filteredUsers.map((user) => {
            const isStudent = user.role === 'student'
            const avatarClass = isStudent
              ? user.studentWing === 'school'
                ? 'student-school'
                : 'student-senior'
              : 'mentor'

            return (
              <div key={user.id} className="um-user-card" id={`um-card-${user.id}`}>
                {/* Card Top: Profile and Badges */}
                <div className="um-card-header">
                  <div className="um-card-profile">
                    <div className={`um-avatar ${avatarClass}`}>
                      {getInitials(user.fullName)}
                    </div>
                    <div className="um-card-title-group">
                      <h4 className="um-card-name">{user.fullName}</h4>
                      <p className="um-card-subtitle">
                        {user.degreeOrDesignation || user.institutionOrCompany || 'Profile Completed'}
                      </p>
                    </div>
                  </div>

                  <div className="um-card-badges">
                    {isStudent ? (
                      <span className={`um-role-badge ${user.studentWing === 'school' ? 'student-school' : 'student-senior'}`}>
                        {user.studentWing === 'school' ? 'School Student' : 'College Student'}
                      </span>
                    ) : (
                      <span className="um-role-badge mentor">
                        Mentor
                      </span>
                    )}

                    {!isStudent && (
                      <span className={`um-status-badge ${user.status}`}>
                        {user.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body: Key Contact & Institutional Information */}
                <div className="um-card-meta-grid">
                  {/* Email */}
                  {user.email && (
                    <div className="um-meta-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      <span className="um-meta-text">
                        <a href={`mailto:${user.email}`}>{user.email}</a>
                      </span>
                    </div>
                  )}

                  {/* Phone */}
                  {user.mobileNumber && (
                    <div className="um-meta-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span className="um-meta-text">
                        <a href={`tel:${user.mobileNumber}`}>{user.mobileNumber}</a>
                      </span>
                    </div>
                  )}

                  {/* Institution or Company */}
                  {user.institutionOrCompany && (
                    <div className="um-meta-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M3 21h18M3 7v14M21 7v14M6 11h12M6 15h12M9 7V3h6v4" />
                      </svg>
                      <span className="um-meta-text">{user.institutionOrCompany}</span>
                    </div>
                  )}

                  {/* District / State */}
                  {user.district && (
                    <div className="um-meta-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="um-meta-text">{user.district}{user.state ? `, ${user.state}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer: Timestamp and Inspect Button */}
                <div className="um-card-footer">
                  <span className="um-card-timestamp">
                    Registered: {formatDate(user.createdAt)}
                  </span>

                  <button
                    type="button"
                    className="um-view-btn"
                    onClick={() => setSelectedUserModal(user)}
                    id={`um-inspect-btn-${user.id}`}
                  >
                    <span>View Full Profile</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Profile Detail Inspection Modal */}
      {selectedUserModal && (
        <div className="um-modal-backdrop" onClick={() => setSelectedUserModal(null)}>
          <div className="um-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="um-modal-header">
              <div className="um-modal-header-profile">
                <div
                  className={`um-avatar ${
                    selectedUserModal.role === 'student'
                      ? selectedUserModal.studentWing === 'school'
                        ? 'student-school'
                        : 'student-senior'
                      : 'mentor'
                  }`}
                >
                  {getInitials(selectedUserModal.fullName)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    {selectedUserModal.fullName}
                  </h3>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <span
                      className={`um-role-badge ${
                        selectedUserModal.role === 'student'
                          ? selectedUserModal.studentWing === 'school'
                            ? 'student-school'
                            : 'student-senior'
                          : 'mentor'
                      }`}
                    >
                      {selectedUserModal.role === 'student'
                        ? selectedUserModal.studentWing === 'school'
                          ? 'School Student'
                          : 'College Student'
                        : 'Mentor'}
                    </span>
                    {selectedUserModal.role === 'mentor' && (
                      <span className={`um-status-badge ${selectedUserModal.status}`}>
                        {selectedUserModal.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="um-modal-close-btn"
                onClick={() => setSelectedUserModal(null)}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="um-modal-body">
              {/* 1. Identity & Contact Information */}
              <div className="um-detail-section">
                <h5 className="um-section-title">Identity &amp; Contact</h5>
                <div className="um-detail-grid">
                  <div className="um-detail-field">
                    <span className="um-field-label">Email Address</span>
                    <span className="um-field-val">{selectedUserModal.email || 'Not Provided'}</span>
                  </div>
                  <div className="um-detail-field">
                    <span className="um-field-label">Mobile Number</span>
                    <span className="um-field-val">{selectedUserModal.mobileNumber || 'Not Provided'}</span>
                  </div>
                  <div className="um-detail-field">
                    <span className="um-field-label">District &amp; State</span>
                    <span className="um-field-val">
                      {selectedUserModal.district || 'N/A'}{selectedUserModal.state ? `, ${selectedUserModal.state}` : ''}
                    </span>
                  </div>
                  <div className="um-detail-field">
                    <span className="um-field-label">Account Created</span>
                    <span className="um-field-val">{formatDate(selectedUserModal.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Specific Details for Student Records */}
              {selectedUserModal.studentRecord && (
                <>
                  <div className="um-detail-section">
                    <h5 className="um-section-title">Academic Details</h5>
                    <div className="um-detail-grid">
                      <div className="um-detail-field">
                        <span className="um-field-label">Institution / School</span>
                        <span className="um-field-val">{selectedUserModal.studentRecord.institution_name || 'N/A'}</span>
                      </div>
                      <div className="um-detail-field">
                        <span className="um-field-label">Degree / Class</span>
                        <span className="um-field-val">{selectedUserModal.studentRecord.degree || 'N/A'}</span>
                      </div>
                      <div className="um-detail-field">
                        <span className="um-field-label">Branch / Stream</span>
                        <span className="um-field-val">{selectedUserModal.studentRecord.branch || 'N/A'}</span>
                      </div>
                      <div className="um-detail-field">
                        <span className="um-field-label">Current Year</span>
                        <span className="um-field-val">{selectedUserModal.studentRecord.current_year || 'N/A'}</span>
                      </div>
                      {selectedUserModal.studentRecord.current_cgpa && (
                        <div className="um-detail-field">
                          <span className="um-field-label">CGPA / Performance</span>
                          <span className="um-field-val">{selectedUserModal.studentRecord.current_cgpa}</span>
                        </div>
                      )}
                      {selectedUserModal.studentRecord.medium_of_study && (
                        <div className="um-detail-field">
                          <span className="um-field-label">Medium of Study</span>
                          <span className="um-field-val">{selectedUserModal.studentRecord.medium_of_study}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* School Minor Parent Consent Details */}
                  {selectedUserModal.studentRecord.is_minor && (
                    <div className="um-detail-section">
                      <h5 className="um-section-title">Parent / Guardian Consent (Minor Wing)</h5>
                      <div className="um-detail-grid">
                        <div className="um-detail-field">
                          <span className="um-field-label">Parent / Guardian Name</span>
                          <span className="um-field-val">{selectedUserModal.studentRecord.parent_name || 'N/A'}</span>
                        </div>
                        <div className="um-detail-field">
                          <span className="um-field-label">Relationship</span>
                          <span className="um-field-val" style={{ textTransform: 'capitalize' }}>
                            {selectedUserModal.studentRecord.parent_relationship || 'N/A'}
                          </span>
                        </div>
                        <div className="um-detail-field">
                          <span className="um-field-label">Parent Mobile</span>
                          <span className="um-field-val">{selectedUserModal.studentRecord.parent_mobile || 'N/A'}</span>
                        </div>
                        <div className="um-detail-field">
                          <span className="um-field-label">Consent Verified</span>
                          <span className="um-field-val" style={{ color: selectedUserModal.studentRecord.parent_consent_given ? '#15803d' : '#b45309' }}>
                            {selectedUserModal.studentRecord.parent_consent_given ? 'Verified by Parent' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Skills / Interests */}
                  {selectedUserModal.studentRecord.skills && selectedUserModal.studentRecord.skills.length > 0 && (
                    <div className="um-detail-section">
                      <h5 className="um-section-title">Skills &amp; Competencies</h5>
                      <div className="um-chips-row">
                        {selectedUserModal.studentRecord.skills.map((skill, idx) => (
                          <span key={idx} className="um-chip">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resume Document Link */}
                  {selectedUserModal.studentRecord.resume_url && (
                    <div className="um-detail-section">
                      <h5 className="um-section-title">Documents</h5>
                      <a
                        href={selectedUserModal.studentRecord.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="um-doc-link-btn"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        <span>View Uploaded Resume</span>
                      </a>
                    </div>
                  )}
                </>
              )}

              {/* 3. Specific Details for Mentor Records */}
              {selectedUserModal.mentorRecord && (
                <>
                  <div className="um-detail-section">
                    <h5 className="um-section-title">Professional Experience</h5>
                    <div className="um-detail-grid">
                      <div className="um-detail-field">
                        <span className="um-field-label">Current Company / Org</span>
                        <span className="um-field-val">{selectedUserModal.mentorRecord.workingIn || 'N/A'}</span>
                      </div>
                      <div className="um-detail-field">
                        <span className="um-field-label">Role / Working As</span>
                        <span className="um-field-val">{selectedUserModal.mentorRecord.workingAs || 'N/A'}</span>
                      </div>
                      <div className="um-detail-field">
                        <span className="um-field-label">City</span>
                        <span className="um-field-val">{selectedUserModal.mentorRecord.city || 'N/A'}</span>
                      </div>
                      <div className="um-detail-field">
                        <span className="um-field-label">State / Region</span>
                        <span className="um-field-val">{selectedUserModal.mentorRecord.region || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {selectedUserModal.mentorRecord.bio && (
                    <div className="um-detail-section">
                      <h5 className="um-section-title">Mentor Bio</h5>
                      <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.5', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
                        {selectedUserModal.mentorRecord.bio}
                      </p>
                    </div>
                  )}

                  {selectedUserModal.mentorRecord.technicalSkills && selectedUserModal.mentorRecord.technicalSkills.length > 0 && (
                    <div className="um-detail-section">
                      <h5 className="um-section-title">Technical Domains &amp; Skills</h5>
                      <div className="um-chips-row">
                        {selectedUserModal.mentorRecord.technicalSkills.map((skill: string, idx: number) => (
                          <span key={idx} className="um-chip">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedUserModal.mentorRecord.softSkills && selectedUserModal.mentorRecord.softSkills.length > 0 && (
                    <div className="um-detail-section">
                      <h5 className="um-section-title">Soft Skills</h5>
                      <div className="um-chips-row">
                        {selectedUserModal.mentorRecord.softSkills.map((skill: string, idx: number) => (
                          <span key={idx} className="um-chip">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* LinkedIn & Resume */}
                  <div className="um-detail-section">
                    <h5 className="um-section-title">Verification &amp; Links</h5>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {selectedUserModal.mentorRecord.linkedinUrl && (
                        <a
                          href={selectedUserModal.mentorRecord.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="um-doc-link-btn"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.79v8.37H6.46v-8.37M7.86 6.5a1.63 1.63 0 0 0-1.63 1.62c0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.62-1.63-1.62z" />
                          </svg>
                          <span>LinkedIn Profile</span>
                        </a>
                      )}

                      {selectedUserModal.mentorRecord.resumeUrl && (
                        <a
                          href={selectedUserModal.mentorRecord.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="um-doc-link-btn"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span>Mentor CV / Resume</span>
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="um-modal-footer">
              <button
                type="button"
                className="um-close-action-btn"
                onClick={() => setSelectedUserModal(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagementTab
