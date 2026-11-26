# Qodo Hackathon — Day 18: PREP (not posted, not pushed)

**Status: PREPARATION ONLY — 25 Nov 2026 ~20:40 WIB. Nothing pushed, no PR opened, nothing posted to GitHub.**

- Challenge email: Filip Hric at Qodo, 25 Nov 2026 19:21 WIB (Gmail id `1a212a74f24e2b89`) — "Day 18: Turn a red build into useful feedback"
- Task (from the email): (1) comment `/checks "<failed Actions job URL>"` on an existing PR where Qodo is available, using one real failed GitHub Actions job; (2) verify Qodo's feedback against the source logs, hand job URL + commit + feedback + logs to the coding agent for one diagnosis; (3) apply the fix or rerun, record the follow-up run. Share results via the email's "Share your Day 18 results" link (Discussion number NOT verified — Day 17 was #19, Day 16 #18, so Day 18 is probably #20; verify before posting).
- Final deadline: 3 Dec 2026 15:00 WIB. 14/23 passed so far; Day 17 posted + verified 24 Nov 21:07 WIB (Discussion #19, comment 19859639).

## Verified finding 1 — there is NO failed CI job to use yet

- Checked 25 Nov ~20:35 WIB via the public GitHub API for opelphantom96/agent-factory: **28/28 workflow runs, all `conclusion: success`, zero `failure`**. Latest run #28 (commit e11dab7, 24 Nov 20:47 WIB). The email forbids planting broken code, so the `/checks` step cannot run until a real red build exists.

## Verified finding 2 — the T-010 bug is real, and a real red build is one push away

- Ticket `tickets/T-010-drs-measurement-audit.json` (status: draft): `detectDrsZones` (src/demo/features.js) measures first-to-last sample against the 250 m threshold — the same pattern Qodo flagged in `detectBrakingZones` and fixed in T-009 (add one SAMPLE_STEP_M, clamp end to LAP_LENGTH_M).
- Empirical check 25 Nov ~20:38 WIB (node, SAMPLE_STEP_M = 10):
  - 25 fast samples = 250 m coverage, 240 m span → `[]` (MISSED — bug confirmed)
  - 26 fast samples = 260 m coverage, 250 m span → detected `[{startM:1000,endM:1250}]`
  - 24 fast samples = 240 m coverage → `[]` (correct)
- Baseline before the new test: `npm test` 46 pass / 0 fail.

## Prepared work — failing boundary test already in the working tree (UNCOMMITTED)

- File: `src/demo/drs.test.js` (+17 lines, `git status` shows only this file modified).
- Two tests added, mirroring the T-009 braking boundary test style:
  - "DRS zone of exactly 250 m coverage is detected (25 samples x 10 m)" — expects 1 zone, startM 1000, endM 1250 (the endM the T-009-style fix would produce).
  - "DRS run of 240 m coverage is not detected (24 samples x 10 m)" — guards against overcorrection.
- Local result 25 Nov ~20:40 WIB: **47 pass / 1 fail — only the new 250 m test fails** (`AssertionError: expected one DRS zone for 25 samples covering 250 m`, actual 0, expected 1). The 240 m test passes. This is a genuine test-first failure (factory rule 1: a test that fails before the change and passes after it), not planted broken code.

## Exact next steps for the main agent (needs user decision / GitHub session)

1. Approve pushing the test to a new branch (suggested: `day-18-drs-boundary`) and opening a PR against master — CI will go red on the new test. That red run is the real failed job Day 18 needs.
2. Take the failed job URL (`/actions/runs/.../job/...`), comment `/checks "<job URL>"` on the PR (needs the opelphantom96 GitHub session — same gate as Day 17 posting), save Qodo's feedback + the source logs at that commit.
3. Hand job URL + failed commit + Qodo feedback + verified logs to the coding agent; diagnosis should confirm the one-step undercount and the T-009-style fix (end = last + SAMPLE_STEP_M, clamped to LAP_LENGTH_M = 5412).
4. Apply the fix to `detectDrsZones`, re-derive the seed-42 DRS zones, push, record the follow-up run (expect green), get Qodo review, then post the Day 18 Discussion from the user's account.
5. Do NOT weaken any check to force green (factory AGENTS.md rule 5).

## What is NOT done / unknown

- No branch, PR, `/checks` comment, or Discussion post exists yet.
- Qodo CLI availability for the feedback step was proven on Day 17 (Qodo CLI 2.7.0 + skill `qodo-agent-session-review` 1.0.1) — re-verify before use.
- Discussion number for Day 18 is unverified (probably #20).
