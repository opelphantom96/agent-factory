# Evidence Log — Qodo Hackathon 2026

**Project:** Agent Factory (autonomous pipeline) + F1 telemetry demo app.
**Repo:** `~/workspace/qodo-hackathon/agent-factory/` (local git repo; pushed
to https://github.com/opelphantom96/agent-factory, branch master).
**Registered:** 14 Nov 2026, email andibugil94@gmail.com (confirmation:
"You're in!", info@qodo.ai, 14 Nov 18:12 WIB).
**Status at last update:** 18 Nov 2026 ~23:10 WIB. 34/34 tests pass,
`npm run verify` green, 6/6 factory tickets APPROVED. Day 11 challenge
email arrived 16 Nov 19:04 WIB; the REAL Qodo before/after comparison is
done (see Week 3 below). Day 12 challenge email arrived 17 Nov 19:23 WIB;
the ticket-source check is done with a MIXED result (see Week 3 below).
Day 13 challenge email arrived 18 Nov 19:41 WIB; the evidence-log-check
skill is done (see Week 3 below). Qodo account signed in, repo connected
to Qodo.

## How to read this log

- ✅ **Done locally** — ran here, artifact linked, reproducible with the
  command shown.
- ⏳ **Pending user** — needs the user's Qodo account, GitHub account, or a
  daily email that has not arrived yet. The integration is wired; the run is
  not faked.
- 🔎 **Inferred** — challenge wording reconstructed from the weekly theme +
  neighbouring days; the daily email is authoritative and this log will be
  corrected if it disagrees.

## Week 1 — Build your first reviewed pull request

| Day | Challenge | Evidence |
|---|---|---|
| Day 1 (2 Nov) | PICK. SHARE. VERIFY. | ✅ Project picked: Agent Factory + F1 telemetry demo (`README.md`). Idea shared: this repo + this log. First reviewed PR: local git history — `scaffold` → `demo app` → `factory` → `tickets`. Qodo review of the first PR: ⏳ pending Qodo account (pipeline stage wired in `src/factory/qodo.js`; local reviewer ran, record marked "local fallback"). |
| Day 2 (3 Nov) | WRITE. REVIEW. SHARE. (AGENTS.md) | ✅ `AGENTS.md` — project description, setup + verify commands, 5 rules. Reviewed by the factory plan-review stage (rules machine-checked on every run, see run records). |
| Day 3 (4 Nov) 🔎 | First implementation slice + PR | ✅ Demo app core built: `src/demo/telemetry.js` + `render.js` → working dashboard `apps/f1-telemetry/index.html` (speed / throttle / gear charts + stats). Tests: `src/demo/telemetry.test.js` (6 tests). |
| Day 4 (5 Nov) 🔎 | Automation: ticket "Ready to Build" → agent runs | ✅ `scripts/automation.mjs` — watches `tickets/`, auto-runs the factory on `ready` tickets, updates status. Verified: scan after T-001–T-004 reports "no ready tickets". Real Linear/Codex wiring: ⏳ pending accounts. |
| Day 5 (6 Nov) 🔎 | First reviewed PR merged | ✅ Ticket T-001 ran end-to-end: spec → plan review → implement → code review → verify → **APPROVED**. Record: `evidence/runs/T-001-2026-11-14T11-20-36-333Z.json`. |

## Week 2 — Set standards for your project

| Day | Challenge | Evidence |
|---|---|---|
| Day 6 (9 Nov) | REVIEW A TICKET (Codebase Wisdom) | ✅ Every ticket is reviewed against `AGENTS.md` before implementing (plan-review stage, `src/factory/review.js`). Qodo Codebase Wisdom call: ⏳ pending account — integration point documented in `docs/ARCHITECTURE.md`. |
| Day 7 (10 Nov) | PR Resolver skill | ✅ Demonstrated for real through the pipeline on ticket T-004: code review flagged 1 blocker (`missing-test`); the PR Resolver generated the smoke test `src/demo/topspeed.test.js`, re-verified, ticket **APPROVED** with "1 finding auto-fixed". Record: `evidence/runs/T-004-2026-11-14T11-21-06-213Z.json`. T-004 intentionally shipped without a test to exercise this loop (stated in the ticket). |
| Day 8 (11 Nov) 🔎 | Standards / Rule Miner | ✅ `npm run mine-rules` (Rule Miner stand-in) scanned 14 source files on 14 Nov: 2 proposed rules — (1) keep `console.log` in the CLI layer only (11 occurrences, all intentional factory logging); (2) every module ships with a test file (8 factory/demo modules currently untested — noted as follow-up, does not block the demo). Real Qodo Rule Miner: ⏳ pending account. |
| Day 9 (12 Nov) 🔎 | Standards applied | ✅ `npm run verify` gate (syntax-check all sources + `node --test` + demo rebuild) green; CI workflow `.github/workflows/ci.yml` enforces it on every push/PR. |
| Day 10 (13 Nov) 🔎 | Week 2 wrap-up: standards documented + shared | ✅ Standards in `AGENTS.md` + `docs/ARCHITECTURE.md` + `docs/CHALLENGES.md`; this file is the shareable record. |

## Factory runs (all APPROVED)

| Ticket | Feature added to the demo | Evidence record |
|---|---|---|
| T-001 | DRS zones overlay (detect + shade + list) | `evidence/runs/T-001-2026-11-14T11-20-36-333Z.json` |
| T-002 | Lap comparison table (3 sectors + full lap vs reference lap) | `evidence/runs/T-002-2026-11-14T11-20-40-188Z.json` |
| T-003 | Colour legend | `evidence/runs/T-003-2026-11-14T11-20-42-638Z.json` |
| T-004 | Top-speed marker (PR Resolver demo — see Day 7) | `evidence/runs/T-004-2026-11-14T11-21-06-213Z.json` |
| T-005 | Day 11 custom review setup (`review/review-config.json`) | `evidence/runs/T-005-2026-11-17T01-28-38-499Z.json` |
| T-006 | Evidence-log-check skill, Day 13 (`skills/evidence-log-check/SKILL.md` + checker) | `evidence/runs/T-006-2026-11-18T16-06-44-799Z.json` |

## Week 3 — Connect tools, agents and code review

| Day | Challenge | Evidence |
|---|---|---|
| Day 11 (16 Nov) | **Make the reviewer yours** (email 16 Nov 19:04 WIB, Gmail id `1a1e43e3074e71e3`) | ✅ Custom setup: `review/review-config.json` — 4 product decisions (offline-first demo, zero runtime deps, intentional factory logging, clean dashboard output). Factory reviews with the custom profile by default (`src/factory/index.js`, ticket T-005 APPROVED). Local stand-in before/after on the SAME sample change: `evidence/runs/day-11-review-comparison.json` — original review: 1 finding (generic `external-url` blocker); customized review: 4 findings (`network-access` blocker with offline guidance, `console-log-demo` warning, `local-data-load` + `console-log-factory` infos). Feedback changed, display unchanged. **REAL Qodo comparison — DONE 17 Nov ~20:00 WIB on PR #1 (https://github.com/opelphantom96/agent-factory/pull/1, branch `day-11-real-comparison`, commit `744d419`, still open/unmerged): `evidence/runs/day-11-real-comparison.json` — default setup: 3 bug findings; custom setup (portal Custom instructions + `/agentic_review`): 4 bugs — same 3 unchanged + NEW "Demo timing loads print to the console" (Medium, rule 4 CLEAN DASHBOARD worked), nothing lost, factory `console.log` still unflagged (rule 3 held). Attribution caveat recorded honestly: the new finding cannot be proven to come from the portal instructions alone (repo config was also cited as evidence). Decision: **KEEP with ONE ADJUSTMENT to rule 1** — a relative local fetch is not a network violation, but fetch() from file:// is still a real limitation; say so and suggest inlining (applied in `review/review-config.json`, `.pr_agent.toml`, and the local reviewer). Setup now durable in the repo as `.pr_agent.toml` (PR-Agent reads repo config from the default branch). Tests: `src/factory/review-config.test.js` (7 tests). Discussion submission: ✅ SUBMITTED 17 Nov 18:30 WIB as opelphantom96 — comment https://github.com/orgs/qodo-hackathon/discussions/13#discussioncomment-19678255; real-comparison follow-up comment ✅ POSTED 17 Nov 20:11 WIB — https://github.com/orgs/qodo-hackathon/discussions/13#discussioncomment-19680610. |
| Day 12 (17 Nov) | **Give your factory the full picture** (email 17 Nov 19:23 WIB, Gmail id `1a1e975ea67a7447`) | ✅ DONE 17 Nov ~20:16 WIB — MIXED result, recorded honestly in `evidence/runs/day-12-ticket-source-check.json`. Requirement: offline-first (from ticket T-005 + `review/review-config.json`). Source given to Qodo: GitHub Issue #2 (https://github.com/opelphantom96/agent-factory/issues/2, created 17 Nov 20:14 WIB as opelphantom96), referenced in the PR #1 description (https://github.com/opelphantom96/agent-factory/pull/1, code unchanged, commit `744d419`). My own verification first (code inspection + Node behavior check with fetch mocked to throw): `loadLiveTiming()` rejects with no offline path (violates); relative local fetch satisfies the letter but `fetch()` itself fails from file://; the test never calls the loader; factory `console.log` is allowed. Qodo re-review (`/agentic_review` 20:15 WIB, updated ~20:16 WIB): **context level — YES**: Context sources lists "✅ Tickets: 🎫 Day 12: demo must work offline from file:// — no network access in demo code" linking to Issue #2, and a new "📎 Requirement gaps (0)" header appeared. **Finding level — NO**: the 4 findings are IDENTICAL to the Day 11 custom review (no new finding, no new inline comment); NONE cites Issue #2 or mentions "T-005". Finding 1 still flags the network fetch (Action required) but cites `review-config.json` + the prep record, not the Issue. Expectations only partly met (network fetch flagged as a blocker but without the Issue citation; relative local fetch not flagged as a network problem — finding 3 frames it as a file:// limitation, consistent with adjusted rule 1). Process change: check "Context sources / Tickets" for source access; do not assume findings cite a linked ticket just because it is listed; keep requirements in the repo config, because that is what findings actually cite. Submission: ✅ SUBMITTED 17 Nov 20:21 WIB as opelphantom96 — comment https://github.com/orgs/qodo-hackathon/discussions/14#discussioncomment-19680843 (verified live 18 Nov 08:24 WIB; the earlier "⏳ draft prepared" note was stale). |
| Day 13 (18 Nov) | **Teach your factory a new skill** (email 18 Nov 19:41 WIB, Gmail id `1a1eead8f073ebf8`) | ✅ DONE 18 Nov ~23:10 WIB — skill: `skills/evidence-log-check/SKILL.md` (AGENTS.md rule 4: every pipeline stage writes its result to `evidence/runs/`) + deterministic checker `scripts/evidence-log-check.mjs` (zero deps) + 13 tests (`scripts/evidence-log-check.test.js`). Ticket T-006 ran through the factory: APPROVED (record `evidence/runs/T-006-2026-11-18T16-06-44-799Z.json`; Qodo CLI unavailable locally — local fallback; real Qodo review on the PR, pending). Fresh-session trial (new subagent session, skill read first, invoked explicitly on the live log — 6 run records): first run FAIL (1 failure) — T-006 not yet mentioned in this log (`logged-in-evidence-md`); the check caught a real gap in the log itself. Refinements from the trial: (1) checker v1 wrongly demanded `ok` on every stage — real schema: `autoFix` records `{fixed, remaining}` (success = empty) and `codeReview.ok` is pre-fix, superseded by `afterFix.findings` (T-004); checker + skill fixed to match the real schema (first checker run on real history: FAIL 5; after fix: PASS 5); (2) skill wording: `[root]` is optional (defaults to repo root), step 4 lists six per-record checks plus the cross-check; (3) verdict line singular ("1 failure"). After the fixes + adding T-006 to this log, re-run: `EVIDENCE LOG: PASS (6 records, 0 failures)`. Trial evidence: `evidence/runs/day-13-fresh-session.json` (+ check reports `evidence-log-check-2026-11-18T16-07-11-549Z.json` FAIL and the re-run PASS report). Discussion #15 submission: prepared (comment text + links in the parent handoff); posting + verification via browser — parent step, PR + Qodo review likewise. |
| Day 14–15 (19–20 Nov) | Exact daily instructions arrive by email. | ⏳ Not started. Day 14 email expected 19 Nov (evening WIB). |

Final dashboard: `apps/f1-telemetry/index.html` — verified to contain DRS
zones, Lap comparison, Legend, and "TOP 328.3 km/h". Test suite: **34/34
pass** (`npm test`).

## Week 3–4 + finale (16 Nov – 2 Dec)

⏳ Week 3 started: Day 11 done for real (see above). Day 12 done — MIXED
ticket-source result (see above). Day 13 done — skill + fresh-session
trial + refinements (see above); Discussion #15 submission + PR + Qodo
review are browser steps (parent). Days 14–15 arrive by email, one per
weekday. The factory already implements the W4 theme
(verify → approve/escalate) end-to-end; W4 will harden them per the daily
instructions.

## Still needs the user

1. **Qodo product account** — ✅ DONE 17 Nov: signed in as
   andibugil94@gmail.com (TRIAL, 14 days), repo `agent-factory`
   connected (Qodo Code Review app installed, connection Healthy).
   This unlocked real Qodo reviews on PR #1.
2. **GitHub account + repo** — ✅ DONE 17 Nov: repo
   https://github.com/opelphantom96/agent-factory (public) created and
   pushed (master at 5609afa, PR #1 open for the Day 11 comparison,
   Issue #2 open for the Day 12 ticket-source check).
   The final submission needs a repo link — this is it.
3. **Daily email (next: Day 14, Thu 19 Nov)** — Day 11 arrived 16 Nov
   19:04 WIB and is done for real (see Week 3). Day 12 arrived 17 Nov
   19:23 WIB and is done — MIXED ticket-source result (see Week 3).
   Day 13 arrived 18 Nov 19:41 WIB and is done — skill + fresh-session
   trial (see Week 3); Discussion #15 submission + PR + Qodo review are
   browser steps (parent).
   Each email carries the next challenge instructions and the GitHub
   Discussion link for submitting it. The mailbox is checked daily
   ~08:17 WIB.
4. **Final submission** — repo link + short write-up via the GitHub
   Discussion link from the daily email, before **3 Dec 2026 15:00 WIB**.

## Weekly merch rounds

W1 (2–8 Nov) and W2 (9–15 Nov) closed before registration — not attainable.
W3 (16–22 Nov) and W4 (23–29 Nov) fully open. Final prizes: iPhone Duo /
Mac Mini / Switch 2 (shipping to Indonesia not guaranteed — equivalent
compensation promised by Qodo).
