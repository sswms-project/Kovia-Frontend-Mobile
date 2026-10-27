# Nghiệm thu ngoại lệ lấy hàng và theo dõi điều chuyển

P33, 26/10/2026. Nhánh feat/mobile-picking-exceptions từ dev22c2fc3. Giữ UI/UX hiện tại, không sửa BE/web. Không dùng tài khoản hoặc tồn kho thật để thử ghi.

## Staff — đổi vị trí/lô điều chuyển

1. Đăng nhập, chọn kho nguồn được giao → Công việc → Lấy hàng điều chuyển → Mở chứng từ và thực hiện.
2. Trong đợt đang Picking, chọn **Đổi vị trí hoặc lô** trên dòng còn phải lấy.
3. Chọn nguồn đang giữ chỗ và nguồn thay thế do BE trả về; đọc vị trí/lô/HSD và khả dụng. Nguồn mới khác nguồn cũ. Danh sách ưu tiên HSD; không tự thay lô hoặc bỏ qua quy tắc BE. Ghi lý do rõ ràng, đặc biệt khi phải dùng lô khác thứ tự FEFO.
4. Nhập lượng cần chuyển giữ chỗ, kiểm tra rồi xác nhận. Thành công: nguồn mới xuất hiện trong vị trí lấy; tổng tồn không đổi. Đây chưa phải xác nhận đã lấy hàng.
5. Thử nhập vượt phần còn phải lấy/giữ chỗ/khả dụng, số lẻ cho đơn vị nguyên hoặc thiếu lý do: bị chặn. Đổi kho/thu hồi quyền/đổi phiên bản trong khi form mở: không được gửi nội dung cũ.

## Staff — trả hàng đã lấy và báo quản lý

1. Chọn **Trả hàng đã lấy về vị trí** trong đợt còn Picking. Chỉ lượt còn lượng chưa xuất mới hiện trong bộ chọn.
2. Chuyển hàng thực tế về vị trí gốc → chọn đúng lượt lấy → quét/nhập mã vị trí → nhập lượng thực trả → kiểm tra/xác nhận.
3. Sau khi gửi, lượng đang lấy giảm; tổng tồn không đổi. BE giữ hoặc nhả phần giữ chỗ theo kế hoạch hiện tại. Đây không phải nhập hàng khách trả.
4. Mã vị trí sai, vượt lượng chưa xuất, phiên không được giao hoặc đợt đã rời bước Picking phải bị chặn. Đợt đã chờ xuất cần được người có quyền xử lý trên web trước; mobile không tự mở lại bước lấy.
5. Khi không thể tự giải quyết, chọn **Báo quản lý xử lý**, nhập loại lý do và mô tả, xác nhận. Dòng chuyển chờ quản lý, không tiếp tục lấy/hoàn tất; quản lý xử lý trên web rồi Staff tải lại. Không tự giữ hàng hỏng hay điều chỉnh tồn chỉ bằng báo cáo này.

## Staff — báo sự cố phiếu xuất

1. Mở phiếu xuất được giao đang ReleasedForPicking/Picking → **Báo sự cố khi lấy hàng**.
2. Ghi SKU, vị trí/lô và tình trạng thực tế (tối đa500 ký tự) → kiểm tra → xác nhận. Thành công ghi audit/thông báo cho người lập phiếu, không thay đổi tồn.
3. Tap lặp khi gửi bị khóa. Nếu mất phản hồi, app giữ dấu lần gửi trong lưu trữ riêng và không tự gửi lại; đối chiếu nhật ký hoặc nhờ quản lý kiểm tra. Chỉ xác nhận mở báo cáo mới sau khi đã đối chiếu. API hiện tại không có commandId/version cho hành động này; mobile không giả lập bảo đảm idempotency phía BE.
4. Nhật ký chỉ có nút mở khi người dùng có quyền đọc. Không có quyền thì đối chiếu với quản lý. Lỗi lưu dấu gửi phải ngăn lệnh đi, không bỏ qua bảo vệ.

## Owner/Manager — chỉ theo dõi

1. Chọn kho → Quản lý → Chứng từ kho → **Điều chuyển kho**.
2. Chọn xuất từ kho/nhận về kho, tìm mã, lọc trạng thái. Phiếu có vướng mắc/chênh lệch được đánh dấu.
3. Mở phiếu: xem kho nguồn/đích, từng đợt/người phụ trách, tiến độ từng dòng, phần cần trả, vướng mắc và chênh lệch. Không cộng thô các SKU khác đơn vị thành một tổng tiến độ.
4. Không có nút phân công/duyệt/xử lý thay nhân viên ở màn này. Công việc quản lý hằng ngày vẫn trên web.
5. Thông báo tham chiếu StockTransfer của Owner/Manager mở thẳng chi tiết đọc; Staff giữ đường mở công việc được giao. API/route vẫn kiểm quyền và kho hiện tại. Thông báo chỉ tham chiếu shipment hoặc công việc tổng hợp vẫn dùng tìm kiếm theo API hiện có, không giả có endpoint mới.

## Nháp, mạng và thiết bị

- Form ngoại lệ điều chuyển và báo sự cố có nháp riêng theo tài khoản/kho/chứng từ/dòng/thao tác. Khôi phục không tự xác nhận quét hay gửi lại lệnh. Phiên bản tải về chậm vẫn khởi động bước đọc nháp khi đã có version.
- Sau đóng app trong lúc gửi, tải lại chứng từ/lịch sử trước. Gửi lại đúng lệnh đang xác nhận giữ cùng commandId đối với các API điều chuyển; không sửa nội dung lệnh đã thử rồi gửi lại như cùng thao tác.
- P33 đã live-test RNWeb390×844 với API/SQL riêng: đổi giữ chỗ2, lấy2, trả1, báo quản lý; thêm API return/replay và chặn sai nguồn/vượt lượng/khác tenant. Owner đã mở danh sách/chi tiết thật; báo sự cố phiếu xuất tạo đúng1audit. Tổng15 và giữ chỗ3 bảo toàn.
- Chưa nghiệm thu quét camera quang học, bàn phím/native Back, force-stop toàn bộ form mới hoặc mất phản hồi thật trên Android. ADB không có thiết bị ở lượt này; camera thật vẫn user-deferred. Bộ test logic/lưu trữ không thay thế nghiệm thu native.
- Mở ID công việc/báo cáo cũ qua feed vẫn cần tìm tiếp theo trang. Cải thiện endpoint và push khi đóng app là phần BE/future cần duyệt riêng. Không triển khai offline queue ghi tồn.
