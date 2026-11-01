# Combined transfer receiving and putaway — 2026-10-30

Source contracts: BE `feat/huytv` at `6fc9b4e9`, web `screen/huytv` at `60f23412`; workspace handoff `outputs/mobile-transfer-receive-putaway-handoff-20261030.md`.

Mobile consumes optional `isCombinedTransferReceipt` on current/history task items. Both task card implementations and task detail use “Nhận và cất hàng điều chuyển”. No local grouping, counts, pagination changes, new task enum or assignment writes. Manager assignment remains on web; mobile has no manager assignment form to replace with the new destination-assignment endpoint.

The effective task type/ID returned by BE continues to choose the receiving or putaway route and start/pause/return command. A receiving notification may resolve to the effective combined putaway task after the first phase completes. Non-combined task type mismatches remain rejected; reference IDs remain document/shipment references, never assumed task IDs.

After a successful submit, mobile clears the resolved durable operation and performs a new read after cancelling any older in-flight sheet request. It refreshes task feeds/details and only advances the mounted, focused receiving screen when the new sheet is AwaitingPutAway, not kept-at-receiving, version-consistent, assigned to this user for both steps, in the selected destination warehouse and permitted. Execution context is authoritative when present, with assignment verified against shipment details; older APIs without execution use shipment assignments. The destination route loads its own putaway sheet. No additional inventory operation is sent.

If the post-submit read fails or still returns the old version, show “đã ghi nhận, tải lại” and prevent another submission against that version. Other assignees, completed/cancelled/paused putaway, all-damaged/missing outcomes, kept-at-receiving and revoked scope do not auto-navigate. Manual reload can complete the handoff after a failed read. Reopening the app relies on the current effective task returned by BE.

Verification: automated contract, route/handoff and stale-read tests plus TypeScript and Expo lint. Device acceptance and deployed API verification remain pending. No BE/web changes, DB writes, migration or deployment performed.

Device acceptance:

1. Assign both phases to A on the updated web/BE: one current task and one assignment notification.
2. Submit actual counts with good stock and keep disabled: enter putaway for the same transfer/shipment, then finish and check one workflow history item.
3. Assign receipt to A and putaway to B: no automatic navigation for A; B sees their own task.
4. Keep at receiving, or all damaged/missing: no automatic putaway; resume uses the existing explicit action where permitted.
5. Disconnect after a successful submit/read failure: no duplicate submit; reload and continue with the new version.
6. Open the original receive notification after receipt finishes: resolve to the current combined phase; if multiple shipments match, require selection.
