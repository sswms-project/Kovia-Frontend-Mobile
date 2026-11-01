# Staff return workflows

Implemented on `feat/huytv`, 2026-11-01. Mobile changes only; no BE/web changes, dependency additions, migration or database writes.

## Reference and scope

Read BE `ReturnWorkController`, `ReturnWorkPolicy`, `ReturnWorkRules`, manage validators/handler, customer restock command/placement rules and supplier delivery/scan/quantity rules. Read web `ReturnWorkTaskPage`, `ReturnWorkPanel`, `RestockReturnDialog`, `RestockReturnLine`, `SupplierReturnDeliveryLine`, forms and retry lifecycle.

Edge/Playwright at 390 px: inspected authenticated staff task filters and both return document detail pages. There were no assigned customer/supplier return tasks in the current feed; approved documents inspected were unassigned. No task was started, assigned, received or delivered through the live site. Live task execution dialogs therefore remain unverified.

Taste skill was read as requested. Its native-mobile exclusion was respected: preserve Kovia's theme/components, accessible touch targets and familiar single-column workflow, without marketing-page layouts or effects.

## Entry and permissions

Both task feeds, filters, detail navigation and notification resolution recognize `CustomerReturnReceive` and `SupplierReturnDispatch`. Task IDs are resolved through `GET /return-work/{supplier}/tasks/{taskId}`; they are never used as document IDs. Both task and document responses are checked against selected warehouse, current assignee and versions. Return actions are excluded from generic unversioned task commands.

Require all four permissions, matching web/BE assignee policy:

- `warehouse-tasks:view-own`
- `warehouse-tasks:manage-own`
- Customer: `goods-return-requests:view` and `goods-return-requests:restock`
- Supplier: `supplier-returns:view` and `supplier-returns:dispatch`

Requires the existing BE assignment workflow (`ReturnWorkflows:AssignmentRequired=true`) and version/scan metadata contracts. No mobile fallback bypasses an unavailable workflow. Legacy catalog customer-return receiving commands were removed; catalog detail directs staff to their assigned task.

## Customer return

Start/resume task, inspect each product/lot and approved quantity, choose actual condition and a condition-specific destination from `restock-options`, then scan that destination. Changing condition/location clears the affected proof. Camera/manual code confirmation share validation; QR/rack aliases come from BE `scanCodes`. The internal system-default code is never accepted as a physical label.

Damage/expired lines use BE isolation options. `Scrap` means no restock location/scan and no inventory addition, not authorization to physically destroy goods. Quantity is fixed to the approved return quantity; discrepancies require manager handling. Review shows all quantities, actual conditions and destinations before one versioned `restock` command completes the task.

## Supplier return

Start/resume task. Each expandable product/lot card shows its exact source. One camera session accepts source first, then product, and closes after product confirmation. Success is indicated in green; quantity remains explicit, with minus/input/plus controls. Camera completion focuses quantity without opening the keyboard; direct input tap enables it.

Manual scanner input uses the same state machine. Positive delivered quantity requires both proofs. Zero means do not deliver that line; at least one line must be positive. All lines, approved maximums and unit precision (at most two decimals) are validated without silently rounding user input. Confirmation lists actual delivered and undelivered quantities. BE deducts only delivered quantity and releases remaining reservations.

## Commands, refresh and exit

Each command includes UUID, document version, task ID and task version. Store the complete immutable request plus fingerprint using existing secure draft storage before sending. After timeout/server uncertainty, lock edits and offer **Kiểm tra lại kết quả**. Retry uses the identical request, even after reopening; no automatic send or substitute command. A fresh definitive rejection can unlock editing; a rejection of an uncertain replay cannot prove the original failed. Legacy/foreign pending entries block substitution and require reconciliation, not deletion.

Session/warehouse/permission guards run before dispatch and after acknowledgement. Pending operations are preserved by the shared exit boundary. Ordinary unsent edits warn before leaving; this feature does not promise offline form drafts. Background reads never overwrite the editing snapshot. External version changes disable confirmation and require explicit reload. Acknowledged completion is presented before cache refresh; read failure does not become a failed-write message.

## Validation and remaining acceptance

- TypeScript and Expo lint pass.
- Full Node test suite: **273/273 pass**, including 10 return workflow regressions. Tests exercise source/product validation, condition changes, full line sets, precision/zero limits, permissions, task/document routing, command bodies, persistence, unknown replay and first-rejection handling.
- Updated the existing logout test's push-registration mock to match new imports from dev; auth behavior was not changed.
- Actual RN Web screen/component SSR fixtures inspected in Edge at 320 and 390 px, with form state and API/camera mocked. Narrow quantity input shrink was fixed in the shared TextField; internal overflow inspection returned no overflowing elements at 320 px. Mock icons in preview are not production icon assets.
- Preview artifacts live outside the mobile repo under `../outputs/playwright/return-preview-public` and `../outputs/playwright/*return*.png`.
- This is implementer self-review. No native camera, haptic/audio, keyboard, deployed write or end-to-end inventory acceptance was performed.

Device acceptance: manager assigns each return type to staff; open from Tasks in the correct warehouse; start/pause/resume; scan wrong/correct rack/product aliases; handle two products/lots; customer change condition/location and verify old proof clears; supplier deliver partial quantity and zero one line; review actual quantities; confirm once; verify task/history/inventory on web. Test network loss around confirmation and reopen/replay; verify Back/Home warns for unsent edits and preserves unknown requests.
