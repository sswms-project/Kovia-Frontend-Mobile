# P25 — Thông báo và mở công việc

Phạm vi mobile: nhân viên mở việc được giao từ thông báo; Owner/Manager tiếp tục các đích xem chứng từ đã có theo quyền. Không bổ sung quản trị hoặc thay đổi BE.

## Hướng dẫn nghiệm thu

1. Đăng nhập tài khoản test đã được phân công kho. Mở chuông thông báo; chuyển **Tất cả / Chưa đọc**, nhập từ khóa rồi bấm **Tìm thông báo** hoặc phím tìm trên bàn phím. Xóa từ khóa phải bỏ lọc tìm kiếm, giữ lựa chọn chưa đọc.
2. Bấm **Đánh dấu đã đọc** ở một thông báo. Thông báo được cập nhật sau API thành công; thao tác này không mở chứng từ. Với bộ lọc chưa đọc, dòng đã đọc biến mất sau khi tải lại.
3. Bấm thông báo công việc/điều chuyển. Trạng thái tra cứu và nút **Hủy tìm kiếm** nằm cố định phía trên danh sách. Hủy phải dừng request và không chuyển trang sau đó.
4. Với dữ liệu nhiều trang, sau tối đa 20 trang mỗi lượt, bấm **Tìm tiếp**. App tiếp tục từ trang kế tiếp, giữ các kết quả phù hợp đã tìm được. Chưa tải hết không được báo không tồn tại hoặc tự chọn một kết quả chưa đầy đủ.
5. Khi tìm hết công việc hiện tại: mở một kết quả hoặc chọn đúng đợt nếu có nhiều kết quả. Chỉ tìm lịch sử khi không có kết quả hiện tại. Không có ở cả hai nguồn mới báo không tìm thấy trong kho/phân công hiện tại.
6. Mất mạng khi tìm: hiển thị lỗi tại chỗ và **Thử lại**. Đổi kho/tài khoản/quyền trong lúc tìm không được mở công việc thuộc phạm vi cũ. Khi tổng số công việc thay đổi giữa các trang, app yêu cầu tìm lại từ đầu.

## Giới hạn

- P25 đã kiểm tra tĩnh TypeScript/lint theo checkpoint; các bước trên **chưa nghiệm thu trực tiếp trên thiết bị/API thật** trong giai đoạn này.
- Cursor và kết quả tra cứu chỉ tồn tại trong phiên mở bảng thông báo; đóng bảng hoặc hủy sẽ tìm lại từ đầu. Đây không phải cơ chế offline.
- API hiện dùng phân trang offset, không có snapshot/token tìm theo ID chung. App phát hiện thay đổi tổng số nhưng không thể phát hiện mọi thay đổi thứ tự khi tổng số giữ nguyên; màn chi tiết vẫn tải lại và kiểm tra quyền/phân công.
- Camera thật tiếp tục hoãn theo quyết định trước đó của người dùng.
