# AI Workflow Note

## Tool

Built with Claude Code, Anthropic's CLI coding agent, using a structured process
rather than one long freeform session: brainstorm the requirements, write a design
spec, turn the spec into a detailed implementation plan, then execute the plan with
independent review at every step.

## Process

1. **Brainstorming.** Before any code was written, requirements were clarified one
   question at a time — timebox, deployment expectations, auth approach, file-import
   behavior, stretch-goal scope — then three stack options were proposed with
   tradeoffs and a recommendation. The approved design was written up as a spec
   document and self-reviewed for placeholders, contradictions, and scope creep
   before implementation started.

2. **Planning.** The approved spec became an 18-task implementation plan with
   bite-sized, test-first steps. Each task specified exact files, exact code, exact
   test commands, and expected output, so execution didn't require guessing at
   structure or conventions partway through.

3. **Implementation.** Each task was executed by a fresh, isolated agent with no
   shared memory between tasks, producing one self-contained commit per task. Every
   task went through two-stage review before the next one started:
   - A spec-compliance review that re-read the actual code and diffed it against the
     plan, rather than trusting the implementer's own report of what it did.
   - A code-quality review covering correctness, security, and maintainability.

   Any issues found were sent back for a fix and re-reviewed before the task was
   considered done.

4. **Manual verification.** Once all 18 tasks passed review, the full application
   was exercised in a real browser — login, rich-text formatting, autosave, refresh
   persistence, sharing between two separate user sessions (grant, access, revoke,
   confirm access is actually denied afterward), and both valid and invalid file
   imports — plus a full `docker compose up` bring-up of all three services from a
   clean state.

5. **Final review.** A last holistic pass across the entire diff, separate from the
   per-task reviews, specifically looking for integration issues that only show up
   when the whole system is considered together.

## Bugs the review process caught before they shipped

- `GET /documents/:id` was returning the internal list of who a document was shared
  with to any user with access, not just the owner — a real information leak, caught
  and fixed during implementation.
- The backend's Docker image was missing OpenSSL, which silently breaks Prisma's
  database engine at container *runtime* rather than at build time — a build-only
  check would not have caught this. Found while bringing up the full stack with
  Docker Compose.
- The Render deployment config would have skipped installing the Prisma CLI and
  TypeScript at build time under `NODE_ENV=production`, breaking the deploy build.
  Found and fixed during final review.
- A CSS rule set dark text with no background color, making the app unreadable
  under a dark browser or OS theme. Found via an actual screenshot during the final
  review, not just by reading the code.
- Two of the app's core routes — saving document content and renaming a document —
  had no automated test coverage. Tests were added for both before the project was
  considered complete.

## What was verified directly, not just delegated

Every code review's findings were read and judged before deciding whether to act on
them. The full end-to-end browser walkthrough (login, editing across all formatting
options, sharing between two real user sessions, import success and rejection cases)
was driven and observed directly, not just reported by an agent. Backend tests were
re-run independently against a live database at the end, and the final merge to the
main branch was verified by running the test suite again on the merged result before
cleaning up.

## Where this workflow stayed within its limits

No third-party accounts (Vercel, Render, Supabase) were created on the user's
behalf — that requires the user's own credentials and is not something an agent
should do autonomously. The deployment path is fully documented in `README.md` for
the user to execute themselves.
