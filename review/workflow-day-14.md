# Day 14 — Turn your quality gate into a workflow

Challenge email: Filip Hric at Qodo, 20 Nov 2026 19:00 WIB (Gmail id `1a1f8d423440091f`).
Status: **INCOMPLETE — honestly, per the email's own rule.** The workflow and
guard below were NOT created in the Qodo portal, because no portal access is
available to the agent that prepared this (see "Blocker"). Everything else —
the saved gate, the intended policy, and both test PRs — is real and ready.

## 1. Saved gate (Day 9, read first)

The factory's quality gate, as saved in this repo:

- `npm run verify` (`scripts/verify.mjs`): syntax-check every JS source file,
  run all tests (`node --test`), rebuild the demo dashboard. Exit 0 only when
  everything is green. Enforced on every push/PR by `.github/workflows/ci.yml`.
- Day 14 fix (ticket T-007, APPROVED): the gate used to syntax-check only
  `src/` and `scripts/` — ticket change scripts (`tickets/changes/*.mjs`,
  executable code the factory runs) escaped it. `collectJsFiles()` now
  includes them: 26 files gated, all 6 change scripts checked. Tests:
  `scripts/verify.test.js` (2 tests). Full suite 21/21 pass on this branch.
- Review profile (Day 11, `review/review-config.json` + `.pr_agent.toml`):
  offline-first demo, zero runtime deps, intentional factory logging, clean
  dashboard output. The factory reviews with the custom profile by default.
- Low findings stay visible: the gate blocks on Medium+ (workflow condition
  below) and on any factory `blocker`; Low/info findings are shown for human
  judgment, never auto-hidden.

## 2. Intended workflow (NOT created — see Blocker)

To be created in the Qodo portal under **Workflows → New workflow**
(portal admin required; guide: "Set up workflows to automate pull request
approvals", docs.qodo.ai):

| Field | Value |
|---|---|
| Name | `agent-factory-quality-gate` |
| Repository scope | `opelphantom96/agent-factory` (this repo only) |
| Conditions (ALL must hold) | Completed Qodo review with **zero findings rated Medium or higher, across all categories and finding types**; Low findings may remain (visible for judgment) |
| Action | **Add the Qodo approved label** (the label only — NOT Auto approve; the human still decides on Low findings and merging) |
| Status on save | Active (new workflows are active by default) |

**In plain words** (as the portal shows it before saving): "When Qodo finishes
reviewing a pull request in agent-factory and finds nothing rated Medium or
higher, add the Qodo approved label. Pull requests touching the guarded path
never get the label, even when clean."

## 3. Intended approval guard (NOT created — see Blocker)

To be created in the portal under **Workflows → Approval guards**
(inspect existing workspace-wide guards first and preserve them; none were
visible to the agent — the portal was never opened):

| Field | Value |
|---|---|
| Repository | `opelphantom96/agent-factory` |
| Guarded path | `scripts/**` |
| Reason | The factory's deterministic checkers and gate scripts are trust-critical: a broken checker could green-light bad evidence. Every change under `scripts/` needs a person, even when Qodo finds nothing. (This is the guide's own example path.) |

Guards take precedence over workflows: a guarded PR never gets the label and
never gets automatic approval, even if it meets every workflow condition.

## 4. Test PRs — predicted vs observed

Two real, useful PRs, both branched from `master` (2e17227). **Not yet
opened on GitHub** — opening a PR needs the GitHub web UI or API; neither is
available to the agent that prepared this. Branch names + PR bodies are ready
in `~/workspace/qodo-hackathon/day-14-discussion-comment.md`.

### PR A — INSIDE the protected path (branch `day-14-guard-fix`)

- Change: ticket T-007, factory **APPROVED** — close the Day 9 gate hole:
  `scripts/verify.mjs` exports `collectJsFiles()` (now includes
  `tickets/changes/*.mjs`, 26 files gated) + `scripts/verify.test.js`
  (2 coverage tests). Local evidence: `evidence/runs/T-007-2026-11-20T13-27-15-878Z.json`.
- Files: `scripts/verify.mjs`, `scripts/verify.test.js` (+ ticket, change
  script, evidence record, Day 14 docs).
- **Predicted:** Qodo reviews it; whatever the findings, **no `Qodo approved`
  label** — the `scripts/**` guard blocks it even if the review is clean.
- **Observed:** PENDING — PR not yet opened; to be filled in after the PR
  exists and the Qodo review completes.

### PR B — OUTSIDE the protected path (branch `day-14-braking-zones`)

- Change: ticket T-008, factory **APPROVED** — braking-zones feature for the
  F1 demo: `detectBrakingZones()` + shaded bands + section in
  `src/demo/features.js`, test `src/demo/braking.test.js`. Local evidence:
  `evidence/runs/T-008-*.json` (on that branch).
- Files: `src/demo/features.js`, `src/demo/braking.test.js` (+ ticket, change
  script, evidence record). Nothing under `scripts/`.
- **Predicted:** label-eligible — IF the completed Qodo review has zero
  Medium+ findings and no other guard applies, the workflow adds the
  `Qodo approved` label. If the review finds Medium+ findings, no label
  until they are fixed (without weakening the gate).
- **Observed:** PENDING — PR not yet opened; to be filled in after the PR
  exists and the Qodo review completes.

### What to check after the PRs are opened

- Actual labels on each PR (PR A: none expected; PR B: label expected only
  if clean).
- Qodo review findings per PR (any Medium+ on PR B must be investigated and
  fixed without weakening the gate).
- **PR Triage** workflow activity in the portal (which PRs Qodo acted on).

## 5. Blocker — why this is INCOMPLETE

1. **No Qodo portal access for this agent.** Creating a workflow or a guard
   needs a portal admin signed in at app.qodo.ai. The Qodo account
   (andibugil94@gmail.com, TRIAL) is the user's; no portal credentials, API
   key, or session are available to the agent that prepared this work, and
   the sign-in magic link in Gmail is protected and cannot be copied or
   forwarded by the agent. The portal was never opened, so existing
   workspace-wide guards could not even be inspected.
2. **No GitHub write access for this agent.** `gh` is not authenticated and
   there is no browser in this session, so the two PRs could not be opened
   and the Discussion comment could not be posted. Branches are pushed and
   ready; PR creation + the comment are exact handoff steps (see the
   discussion draft).

Per the Day 14 email: "Workflow access for hackathon trial participants
hasn't been confirmed. If access blocks you, share your intended policy and
the blocker, and mark the challenge INCOMPLETE. Don't report it as
configured or tested." — That is what this file does. Nothing above is
presented as configured or tested in the portal.

## 6. What unblocks completion

1. User (or an agent with the user's login) opens app.qodo.ai → Workflows,
   inspects existing guards, creates the workflow + guard exactly as in
   sections 2–3, and confirms whether the trial account can see the
   Workflows page at all.
2. Open PR A (`day-14-guard-fix` → `master`) and PR B
   (`day-14-braking-zones` → `master`) on GitHub; wait for the Qodo reviews;
   record labels + findings + PR Triage activity in section 4.
3. Post the Day 14 Discussion comment (draft:
   `~/workspace/qodo-hackathon/day-14-discussion-comment.md`) with the
   observed results, and flip this file + `docs/CHALLENGES.md` to complete
   only when the workflow is really live and both PRs are observed.

## Re-review trigger note (20 Nov 2026, 22:28 WIB)

Reopening PR #4 twice (22:05 and 22:21–22:22 WIB) produced no new Qodo
review within 3–5 minutes, unlike PR #5, where each reopen followed a new
commit and a fresh review completed in ~2 minutes. Hypothesis: Qodo
re-reviews a reopened PR only when its head changed. This docs-only commit
(no code, no `scripts/**` change) is pushed solely to give the PR a new head
and test that hypothesis. The guard test itself is unchanged — the branch
still touches `scripts/verify.mjs`, so a clean review must still get no
label.
