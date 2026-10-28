# Nghiệm thu điều hướng màn sâu — 2026-10-28

Trạng thái: source đã triển khai, tự kiểm chứng bằng test code; chưa nghiệm thu native. Spec: `MOBILE_DEEP_SCREEN_NAVIGATION_SPEC.md`.

## Phạm vi triển khai

- Header Back/Home cố định trên nhóm account; thêm Home/Back vào header stack tasks/catalog/inventory hiện có. Tab gốc giữ header/thanh tab hiện tại. Trang chủ và lựa chọn kho giữ nguyên.
- Header riêng cho editor nhận/cất/cách biệt, phân bổ, lấy hàng, kiểm kê, di chuyển, điều chuyển, biểu mẫu báo sự cố/hỏng/chênh lệch. Picker/camera/ảnh tiếp tục đóng về lớp gần nhất.
- Guard rời màn dùng cùng quyết định cho header và native stack removal; giữ/bỏ nháp đợi storage, không ghi nghiệp vụ khi Home. Có hành động về Công việc/Trang chủ sau khi BE xác nhận hoàn tất bước tương ứng.
- Khóa ý định rời đồng bộ và lease của handoff loại callback cũ ngay khi người dùng chọn thoát; hủy thoát cho phép kiểm tra mới.
- Marker bền vững cho command có idempotency lưu loại thao tác, commandId, SHA-256 fingerprint, expectedVersion, document/receipt ID và scope/thời điểm, không lưu payload/ảnh/mã quét. Create → submit ghi nhận receiptId trước preflight submit. Nháp thường được eviction; pending chưa đối soát được bảo toàn.
- Ảnh phiếu giao/từ chối đối chiếu ID với đúng collection BE hoặc snapshot submit thành công. Cache detail cũ không gây cảnh báo mất ảnh đã attach; ảnh mới/chưa xác nhận vẫn có guard.

Không bổ sung API BE, không sửa web hoặc database trong lượt triển khai này. Checkpoint công việc trước spec đã commit riêng: mobile `cea9fac`, BE `eb4b9749`; phần source điều hướng được kiểm tra trong working tree sau checkpoint.

## Kiểm thử code và giới hạn

- `scripts/test-screen-navigation.cjs`: các test thực thi navigation-state transform, boundary guard, draft storage/hook, evidence hooks và receipt handoff; không chỉ kiểm tra JSX. Kiểm tra giữ Home/warehouse/filters, deep link, native action replay qua mock, nhấn lặp, hủy dialog, lỗi lưu, scope đổi, pending mới xuất hiện khi dialog mở, TTL/eviction, restart/legacy pending, chuỗi create/submit và race handoff.
- Chạy lại receiving/editor/recovery hiện có. Logs tại `../outputs/mobile-nav-focused-20261028.log`, `mobile-nav-new-tests-20261028.log`, `mobile-nav-typescript-20261028.log`, `mobile-nav-lint-20261028.log`, `mobile-nav-full-suite-20261028.log`.
- Kết quả tự kiểm chứng: 16 test mới pass; tổng nhóm receiving/editor/recovery/navigation 88/88 pass; TypeScript và Expo lint pass. Full suite 162/167 pass, còn đúng năm lỗi baseline auth/access đã có trước task này. Không tuyên bố full suite xanh.
- Các test router/native action ở đây dùng fixtures/mock, chưa chứng minh Android Back/iOS gesture hoạt động trên navigator thật. Safe area, font scaling, bàn phím, overlay/modal dismissal và camera cần nghiệm thu thiết bị.
- Máy có khoảng 15,7 GB RAM, lúc khảo sát còn khoảng 3,4 GB; AVD Pixel 9 Pro XL cấu hình RAM 2 GB, 4 CPU, chưa chạy. Đã kiểm tra AVD/ADB, chưa khởi động emulator/Metro trong lượt này để tránh cạnh tranh bộ nhớ với môi trường phát triển. Người dùng cho phép hoàn tất test code và nghiệm thu bằng LDPlayer sau.
- Lệnh cũ/API không có idempotency (ví dụ báo sự cố lấy hàng) chỉ giữ pending marker, không giả lập replay bằng commandId client. Nếu API đọc hiện có không xác định được chính lệnh đã gửi, giữ marker và hướng dẫn quản lý đối soát. UI không có nút Đã hiểu/đã kiểm tra để âm thầm xóa marker và gửi thay thế. Không có hàng đợi tự retry.
- Bản pending thuộc phiên đăng nhập bị logout/thu hồi vẫn bị xóa cùng dữ liệu riêng tư hiện có; không cam kết replay hay khôi phục sau logout.

## Checklist LDPlayer / điện thoại

1. Khởi động LDPlayer; mở Metro bằng lệnh pnpm của repo và mở app trên Expo Go/development build tương thích SDK hiện tại. Giữ `.env` đang dùng; không đổi BE hay migration để thử điều hướng.
2. Chụp Trang chủ làm mốc. Từ Công việc mở chi tiết → thực hiện nhận/cất, cuộn cuối: Back/Home vẫn ở đầu viewport. Home phải về đúng giao diện mốc và giữ kho. Bấm Back không mở lại form đã thoát.
3. Lặp lại cho xuất, kiểm kê, di chuyển và ba bước điều chuyển; thử từ Catalog/Inventory và deep link/thông báo. Kiểm tra cả lỗi tải, không có quyền, mã không tồn tại.
4. Nhập dở vào từng editor rồi bấm Home và Back Android: chỉ một dialog. Chọn tiếp tục: nội dung còn nguyên. Chọn giữ nháp: rời sau lưu, mở lại phục hồi đúng; xác nhận cần quét/đính ảnh lại. Chọn bỏ: không xóa phiếu đã lưu trên BE.
5. Chọn vị trí, mở ảnh/camera: Back đóng lớp gần nhất. Quay lại form còn nội dung; Home từ full-screen editor đóng cả form/luồng cha, không còn overlay/camera che Home.
6. Bổ sung ảnh phiếu giao/từ chối, lưu nháp: ảnh chưa attach phải cảnh báo khi Home. Với dữ liệu thử đã được phép, submit thành công rồi Home: không cảnh báo ảnh đã attach. Không dùng database deploy để tạo tình huống thử ngoài ứng dụng.
7. Với fixture/mock mạng, kiểm tra đang gửi thì không thoát/gửi trùng; mất phản hồi rồi Home/restart vẫn có pending và không tự retry. Không cố tạo timeout bằng cách gửi lệnh ghi vào DB deploy để thử. Không xóa pending thủ công hoặc reset storage để coi ca này pass.
8. Khi chờ manager: Home trong lúc duyệt không bị kéo sang cất. Hủy ý định Home và ở lại thì handoff có thể chạy sau kiểm tra mới. Duyệt giữ tại khu nhận không mở cất hàng.
9. Hoàn tất một dòng chưa được báo toàn task hoàn tất. Khi hoàn tất bước task thật, có Về công việc/Trang chủ; hai nút đến đúng đích và không gọi API hoàn tất lần nữa.
10. Thử màn nhỏ, cỡ chữ lớn, dark mode, xoay/hiện bàn phím, TalkBack. Trên iOS thử gesture back riêng; LDPlayer chỉ chứng nhận Android khi đã chạy các bước thực tế.

Các ca 6–9 có ghi nghiệp vụ chỉ thực hiện theo quyền thử nghiệm đã được cấp, sau xác minh provider/server/database theo AGENTS.md. Có thể nghiệm thu phần điều hướng bằng fixture trước; tài liệu này không cấp quyền seed/cleanup/migration hoặc ghi QA trực tiếp lên DB deploy.

## Vòng sửa findings NAV-R1/R2/R3 — 2026-10-28

- Back của header dùng `navigation.dispatch(CommonActions.goBack())` trong callback đã được guard chấp thuận; đích dự phòng deep link dùng reset cùng cơ chế Home/Công việc. Không còn dùng queued `router.back/replace` trong nhánh đã chấp thuận.
- Writer dùng chung `useFormDraft.execute`: lưu marker trước gửi; chỉ lần gửi đầu nhận 400/422 xác định mới phục hồi nháp thường và cho sửa. Timeout/5xx/409 hoặc 400 sau một kết quả chưa xác định vẫn giữ pending và chặn lệnh thay thế. Lỗi ghi storage khi phục hồi cũng giữ marker. Receipt editor/allocation giữ các nhánh kiểm soát tương đương đã có.
- Guard chung là nơi duy nhất hỏi giữ/bỏ nội dung. Callback đóng editor nhận/cất/lấy hàng/kiểm kê/di chuyển/điều chuyển chỉ đóng UI sau chấp thuận, không hỏi lại dựa trên dirty snapshot. Nếu một bước thoát khác thất bại sau khi đã flush nháp, autosave/dirty protection được bật lại cho editor còn mở.
- Đã bổ sung 9 test hồi quy, gồm real picking hook và real relocation hook kết hợp draft/storage/boundary fixtures. Tổng navigation tests25/25; nhóm receiving/editor/recovery/navigation97/97; full suite171/176 còn đúng năm lỗi auth/access baseline. TypeScript/lint pass. Ba review repros cũng pass sau cập nhật adapter cho Back đồng bộ. Logs: `../outputs/mobile-nav-fix-{new-tests,focused,full-suite,typescript,lint,repros}-20261028.log`.
- Chưa chạy native trong vòng sửa này. Khi test LDPlayer, kiểm tra thêm Back trên header không khóa hai nút; deep link có đích quay về hợp lệ; giữ/bỏ nháp di chuyển hàng chỉ có một dialog; và fixture BE trả400lần đầu cho phép sửa trong khi timeout→400không cho sửa/gửi lệnh thay thế. Không tạo các tình huống ghi lỗi trên DB deploy để nghiệm thu.

Chỉ sửa mobile, không thay đổi Trang chủ, BE/web hoặc database. Chưa commit/push phần triển khai và vòng sửa navigation.
