# Karkai (கற்கை) - Ilaiya Thalaimurai

> **Empowering Students Through Mentorship**  
> A mobile-first Progressive Web Application (PWA) connecting students from School and College/Senior wings with verified industry mentors.

---

## 🌟 Key Features

- **🎓 Dual-Wing Student Onboarding**
  - **School Student Wing**: Tailored onboarding with parent/guardian consent details, basic academics, and interests.
  - **Senior Student Wing**: Comprehensive academic tracking (10th/12th marks, degree, branch, CGPA, skills, resume upload).
  - **Client-Side OCR**: Powered by Tesseract.js to scan and extract marks/details from report cards or mark sheets directly in the browser.
- **💼 Mentor Onboarding & Credential Verification**
  - Multi-step onboarding collecting professional role, company, skills, bio, LinkedIn URL, and official credential proofs (Work ID card photo & Resume).
  - Real-time file upload to Supabase Storage.
- **🛡️ Admin Verification Console**
  - Dedicated admin portal (`/admin`) for platform administrators to review submitted mentor credentials.
  - Verify or reject applications with personalized feedback reasons.
- **🤝 Mentor-Student Connections**
  - Browse verified mentors with real-time search and filtering.
  - Send direct mentorship connection requests.
  - Real-time status workflow (`pending` ➔ `accepted` / `rejected`).
  - Student dashboard tab interface: **"My Mentors"** (active connections) & **"Verified Mentors"** (explore directory).
- **📱 Progressive Web App (PWA)**
  - Installable directly to home screen on Android, iOS, and Desktop.
  - Standalone app mode, custom splash screens, app icons, and offline service worker caching via `vite-plugin-pwa`.
- **🔐 Google OAuth Authentication**
  - Seamless single sign-on powered by Supabase Auth with session persistence.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool & Bundler** | [Vite 8](https://vite.dev/) |
| **Styling** | Custom Mobile-First CSS (Vanilla CSS Design System) |
| **PWA Engine** | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Service Workers & Manifest) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL + Supabase Auth + Supabase Storage) |
| **OCR Scanner** | [Tesseract.js](https://tesseract.projectnaptha.com/) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- A free **Supabase** account ([supabase.com](https://supabase.com))

### 2. Clone the Repository
```bash
git clone https://github.com/IT-Ilaiyathalaimurai/Karkai-App.git
cd Karkai-App
```

### 3. Install Dependencies
```bash
npm install
```

---

## ⚙️ Environment Variables Setup

Create a `.env.local` file in the root directory of the project:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase credentials:

```env
# Supabase Configuration
# Found at: https://supabase.com/dashboard/project/<your-project-id>/settings/api
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Note**: Both `VITE_` and `NEXT_PUBLIC_` prefixes are supported by the application client (`src/lib/supabase.ts`).

---

## 🗄️ Supabase Database & Storage Setup

To set up your database tables and storage buckets, go to your **Supabase Project Dashboard ➔ SQL Editor**, paste the following script, and click **Run**:

```sql
-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (Authentication & Role Mapping)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'mentor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Student Details Table
CREATE TABLE IF NOT EXISTS public."Student-details" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+91',
  date_of_birth DATE,
  age INTEGER,
  is_minor BOOLEAN DEFAULT FALSE,
  wing TEXT NOT NULL CHECK (wing IN ('school', 'senior')),
  gender TEXT,
  city TEXT,
  district TEXT,
  state TEXT DEFAULT 'Tamil Nadu',
  
  -- School Wing Fields
  parent_name TEXT,
  parent_relationship TEXT,
  parent_mobile TEXT,
  parent_consent_given BOOLEAN DEFAULT FALSE,
  
  -- Senior Wing Academic Fields
  tenth_school_name TEXT,
  tenth_marks TEXT,
  tenth_percentage TEXT,
  twelfth_school_name TEXT,
  twelfth_marks TEXT,
  twelfth_percentage TEXT,
  medium_of_study TEXT,
  
  institution_name TEXT NOT NULL,
  degree TEXT NOT NULL,
  custom_degree TEXT,
  branch TEXT NOT NULL,
  current_year TEXT NOT NULL,
  current_cgpa TEXT,
  
  -- Skills & Activities
  skills TEXT[] DEFAULT '{}',
  soft_skills TEXT[] DEFAULT '{}',
  learning_interests TEXT[] DEFAULT '{}',
  extracurricular_activities TEXT[] DEFAULT '{}',
  
  -- Professional Links
  linkedin_url TEXT,
  resume_url TEXT,
  resume_file_name TEXT,
  raw_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Mentor Details Table
CREATE TABLE IF NOT EXISTS public."Mentor-details" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+91',
  working_as TEXT NOT NULL,
  working_in TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  
  technical_skills TEXT[] DEFAULT '{}',
  soft_skills TEXT[] DEFAULT '{}',
  bio TEXT,
  
  linkedin_url TEXT,
  id_card_url TEXT,
  id_card_file_name TEXT,
  resume_url TEXT,
  resume_file_name TEXT,
  
  -- Verification fields
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Mentor-Mentee Connections Table
CREATE TABLE IF NOT EXISTS public."mentor-mentee-connections" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  mentor_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  mentor_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Disable Row Level Security (RLS) for Development
-- (Alternatively, configure permissive RLS policies for authenticated users)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Student-details" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Mentor-details" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."mentor-mentee-connections" DISABLE ROW LEVEL SECURITY;
```

### Storage Buckets Setup
In your Supabase Dashboard, go to **Storage ➔ New Bucket**:
1. Create bucket: `Students-assets` (set to **Public Bucket**).
2. Create bucket: `Mentors-assets` (set to **Public Bucket**).

---

## 🔑 Supabase Google OAuth Setup

1. Go to **Supabase Dashboard ➔ Authentication ➔ Providers ➔ Google**.
2. Toggle **Enable Google provider**.
3. Add your Google OAuth Client ID and Secret (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)).
4. Set the **Authorized redirect URI** in Google Cloud Console to:
   ```
   https://<your-supabase-project-id>.supabase.co/auth/v1/callback
   ```
5. In Supabase **Authentication ➔ URL Configuration**, add your local URL to **Redirect URLs**:
   ```
   http://localhost:5173/
   ```

---

## 🏃 Running the Application

### Start Development Server
```bash
npm run dev
```

To access the app on your mobile phone or tablet over local Wi-Fi:
```bash
npm run dev -- --host
```
Open the provided Network URL (e.g., `http://192.168.x.x:5173`) on your mobile browser.

---

## 📲 How to Install as a PWA

| Platform | Instructions |
|---|---|
| **Android (Chrome / Edge)** | 1. Open the app in Chrome.<br>2. Tap the **"Add to Home Screen"** or **"Install App"** prompt.<br>3. An app icon will appear on your home screen and app drawer. |
| **iOS / iPadOS (Safari)** | 1. Open the app in Safari.<br>2. Tap the **Share** button (box with an arrow pointing up).<br>3. Scroll down and tap **"Add to Home Screen"**.<br>4. Tap **Add** in the top-right corner. |
| **Desktop (Chrome / Edge)** | 1. Click the **Install** icon on the right side of the address bar.<br>2. Click **Install**. |

---

## 🏗️ Production Build

To build the optimized production assets:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

---

## 📁 Project Structure

```
Karkai-App/
├── public/                 # Static assets, PWA icons, manifest
├── src/
│   ├── components/         # UI Components
│   │   ├── Admin-Dashboard/      # Mentor verification and application management
│   │   ├── Mentor-Dashboard/     # Mentor home, incoming requests, profile
│   │   ├── Mentors-Onboarding/   # Multi-step mentor registration flow
│   │   ├── Student-Dashboard/    # Student home, tabs (My Mentors & Verified Mentors)
│   │   ├── Students-Onboarding/  # Dual-wing student registration & OCR
│   │   └── SignIn-Screen/        # Auth and role selection
│   ├── lib/                # Supabase client, database helpers & models
│   │   ├── supabase.ts                 # Supabase client & OAuth handler
│   │   ├── user.ts                     # User persistence & session helpers
│   │   ├── Students-details.ts         # Student profiles & storage API
│   │   ├── Mentors-details.ts          # Mentor profiles & storage API
│   │   └── mentor-mentee-connections.ts# Connection request state machine
│   ├── App.tsx             # Root router & route guards
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global design system & mobile styles
├── vite.config.ts          # Vite & VitePWA configuration
├── package.json
└── README.md
```

---

## 📄 License

This project is maintained by **Ilaiya Thalaimurai**. All rights reserved.
