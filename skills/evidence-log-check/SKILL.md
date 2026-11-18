---
name: evidence-log-check
description: |
  Verify the factory evidence log is complete after a run, or before sharing
  evidence: every pipeline stage left a trace in evidence/runs/ and
  evidence/EVIDENCE.md mentions every run. Use after any factory run, before
  a Discussion submission, or whenever the log may have drifted from the
  records. Runs the deterministic checker in scripts/evidence-log-check.mjs
  and reports PASS/FAIL per run record.
license: MIT
metadata:
  version: "1.0.0"
  source: Agent Factory, Day 13 (Qodo Hackathon 2026) — written for this repo
  safety: VERIFIED 2026-11-18 — instruction-only skill plus a zero-dependency Node checker that only reads evidence/runs/, tickets/ and evidence/EVIDENCE.md and writes one report JSON; it never edits, deletes or "repairs" a run record.
---

# Evidence log check

AGENTS.md rule 4: every pipeline stage writes its result to the evidence log
(`evidence/runs/`). A stage that ran but left no trace did not run — and a
hand-maintained log (`evidence/EVIDENCE.md`) can drift from the records.
This skill proves the log is complete. It checks, it does not fix: a run
record is append-only history. Never edit a record to make the check pass.

## Required inputs

- The repository root. Default: the directory you are working in when you
  invoke this skill (the repo root).
- `evidence/runs/` — the directory of per-run JSON records. Must exist.
- `evidence/EVIDENCE.md` — the hand-maintained log. Must exist.
- Optional: `--out <path>` for the saved check report. Default:
  `evidence/runs/evidence-log-check-<UTC timestamp>.json`.

## Context you must read first

- `AGENTS.md` rule 4 (evidence) and rule 5 (a gate that fails twice
  escalates to a human).
- `src/factory/evidence.js` — how a run record is written: the filename is
  `<TICKET>-<ISO timestamp>.json` with `:` and `.` replaced by `-`.
- A run record has this shape (from `src/factory/index.js`): `ticket`,
  `startedAt`, `finishedAt`, `qodo`, `stages` with `spec`,
  `planReview`, `implement`, `codeReview`, `autoFix`, `verify`,
  plus `verdict` (`APPROVED` or `ESCALATED`) and `demoArtifact`.
  Two stages do NOT record `ok` the way the others do, and the checker
  knows it — do not "fix" the checker to demand `ok` everywhere:
  `autoFix` records `{ fixed, remaining }` (it succeeded when
  `remaining` is empty), and `codeReview` records the pre-fix `ok`,
  superseded by `afterFix.findings` when the auto-fix re-reviewed
  (T-004: pre-fix `ok: false`, post-fix findings clean, verdict
  APPROVED — that is consistent, not a failure).
- `evidence/runs/` also holds other evidence JSON (for example
  `day-11-review-comparison.json`). Those are NOT run records: they have no
  `stages` object and no `verdict`. The checker classifies them as
  `other` and skips them — do not fail them for missing stages.

## Steps

1. Confirm the inputs exist: `evidence/runs/` is a directory and
   `evidence/EVIDENCE.md` is a file under the repo root. If either is
   missing, stop and name the missing path.
2. Confirm the checker exists: `scripts/evidence-log-check.mjs`. If it is
   missing, stop and report "checker script missing" — do not reimplement
   the check inline.
3. Run the check from the repo root:
   `node scripts/evidence-log-check.mjs [root] [--out <path>]`
   `[root]` is optional — it defaults to the repo root, so running
   `node scripts/evidence-log-check.mjs` with no arguments checks this
   repo. `[--out <path>]` is optional too; without it the report goes to
   the default path under `evidence/runs/`.
   Keep the full stdout and the exit code. Exit 0 means every check passed;
   exit 1 means at least one check failed; exit 2 means the check itself
   could not run (missing input or unreadable file).
4. Read the saved report JSON (the path is printed on the last line of
   stdout). For each record, confirm the six per-record checks, plus the
   `ticket-has-run` cross-check:
   - `stages-present` — all six stages (`spec`, `planReview`,
     `implement`, `codeReview`, `autoFix`, `verify`) are present.
   - `timestamps` — `startedAt` and `finishedAt` are valid ISO dates
     and `finishedAt` is not before `startedAt`.
   - `verdict-valid` — `verdict` is `APPROVED` or `ESCALATED`.
   - `verdict-consistent` — `APPROVED` only when every stage succeeded;
     `ESCALATED` only when at least one stage did not. "Succeeded" is
     schema-specific: `autoFix` succeeds when `remaining` is empty (it
     records no `ok`); `codeReview` succeeds when `ok` is true, or when
     `afterFix.findings` has no blocker; every other stage succeeds when
     `ok` is true.
   - `filename-matches-ticket` — the filename starts with the record's
     ticket id and the record's `ticket` field matches it.
   - `logged-in-evidence-md` — `evidence/EVIDENCE.md` mentions the
     ticket id.
   - `ticket-has-run` (cross-check) — every ticket file in `tickets/`
     with status `done` or `escalated` has a run record.
5. Report the result, in this order:
   - the verdict line: `EVIDENCE LOG: PASS (N records, 0 failures)` or
     `EVIDENCE LOG: FAIL (N failures)` — copy the checker's verdict line
     verbatim, do not reword it;
   - every failing record: file, check id, and the detail the checker
     printed;
   - the `other` files the checker skipped, by name, so the reader knows
     they were seen and deliberately not failed;
   - the path of the saved report JSON.
6. If the result is FAIL, do not edit any run record. The fix is one of:
   the log (`evidence/EVIDENCE.md`) is missing a mention — add it; the
   recorder (`src/factory/evidence.js` or `src/factory/index.js`) is not
   writing a stage — fix the recorder and re-run the factory ticket; the
   record itself is corrupt — escalate to a human. After the fix, re-run
   step 3 and report the new verdict line.

## Expected results

- A healthy log prints `EVIDENCE LOG: PASS` and exit code 0, with one
  report JSON saved under `evidence/runs/`.
- A failing log prints `EVIDENCE LOG: FAIL`, exit code 1, and names every
  failing check. That is a correct outcome, not a broken check: report it
  and follow step 6.

## Evidence to save

- The check report JSON (path printed by the checker). Keep it in
  `evidence/runs/` — the next run classifies it as `other` and skips it.
- The exact command you ran and its exit code, in the evidence record for
  the work that invoked the check.

## Stop and ask for input when

- `evidence/runs/` or `evidence/EVIDENCE.md` is missing. Name the missing
  path and stop.
- `scripts/evidence-log-check.mjs` is missing. Report it and stop; do not
  write your own version of the check on the spot.
- The checker exits 2 (it could not run). Report its stderr and stop.
- A check fails and you do not know which fix applies. Report the failing
  checks and stop; do not guess a fix, and never edit a run record.

## Never

- Edit, delete, or "repair" a run record in `evidence/runs/` to make the
  check pass. Records are append-only history.
- Weaken a check, skip a record, or report PASS when the checker said FAIL.
- Treat a file in `evidence/runs/` that is not a run record as a failed run
  record. Classify first, then check.
