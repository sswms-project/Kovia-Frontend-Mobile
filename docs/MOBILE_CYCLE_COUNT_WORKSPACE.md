# Staff cycle count workspace — 2026-10-30

Implemented on mobile `feat/huytv` after comparison with BE CycleCount handlers/contracts and responsive web CycleCountItemCards, CycleCountItemsTable and CycleCountScanDialog. No BE/web changes or assignment/stock writes during validation.

Flow: choose/scan position → scan product or manually choose product/lot/quality → record actual total and damaged subset → explicit review/confirmation → continue at the same position → submit all completed lines for manager review.

- Recognizes slot/rack QR, custom barcode and composite location labels using metadata from CycleCountItemResponse. Optional added metadata tolerates older API responses without inventing rack IDs. Internal default-slot sentinel is never a scan candidate or displayed location.
- A location label matching several positions is rejected. Multiple lots/qualities require explicit selection. Scanning only selects a line or increments local counts; it never sends a warehouse command.
- Position selection persists through successful single-line saves/refetches, scoped by warehouse/account/permission context and recount round. Fresh BE state gates every write and excludes already-counted rows.
- Quantity editor provides − / input / + and optional increment-per-product-scan. Zero is valid. Damaged quantity remains part of total, not an additional quantity. Evidence/reason is shown only for positive damage; up to three pictures and local removal of newly uploaded evidence are supported. Removing a picture from the form does not delete server evidence.
- Single-line saves retain existing command IDs, expectedVersion, durable draft/unknown-result guards, blind-count protection and recount rules. Mobile keeps explicit review before saving, rather than implementing speculative batch persistence.
- Staff never directly adjusts inventory. Submission and manager completion remain separate from approved stock adjustment.

Validation: actual source logic/component tests for QR, source/product sequence, wrong/ambiguous codes, retaining location, increment mode, zero and evidence controls. RN Web SSR fixtures of the actual editor inspected at 390×844 and 320×740 in Edge via Playwright; APIs/camera/native interaction stubbed, icons replaced for preview. Screenshot/renderer artifacts are in workspace outputs/playwright. Device camera, keyboard, permissions, network-failure and authenticated API acceptance remain pending.

Device acceptance: start an assigned scheduled count; select/scan a position; scan and manually enter totals; switch increment mode; choose among multiple lots/qualities; save and continue another product at the same position; add/remove damaged evidence; verify blind-count quantities stay hidden; submit; verify manager-requested recount only opens the requested rows. Check expired permission/version and uncertain network outcomes cannot create blind retries.
