# P26 — Kiểm thử xuất kho và điều chuyển

Giữ nguyên thiết kế Kovia hiện có. Backend cần có fix/transfer-keep-at-receiving để nhận giữ tại khu nhận kết thúc đúng. Chỉ dùng tài khoản/dữ liệu test được cấp riêng; không thử hàng thật.

1. Nhân viên chọn kho được giao → Công việc → mở chứng từ lấy hàng. Quét/nhập đúng vị trí và sản phẩm; quét đếm chỉ cập nhật số đang nhập sau xác nhận. Ghi thực lấy không làm giảm tổng tồn kho.
2. Phiếu xuất: chọn đúng từng lượt hàng đã thực rời kho, xác nhận xuất. Chỉ phần chọn giảm tồn; phần đang chờ xuất và phần chưa lấy tiếp tục được theo dõi. Không tự chọn tất cả.
3. Điều chuyển: lấy hàng đúng mã/lô, chọn điểm chờ xuất thực tế và hoàn tất lấy. Người có quyền xác nhận xuất trên web; kho nguồn giảm tồn khi thực xuất.
4. Kho đích mở công việc nhận, chọn điểm nhận, bắt đầu nhận rồi nhập tốt/hỏng/thiếu. Tổng phải khớp đã xuất. Hàng hỏng cần vị trí cách biệt hợp lệ và mã xác nhận.
5. Giữ hàng đạt tại khu nhận: xác nhận → Đã hoàn tất nhận hàng (hoặc có chênh lệch). Hàng đạt khả dụng theo FEFO tại vị trí hiện tại; không bị chuyển bắt buộc sang cất. Việc cất tùy chọn hủy với đúng lý do; chênh lệch vẫn cần người có quyền xử lý.
6. Muốn cất sau: Xem phiếu cất được giao → Tiếp tục cất phần hàng còn ở khu nhận → xác nhận → nhập vị trí/sản phẩm/số thực cất. Chỉ cất lượng chưa bị giữ cho việc khác; tổng tồn và số lần nhập tồn không tăng. Nếu chọn tiếp tục cất ngay từ bước nhận, làm theo công việc cất bình thường.

Khi mạng lỗi hoặc dữ liệu đổi, tải lại để xem kết quả đã lưu trước khi tạo thao tác mới. API vẫn kiểm tra quyền, kho, phiên bản và mã lệnh. Giao diện camera thật còn chờ thiết bị; nhập tay mã QR là luồng đã kiểm thử trong browser, không thay thế camera acceptance.

Bằng chứng cục bộ: dossier outputs/workflow/modules/mobile-rollout, báo cáo p26-crossdock-summary.md. Không có fullmodule claim do nguồn UC hiện chưa cung cấp đủ.
