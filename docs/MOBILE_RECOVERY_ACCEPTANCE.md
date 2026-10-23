# P24 — Nhận khách trả, khôi phục form và bằng chứng

## Phạm vi mobile

- Nhận khách trả: chỉ xác nhận phiếu đã duyệt bằng quyền `goods-return-requests:restock`; không thêm tạo/duyệt hoặc xử lý tiêu hủy trên mobile. Cần đọc phiếu xuất gốc và vị trí trong đúng kho đang chọn.
- API hiện tại nhận toàn bộ phiếu một lần. Hàng tốt khả dụng tại vị trí đã duyệt; hàng hỏng/hết hạn vào trạng thái giữ, tại vị trí cách biệt. Nếu số thực tế khác phiếu, dừng thao tác và nhờ quản lý xử lý trên web. Người dùng đã chọn giữ nguyên BE cho giai đoạn này.
- Không tự gửi lại khi mất kết nối. Luồng BE này chưa nhận commandId/expectedVersion; kiểm tra lại trước khi gửi chỉ là bảo vệ phía client, không thay thế kiểm soát đồng thời của server.
- Lưu nháp cho nhận hàng, cất/cách biệt, lấy hàng xuất, kiểm kê, lấy/nhận/cất điều chuyển, chuyển vị trí, báo hỏng và báo chênh lệch. Form/chứng từ cũ thiếu phiên bản không được cam kết khôi phục.
- Xem ảnh đã lưu ở báo hỏng, chênh lệch, kiểm kê, bằng chứng từ chối nhận và sai lệch cất hàng. Server vẫn kiểm tra tenant/kho/quyền; đường đọc ảnh nhận hàng dùng quyền xem tồn của API hiện tại.

## Cách khôi phục

1. Nhập form và chờ khoảng nửa giây; app cũng thử lưu ngay khi chuyển nền.
2. Mở lại app bằng cùng tài khoản, chọn đúng kho, mở lại chứng từ và cùng dòng nhập.
3. Chọn **Khôi phục**. Kiểm tra số lượng/ghi chú, quét lại mã và thêm lại ảnh trước khi gửi.
4. Bản nháp khác phiên bản không được đưa vào chứng từ mới. Nếu app đóng trong lúc gửi, kiểm tra lịch sử/kết quả trên server trước khi nhập lại.

Bản nháp lưu trong SecureStore, tách theo máy chủ/tài khoản/tenant/kho/chứng từ/dòng, tối đa 12 form, hạn 24 giờ và khoảng 20.000 ký tự mỗi form (gồm metadata). Không lưu mật khẩu, token, URI ảnh hay hàng đợi ghi tồn. Form lớn vẫn gửi lên server được; bản nháp quá lớn báo rõ chưa lưu. Bỏ thay đổi, lưu thành công hoặc đăng xuất sẽ xóa nháp. Phiên bị thu hồi/hết hạn dẫn đến đăng xuất cũng xóa nháp; không dùng nháp làm bản sao lưu lâu dài. Kill ngay trước khi lưu xong có thể mất ký tự cuối.

## Nghiệm thu đã chạy

- 47 kiểm tra logic/contract tập trung: phục hồi, phân trang, nhận hàng, kiểm kê/xuất và tra mã; không phải full suite.
- LDPlayer Android 14 / Expo Go: đăng nhập, chọn kho, mở/thoát camera bằng Back, nhập mã tay và nhận đúng tồn từ API.
- Native kiểm kê: bắt đầu → nhập 10 + ghi chú → chuyển nền → force-stop → mở lại → chọn kho → khôi phục đúng → chọn ảnh QA → lưu số đếm/ảnh → mở ảnh từ API → gửi quản lý. Đối chiếu SQL: Submitted, counted10/damaged1, OnHand vẫn10.
- Native nhận khách trả: Approved → đối chiếu vị trí → xác nhận → Restocked. SQL/API: OnHand8→10, hàng tốt9 tại S01, hàng hỏng1 tại Q01/DamageHold/Available0; đúng hai ReturnIn, tổng2. Gửi lại tuần tự409 không đổi tồn; Staff không có quyền bị403, khác tenant bị chặn.
- Header/dòng phiếu trả Approved là fixture trong DB test; bước xuất trước đó dùng API thật. Không tuyên bố đã nghiệm thu tạo/duyệt phiếu trả.

## Còn cần kiểm tra

- Điện thoại thật: đọc mã quang học, rung/flash, chụp hàng thật, chất lượng ảnh và nhiều kích thước màn hình. LDPlayer chỉ có preview xanh và không có Activity xử lý chụp ảnh; đã thử và chuyển sang chọn ảnh có sẵn.
- Các form khác dùng chung lưu nháp đã typecheck/lint nhưng chưa force-stop nghiệm thu từng luồng. Đổi quyền/phiên bản trong khi khôi phục và timeout ghi thực tế chưa chạy native toàn bộ.
- Chứng từ cũ: tìm tiếp sau 20 trang đã kiểm tra logic; chưa có bộ dữ liệu thật >2.000 công việc để nghiệm thu hiệu năng. API chưa có đọc trực tiếp theo ID cho các feed này.
- Phiếu kiểm kê QA đã gửi còn quan sát hỏng chưa được quản lý xác nhận; lượt xuất mẫu tiếp theo khiến snapshot cần đối soát trước khi hoàn tất. Đây là dữ liệu test, không tự chốt/điều chỉnh tồn.

Đích kiểm tra duy nhất: `KoviaMobile_Test_20261019`, dịch vụ email RAM, thanh toán bị chặn, Quartz tắt. Không sửa nguồn BE/FE hoặc migration mới. Người dùng đã duyệt commit/push mobile sau nghiệm thu; chưa yêu cầu PR/merge/deploy. Nghiệm thu camera thật được người dùng hoãn. Chi tiết và checkpoint: `D:\LEARN\capstone\Kovia\outputs\workflow\modules\mobile-rollout`.
