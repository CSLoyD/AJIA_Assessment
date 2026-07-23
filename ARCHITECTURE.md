# Architecture Note

## What this is

A scoped slice of a collaborative document editor: create/rename/edit rich-text
documents, import a .txt/.md file as a new document, share a document with another
seeded user, and persist all of it in Postgres.

## What was prioritized

- **Correct, testable access control** over broad sharing features. Sharing is
  single-tier (anyone granted access can view and edit) rather than role-based,
  because the access-check logic itself — not the number of roles — is where bugs
  actually hide, and it's covered by unit and integration tests.
- **A coherent editing loop** (create, format, autosave, reopen) over a wide
  formatting surface. The toolbar covers exactly what the editor persists and
  nothing it can't render back correctly.
- **A single language (TypeScript) across the stack** to keep the timebox spent on
  product logic rather than cross-language plumbing.

## Deliberate scope cuts

- No real authentication — a seeded-user picker stands in for login, documented as
  such and not intended as production security.
- No role-based sharing (viewer vs. editor) — one access tier.
- No real-time collaborative editing, no version history.
- Import supports `.txt` and `.md` only, and only block-level structure (headings,
  paragraphs, lists) — inline emphasis inside imported files is not parsed.
- `.docx` import was considered and dropped: a correct parser is a meaningfully
  larger dependency than the value it adds within this timebox.

## Testing

Backend unit tests cover the two places most likely to hide real bugs: the
access-check function (owner / shared / unauthorized) and the markdown/text import
converter. One Supertest integration test exercises the create-then-fetch path
against a real database. UI behavior was verified manually end to end rather than
with component tests, which was the better use of a tight timebox at this scope.
