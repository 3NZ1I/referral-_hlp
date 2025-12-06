My workflow 2 (n8n) updates
============================

This short note documents the important changes to the n8n workflow used to ingest Kobo forms and create cases.

Key changes:
- `MoveBodyIds` - now: promotes nested `raw.body` keys to top-level `raw` keys. Specifically, it promotes:
  - Kobo IDs: `case_id`, `caseNumber`, `_id` to `kobo_case_id`, `kobo_caseNumber`, `kobo__id`.
  - Timestamp aliases: `_submission_time`, `submissiontime`, `submission_time`, `end`, `start`, `submitted_at`, `submissiondate`, `submissionDate`.
  - Roster aliases: `family_roster`, `family`, `roster`, `household`, `household_members`, `members`, `family_members`, `familymembers`, `householdMembers`.
  - `formFields` object: promoted to top-level `raw.formFields`.
  - Category aliases: `law_followup`, `eng_followup`, `category`, `case_category`, `caseCategory`.

- `POST Create Case` node - switched to header auth only (no BasicAuth) to prevent BasicAuth overwriting the `Authorization` header. Ensure you provide a valid Bearer token or header auth credential for automation (n8n admin token).

How to validate: use the `GET Cases` node to inspect `raw` returned for existing cases; verify roster nodes, `_submission_time`, and category aliases are present at top-level `raw` after `MoveBodyIds` runs.
