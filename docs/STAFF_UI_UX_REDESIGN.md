# Staff mobile redesign — P40/P41, 02/11/2026

## P41 — đối chiếu lại prompt và UI/UX Pro Max

Đã đọc lại prompt gốc, hướng dẫn `ui-ux-pro-max/SKILL.md`, `references/pro-rules.md`
và truy vấn local database bằng `search.py ... --stack react-native` về touch target,
accessibility và form màn hẹp. Dùng hệ màu/font Kovia hiện có, không sinh theme thay thế.
Skill là bản cài tại `C:/Users/pc/.agents/skills/ui-ux-pro-max`; SKILL.md không công bố version.
Taste/Impeccable vẫn chưa cài; không tuyên bố đã chạy hai skill này.

| Tiêu chí từ prompt | Kết quả rà lại và sửa P41 | Bằng chứng / giới hạn |
| --- | --- | --- |
| Next action rõ; không thêm xác nhận Start/Resume | Start đứng đầu, Open dùng outline khi còn Start; khi đang làm Open là primary; Pause/Return ở hàng phụ có wrap; đổi nhãn thành “Trả lại công việc” | Component regression kiểm tra action set, callback, busy, read-only và Resume; preview queued/in-progress |
| Số thực tế và lượng cần xử lý nổi hơn kế hoạch | “Còn cần cất”, “Đã nhận” đứng trước; số kế hoạch ở disclosure | ReceiptItemCard light/dark fixture |
| Không giấu blocker/cách biệt | Số hỏng và cảnh báo cần cách biệt nằm ngoài WorkDetails; lý do và nút có quyền vẫn hiện | Test kiểm tra cảnh báo ở ngoài disclosure, quyền và busy; fixture đóng/mở lịch sử |
| Màn hẹp không ép mất thông tin hàng | Header editor wrap khi scan count dài; bỏ cắt tên sản phẩm; chip scan được wrap chữ | Lỗi tên hàng bị ép hẹp tái hiện ở 320px và đã sửa; p41-editor-320.png |
| Vùng bấm dễ dùng; trạng thái có nghĩa | Chip scan, radio đơn vị, nút sửa nhận hàng tối thiểu 48px; radio dùng `aria-checked` được RN hiện tại hỗ trợ | Preview radio đổi true/false khi chọn; đổi đơn vị vẫn xóa lượng cũ như trước; TalkBack/VoiceOver chưa thử |
| Shared control không gây tràn hàng nhãn | Rà compact ScanCodeButton trong receiving/transfer và ScanCountButton; render nhãn SKU dài, mã vị trí, số lô, scan count lớn | 4 scan controls mẫu đều cao 48px, mép phải trong 320px; không chứng minh mọi caller/role |
| Giữ brand/native/routes/safeguards | Không đổi font/theme/nav; không chạm hooks, schema API, version, commandId, scan session hay xác nhận cuối | Diff và full existing suite; chưa thực hiện giao dịch API/DB |
| Inventory đúng mẫu và trung thực | Bổ sung đủ 11 cột yêu cầu, thêm các component thực sự đã inspect/render và trạng thái bằng chứng | 80 route shell là discovery; không tương đương audit xong mọi screen/state |

Các chỉnh sửa UI dùng lại Button, WorkActionBar, WorkDetails, StatusPill và AlertBanner.
ScanCodeButton dùng chung chỉ đổi compact presentation; full-size và camera lifecycle giữ nguyên.
Không mở rộng chức năng Owner/Manager hoặc sửa BE/web. Các mã chứng từ vẫn giữ bản đầy đủ
có thể chọn/copy trong body khi header ngắn; không tuyên bố đã loại bỏ mọi mã lặp.

### Kiểm chứng hiện hành P41

- `pnpm exec tsc --noEmit`: exit 0 (`p41-typecheck-final.log`).
- `pnpm exec expo lint`: exit 0 (`p41-lint-final.log`).
- `pnpm exec node --test scripts/test-*.cjs`: exit 1, **279/280 pass**, gồm 3 test regression mới.
  Một failure tại `test-receiving.cjs:323` giống baseline P40 đã chứng minh trên `origin/dev`
  (30/31 receiving tests với cùng web checkout). Không sửa assertion hoặc luồng quét để che failure.
- Preview component thật với sample fixtures, không gọi API/DB: 320×740, 390×844,
  430×900, light/dark; form đổi đơn vị, disclosure, cảnh báo và action hierarchy.
- ADB probe không khởi động được daemon (`could not read ok from ADB Server`). Vì vậy
  chưa nghiệm thu Android/native trong P41. iOS, camera, keyboard, system text scaling,
  safe area và lifecycle vẫn pending; không dùng RN Web để chứng nhận chúng.
- Không chạy production build, EAS, seed/migrate, commit/push, PR hoặc deploy.

Log, ảnh và fingerprint hiện hành: `outputs/workflow/modules/mobile-rollout/checkpoint-p41.json`.
Phần P40 bên dưới là lịch sử trước lượt rà lại, không thay thế kết quả P41.

## Review prompt

Prompt phù hợp với Kovia ở bốn điểm: ưu tiên công việc tại hiện trường, giữ brand/native stack,
bảo toàn safeguard nghiệp vụ, và phân biệt preview với nghiệm thu thiết bị.

Các điều chỉnh khi áp dụng:

1. Dùng workspace thực tế `D:/LEARN/capstone/Kovia`, baseline mobile `ee643ff`, nhánh riêng
   `ui/staff-workflow-redesign`. Không dùng nhánh `feat/huytv` của người khác.
2. Taste/Impeccable chưa có trong bộ skill của máy. Đã xem nguồn chính thức
   [Taste](https://github.com/Leonxlnx/taste-skill) và [Impeccable](https://github.com/pbakaus/impeccable),
   chưa cài hoặc chạy installer/hook. UI/UX Pro Max hiện có được dùng cho React Native;
   Ponytail giữ thay đổi nhỏ, tái dùng primitive. Không khẳng định đã chạy Taste/Impeccable.
3. Chốt đầu ra theo từng đợt có bằng chứng. Inventory route không chứng minh mọi trạng thái,
   camera, popup hoặc quyền đều được nghiệm thu. Phần chưa xem/render phải ghi rõ.
4. Giữ composition Trang chủ và routes; cải thiện thẻ đang dùng thay vì thay thông tin kiến trúc.
5. Không chạy ví dụ nghiệp vụ trong prompt lên DB. Đợt này dùng preview fixture cục bộ,
   không khởi động BE, seed, migrate hoặc ghi giao dịch.

## Thiết kế đã triển khai

| Bề mặt | Thay đổi | Phạm vi bằng chứng |
| --- | --- | --- |
| Thẻ Công việc chính và Lịch sử | Tên việc tách khỏi mô tả; mã phụ nhỏ; kho tách dòng; trạng thái, tiến độ và chevron rõ; không cắt lý do tạm dừng | Source + RN Web fixture |
| Thống kê Công việc | Wrap thành hàng trên màn nhỏ, không giấu Quá hạn ngoài cuộn ngang | Source + RN Web fixture |
| Chi tiết công việc | Kho và nội dung luôn hiện; tỷ lệ số lượng/dòng có hierarchy; thời gian ở disclosure; hành động trong WorkActionBar hiện có | Source + RN Web fixture; callback mẫu và disclosure đã thử |
| Thẻ Trang chủ của bộ my-tasks cũ | Tăng tên việc, giảm độ nổi của mã; giữ composition và callback | Source; chưa render riêng toàn Trang chủ |
| Thẻ nhận/cất | Số lượng đậm hơn, layout wrap; lịch sử vị trí/quy đổi trong WorkDetails; số hỏng, lý do, lượng cần cách biệt và nút vẫn lộ | Source + RN Web fixture |
| Xuất kho/lấy điều chuyển | Mã chứng từ trong body đổi thành metadata nhỏ, có thể chọn/copy; mã đầy đủ còn ở body khi subtitle bị rút ngắn | Source; chưa render tích hợp riêng |

Giữ Inter/JetBrains Mono, màu sáng/tối và radius Kovia. Không thêm dependency hoặc theme mới.
Đối chiếu hierarchy web tại `warehouse-task/components/MyWorkQueue/MyWorkQueue.tsx`:
loại việc → mã → nội dung → kho, trạng thái có chữ. Không sao chép kích thước desktop hoặc truncate kho trên điện thoại.

Màn chi tiết vẫn giữ đúng callback Start/Pause/Return/Open; Start nổi bật khi được phép, Open dùng outline khi còn Start.
Quyền, selected warehouse, assignment, version, commandId, scan sequence, quantity validation,
dirty/pending recovery, realtime và request hooks không bị chỉnh sửa.

## Phần giữ lại / cần tiếp tục

- Inventory gồm 80 route shell và các component editor/modal/picker được phát hiện trong source;
  xem `STAFF_UI_UX_INVENTORY.csv`. Trạng thái runtime chưa được thử không được coi là hoàn tất.
- Giữ nhận hàng/editor, xuất/điều chuyển, kiểm kê, trả hàng và các cơ chế scan/recovery hiện có;
  đợt này mới áp dụng hierarchy ở các bề mặt nêu trên. Không tuyên bố redesign xong mọi workflow.
- Bản đồ, thông báo, hồ sơ/bảo mật, các modal sâu và phần Owner/Manager chưa redesign trong P40.
- Tiếp tục từng batch sau khi xem hướng giao diện mẫu; không đổi đại trà các màn đang dùng tốt.

## Kiểm chứng

- TypeScript pass sau khi regenerate `.expo/types` cho các route dev mới; không sửa route sản phẩm.
- Expo lint pass; lần chạy đầu pnpm bị EPERM khi nhiều process cùng kiểm tra dependency, đã chạy lại riêng.
- Full suite: 276/277 pass. Failure `mobile scan resolution matches web ...` tại test-receiving.cjs:323
  tái hiện trên source `origin/dev` cô lập (30/31 receiving tests), cùng checkout web.
  Đây là baseline mismatch giữa mobile và web; không sửa assertion hoặc nghiệp vụ quét trong redesign.
- Rendered fixture: 320×740, 390×844, 430×900; dark/light. Ba nút chi tiết cao 48px,
  trong viewport 390×844 có đáy lần lượt 718/774/832. Thời gian mở rộng và callback Pause mẫu hoạt động.
- Preview dùng component RN thật với dữ liệu mẫu; không phải API/live-data test hoặc nghiệm thu native.
  Fixture nằm trong `.expo/p40-preview`, không thêm route debug vào app sản phẩm.
- Android/iOS, camera, keyboard, system font scaling và native safe area còn pending.
  Không có EAS build, deployment, commit/push hoặc thay BE/web trong P40.

Evidence/log/checkpoint nằm trong workspace `outputs/workflow/modules/mobile-rollout/p40-*`.
