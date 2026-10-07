import React, { useState } from 'react'
import karkaiLogoImg from '../../assets/Karkai_Logo.png'
import './TermsConditions.css'

export interface TermsConditionsProps {
  onAccept: () => void
  onBack?: () => void
}

type TabCategory = 'all' | 'terms' | 'privacy' | 'safety' | 'checklist'

export const TermsConditions: React.FC<TermsConditionsProps> = ({
  onAccept,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<TabCategory>('all')
  const [hasAgreed, setHasAgreed] = useState<boolean>(false)

  const handleAgreeAndContinue = () => {
    if (!hasAgreed) return
    try {
      localStorage.setItem('karkai_terms_accepted', 'true')
    } catch {
      // ignore storage errors
    }
    onAccept()
  }

  return (
    <div className="terms-page-wrapper">
      <div className="terms-bg-glow-1" />
      <div className="terms-bg-glow-2" />

      <main className="terms-container">
        {/* =========================================================================
            HEADER CARD
            ========================================================================= */}
        <header className="terms-header-card">
          <div className="terms-header-top">
            <div className="terms-brand-group">
              <img src={karkaiLogoImg} alt="Karkai" className="terms-logo-img" />
              <span className="terms-badge-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Legal & Governance Framework
              </span>
            </div>

            {onBack && (
              <button
                type="button"
                className="terms-back-link"
                onClick={onBack}
                aria-label="Back to Sign In"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Back to Sign In</span>
              </button>
            )}
          </div>

          <div className="terms-title-group">
            <h1 className="terms-main-title">
              Karkai Student–Mentor NGO Digital Platform
            </h1>
            <p className="terms-sub-title">
              Draft Terms, Privacy & Child-Safety Policy Framework
            </p>
          </div>

          {/* Legal Review Disclaimer Notice */}
          <div className="terms-draft-notice" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <strong>Draft status:</strong> Working template for product and legal review. This document is not legal advice and should be reviewed by a qualified Indian technology/privacy lawyer before publication or implementation.
            </div>
          </div>

          {/* Category Navigation Tabs */}
          <nav className="terms-nav-tabs" aria-label="Policy Sections">
            <button
              type="button"
              className={`terms-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Sections (19)
            </button>
            <button
              type="button"
              className={`terms-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
              onClick={() => setActiveTab('terms')}
            >
              Terms of Use (1–7)
            </button>
            <button
              type="button"
              className={`terms-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              Privacy & DPDP (8–12)
            </button>
            <button
              type="button"
              className={`terms-tab-btn ${activeTab === 'safety' ? 'active' : ''}`}
              onClick={() => setActiveTab('safety')}
            >
              Governance & Safety (13–19)
            </button>
            <button
              type="button"
              className={`terms-tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
              onClick={() => setActiveTab('checklist')}
            >
              Checklist & Structure
            </button>
          </nav>
        </header>

        {/* =========================================================================
            CONTENT CARD: Complete 19 Articles + Privacy Minimum Structure + Checklist
            ========================================================================= */}
        <section className="terms-content-card">
          {/* GROUP 1: Purpose, Definitions & Eligibility (Articles 1 to 7) */}
          {(activeTab === 'all' || activeTab === 'terms') && (
            <div className="terms-section-block">
              <div className="terms-section-header">
                <div className="terms-section-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <h2 className="terms-section-title">Part I: Platform Terms of Use & Code of Conduct</h2>
              </div>

              <div className="terms-articles-list">
                {/* 1. Purpose & Scope */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">1. Purpose & Scope</span>
                  </div>
                  <p className="terms-article-text">
                    This platform is intended to connect students with verified mentors for educational, career and developmental guidance. These terms apply to students, mentors and other authorised users of the platform.
                  </p>
                </article>

                {/* 2. Definitions */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">2. Definitions</span>
                  </div>
                  <p className="terms-article-text">
                    “Platform” means the NGO-operated application, website and related services. “Student” means a registered learner. “Mentor” means an individual approved to provide guidance. “Personal Data” has the meaning applicable under Indian data-protection law.
                  </p>
                </article>

                {/* 3. User Eligibility & Registration */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">3. User Eligibility & Registration</span>
                  </div>
                  <p className="terms-article-text">
                    Users must provide accurate information and must not impersonate another person. The platform may require identity, educational or professional verification. Accounts must not be shared. Additional safeguards and consent requirements apply where the user is a child/minor.
                  </p>
                </article>

                {/* 4. Mentor Verification */}
                <article className="terms-article-item highlight-mentor">
                  <div className="terms-article-top">
                    <span className="terms-article-number">4. Mentor Verification</span>
                    <span className="terms-article-badge mentor-badge">Mentor Policy</span>
                  </div>
                  <p className="terms-article-text">
                    Mentors may be required to provide identity and qualification/experience information. Verification does not guarantee a mentor’s advice or conduct. The organisation may suspend or remove a mentor where safety, policy or verification concerns arise.
                  </p>
                </article>

                {/* 5. Acceptable Use */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">5. Acceptable Use</span>
                  </div>
                  <p className="terms-article-text">
                    Users must not harass, bully, threaten, discriminate against, exploit, defraud or impersonate others. The platform must not be used to solicit inappropriate content, unauthorised payments, confidential information or unsafe off-platform interactions.
                  </p>
                </article>

                {/* 6. Mentor Code of Conduct */}
                <article className="terms-article-item highlight-mentor">
                  <div className="terms-article-top">
                    <span className="terms-article-number">6. Mentor Code of Conduct</span>
                    <span className="terms-article-badge mentor-badge">Conduct Rule</span>
                  </div>
                  <p className="terms-article-text">
                    Mentors must maintain professional boundaries, respect student privacy, avoid inappropriate communications, avoid exploiting their position, and report safeguarding concerns through the designated mechanism. Mentors must not misuse student information for personal or commercial purposes.
                  </p>
                </article>

                {/* 7. Student Safety & Child Protection */}
                <article className="terms-article-item highlight-child">
                  <div className="terms-article-top">
                    <span className="terms-article-number">7. Student Safety & Child Protection</span>
                    <span className="terms-article-badge child-badge">Child Safety</span>
                  </div>
                  <p className="terms-article-text">
                    Where minors use the service, the organisation should implement age-appropriate safeguards, parental/guardian consent mechanisms where legally required, reporting channels, moderation/escalation procedures and clear rules for mentor–student communications. Private meetings or communications outside approved channels should be governed by safeguarding procedures.
                  </p>
                </article>
              </div>
            </div>
          )}

          {/* GROUP 2: Data Collection, DPDP Act & Privacy (Articles 8 to 12) */}
          {(activeTab === 'all' || activeTab === 'privacy') && (
            <div className="terms-section-block">
              <div className="terms-section-header">
                <div className="terms-section-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2 className="terms-section-title">Part II: Data Protection & Privacy Framework (DPDP 2023)</h2>
              </div>

              <div className="terms-articles-list">
                {/* 8. Data Collection & Use */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">8. Data Collection & Use</span>
                  </div>
                  <p className="terms-article-text">
                    Collect only personal data reasonably necessary for stated purposes. The privacy notice should identify categories of data, purposes, legal basis/consent where applicable, recipients or categories of recipients, retention, user rights and contact/grievance information.
                  </p>
                </article>

                {/* 9. Consent & Children’s Data */}
                <article className="terms-article-item highlight-child">
                  <div className="terms-article-top">
                    <span className="terms-article-number">9. Consent & Children’s Data</span>
                    <span className="terms-article-badge child-badge">DPDP Act 2023</span>
                  </div>
                  <p className="terms-article-text">
                    For children, the platform should implement the consent and verification requirements applicable under the Digital Personal Data Protection Act, 2023 and the rules/requirements in force at the time of processing. Product flows should be reviewed before launch.
                  </p>
                </article>

                {/* 10. Data Retention & Deletion */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">10. Data Retention & Deletion</span>
                  </div>
                  <p className="terms-article-text">
                    Define retention periods by data category and purpose. When data is no longer required, it should be deleted or anonymised subject to applicable legal, contractual, safety, audit and dispute-preservation requirements.
                  </p>
                </article>

                {/* 11. Security Measures */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">11. Security Measures</span>
                  </div>
                  <p className="terms-article-text">
                    Use reasonable technical and organisational safeguards such as access controls, authentication, encryption where appropriate, logging, secure backups, vulnerability management and incident-response procedures.
                  </p>
                </article>

                {/* 12. Communication & Content */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">12. Communication & Content</span>
                  </div>
                  <p className="terms-article-text">
                    Platform communications may be subject to moderation and safety review consistent with the published privacy notice and applicable law. Users should not share unnecessary sensitive personal information.
                  </p>
                </article>
              </div>
            </div>
          )}

          {/* GROUP 3: Grievance, Disclaimers & Governance (Articles 13 to 19) */}
          {(activeTab === 'all' || activeTab === 'safety') && (
            <div className="terms-section-block">
              <div className="terms-section-header">
                <div className="terms-section-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h2 className="terms-section-title">Part III: Governance, Disclaimers & Compliance</h2>
              </div>

              <div className="terms-articles-list">
                {/* 13. Grievance & Complaints */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">13. Grievance & Complaints</span>
                  </div>
                  <p className="terms-article-text">
                    Provide a visible reporting mechanism for safety, privacy, harassment and account complaints. Publish the designated contact details and a process for acknowledgement, investigation, escalation and resolution.
                  </p>
                </article>

                {/* 14. Intellectual Property & User Content */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">14. Intellectual Property & User Content</span>
                  </div>
                  <p className="terms-article-text">
                    The organisation should specify ownership/licensing of platform content and the limited licence, if any, required to host and display user-submitted content. Users must have the rights necessary to submit content.
                  </p>
                </article>

                {/* 15. Disclaimers & Limitation of Liability */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">15. Disclaimers & Limitation of Liability</span>
                  </div>
                  <p className="terms-article-text">
                    Mentorship is guidance and does not guarantee academic, employment, financial, medical or other outcomes. Any limitation of liability must be drafted consistently with applicable Indian law and should not attempt to exclude obligations that cannot legally be excluded.
                  </p>
                </article>

                {/* 16. Suspension & Termination */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">16. Suspension & Termination</span>
                  </div>
                  <p className="terms-article-text">
                    Accounts may be restricted, suspended or terminated for policy violations, safety concerns, fraud, misuse or legal requirements. The policy should explain notice and appeal/review processes where appropriate.
                  </p>
                </article>

                {/* 17. Third-Party Services */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">17. Third-Party Services</span>
                  </div>
                  <p className="terms-article-text">
                    If the platform uses authentication providers, cloud hosting, analytics, communications, payment providers or other third parties, the privacy notice and contracts should address relevant data sharing and security responsibilities.
                  </p>
                </article>

                {/* 18. Governing Law & Jurisdiction */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">18. Governing Law & Jurisdiction</span>
                  </div>
                  <p className="terms-article-text">
                    The final document should identify the applicable Indian law and appropriate jurisdiction after legal review, taking into account the organisation’s legal structure and registered office.
                  </p>
                </article>

                {/* 19. Amendments */}
                <article className="terms-article-item">
                  <div className="terms-article-top">
                    <span className="terms-article-number">19. Amendments</span>
                  </div>
                  <p className="terms-article-text">
                    Material changes to the terms or privacy practices should be communicated through appropriate channels. The effective date and version history should be maintained.
                  </p>
                </article>
              </div>
            </div>
          )}

          {/* GROUP 4: Privacy Policy Minimum Structure & Implementation Checklist */}
          {(activeTab === 'all' || activeTab === 'checklist') && (
            <div className="terms-section-block">
              <div className="terms-section-header">
                <div className="terms-section-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <h2 className="terms-section-title">Privacy Policy Minimum Structure & Launch Checklist</h2>
              </div>

              {/* Minimum Structure 13 Points */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  Privacy Policy – Minimum Structure (13 Mandatory Pillars)
                </h3>
                <div className="terms-structure-grid">
                  {[
                    '1. Organisation identity and contact details',
                    '2. Categories of personal data collected',
                    '3. Sources of data',
                    '4. Purposes of processing',
                    '5. Consent and other applicable legal grounds',
                    '6. Children/minor data safeguards',
                    '7. Data sharing and third-party processors',
                    '8. Cross-border transfers, if applicable',
                    '9. Security safeguards',
                    '10. Retention and deletion',
                    '11. User rights and consent withdrawal where applicable',
                    '12. Grievance/contact mechanism',
                    '13. Policy updates and effective date',
                  ].map((item, idx) => (
                    <div key={idx} className="terms-structure-card">
                      <span className="terms-num-bubble">{idx + 1}</span>
                      <span className="terms-structure-title">{item.substring(item.indexOf(' ') + 1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Implementation Checklist 9 Points */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  Implementation Checklist
                </h3>
                <div className="terms-checklist-box">
                  {[
                    'Decide the NGO’s exact legal entity and platform operator.',
                    'Map every data field collected during student and mentor registration.',
                    'Design separate student and mentor onboarding flows.',
                    'Determine whether minors will be permitted and implement age/consent safeguards accordingly.',
                    'Create mentor verification and safeguarding SOPs.',
                    'Define reporting, moderation and escalation workflows.',
                    'Set retention periods and deletion procedures.',
                    'Prepare incident-response and access-control procedures.',
                    'Have the final Terms, Privacy Policy and safeguarding documents reviewed by qualified Indian counsel before launch.',
                  ].map((checkText, idx) => (
                    <div key={idx} className="terms-check-item">
                      <div className="terms-check-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="terms-check-text">{checkText}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* =========================================================================
          FIXED STICKY BOTTOM ACTION BAR (Agree Checkbox & Continue)
          ========================================================================= */}
      <footer className="terms-sticky-bottom-bar">
        <div className="terms-bottom-content">
          <label
            className={`terms-checkbox-wrap ${hasAgreed ? 'checked' : ''}`}
            onClick={() => setHasAgreed(!hasAgreed)}
            id="terms-agreement-checkbox-label"
          >
            <div className="terms-checkbox-custom">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="terms-agree-statement">
              I have read, understood, and agree to the <strong>Terms of Service</strong>, <strong>Privacy Policy</strong> & <strong>Child-Safety Framework</strong>.
            </span>
          </label>

          <button
            type="button"
            className="terms-continue-cta-btn"
            disabled={!hasAgreed}
            onClick={handleAgreeAndContinue}
            id="terms-agree-and-continue-btn"
          >
            <span>Agree & Continue to Sign In</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  )
}

export default TermsConditions
