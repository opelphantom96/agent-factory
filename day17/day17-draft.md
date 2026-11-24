# Qodo Hackathon — Day 17: What did your agent decide?

**Status: DRAFT — NOT POSTED. Needs the user's GitHub account (opelphantom96) to post.**

- Challenge email: Filip Hric at Qodo, 24 Nov 2026 19:01 WIB
  (Gmail id `1a20d6ec36b5d6b2`) — "Day 17: What did your agent decide?"
- Discussion: https://github.com/orgs/qodo-hackathon/discussions/19
  ("Day 17: What did your agent decide?")
- Repo: https://github.com/opelphantom96/agent-factory (public, personal account)
- Outcome: **Investigation COMPLETE — conclusion: ACCEPT the behavior.**
  Agent Session Review ran for real (Qodo CLI 2.7.0 + skill
  `qodo-agent-session-review` 1.0.1, session `20261124-123612-b29f`).
  No merge required; no fix needed.

## My PR and source

Project/repository and PR URL:
https://github.com/opelphantom96/agent-factory/pull/4
("Day 14: gate must syntax-check ticket change scripts (T-007, factory APPROVED)")

Commit investigated: `8949899` (the T-007 implementation; PR head `2ff1a7b`
is a docs-only follow-up, so the evidence below is pinned to 8949899).

Original ticket or plan:
`tickets/T-007-verify-change-scripts.json`
(https://github.com/opelphantom96/agent-factory/blob/day-14-guard-fix/tickets/T-007-verify-change-scripts.json)

Expected behavior and source passage:
> "npm run verify syntax-checks ticket change scripts
> (tickets/changes/*.mjs) — a syntax error there fails the gate"

Ticket goal: the Day 9 quality gate (`npm run verify`) claimed to
syntax-check every source file but never checked ticket change scripts
(`tickets/changes/*.mjs`) — executable code the factory runs on every
ticket.

## One decision I investigated

Implementation decision, assumption or deviation:
`collectJsFiles()` in `scripts/verify.mjs` now includes
`tickets/changes/`, and the gate runner only runs on direct execution
(`process.argv[1] === fileURLToPath(import.meta.url)`) so tests can
import the collector without starting verification. Both are **Planned**
decisions from ticket T-007.

What Requirements and Decisions claimed:
Agent Session Review's Requirements/Decisions pages were compared
against the ticket: the implementation follows the ticket's acceptance
criteria exactly (collector covers the change scripts; exported for
tests; runner gated on direct execution).

What I compared with the original source:
The ticket's acceptance list vs `scripts/verify.mjs` (collector at
lines 36–42, guard at 55–66), `scripts/verify.test.js` (2 coverage
tests), and the change script
`tickets/changes/t-007-verify-change-scripts.mjs` that applied the fix.

Why I chose this decision (a planned decision is valid):
It is the PR's core behavior change, and Qodo's own review of this PR
flagged its second half as Medium behavioral complexity — the exact
risk worth checking before accepting.

## What I checked

Relevant interfaces, implementation and tests from Code map:
- Contract: exported `collectJsFiles()` (`scripts/verify.mjs:36-42`)
  + ticket acceptance (`tickets/T-007-verify-change-scripts.json:1-19`).
- Implementation: collector + guard (`scripts/verify.mjs:30-43, 55-66`)
  + applying change script
  (`tickets/changes/t-007-verify-change-scripts.mjs:1-147`).
- Tests: `scripts/verify.test.js:1-41` (2 tests).

Specific code references supporting the behavior:
- `collectJsFiles()` returns JavaScript from `src/`, `scripts/` and
  `tickets/changes/` — 26 files, all 6 change scripts.
- Before T-007 there was no `collectJsFiles()` at all; the gate looped
  only over `src/` + `scripts/` (verified from `8949899^`), so the hole
  in the ticket is real and the fix closes exactly it.

Observable consequence and expected result:
A syntax error in any `tickets/changes/*.mjs` file must fail
`npm run verify` (the gate runs `node --check` per file).

Actual command/action, check output and code version:
- `node -e` import of `scripts/verify.mjs` → `collectJsFiles('.')`
  returns 26 files including all 6 change scripts.
- Negative control: a deliberately broken script
  (`export const broken = ;`) fails `node --check` with
  `SyntaxError: Unexpected token ';'` (exit 1).
- Positive control: all 6 real change scripts pass `node --check`.
- Import/execution guard (the risk Qodo flagged): importing the
  module returns the file list WITHOUT running the gate; `node
  scripts/verify.mjs`, absolute-path invocation from `/tmp`, and
  `npm run verify` all run the gate (exit 0). The flagged failure
  mode does not reproduce under any supported invocation.
- Full suite: `npm test` 21/21 pass; `npm run verify` green
  (repo HEAD `d8b526d`, 24 Nov). CI `verify` checks at PR head
  `2ff1a7b`: 3× success.

What the evidence establishes, and what it doesn't:
Establishes that the gate now covers change scripts, that a broken
change script fails the gate, and that the import/execution guard
behaves correctly under every supported invocation. It does not cover
the `annotations` review-data section, which was unavailable in this
session (MT-VALIDATION) — no annotation evidence either way.

Day 13 verification skill used, if relevant:
Yes — the Day 13 evidence-log-check approach: every check above was
run for real and recorded in
`evidence/runs/day-17-decision-check.json` (no generated narrative
accepted as proof).

## My conclusion

Accept behavior / request correction / need more information:
**Accept the behavior.**

Reasoning and remaining unknowns:
The T-007 decision is implemented exactly as the ticket specifies,
and the one risk Qodo raised (a silently skipped gate via the
import/execution split) was tested directly and does not reproduce.
Qodo's review of PR #4 at head `2ff1a7b`: 0 bugs, 0 rule violations,
0 requirement gaps. No correction needed; no missing information.
Remaining unknown: none for this decision (annotations section
unavailable, but it is not needed to judge this decision).

If more information is needed, the specific question and who can answer it:
N/A — no open question.

If corrected, fix commit, existing review/check results and session refresh:
N/A — no fix made.

Redacted Markdown/HTML excerpts or screenshots supporting the conclusion:
- Agent Session Review export (local HTML, 1053 KB):
  `day17/agent-session-review-export.html` in the repo.
- Session data: `~/.qodo/agent-session-review/sessions/20261124-123612-b29f/`
  (reopen with the session ID; the temporary local browser URL with
  its access key is NOT shared).
- Full check log: `evidence/runs/day-17-decision-check.json`.

Investigation COMPLETE or INCOMPLETE, with reason:
**COMPLETE** — the Agent Session Review investigation ran end to end
and reached a conclusion supported by code + test evidence.

If setup/access blocked me, stopping point and missing prerequisite (not a completed run):
Setup did NOT block the run in the end, but two transient blocks are
recorded honestly: Qodo CLI 2.7.0 had to be installed (it was not
present), and the first two collect attempts failed with
`codebase/read-review-data: invalid_token` right after login; the
third attempt collected the session completely. Login as
andibugil94@gmail.com (trial) worked; managed-review read access for
this repo worked.
