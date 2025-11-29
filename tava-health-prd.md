Tava Health AI Treatment Plans - Complete PRD
1. Problem Statement
Therapists spend significant time creating and updating treatment plans. These documents often suffer from inconsistency and a language mismatch: too clinical for clients to understand, or too simplified to be clinically useful.
The opportunity: Use AI to generate structured treatment plans from session transcripts, with tailored views for each audience.

2. Users & Personas
Therapist

Needs clinical documentation that meets professional standards
Wants to save time on administrative work
Requires ability to edit/refine AI outputs
Must see risk indicators and clinical impressions clearly

Client

Needs to understand their treatment in plain language
Wants clear, actionable next steps
Should feel empowered, not pathologized


3. Core User Flows
Flow 1: Therapist Creates Treatment Plan

Therapist logs in → sees client list
Selects client → uploads/pastes session transcript
System generates treatment plan
Therapist reviews clinical view → edits as needed
Therapist approves → client view becomes available

Flow 2: Client Views Their Plan

Client logs in → sees their treatment plan
Views goals, homework, and encouragement in plain language

Flow 3: Plan Updates

New session → therapist uploads new transcript
AI generates updated plan, preserving history
Therapist reviews changes → approves


4. Data Model
User
├── id (uuid, PK)
├── email (string, unique)
├── password_hash (string)
├── role (enum: therapist | client)
├── name (string)
├── created_at (timestamp)

TherapistProfile
├── id (uuid, PK)
├── user_id (uuid, FK → User)
├── license_number (string, optional)
├── preferences (jsonb) // for future: preferred modalities, tone settings

ClientProfile
├── id (uuid, PK)
├── user_id (uuid, FK → User)
├── therapist_id (uuid, FK → TherapistProfile)
├── created_at (timestamp)

Session
├── id (uuid, PK)
├── client_id (uuid, FK → ClientProfile)
├── session_date (date)
├── transcript_text (text)
├── session_summary_therapist (text, nullable)
├── session_summary_client (text, nullable)
├── created_at (timestamp)

TreatmentPlan
├── id (uuid, PK)
├── client_id (uuid, FK → ClientProfile, unique) // one active plan per client
├── current_version_id (uuid, FK → PlanVersion, nullable)
├── created_at (timestamp)
├── updated_at (timestamp)

PlanVersion
├── id (uuid, PK)
├── plan_id (uuid, FK → TreatmentPlan)
├── version_number (int)
├── source_session_id (uuid, FK → Session) // which session triggered this version
├── status (enum: draft | approved)
├── content (jsonb) // the structured plan data
├── created_at (timestamp)
├── approved_at (timestamp, nullable)
PlanVersion.content JSON Structure
json{
  "presenting_concerns": {
    "clinical": "Client presents with symptoms consistent with GAD...",
    "client_facing": "You came to therapy because you've been feeling anxious..."
  },
  "clinical_impressions": {
    "clinical": "Elevated anxiety with somatic features, r/o panic disorder",
    "client_facing": null
  },
  "goals": [
    {
      "id": "goal-1",
      "type": "short_term",
      "clinical": "Reduce PHQ-9 score from 14 to <10 within 8 weeks",
      "client_facing": "Feel less overwhelmed by daily tasks",
      "target_date": "2025-02-01"
    }
  ],
  "interventions": [
    {
      "id": "int-1",
      "modality": "CBT",
      "clinical": "Cognitive restructuring targeting catastrophic thinking patterns",
      "client_facing": "We'll work on noticing and changing unhelpful thought patterns"
    }
  ],
  "homework": [
    {
      "id": "hw-1",
      "clinical": "Daily thought record, minimum 1 entry",
      "client_facing": "Try writing down one worried thought each day and what happened after"
    }
  ],
  "strengths": [
    {
      "clinical": "Strong social support network, high motivation for treatment",
      "client_facing": "You have supportive people around you and you're committed to feeling better"
    }
  ],
  "risk_factors": {
    "level": "low | moderate | high",
    "flags": ["passive SI mentioned in session"],
    "clinical_notes": "Client denied plan or intent. Safety plan reviewed.",
    "show_to_client": false
  }
}
```

---

## 5. AI Prompting Strategy

### Architecture Decision
**Single generation, dual rendering** — The AI generates one canonical structured output. The two views (therapist/client) are stored together, not generated separately. This ensures consistency and reduces API costs.

### Model Choice
- **Primary:** Claude 3.5 Sonnet (via API) — strong at structured output, good clinical reasoning
- **Fallback consideration:** GPT-4o if needed for comparison

### Prompt Design

**System Prompt (condensed):**
```
You are a clinical documentation assistant for licensed therapists. 
Your role is to analyze therapy session transcripts and generate 
structured treatment plans.

You must:
- Generate clinically accurate, professional documentation
- Create parallel client-friendly versions in plain language
- Identify risk factors (self-harm, harm to others, crisis language)
- Be strengths-based and recovery-oriented
- Never fabricate information not present in the transcript

You must NOT:
- Provide diagnoses (only "clinical impressions" for therapist review)
- Replace clinical judgment
- Include information the client shouldn't see in client-facing fields
```

**User Prompt Template:**
```
Analyze the following therapy session transcript and generate a 
structured treatment plan.

<transcript>
{transcript_text}
</transcript>

<existing_plan>
{previous_plan_json or "None - this is a new client"}
</existing_plan>

Generate a treatment plan with the following sections:
1. Presenting concerns (clinical + client-facing)
2. Clinical impressions (clinical only)
3. Goals - at least 2 short-term, 1 long-term (clinical + client-facing)
4. Interventions - therapeutic approaches being used (clinical + client-facing)
5. Homework - specific between-session tasks (clinical + client-facing)
6. Strengths and protective factors (clinical + client-facing)
7. Risk factors - assess level (low/moderate/high), note any flags

If an existing plan is provided, UPDATE it based on new session content. 
Preserve goals that are still relevant, mark completed ones, add new ones 
as needed.

Respond with valid JSON matching this schema:
{schema}
```

### Output Parsing Strategy
1. Request JSON output with strict schema
2. Validate against schema on receipt
3. If parsing fails, retry once with "Please respond with valid JSON only"
4. If still fails, return error to therapist with raw output for manual handling

### Risk Detection
Specific keywords/patterns to flag:
- Suicidal ideation: "kill myself", "end it", "not worth living", "better off without me"
- Self-harm: "cutting", "hurting myself", "burning"
- Harm to others: "hurt them", "kill", explicit threats
- Crisis indicators: "can't go on", "no point", "giving things away"

**Implementation:** Dual approach
1. AI identifies in structured output
2. Regex/keyword backup scan as safety net

---

## 6. API Design

### Endpoints
```
Authentication
POST   /api/auth/register        # Create account
POST   /api/auth/login           # Get JWT token
GET    /api/auth/me              # Get current user

Therapist - Clients
GET    /api/therapist/clients              # List my clients
POST   /api/therapist/clients              # Add new client
GET    /api/therapist/clients/:id          # Get client details

Sessions
GET    /api/clients/:clientId/sessions           # List sessions
POST   /api/clients/:clientId/sessions           # Create session + transcript
GET    /api/sessions/:id                         # Get session detail

Treatment Plans
GET    /api/clients/:clientId/plan               # Get current plan
POST   /api/clients/:clientId/plan/generate      # Generate/update plan from session
PUT    /api/plans/:planId/versions/:versionId    # Edit plan version
POST   /api/plans/:planId/versions/:versionId/approve  # Approve version

Client Access
GET    /api/client/plan                    # Get my plan (client-facing fields only)
GET    /api/client/sessions                # Get my session summaries
Key Response Shapes
GET /api/clients/:clientId/plan (therapist)
json{
  "plan_id": "uuid",
  "client_name": "Jane Doe",
  "current_version": {
    "version_number": 3,
    "status": "approved",
    "content": { /* full content object */ },
    "created_at": "2025-01-15T...",
    "source_session_date": "2025-01-14"
  },
  "version_history": [
    { "version_number": 2, "created_at": "...", "status": "approved" },
    { "version_number": 1, "created_at": "...", "status": "approved" }
  ]
}
```

**GET /api/client/plan (client)** — same structure but `content` only includes `client_facing` fields, no `clinical` or `risk_factors`.

---

## 7. UI Specifications

### Pages

| Page | Route | User | Purpose |
|------|-------|------|---------|
| Login | `/login` | All | Authentication |
| Register | `/register` | All | Account creation |
| Therapist Dashboard | `/dashboard` | Therapist | Client list, quick actions |
| Client Detail | `/clients/:id` | Therapist | Sessions, current plan, upload |
| Plan Editor | `/clients/:id/plan` | Therapist | View/edit treatment plan |
| Plan History | `/clients/:id/plan/history` | Therapist | Version comparison |
| Client Home | `/my-plan` | Client | View their plan |
| Client Sessions | `/my-sessions` | Client | Session summaries |

### Key UI Components

**Transcript Upload (Therapist)**
- Drag-drop zone for .txt files
- Or: textarea for paste
- Session date picker
- "Generate Plan" button
- Loading state with progress indication

**Plan View - Therapist**
- Tabbed or accordion sections for each plan area
- Inline edit capability (click to edit, save/cancel)
- Risk banner at top if moderate/high risk detected
- "Approve & Publish" button for drafts
- Version selector dropdown

**Plan View - Client**
- Card-based layout, friendly typography
- Goals with checkbox-style presentation (visual only)
- Homework section prominent
- Strengths section highlighted
- Encouraging header: "Your Treatment Plan"
- No clinical jargon

**Risk Alert Banner (Therapist only)**
```
⚠️ Risk Indicators Detected
Level: Moderate
Flags: Passive suicidal ideation mentioned
[View Details] [Mark Reviewed]
```

---

## 8. Technical Architecture

### Recommended Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind
- **Backend:** Next.js API routes (or separate Express/FastAPI if preferred)
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js with JWT
- **AI:** Anthropic Claude API (claude-3-5-sonnet)
- **Hosting:** Vercel (frontend) + Railway/Render (DB)

### Project Structure (Next.js)
```
/app
  /api
    /auth/[...nextauth]
    /therapist/clients
    /clients/[clientId]/sessions
    /clients/[clientId]/plan
  /(auth)
    /login
    /register
  /(therapist)
    /dashboard
    /clients/[id]
    /clients/[id]/plan
  /(client)
    /my-plan
    /my-sessions
/lib
  /ai
    prompts.ts
    generate-plan.ts
    parse-response.ts
  /db
    prisma.ts
    schema.prisma
  /validators
    plan-schema.ts
/components
  /plan
  /session
  /ui

9. Error Handling
ScenarioHandlingAI returns malformed JSONRetry once; if fails, show raw output + manual edit optionAI times outShow error, allow retry, suggest shorter transcriptTranscript too longClient-side validation (cap at ~50k chars); chunk if neededRisk detection disagreementAlways surface AI flags; therapist can dismiss with noteConcurrent editsLast-write-wins for MVP; show warning if version changed

10. Testing Strategy
Unit Tests (Required)

Plan content JSON schema validation
Risk keyword detection function
Response parsing (valid JSON, malformed JSON, missing fields)
Role-based content filtering (client shouldn't see clinical fields)

Integration Tests (Recommended)

Full flow: upload transcript → generate plan → retrieve plan
Auth: therapist can't access other therapists' clients
Auth: client only sees client-facing content

Manual Test Cases

Upload various transcript lengths
Trigger each risk level
Edit and save plan
Version history navigation


11. Privacy & Safety
Required Disclaimers (UI placement)
Therapist view - Plan generation:

"AI-generated content requires clinical review. This tool supports but does not replace professional judgment."

Client view - Header:

"This plan was created by your therapist with the help of AI tools. It is not medical advice. Please discuss any questions with your therapist directly."

Risk alerts:

"Automated risk detection is not a substitute for clinical assessment."

Data Handling

No real PHI in development/demo
Synthetic transcripts only
Add note in README about HIPAA considerations for production


12. MVP Checklist
Must Have (MVP)

 User registration/login with role selection
 Therapist: view client list
 Therapist: add client
 Therapist: upload transcript for client
 AI: generate structured plan from transcript
 Therapist: view clinical plan
 Therapist: basic edit capability
 Client: view client-facing plan
 Risk flag display (therapist only)
 Disclaimers in UI
 README with setup instructions
 At least 3 unit tests on core parsing logic

Should Have (V1.1)

 Plan versioning
 Version history view
 Session summaries (both views)
 Approve/publish workflow
 Plan update from new session (not just create)

Nice to Have (Stretch)

 Diff view between versions
 Therapist preferences storage
 Mobile-responsive client view
 Export plan to PDF


13. Open Questions

Transcript length limits — What's the realistic max session length? 1 hour = ~10k words. Test model performance at that scale.
Multi-session plans — Should plan generation consider all past sessions or just the latest? (Recommendation: latest + previous plan context)
Client notifications — Should clients be notified when plan is updated? (Recommendation: out of scope for MVP)
Edit granularity — Field-level editing or regenerate whole sections? (Recommendation: field-level for MVP)


14. Success Metrics
MetricTargetTime from transcript upload to approved plan< 5 minutesAI parsing success rate> 95%Risk flags captured (when present in transcript)100%Client plan readabilityGrade 8 level or below

15. What to Build Next (Post-MVP)

Therapist preference learning — Store preferred modalities, adjust prompts
Audio upload with transcription — Whisper API integration
Collaborative editing — Real-time therapist edits
Progress tracking — Goal completion over time
Model evaluation harness — A/B test prompts, measure quality
