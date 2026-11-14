# Qodo Hackathon 2026 — 23 Daily Challenges

Source of truth for challenge *instructions* is the daily email (the
challenges page is JS-rendered and the full per-day text is not published
publicly). This file records what is **verified** from official sources vs
what is **inferred / pending the daily email**, and maps every challenge to
its evidence in this repo.

Official sources: rules — https://hackathon.qodo.ai/rules/ · challenges —
https://hackathon.qodo.ai/challenges/ · Luma —
https://luma.com/h9osu240 · registration email from info@qodo.ai,
14 Nov 2026 18:12 WIB.

Rules confirmed: **late starters may catch up** before the final cutoff;
missed days may be caught up; completing the challenges is the main judging
consideration; final submit = repo link + short write-up via the GitHub
Discussion link in the daily email; **final cutoff 3 Dec 2026 15:00 WIB**
(00:00 PST 3 Dec); weekly merch rounds close Sundays 23:59 CET
(8, 15, 22, 29 Nov); finale 30 Nov–2 Dec has no separate merch round.

## Week 1 — Build your first reviewed pull request (2–6 Nov)

| # | Date | Challenge (as known) | Status in this repo |
|---|---|---|---|
| Day 1 | Mon 2 Nov | **PICK. SHARE. VERIFY.** Pick the project, share the idea, verify via a first PR + Qodo review. *(Qodo Instagram @qodo_ai)* | ✅ Done locally. Project picked: Agent Factory + F1 telemetry demo (see `README.md`). Idea shared: repo README + this log. First PR: local git history (`scaffold` → `demo app` → `factory`). Qodo review: ⏳ pending Qodo account — pipeline stage wired (`src/factory/qodo.js`), local reviewer used, marked as fallback. |
| Day 2 | Tue 3 Nov | **WRITE. REVIEW. SHARE.** Write `AGENTS.md`: project description, setup + verify commands, 3–5 rules. *(Qodo Instagram)* | ✅ Done. `AGENTS.md` — description, setup, verify, 5 rules. Reviewed by the factory's plan-review stage (rules are machine-checked). |
| Day 3 | Wed 4 Nov | First implementation slice + PR. *(inferred from Week 1 theme "Build your first reviewed pull request"; exact wording pending daily email)* | ✅ Done. Demo app core: `src/demo/telemetry.js` + `render.js` produce a working dashboard (`apps/f1-telemetry/index.html`). |
| Day 4 | Thu 5 Nov | Automation: ticket "Ready to Build" → coding agent runs automatically. *(Qodo Instagram; listed under Week 2 in the source video, exact weekday unconfirmed)* | ✅ Done locally. `scripts/automation.mjs` watches `tickets/` and auto-runs the factory on new `ready` tickets — the local stand-in for Codex Automation + Linear. Real Linear/Codex wiring: ⏳ pending accounts. |
| Day 5 | Fri 6 Nov | First reviewed PR merged / Week 1 wrap-up. *(inferred; exact wording pending daily email)* | ✅ Done. Ticket T-001 ran end-to-end through the factory: reviewed, tested, verified, approved. Run record: `evidence/runs/`. |

## Week 2 — Set standards for your project (9–13 Nov)

| # | Date | Challenge (as known) | Status in this repo |
|---|---|---|---|
| Day 6 | Mon 9 Nov | **REVIEW A TICKET.** Review a ticket with Codebase Wisdom before building. *(Qodo Instagram)* | ✅ Done locally. The factory's plan-review stage reviews every ticket against `AGENTS.md` before implementing; Qodo Codebase Wisdom call is wired in `src/factory/qodo.js`. Real Qodo run: ⏳ pending account. |
| Day 7 | Tue 10 Nov | **PR Resolver** skill: bring Qodo review findings back to the coding agent for auto-fix. *(Qodo Instagram)* | ✅ Done locally. `src/factory/fixer.js` — the PR Resolver stage: applies known fixes (e.g. missing test) and re-verifies. Demonstrated on ticket T-002 (see evidence log). |
| Day 8 | Wed 11 Nov | Standards: review standards / Rule Miner. *(inferred from Week 2 theme; exact wording pending daily email)* | ✅ Done. `scripts/mine-rules.mjs` scans the codebase and proposes rules in AGENTS.md format (Rule Miner stand-in); findings recorded in `evidence/EVIDENCE.md`. Real Qodo Rule Miner: ⏳ pending account. |
| Day 9 | Thu 12 Nov | Standards applied to the demo app (tests / lint / review rules). *(inferred; exact wording pending daily email)* | ✅ Done. `npm run verify` gate + CI workflow (`.github/workflows/ci.yml`) enforce the standards on every change; demo app fully covered by `node:test`. |
| Day 10 | Fri 13 Nov | Week 2 wrap-up: standards documented + shared. *(inferred; exact wording pending daily email)* | ✅ Done. Standards documented in `AGENTS.md` + `docs/ARCHITECTURE.md`; this file is the shareable record. |

## Week 3 — Connect tools, agents and code review (16–20 Nov)

| # | Date | Challenge | Status |
|---|---|---|---|
| Day 11–15 | Mon 16 – Fri 20 Nov | Connect tools, agents and code review. Exact daily instructions arrive by email starting Mon 16 Nov. | ⏳ Not started. Factory already connects its own tools (ticket watcher, Qodo adapter, CI); W3 work begins when the Mon 16 Nov email lands. |

## Week 4 — Automate verification and approval or escalation (23–27 Nov)

| # | Date | Challenge | Status |
|---|---|---|---|
| Day 16–20 | Mon 23 – Fri 27 Nov | Automate verification and approval/escalation. Exact daily instructions arrive by email. | ⏳ Not started. Note: the factory's verify → approve/escalate stages already implement this theme end-to-end; W4 will harden them per the daily instructions. |

## Finale — Add finishing touches (30 Nov – 2 Dec)

| # | Date | Challenge | Status |
|---|---|---|---|
| Day 21–23 | Mon 30 Nov – Wed 2 Dec | Finishing touches + final submission. | ⏳ Not started. Final submit: repo link + write-up via the GitHub Discussion link from the daily email, before **3 Dec 2026 15:00 WIB**. |

## Honesty notes

- Items marked **inferred** are my best reconstruction from the weekly theme
  + the known neighbouring days. If a daily email contradicts them, the email
  wins and this file will be corrected.
- Nothing in this repo is presented as a Qodo review, a GitHub PR, or a
  Discussion submission unless it actually is one. Local stand-ins are
  labelled as such in the evidence log.
- Weekly merch rounds: W1 (2–8 Nov) and W2 (9–15 Nov) closed before
  registration (14 Nov) — not attainable. W3 (16–22 Nov) and W4 (23–29 Nov)
  are fully open; the final prizes (iPhone Duo / Mac Mini / Switch 2) are
  the main target.
