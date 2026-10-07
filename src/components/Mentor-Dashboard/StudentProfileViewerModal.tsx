import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MentorMenteeConnection } from '../../lib/mentor-mentee-connections'
import {
  getStudentProfileForMentor,
  type StudentDetailsPayload,
} from '../../lib/Students-details'
import './StudentProfileViewerModal.css'

export interface StudentProfileViewerModalProps {
  connection: MentorMenteeConnection | null
  isOpen: boolean
  onClose: () => void
  onAccept?: (connection: MentorMenteeConnection) => void
  onReject?: (connection: MentorMenteeConnection) => void
  onOpenChat?: (connection: MentorMenteeConnection) => void
}

export const StudentProfileViewerModal: React.FC<StudentProfileViewerModalProps> = ({
  connection,
  isOpen,
  onClose,
  onAccept,
  onReject,
  onOpenChat,
}) => {
  const [profile, setProfile] = useState<StudentDetailsPayload | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!isOpen || !connection) {
      setProfile(null)
      return
    }

    let isMounted = true
    setIsLoading(true)

    const fetchDetails = async () => {
      try {
        const data = await getStudentProfileForMentor(
          connection.user_id,
          connection.student_name
        )
        if (isMounted) {
          setProfile(data)
        }
      } catch (err) {
        console.warn('Error fetching student profile for mentor viewer:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchDetails()

    return () => {
      isMounted = false
    }
  }, [isOpen, connection])

  if (!isOpen || !connection) return null

  const studentName = profile?.full_name || connection.student_name || 'Student'
  const isSchoolWing = profile?.wing === 'school' || Boolean(profile?.is_minor)
  const wingLabel = isSchoolWing ? 'School Wing' : 'Senior Wing'

  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'S'

  const subtitle =
    profile?.institution_name
      ? `${profile.branch ? `${profile.branch} • ` : ''}${profile.institution_name}`
      : profile?.city
      ? `${profile.city}, ${profile.district || 'Tamil Nadu'}`
      : 'Karkai Student Learner'

  return createPortal(
    <div
      className="student-profile-viewer-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${studentName} Profile`}
    >
      <div className="student-profile-viewer-card" onClick={(e) => e.stopPropagation()}>
        {/* Mobile drag handle */}
        <div className="spv-drag-handle" />

        {/* Modal Header */}
        <header className="spv-header">
          <div className="spv-header-left">
            <div className="spv-avatar">
              <span>{initials}</span>
              <span className="spv-avatar-status-dot" />
            </div>
            <div className="spv-header-meta">
              <div className="spv-name-row">
                <h3 className="spv-name">{studentName}</h3>
                <span className={`spv-wing-badge ${isSchoolWing ? 'school' : 'senior'}`}>
                  {wingLabel}
                </span>
              </div>
              <p className="spv-sub" title={subtitle}>
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="spv-close-btn"
            onClick={onClose}
            aria-label="Close Profile"
            title="Close"
          >
            &times;
          </button>
        </header>

        {/* Modal Body */}
        <div className="spv-body">
          {isLoading ? (
            <div className="spv-loading-state">
              <div className="spv-spinner" />
              <p>Fetching full student profile record...</p>
            </div>
          ) : (
            <>
              {/* Section 1: Academic & Educational Details */}
              <div className="spv-section">
                <h4 className="spv-section-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                  Academic Details
                </h4>
                <div className="spv-grid">
                  <div className="spv-item full-width">
                    <span className="spv-label">School / College Institution</span>
                    <span className="spv-val highlight">
                      {profile?.institution_name || 'Not specified'}
                    </span>
                  </div>

                  {profile?.degree && (
                    <div className="spv-item">
                      <span className="spv-label">Degree</span>
                      <span className="spv-val">{profile.degree}</span>
                    </div>
                  )}

                  {profile?.branch && (
                    <div className="spv-item">
                      <span className="spv-label">Department / Branch</span>
                      <span className="spv-val">{profile.branch}</span>
                    </div>
                  )}

                  {profile?.current_year && (
                    <div className="spv-item">
                      <span className="spv-label">Current Academic Year</span>
                      <span className="spv-val">{profile.current_year}</span>
                    </div>
                  )}

                  {profile?.current_cgpa && (
                    <div className="spv-item">
                      <span className="spv-label">Current CGPA</span>
                      <span className="spv-val">{profile.current_cgpa}</span>
                    </div>
                  )}

                  {profile?.medium_of_study && (
                    <div className="spv-item">
                      <span className="spv-label">Medium of Study</span>
                      <span className="spv-val">{profile.medium_of_study}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Schooling History (10th & 12th) */}
              {(profile?.tenth_school_name || profile?.twelfth_school_name) && (
                <div className="spv-section">
                  <h4 className="spv-section-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    Schooling History
                  </h4>
                  <div className="spv-grid">
                    {profile?.tenth_school_name && (
                      <div className="spv-item">
                        <span className="spv-label">10th Standard School</span>
                        <span className="spv-val">{profile.tenth_school_name}</span>
                        {(profile.tenth_percentage || profile.tenth_marks) && (
                          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Score: {profile.tenth_percentage ? `${profile.tenth_percentage}%` : profile.tenth_marks}
                          </span>
                        )}
                      </div>
                    )}

                    {profile?.twelfth_school_name && (
                      <div className="spv-item">
                        <span className="spv-label">12th Standard School</span>
                        <span className="spv-val">{profile.twelfth_school_name}</span>
                        {(profile.twelfth_percentage || profile.twelfth_marks) && (
                          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Score: {profile.twelfth_percentage ? `${profile.twelfth_percentage}%` : profile.twelfth_marks}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 3: Location & Demographics */}
              <div className="spv-section">
                <h4 className="spv-section-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Location & Contact Info
                </h4>
                <div className="spv-grid">
                  <div className="spv-item">
                    <span className="spv-label">Native City / State</span>
                    <span className="spv-val">
                      {profile?.city
                        ? `${profile.city}${profile.district ? `, ${profile.district}` : ''}${profile.state ? `, ${profile.state}` : ''}`
                        : profile?.state || 'Tamil Nadu, India'}
                    </span>
                  </div>

                  {profile?.mobile_number && (
                    <div className="spv-item">
                      <span className="spv-label">Contact Mobile</span>
                      <span className="spv-val">
                        {profile.country_code ? `${profile.country_code} ` : ''}{profile.mobile_number}
                      </span>
                    </div>
                  )}

                  {profile?.gender && (
                    <div className="spv-item">
                      <span className="spv-label">Gender</span>
                      <span className="spv-val" style={{ textTransform: 'capitalize' }}>
                        {profile.gender}
                      </span>
                    </div>
                  )}

                  {profile?.age ? (
                    <div className="spv-item">
                      <span className="spv-label">Age</span>
                      <span className="spv-val">{profile.age} years</span>
                    </div>
                  ) : null}

                  {profile?.date_of_birth && (
                    <div className="spv-item">
                      <span className="spv-label">Date of Birth</span>
                      <span className="spv-val">{profile.date_of_birth}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Parent / Guardian Info (if school wing or minor) */}
              {isSchoolWing && (profile?.parent_name || profile?.parent_mobile) && (
                <div className="spv-section">
                  <h4 className="spv-section-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Parent / Guardian Information
                  </h4>
                  <div className="spv-grid">
                    {profile.parent_name && (
                      <div className="spv-item">
                        <span className="spv-label">Guardian Name</span>
                        <span className="spv-val">{profile.parent_name}</span>
                      </div>
                    )}
                    {profile.parent_relationship && (
                      <div className="spv-item">
                        <span className="spv-label">Relationship</span>
                        <span className="spv-val" style={{ textTransform: 'capitalize' }}>
                          {profile.parent_relationship}
                        </span>
                      </div>
                    )}
                    {profile.parent_mobile && (
                      <div className="spv-item">
                        <span className="spv-label">Parent Contact</span>
                        <span className="spv-val">{profile.parent_mobile}</span>
                      </div>
                    )}
                    <div className="spv-item">
                      <span className="spv-label">Parental Consent</span>
                      <span className="spv-val" style={{ color: '#16a34a' }}>
                        {profile.parent_consent_given !== false ? 'Verified & Granted' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 5: Technical Skills */}
              {profile?.skills && profile.skills.length > 0 && (
                <div className="spv-section">
                  <h4 className="spv-section-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    Technical & Core Skills
                  </h4>
                  <div className="spv-tags-cloud">
                    {profile.skills.map((skill) => (
                      <span key={skill} className="spv-chip tech">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 6: Soft Skills */}
              {profile?.soft_skills && profile.soft_skills.length > 0 && (
                <div className="spv-section">
                  <h4 className="spv-section-title">Soft Skills</h4>
                  <div className="spv-tags-cloud">
                    {profile.soft_skills.map((sskill) => (
                      <span key={sskill} className="spv-chip soft">
                        {sskill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 7: Learning Interests & Extracurriculars */}
              {((profile?.learning_interests && profile.learning_interests.length > 0) ||
                (profile?.extracurricular_activities &&
                  profile.extracurricular_activities.length > 0)) && (
                <div className="spv-section">
                  <h4 className="spv-section-title">Learning Interests & Extracurriculars</h4>
                  <div className="spv-tags-cloud">
                    {profile?.learning_interests?.map((interest) => (
                      <span key={interest} className="spv-chip interest">
                        {interest}
                      </span>
                    ))}
                    {profile?.extracurricular_activities?.map((act) => (
                      <span key={act} className="spv-chip extra">
                        {act}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 8: Professional Links & Attachments */}
              {(profile?.linkedin_url || profile?.resume_url) && (
                <div className="spv-section">
                  <h4 className="spv-section-title">Links & Attachments</h4>
                  <div className="spv-actions-box">
                    {profile.linkedin_url && (
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="spv-link-btn linkedin"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                        </svg>
                        <span>LinkedIn Profile</span>
                      </a>
                    )}

                    {profile.resume_url && (
                      <a
                        href={profile.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="spv-link-btn resume"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        <span>View Resume Document</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer with quick actions */}
        <footer className="spv-footer">
          {connection.status === 'pending' && onAccept && (
            <button
              type="button"
              className="spv-footer-btn accept"
              onClick={() => onAccept(connection)}
              id="spv-accept-request-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Accept Request</span>
            </button>
          )}

          {connection.status === 'pending' && onReject && (
            <button
              type="button"
              className="spv-footer-btn reject"
              onClick={() => onReject(connection)}
              id="spv-reject-request-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>Reject Request</span>
            </button>
          )}

          {connection.status === 'accepted' && onOpenChat && (
            <button
              type="button"
              className="spv-footer-btn chat"
              onClick={() => onOpenChat(connection)}
              id="spv-open-chat-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Open Direct Chat</span>
            </button>
          )}

          <button
            type="button"
            className="spv-footer-btn close"
            onClick={onClose}
            id="spv-close-footer-btn"
          >
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}

export default StudentProfileViewerModal
