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
6. Khi hàng thực tế rời kho, chọn đúng lượt trong Chọn phần hàng đã rời kho → xác nhận.
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
