# Định vị hàng trên sơ đồ kho — mobile

## Phạm vi

Tái sử dụng GET `/warehouses/{id}/layout/scene` hiện có. Không tạo sơ đồ thứ hai, không thay đổi BE/FE hoặc quyền. Người dùng cần quyền `warehouses:view`, quyền xem màn hình nghiệp vụ và phạm vi kho đang hoạt động.

Màn Tồn kho đã có tìm tên/SKU. Bổ sung này nối chi tiết tồn và nguồn phân bổ trên phiếu xuất với sơ đồ trực quan, không phải chức năng tìm kiếm mới hay bộ tối ưu tuyến.

## Hành trình nghiệm thu

1. Staff chọn kho được giao -> tìm tên/SKU trong Tồn kho -> mở dòng tồn mới nhất -> **Tìm vị trí trên sơ đồ**. Màn hình hiện Khu/Kệ/Ô và làm nổi bật kệ đúng theo slotId. Có **Xem toàn kho** và **Tập trung kệ cần tìm**; đóng trở lại dòng tồn, không ghi nghiệp vụ.
2. Mở công việc lấy hàng xuất kho -> chọn nguồn được giữ cho phiếu -> **Xem nguồn lấy trên sơ đồ**. Đổi nguồn trong dropdown phải mở đúng slotId của nguồn mới, không mở nguồn đầu tiên hoặc tự chọn lô gần hơn. Đóng sơ đồ và lấy hàng vẫn dùng editor/quét mã/xác nhận hiện có.
3. Với kệ quản lý theo kệ, defaultSlotId có thể không nằm trong scene.slots; vẫn phải tìm đúng kệ. Với kệ chưa có geometry, hiện đường dẫn và thông báo chưa đặt lên sơ đồ, không vẽ vị trí giả.
4. Nếu nguồn/phiếu đổi phiên bản, đang tải lại, đổi kho/tài khoản/quyền hoặc không còn quyền, không giữ bản đồ/nhãn của nguồn cũ. Dữ liệu sơ đồ sai warehouseId phải bị từ chối.
5. Mất mạng, 403 hoặc sơ đồ chưa hợp lệ -> hiện thông báo và Tải lại/Đóng. Không hiển thị cached geometry như kết quả mới, không khóa toàn bộ luồng lấy hàng hoặc giả số tồn bằng 0.
6. Kiểm tra trên điện thoại nhỏ/font lớn, nút Back/Đóng, focus/toàn kho, nhãn kệ và rack rotation. Sơ đồ chỉ biết vị trí kệ, không có tọa độ ô/tầng riêng hoặc vị trí hiện tại của nhân viên.

## Bằng chứng đã chạy

45 test tập trung: 14 test map/parser/API/scope/component và 31 test tồn/lookup/operations/staff workflow liên quan. Dùng source thật với HTTP/native/UI fixture; không phải live backend hoặc native-phone acceptance. TypeScript và Expo lint pass. Android devices list trống, chưa chạy trên emulator/điện thoại. Không có server, DB writes, migration, EAS publish hay deploy trong task này.

## Chứng minh hiệu quả

Đo cùng người thử và nhiệm vụ tương đương, đảo thứ tự baseline/nâng cấp: thời gian tìm vị trí đầu tiên, số lần mở màn hình, lỗi chọn/quét vị trí và thời gian hoàn tất. Chưa có số liệu này; không tuyên bố giảm phần trăm thời gian hoặc nhanh hơn WMS khác.

Tối ưu tuyến là bước riêng: cần xác nhận mạng lối đi/điểm tiếp cận/hướng đi và đơn vị chiều dài từ sơ đồ. Decoration Aisle/DirectionArrow không tự chứng minh một cạnh đi được. Không dùng đường thẳng xuyên kệ hoặc đổi allocation/FEFO để làm tuyến ngắn hơn.
