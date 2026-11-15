# Law Nanban AI implementation checklist

Inventory baseline: Vite, React 18, TypeScript, React Router, Supabase JS, Tailwind, PDF.js, and Mammoth. Existing route groups are `/portal/*` and `/app/*`. Supabase migrations define profiles, cases, parties, events, documents, summaries, legal references, legal-aid resources, hearings, agent tasks, and audit logs. Authentication and role gates were preserved.

The supplied Base44 URL was not accessible through the available web reader or browser connector during this implementation. Its pages and interaction details could not be independently inspected. This checklist maps the supplied requirements to this repository and the changes made.

| Workflow | Existing implementation / route | Status |
|---|---|---|
| Citizen ask and follow-up | `/portal/ask`, `CitizenAsk`, `law-nanban-chat` Edge Function | AI question flow and retry already existed; persistent per-account history added with an additive migration. Guest chats remain session-only. |
| Rights and legislation | `/portal/rights`, `/portal/legal-library`, `CitizenKnowledge` | Combined into one two-view module; legacy paths retained. Existing legislation search supports Tamil Unicode now. |
| Rights categories | `rightsCatalog.ts` | Existing catalog retained; seven Tamil Nadu legal and programme entries added with explicit Verified / Needs Review / Outdated labels and official-source links. Only the tenancy entry is marked Verified. |
| Professional dashboard | `/app`, `Dashboard` | Real case/hearing counts retained; pending task count and recent saved documents added from Supabase records. Notifications are not implemented in the existing schema. |
| Case management | `/app/cases`, `/app/cases/new`, `/app/cases/:id/edit`, `CaseDetail` | Search retained; create/edit, principal parties, case notes, party display, timeline are now wired to existing tables and RLS. |
| Case triage | `/app/triage`, `runTriageAgent` | Existing deterministic triage preserved. It is not an LLM or professional decision. |
| Legal research | `/app/research`, `runLegalResearchAgent` | Existing local retrieval from configured reference rows preserved; no live case-law service was found. |
| Document analysis | `/app/documents`, `runDocumentIntelligenceAgent` | Local PDF/DOCX/TXT extraction and heuristic analysis existed. Private original upload, optional case association, persisted summary, and short-lived signed download links added. Migration required. |
| Legal drafting | `/app/drafting`, `Drafting` | Added an authenticated, case-linked, editable and persistent document-outline workspace with export. It uses only user-supplied facts and cited provisions; it is not AI-generated. The missing drafting agent remains future work. |
| Seven-agent architecture | `src/lib/agents.ts`, `AgentName`, `agent_tasks` | Existing orchestration preserved: triage, document intelligence, legal research, legal aid, scheduling, and verification are present alongside orchestrator. No existing drafting or case-management agent was found. |
| AI connection | `supabase/functions/law-nanban-chat/index.ts` | Existing Gemini Edge Function remains server-side and reports configured service/model errors; live credentials and deployment could not be verified locally. |
| Authentication / ownership | `AuthContext`, `RequireAuth`, existing RLS | Preserved. New conversation tables and file storage restrict access to the authenticated owner. |
| Tamil / English | `src/i18n.ts`, citizen components | Existing translation system and rights content retained. The legislation search now preserves Tamil letters. Full translation coverage across the English-only professional portal is not present. |
| Base44 comparison / browser route testing | Reference URL | Not verified because the browser connector and web reader could not access the supplied site. |

## Configuration and deployment

- Frontend build requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (present in the local `.env`; values are not copied into this document).
- The deployed chat Edge Function requires `GEMINI_API_KEY` as a Supabase function secret. `GEMINI_MODEL` is optional; the code defaults to `gemini-3.8-flash`.
- Apply `20261115120000_add_citizen_conversations.sql` and `20261115130000_add_private_document_storage.sql` to the existing Supabase project before using persistent chat or private document uploads.
- Apply `20261115140000_add_professional_drafts.sql` before saving professional drafts.
- Document originals are stored in the private `professional-documents` bucket under an owner-prefixed object key. The UI uses a 60-second signed link for downloads.
- No database reset or destructive migration was added. Existing case tables and their RLS policies are reused.
