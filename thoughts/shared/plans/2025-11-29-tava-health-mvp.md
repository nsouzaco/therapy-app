# Tava Health AI Treatment Plans - MVP Implementation Plan

## Overview

Build an AI-powered treatment plan generator for therapists using GPT-4o-mini. The system generates structured treatment plans from session transcripts with dual views: clinical documentation for therapists and plain-language summaries for clients.

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth), OpenAI API (GPT-4o-mini), Vercel

## Current State Analysis

Greenfield project. No existing codebase.

## Desired End State

A functional MVP where:
1. Therapists can register, add clients, upload session transcripts
2. AI generates structured treatment plans with clinical + client-facing content
3. Therapists can view, edit, and review plans with risk indicators
4. Clients can log in and view their treatment plans in plain language
5. Appropriate disclaimers are displayed throughout

### Verification:
- All user flows from PRD Section 3 are functional
- Risk detection surfaces flags to therapists
- Clients never see clinical-only or risk content
- Unit tests pass on core parsing logic

## What We're NOT Doing

- Plan versioning and history (V1.1)
- Approve/publish workflow (V1.1)
- Session summaries generation (V1.1)
- Diff view between versions
- Audio upload/transcription
- Real-time collaborative editing
- Mobile app
- PDF export
- HIPAA compliance (production consideration, not MVP)
- OAuth providers (email/password only for MVP)

## Implementation Approach

Four phases, each delivering a vertical slice of functionality. Each phase builds on the previous and ends with a working, testable state.

---

## Phase 1: Foundation & Authentication

### Overview
Set up the project infrastructure, database schema, and authentication system. Users can register with a role (therapist or client) and access role-appropriate dashboard shells.

### Changes Required:

#### 1.1 Project Initialization

**Create Next.js project with:**
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- ESLint

**Create Supabase project with:**
- New project in Supabase dashboard
- Note project URL and anon key
- Enable email/password auth in Authentication settings

#### 1.2 Environment Configuration

**File:** `.env.local`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (for Phase 3)

**File:** `.env.example`
- Template with placeholder values

#### 1.3 Database Schema

**Create via Supabase SQL editor or migrations:**

**Table: users** (extends Supabase auth.users)
- id (uuid, references auth.users)
- email (text)
- name (text)
- role (text: 'therapist' | 'client')
- created_at (timestamptz)

**Table: therapist_profiles**
- id (uuid, PK)
- user_id (uuid, FK → users, unique)
- license_number (text, nullable)
- preferences (jsonb, default {})
- created_at (timestamptz)

**Table: client_profiles**
- id (uuid, PK)
- user_id (uuid, FK → users, unique)
- therapist_id (uuid, FK → therapist_profiles)
- created_at (timestamptz)

**Table: sessions**
- id (uuid, PK)
- client_id (uuid, FK → client_profiles)
- session_date (date)
- transcript_text (text)
- created_at (timestamptz)

**Table: treatment_plans**
- id (uuid, PK)
- client_id (uuid, FK → client_profiles, unique)
- created_at (timestamptz)
- updated_at (timestamptz)

**Table: plan_versions**
- id (uuid, PK)
- plan_id (uuid, FK → treatment_plans)
- version_number (int)
- source_session_id (uuid, FK → sessions)
- status (text: 'draft' | 'approved')
- content (jsonb)
- created_at (timestamptz)

**Row Level Security (RLS) policies:**
- Therapists can only see their own clients
- Clients can only see their own data
- Enable RLS on all tables

#### 1.4 Supabase Client Setup

**File:** `lib/supabase/client.ts`
- Browser client for client components

**File:** `lib/supabase/server.ts`
- Server client for API routes and server components

**File:** `lib/supabase/middleware.ts`
- Session refresh logic

#### 1.5 Authentication Pages

**File:** `app/(auth)/login/page.tsx`
- Email and password inputs
- Submit to Supabase signInWithPassword
- Error display
- Link to register

**File:** `app/(auth)/register/page.tsx`
- Email, password, name inputs
- Role selection (therapist/client radio buttons)
- For clients: therapist email input (to link to therapist)
- Submit creates auth user + profile record
- Link to login

**File:** `app/(auth)/layout.tsx`
- Centered card layout for auth pages

#### 1.6 Middleware & Protected Routes

**File:** `middleware.ts`
- Check for valid session
- Redirect unauthenticated users to /login
- Redirect authenticated users away from auth pages
- Role-based redirects: therapists → /dashboard, clients → /my-plan

#### 1.7 Dashboard Shells

**File:** `app/(therapist)/dashboard/page.tsx`
- Protected route for therapists
- Header with user name and logout
- Empty state: "No clients yet"
- Placeholder for client list

**File:** `app/(therapist)/layout.tsx`
- Therapist navigation sidebar/header
- Logout functionality

**File:** `app/(client)/my-plan/page.tsx`
- Protected route for clients
- Header with user name and logout
- Empty state: "No treatment plan yet"

**File:** `app/(client)/layout.tsx`
- Client navigation header
- Logout functionality

#### 1.8 Shared Components

**File:** `components/ui/button.tsx`
- Reusable button with variants

**File:** `components/ui/input.tsx`
- Styled form input

**File:** `components/ui/card.tsx`
- Card container component

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` completes without errors
- [x] `npm run lint` passes
- [x] TypeScript compilation succeeds
- [ ] Supabase connection works (test query returns)

#### Manual Verification:
- [ ] Can register as therapist → lands on /dashboard
- [ ] Can register as client (with therapist email) → lands on /my-plan
- [ ] Can log out and log back in
- [ ] Cannot access /dashboard as client (redirected)
- [ ] Cannot access /my-plan as therapist (redirected)
- [ ] Unauthenticated users redirected to /login

---

## Phase 2: Therapist Core Flow

### Overview
Therapists can manage their clients and upload session transcripts. No AI generation yet — this phase focuses on data management and UI.

### Changes Required:

#### 2.1 API Routes - Clients

**File:** `app/api/therapist/clients/route.ts`
- GET: List all clients for current therapist
- POST: Create new client (creates user + client_profile, sends invite email via Supabase)

**File:** `app/api/therapist/clients/[id]/route.ts`
- GET: Get single client with their sessions and current plan

#### 2.2 API Routes - Sessions

**File:** `app/api/clients/[clientId]/sessions/route.ts`
- GET: List sessions for a client
- POST: Create new session with transcript

**File:** `app/api/sessions/[id]/route.ts`
- GET: Get single session detail

#### 2.3 Therapist Dashboard

**File:** `app/(therapist)/dashboard/page.tsx`
- Fetch and display client list
- Each client card shows: name, email, last session date, plan status
- "Add Client" button opens modal/drawer
- Click client → navigates to client detail

#### 2.4 Add Client Flow

**File:** `components/therapist/add-client-modal.tsx`
- Modal with form: client name, client email
- On submit: calls POST /api/therapist/clients
- Success: closes modal, refreshes list
- Error: displays message

#### 2.5 Client Detail Page

**File:** `app/(therapist)/clients/[id]/page.tsx`
- Client header with name and basic info
- Sessions list (date, truncated transcript preview)
- "Upload Session" button
- Current plan status indicator
- Link to view/edit plan (placeholder for Phase 3)

#### 2.6 Session Upload

**File:** `components/therapist/session-upload.tsx`
- Date picker for session date
- Textarea for pasting transcript OR
- Drag-drop zone for .txt file upload
- Character count display
- "Save Session" button
- Loading state during upload

**File:** `app/(therapist)/clients/[id]/sessions/new/page.tsx`
- Full page for session upload
- Uses session-upload component
- On success: redirects back to client detail

#### 2.7 Session Detail View

**File:** `app/(therapist)/sessions/[id]/page.tsx`
- Display full transcript
- Session date
- Link back to client
- "Generate Plan" button (disabled, placeholder for Phase 3)

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` passes
- [ ] API routes return correct status codes

#### Manual Verification:
- [ ] Therapist can add a new client from dashboard
- [ ] New client appears in client list
- [ ] Therapist can click into client detail
- [ ] Therapist can upload a session transcript (paste)
- [ ] Therapist can upload a session transcript (file)
- [ ] Session appears in client's session list
- [ ] Therapist can view full transcript in session detail
- [ ] Character count shows for long transcripts

---

## Phase 3: AI Plan Generation

### Overview
Integrate GPT-4o-mini to generate treatment plans from transcripts. Therapists can view the clinical plan, edit fields, and see risk indicators.

### Changes Required:

#### 3.1 OpenAI Integration

**File:** `lib/ai/openai-client.ts`
- OpenAI client initialization
- Error handling wrapper

**File:** `lib/ai/prompts.ts`
- System prompt for clinical documentation assistant
- User prompt template with transcript and existing plan placeholders
- JSON schema for structured output

**File:** `lib/ai/generate-plan.ts`
- Main function: takes transcript + optional existing plan
- Calls OpenAI with structured output format
- Parses and validates response
- Returns typed plan content object

**File:** `lib/ai/parse-response.ts`
- JSON parsing with error recovery
- Schema validation
- Fallback for malformed responses

#### 3.2 Risk Detection

**File:** `lib/ai/risk-detection.ts`
- Keyword/regex patterns for risk indicators
- Function to scan transcript for risk flags
- Merges AI-detected risks with keyword backup scan
- Returns risk level and flags array

#### 3.3 Plan Content Types

**File:** `lib/types/plan.ts`
- TypeScript interfaces matching PRD schema:
  - PlanContent (full structure)
  - PresentingConcerns
  - ClinicalImpressions
  - Goal
  - Intervention
  - Homework
  - Strength
  - RiskFactors

#### 3.4 API Routes - Plan Generation

**File:** `app/api/clients/[clientId]/plan/generate/route.ts`
- POST: Generate or update plan from latest session
- Fetches latest session transcript
- Fetches existing plan (if any)
- Calls AI generation
- Creates plan_version record with status 'draft'
- Returns generated plan

**File:** `app/api/clients/[clientId]/plan/route.ts`
- GET: Get current plan for client (latest version)

**File:** `app/api/plans/[planId]/versions/[versionId]/route.ts`
- GET: Get specific version
- PUT: Update plan content (inline edits)

#### 3.5 Plan View - Therapist

**File:** `app/(therapist)/clients/[id]/plan/page.tsx`
- Fetches current plan
- Displays all sections in accordion/tabs
- Shows both clinical and client_facing fields
- Risk banner at top if moderate/high
- "Edit" mode toggle
- "Generate New Version" button

**File:** `components/plan/plan-section.tsx`
- Reusable section component
- Displays label, clinical content, client-facing content
- Edit mode: inline text editing

**File:** `components/plan/goals-section.tsx`
- Specialized display for goals array
- Short-term vs long-term grouping
- Target dates

**File:** `components/plan/risk-banner.tsx`
- Alert banner for risk indicators
- Shows level (low/moderate/high)
- Expandable to show flags
- Therapist-only component

#### 3.6 Plan Editing

**File:** `components/plan/editable-field.tsx`
- Click-to-edit text field
- Save/cancel buttons
- Calls API to persist changes

**File:** `components/plan/plan-editor.tsx`
- Orchestrates editing state
- Tracks dirty fields
- Save all changes button

#### 3.7 Generation UI

**File:** `components/plan/generate-button.tsx`
- "Generate Plan" button
- Loading state with spinner
- Progress indication
- Error display with retry option

Update **Session Detail** and **Client Detail** pages to include working generate button.

#### 3.8 Disclaimer Component

**File:** `components/ui/disclaimer.tsx`
- Styled disclaimer banner
- Variant for therapist view vs client view

Add to plan view: "AI-generated content requires clinical review. This tool supports but does not replace professional judgment."

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` passes
- [ ] TypeScript types for plan content compile
- [ ] API routes return correct status codes

#### Manual Verification:
- [ ] Upload transcript → click Generate → plan appears
- [ ] Plan displays all sections (concerns, impressions, goals, interventions, homework, strengths)
- [ ] Clinical and client-facing content both visible to therapist
- [ ] Risk banner appears when AI detects risk indicators
- [ ] Can edit a field inline and save
- [ ] Edited content persists on page refresh
- [ ] Disclaimer appears on plan view
- [ ] Error state displays if AI call fails
- [ ] Can retry after failure

---

## Phase 4: Client Experience & Polish

### Overview
Clients can view their treatment plans in plain language. Add finishing touches: seed data, tests, README, UI polish.

### Changes Required:

#### 4.1 Client API Routes

**File:** `app/api/client/plan/route.ts`
- GET: Get current plan for authenticated client
- Filters content to client_facing fields only
- Excludes clinical fields and risk_factors

**File:** `app/api/client/sessions/route.ts`
- GET: List sessions for authenticated client
- Returns session dates only (no transcript access)

#### 4.2 Client Plan View

**File:** `app/(client)/my-plan/page.tsx`
- Fetches plan via client API
- Friendly header: "Your Treatment Plan"
- Card-based layout for each section
- No clinical jargon visible

**File:** `components/client/plan-card.tsx`
- Friendly styled card for plan sections
- Warm, encouraging tone

**File:** `components/client/goals-display.tsx`
- Goals shown as friendly checklist style
- Visual progress indicators (decorative)

**File:** `components/client/homework-display.tsx`
- Homework items prominently displayed
- Clear, actionable language

**File:** `components/client/strengths-display.tsx`
- Strengths highlighted positively
- Encouraging presentation

#### 4.3 Client Sessions View

**File:** `app/(client)/my-sessions/page.tsx`
- List of session dates
- Simple timeline view
- No transcript content shown

#### 4.4 Client-Facing Disclaimer

Add to client plan view: "This plan was created by your therapist with the help of AI tools. It is not medical advice. Please discuss any questions with your therapist directly."

#### 4.5 Empty States

**File:** `components/ui/empty-state.tsx`
- Reusable empty state component
- Icon, message, optional action button

Update all list views with appropriate empty states:
- Dashboard: "No clients yet. Add your first client to get started."
- Client sessions: "No sessions recorded yet."
- Client plan: "Your therapist hasn't created a treatment plan yet."

#### 4.6 Seed Data Script

**File:** `scripts/seed.ts`
- Creates demo therapist account
- Creates 2-3 demo clients linked to therapist
- Creates sample sessions with synthetic transcripts
- Generates sample plans with all sections populated
- Includes one case with risk indicators for testing

**File:** `scripts/sample-transcripts/session-1.txt`
- Realistic synthetic therapy session transcript (anxiety focus)

**File:** `scripts/sample-transcripts/session-2.txt`
- Synthetic transcript with mild risk indicators

**File:** `package.json`
- Add script: `"seed": "npx tsx scripts/seed.ts"`

#### 4.7 Unit Tests

**File:** `lib/ai/__tests__/parse-response.test.ts`
- Test valid JSON parsing
- Test malformed JSON handling
- Test missing required fields

**File:** `lib/ai/__tests__/risk-detection.test.ts`
- Test keyword detection for each risk category
- Test risk level calculation
- Test edge cases (partial matches, case sensitivity)

**File:** `lib/utils/__tests__/filter-client-content.test.ts`
- Test that clinical fields are removed
- Test that risk_factors are removed
- Test that client_facing fields are preserved

#### 4.8 README

**File:** `README.md`
- Project overview
- Tech stack
- Prerequisites (Node, Supabase account, OpenAI key)
- Setup instructions (clone, install, env vars, db setup)
- Running locally
- Seeding demo data
- Running tests
- Project structure overview
- HIPAA disclaimer for production use

#### 4.9 UI Polish

- Consistent color scheme throughout
- Loading states on all async operations
- Error boundaries for graceful failures
- Responsive layout (works on tablet minimum)
- Proper focus states for accessibility
- Toast notifications for save success/failure

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` passes
- [ ] `npm run test` — all unit tests pass (minimum 3)
- [ ] TypeScript compilation succeeds

#### Manual Verification:
- [ ] Run seed script successfully
- [ ] Log in as demo client → see treatment plan
- [ ] Client plan shows only client-facing content
- [ ] Client cannot see clinical impressions
- [ ] Client cannot see risk factors
- [ ] Client disclaimer displays correctly
- [ ] Empty states display appropriately
- [ ] README instructions work for fresh setup
- [ ] UI is visually consistent and polished

---

## Testing Strategy

### Unit Tests (Required for MVP):
1. **Response Parsing:** Valid JSON, malformed JSON, missing fields
2. **Risk Detection:** Keyword matching, level calculation
3. **Content Filtering:** Client view excludes clinical/risk data

### Integration Tests (Post-MVP):
- Full flow: upload → generate → retrieve
- Auth: therapist can't access other therapists' clients
- Auth: client only sees client-facing content

### Manual Test Cases:
1. Register new therapist, add client, upload transcript, generate plan
2. Log in as client, view plan
3. Trigger risk detection with concerning keywords
4. Test with very long transcript (~10k words)
5. Test AI failure recovery (invalid API key)

---

## Performance Considerations

- **Transcript Size:** Client-side validation caps at 50k characters
- **AI Latency:** Show loading state, expect 5-15 seconds for generation
- **Database Queries:** Index on client_id, therapist_id for efficient lookups
- **Supabase RLS:** Policies add minimal overhead, acceptable for MVP

---

## Migration Notes

Not applicable — greenfield project.

---

## Deployment Checklist

1. Create Supabase project (production)
2. Run SQL migrations in Supabase SQL editor
3. Configure RLS policies
4. Set environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
5. Deploy to Vercel
6. Test auth flow in production
7. Run seed script if demo data needed

---

## References

- Original PRD: `tava-health-prd.md`
- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- OpenAI Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- Next.js App Router: https://nextjs.org/docs/app

