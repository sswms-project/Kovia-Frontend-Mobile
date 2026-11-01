# Staff workflows: xuất kho, điều chuyển, kiểm kê

Tham chiếu UI responsive của web dev `baf3087f`; hợp đồng BE dev `6e9d86d8`.
Giữ màu, chữ và component Kovia. Dòng hàng là thẻ; nguồn/lô và trạng thái dùng bảng chọn;
lịch sử có thể thu gọn; nút xác nhận nằm ngoài phần cuộn của form.

## Điều kiện test

- Staff đang hoạt động, có quyền thực thi và được giao đúng kho/công việc.
- Chọn kho trước khi mở Công việc. Dùng dữ liệu test; không nhập số kế hoạch nếu chưa thao tác thực tế.
- Camera trên điện thoại, bàn phím Android/iOS và cỡ chữ hệ thống lớn cần nghiệm thu riêng trên thiết bị.

## Xuất kho

1. Mở công việc lấy hàng xuất kho → Mở chứng từ và thực hiện.
2. Thử tìm SKU không tồn tại rồi xóa bộ lọc: các dòng phải trở lại, số lượng không đổi.
3. Chọn nguồn hàng được giữ cho phiếu trong dropdown. Kiểm tra vị trí, lô, hạn dùng và số giữ.
4. Lấy hàng tại nguồn → nhập số thực lấy, mã nguồn và mã sản phẩm → Kiểm tra và xác nhận.
5. Phiếu hiển thị số đã lấy và lịch sử. Tổng tồn kho chưa giảm.
6. Lấy đủ các dòng hàng → trạng thái Picked: hiện chờ quản lý cho phép xuất kho, chưa có nút xác nhận xuất. Quản lý thực hiện Cho phép xuất kho trên web → mobile tự nhận thông báo và tải lại phiếu/quyền → AuthorizedForDispatch: hiện Xác nhận hàng rời kho. Kiểm tra toàn bộ danh sách hàng, số lượng theo đơn vị của phiếu và vị trí chờ xuất; chỉ xác nhận khi toàn bộ hàng thực tế đã rời kho. Không chọn xuất từng lượt trên mobile.
   Chỉ phần được chọn giảm tồn; phần chưa thực hiện vẫn mở.

## Điều chuyển

1. Mở việc lấy điều chuyển. Chọn đúng điểm chờ xuất và nguồn/lô đã phân bổ.
2. Ghi số thực lấy; kiểm tra nút hoàn tất bị khóa khi còn thiếu, chờ quản lý hoặc cần trả hàng.
3. Lấy đủ → Hoàn tất lấy hàng, chuyển chờ xuất. Staff không tự bỏ qua bước xác nhận xuất thực tế.
4. Tại kho đích, mở việc nhận được giao → chọn/xác nhận vị trí nhận → bắt đầu nhận.
5. Ghi số tốt/hỏng/thiếu từng lô. Nếu có hỏng, chọn vị trí cách ly khác điểm nhận và xác nhận mã.
6. Chọn rõ Giữ tại khu nhận hoặc Tiếp tục cất hàng đạt. Khôi phục nháp phải giữ lựa chọn này.
7. Nếu tiếp tục cất, mở phiếu cất → Phân bổ và cất hàng điều chuyển.
8. Điền theo kế hoạch/gợi ý hoặc chia thêm vị trí; nhập số thực cất của từng phân bổ.
   Mỗi phân bổ phải chọn đích và xác nhận mã vị trí/sản phẩm. Gợi ý không tự ghi tồn.
9. Thử mã sản phẩm sai, trùng đích cùng lô, vượt tổng lượng còn lại, thiếu lý do khác kế hoạch:
   không được gửi. Khi phiếu/kế hoạch đổi phiên bản, giữ dữ liệu để đối chiếu và chặn gửi bản cũ.
10. Xác nhận nhiều phân bổ trong cùng một lần. Lịch sử phải hiện từng vị trí; tổng tồn không tăng thêm;
    hàng hỏng vẫn cách ly, không được cất thành hàng tốt. Phần chưa cất tiếp tục mở.

## Kiểm kê

1. Mở phiếu được giao, kiểm tra đúng vị trí/lô; phiếu đếm mù phải ẩn tồn sổ sách khi đang đếm.
2. Ghi tổng số thực đếm; số hỏng là phần nằm trong tổng. Nếu có hỏng, bổ sung lý do/ảnh theo API.
3. Lưu → dòng chuyển Đã ghi đếm. Thử lọc dòng đã/chưa ghi để kiểm tra hiển thị.
4. Ghi đủ dòng → Gửi kết quả kiểm kê. Lưu/gửi không điều chỉnh tồn kho.
5. Kết quả đã lưu không được ghi đè; cần quản lý yêu cầu đếm lại nếu phải sửa.

## Bằng chứng P39

TypeScript, Expo lint và 140 kiểm thử tập trung qua. RN Web đã thử với API/SQL thật trên DB test
riêng: xuất 2/5, lấy đủ 3 điều chuyển, lưu/gửi kiểm kê 5, nhận 8 tốt/1 hỏng rồi cất 3+5.
Màn dọc 375×812, ngang 844×390 và tablet 768×1024 đã kiểm tra. Đây không thay thế nghiệm thu native/camera.

## Bổ sung tham chiếu web responsive và quét lấy hàng — 29/10/2026

Đã xem web deploy bằng Edge/Playwright ở390×844, phiếu XK000007, mở Quét & lấy hàng; thử mã vị trí sai, mã A04 đúng và mã hàng sai trong form. Không bấm xác nhận lượt lấy/xuất. Nguồn tham chiếu: RecordStockPickingDialog, StockIssuePickEntry, useStockIssuePickScan và hợp đồng RecordStockPicking của BE.

Mobile có nút Quét & lấy hàng ở thanh hành động; chọn dòng đầu theo khu/kệ/ô trong các nguồn đã được giữ, không phân bổ lại hàng. Card hiển thị yêu cầu/đã lấy/còn cần lấy theo đơn vị của dòng. Form có một phiên camera liên tiếp vị trí→mã hàng, nhập tay/máy quét, quét từng Hộp/Thùng, số lượng theo đơn vị dòng rồi quy đổi về đơn vị cơ sở. Giữ bước kiểm tra/xác nhận hiện có trước khi gửi; sau khi ghi thành công quay lại danh sách đã tải mới, chưa tự mở camera cho dòng tiếp theo như web.

Các ca cần thử trên điện thoại:

1. Vào phiếu→Quét & lấy hàng: thấy đúng SKU, nguồn và điểm chờ xuất. Quét vị trí trước; bước mã hàng/số lượng khóa khi chưa đủ điều kiện.
2. Camera giữ mở sau mã vị trí hợp lệ để quét tiếp sản phẩm. Sai mã không tăng số lượng; barcode đã cấu hình không được thay bằng SKU. Camera không tự gửi lệnh; đóng camera để kiểm tra số lượng.
3. Bật quét từng đơn vị: mỗi lượt cộng1đơn vị của dòng, ví dụ1Hộp=10đơn vị cơ sở. Hai lượt=2Hộp; lượt vượt lượng giữ bị chặn. Máy quét nhập+Enter vẫn cộng dồn và chuyển focus theo bước; không bật bàn phím phía sau camera.
4. Nhập thiếu1Hộp thì payload là10đơn vị cơ sở; không nhận1,5Hộp nếu chỉ lấy nguyên kiện. Đổi vị trí/quét lại phải xóa xác nhận sản phẩm và số lượng cũ. Giữ-bỏ nháp vẫn qua guard hiện có.
5. Nhãn SLOT QR khớp slotId được kiểm tra tại client. Nhãn RACK QR hợp lệ nhưng DTO thiếu rackId chỉ hiện Đã nhận mã QR kệ, không hiện Đã quét đúng; BE xác minh chính xác khi ghi lượt lấy. Sai rack ID phải bị BE từ chối, không đổi tồn. Đây là giới hạn metadata hiện có của hợp đồng, không thay quyền hay xác thực BE.
6. Kiểm tra trên màn nhỏ/font lớn, đóng/mở camera, bàn phím, Back/Home, mất mạng, phản hồi chưa rõ và tải lại phiên bản sau khi ghi. Không tự gửi lại hoặc bỏ marker đối soát.

Kiểm chứng source:205/205test, TypeScript và Expo lint pass. Đã render các component mobile thực qua RN Web với fixture không gọi API và xem trạng thái ban đầu/đã quét ở390px; screenshot tại ../outputs/playwright/mobile-picking-{initial,ready}-390.png. Preview này không thay nghiệm thu camera/native. Không sửa BE/web hoặc ghi DB trong lượt thiết kế này.

## Tiện ích kết thúc quét và chỉnh số lượng — 29/10/2026

Theo phản hồi nghiệm thu, chế độ thường nay tự đóng camera ngay sau khi nhận đủ vị trí và mã hàng hợp lệ. Form cuộn tới ô số lượng và focus/chọn sẵn giá trị; không còn bước bấm Kiểm tra số lượng trong camera ở chế độ này. Barcode đã nhận không lặp lại trên thông báo hoặc trình đọc màn hình, nhưng vẫn được giữ nguyên trong form/payload để BE xác minh. Chế độ Quét từng đơn vị giữ camera mở và có nút kết thúc riêng.

Kiểm tra thêm trên điện thoại:

1. Quét vị trí đúng: camera còn mở. Quét mã hàng sai: camera còn mở và không cho xác nhận. Quét mã hàng đúng: camera đóng, ô số lượng hiện trong vùng nhìn thấy và nhận focus. Không tự ghi lượt lấy.
2. Bấm −/+ thay đổi 1 đơn vị của dòng, ví dụ 1 Hộp = 10 đơn vị cơ sở; không giảm về 0 hoặc vượt lượng giữ. Nhập tay vẫn được kiểm tra như trước. Khi bật máy quét, số lượng nhận focus nhưng không bật bàn phím ảo.
3. Bật Quét từng Hộp/Thùng: camera không tự đóng sau mã hàng đầu tiên; cộng dồn có giới hạn và kết thúc bằng Kiểm tra số lượng. Mở Quét lại ở chế độ thường phải bắt đầu lại từ vị trí; không giữ mã/số lượng xác nhận cũ.
4. Màn hình chỉ báo Đã quét đúng sản phẩm, không lặp dãy barcode. Xác nhận vẫn qua bước kiểm tra và command có version/idempotency hiện có.

Kiểm chứng source: **208/208 test pass**, TypeScript và Expo lint pass. Log: ../outputs/mobile-picking-scan-finish-{full,typescript,lint}-20261029.log. Chưa chứng nhận lại animation đóng modal, camera vật lý và bàn phím native; không sửa BE/web hoặc DB.


## Dispatch aligned with web — 2026-10-29

- While ReleasedForPicking, Picking or Picked, no dispatch action is available even if allowed-actions includes Dispatch. Picking and scanning never dispatch automatically.
- Manager authorizes on web after all items are picked. Mobile automatically refreshes on a matching SignalR notification (manual refresh remains available); only AuthorizedForDispatch plus current Dispatch permission/action/version permits confirmation.
- Confirmation lists all outstanding pick details with SKU, product, staging position, lot and quantity converted to the entered unit. Back closes without sending; there are no per-pick selection controls or second confirmation page.
- Confirm sends the existing dispatch endpoint with expectedVersion and commandId, omitting pickDetailIds to use BE whole-order behavior. Network uncertainty retains existing explicit retry protection. A stale version, revoked permission or changed status prevents sending; refresh before retry.
- Successful completion refreshes the document and shows completed work actions. Verify this end to end on a device; no business writes or native acceptance were performed by the agent in this round.


## Realtime dispatch authorization — 2026-10-29

1. Staff stays on a Picked issue with existing notifications.view permission; manager selects Cho phép xuất kho on web. Without manual refresh, the assigned staff device should show Xác nhận hàng rời kho after the notification and fresh API responses arrive. No fixed latency is guaranteed.
2. A notification for another document, another reference type or an invalid reference does not refetch this issue. Notification fields cannot grant dispatch; status/version/actions are read again from the guarded APIs.
3. Background then foreground the app, or leave then reopen the screen: subscription resumes and refreshes the current document. Authorize while disconnected, then reconnect: latest status must appear even if its event was missed.
4. If initial SignalR connection fails or automatic reconnect exhausts, connection retries start after 5 seconds and back off to at most 30 seconds. Retry attempts also resync queries. A healthy connection uses events, not status polling.
5. Leaving the screen, changing account/access or backgrounding cancels the old subscription and retries; late events must have no effect. Manually refreshing remains available when realtime is unavailable or notifications permission is absent.

Agent validation is mocked lifecycle/API-query integration, not deployed event delivery or native acceptance. No BE/web edits or business writes were performed.


## Realtime receipt approval / putaway — 2026-10-29

- On the receiving waiting screen, approve inspection on web and assign putaway to the same staff. A matching GoodsReceipt notification should refresh receipt/actions and immediately run the guarded handoff; no manual refresh or 5-second wait is required when the event is delivered.
- KeepAtReceiving or all-refused must update the receipt without opening putaway. Assigning to another staff member must not open their task on the current device. Later assignment to the current staff may continue only after API assignment/actions/version checks succeed.
- On an already open putaway screen, matching receipt changes (including a manager's saved plan) refresh its data; notifications for another receipt must not reload the current flow or navigate.
- Repeat with background/foreground, network disconnect/reconnect, Home pressed during refresh and an editor/modal open. No late handoff after leaving; paused work only hands off after safely resuming. Existing 5-second receiving fallback remains for missing events or outcomes sent to another recipient.
- This requires device/deployed event-delivery acceptance; automated validation uses the actual hooks with mocked transport/query responses. No BE deployment or migration is needed for this mobile change.


## Audible scan feedback — 2026-10-29

- Reload Expo Go after installing the new SDK-compatible expo-audio dependency. For a custom development build lacking expo-audio, rebuild that client. On the device, raise Media volume and check whether Bluetooth/headphones are the active sound output.
- Receiving: valid product count, valid receiving/putaway location → one short high beep plus existing success haptic; wrong product/location → two low beeps plus error haptic, without accepting the code.
- Outbound: valid source then product → success beep per accepted step. Final product beep must complete while camera closes and quantity gains focus. Wrong source/product uses the error sound, keeps scanning open and cannot advance validation. Each-unit mode gives success feedback per accepted count.
- Keeping one code in frame must not produce repeated beeps inside the guard window. Blank/neutral scans remain silent. Manual entry inside the scanner has the same feedback; ordinary typing outside the scanner is not a scan.
- Rapid alternating outcomes should not overlap pending sounds. Backgrounding stops playback; reopening allows new feedback. Audio/haptic failure must leave scan validation and quantity entry usable. Acceptance of a scan never confirms a warehouse write automatically.

Automated validation uses actual hooks and generated sound samples with mocked native playback. Speaker audibility, Bluetooth routing, silent-mode and rapid camera auto-close still require physical-device acceptance.


### Earlier success beep retest (superseded below) — 2026-10-29

Fully reload Expo Go to refresh the changed bundled success WAV. With the same Media volume/output that makes the error beep audible, scan a valid source/product in continuous mode and in auto-close mode. Success should now give a sustained ~200 ms high beep (245 ms asset including silence); error still gives two low beeps. Native audibility is pending, so a passing sample-energy regression is not a claim of physical speaker acceptance.


### Current audio retest: actual web-generated tones — 2026-10-29

Both audio files now come from Edge Web Audio rendering of the web oscillator/gain code, rather than raw square PCM synthesis. Success is back to the web's original 90 ms tone with gain 0.08 and exponential decay; error retains its two 140 ms tones and 60 ms gap. This supersedes the earlier sustained/louder success change. Fully reload Expo Go before comparing. Check accepted/rejected camera scans at the same Media volume, with and without the phone resting on a hard surface (haptics may be audible). Do not infer hardware damage from the current report: actual physical speaker distortion, haptic noise and native playback still require device comparison.


### Native playback readiness and isolated test — 2026-10-29

Reload Expo Go, open any inbound/outbound camera scanner and tap its header speaker icon. Choose Âm đúng then Âm sai; this intentionally plays audio without vibration and does not submit a scan or warehouse command. Report which sound is audible and the exact alert if a load/decoder failure appears. If both manual sounds work but scanning is silent, compare continuous scanning versus final auto-close. If both are silent without a playback error, investigate native output routing/volume/audio-session state rather than changing tone files again. Keep source WAVs identical to the web render during this diagnosis.

New player setup downloads assets first, waits for native readiness and re-enables audio. An unsuccessful manual load waits at most 3 seconds and reports the failure; normal scanning remains usable. Native speaker acceptance is pending on the reported device.


### Android finished-clip replay — 2026-10-29

Provider now seeks before awaiting READY, fixing Android's isLoaded=false after a completed clip. Reload Expo Go and test header-speaker success twice, error twice, then alternate actual valid/invalid scans including camera auto-close. Every intentional attempt should replay; keeping one barcode in frame still obeys the repeat guard. If a warning persists, capture its new reason field. Exact web WAVs and media volume remain unchanged.


## Realtime refresh while outbound work is open — 2026-10-29

Open the picking editor, select count mode and open the camera. Trigger reconnect or a matching notification without changing the document version: editor/camera/count state should remain mounted. Review/confirm is disabled until both document and allowed-actions refresh successfully. A failed refresh preserves the form and shows its error; manual refresh/reconnect may recover. Repeat from picking confirmation and whole-order dispatch confirmation; Back remains available unless a real command is pending. Verify that actual version/action/permission changes still prevent submitting obsolete work. Native acceptance is pending; actual-hook regression passes.
