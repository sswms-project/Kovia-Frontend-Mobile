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
