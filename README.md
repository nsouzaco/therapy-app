<div align="center">

# Tava Health

**An AI-powered mental health treatment planning platform that transforms therapy session transcripts into personalized treatment plans with dual views for therapists and clients.**

<br />

![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=flat-square&logo=openai&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

</div>

<br />

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Audio/Video Transcription** | Upload session recordings for automatic speech-to-text via OpenAI Whisper |
| **AI Treatment Plans** | Generate structured plans with goals, interventions, homework, and clinical impressions |
| **Dual Views** | Therapist-facing clinical documentation + client-facing plain-language summaries |
| **Risk Detection** | Automatic flagging of safety concerns with keyword scanning and AI analysis |
| **AI Copilot** | Conversational assistant for treatment planning with chat and quick actions |
| **Knowledge Base (RAG)** | Upload research papers and protocols to enhance AI outputs with citations |
| **Clinical Style Learning** | System learns your therapeutic approach across sessions |
| **Version History** | Track plan changes with diff comparisons between versions |
| **Citation Evidence** | Click any plan element to see supporting transcript excerpts |

<br />

## 🛠 Tech Stack

<table>
<tr>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=nextjs" width="48" height="48" alt="Next.js" />
<br />Next.js 14
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
<br />React 18
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=typescript" width="48" height="48" alt="TypeScript" />
<br />TypeScript
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=supabase" width="48" height="48" alt="Supabase" />
<br />Supabase
</td>
<td align="center" width="96">
<img src="https://cdn.simpleicons.org/openai/412991" width="48" height="48" alt="OpenAI" />
<br />GPT-4o
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br />Tailwind
</td>
</tr>
</table>

| Category | Technologies |
|----------|--------------|
| **Framework** | Next.js 14 (App Router), React 18, TypeScript |
| **Database** | Supabase (PostgreSQL + pgvector for embeddings) |
| **Auth** | Supabase Auth with Row Level Security (RLS) |
| **AI** | OpenAI GPT-4o-mini, Whisper (transcription), text-embedding-ada-002 |
| **Styling** | Tailwind CSS |
| **Testing** | Vitest |
| **Deployment** | Vercel |

<br />

## 🚀 Setup

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) project
- [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd tava-health

# Install dependencies
npm install
```

### Environment Configuration

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_key
```

### Database Setup

Run the SQL migrations in order in the Supabase SQL Editor:

```bash
1. supabase/schema.sql              # Base tables, RLS policies
2. supabase/migration-session-summaries.sql  # Session summaries
3. supabase/migration-therapist-style.sql    # Style learning
4. supabase/migration-session-media.sql      # Media storage
5. supabase/migration-video-storage.sql      # Video storage
6. supabase/migration-rag.sql                # Knowledge base (pgvector)
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build & Production

```bash
npm run build
npm start
```

<br />

## 📖 Usage

### For Therapists

1. **Register** as a therapist and complete your profile
2. **Add clients** from the dashboard
3. **Upload session** — paste transcript text or upload audio/video files
4. **Generate plan** — AI creates structured treatment plan with goals & interventions
5. **Review & edit** — click citations to see evidence, edit fields inline
6. **Use AI Copilot** — ask questions or get intervention/homework suggestions
7. **Build knowledge base** — upload research papers to enhance AI outputs
8. **Share with client** — client sees simplified view at their login

### For Clients

1. **Login** with credentials from your therapist
2. **View your plan** — see treatment goals and homework in plain language
3. **Track sessions** — review past sessions and your progress
4. **Get help** — AI explanations of clinical terms in simpler language

### AI Copilot

The Copilot helps therapists with treatment planning decisions:

**Chat Mode:**
- Ask free-form questions like "What if we tried DBT instead of CBT?"
- Get suggestions for modifications based on client presentation
- Responses cite your uploaded knowledge base when relevant

**Quick Actions:**
- Suggest evidence-based interventions for a specific goal
- Generate homework assignments for an intervention
- Explain the research/evidence base behind techniques

<br />

## 📁 Project Structure

```
tava-health/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/             # Login/register pages
│   │   ├── (client)/           # Client-facing pages
│   │   │   ├── my-plan/        # Treatment plan view
│   │   │   └── my-sessions/    # Session history
│   │   ├── (therapist)/        # Therapist dashboard
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── clients/        # Client management
│   │   │   ├── sessions/       # Session details
│   │   │   └── settings/       # Preferences
│   │   └── api/                # API routes
│   │       ├── transcribe/     # Whisper transcription
│   │       ├── copilot/        # AI assistant
│   │       ├── clients/        # Client CRUD
│   │       ├── sessions/       # Session management
│   │       └── plans/          # Plan versions
│   │
│   ├── components/
│   │   ├── plan/               # Treatment plan UI
│   │   │   ├── copilot-panel   # AI assistant panel
│   │   │   ├── goals-section   # Goals display/edit
│   │   │   ├── version-history # Plan versioning
│   │   │   └── risk-banner     # Safety alerts
│   │   ├── therapist/          # Therapist components
│   │   ├── client/             # Client components
│   │   └── ui/                 # Shared UI components
│   │
│   └── lib/
│       ├── ai/                 # AI integration
│       │   ├── generate-plan   # Plan generation
│       │   ├── risk-detection  # Safety scanning
│       │   ├── prompts         # System prompts
│       │   └── parse-response  # Response parsing
│       ├── rag/                # Knowledge base
│       │   ├── embeddings      # Vector embeddings
│       │   ├── chunking        # Document chunking
│       │   └── retrieval       # Semantic search
│       ├── supabase/           # Database clients
│       └── types/              # TypeScript types
│
├── supabase/                   # Database migrations
└── package.json
```

<br />

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/complete-registration` | Complete user registration |

### Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/therapist/clients` | List therapist's clients |
| `POST` | `/api/therapist/clients` | Add new client |
| `GET` | `/api/therapist/clients/:id` | Get client details |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clients/:clientId/sessions` | List client sessions |
| `POST` | `/api/clients/:clientId/sessions` | Create session with transcript |
| `GET` | `/api/sessions/:id` | Get session details |
| `GET` | `/api/sessions/:id/video` | Get video playback URL |

### Treatment Plans

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clients/:clientId/plan` | Get client's treatment plan |
| `POST` | `/api/clients/:clientId/plan/generate` | Generate AI treatment plan |
| `GET` | `/api/plans/:planId/versions` | List plan versions |
| `GET` | `/api/plans/:planId/versions/:versionId` | Get specific version |
| `GET` | `/api/plans/:planId/compare` | Compare two versions (diff) |

### AI Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/transcribe` | Transcribe audio/video via Whisper |
| `POST` | `/api/copilot` | AI assistant (chat or actions) |

### Knowledge Base

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/therapist/documents` | List uploaded documents |
| `POST` | `/api/therapist/documents` | Upload document for RAG |
| `DELETE` | `/api/therapist/documents/:id` | Remove document |

### Therapist Style

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/therapist/style` | Get learned clinical style |
| `POST` | `/api/therapist/style/backfill` | Analyze past sessions |

<br />

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o, Whisper, embeddings |

<br />

## ⚠️ Important Notes

- **Clinical Review Required** — AI-generated content requires professional judgment. This tool supports but does not replace clinical decision-making.
- **HIPAA Compliance** — Data is stored securely with encryption. Supabase provides SOC 2 Type II compliance.
- **Risk Detection** — The system scans for safety concerns (suicidal ideation, self-harm, etc.) and flags high-risk content for immediate review.

