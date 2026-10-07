import React, { useState, useRef, useEffect } from 'react'
import './StudentOnboarding.css'
import { extractDobFromIdCard } from '../../lib/ocr'
import { saveStudentDetails } from '../../lib/Students-details'
import { sendWelcomeEmail } from '../../lib/send-welcome-email'
import {
  getStudentDraft,
  saveStudentDraft,
  clearStudentDraft,
  clearActiveOnboardingRole,
} from '../../lib/onboarding-persistence'

export interface ParentConsentData {
  parentName: string
  relationship: 'father' | 'mother' | 'guardian'
  parentMobile: string
  consentGiven: boolean
}

export interface StudentProfileData {
  id?: string
  fullName: string
  mobileNumber: string
  countryCode: string
  dateOfBirth: string
  age: number
  isMinor: boolean
  idCardPhotoUrl: string
  idCardFileName?: string
  isPdf?: boolean

  // Parent Consent (Required if age < 18)
  parentConsent?: ParentConsentData

  // 1. Personal Details
  gender: string
  city: string
  district: string
  state?: string

  // Senior Student: Schooling Details (10th & 12th)
  tenthSchoolName?: string
  tenthMarks?: string
  tenthPercentage?: string
  twelfthSchoolName?: string
  twelfthMarks?: string
  twelfthPercentage?: string

  // Medium of Study (Tamil Medium or English Medium)
  mediumOfStudy?: 'Tamil Medium' | 'English Medium' | string

  // 2. Academic Info
  institutionName: string
  degree: string
  customDegree?: string
  branch: string
  currentYear: string
  currentCgpa?: string

  // 3. College Students: Skills & Soft Skills
  skills: string[]
  softSkills?: string[]

  // 4. School Students: Interests to Do & Extracurricular Activities
  learningInterests?: string[]
  extracurricularActivities?: string[]
  interests?: string[]

  // 5. Professional Links (College students)
  linkedinUrl?: string
  resumeFileName?: string
  resumeUrl?: string
}

export interface StudentOnboardingProps {
  initialName?: string
  initialEmail?: string
  onComplete: (data: StudentProfileData) => void
  onBack?: () => void
}

type OnboardingStep =
  | 'identity'
  | 'parent-consent'
  | 'personal'
  | 'schooling'
  | 'academic'
  | 'skills'
  | 'professional'

const POPULAR_SKILLS = [
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'C++',
  'C#',
  'Rust',
  'Go (Golang)',
  'SQL',
  'Dart',
  'Swift',
  'React',
  'Next.js',
  'Node.js',
  'Express.js',
  'HTML5 & CSS3',
  'Tailwind CSS',
  'Angular',
  'Vue.js',
  'Django',
  'FastAPI',
  'Spring Boot',
  'Artificial Intelligence',
  'Machine Learning',
  'Deep Learning',
  'Data Science',
  'Generative AI & LLMs',
  'Computer Vision',
  'NLP (Natural Language Processing)',
  'Data Analytics & Power BI',
  'TensorFlow / PyTorch',
  'Cloud Computing (AWS / GCP / Azure)',
  'Docker & Containers',
  'Kubernetes',
  'Git & GitHub',
  'Linux & Shell Scripting',
  'DevOps & CI/CD',
  'Flutter',
  'React Native',
  'Android Development',
  'iOS App Development',
  'Cybersecurity & Ethical Hacking',
  'Network Security',
  'IoT (Internet of Things)',
  'Robotics & Embedded Systems',
  'Blockchain & Web3',
  'UI/UX Design & Figma',
  'Database Management (MongoDB / PostgreSQL)',
  'Game Development (Unity / Unreal)',
]

const POPULAR_SOFT_SKILLS = [
  'Communication & Articulation',
  'Problem Solving & Logic',
  'Critical Thinking',
  'Leadership & Initiative',
  'Team Collaboration & Teamwork',
  'Time Management & Planning',
  'Adaptability & Agility',
  'Creative Thinking & Innovation',
  'Active Listening',
  'Public Speaking & Presentation',
  'Emotional Intelligence',
  'Conflict Resolution',
  'Decision Making',
  'Work Ethic & Self-Motivation',
  'Negotiation & Persuasion',
  'Project Management',
  'Mentorship & Peer Guidance',
]

// Preset options for School Student Wing (< 18)
const POPULAR_SCHOOL_INTERESTS = [
  'Coding & Web Apps',
  'Robotics & Arduino',
  'Artificial Intelligence & ChatGPT',
  'Game Design & Scratch',
  'Science Experiments & Olympiads',
  'Math & Logical Puzzles',
  '3D Modeling & Animation',
  'Astronomy & Space Science',
  'Mobile App Building',
  'Graphic Design & Digital Art',
  'Creative Writing & Storytelling',
  'Public Speaking & Debating',
  'Environment & Renewable Energy',
  'Financial Basics & Entrepreneurship',
]

const POPULAR_EXTRACURRICULAR = [
  'Cricket',
  'Football (Soccer)',
  'Basketball',
  'Badminton & Tennis',
  'Athletics & Track',
  'Swimming',
  'Martial Arts & Karate',
  'Chess & Strategy Games',
  'Music & Vocals',
  'Musical Instruments (Guitar/Keyboard)',
  'Drawing & Sketching',
  'Dance & Choreography',
  'Drama & Theatre',
  'Debate Club & Model UN (MUN)',
  'School Student Council / Leadership',
  'Photography & Video Making',
  'Scouts & Guides / NCC',
  'Volunteering & Community Service',
  'Quiz & Trivia Competitions',
]

export function calculateAge(dobIso: string): number {
  if (!dobIso) return 0
  const birthDate = new Date(dobIso)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return Math.max(0, age)
}

export function getYearsForDegree(deg: string, isMinorStudent: boolean): string[] {
  // For School Students (Tamil Nadu Board): Classes strictly from 6th to 12th Standard
  if (isMinorStudent) {
    return [
      '6th Standard',
      '7th Standard',
      '8th Standard',
      '9th Standard',
      '10th Standard (SSLC)',
      '11th Standard (+1)',
      '12th Standard (+2)',
    ]
  }

  if (!deg) return ['1st Year', '2nd Year', '3rd Year', 'Final Year']

  // If the student selects 'Other' / 'Other Degree' / custom -> list years up to 6
  if (deg.startsWith('Other')) {
    return [
      '1st Year',
      '2nd Year',
      '3rd Year',
      '4th Year',
      '5th Year',
      '6th Year',
    ]
  }

  // 1. Middle School (Grades 6 - 8)
  if (deg.includes('Middle School')) {
    return [
      'Class 6 / 6th Grade',
      'Class 7 / 7th Grade',
      'Class 8 / 8th Grade',
    ]
  }

  // 2. Secondary School (Class 9 & 10, ICSE, IGCSE, GCSE, SSLC, IBMYP)
  if (
    deg.includes('Class 9-10') ||
    deg.includes('Secondary School') ||
    deg.includes('ICSE') ||
    deg.includes('IGCSE') ||
    deg.includes('GCSE') ||
    deg.includes('SSLC') ||
    deg.includes('Secondary (Class 10)') ||
    deg.includes('IBMYP')
  ) {
    return [
      'Class 9 / 9th Grade (1st Year)',
      'Class 10 / 10th Grade / SSLC (Board Exam Year)',
    ]
  }

  // 3. North American 4-Year High School (US, Canada, AP)
  if (
    deg.includes('US High School') ||
    deg.includes('Canadian High School') ||
    deg.includes('AP Capstone') ||
    deg.includes('Dual Enrollment')
  ) {
    return [
      'Grade 9 (Freshman)',
      'Grade 10 (Sophomore)',
      'Grade 11 (Junior)',
      'Grade 12 (Senior - Final Year)',
    ]
  }

  // 4. Senior Secondary & Pre-University (Class 11 & 12, PUC, ISC, HSC, +2, IBDP, A-Levels, Baccalauréat, Abitur, Matura)
  if (
    deg.includes('Class 11-12') ||
    deg.includes('Higher Secondary') ||
    deg.includes('ISC') ||
    deg.includes('HSC') ||
    deg.includes('PUC') ||
    deg.includes('Junior College') ||
    deg.includes('Senior Secondary') ||
    deg.includes('IBDP') ||
    deg.includes('IBCP') ||
    deg.includes('A-Levels') ||
    deg.includes('AS-Levels') ||
    deg.includes('Scottish Highers') ||
    deg.includes('Baccalauréat') ||
    deg.includes('Abitur') ||
    deg.includes('Matura') ||
    deg.includes('Maturità') ||
    deg.includes('Bachillerato') ||
    deg.includes('ATAR') ||
    deg.includes('NCEA') ||
    deg.includes('Thanaweya')
  ) {
    return [
      'Class 11 / 1st Year (Junior High / +1)',
      'Class 12 / 2nd Year (Final Year High School / +2)',
    ]
  }

  // 5. Polytechnic 3-Year Diploma
  if (deg.includes('Polytechnic 3-Year') || deg.includes('Polytechnic / Advanced Diploma')) {
    return [
      '1st Year (Semester 1 & 2)',
      '2nd Year (Semester 3 & 4)',
      '3rd Year (Final Year - Semester 5 & 6)',
    ]
  }

  // 6. Vocational, ITI & Technical (1 - 2 Years)
  if (
    deg.includes('ITI') ||
    deg.includes('BTEC') ||
    deg.includes('T-Levels') ||
    deg.includes('Vocational') ||
    deg.includes('Apprenticeship')
  ) {
    return [
      '1st Year',
      '2nd Year (Final Year)',
    ]
  }

  // 7. University Foundation (1 Year)
  if (deg.includes('Foundation Programme')) {
    return [
      'Foundation Year (Term 1 / Term 2)',
    ]
  }

  // 8. Associate Degree (2 Years)
  if (deg.includes('Associate Degree')) {
    return [
      '1st Year (Freshman)',
      '2nd Year (Sophomore - Final Year)',
    ]
  }

  // 9. Undergraduate 5-Year Degrees / Medical / Architecture / Dual Degree
  if (
    deg.includes('MBBS') ||
    deg.includes('BDS') ||
    deg.includes('B.Arch') ||
    deg.includes('Integrated M.Tech') ||
    deg.includes('Dual Degree') ||
    deg.includes('Integrated Law') ||
    deg.includes('B.V.Sc')
  ) {
    return [
      '1st Year',
      '2nd Year',
      '3rd Year',
      '4th Year',
      '5th Year (Final Year)',
      'Internship / CRMI',
    ]
  }

  // 10. Undergraduate 4-Year Degrees (B.Tech, B.E., B.Des, B.Pharm, Accelerated)
  if (
    deg.includes('B.Tech') ||
    deg.includes('B.E.') ||
    deg.includes('B.Des') ||
    deg.includes('B.Pharm') ||
    deg.includes('Early Undergraduate Degree')
  ) {
    return [
      '1st Year',
      '2nd Year',
      '3rd Year',
      '4th Year (Final Year)',
    ]
  }

  // 11. Undergraduate 3-Year Degrees (B.Sc, BCA, B.Com, BBA, B.A., BSW)
  if (
    deg.includes('B.Sc') ||
    deg.includes('BCA') ||
    deg.includes('B.Com') ||
    deg.includes('BBA') ||
    deg.includes('B.A.') ||
    deg.includes('BSW')
  ) {
    return [
      '1st Year',
      '2nd Year',
      '3rd Year (Final Year)',
    ]
  }

  // 12. Postgraduate 2-Year Degrees (M.Tech, MCA, M.Sc, MBA, M.Com, MS)
  if (
    deg.includes('M.Tech') ||
    deg.includes('MCA') ||
    deg.includes('M.Sc') ||
    deg.includes('MBA') ||
    deg.includes('M.Com') ||
    deg.includes('MS')
  ) {
    return [
      '1st Year',
      '2nd Year (Final Year)',
    ]
  }

  // 13. Ph.D. / Research
  if (deg.includes('Ph.D') || deg.includes('Post-Doctoral') || deg.includes('Doctoral')) {
    return [
      '1st Year (Coursework)',
      '2nd Year (Research & Proposal)',
      '3rd Year (Research & Publications)',
      '4th Year (Pre-Synopsis / Thesis)',
      '5th Year+ (Thesis Defense)',
    ]
  }

  // Fallback default
  return isMinorStudent
    ? [
      'Class 11 / 1st Year',
      'Class 12 / 2nd Year (Final Year)',
    ]
    : [
      '1st Year',
      '2nd Year',
      '3rd Year',
      'Final Year (4th Year)',
    ]
}

// Helper to calculate percentage based on max marks (10th: 500, 12th: 600)
export const calculateTenthPercentage = (rawMarks: string): string => {
  const num = parseFloat(rawMarks)
  if (isNaN(num) || num <= 0) return ''
  const clamped = Math.min(num, 500)
  const pct = (clamped / 500) * 100
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`
}

export const calculateTwelfthPercentage = (rawMarks: string): string => {
  const num = parseFloat(rawMarks)
  if (isNaN(num) || num <= 0) return ''
  const clamped = Math.min(num, 600)
  const pct = (clamped / 600) * 100
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`
}

export const StudentOnboarding: React.FC<StudentOnboardingProps> = ({
  initialName = '',
  initialEmail = '',
  onComplete,
  onBack,
}) => {
  const userKey = initialEmail || initialName || 'default'
  const [initialDraft] = useState(() => getStudentDraft(userKey))
  const [showRestoredNotice, setShowRestoredNotice] = useState(() => Boolean(initialDraft))

  // Current active step
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialDraft?.currentStep || 'identity')

  // --- Step 1: Identity & DOB ---
  const [fullName, setFullName] = useState(initialDraft?.fullName ?? initialName)
  const [countryCode, setCountryCode] = useState(initialDraft?.countryCode || '+91')
  const [mobileNumber, setMobileNumber] = useState(initialDraft?.mobileNumber || '')
  const [dateOfBirth, setDateOfBirth] = useState<string>(initialDraft?.dateOfBirth || '')
  const [formattedDob, setFormattedDob] = useState<string>(initialDraft?.formattedDob || '')
  const [isScanningDob, setIsScanningDob] = useState<boolean>(false)
  const [ocrProgress, setOcrProgress] = useState<number>(0)
  const [ocrStatusText, setOcrStatusText] = useState<string>('Analyzing document...')
  const [dobOcrError, setDobOcrError] = useState<string | null>(null)
  const [idCardPhotoUrl, setIdCardPhotoUrl] = useState<string | null>(initialDraft?.idCardPhotoUrl ?? null)
  const [idCardFileName, setIdCardFileName] = useState<string>(initialDraft?.idCardFileName || '')
  const [isPdf, setIsPdf] = useState(initialDraft?.isPdf ?? false)
  const [isDragging, setIsDragging] = useState(false)

  // Derived age & minor status
  const age = calculateAge(dateOfBirth)
  const isMinor = Boolean(dateOfBirth && age < 18)

  // --- Step 1B: Minor Parent Consent ---
  const [parentName, setParentName] = useState(initialDraft?.parentName || '')
  const [parentRelationship, setParentRelationship] = useState<'father' | 'mother' | 'guardian'>(
    initialDraft?.parentRelationship || 'father'
  )
  const [parentMobile, setParentMobile] = useState(initialDraft?.parentMobile || '')
  const [parentConsentGiven, setParentConsentGiven] = useState(initialDraft?.parentConsentGiven ?? false)

  // --- Step 2: Personal Details (Gender, City / District) ---
  const [gender, setGender] = useState<string>(initialDraft?.gender || '')
  const [city, setCity] = useState<string>(initialDraft?.city || '')
  const [district, setDistrict] = useState<string>(initialDraft?.district || '')
  const [stateName, setStateName] = useState<string>(initialDraft?.stateName || '')

  // --- Step 2 (Senior Wing): 10th & 12th Schooling Details ---
  const [tenthSchoolName, setTenthSchoolName] = useState(initialDraft?.tenthSchoolName || '')
  const [tenthMarks, setTenthMarks] = useState(initialDraft?.tenthMarks || '')
  const [tenthPercentage, setTenthPercentage] = useState(initialDraft?.tenthPercentage || '')
  const [twelfthSchoolName, setTwelfthSchoolName] = useState(initialDraft?.twelfthSchoolName || '')
  const [twelfthMarks, setTwelfthMarks] = useState(initialDraft?.twelfthMarks || '')
  const [twelfthPercentage, setTwelfthPercentage] = useState(initialDraft?.twelfthPercentage || '')
  const [mediumOfStudy, setMediumOfStudy] = useState<'Tamil Medium' | 'English Medium' | ''>(
    initialDraft?.mediumOfStudy || ''
  )

  // --- Step 3: Academic Info ---
  const [institutionName, setInstitutionName] = useState(initialDraft?.institutionName || '')
  const [degree, setDegree] = useState(initialDraft?.degree || 'B.Tech')
  const [customDegree, setCustomDegree] = useState(initialDraft?.customDegree || '')
  const [branch, setBranch] = useState(initialDraft?.branch || '')
  const [currentYear, setCurrentYear] = useState(initialDraft?.currentYear || '1st Year')
  const [currentCgpa, setCurrentCgpa] = useState(initialDraft?.currentCgpa || '')

  // Automatically adapt degree and year defaults based on student age / wing
  useEffect(() => {
    if (initialDraft && initialDraft.degree) return

    if (isMinor) {
      if (degree === 'B.Tech' || !degree || (!degree.includes('Tamil Nadu') && !degree.includes('CBSE'))) {
        const defaultMinorDegree = 'Tamil Nadu State Board'
        setDegree(defaultMinorDegree)
        const minorYears = getYearsForDegree(defaultMinorDegree, true)
        setCurrentYear(minorYears[4] || minorYears[0]) // Default: 10th Standard (SSLC)
      }
    } else if (dateOfBirth && !isMinor) {
      if (
        degree.includes('Tamil Nadu') ||
        degree.includes('CBSE') ||
        degree.includes('Standard') ||
        degree.includes('Class') ||
        degree.includes('High School')
      ) {
        setDegree('B.Tech')
        setCurrentYear('1st Year')
      }
    }
  }, [isMinor, dateOfBirth])

  // Synchronize year of study whenever degree or age wing changes
  useEffect(() => {
    const validYears = getYearsForDegree(degree, isMinor)
    if (!validYears.includes(currentYear)) {
      setCurrentYear(validYears[0])
    }
  }, [degree, isMinor])

  // --- Step 4: Skills & Soft Skills (College Students) ---
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialDraft?.selectedSkills || [])
  const [customSkillInput, setCustomSkillInput] = useState('')
  const [selectedSoftSkills, setSelectedSoftSkills] = useState<string[]>(initialDraft?.selectedSoftSkills || [])
  const [customSoftSkillInput, setCustomSoftSkillInput] = useState('')

  // --- Step 4: Interests to Do & Extracurricular Activities (School Students) ---
  const [learningInterests, setLearningInterests] = useState<string[]>(initialDraft?.learningInterests || [])
  const [customInterestInput, setCustomInterestInput] = useState('')
  const [extracurricularActivities, setExtracurricularActivities] = useState<string[]>(
    initialDraft?.extracurricularActivities || []
  )
  const [customActivityInput, setCustomActivityInput] = useState('')

  // --- Step 5: Professional Links (Optional) ---
  const [linkedinUrl, setLinkedinUrl] = useState(initialDraft?.linkedinUrl || '')
  const [resumeFileName, setResumeFileName] = useState<string>(initialDraft?.resumeFileName || '')
  const [resumeFileSize, setResumeFileSize] = useState<string>(initialDraft?.resumeFileSize || '')
  const [resumeUrl, setResumeUrl] = useState<string>(initialDraft?.resumeUrl || '')

  // UI States
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  // Automatically persist draft whenever fields or steps change
  useEffect(() => {
    saveStudentDraft(userKey, {
      currentStep,
      fullName,
      countryCode,
      mobileNumber,
      dateOfBirth,
      formattedDob,
      idCardPhotoUrl,
      idCardFileName,
      isPdf,
      parentName,
      parentRelationship,
      parentMobile,
      parentConsentGiven,
      gender,
      city,
      district,
      stateName,
      tenthSchoolName,
      tenthMarks,
      tenthPercentage,
      twelfthSchoolName,
      twelfthMarks,
      twelfthPercentage,
      mediumOfStudy,
      institutionName,
      degree,
      customDegree,
      branch,
      currentYear,
      currentCgpa,
      selectedSkills,
      selectedSoftSkills,
      learningInterests,
      extracurricularActivities,
      linkedinUrl,
      resumeFileName,
      resumeFileSize,
      resumeUrl,
    })
  }, [
    userKey,
    currentStep,
    fullName,
    countryCode,
    mobileNumber,
    dateOfBirth,
    formattedDob,
    idCardPhotoUrl,
    idCardFileName,
    isPdf,
    parentName,
    parentRelationship,
    parentMobile,
    parentConsentGiven,
    gender,
    city,
    district,
    stateName,
    tenthSchoolName,
    tenthMarks,
    tenthPercentage,
    twelfthSchoolName,
    twelfthMarks,
    twelfthPercentage,
    mediumOfStudy,
    institutionName,
    degree,
    customDegree,
    branch,
    currentYear,
    currentCgpa,
    selectedSkills,
    selectedSoftSkills,
    learningInterests,
    extracurricularActivities,
    linkedinUrl,
    resumeFileName,
    resumeFileSize,
    resumeUrl,
  ])

  const handleStartOver = () => {
    clearStudentDraft(userKey)
    setShowRestoredNotice(false)
    setCurrentStep('identity')
    setFullName(initialName)
    setCountryCode('+91')
    setMobileNumber('')
    setDateOfBirth('')
    setFormattedDob('')
    setIdCardPhotoUrl(null)
    setIdCardFileName('')
    setIsPdf(false)
    setParentName('')
    setParentRelationship('father')
    setParentMobile('')
    setParentConsentGiven(false)
    setGender('')
    setCity('')
    setDistrict('')
    setStateName('')
    setTenthSchoolName('')
    setTenthMarks('')
    setTenthPercentage('')
    setTwelfthSchoolName('')
    setTwelfthMarks('')
    setTwelfthPercentage('')
    setMediumOfStudy('')
    setInstitutionName('')
    setDegree('B.Tech')
    setCustomDegree('')
    setBranch('')
    setCurrentYear('1st Year')
    setCurrentCgpa('')
    setSelectedSkills([])
    setSelectedSoftSkills([])
    setLearningInterests([])
    setExtracurricularActivities([])
    setLinkedinUrl('')
    setResumeFileName('')
    setResumeFileSize('')
    setResumeUrl('')
    setSuccessNotice('Draft reset. Starting fresh!')
    setTimeout(() => setSuccessNotice(null), 3000)
  }

  // -------------------------------------------------------------
  // Step 1: ID Card & OCR Handlers
  // -------------------------------------------------------------
  const runOcrExtraction = async (imageDataUrl: string) => {
    setIsScanningDob(true)
    setDobOcrError(null)
    setDateOfBirth('')
    setFormattedDob('')
    setOcrProgress(15)
    setOcrStatusText('Analyzing ID card...')

    try {
      const res = await extractDobFromIdCard(imageDataUrl, (pct, status) => {
        setOcrProgress(pct)
        setOcrStatusText(status)
      })

      if (res.success && res.dob) {
        setDateOfBirth(res.dob)
        setFormattedDob(res.formattedDob || res.dob)
        setSuccessNotice('Date of birth successfully detected!')
        setTimeout(() => setSuccessNotice(null), 4000)
      } else {
        setDobOcrError(
          res.error ||
          'Could not find Date of Birth on this image. For College/School ID cards, the Date of Birth is usually printed on the BACK side. Please upload a clear photo of the back side.'
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error extracting DOB.'
      setDobOcrError(msg)
    } finally {
      setIsScanningDob(false)
    }
  }

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const openCameraPicker = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
      cameraInputRef.current.click()
    }
  }

  const processSelectedFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size is too large (maximum 10MB). Please choose a smaller image.')
      return
    }

    const isPdfFile = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    setIsPdf(isPdfFile)
    setIdCardFileName(file.name)
    setErrorMessage(null)

    if (isPdfFile) {
      setErrorMessage(
        'PDF files cannot be scanned for Date of Birth automatically. Please take a clear photo or upload an image (.jpg, .jpeg, .png) of the ID card side showing your Date of Birth.'
      )
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setIdCardPhotoUrl(result)
      runOcrExtraction(result)
    }
    reader.onerror = () => {
      setErrorMessage('Could not read the selected image file. Please try another format.')
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
  }


  const handleRemovePhoto = () => {
    setIdCardPhotoUrl(null)
    setIdCardFileName('')
    setIsPdf(false)
    setDateOfBirth('')
    setFormattedDob('')
    setDobOcrError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }



  // -------------------------------------------------------------
  // Skills & Soft Skills Handlers
  // -------------------------------------------------------------
  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill))
    } else {
      setSelectedSkills([...selectedSkills, skill])
    }
  }

  const handleAddCustomSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = customSkillInput.trim()
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills([...selectedSkills, trimmed])
      setCustomSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill))
  }

  const toggleSoftSkill = (softSkill: string) => {
    if (selectedSoftSkills.includes(softSkill)) {
      setSelectedSoftSkills(selectedSoftSkills.filter((s) => s !== softSkill))
    } else {
      setSelectedSoftSkills([...selectedSoftSkills, softSkill])
    }
  }

  const handleAddCustomSoftSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = customSoftSkillInput.trim()
    if (trimmed && !selectedSoftSkills.includes(trimmed)) {
      setSelectedSoftSkills([...selectedSoftSkills, trimmed])
      setCustomSoftSkillInput('')
    }
  }

  const removeSoftSkill = (softSkill: string) => {
    setSelectedSoftSkills(selectedSoftSkills.filter((s) => s !== softSkill))
  }

  // -------------------------------------------------------------
  // School Students: Interests & Extracurricular Handlers
  // -------------------------------------------------------------
  const toggleLearningInterest = (interest: string) => {
    if (learningInterests.includes(interest)) {
      setLearningInterests(learningInterests.filter((i) => i !== interest))
    } else {
      setLearningInterests([...learningInterests, interest])
    }
  }

  const handleAddCustomInterest = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = customInterestInput.trim()
    if (trimmed && !learningInterests.includes(trimmed)) {
      setLearningInterests([...learningInterests, trimmed])
      setCustomInterestInput('')
    }
  }

  const removeLearningInterest = (interest: string) => {
    setLearningInterests(learningInterests.filter((i) => i !== interest))
  }

  const toggleExtracurricular = (activity: string) => {
    if (extracurricularActivities.includes(activity)) {
      setExtracurricularActivities(extracurricularActivities.filter((a) => a !== activity))
    } else {
      setExtracurricularActivities([...extracurricularActivities, activity])
    }
  }

  const handleAddCustomActivity = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = customActivityInput.trim()
    if (trimmed && !extracurricularActivities.includes(trimmed)) {
      setExtracurricularActivities([...extracurricularActivities, trimmed])
      setCustomActivityInput('')
    }
  }

  const removeExtracurricular = (activity: string) => {
    setExtracurricularActivities(extracurricularActivities.filter((a) => a !== activity))
  }

  // -------------------------------------------------------------
  // Resume File Upload Handler
  // -------------------------------------------------------------
  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 100 * 1024) {
        const sizeKb = (file.size / 1024).toFixed(1)
        setErrorMessage(`Resume file is too large (${sizeKb}KB). Maximum allowed file size is 100KB.`)
        if (resumeInputRef.current) resumeInputRef.current.value = ''
        return
      }
      setErrorMessage(null)
      setResumeFileName(file.name)
      const sizeKb = (file.size / 1024).toFixed(1)
      setResumeFileSize(`${sizeKb} KB`)
      const reader = new FileReader()
      reader.onload = (event) => {
        setResumeUrl(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveResume = () => {
    setResumeFileName('')
    setResumeFileSize('')
    setResumeUrl('')
    if (resumeInputRef.current) resumeInputRef.current.value = ''
  }

  // -------------------------------------------------------------
  // Step Navigation & Validation Handlers
  // -------------------------------------------------------------
  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name as shown on your ID card.')
      return
    }

    const cleanMobile = mobileNumber.replace(/\D/g, '')
    if (cleanMobile.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.')
      return
    }

    if (!idCardPhotoUrl) {
      setErrorMessage('Please upload your ID card photo to extract your Date of Birth.')
      return
    }

    if (isScanningDob) {
      setErrorMessage('Please wait while your Date of Birth is being detected...')
      return
    }

    if (!dateOfBirth) {
      setErrorMessage('Date of Birth has not been detected yet. Please upload a clear photo of the ID card side showing your DOB.')
      return
    }

    setErrorMessage(null)

    // Age segregation:
    // If age < 18 -> Route to Parent Consent Flow
    // If age >= 18 -> Proceed directly to Personal Details
    if (isMinor) {
      setCurrentStep('parent-consent')
    } else {
      setCurrentStep('personal')
    }
  }

  const handleParentConsentContinue = (e: React.FormEvent) => {
    e.preventDefault()

    if (!parentName.trim()) {
      setErrorMessage('Please enter parent/guardian full name.')
      return
    }

    const cleanParentMobile = parentMobile.replace(/\D/g, '')
    if (cleanParentMobile.length < 10) {
      setErrorMessage('Please enter a valid 10-digit parent/guardian mobile number.')
      return
    }

    if (!parentConsentGiven) {
      setErrorMessage('Parent/Guardian consent checkbox must be accepted to continue.')
      return
    }

    setErrorMessage(null)
    setCurrentStep('personal')
  }

  const handlePersonalContinue = (e: React.FormEvent) => {
    e.preventDefault()

    if (!gender) {
      setErrorMessage('Please select your gender.')
      return
    }

    if (!city.trim()) {
      setErrorMessage('Please enter your City.')
      return
    }

    if (!district.trim()) {
      setErrorMessage('Please enter your District.')
      return
    }

    setErrorMessage(null)
    setCurrentStep(isMinor ? 'academic' : 'schooling')
  }

  const handleTenthMarksChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned
    const num = parseFloat(sanitized)
    if (!isNaN(num) && num > 500) {
      setTenthMarks('500')
      setTenthPercentage('100%')
      return
    }
    setTenthMarks(sanitized)
    setTenthPercentage(calculateTenthPercentage(sanitized))
  }

  const handleTwelfthMarksChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned
    const num = parseFloat(sanitized)
    if (!isNaN(num) && num > 600) {
      setTwelfthMarks('600')
      setTwelfthPercentage('100%')
      return
    }
    setTwelfthMarks(sanitized)
    setTwelfthPercentage(calculateTwelfthPercentage(sanitized))
  }

  const handleSchoolingContinue = (e: React.FormEvent) => {
    e.preventDefault()

    if (!tenthSchoolName.trim()) {
      setErrorMessage('Please enter your 10th Standard School Name.')
      return
    }

    if (!tenthMarks.trim()) {
      setErrorMessage('Please enter the marks you obtained in 10th Standard (out of 500).')
      return
    }

    const tMarksNum = parseFloat(tenthMarks)
    if (isNaN(tMarksNum) || tMarksNum < 0 || tMarksNum > 500) {
      setErrorMessage('10th marks must be a valid number between 0 and 500.')
      return
    }

    if (!twelfthSchoolName.trim()) {
      setErrorMessage('Please enter your 12th Standard / Diploma School Name.')
      return
    }

    if (!twelfthMarks.trim()) {
      setErrorMessage('Please enter the marks you obtained in 12th Standard (out of 600).')
      return
    }

    const twMarksNum = parseFloat(twelfthMarks)
    if (isNaN(twMarksNum) || twMarksNum < 0 || twMarksNum > 600) {
      setErrorMessage('12th marks must be a valid number between 0 and 600.')
      return
    }

    if (!mediumOfStudy) {
      setErrorMessage('Please select whether you studied in Tamil Medium or English Medium.')
      return
    }

    setErrorMessage(null)
    setCurrentStep('academic')
  }

  const handleAcademicContinue = (e: React.FormEvent) => {
    e.preventDefault()

    if (!institutionName.trim()) {
      setErrorMessage(isMinor ? 'Please enter your School Name.' : 'Please enter your Institution / College / University name.')
      return
    }

    if (!isMinor && degree.startsWith('Other') && !customDegree.trim()) {
      setErrorMessage('Please enter your specific educational degree.')
      return
    }

    const isHigherSecondary = isMinor && (currentYear.includes('11th') || currentYear.includes('12th'))

    if (!isMinor) {
      if (!branch.trim()) {
        setErrorMessage('Please enter your Branch / Department / Field of study (e.g. AI & DS, Computer Science).')
        return
      }
      if (!currentCgpa.trim()) {
        setErrorMessage('Please enter your Current CGPA.')
        return
      }
    } else if (isHigherSecondary) {
      if (!branch.trim()) {
        setErrorMessage('Please enter your Higher Secondary subject group (e.g. Bio-Maths, Computer Science).')
        return
      }
    }

    if (isMinor && !mediumOfStudy) {
      setErrorMessage('Please select whether you are studying in Tamil Medium or English Medium.')
      return
    }

    setErrorMessage(null)
    setCurrentStep('skills')
  }

  const handleSkillsContinue = (e: React.FormEvent) => {
    e.preventDefault()

    if (isMinor) {
      if (learningInterests.length === 0 && extracurricularActivities.length === 0) {
        setErrorMessage('Please select or add at least 1 learning interest or extracurricular activity.')
        return
      }
      setErrorMessage(null)
      // School Student Wing finishes directly at Step 4!
      handleFinishProfile(true)
      return
    }

    if (selectedSkills.length === 0 && selectedSoftSkills.length === 0) {
      setErrorMessage('Please select or add at least 1 technical or soft skill.')
      return
    }

    setErrorMessage(null)
    setCurrentStep('professional')
  }

  const handleFinishProfile = async (skipOptional = false) => {
    setErrorMessage(null)
    setIsLoading(true)

    const finalData: StudentProfileData = {
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.replace(/\D/g, ''),
      countryCode,
      dateOfBirth,
      age,
      isMinor,
      idCardPhotoUrl: idCardPhotoUrl || '',
      idCardFileName,
      isPdf,

      ...(isMinor
        ? {
          parentConsent: {
            parentName: parentName.trim(),
            relationship: parentRelationship,
            parentMobile: parentMobile.replace(/\D/g, ''),
            consentGiven: parentConsentGiven,
          },
        }
        : {}),

      gender,
      city: city.trim(),
      district: district.trim(),
      state: stateName.trim() || undefined,

      ...(!isMinor
        ? {
          tenthSchoolName: tenthSchoolName.trim(),
          tenthMarks: `${tenthMarks.trim()} / 500`,
          tenthPercentage: tenthPercentage || calculateTenthPercentage(tenthMarks),
          twelfthSchoolName: twelfthSchoolName.trim(),
          twelfthMarks: `${twelfthMarks.trim()} / 600`,
          twelfthPercentage: twelfthPercentage || calculateTwelfthPercentage(twelfthMarks),
          currentCgpa: currentCgpa.trim(),
        }
        : {}),

      mediumOfStudy: mediumOfStudy || undefined,

      institutionName: institutionName.trim(),
      degree: degree.startsWith('Other') && customDegree.trim() ? customDegree.trim() : degree,
      branch: isMinor
        ? (currentYear.includes('11th') || currentYear.includes('12th')
          ? branch.trim()
          : 'General (Standard 6-10)')
        : branch.trim(),
      currentYear,
      currentCgpa: !isMinor ? currentCgpa.trim() : undefined,

      skills: isMinor ? learningInterests : selectedSkills,
      softSkills: isMinor ? undefined : selectedSoftSkills,
      learningInterests: isMinor ? learningInterests : undefined,
      extracurricularActivities: isMinor ? extracurricularActivities : undefined,

      ...(!skipOptional
        ? {
          linkedinUrl: linkedinUrl.trim() || undefined,
          resumeFileName: resumeFileName || undefined,
          resumeUrl: resumeUrl || undefined,
        }
        : {}),
    }

    try {
      // Save all fields and assets to Supabase 'Student-details' table and 'Students-assets' bucket (ID card omitted from backend)
      const saveRes = await saveStudentDetails(finalData, undefined, initialEmail)
      if (saveRes.data) {
        // If storage returned updated public URL for resume, incorporate it
        if (saveRes.data.resume_url) {
          finalData.resumeUrl = saveRes.data.resume_url
        }
      }

      // Send welcome onboarding email via Gmail SMTP
      const targetEmail = initialEmail || (saveRes?.data && saveRes.data.email)
      if (targetEmail) {
        sendWelcomeEmail({
          email: targetEmail,
          name: finalData.fullName,
          role: 'student',
        }).catch((e) => console.warn('Welcome email trigger notice:', e))
      }
    } catch (err) {
      console.warn('Backend sync notice (Student details):', err)
    } finally {
      clearStudentDraft(userKey)
      clearActiveOnboardingRole(userKey)
      setIsLoading(false)
      onComplete(finalData)
    }
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Step indicator calculations (Minor: 4 steps, Senior: 5 steps)
  // -------------------------------------------------------------
  const getStepNumber = (step: OnboardingStep): number => {
    if (isMinor) {
      switch (step) {
        case 'identity': return 0
        case 'parent-consent': return 1
        case 'personal': return 2
        case 'academic': return 3
        case 'skills': return 4
        default: return 1
      }
    } else {
      switch (step) {
        case 'identity': return 0
        case 'personal': return 1
        case 'schooling': return 2
        case 'academic': return 3
        case 'skills': return 4
        case 'professional': return 5
        default: return 1
      }
    }
  }

  const totalSteps = isMinor ? 4 : 5
  const currentStepNum = getStepNumber(currentStep)
  const progressPercent =
    currentStep === 'identity'
      ? dateOfBirth ? 20 : 5
      : Math.round(((currentStepNum - 1) / (totalSteps - 1)) * 100)

  return (
    <div className="student-onboarding-wrapper">
      <div className="student-onboarding-glow" aria-hidden="true" />

      {/* Hidden native file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        id="student-id-file-input"
        accept="image/*,.png,.jpg,.jpeg,.webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        id="student-id-camera-input"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={resumeInputRef}
        type="file"
        id="student-resume-file-input"
        accept=".pdf,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleResumeFileChange}
      />

      <main className="student-onboarding-card">
        {/* Nav Header */}
        <nav className="student-nav" aria-label="Onboarding Navigation">
          <button
            type="button"
            className="student-back-btn"
            onClick={() => {
              if (currentStep === 'identity') {
                if (onBack) onBack()
              } else if (currentStep === 'parent-consent') {
                setCurrentStep('identity')
              } else if (currentStep === 'personal') {
                setCurrentStep(isMinor ? 'parent-consent' : 'identity')
              } else if (currentStep === 'schooling') {
                setCurrentStep('personal')
              } else if (currentStep === 'academic') {
                setCurrentStep(isMinor ? 'personal' : 'schooling')
              } else if (currentStep === 'skills') {
                setCurrentStep('academic')
              } else if (currentStep === 'professional') {
                setCurrentStep('skills')
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back</span>
          </button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {dateOfBirth && (
              <span className={`age-category-pill ${isMinor ? 'minor' : 'adult'}`}>
                {isMinor ? `School Student Wing (${age} yrs)` : `Senior Student Wing (${age} yrs)`}
              </span>
            )}
            <span className="student-step-badge">
              {currentStep === 'identity' ? 'Identity Verification' : `Step ${currentStepNum} of ${totalSteps}`}
            </span>
          </div>
        </nav>

        {/* Resumed Draft Notice */}
        {showRestoredNotice && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              marginBottom: '16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              color: '#166534',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💾</span>
              <span><strong>Resuming draft:</strong> Continuing from where you left off.</span>
            </div>
            <button
              type="button"
              onClick={handleStartOver}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#dc2626',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Start Fresh
            </button>
          </div>
        )}

        {/* Stepper Progress Bar */}
        <div className="student-stepper-container">
          <div className="student-stepper-track">
            <div className="student-stepper-line" />
            <div className="student-stepper-progress" style={{ width: `${progressPercent}%` }} />

            {currentStep === 'identity' ? (
              <>
                <div className="student-step-item active">
                  <div className="student-step-node active">1</div>
                  <span className="student-step-node-label">ID & DOB</span>
                </div>
                <div className={`student-step-item ${dateOfBirth ? 'completed' : ''}`}>
                  <div className={`student-step-node ${dateOfBirth ? 'completed' : ''}`}>
                    {dateOfBirth ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : '2'}
                  </div>
                  <span className="student-step-node-label">
                    {dateOfBirth ? (isMinor ? 'School Wing' : 'Senior Wing') : 'Age Check'}
                  </span>
                </div>
                <div className="student-step-item">
                  <div className="student-step-node">3</div>
                  <span className="student-step-node-label">Wing Details</span>
                </div>
                <div className="student-step-item">
                  <div className="student-step-node">4</div>
                  <span className="student-step-node-label">Complete</span>
                </div>
              </>
            ) : isMinor ? (
              <>
                {/* 1. Parent Consent Page */}
                <div className={`student-step-item ${currentStepNum >= 1 ? (currentStepNum > 1 ? 'completed' : 'active') : ''}`}>
                  <div className={`student-step-node ${currentStepNum >= 1 ? (currentStepNum > 1 ? 'completed' : 'active') : ''}`}>
                    {currentStepNum > 1 ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : '1'}
                  </div>
                  <span className="student-step-node-label">Parent Consent</span>
                </div>

                {/* 2. Personal Details */}
                <div className={`student-step-item ${currentStepNum >= 2 ? (currentStepNum > 2 ? 'completed' : 'active') : ''}`}>
                  <div className={`student-step-node ${currentStepNum >= 2 ? (currentStepNum > 2 ? 'completed' : 'active') : ''}`}>
                    {currentStepNum > 2 ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : '2'}
                  </div>
                  <span className="student-step-node-label">Personal Info</span>
                </div>

                {/* 3. School Details */}
                <div className={`student-step-item ${currentStepNum >= 3 ? (currentStepNum > 3 ? 'completed' : 'active') : ''}`}>
                  <div className={`student-step-node ${currentStepNum >= 3 ? (currentStepNum > 3 ? 'completed' : 'active') : ''}`}>
                    {currentStepNum > 3 ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : '3'}
                  </div>
                  <span className="student-step-node-label">School Details</span>
                </div>

                {/* 4. Interests & Extracurricular Activities */}
                <div className={`student-step-item ${currentStepNum >= 4 ? 'active' : ''}`}>
                  <div className={`student-step-node ${currentStepNum >= 4 ? 'active' : ''}`}>
                    4
                  </div>
                  <span className="student-step-node-label">Interests & Activities</span>
                </div>
              </>
            ) : (
              <>
                {/* 1. Personal Details */}
                <div className={`student-step-item ${currentStepNum >= 1 ? (currentStepNum > 1 ? 'completed' : 'active') : ''}`}>
                  <div className={`student-step-node ${currentStepNum >= 1 ? (currentStepNum > 1 ? 'completed' : 'active') : ''}`}>
                    {currentStepNum > 1 ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : '1'}
                  </div>
                  <span className="student-step-node-label">Personal Info</span>
                </div>

                {/* 2. 10th/12th Details */}
                <div className={`student-step-item ${currentStepNum >= 2 ? (currentStepNum > 2 ? 'completed' : 'active') : ''}`}>
                  <div className={`student-step-node ${currentStepNum >= 2 ? (currentStepNum > 2 ? 'completed' : 'active') : ''}`}>
                    {currentStepNum > 2 ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : '2'}
                  </div>
                  <span className="student-step-node-label">10th / 12th Details</span>
                </div>

                {/* 3. Academic Details */}
                <div className={`student-step-item ${currentStepNum >= 3 ? (currentStepNum > 3 ? 'completed' : 'active') : ''}`}>
                  <div className={`student-step-node ${currentStepNum >= 3 ? (currentStepNum > 3 ? 'completed' : 'active') : ''}`}>
                    {currentStepNum > 3 ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : '3'}
                  </div>
                  <span className="student-step-node-label">Academic Details</span>
                </div>

                {/* 4. Skills */}
                <div className={`student-step-item ${currentStepNum >= 4 ? (currentStepNum > 4 ? 'completed' : 'active') : ''}`}>
                  <div className={`student-step-node ${currentStepNum >= 4 ? (currentStepNum > 4 ? 'completed' : 'active') : ''}`}>
                    {currentStepNum > 4 ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : '4'}
                  </div>
                  <span className="student-step-node-label">Skills</span>
                </div>

                {/* 5. Resume & Links */}
                <div className={`student-step-item ${currentStepNum >= 5 ? 'active' : ''}`}>
                  <div className={`student-step-node ${currentStepNum >= 5 ? 'active' : ''}`}>
                    5
                  </div>
                  <span className="student-step-node-label">Resume & Links</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* =========================================================================
            STEP 1: IDENTITY & DATE OF BIRTH VERIFICATION
            ========================================================================= */}
        {currentStep === 'identity' && (
          <div>
            <header className="student-header">
              <div className="student-badge-title-group">
                <div className="student-title-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <h1 className="student-title">Student Profile & Verification</h1>
              </div>
              <p className="student-subtitle">
                Upload your ID card. Your Date of Birth will be automatically verified and detected.
              </p>
            </header>

            <form onSubmit={handleStep1Continue} className="student-form">
              {errorMessage && (
                <div className="student-alert-box error" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {successNotice && (
                <div className="student-alert-box success" role="status">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>{successNotice}</span>
                </div>
              )}

              {/* 1. Full Name */}
              <div className="form-field">
                <label htmlFor="student-name-input" className="field-label">
                  <span>Full Name <span className="required-star">*</span></span>
                </label>
                <input
                  id="student-name-input"
                  type="text"
                  className="input-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <span className="field-hint">Enter your name as it appears on your student ID card</span>
              </div>

              {/* 2. Mobile Number */}
              <div className="form-field">
                <label htmlFor="student-mobile-input" className="field-label">
                  <span>Mobile Number <span className="required-star">*</span></span>
                </label>
                <div className="phone-input-group">
                  <div className="country-code-pill">
                    <span>🇮🇳</span>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '14px',
                        color: '#334155',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+65">+65</option>
                      <option value="+971">+971</option>
                    </select>
                  </div>
                  <input
                    id="student-mobile-input"
                    type="tel"
                    className="input-control phone-input"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    maxLength={15}
                    required
                  />
                </div>
                <span className="field-hint">Used for mentorship session alerts & SMS updates</span>
              </div>

              {/* 3. Automated Date of Birth */}
              <div className="form-field">
                <div className="field-label">
                  <span>Date of Birth <span className="required-star">*</span></span>
                  <span className="dob-ocr-badge">Auto-Detected</span>
                </div>

                {isScanningDob && (
                  <div className="ocr-scanning-box">
                    <div className="ocr-scan-line-animation" />
                    <div className="ocr-scanning-content" style={{ width: '100%' }}>
                      <div className="btn-spinner dark" />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <strong>{ocrStatusText}</strong>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>{ocrProgress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${ocrProgress}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #0284c7, #10b981)',
                              transition: 'width 0.25s ease',
                            }}
                          />
                        </div>
                        <p style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                          Locally analyzing ID card to extract your Date of Birth.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isScanningDob && dateOfBirth && (
                  <div className="ocr-verified-dob-card">
                    <div className="ocr-verified-top">
                      <span className="ocr-verified-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Verified from ID Card</span>
                      </span>
                      <span className="ocr-verified-lock">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Tamper-Proof
                      </span>
                    </div>
                    <div className="ocr-verified-date-row">
                      <div className="ocr-calendar-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div>
                        <span className="ocr-verified-label">Verified Date of Birth</span>
                        <h3 className="ocr-verified-val">
                          {formattedDob || dateOfBirth}{' '}
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            (Age: {age} {age === 1 ? 'yr' : 'yrs'})
                          </span>
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                {!isScanningDob && dobOcrError && (
                  <div className="ocr-error-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                      <strong>Date of Birth Not Found</strong>
                      <p>{dobOcrError}</p>
                    </div>
                  </div>
                )}

                {!isScanningDob && !dateOfBirth && !dobOcrError && (
                  <div className="ocr-empty-hint-card">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Upload your ID card below to automatically grab and verify your Date of Birth.</span>
                  </div>
                )}
              </div>

              {/* 4. ID Card Photo */}
              <div className="form-field">
                <div className="field-label">
                  <span>ID Card Photo <span className="required-star">*</span></span>
                  <span className="dob-requirement-pill">DOB Must Be Visible</span>
                </div>

                <div className="id-notice-box" style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', padding: '14px 16px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ background: '#0f172a', color: '#ffffff', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                    <div className="id-notice-content">
                      <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                        Upload the side showing your Date of Birth:
                      </strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '13px', lineHeight: '1.5', color: '#475569' }}>
                        <li><strong>College / University IDs:</strong> Date of Birth is typically printed on the <strong>BACK side</strong>.</li>
                        <li><strong>Aadhaar / PAN Cards:</strong> Date of Birth is printed on the <strong>FRONT side</strong>.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {!idCardPhotoUrl ? (
                  <div
                    className={`id-upload-dropzone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="upload-icon-circle">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>

                    <p className="upload-primary-text">Upload ID Card Photo (Side with Date of Birth)</p>
                    <p className="upload-secondary-text">For College IDs, please upload the <strong>back side</strong> where your DOB is printed.</p>

                    <div className="upload-buttons-row">
                      <button type="button" className="upload-action-btn primary" onClick={openFilePicker} id="choose-id-file-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Browse ID Card Photo</span>
                      </button>

                      <button type="button" className="upload-action-btn" onClick={openCameraPicker} id="camera-id-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span>Take Photo</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="id-preview-container">
                    <div className="id-preview-image-wrapper">
                      <img src={idCardPhotoUrl} alt="Uploaded Student ID Card Preview" className="id-preview-img" />
                      {isScanningDob ? (
                        <div className="id-dob-overlay-badge scanning">
                          <div className="btn-spinner" />
                          <span>Detecting Date of Birth...</span>
                        </div>
                      ) : dateOfBirth ? (
                        <div className="id-dob-overlay-badge success">
                          <span className="check-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span>DOB: {formattedDob || dateOfBirth}</span>
                        </div>
                      ) : (
                        <div className="id-dob-overlay-badge warning">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          <span>DOB Not Found (Upload Back Side)</span>
                        </div>
                      )}
                    </div>

                    <div className="id-preview-actions">
                      <span className="id-preview-filename" title={idCardFileName} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        {idCardFileName || 'student-id-card.jpg'}
                      </span>
                      <div className="preview-action-btns">
                        <button type="button" className="id-change-btn" onClick={openFilePicker}>Replace</button>
                        <button type="button" className="id-remove-btn" onClick={handleRemovePhoto}>Remove</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="student-submit-btn"
                disabled={isScanningDob || !dateOfBirth}
                id="student-onboarding-continue-step1"
              >
                <span>
                  {dateOfBirth
                    ? isMinor
                      ? 'Continue to Parent Consent (Step 1 of 4)'
                      : 'Continue to Personal Details (Step 1 of 4)'
                    : 'Upload ID Card to Continue'}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            STEP 1B: PARENT CONSENT FLOW (AGE < 18)
            ========================================================================= */}
        {currentStep === 'parent-consent' && (
          <div>
            <header className="student-header">
              <div className="student-badge-title-group">
                <div className="student-title-icon" style={{ background: '#d97706', color: '#ffffff' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h1 className="student-title">Parent / Guardian Consent</h1>
              </div>
              <p className="student-subtitle">
                Because you are under 18 years of age (Age: {age} yrs), parental consent is required to participate in Karkai mentorship programs.
              </p>
            </header>

            <div className="minor-consent-banner">
              <div className="minor-consent-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h4 className="minor-consent-title">Minor Student Verification</h4>
                <p className="minor-consent-desc">
                  Based on your verified Date of Birth ({formattedDob || dateOfBirth}), you are currently <strong>{age} years old</strong>. Please provide your parent or legal guardian's details below to proceed.
                </p>
              </div>
            </div>

            {/* Upcoming Feature Notice Banner */}
            <div className="upcoming-module-banner">
              <div className="upcoming-module-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Upcoming Development</span>
              </div>
              <h4 className="upcoming-module-title">
                Parent Consent Verification Module — Coming in Upcoming Development
              </h4>
              <p className="upcoming-module-desc">
                This verification module will come in upcoming development. Until then, please provide your parent or guardian's details below so we have them recorded. All School Wing students will have a badge in their profile:
              </p>
              <div className="upcoming-module-badge-preview">
                <span className="preview-badge-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Parent consent have to be done!
                </span>
              </div>
            </div>

            <form onSubmit={handleParentConsentContinue} className="student-form">
              {errorMessage && (
                <div className="student-alert-box error" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Parent Name */}
              <div className="form-field">
                <label htmlFor="parent-name-input" className="field-label">
                  <span>Parent / Legal Guardian Full Name <span className="required-star">*</span></span>
                </label>
                <input
                  id="parent-name-input"
                  type="text"
                  className="input-control"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  required
                />
              </div>

              {/* Relationship & Mobile in one row */}
              <div className="form-field-row">
                <div className="form-field">
                  <label htmlFor="parent-rel-select" className="field-label">
                    <span>Relationship <span className="required-star">*</span></span>
                  </label>
                  <select
                    id="parent-rel-select"
                    className="input-control"
                    value={parentRelationship}
                    onChange={(e) => setParentRelationship(e.target.value as any)}
                  >
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="guardian">Legal Guardian</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="parent-mobile-input" className="field-label">
                    <span>Parent Mobile Number <span className="required-star">*</span></span>
                  </label>
                  <input
                    id="parent-mobile-input"
                    type="tel"
                    className="input-control"
                    value={parentMobile}
                    onChange={(e) => setParentMobile(e.target.value)}
                    maxLength={15}
                    required
                  />
                </div>
              </div>

              {/* Consent Checkbox Card */}
              <label className="parent-consent-checkbox-card">
                <input
                  type="checkbox"
                  checked={parentConsentGiven}
                  onChange={(e) => setParentConsentGiven(e.target.checked)}
                  required
                />
                <p className="parent-consent-agreement-text">
                  I confirm that I have informed my parent/guardian, and grant parental authorization for <strong>{fullName}</strong> to join Karkai educational courses and mentorship activities.
                </p>
              </label>

              <button type="submit" className="student-submit-btn" style={{ marginTop: '24px' }}>
                <span>Continue to Personal Details (Step 2 of 4)</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            STEP 2: PERSONAL DETAILS & AUTO LOCATION (GENDER & CITY/DISTRICT)
            ========================================================================= */}
        {currentStep === 'personal' && (
          <div>
            <header className="student-header">
              <div className="student-badge-title-group">
                <div className="student-title-icon" style={{ background: '#1e3a8a', color: '#ffffff' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h1 className="student-title">Personal Details</h1>
              </div>
              <p className="student-subtitle">
                Tell us about yourself and your location details below.
              </p>
            </header>

            <form onSubmit={handlePersonalContinue} className="student-form">
              {errorMessage && (
                <div className="student-alert-box error" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Student Wing & Verified Age Display (Before Gender) */}
              <div className={`student-wing-card ${isMinor ? 'junior' : 'senior'}`}>
                <div className="student-wing-left">
                  <div className="student-wing-icon">
                    {isMinor ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M12 3L2 7h20L12 3z" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    )}
                  </div>
                  <h3 className="student-wing-title">
                    {isMinor ? 'School Student Wing' : 'Senior Student Wing'}
                  </h3>
                </div>
                <div className="student-age-badge">
                  {age} Years Old
                </div>
              </div>

              {/* Gender Selection */}
              <div className="form-field">
                <label className="field-label">
                  <span>Gender <span className="required-star">*</span></span>
                </label>
                <div className="gender-chips-grid">
                  {[
                    { id: 'male', label: 'Male' },
                    { id: 'female', label: 'Female' },
                    { id: 'other', label: 'Other' },
                    { id: 'prefer-not-to-say', label: 'Prefer not to say' },
                  ].map((g) => (
                    <div
                      key={g.id}
                      className={`gender-chip-card ${gender === g.id ? 'selected' : ''}`}
                      onClick={() => setGender(g.id)}
                    >
                      <span className="gender-chip-label">{g.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* City and District */}
              <div className="form-field" style={{ marginTop: '16px' }}>
                <label className="field-label">
                  <span>Location (City / District) <span className="required-star">*</span></span>
                </label>

                <div className="form-field-row">
                  <div>
                    <label htmlFor="city-input" className="field-sublabel" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>City</label>
                    <input
                      id="city-input"
                      type="text"
                      className="input-control"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="district-input" className="field-sublabel" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>District</label>
                    <input
                      id="district-input"
                      type="text"
                      className="input-control"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <span className="field-hint">Enter your current city and district</span>
              </div>

              {/* State / Province */}
              <div className="form-field">
                <label htmlFor="state-input" className="field-label">
                  <span>State / Province</span>
                </label>
                <input
                  id="state-input"
                  type="text"
                  className="input-control"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                />
              </div>

              <button type="submit" className="student-submit-btn" style={{ marginTop: '20px' }}>
                <span>{isMinor ? 'Continue to School Details (Step 3 of 4)' : 'Continue to 10th/12th Details (Step 2 of 5)'}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            STEP 2 (SENIOR WING): 10th & 12th SCHOOLING DETAILS
            ========================================================================= */}
        {currentStep === 'schooling' && (
          <div>
            <header className="student-header">
              <div className="student-badge-title-group">
                <div className="student-title-icon" style={{ background: '#1e3a8a', color: '#ffffff' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M12 3L2 7h20L12 3z" />
                  </svg>
                </div>
                <h1 className="student-title">10th / 12th Details</h1>
              </div>
              <p className="student-subtitle">
                Enter your secondary and higher secondary school names along with marks or percentages obtained.
              </p>
            </header>

            <form onSubmit={handleSchoolingContinue} className="student-form">
              {errorMessage && (
                <div className="student-alert-box error" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 10th Standard Section */}
              <div className="schooling-section-box">
                <div className="schooling-section-header">
                  <div className="schooling-section-icon tenth">
                    <span>10</span>
                  </div>
                  <h3 className="schooling-section-title">10th Standard (Secondary School)</h3>
                </div>

                <div className="form-field">
                  <label htmlFor="tenth-school-input" className="field-label">
                    <span>10th School Name <span className="required-star">*</span></span>
                  </label>
                  <input
                    id="tenth-school-input"
                    type="text"
                    className="input-control"
                    value={tenthSchoolName}
                    onChange={(e) => setTenthSchoolName(e.target.value)}
                    required
                  />
                  <span className="field-hint">
                    Enter the name of your 10th standard school
                  </span>
                </div>

                <div className="form-field-row marks-row" style={{ marginTop: '14px' }}>
                  <div className="form-field">
                    <label htmlFor="tenth-marks-input" className="field-label">
                      <span>10th Marks (Out of 500) <span className="required-star">*</span></span>
                    </label>
                    <div className="marks-input-group">
                      <input
                        id="tenth-marks-input"
                        type="text"
                        inputMode="decimal"
                        className="input-control"
                        value={tenthMarks}
                        onChange={(e) => handleTenthMarksChange(e.target.value)}
                        required
                      />
                      <span className="marks-suffix-badge">/ 500</span>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">
                      <span>Calculated Percentage</span>
                    </label>
                    <div className={`calculated-percentage-box ${tenthPercentage ? 'active' : ''}`}>
                      <span className="calculated-percentage-label">Percentage:</span>
                      <span className={`calculated-percentage-value ${tenthPercentage ? '' : 'empty'}`}>
                        {tenthPercentage ? `${tenthPercentage}` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 12th Standard / Diploma Section */}
              <div className="schooling-section-box">
                <div className="schooling-section-header">
                  <div className="schooling-section-icon twelfth">
                    <span>12</span>
                  </div>
                  <h3 className="schooling-section-title">12th Standard / Diploma (Higher Secondary)</h3>
                </div>

                <div className="form-field">
                  <label htmlFor="twelfth-school-input" className="field-label">
                    <span>12th / Diploma School Name <span className="required-star">*</span></span>
                  </label>
                  <input
                    id="twelfth-school-input"
                    type="text"
                    className="input-control"
                    value={twelfthSchoolName}
                    onChange={(e) => setTwelfthSchoolName(e.target.value)}
                    required
                  />
                  <span className="field-hint">
                    Enter your higher secondary school or polytechnic institution name
                  </span>
                </div>

                <div className="form-field-row marks-row" style={{ marginTop: '14px' }}>
                  <div className="form-field">
                    <label htmlFor="twelfth-marks-input" className="field-label">
                      <span>12th Marks (Out of 600) <span className="required-star">*</span></span>
                    </label>
                    <div className="marks-input-group">
                      <input
                        id="twelfth-marks-input"
                        type="text"
                        inputMode="decimal"
                        className="input-control"
                        value={twelfthMarks}
                        onChange={(e) => handleTwelfthMarksChange(e.target.value)}
                        required
                      />
                      <span className="marks-suffix-badge">/ 600</span>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">
                      <span>Calculated Percentage</span>
                    </label>
                    <div className={`calculated-percentage-box ${twelfthPercentage ? 'active' : ''}`}>
                      <span className="calculated-percentage-label">Percentage:</span>
                      <span className={`calculated-percentage-value ${twelfthPercentage ? '' : 'empty'}`}>
                        {twelfthPercentage ? `${twelfthPercentage}` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medium of Study Section (10th & 12th) */}
              <div className="schooling-section-box">
                <div className="schooling-section-header">
                  <div className="schooling-section-icon medium">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </div>
                  <h3 className="schooling-section-title">Medium of Study (10th / 12th) <span className="required-star">*</span></h3>
                </div>

                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                  Select whether you studied in Tamil Medium or English Medium during your schooling:
                </p>

                <div className="medium-choice-grid">
                  <button
                    type="button"
                    className={`medium-choice-card ${mediumOfStudy === 'Tamil Medium' ? 'active' : ''}`}
                    onClick={() => setMediumOfStudy('Tamil Medium')}
                  >
                    <div className="medium-choice-radio">
                      <span className="medium-radio-dot" />
                    </div>
                    <div className="medium-choice-info">
                      <span className="medium-choice-title">Tamil Medium</span>
                      <span className="medium-choice-sub">தமிழ் வழி கல்வி</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`medium-choice-card ${mediumOfStudy === 'English Medium' ? 'active' : ''}`}
                    onClick={() => setMediumOfStudy('English Medium')}
                  >
                    <div className="medium-choice-radio">
                      <span className="medium-radio-dot" />
                    </div>
                    <div className="medium-choice-info">
                      <span className="medium-choice-title">English Medium</span>
                      <span className="medium-choice-sub">English Medium Instruction</span>
                    </div>
                  </button>
                </div>
              </div>

              <button type="submit" className="student-submit-btn" style={{ marginTop: '10px' }}>
                <span>Continue to Academic Details (Step 3 of 5)</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            STEP 3: ACADEMIC INFO
            ========================================================================= */}
        {currentStep === 'academic' && (
          <div>
            <header className="student-header">
              <div className="student-badge-title-group">
                <div className="student-title-icon" style={{ background: '#1e3a8a', color: '#ffffff' }}>
                  {isMinor ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M12 3L2 7h20L12 3z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                  )}
                </div>
                <h1 className="student-title">{isMinor ? 'School Details' : 'Academic Details'}</h1>
              </div>
              <p className="student-subtitle">
                {isMinor
                  ? 'Provide your school name, board, and current standard to help mentors guide your studies.'
                  : 'Provide your education background to help mentors match with your curriculum.'}
              </p>
            </header>

            <form onSubmit={handleAcademicContinue} className="student-form">
              {errorMessage && (
                <div className="student-alert-box error" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Institution / College / School Name */}
              <div className="form-field">
                <label htmlFor="inst-name-input" className="field-label">
                  <span>{isMinor ? 'School Name' : 'College / Institution / University'} <span className="required-star">*</span></span>
                </label>
                <input
                  id="inst-name-input"
                  type="text"
                  className="input-control"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  required
                />
              </div>

              {/* Degree / Program & Year in row */}
              <div className="form-field-row">
                <div className="form-field">
                  <label htmlFor="degree-select" className="field-label">
                    <span>{isMinor ? 'School Board / Curriculum' : 'Degree / Program'} <span className="required-star">*</span></span>
                  </label>
                  <select
                    id="degree-select"
                    className="input-control"
                    value={degree}
                    onChange={(e) => {
                      const newDegree = e.target.value
                      setDegree(newDegree)
                      const newYears = getYearsForDegree(newDegree, isMinor)
                      if (!newYears.includes(currentYear)) {
                        setCurrentYear(newYears[0])
                      }
                    }}
                  >
                    {isMinor ? (
                      <>
                        <option value="Tamil Nadu State Board">Tamil Nadu State Board</option>
                        <option value="CBSE">CBSE</option>
                      </>
                    ) : (
                      <>
                        <optgroup label="Engineering & Technology (UG)">
                          <option value="B.Tech">B.Tech (Bachelor of Technology)</option>
                          <option value="B.E.">B.E. (Bachelor of Engineering)</option>
                          <option value="B.Sc">B.Sc (Bachelor of Science)</option>
                          <option value="BCA">BCA (Bachelor of Computer Applications)</option>
                          <option value="B.Des">B.Des (Bachelor of Design)</option>
                          <option value="B.Arch">B.Arch (Bachelor of Architecture)</option>
                          <option value="Integrated M.Tech / Dual Degree">Integrated M.Tech / Dual Degree (5 Years)</option>
                          <option value="Polytechnic / Advanced Diploma">Polytechnic / Advanced Engineering Diploma</option>
                        </optgroup>

                        <optgroup label="Business, Management & Humanities">
                          <option value="B.Com">B.Com (Bachelor of Commerce)</option>
                          <option value="BBA">BBA / BMS (Bachelor of Business Administration)</option>
                          <option value="B.A.">B.A. (Bachelor of Arts)</option>
                          <option value="BSW">BSW (Bachelor of Social Work)</option>
                          <option value="Integrated Law (BA LLB / BBA LLB)">Integrated Law (BA LLB / BBA LLB)</option>
                        </optgroup>

                        <optgroup label="Medical & Health Sciences">
                          <option value="MBBS">MBBS (Bachelor of Medicine & Surgery)</option>
                          <option value="BDS">BDS (Bachelor of Dental Surgery)</option>
                          <option value="B.Pharm">B.Pharm / Pharm.D (Pharmacy)</option>
                          <option value="B.Sc Nursing">B.Sc Nursing / Allied Health Sciences</option>
                          <option value="B.V.Sc">B.V.Sc (Veterinary Science)</option>
                        </optgroup>

                        <optgroup label="Postgraduate & Master's Degrees">
                          <option value="M.Tech">M.Tech / M.E. (Master of Technology / Engineering)</option>
                          <option value="MCA">MCA (Master of Computer Applications)</option>
                          <option value="M.Sc">M.Sc (Master of Science)</option>
                          <option value="MBA">MBA / PGDM (Master of Business Administration)</option>
                          <option value="M.Com">M.Com / M.A.</option>
                          <option value="MS">MS (Master of Science by Research)</option>
                        </optgroup>

                        <optgroup label="Doctoral & Research">
                          <option value="Ph.D.">Ph.D. / Doctoral Scholar</option>
                          <option value="Post-Doctoral">Post-Doctoral Fellow</option>
                        </optgroup>

                        <optgroup label="Other Programs">
                          <option value="Other Degree">Other Higher Education Degree</option>
                          <option value="Other Educational Degree">Other Educational Degree / Qualification</option>
                        </optgroup>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="year-select" className="field-label">
                    <span>{isMinor ? 'Class / Standard' : 'Year of Study'} <span className="required-star">*</span></span>
                  </label>
                  <select
                    id="year-select"
                    className="input-control"
                    value={currentYear}
                    onChange={(e) => setCurrentYear(e.target.value)}
                  >
                    {getYearsForDegree(degree, isMinor).map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional Input Box for Other Educational Degree / Program (College Only) */}
              {!isMinor && degree.startsWith('Other') && (
                <div className="form-field" style={{ animation: 'fadeIn 0.2s ease-in' }}>
                  <label htmlFor="custom-degree-input" className="field-label">
                    <span>Specify Your Educational Degree <span className="required-star">*</span></span>
                  </label>
                  <input
                    id="custom-degree-input"
                    type="text"
                    className="input-control"
                    value={customDegree}
                    onChange={(e) => setCustomDegree(e.target.value)}
                    required
                  />
                  <span className="field-hint">
                    Type the exact title of your degree, major, or qualification
                  </span>
                </div>
              )}

              {/* Branch / Department (College Students) */}
              {!isMinor && (
                <div className="form-field">
                  <label htmlFor="branch-input" className="field-label">
                    <span>Branch / Department / Specialization <span className="required-star">*</span></span>
                  </label>
                  <input
                    id="branch-input"
                    type="text"
                    className="input-control"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    required
                  />
                  <span className="field-hint">
                    e.g. Computer Science, Artificial Intelligence & Data Science, Mechanical, Electronics
                  </span>
                </div>
              )}

              {/* Current CGPA (College Students) */}
              {!isMinor && (
                <div className="form-field">
                  <label htmlFor="cgpa-input" className="field-label">
                    <span>Current CGPA <span className="required-star">*</span></span>
                  </label>
                  <input
                    id="cgpa-input"
                    type="text"
                    className="input-control"
                    value={currentCgpa}
                    onChange={(e) => setCurrentCgpa(e.target.value)}
                    required
                  />
                  <span className="field-hint">
                    Enter your cumulative grade point average (e.g. 8.7 or 8.7/10)
                  </span>
                </div>
              )}

              {/* Higher Secondary Group (Only enabled if school student selects 11th or 12th Standard) */}
              {isMinor && (currentYear.includes('11th') || currentYear.includes('12th')) && (
                <div className="form-field" style={{ animation: 'onboardingFadeIn 0.3s ease' }}>
                  <label htmlFor="school-group-input" className="field-label">
                    <span>Higher Secondary Group / Stream <span className="required-star">*</span></span>
                  </label>

                  <input
                    id="school-group-input"
                    type="text"
                    className="input-control"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    required
                  />
                  <span className="field-hint">
                    Enter your group / subject stream (e.g. Bio-Maths, Computer Science, Commerce, Arts)
                  </span>
                </div>
              )}

              {/* Medium of Study for School Students */}
              {isMinor && (
                <div className="form-field" style={{ marginTop: '10px' }}>
                  <label className="field-label">
                    <span>Medium of Study / பயிற்று மொழி <span className="required-star">*</span></span>
                  </label>
                  <span className="field-hint" style={{ marginTop: '-4px', marginBottom: '8px', display: 'block' }}>
                    Select whether you are studying in Tamil Medium or English Medium:
                  </span>
                  <div className="medium-choice-grid">
                    <button
                      type="button"
                      className={`medium-choice-card ${mediumOfStudy === 'Tamil Medium' ? 'active' : ''}`}
                      onClick={() => setMediumOfStudy('Tamil Medium')}
                    >
                      <div className="medium-choice-radio">
                        <span className="medium-radio-dot" />
                      </div>
                      <div className="medium-choice-info">
                        <span className="medium-choice-title">Tamil Medium</span>
                        <span className="medium-choice-sub">தமிழ் வழி கல்வி</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`medium-choice-card ${mediumOfStudy === 'English Medium' ? 'active' : ''}`}
                      onClick={() => setMediumOfStudy('English Medium')}
                    >
                      <div className="medium-choice-radio">
                        <span className="medium-radio-dot" />
                      </div>
                      <div className="medium-choice-info">
                        <span className="medium-choice-title">English Medium</span>
                        <span className="medium-choice-sub">English Medium Instruction</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" className="student-submit-btn" style={{ marginTop: '20px' }}>
                <span>{isMinor ? 'Continue to Interests & Activities (Step 4 of 4)' : 'Continue to Skills (Step 4 of 5)'}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            STEP 4: SCHOOL STUDENTS (INTERESTS & EXTRACURRICULAR) OR COLLEGE (SKILLS)
            ========================================================================= */}
        {currentStep === 'skills' && (
          <div>
            {isMinor ? (
              /* -------------------------------------------------------------
                 SCHOOL STUDENT WING: Interests to Do & Extracurricular Activities
                 ------------------------------------------------------------- */
              <div>
                <header className="student-header">
                  <div className="student-badge-title-group">
                    <div className="student-title-icon" style={{ background: '#d97706', color: '#ffffff' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <h1 className="student-title">Interests & Extracurricular Activities</h1>
                  </div>
                  <p className="student-subtitle">
                    Select the topics you love learning and your favorite extracurricular activities so mentors can connect with your passions.
                  </p>
                </header>

                <form onSubmit={handleSkillsContinue} className="student-form">
                  {errorMessage && (
                    <div className="student-alert-box error" role="alert">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* 1. Interests to Do & Learn */}
                  <div className="form-field">
                    <label className="field-label">
                      <span>Interests to Do & Learn <span className="required-star">*</span></span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706' }}>
                        {learningInterests.length} selected
                      </span>
                    </label>

                    {/* Preset School Interest Pills */}
                    <div className="skills-pills-cloud">
                      {POPULAR_SCHOOL_INTERESTS.map((interest) => {
                        const isSelected = learningInterests.includes(interest)
                        return (
                          <button
                            key={interest}
                            type="button"
                            className={`skill-pill-btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleLearningInterest(interest)}
                          >
                            <span>
                              {isSelected ? (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : '+'}
                            </span>
                            <span>{interest}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Add Custom School Interest */}
                    <div className="custom-skill-input-row">
                      <input
                        type="text"
                        className="input-control"
                        value={customInterestInput}
                        onChange={(e) => setCustomInterestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCustomInterest()
                          }
                        }}
                      />
                      <button type="button" className="custom-skill-add-btn" onClick={handleAddCustomInterest}>
                        + Add Interest
                      </button>
                    </div>

                    {/* Selected Learning Interests Tags */}
                    {learningInterests.length > 0 && (
                      <div className="selected-skills-tags-box">
                        {learningInterests.map((interest) => (
                          <span key={interest} className="selected-skill-tag">
                            <span>{interest}</span>
                            <button type="button" className="selected-skill-tag-remove" onClick={() => removeLearningInterest(interest)}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Extracurricular Activities & Sports */}
                  <div className="form-field" style={{ marginTop: '24px' }}>
                    <label className="field-label">
                      <span>Extracurricular Activities & Sports</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#b45309' }}>
                        {extracurricularActivities.length} selected
                      </span>
                    </label>

                    {/* Preset Extracurricular Pills */}
                    <div className="skills-pills-cloud">
                      {POPULAR_EXTRACURRICULAR.map((activity) => {
                        const isSelected = extracurricularActivities.includes(activity)
                        return (
                          <button
                            key={activity}
                            type="button"
                            className={`skill-pill-btn activity ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleExtracurricular(activity)}
                          >
                            <span>
                              {isSelected ? (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : '+'}
                            </span>
                            <span>{activity}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Add Custom Extracurricular Activity */}
                    <div className="custom-skill-input-row">
                      <input
                        type="text"
                        className="input-control"
                        value={customActivityInput}
                        onChange={(e) => setCustomActivityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCustomActivity()
                          }
                        }}
                      />
                      <button type="button" className="custom-skill-add-btn" onClick={handleAddCustomActivity}>
                        + Add Activity
                      </button>
                    </div>

                    {/* Selected Extracurricular Tags */}
                    {extracurricularActivities.length > 0 && (
                      <div className="selected-skills-tags-box">
                        {extracurricularActivities.map((activity) => (
                          <span key={activity} className="selected-activity-tag">
                            <span>{activity}</span>
                            <button type="button" className="selected-activity-tag-remove" onClick={() => removeExtracurricular(activity)}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="student-submit-btn" style={{ marginTop: '24px' }}>
                    <span>Complete School Profile</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </form>
              </div>
            ) : (
              /* -------------------------------------------------------------
                 COLLEGE / SENIOR STUDENT WING: Technical & Soft Skills
                 ------------------------------------------------------------- */
              <div>
                <header className="student-header">
                  <div className="student-badge-title-group">
                    <div className="student-title-icon" style={{ background: '#1e3a8a', color: '#ffffff' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </div>
                    <h1 className="student-title">Skills & Capabilities</h1>
                  </div>
                  <p className="student-subtitle">
                    Select your technical skills and soft skill strengths to help mentors personalize project guidance.
                  </p>
                </header>

                <form onSubmit={handleSkillsContinue} className="student-form">
                  {errorMessage && (
                    <div className="student-alert-box error" role="alert">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* 1. Technical & Engineering Skills */}
                  <div className="form-field">
                    <label className="field-label">
                      <span>Technical & Domain Skills <span className="required-star">*</span></span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7' }}>
                        {selectedSkills.length} selected
                      </span>
                    </label>

                    {/* Preset Tech Skill Pills */}
                    <div className="skills-pills-cloud">
                      {POPULAR_SKILLS.map((sk) => {
                        const isSelected = selectedSkills.includes(sk)
                        return (
                          <button
                            key={sk}
                            type="button"
                            className={`skill-pill-btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleSkill(sk)}
                          >
                            <span>
                              {isSelected ? (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : '+'}
                            </span>
                            <span>{sk}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Add Custom Tech Skill */}
                    <div className="custom-skill-input-row">
                      <input
                        type="text"
                        className="input-control"
                        value={customSkillInput}
                        onChange={(e) => setCustomSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCustomSkill()
                          }
                        }}
                      />
                      <button type="button" className="custom-skill-add-btn" onClick={handleAddCustomSkill}>
                        + Add Tech Skill
                      </button>
                    </div>

                    {/* Selected Tech Skills Tags */}
                    {selectedSkills.length > 0 && (
                      <div className="selected-skills-tags-box">
                        {selectedSkills.map((sk) => (
                          <span key={sk} className="selected-skill-tag">
                            <span>{sk}</span>
                            <button type="button" className="selected-skill-tag-remove" onClick={() => removeSkill(sk)}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Soft Skills & Professional Attributes (Separately) */}
                  <div className="form-field" style={{ marginTop: '24px' }}>
                    <label className="field-label">
                      <span>Soft Skills & Professional Attributes</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed' }}>
                        {selectedSoftSkills.length} selected
                      </span>
                    </label>

                    {/* Preset Soft Skill Pills */}
                    <div className="skills-pills-cloud">
                      {POPULAR_SOFT_SKILLS.map((ssk) => {
                        const isSelected = selectedSoftSkills.includes(ssk)
                        return (
                          <button
                            key={ssk}
                            type="button"
                            className={`skill-pill-btn soft-skill ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleSoftSkill(ssk)}
                          >
                            <span>
                              {isSelected ? (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : '+'}
                            </span>
                            <span>{ssk}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Add Custom Soft Skill */}
                    <div className="custom-skill-input-row">
                      <input
                        type="text"
                        className="input-control"
                        value={customSoftSkillInput}
                        onChange={(e) => setCustomSoftSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCustomSoftSkill()
                          }
                        }}
                      />
                      <button type="button" className="custom-skill-add-btn" onClick={handleAddCustomSoftSkill}>
                        + Add Soft Skill
                      </button>
                    </div>

                    {/* Selected Soft Skills Tags */}
                    {selectedSoftSkills.length > 0 && (
                      <div className="selected-skills-tags-box">
                        {selectedSoftSkills.map((ssk) => (
                          <span key={ssk} className="selected-soft-skill-tag">
                            <span>{ssk}</span>
                            <button type="button" className="selected-soft-skill-tag-remove" onClick={() => removeSoftSkill(ssk)}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="student-submit-btn" style={{ marginTop: '24px' }}>
                    <span>Continue to Links & Resume (Step 5 of 5)</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            STEP 5: RESUME & LINKEDIN (OPTIONAL / CAN SKIP)
            ========================================================================= */}
        {currentStep === 'professional' && (
          <div>
            <header className="student-header">
              <div className="student-badge-title-group">
                <div className="student-title-icon" style={{ background: '#1e3a8a', color: '#ffffff' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <h1 className="student-title">Resume & LinkedIn</h1>
                <span className="optional-step-badge">Optional</span>
              </div>
              <p className="student-subtitle">
                Add your LinkedIn profile or Resume to showcase projects. You can skip now and upload anytime in the future!
              </p>
            </header>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleFinishProfile(false)
              }}
              className="student-form"
            >
              {errorMessage && (
                <div className="student-alert-box error" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* LinkedIn URL (Optional) */}
              <div className="form-field">
                <label htmlFor="linkedin-input" className="field-label">
                  <span>LinkedIn Profile URL</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Optional</span>
                </label>
                <div className="linkedin-input-wrapper">
                  <svg className="linkedin-prefix-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.62 1.62 0 0 0-1.62 1.62 1.62 1.62 0 0 0 1.62 1.62 1.62 1.62 0 0 0 1.62-1.62A1.62 1.62 0 0 0 7.83 6.3Z" />
                  </svg>
                  <input
                    id="linkedin-input"
                    type="url"
                    className="input-control linkedin-input-control"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Resume Upload (Optional) */}
              <div className="form-field">
                <label className="field-label">
                  <span>Resume / Curriculum Vitae</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Optional (.pdf, .doc, max 100KB)</span>
                </label>

                {!resumeFileName ? (
                  <div className="resume-upload-card" onClick={() => resumeInputRef.current?.click()}>
                    <div className="upload-icon-circle" style={{ margin: '0 auto 10px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                      Click to Browse Resume (PDF / DOC, max 100KB)
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      Maximum file size: 100KB. Mentors can review your projects and experience.
                    </p>
                  </div>
                ) : (
                  <div className="resume-attached-card">
                    <div className="resume-file-info">
                      <div className="resume-file-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </div>
                      <div>
                        <p className="resume-filename">{resumeFileName}</p>
                        <p className="resume-filesize">{resumeFileSize ? `${resumeFileSize} • Ready to submit` : 'Resume attached ready to submit'}</p>
                      </div>
                    </div>
                    <button type="button" className="id-remove-btn" onClick={handleRemoveResume}>
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons: Skip for Now vs Complete Profile */}
              <div className="multi-action-btn-row">
                <button
                  type="button"
                  className="student-secondary-btn"
                  onClick={() => handleFinishProfile(true)}
                  disabled={isLoading}
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  className="student-primary-btn"
                  disabled={isLoading}
                  id="student-onboarding-complete-btn"
                >
                  {isLoading ? (
                    <>
                      <div className="btn-spinner" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Profile</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}

export default StudentOnboarding
