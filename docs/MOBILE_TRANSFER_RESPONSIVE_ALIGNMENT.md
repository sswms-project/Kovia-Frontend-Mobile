# Staff transfer workflow alignment

## Design and scope

Align native staff TransferPick, TransferReceive and TransferPutAway with the responsive web workflow. Source references: web TransferPickTaskPage/PickEntryWorkspace, TransferReceiptCountCards and TransferPutAwayPage/TransferPutAwayForm; BE RecordTransferPick, StartTransferReceiving, SubmitTransferReceipt and PutAwayTransferShipment commands, validators and response models. The prior read-only Edge inspection at 390×844 is preserved in ../outputs/playwright/transfer-{picking,receiving,putaway}-web-390.png. The new browser session expired to login; it was reopened headed for user authentication and no login/business command was submitted by the agent.

## Picking

Cards retain quantity summaries and collapsible source/actions. Location descriptions use zone/rack/slot formatting instead of the system-default sentinel. One camera follows source → product → actual quantity. Normal mode pre-fills the server-budgeted maximum as the web does, then closes after accepted source+product and scrolls/focuses the editable quantity. Each-unit mode keeps scanning, adds one base unit per accepted product and stops only on explicit completion. Hardware scan fields use Enter and preserve the same order/validation. Wrong labels do not advance the step, source changes invalidate old product/quantity, and quantity cannot exceed remaining/reserved/suggested budgets. Existing separate Switch/Escalate/Return and completion confirmations remain; no scan executes a warehouse command automatically.

## Receiving

The receiving count editor is an in-page workspace rather than an extra native modal. It retains the main Back/Home/draft protection and has a local return-to-document control. Per-lot good/damaged/missing inputs are arranged horizontally with wrapping for narrow/font-scaled layouts; the checked total and dispatched total stay visible. No planned quantities are copied into actual counts. Existing keep-at-receiving/continue-putaway choice, damage isolation evidence, version checks, durable draft and explicit review/confirmation remain.

## Putaway

Group allocations by product line/lot with collapsible details. Read-only Plan and Execution views retain the same unsent quantities/scans. Manager plan, available suggestions, split-location allocations, remaining budgets and deviation reasons are retained. Product scanning is optional as in web/BE; any supplied product code is checked. Position evidence remains mandatory unless the employee explicitly declares an unreadable label: send scannedSlotCode=null, slotCodeUnreadable=true and LabelMismatch, or Other with a 5–500 character note. A scanned slot code cannot accompany that exception. No slot/product input is fabricated.

## Realtime

The existing notification SignalR connection can optionally JoinTransfer and observe TransferChanged. Transfer-specific hooks filter the current ID and mark a change hint without invalidating/editing in-progress data. Screens block new commands and ask the user to leave the editor and reload. Reload captures the event generation so a newer event arriving during refresh is not accidentally dismissed. Reconnect/foreground rejoins and marks possible missed changes; detail queries use staleTime=0 on mount. Existing notifications/receiving/outbound consumers keep their default behavior. Notifications permission is still required for this existing hub client; manual refresh remains available when realtime is unavailable.

## Validation and acceptance

245 automated tests pass, TypeScript and Expo lint pass. Actual hook tests cover sequential scan/repeat counting, normal camera completion/focus, no scan-triggered submission, optional product validation, unreadable-label payload/schema, SignalR join/rejoin/cleanup, matching document hints and pending-change command blocking. Existing allocation budget, stale-version/scan-race and draft restore tests pass.

RN Web SSR previews render the actual transfer-pick and putaway components with fixture data at 390 px; modal/transport/native controls are stubbed. Preview images: ../outputs/playwright/mobile-transfer-pick-390.png and mobile-transfer-putaway-390.png. This is layout evidence, not native camera/API acceptance. Logs: ../outputs/mobile-transfer-design-{full,focused,typescript,lint}-20261029.log.

On phone, verify accepted/rejected source/product, keyboard focus and large fonts, each-unit camera completion, KeepAtReceiving choice restoration, damaged/missing totals, multi-lot split allocations, optional product/unreadable label reasons and reconnection during unfinished edits. Verify each command once in the application and never infer a warehouse write from a success scan beep. Device/audio/deployed SignalR acceptance remains pending. No BE/web edits, DB command, migration, dependency change, commit or push in this task.
