# Tava Health - AI Treatment Plans

An AI-powered treatment plan generator for mental health therapists. This application takes therapy session transcripts (text or audio) and generates structured, personalized treatment plans with dual views: clinical documentation for therapists and plain-language summaries for clients.

![Tava Health](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-orange)

## 🎯 Overview

Tava Health solves key challenges in mental health documentation:

- **Time-consuming** treatment plan creation
- **Inconsistent** documentation between providers
- **Language mismatch** - too clinical for clients or too simplified for clinicians

The solution uses AI to generate tailored treatment plans with:
- **Therapist View**: Clinical detail, ICD language, interventions, risk factors
- **Client View**: Plain-language, strengths-based, motivational content

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Auth Pages  │  │  Therapist   │  │    Client Views      │  │
│  │  /login      │  │  /dashboard  │  │    /my-plan          │  │
│  │  /register   │  │  /clients    │  │    /my-sessions      │  │
│  └──────────────┘  │  /sessions   │  └──────────────────────┘  │
│                    │  /plan       │                             │
│                    └──────────────┘                             │
├─────────────────────────────────────────────────────────────────┤
│                        API Routes                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ /api/transcribe │ │ /api/clients/   │ │ /api/client/    │   │
│  │ (Whisper)       │ │ plan/generate   │ │ plan (filtered) │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      AI Integration                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  OpenAI GPT-4o-mini                                      │   │
│  │  ├── Treatment Plan Generation (structured JSON output)  │   │
│  │  ├── Session Summary Generation (dual-view)              │   │
│  │  ├── Risk Detection (AI + keyword patterns)              │   │
│  │  └── Whisper Audio Transcription                         │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                       Database (Supabase)                        │
│  ┌────────────┐ ┌────────────────┐ ┌────────────────────────┐  │
│  │   users    │ │ client_profiles│ │      sessions          │  │
│  │ therapist_ │ │ treatment_     │ │      plan_versions     │  │
│  │ profiles   │ │ plans          │ │                        │  │
│  └────────────┘ └────────────────┘ └────────────────────────┘  │
│  Row Level Security (RLS) for data isolation                    │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/nsouzaco/therapy-app.git
cd therapy-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For seed script only

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

### Database Setup

1. Create a new Supabase project
2. Run the schema in `supabase/schema.sql` via SQL Editor
3. Run migrations in `supabase/migration-session-summaries.sql`

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Seed Demo Data (Optional)

```bash
npm run seed
```

Creates demo accounts:
- Therapist: `demo-therapist@tavahealth.test` / `demo123!`
- Clients with sample session transcripts

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, register pages
│   ├── (therapist)/      # Therapist dashboard, clients, sessions, plans
│   ├── (client)/         # Client plan view, sessions
│   └── api/              # API routes
│       ├── transcribe/   # Audio → text (Whisper)
│       ├── clients/      # Client & session management
│       └── plans/        # Plan generation & editing
├── components/
│   ├── plan/             # Plan display & editing components
│   ├── client/           # Client-facing display components
│   ├── therapist/        # Therapist tools (upload, modals)
│   └── ui/               # Shared UI components
└── lib/
    ├── ai/               # AI integration
    │   ├── generate-plan.ts     # Treatment plan generation
    │   ├── generate-summary.ts  # Session summaries
    │   ├── risk-detection.ts    # Safety screening
    │   └── prompts.ts           # System prompts
    ├── supabase/         # Database clients
    └── types/            # TypeScript definitions
```

## 🤖 AI System Design

### Treatment Plan Generation

```typescript
// Prompt strategy: Structured JSON output with dual-view content
{
  presenting_concerns: { clinical: "...", client_facing: "..." },
  clinical_impressions: { clinical: "...", client_facing: "..." },
  goals: [{ type: "short_term", goal: "...", client_facing: "..." }],
  interventions: [{ name: "CBT", description: "...", client_facing: "..." }],
  homework: [{ task: "...", purpose: "..." }],
  strengths: [{ strength: "...", how_to_leverage: "..." }],
  risk_factors: { level: "low|moderate|high", flags: [...] }
}
```

**Key design decisions:**
- Use `response_format: { type: "json_object" }` for reliable structured output
- Separate clinical vs client-facing content at the schema level
- Include risk assessment in every generation

### Risk Detection

Two-layer approach:
1. **AI Detection**: GPT analyzes transcript for concerning content
2. **Keyword Backup**: Regex patterns catch explicit crisis language

```typescript
// Keyword patterns for high-risk content
const RISK_PATTERNS = [
  { category: "Suicidal ideation", severity: "high", patterns: [...] },
  { category: "Substance abuse", severity: "moderate", patterns: [...] },
  // ...
];
```

Results are merged, with the higher severity level taking precedence.

### Audio Transcription

Uses OpenAI Whisper for speech-to-text:
- Supports MP3, M4A, WAV, WebM, OGG (max 25MB)
- Returns transcript with timestamps and language detection
- Editable before saving

### Session Summaries

Generates dual summaries after each session upload:
- **Therapist**: Clinical, structured, documentation-ready
- **Client**: Warm, encouraging, plain-language

## 🔒 Security & Privacy

- **Row Level Security (RLS)**: Therapists only see their clients
- **Content Filtering**: Client API strips clinical and risk data
- **No Real PHI**: Use only synthetic/demo data
- **Disclaimers**: Visible warnings that AI doesn't replace clinical judgment

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/lib/ai/__tests__/risk-detection.test.ts
```

Tests cover:
- Response parsing & error recovery
- Risk detection patterns
- Client content filtering

## 📋 Key Features

### Core (Implemented)
- ✅ Audio upload with AI transcription (Whisper)
- ✅ Text transcript upload (paste or .txt file)
- ✅ AI treatment plan generation (GPT-4o-mini)
- ✅ Dual-view plans (therapist + client)
- ✅ Inline plan editing
- ✅ Risk detection & flagging
- ✅ Session summaries (therapist + client)
- ✅ Plan approval workflow
- ✅ Version history
- ✅ Role-based access control

### Safety
- ✅ Crisis language detection
- ✅ Risk level indicators (low/moderate/high)
- ✅ Safety plan recommendations
- ✅ Clinical disclaimers

## 🔮 Future Enhancements

With more time, I would add:

1. **Model Evaluation Harness**
   - Compare GPT-4o-mini vs Claude vs local models
   - Measure output quality, reading level, structure

2. **Therapist Preferences**
   - Store preferred modalities (CBT, DBT, ACT)
   - Few-shot examples from "golden" plans
   - Adapt prompts per therapist

3. **Diff View**
   - Show changes between plan versions
   - Highlight what changed after new sessions

4. **Multi-language Support**
   - Detect transcript language
   - Generate plans in same language

5. **Explainability**
   - Click plan elements to see source transcript snippets
   - "Why did the AI suggest this intervention?"

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | Full-stack React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Supabase | PostgreSQL + Auth + RLS |
| OpenAI GPT-4o-mini | Treatment plan generation |
| OpenAI Whisper | Audio transcription |
| Vitest | Unit testing |

## ⚠️ Disclaimer

This is a demonstration application. In production:
- Ensure HIPAA compliance
- Add proper audit logging
- Implement encryption at rest
- Get clinical validation
- Add professional review workflows

**AI-generated content requires clinical review. This tool supports but does not replace professional judgment.**

## 📄 License

MIT

