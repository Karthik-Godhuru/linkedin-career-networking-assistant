<<<<<<< HEAD
# LinkedIn Career Networking Assistant

> A secure, compliant, AI-powered career discovery and networking platform designed for AI/ML engineers, Python developers, mentors, alumni, and recruiters.

[![Tests](https://img.shields.io/badge/tests-75%20passed-emerald)](https://vitest.dev/)
[![Lint](https://img.shields.io/badge/linter-0%20errors-emerald)](https://oxc.rs/)
[![TypeScript](https://img.shields.io/badge/typescript-strict%20passed-blue)](https://www.typescriptlang.org/)
[![Compliance](https://img.shields.io/badge/compliance-zero--scraping%20enforced-purple)](https://www.linkedin.com/legal/user-agreement)
[![Milestone](https://img.shields.io/badge/release-Milestone%208%20Ready-emerald)]()

---

## Architecture & Milestone Summary

| Milestone | Capability | Status |
|---|---|---|
| **M1: Infrastructure & Auth** | Supabase Auth session lifecycle, token refresh, and tenant isolation | Complete & Verified |
| **M2: Career Goals Engine** | User-defined target roles, companies, skills, locations, and alumni criteria | Complete & Verified |
| **M3: Discovery & Relevance** | CSV ingestion, Google ATS search templates, SHA256 deduplication, transparent scoring | Complete & Verified |
| **M4: Candidate Curation** | Human approval dashboard with Shortlist, Approve for Outreach, Dismiss, and filters | Complete & Verified |
| **M5: Outreach Studio** | `li-dm` compliant grounded connection notes (<200 chars) and two structured follow-ups | Complete & Verified |
| **M6: Networking Tracker** | 7-stage networking pipeline, +4d/+10d follow-up spacing, in-app reminders, notes | Complete & Verified |
| **M7: Internship Engine** | Application tracking (OA, Interviews, Offers), missing skills detection, deadline alerts | Complete & Verified |
| **M8: Security & Readiness** | Strict Row-Level Security, publishable anon keys only, 75 passing automated tests | Complete & Verified |

---

## Security & Compliance Architecture

### 1. Row-Level Security (RLS) & Tenant Isolation
All tables in PostgreSQL strictly enforce per-user tenant isolation:
- `user_career_profiles`
- `candidates`
- `connection_messages`
- `networking_tracker`
- `internships`

Each table features an ownership column: `user_id UUID REFERENCES auth.users(id) NOT NULL`.
Policies enforce `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
Cross-tenant read, write, update, or delete operations are physically rejected at the PostgreSQL database engine level.

### 2. Least-Privilege Key Management
- The frontend connects **only** via the publishable `VITE_SUPABASE_ANON_KEY`.
- High-privilege `service_role` master keys are **never** bundled into the client, exposed in environment variables, or committed to version control.
- All database operations are restricted to the `authenticated` role. The unauthenticated `anon` role is denied table-level access.

### 3. LinkedIn Policy & Human-in-the-Loop Safeguards
- **Zero Scraping**: Does not scrape LinkedIn or bypass rate limits or login paywalls.
- **No Bot Automation**: Does not automate "Connect" clicks, invitation sends, or DM deliveries.
- **Direct Link Launchpad**: All connection notes and job applications open in official career portals and profile links in clean browser tabs for manual review and submission by the user.

---

## Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ or 20+ LTS recommended)
- `npm` (version 9+ or 10+)
- A free [Supabase](https://supabase.com/) project (optional for mock/offline testing; required for live cloud sync)

### 1. Install Dependencies
```powershell
npm.cmd install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
# Supabase Configuration (Settings -> API in your Supabase dashboard)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-publishable-anon-key

# Optional: Gemini AI Enrichment (Settings -> Google AI Studio)
# If omitted or left placeholder, the application automatically uses the transparent deterministic rule engine
VITE_GEMINI_API_KEY=your-optional-gemini-key
```

### 3. Run Development Server
```powershell
npm.cmd run dev
```
Open `http://localhost:5173` in your browser.

---

## Automated Verification & Quality Suite

Run all verification tools locally:

```powershell
# Run the 75 automated unit and integration tests
npm.cmd test

# Run code quality inspection (Oxlint)
npm.cmd run lint

# Run TypeScript compilation check and Vite production build
npm.cmd run build
```

---

## Supabase Database Migrations

All schema changes are tracked cleanly in `supabase/migrations/`:

| Migration File | Description |
|---|---|
| `20261024000000_init_schema.sql` | Initial schema: tables, custom enums, performance indexes, RLS |
| `20261024185559_grant_user_career_profiles_authenticated.sql` | Grants permissions on `user_career_profiles` to `authenticated` |
| `20261024201300_grant_candidates_access.sql` | Grants permissions on `candidates` to `authenticated` |
| `20261025000001_add_shortlisted_to_candidate_status.sql` | Adds `'shortlisted'` to `candidate_status` enum |
| `20261025000002_grant_connection_messages_authenticated.sql` | Grants permissions on `connection_messages` to `authenticated` |
| `20261025000003_grant_networking_tracker_authenticated.sql` | Grants permissions on `networking_tracker` to `authenticated` |
| `20261025000004_add_relationship_established_to_tracker_status.sql` | Adds `'relationship_established'` to `tracker_status` enum |
| `20261025000005_grant_internships_and_extend_status.sql` | Grants permissions on `internships` and extends `internship_status` |

To push migrations to a linked remote Supabase project:
```powershell
# Perform a dry-run check first
npx.cmd supabase db push --dry-run --linked

# Push migrations to the linked remote project
npx.cmd supabase db push --linked
```

---

## Free-Tier Deployment Guide (Vercel / Netlify / Cloudflare Pages)

The project is a standard Single Page Application (SPA) ready for free hosting:

### Deployment Checklist:
1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **Environment Variables**:
   - `VITE_SUPABASE_URL`: Your production Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your production Supabase anon/publishable key
4. **SPA Rewrite Rule**:
   - For **Vercel**: Included automatically with Vite presets or via `vercel.json`:
     ```json
     { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
     ```
   - For **Netlify**: Add a `_redirects` file in `public/` containing:
     ```
     /*    /index.html   200
     ```

---

## Operational Dependencies & Fallbacks

1. **Authentication & Data Persistence**:
   - Requires Supabase credentials in `.env`.
   - If unconfigured, the application runs in local offline mode for evaluation.
2. **AI Relevance Matching**:
   - Powered by a transparent, deterministic matching rule engine analyzing target roles, skills, locations, and companies.
   - Does not require a paid LLM API key to function.
   - If `VITE_GEMINI_API_KEY` is provided, optional AI synthesis enriches outreach hooks and interview preparation tips.
3. **Applicant Tracking Systems (ATS) Discovery**:
   - Uses zero-scraping Google search templates targeting Greenhouse, Lever, Ashby, and Workday.
   - No paid third-party scraping services or API quotas required.

---

## License
MIT License. Compliant with LinkedIn User Agreement and Terms of Service.
=======
# linkedin-career-networking-assistant
>>>>>>> e0581722e5ddadbd8bb55a5637c091a38d95285d
