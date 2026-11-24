# Evidence Log — Qodo Hackathon 2026

**Project:** Agent Factory (autonomous pipeline) + F1 telemetry demo app.
**Repo:** `~/workspace/qodo-hackathon/agent-factory/` (local git repo; pushed
to https://github.com/opelphantom96/agent-factory, branch master).
**Registered:** 14 Nov 2026, email andibugil94@gmail.com (confirmation:
"You're in!", info@qodo.ai, 14 Nov 18:12 WIB).
**Status at last update:** 20 Nov 2026 ~20:30 WIB (branch
`day-14-guard-fix`). 21/21 tests pass, `npm run verify` green, 7/7 factory
tickets APPROVED (T-001–T-005 on `master` plus T-007 on this branch;
T-006 lives on branch `day-13-evidence-log-skill`). Day 11 challenge
email arrived 16 Nov 19:04 WIB; the REAL Qodo before/after comparison is
done (see Week 3 below). Day 12 challenge email arrived 17 Nov 19:23 WIB;
the ticket-source check is done with a MIXED result (see Week 3 below).
Day 13 was done on branch `day-13-evidence-log-skill` (PR #3 open,
unmerged — see that branch). Day 14 challenge email arrived 20 Nov
19:00 WIB; the workflow part is INCOMPLETE (see Week 3 below — no Qodo
portal access). Qodo account signed in, repo connected to Qodo.

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
| T-007 | Day 14 gate fix: `npm run verify` now syntax-checks `tickets/changes/*.mjs` too (26 files gated) + `scripts/verify.test.js` | `evidence/runs/T-007-2026-11-20T13-27-15-878Z.json` |

## Week 3 — Connect tools, agents and code review

| Day | Challenge | Evidence |
|---|---|---|
| Day 11 (16 Nov) | **Make the reviewer yours** (email 16 Nov 19:04 WIB, Gmail id `1a1e43e3074e71e3`) | ✅ Custom setup: `review/review-config.json` — 4 product decisions (offline-first demo, zero runtime deps, intentional factory logging, clean dashboard output). Factory reviews with the custom profile by default (`src/factory/index.js`, ticket T-005 APPROVED). Local stand-in before/after on the SAME sample change: `evidence/runs/day-11-review-comparison.json` — original review: 1 finding (generic `external-url` blocker); customized review: 4 findings (`network-access` blocker with offline guidance, `console-log-demo` warning, `local-data-load` + `console-log-factory` infos). Feedback changed, display unchanged. **REAL Qodo comparison — DONE 17 Nov ~20:00 WIB on PR #1 (https://github.com/opelphantom96/agent-factory/pull/1, branch `day-11-real-comparison`, commit `744d419`, still open/unmerged): `evidence/runs/day-11-real-comparison.json` — default setup: 3 bug findings; custom setup (portal Custom instructions + `/agentic_review`): 4 bugs — same 3 unchanged + NEW "Demo timing loads print to the console" (Medium, rule 4 CLEAN DASHBOARD worked), nothing lost, factory `console.log` still unflagged (rule 3 held). Attribution caveat recorded honestly: the new finding cannot be proven to come from the portal instructions alone (repo config was also cited as evidence). Decision: **KEEP with ONE ADJUSTMENT to rule 1** — a relative local fetch is not a network violation, but fetch() from file:// is still a real limitation; say so and suggest inlining (applied in `review/review-config.json`, `.pr_agent.toml`, and the local reviewer). Setup now durable in the repo as `.pr_agent.toml` (PR-Agent reads repo config from the default branch). Tests: `src/factory/review-config.test.js` (7 tests). Discussion submission: ✅ SUBMITTED 17 Nov 18:30 WIB as opelphantom96 — comment https://github.com/orgs/qodo-hackathon/discussions/13#discussioncomment-19678255; real-comparison follow-up comment ✅ POSTED 17 Nov 20:11 WIB — https://github.com/orgs/qodo-hackathon/discussions/13#discussioncomment-19680610. |
| Day 12 (17 Nov) | **Give your factory the full picture** (email 17 Nov 19:23 WIB, Gmail id `1a1e975ea67a7447`) | ✅ DONE 17 Nov ~20:16 WIB — MIXED result, recorded honestly in `evidence/runs/day-12-ticket-source-check.json`. Requirement: offline-first (from ticket T-005 + `review/review-config.json`). Source given to Qodo: GitHub Issue #2 (https://github.com/opelphantom96/agent-factory/issues/2, created 17 Nov 20:14 WIB as opelphantom96), referenced in the PR #1 description (https://github.com/opelphantom96/agent-factory/pull/1, code unchanged, commit `744d419`). My own verification first (code inspection + Node behavior check with fetch mocked to throw): `loadLiveTiming()` rejects with no offline path (violates); relative local fetch satisfies the letter but `fetch()` itself fails from file://; the test never calls the loader; factory `console.log` is allowed. Qodo re-review (`/agentic_review` 20:15 WIB, updated ~20:16 WIB): **context level — YES**: Context sources lists "✅ Tickets: 🎫 Day 12: demo must work offline from file:// — no network access in demo code" linking to Issue #2, and a new "📎 Requirement gaps (0)" header appeared. **Finding level — NO**: the 4 findings are IDENTICAL to the Day 11 custom review (no new finding, no new inline comment); NONE cites Issue #2 or mentions "T-005". Finding 1 still flags the network fetch (Action required) but cites `review-config.json` + the prep record, not the Issue. Expectations only partly met (network fetch flagged as a blocker but without the Issue citation; relative local fetch not flagged as a network problem — finding 3 frames it as a file:// limitation, consistent with adjusted rule 1). Process change: check "Context sources / Tickets" for source access; do not assume findings cite a linked ticket just because it is listed; keep requirements in the repo config, because that is what findings actually cite. Submission: ✅ SUBMITTED 17 Nov 20:21 WIB as opelphantom96 — comment https://github.com/orgs/qodo-hackathon/discussions/14#discussioncomment-19680843 (verified live 18 Nov 08:24 WIB; the earlier "⏳ draft prepared" note was stale). |
| Day 13 (18 Nov) | **Teach your factory a new skill** (email 18 Nov 19:41 WIB) | ✅ DONE on branch `day-13-evidence-log-skill` (PR #3 open, unmerged — full record on that branch, incl. Discussion #15 submission). Not on this branch: `master` here predates Day 13. |
| Day 14 (19 Nov) | **Turn your quality gate into a workflow** (email 20 Nov 19:00 WIB, Gmail id `1a1f8d423440091f`) | ✅ **COMPLETE 20 Nov 22:38 WIB.** Saved gate read + fixed: ticket T-007 APPROVED — `scripts/verify.mjs` exports `collectJsFiles()` (26 files gated, incl. all 6 change scripts) + `scripts/verify.test.js` (2 tests); 21/21 tests pass, `npm run verify` green. Workflow `agent-factory-quality-gate` (zero Medium+ findings → Add the Qodo approved label, repo `opelphantom96/agent-factory`) created and ACTIVE in the Qodo portal 21:34 WIB + guard (`scripts/**` always needs a person) saved — the portal opened via the browser's saved Google session, superseding the earlier "no portal access" blocker. Both test PRs observed live, predictions fulfilled: PR #5 got the "Qodo approved" label 22:19 WIB after a clean review (0 findings); PR #4 clean review 22:29 WIB, NO label (guard blocks `scripts/**`). Policy: `review/workflow-day-14.md`. Submission: ✅ Discussion #16 comment https://github.com/orgs/qodo-hackathon/discussions/16#discussioncomment-19777864 (opelphantom96, 22:38 WIB). |
| Day 15 (20 Nov) | **Show your factory** (email 20 Nov 19:00 WIB, Gmail id `1a1f8d48688ab267`) | ✅ **SUBMITTED 20 Nov.** X/Twitter thread, @CrissNoo12 (5 posts, all ≤280 chars, @QodoAI tagged in post 1) + diagram `day15/factory-diagram.png` (1600×900, 8-stage flow); draft: `day15/day15-draft.md`. Post 1 verified LIVE: https://x.com/CrissNoo12/status/2123771284001828977. Submission: ✅ Discussion #17 comment https://github.com/orgs/qodo-hackathon/discussions/17#discussioncomment-19775063 (opelphantom96). ⚠️ Posts 2–5 UNVERIFIED — confirmation still waiting on the user. |
| Day 16 (23 Nov) | **Scan your repo with Arnica** (email 23 Nov 19:04 WIB, Gmail id `1a2084acce60ed28`) | ⚠️ **INCOMPLETE — blocked before any scan.** Arnica GitHub guide (docs.arnica.io, verified 23 Nov): "Arnica supports an integration with organization accounts only. It means that integrations with personal accounts are prohibited." Installation step 4 ("Select the applicable organization") cannot be completed for a personal repo; "Only organization owners are able to install GitHub Apps." Repo: personal account opelphantom96/agent-factory, branch master, HEAD 2ff1a7b. No Arnica scan ran, so there are no findings to investigate and nothing was fabricated. Local diligence instead (23 Nov): `npm test` 21/21 pass, `npm run verify` green (tests OK + demo rebuild OK), secret-pattern grep over the repo clean (only hits are the factory's own `SECRET_PATTERNS` detector in `src/factory/review.js` and the words "secrets in code" in ticket T-005/config), zero runtime dependencies, CI pins actions/checkout@v4 + setup-node@v4. Diagram: `day15/factory-diagram.png` updated with an Arnica step marked BLOCKED/planned (script `day15/make-diagram.py`). Submission: Discussion #18 draft prepared (template fields filled, status INCOMPLETE, exact blocker + docs quote) — NOT posted yet, awaiting user approval. Unblock path: move the repo into a GitHub organization the user owns, or an Arnica exception for personal accounts. **Update 24 Nov:** a participant's public post in Discussion #18 (CamDuncalfe, read 24 Nov) proves a better unblock — create a FREE GitHub org, push a PRIVATE copy of `main` at the same commit into it, install Arnica on the org and scan the copy; the entry repo stays personal. Their scan completed 23 Nov (3 findings: 2 Medium actions-artipacked + 1 Low integrity hash), both Mediums fixed, Arnica auto-resolved them. Needs the user's GitHub account (org creation + push) — not done from here. Re-verified 24 Nov ~08:25 WIB at HEAD 963c70e: `npm test` 21/21 pass, `npm run verify` green (tests OK + demo rebuild OK). |

Final dashboard: `apps/f1-telemetry/index.html` — verified to contain DRS
zones, Lap comparison, Legend, and "TOP 328.3 km/h". Test suite: **21/21
pass** (`npm test`) on this branch.

## Week 3–4 + finale (16 Nov – 2 Dec)

⏳ Week 3 started: Day 11 done for real (see above). Day 12 done — MIXED
ticket-source result (see above). Day 13 done on its branch (see above).
Day 14 arrived 20 Nov 19:00 WIB — COMPLETE 20 Nov 22:38 WIB (workflow live,
guard proven on PR #5 / PR #4; see above). Day 15 arrived 20 Nov 19:00 WIB —
SUBMITTED the same evening (post 1 live, Discussion #17; posts 2–5
unverified). The factory already implements the W4 theme
(verify → approve/escalate) end-to-end; W4 will harden them per the daily
instructions. Next challenge email: Day 18, Wed 25 Nov (~19:00 WIB).
Day 16 arrived 23 Nov 19:04 WIB — INCOMPLETE, blocked (Arnica org-only;
see above). Watch first saw the Day 16 email 24 Nov 08:17 WIB; re-verified
green the same morning (21/21, verify OK, HEAD 963c70e). Org-copy unblock
found in Discussion #18 (see above) — needs the user's GitHub account.
Day 17 arrived 24 Nov 19:01 WIB — COMPLETE the same evening (Agent
Session Review for real, session 20261124-123612-b29f, PR #4 / T-007,
conclusion ACCEPT; Qodo CLI 2.7.0 installed, skill
qodo-agent-session-review 1.0.1; Discussion #19 draft ready, not yet
posted — needs the user's GitHub account). Full record:
evidence/runs/day-17-decision-check.json + day17/.

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
3. **Daily email (next: Day 18, Wed 25 Nov)** — Day 11 arrived 16 Nov
   19:04 WIB and is done for real (see Week 3). Day 12 arrived 17 Nov
   19:23 WIB and is done — MIXED ticket-source result (see Week 3).
   Day 13 arrived 18 Nov 19:41 WIB (done on its branch). Day 14 arrived
   20 Nov 19:00 WIB — COMPLETE 20 Nov 22:38 WIB (see Week 3). Day 15
   arrived 20 Nov 19:00 WIB — SUBMITTED 20 Nov (post 1 live, Discussion
   #17; posts 2–5 unverified, confirmation still waiting on the user).
   Day 16 arrived 23 Nov 19:04 WIB — INCOMPLETE, blocked (Arnica
   org-only; Discussion #18 draft ready, not yet posted).
   Day 17 arrived 24 Nov 19:01 WIB — COMPLETE 24 Nov ~19:40 WIB
   (Agent Session Review, PR #4 / T-007, conclusion ACCEPT;
   Discussion #19 draft ready, not yet posted).
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
