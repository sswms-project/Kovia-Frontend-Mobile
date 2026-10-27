# Đồng bộ giao diện Kovia Mobile với web — P35

Nguồn: `SSWMS-Frontend/src/app/index.css` và các primitive button/card/badge của web, đối chiếu ngày 26/10/2026. Áp dụng UI/UX Pro Max để kiểm tra chữ, vùng chạm, bàn phím, nội dung dài và chuyển động. Giữ thiết kế Kovia đã có; không dùng bảng màu/font khác do công cụ gợi ý.

| Thành phần | Quyết định trên mobile |
| --- | --- |
| Màu và font | Giữ token sáng/tối Kovia, Inter cho nội dung, JetBrains Mono cho mã, logo hiện hành từ web. |
| Thẻ/nút | Viền mảnh, thẻ bo 8px, nút/form bo 6px; không sao chép kích thước điều khiển desktop. |
| Nội dung | Nhãn 13px, nội dung 14–16px; mã và tên dài xuống dòng. Trạng thái có cả chữ và màu. |
| Vùng chạm | Các nút header, thao tác thông báo, bộ chọn và công việc được chỉnh đạt tối thiểu 48px. |
| Điều hướng | Điện thoại ưu tiên tên trang dễ đọc; màn rộng giữ breadcrumb Kovia. Giữ nguyên routes và phân quyền. |
| Bộ chọn | Bảng chọn phía dưới, tìm kiếm khi nhiều mục, nội dung co/cuộn và tránh bàn phím. |
| Xác nhận | Nội dung cuộn được khi màn thấp; nút xác nhận/quay lại giữ nguyên hành vi. |
| Thông báo | Giữ overlay; mở chứng từ và đánh dấu đã đọc là hai nút độc lập, không lồng nút. |
| Giao diện | Hồ sơ → Giao diện → Theo thiết bị/Sáng/Tối. Native lưu qua SecureStore; bản web QA chỉ lưu theo phiên tab. Lỗi lưu giữ lựa chọn trước và hiển thị thông báo. |
| Chuyển động | Tôn trọng giảm chuyển động cho navigation và modal dùng chung; bỏ hiệu ứng KPI không cần thiết. |

Phạm vi vai trò không đổi: Staff thực hiện tại hiện trường; Owner theo dõi và quyết định nhanh; tác vụ quản trị/lập kế hoạch phức tạp của Manager tiếp tục trên web. Không đổi DTO, endpoint, permission, thời điểm ghi tồn hoặc thuật toán FEFO/cross-docking.

Kiểm thử nhanh: mở trang chủ/công việc, chọn kho có tên dài, mở chi tiết rồi quay lại; đổi sáng/tối tại Hồ sơ; mở thông báo, mở hộp Đọc tất cả rồi Quay lại; xoay ngang và kiểm tra vẫn tới được các nút. Nghiệm thu camera, bàn phím Android và cỡ chữ hệ thống cần thiết bị thật, không suy từ RN Web.
