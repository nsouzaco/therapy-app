# AI Treatment Plan Generator

An AI-powered mental health treatment planning application that transforms therapy session transcripts into personalized, dual-view treatment plans for therapists and clients.

## Features

### Core Functionality
- **Audio/Video Transcription** — Upload session recordings for automatic speech-to-text conversion via OpenAI Whisper
- **AI Treatment Plans** — Generate structured plans with goals, interventions, homework, and clinical impressions
- **Dual Views** — Therapist-facing clinical documentation + client-facing plain-language summaries
- **Risk Detection** — Automatic flagging of safety concerns with keyword scanning and AI analysis

### Therapist Features
- **Client Management** — Dashboard to manage clients and view session history
- **Session Summaries** — AI-generated "What we worked on" summaries with key themes
- **Clinical Style Learning** — System learns your therapeutic approach across sessions
- **Knowledge Base (RAG)** — Upload research papers, protocols, and preferences to enhance AI outputs
- **Version History** — Track plan changes with diff comparisons
- **Editable Plans** — Inline editing for goals, interventions, and session notes
- **Citation Evidence** — Click any plan element to see supporting transcript excerpts

### Client Features
- **My Plan** — Accessible view of treatment goals and homework in plain language
- **Session History** — Review past sessions and progress

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│                    Next.js 14 (App Router)                  │
│              React + TypeScript + Tailwind CSS              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                            │
│                   Next.js API Routes                        │
│     /api/transcribe, /api/clients, /api/sessions, etc.     │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    OpenAI API   │  │    Supabase     │  │ Supabase Storage│
│   - GPT-4o-mini │  │   - PostgreSQL  │  │   - Audio/Video │
│   - Whisper     │  │   - pgvector    │  │   - Documents   │
│   - Embeddings  │  │   - Auth (RLS)  │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Key Directories

```
src/
├── app/                    # Next.js pages and API routes
│   ├── (auth)/            # Login/register pages
│   ├── (client)/          # Client-facing pages
│   ├── (therapist)/       # Therapist dashboard, sessions, settings
│   └── api/               # Backend API routes
├── components/            # React components
│   ├── plan/             # Treatment plan display/editing
│   ├── therapist/        # Session upload, client management
│   └── ui/               # Shared UI components
└── lib/
    ├── ai/               # OpenAI integration, prompts, parsing
    ├── rag/              # Document embeddings and retrieval
    ├── supabase/         # Database client configuration
    └── types/            # TypeScript type definitions
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + pgvector)
- **Auth**: Supabase Auth with Row Level Security
- **AI**: OpenAI GPT-4o-mini, Whisper, text-embedding-ada-002
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- OpenAI API key

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

### Database Setup

Run the SQL migrations in order in the Supabase SQL Editor:

1. `supabase/schema.sql` — Base tables
2. `supabase/migration-session-summaries.sql` — Session summaries
3. `supabase/migration-therapist-style.sql` — Style learning
4. `supabase/migration-session-media.sql` — Media storage
5. `supabase/migration-rag.sql` — Knowledge base (pgvector)

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

## Usage

1. **Register** as a therapist
2. **Add clients** from the dashboard
3. **Upload session** — paste transcript text or upload audio/video
4. **Generate plan** — AI creates structured treatment plan
5. **Review & edit** — Click citations to see evidence, edit inline
6. **Share with client** — Client sees simplified view at their login

## License

Private — All rights reserved.
