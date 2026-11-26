# Qodo Hackathon — Day 18: Turn a red build into useful feedback

**Status: DRAFT — NOT POSTED. Needs the user's GitHub account (opelphantom96) to post.**

- Challenge email: Filip Hric at Qodo, 25 Nov 2026 19:21 WIB
  (Gmail id `1a212a74f24e2b89`) — "Day 18: Turn a red build into useful feedback"
- Discussion: https://github.com/orgs/qodo-hackathon/discussions/20
  ("Day 18: Turn a red build into useful feedback" — verified live 26 Nov 08:19 WIB)
- Repo: https://github.com/opelphantom96/agent-factory (public, personal account)
- Outcome: **COMPLETE 25 Nov ~21:00 WIB.** One real failed job, Qodo
  feedback verified against source, one diagnosis, one fix, follow-up
  runs green, Qodo re-review 0 bugs. PR #6 still open (not merged);
  this Discussion post is the only remaining step.

## Failed job

Project/repository and PR URL:
https://github.com/opelphantom96/agent-factory/pull/6
("test: DRS zone of exactly 250 m coverage is detected (T-010)")

Original failed Actions job URL, attempt, and commit:
https://github.com/opelphantom96/agent-factory/actions/runs/45627768914/job/139252440655,
attempt 1, commit `0381cf9` (branch `day-18-drs-boundary`, from master `e11dab7`).

Failed stage and test/job name: Job `verify`, step `npm test`.
Test: "DRS zone of exactly 250 m coverage is detected (25 samples x 10 m)"
in `src/demo/drs.test.js` — 25 fast samples covering 250 m produced no DRS
zone. Local reproduction on the identical commit: `npm test` 47 pass / 1 fail,
only that test fails (`AssertionError: expected one DRS zone for 25 samples
covering 250 m`, actual 0, expected 1).

Relevant source log excerpt (local reproduction, same commit — the CI raw
log download is auth-gated, GitHub API returns 403 without a token, so the
failing test name could not be read verbatim from the CI log; the commit
changes ONLY the test file, and the local run on that commit fails on
exactly this one test):

```
not ok - DRS zone of exactly 250 m coverage is detected (25 samples x 10 m)
  AssertionError: expected one DRS zone for 25 samples covering 250 m
  actual: 0, expected: 1
# pass 47
# fail 1
```

## Qodo feedback and verification

Qodo CI failure feedback link or redacted excerpt: I commented
`/checks "<failed job URL>"` on PR #6 (comment 7164424483), but Qodo
replied that **the `/checks` command was deprecated on 1 Oct 2026 and is
no longer available** (comment 7164428924, pointing to
https://docs.qodo.ai/sunsetting-legacy-v1-commands). Instead Qodo
auto-posted a PR Summary (7164429047) and a Code Review (7164434888,
review 6058865965) with 2 findings — that review is the feedback worked
with here. Verbatim copy saved in the repo: `day18/qodo-feedback-pr6.md`.

Finding 1 (Medium, Reliability): the new test asserts a 250 m DRS zone
that `detectDrsZones` (`src/demo/features.js:20-33`) cannot yet produce,
because it measures `end - start` from first to last sample (240 m for
25 samples) and drops the zone — so `npm run verify` stays red until the
fix lands. Recommended fix: (a) move/skip the test, or (b) land the
`detectDrsZones` fix in the same PR, mirroring the T-009 fix.

Finding 2 (Low, Maintainability): the comment block above the new tests
still says "DRAFT — not pushed yet" although the commit is on an open PR.

What matched the source logs: both findings. Finding 1's evidence
reproduces exactly: 25 samples at 1000–1240 m, `end = 1240`,
`1240 - 1000 = 240 >= 250` is false, zone dropped — confirmed by running
the same code locally at commit `0381cf9`. Finding 2 matches the
committed text at `src/demo/drs.test.js:24-28`.

Any mismatch, missing context, or unproven cause: no mismatch in either
finding. One gap: the CI raw log itself was never read (auth-gated 403),
so the failing test was identified by local reproduction on the identical
commit, not by the CI log text. The identification is airtight — the
commit touches only `src/demo/drs.test.js` and that commit fails locally
on exactly one test — but it is reproduction, not a log quote, and it is
recorded as such.

Evidence passed to my coding agent: both job URLs, the failed commit,
Qodo's two findings (verbatim), the local reproduction log, and my notes
on what the CI log does and doesn't show.

Coding agent diagnosis and supporting evidence: **one cause — the
one-step undercount.** `detectDrsZones` measures first-to-last sample
span instead of full coverage, the same pattern Qodo flagged in
`detectBrakingZones` and fixed in T-009. Justified next step: mirror the
T-009 fix (`end = min(last sample distance + SAMPLE_STEP_M,
LAP_LENGTH_M = 5412)`, compare covered length against 250). Qodo's option
(a) (move/skip the test) was rejected — the test is a genuine test-first
failure (factory rule 1: a test that fails before the change and passes
after it), not planted broken code; option (b) was taken. Seed-42 DRS
zones re-derived before the fix: `[{0,340},{1370,1630}]` — no pinned
expectation existed in the repo, so the values are recorded here.

## Follow-up run

Next step taken and why (fix, rerun, or no code change): a code fix —
the T-009-style measurement fix in `detectDrsZones`, plus the stale
"DRAFT" comment reworded. No check was weakened (factory rule 5).

Changed commit: `358bbd4` — "fix: count full DRS coverage incl. last
sample step (T-010)" (3 files, +12/−5: `src/demo/features.js`,
`src/demo/drs.test.js`, regenerated `apps/f1-telemetry/index.html`).
Seed-42 zones after the fix: `[{0,350},{1370,1640}]` — same 2 zones,
true ends (+10 m each); no zone gained or lost.

Relevant checks and Qodo review for the code fix: local `npm test`
**48 pass / 0 fail** (46 baseline + 2 new T-010 tests), `npm run verify`
green (syntax OK, tests 48/48, demo rebuild OK), re-verified 26 Nov
08:18 WIB at HEAD `358bbd4`. Qodo re-reviewed PR #6 at the fix commit:
**0 bugs, 0 rule violations, 0 requirement gaps**, both findings marked
✓ Resolved (resolving commit `358bbd4`) — verified live on the PR page
26 Nov 08:19 WIB.

Subsequent job URL, attempt, commit, and actual result:
- https://github.com/opelphantom96/agent-factory/actions/runs/45628730038
  (pull_request), attempt 1, commit `358bbd4` — **success** (job `verify`: success).
- https://github.com/opelphantom96/agent-factory/actions/runs/45628721403
  (push), attempt 1, commit `358bbd4` — **success** (job `verify`: success).

What the subsequent logs show and what remains unresolved: both
follow-up runs green on the same commit that was red before; the local
gates agree (48/48). Nothing remains unresolved on the diagnosis — the
fix is verified by test, CI, and Qodo review. Still open: PR #6 is not
merged yet, and the CI raw log was never read verbatim (see above).

Status (COMPLETE or INCOMPLETE) and reason: **COMPLETE** — one real
failed job, Qodo feedback checked against source, one diagnosis, one
supported fix, follow-up runs green with Qodo review clean. The
`/checks` command itself is deprecated, so the feedback came from Qodo's
auto review instead; that substitution is recorded, not hidden.

If blocked, what was missing and where I stopped: not blocked. The two
honest caveats are the deprecated `/checks` command (worked around via
the auto review) and the auth-gated CI raw log (worked around via local
reproduction on the identical commit).
