# Mobile operational workflows — 20/10/2026

State: READY_FOR_CODEX_REVIEW. Implementer: Codex; self-verification only, no independent review or approval claimed.

Branch `feat/mobile-operational-workflows`, from freshly fetched origin/dev a041f3b. P06 assigned picking/actual dispatch, P07 blind counts with versioned commands/snapshot/recounts, P08 notifications and safe document navigation. Backend implementation is in `SSWMS-Backend-Mobile` branch `fix/mobile-operational-command-safety`; original checkouts preserved.

29 selected mobile tests, TypeScript and changed-scope lint pass. Full Expo lint retains only the existing use-color-scheme.web.ts:11 error. Actual RN Web routes tested with mock HTTP and RAM SecureStore at390×844/1280×900; live API/SQL evidence is separate, with actual mobile response schemas. Native Android/camera/images/SecureStore/lifecycle and live SignalR delivery pending. Temporary QA entry removed.

Canonical UC enumeration unavailable; no full mobile/121UC completion claim. Transfer/relocation/returns, cancellation after picking and additional required UCs remain to map/implement. Damage disposition/destruction/repair/supplier return after acceptance excluded by explicit user scope. No new commit/push/PR/Jira. User requested a checkpoint for review after autonomous implementation.

Review/evidence: `../../outputs/workflow/modules/mobile-rollout/p06-p08-summary.md`, `p06-p08-evidence.json`, `checkpoint-operational.json`. Preserve historic checkpoints; do not rerun old capture scripts.


## 2026-10-20 — dev synchronization (self verification)

User authorized commit/push, then requested latest dev with dev taking precedence at conflicts. Preserved dev count progress, batch entry endpoint and recount state gate, plus mobile version/idempotency and snapshot checks. Dev notification preview hook/API is preserved; the detailed operational screen uses a separate hook/API. Conditional RowVersion DDL supports both migration histories; no migration applied during this synchronization.

Prior runtime/test evidence predates this integration and is not a pass for the merged source. Integration scope: TypeScript, focused ESLint, API/test-project compilation; no test execution, native UI, live API or migration application. The dev recount gate allows Submitted/Completed only: a stale active count requires cancellation/recreation via the authorized management workflow, not the previous active-state recount path. Review state remains READY_FOR_CODEX_REVIEW.
