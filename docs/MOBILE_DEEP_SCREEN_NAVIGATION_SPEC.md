# Spec — Điều hướng nhanh cho các màn sâu trên mobile

Ngày: 2026-10-28. Bản sửa 2: xử lý ba findings của vòng review spec và xác nhận giữ nguyên Trang chủ hiện tại. Trạng thái: sẵn sàng triển khai, chưa triển khai theo spec này.

## 1. Mục tiêu

Nhân viên mở chứng từ từ Công việc, thực hiện nhận/cất/xuất hàng hoặc kiểm kê, rồi về Trang chủ bằng một lần bấm khi không còn dữ liệu cần bảo vệ. Không phụ thuộc nút Back của Android. Dùng nhất quán trên Android và iOS.

Các yêu cầu bắt buộc:

- Màn sâu có đường quay lại và đường về Trang chủ dễ tìm, kể cả khi đang cuộn, tải dữ liệu, lỗi hoặc bị mất quyền.
- Rời màn hình không gọi API hủy, trả lại, tạm dừng hay hoàn tất công việc; không tự gửi duyệt hoặc ghi tồn.
- Bảo vệ dữ liệu nhập dở, ảnh chưa gắn vào chứng từ và kết quả ghi chưa xác định.
- Sau khi thoát luồng đã hoàn tất, Back không mở lại form cũ có khả năng gửi lại dữ liệu.
- Giữ nguyên luồng đang chờ duyệt tự chuyển sang cất hàng khi người dùng ở lại màn và được giao việc cất.

## 2. Hiện trạng đã kiểm tra

- `src/app/_layout.tsx` ẩn header của root stack.
- `src/app/(account)/_layout.tsx` ẩn header cho toàn bộ nhóm thực hiện công việc.
- `src/features/receiving/screens/receiving-screen.tsx` dùng tiêu đề trong nội dung danh sách, chưa có header điều hướng chung. Cả nhận hàng và cất hàng dùng screen này.
- Một số màn xuất/kiểm kê/di chuyển hàng đã có nút quay về trong nội dung; vị trí và hành vi chưa thống nhất, có thể cuộn khỏi màn hình.
- Các stack `tasks`, `catalog`, `inventory` có header sẵn cho màn sâu; cần bổ sung hành động Trang chủ mà không tạo header thứ hai.
- Form nhận hàng/phân bổ cất hàng và nhiều editor dùng React Native `Modal`. Chỉ thay đổi route bên dưới sẽ không đảm bảo đóng các modal hoặc dọn camera.
- `use-form-draft.ts` đã có bản nháp theo scope, phiên bản và marker đang gửi. Nháp trên máy không thay thế lưu phiếu lên BE và không khôi phục ảnh hoặc xác nhận quét mã.

Đây là đặc tả dựa trên source hiện tại, chưa phải kết quả nghiệm thu giao diện trên thiết bị.

## 3. Phạm vi

### 3.1. Màn thực hiện công việc — bắt buộc

| Route trong `src/app/(account)` | Screen thực tế | Tiêu đề đề xuất |
| --- | --- | --- |
| `receiving/[id].tsx` | `ReceivingScreen`, mode receiving | Nhận hàng |
| `putaway/[id].tsx` | `ReceivingScreen`, mode putaway | Cất hàng |
| `stock-issue/[id].tsx` | `StockIssueScreen` | Thực hiện xuất hàng |
| `cycle-count/[id].tsx` | `CycleCountScreen` | Kiểm kê |
| `relocation/[id].tsx` | `RelocationScreen` | Di chuyển hàng |
| `transfer-pick/[id].tsx` | `TransferPickingScreen` | Lấy hàng điều chuyển |
| `transfer-receipt/[id].tsx` | `TransferReceivingScreen`, mode Receive | Nhận hàng điều chuyển |
| `transfer-putaway/[id].tsx` | `TransferReceivingScreen`, mode PutAway | Cất hàng điều chuyển |

Giữ nguyên tham số route, đặc biệt `shipmentId` của điều chuyển. Không tạo route nghiệp vụ mới hoặc đổi ID chứng từ thành ID task.

### 3.2. Màn sâu còn lại — hoàn tất trong cùng đợt triển khai

- Chi tiết công việc, lịch sử công việc: dùng header stack hiện có, thêm Trang chủ.
- Chi tiết/danh sách con trong Catalog và Inventory: dùng header stack hiện có, thêm Trang chủ.
- `receiving-review`, `smart-allocation`, `security`: bổ sung cùng quy tắc khi chưa có đường thoát tương đương; form thay đổi dữ liệu phải khai báo trạng thái bảo vệ riêng.
- Màn trạng thái không tìm thấy chứng từ, không có quyền hoặc lỗi tải phải vẫn có đường về Trang chủ.
- Tab gốc đã có thanh điều hướng dưới không thêm icon Trang chủ trùng lặp. Không đổi màn đăng nhập, 2FA, quên mật khẩu hoặc auth gate.
- Thông báo, camera, chọn vị trí và xem ảnh là màn phụ: có Đóng/Quay lại rõ ràng, trả về nơi đã mở chúng. Không biến nút Đóng thành về Trang chủ.

## 4. Thiết kế header

```text
┌──────────────────────────────────────┐
│  ←    Cất hàng                    ⌂  │
│       PN000003                       │
└──────────────────────────────────────┘
```

- Trái: icon mũi tên, nhãn hỗ trợ đọc màn hình `Quay lại`.
- Giữa: tên thao tác; dòng phụ là mã chứng từ nếu đã có. Khi tải chưa xong, giữ tiêu đề chung, không để header nhảy chiều cao.
- Phải: icon `House` hoặc icon nhà sẵn có trong bộ icon, nhãn `Về trang chủ`. Không giấu trong menu ba chấm.
- Header nằm ngoài vùng cuộn, tôn trọng safe area, màu/chữ lấy từ theme và hỗ trợ dark mode.
- Vùng bấm tối thiểu 48 × 48 logical pixels; có trạng thái nhấn, disabled và nhãn accessibility. Không chỉ đổi màu để biểu thị disabled.
- Tiêu đề dài được giới hạn dòng/cắt gọn hợp lý; không đẩy hai nút khỏi màn hình ở chiều rộng 320 hoặc khi tăng cỡ chữ.
- Không chồng header nghiệp vụ với header stack. Các màn đã có header stack dùng header hiện tại; các full-screen editor/modal có header riêng cùng kiểu.
- Tiêu đề/mã phiếu trùng lặp trong nội dung được thu gọn khi phù hợp; giữ thông tin kho và trạng thái chứng từ cần thiết cho thao tác.
- Bố cục camera tiếp tục ưu tiên khung quét và nút Đóng. Picker/xem ảnh dùng Đóng hoặc Quay lại; không cần thêm Trang chủ trong từng popup nhỏ.

## 5. Hành vi điều hướng

### 5.1. Quay lại

1. Nếu có màn phụ đang mở: đóng màn phụ gần nhất, giữ nguyên form phía dưới.
2. Nếu đang ở editor toàn màn hình: về chứng từ cha, áp dụng bảo vệ dữ liệu ở mục 6.
3. Nếu đang xem chứng từ: quay lại màn mở nó nếu còn lịch sử phù hợp.
4. Mở bằng thông báo/deep link và không có lịch sử: về Công việc nếu người dùng được phép truy cập; nếu không, về Trang chủ.

Không đặt tên nút `Về công việc` nhưng chỉ gọi Back tùy ý: nếu dùng nhãn này, đích phải thực sự là danh sách Công việc.

### 5.2. Về Trang chủ

- Đích là tab Trang chủ của phiên đã đăng nhập, tương ứng `/`. Giữ kho đang chọn; không tự chọn kho khác hoặc đăng xuất.
- Giữ nguyên giao diện, bố cục, chức năng và hành vi của Trang chủ hiện tại. Không tạo màn Home thay thế, không thêm màn trung gian và không thiết kế lại dashboard/thanh tab. Dữ liệu có thể cập nhật theo cơ chế refetch hiện có; việc này không đồng nghĩa với reset lựa chọn kho hoặc thiết kế lại Trang chủ.
- Với trạng thái sạch hoặc công việc đã hoàn tất: một lần bấm, không hỏi xác nhận dư thừa.
- Thu gọn các màn thuộc luồng đang thoát và đóng modal thuộc luồng đó. Không chỉ push một bản Trang chủ lên trên form.
- Sau khi về, Back không mở lại editor/chứng từ trong luồng đã thoát. Các tab khác không bị reset hoặc mất bộ lọc không liên quan.
- Dọn camera, timers/polling và subscription do màn sở hữu khi blur/unmount. Không ngắt kết nối dùng chung toàn ứng dụng.
- Nhấn lặp nhanh chỉ tạo một chuyển hướng. Không để callback đến muộn từ request cũ kéo người dùng trở lại luồng.
- Auth gate vẫn quyết định đích nếu phiên hết hạn; nút Trang chủ không vượt qua đăng nhập hoặc kiểm tra quyền.

Đường thoát của native stack, tab stack, deep link và React Native Modal cần được kiểm tra riêng. Không giả định `dismissAll` luôn về root vì nó chỉ đóng về đầu stack gần nhất.

### 5.3. Sau khi hoàn tất hoặc chờ duyệt

- Khi server xác nhận hoàn tất toàn bộ bước công việc và không còn editor đang mở, hiển thị thông báo kết quả với `Về công việc` và `Trang chủ`.
- Chỉ đưa ra kết luận hoàn tất theo trạng thái server hiện tại; lưu thành công một phần hoặc một dòng không được coi là hoàn tất cả task.
- Không tự đẩy về Trang chủ ngay sau lưu; người dùng còn cần kiểm tra kết quả và lịch sử.
- Chờ manager duyệt: có thể về Trang chủ ngay nếu không còn dữ liệu chưa lưu; phiếu vẫn chờ duyệt trên BE.
- Nếu ở lại: giữ `useReceiptHandoff` và các điều kiện phân công/quyền/phiên bản hiện tại. Nếu đã rời: kết quả polling đến muộn không được chuyển màn.
- Ý định rời màn có ưu tiên hơn handoff tự động. Áp dụng thứ tự và khóa tại mục 6.4, kể cả khi dialog đang hỏi hoặc modal chưa đóng xong.
- Manager duyệt và giữ tại khu nhận: phiếu hoàn tất theo BE, không tự mở cất hàng. Header và nút về vẫn hoạt động.

## 6. Bảo vệ dữ liệu khi rời màn

Áp dụng cùng chính sách cho nút header, Back Android, gesture back iOS và các hành động điều hướng do ứng dụng thực hiện. Trước khi hỏi xác nhận hoặc đóng modal, phải khóa ý định rời và tạm dừng handoff theo mục 6.4. Chỉ đóng modal và đổi route sau khi guard chấp thuận.

| Trạng thái thực tế | Chính sách |
| --- | --- |
| Chỉ xem dữ liệu; không có nhập dở/ảnh chưa gắn | Rời ngay |
| Có sửa đổi chưa lưu, chưa gửi request | Hỏi giữ nội dung hoặc bỏ nội dung trước khi rời |
| Có ảnh upload nhưng chưa gắn vào chứng từ | Cảnh báo ảnh chưa được lưu cùng phiếu, kể cả form không còn dirty |
| Đang upload/chụp/chọn ảnh | Chặn chuyển hướng trùng; hoàn tất hoặc hủy an toàn trước khi thoát, không báo ảnh đã gắn |
| Đang gửi lệnh nghiệp vụ lên BE | Khóa thoát tạm thời, hiển thị đang xử lý; không hủy request rồi coi như chưa ghi |
| BE trả 400/422 xác định là lần gửi bị từ chối | Theo logic hiện có: cho sửa, giữ dữ liệu, áp dụng cảnh báo nhập dở |
| Mất phản hồi/timeout, chưa biết lệnh thành công không | Trong phiên màn còn mở giữ command/payload chính xác; trước khi unmount bảo toàn metadata đối soát và pending marker theo mục 6.3, không hứa khôi phục payload từ nháp |
| 409 hoặc phiên bản/phân công đã đổi | Yêu cầu tải lại/đối soát; không tự mang form cũ sang phiên bản mới |

Nếu nhiều trạng thái cùng đúng, đang gửi hoặc kết quả chưa xác định được ưu tiên trước dirty/ảnh chưa gắn. Không hiện `Bỏ thay đổi` hoặc `Giữ nháp` như cách xóa/ghi đè pending marker; nhánh kết quả chưa xác định phải theo mục 6.3. Thông báo công việc hoàn tất cũng không được bỏ qua một thao tác khác còn đang treo.

### 6.1. Form nhập dở

Nội dung hộp thoại: `Bạn có dữ liệu chưa lưu. Bạn muốn tiếp tục nhập hay rời màn hình?`

- `Tiếp tục nhập`: đóng hộp thoại, giữ nguyên nội dung.
- `Bỏ thay đổi và về trang chủ` hoặc `Bỏ thay đổi và quay lại`: ghi rõ đúng đích; chỉ bỏ nháp của form hiện tại, không xóa nháp toàn tài khoản và không xóa phiếu đã lưu trên BE.
- `Giữ nháp trên máy và về`: chỉ hiện nếu form có version/scope hợp lệ và hỗ trợ nháp an toàn. Flush và await lưu nháp thành công trước khi rời. Lỗi lưu thì ở lại, báo lỗi và cho chọn lại; không tuyên bố đã giữ dữ liệu.

Tái sử dụng hộp thoại bỏ thay đổi hiện có nếu đáp ứng được chính sách. Mỗi ý định rời chỉ có một hộp thoại, không hỏi liên tiếp do header guard và form guard cùng hoạt động.

### 6.2. Phân biệt nháp trên máy, nháp BE và ảnh

- Nút `Giữ nháp trên máy` không gửi create/update/submit lên BE. Form chưa đủ hợp lệ vẫn có thể giữ nội dung nếu cơ chế nháp hiện tại cho phép.
- `Lưu phiếu nháp` là hành động nghiệp vụ đã có trong editor; tiếp tục theo đúng API/quyền/phiên bản/idempotency hiện tại. Không âm thầm gọi hành động này khi bấm Trang chủ.
- Không thêm cơ chế offline queue hoặc tự đồng bộ nghiệp vụ trong task này.
- Nháp trên máy không lưu ảnh/URI ảnh hoặc bằng chứng đã quét. Nêu rõ trước khi rời: `Bản nháp chỉ giữ nội dung nhập. Bạn cần thêm lại ảnh và quét lại mã khi mở lại.`
- Ảnh upload thành công nhưng chưa attach vẫn là ảnh chưa lưu cùng phiếu. Nếu có ảnh này, cảnh báo bổ sung phải xuất hiện ngay trong cùng hộp thoại rời màn.
- Nếu người dùng muốn gắn ảnh vào phiếu, tiếp tục đúng thao tác được BE hỗ trợ; không hứa rằng lưu nháp BE đã gắn ảnh nếu API hiện tại chỉ gắn khi gửi duyệt.
- Giữ ảnh trong cùng phiên màn đang mở theo `evidenceKey` hiện có. Không mở rộng lưu ảnh lâu dài để giải quyết điều hướng.

#### Xác định ảnh chưa gắn sau khi gửi

- Không dùng `files.length > 0` làm điều kiện duy nhất để cảnh báo. Hai hook ảnh hiện giữ danh sách upload theo evidenceKey sau khi lưu; danh sách này không tự biểu thị trạng thái attachment trên BE.
- Theo từng receipt/scope và từng loại ảnh, tập ID chưa gắn bằng tập ID upload của phiên trừ các ID đã được BE xác nhận gắn. Đối chiếu `receipt.documentEvidence` với ảnh phiếu giao và `receipt.refusalEvidence` với ảnh từ chối; không trộn hai loại.
- Có thể ghi nhận attachment khi submit trả thành công xác định, dựa trên đúng snapshot ID của request đó và hợp đồng BE xác nhận attach trong cùng transaction. Hoặc đối chiếu từ detail mới được tải thành công của đúng receipt/scope. Không coi create/update/lưu nháp thành công là xác nhận attach.
- Sau xác nhận, loại những ID tương ứng khỏi tập ảnh chưa gắn hoặc đánh dấu đã gắn trong trạng thái phiên; không gọi API xóa ảnh và không làm mất ảnh đã lưu trong lịch sử chứng từ. Ảnh mới bổ sung sau đó vẫn là chưa gắn.
- Timeout, lỗi submit hoặc thất bại khi tải detail không phải xác nhận ảnh đã gắn hay đã mất. Giữ trạng thái chưa xác định cùng lệnh theo mục 6.3. Kết quả từ receipt/scope cũ không được làm sạch tập ảnh của phiên mới.
- Nếu submit đã xác nhận attach thành công nhưng refetch detail tạm lỗi/còn cache cũ, không đổi những ảnh đã xác nhận thành ảnh chưa gắn chỉ vì chúng chưa xuất hiện trong cache. Lỗi tải vẫn được báo riêng.
- Sau gửi duyệt thành công, không còn nhập dở hay kết quả lệnh chưa xác định, Home phải hoạt động một lần bấm mà không cảnh báo mất những ảnh đã gắn. Các guard dữ liệu khác vẫn giữ nguyên.

### 6.3. Kết quả gửi chưa xác định

#### Phân biệt bộ nhớ phiên và dữ liệu khôi phục

- Hiện command/payload của receipt editor nằm trong ref, còn phân bổ cất hàng giữ request review trong state. Unmount làm mất các giá trị này. `useFormDraft` hiện chỉ lưu `pending: true` với `values: {}`; marker đó không chứa commandId/payload và không đủ để cam kết khôi phục lệnh chính xác.
- Khi màn còn mở, tiếp tục dùng nguyên commandId/payload đã đóng băng để retry tường minh theo cơ chế hiện có. Không biến timeout thành trạng thái sạch hoặc sinh command mới.
- Khi cho rời màn hoặc mở lại sau process restart trong cùng phiên đăng nhập còn hợp lệ, chỉ cam kết khôi phục thông tin để đối soát. Không persist full payload, ảnh, URI ảnh hay bằng chứng quét; không phát triển hàng đợi gửi lại. Payload cũ không có trong bộ nhớ thì không cung cấp nút retry bằng một payload được dựng lại.

#### Metadata phải lưu bền vững

- Mở rộng tối thiểu bản ghi pending của cơ chế lưu nháp an toàn hiện có với metadata tùy chọn: loại thao tác/bước đang gửi, commandId, fingerprint của request, expectedVersion, các ID inbound/task/receipt đã biết, thời điểm gửi và scope máy chủ/tài khoản/kho/chứng từ. Không lưu token, mật khẩu, mã OTP hoặc nội dung ảnh trong metadata.
- Tạo command trước, await lưu pending marker kèm metadata và xác minh scope trước khi phát request nghiệp vụ có idempotency. Nếu lưu thất bại, không phát request mới. Metadata không thay thế kiểm tra phiên bản/quyền của BE.
- Với chuỗi create → submit, sau create thành công phải bảo toàn receiptId và bước đã xác nhận trước khi phát submit; cập nhật commandId/expectedVersion của bước submit tương ứng. Sau khi về Home, phải biết đang đối soát create hay submit trên phiếu nào, không tạo lại phiếu do quên bước đã lưu.
- Bản ghi pending chưa đối soát không bị TTL hoặc cơ chế giới hạn số lượng nháp thường tự xóa/ghi đè. Nếu không còn chỗ bảo toàn an toàn thì báo lỗi trước khi phát lệnh mới. Giữ quy tắc dọn dữ liệu khi logout/thu hồi phiên hiện có; không hứa khôi phục metadata sau khi phiên đã bị xóa.
- Đọc được bản pending cũ chưa có metadata: coi là chưa xác định, không phục hồi payload hoặc bật retry tự động. Hướng dẫn kiểm tra chứng từ/lịch sử hoặc nhờ quản lý khi không đủ thông tin. Không tự tạo command thay thế.

#### Quy trình đối soát và rời màn

- Cung cấp `Kiểm tra kết quả` bằng API đọc hiện có và `Về trang chủ` sau cảnh báo rõ ràng nếu bản ghi pending đã được bảo toàn. Không giữ người dùng kẹt vô hạn chỉ vì mất mạng. Không cần bổ sung API BE trong phạm vi này.
- Khi mở lại, tải đúng chứng từ/task/lịch sử trong scope hiện hành và xác định kết quả của bước đang treo. Không coi một status mới bất kỳ, version khác, hoặc một phiếu khác trên cùng inbound là bằng chứng đủ cho chính lệnh đó. Nếu API hiện có không chứng minh được kết quả, giữ trạng thái chưa xác định và hướng dẫn quản lý đối soát; không tự kết luận thành công/thất bại.
- Bấm `Đã hiểu`, đóng cảnh báo hoặc vào Home không phải bằng chứng đối soát. Cần thay đổi nhánh pending hiện đang xóa marker khi người dùng bấm `Đã hiểu` trong `useFormDraft`: marker chưa giải quyết phải tiếp tục tồn tại và chặn gửi lệnh thay thế trên cùng đối tượng liên quan.
- Chỉ giải phóng marker khi có kết quả đủ xác định của đúng thao tác/bước: server xác nhận thành công, xác nhận từ chối an toàn theo quy tắc retry hiện có, hoặc kết quả đối soát có bằng chứng tương ứng. Không có thao tác xóa marker thủ công để bỏ qua việc đối soát trong UI này.
- Marker chỉ bảo vệ đối tượng/bước có liên quan, không khóa toàn ứng dụng hoặc việc không liên quan. Mount/focus/Home không tự gửi lại lệnh. Nếu phiên hoặc quyền đã mất, chuyển theo auth/access gate; không ghi nháp nhầm scope hoặc vượt quyền để đọc kết quả.

### 6.4. Thứ tự thoát và handoff tự động

1. Ngay khi tiếp nhận ý định Home/Back cần bảo vệ, đặt khóa rời màn đồng bộ, gắn với scope và thế hệ ý định hiện hành; chặn nhấn lặp trước mọi await/dialog. Khóa này tạm dừng handoff ngay cả khi editor/modal còn mở hoặc đang đóng.
2. Kiểm tra trạng thái dữ liệu/lệnh; hỏi tối đa một dialog và await lưu/bỏ nháp hoặc bảo toàn metadata cần thiết. Trong toàn bộ thời gian này, handoff không được điều hướng.
3. Nếu người dùng chọn tiếp tục nhập, chỉ hủy đúng ý định còn hiệu lực; không đóng modal hoặc xóa dữ liệu. Giải phóng khóa rồi cho handoff kiểm tra lại trạng thái/quyền/phiên bản hiện tại, không phát lại kết quả đã treo từ callback cũ.
4. Nếu được phép rời, giữ khóa qua toàn bộ bước đóng modal → đổi route → blur/unmount. Đóng modal không tự giải phóng khóa. Không mở một khoảng trống để handoff chuyển sang cất hàng trước khi Home hoàn tất.
5. `useReceiptHandoff` phải biết khóa rời màn và kiểm tra lại ngay trước `router.replace`, sau các await. Chỉ thêm paused state chờ render/effect cleanup là chưa đủ để chặn callback đang chạy. Callback giữ ý định/scope/thế hệ cũ phải bỏ kết quả.
6. Khi đổi tài khoản/kho/chứng từ hoặc rời màn đã hoàn tất, vô hiệu hóa ý định và callback cũ. Không reset khóa cũ rồi để một response cũ điều hướng trên scope mới. Nếu manager duyệt trong lúc dialog đang mở, ưu tiên quyết định thoát của người dùng; nếu người dùng hủy thoát và vẫn đủ điều kiện, handoff mới có thể tiếp tục.

## 7. Hướng triển khai trong kiến trúc hiện tại

1. Tạo một header trình bày dùng chung trong `src/components/`, nhận title/subtitle, callback Back/Home và trạng thái chặn tương tác. Không fetch profile/notification hoặc tự gọi API nghiệp vụ trong header.
2. Screen/hook nghiệp vụ sở hữu trạng thái dirty, ảnh chưa gắn, upload, pending, uncertain và callback lưu/bỏ nháp. Không suy ra an toàn thoát chỉ từ `formState.isDirty`.
3. Tập trung hành động về Trang chủ và điều phối ý định rời ở một hook/module dùng chung khi đã có ít nhất hai caller. Dùng callback từ feature; không xây global registry hoặc lưu toàn bộ form/server state vào store mới.
4. Các stack đã có header dùng cấu hình headerRight chung; giữ back gốc khi phù hợp. Mỗi màn chỉ có một header. Màn full-screen Modal dùng cùng giao diện header nhưng phải đóng chính modal trước khi thoát route.
5. Đọc type/source của `expo-router` được cài và docs SDK 57 trước khi chọn API chặn rời/reset/dismiss. Không lấy ví dụ SDK 58 hoặc import `@react-navigation/*` trực tiếp để áp vào SDK 57.
6. Tái sử dụng `useFormDraft`, pending markers và cơ chế command hiện có, nhưng mở rộng metadata/retention/đối soát theo mục 6.3; không giữ nhánh xóa pending bằng xác nhận đã đọc cảnh báo. Expose flush/await-clear khi cần cho điều hướng, bảo vệ caller cũ và đọc tương thích marker cũ. Không tự coi marker cũ là lệnh có thể replay.
7. Khi bỏ nháp và rời phải await kết quả phù hợp. Không dùng callback fire-and-forget rồi thông báo đã bỏ/đã lưu chắc chắn; việc xóa nháp lỗi cần được thể hiện đúng.
8. Hủy ý định rời khi scope tài khoản/kho/chứng từ thay đổi. Callback từ dialog hoặc request cũ không được điều hướng hoặc ghi vào scope mới.
9. Invalidate/refetch danh sách công việc và chứng từ liên quan theo cơ chế hiện có sau khi ghi thành công; đối soát attachment theo mục 6.2; hành động Home thuần túy không tạo mutation nghiệp vụ mới hoặc thay đổi giao diện Trang chủ.

Các điểm tích hợp ưu tiên: account layout; các screen trong bảng 3.1; receipt-editor-modal, putaway-allocation-modal và các editor tương đương; stack tasks/catalog/inventory; use-form-draft và use-receipt-handoff nếu cần kết nối guard. Route files tiếp tục là thin shell.

Không cần sửa BE, FE web, schema DB hoặc thêm thư viện cho phạm vi này. Nếu xuất hiện yêu cầu vượt quá API/khả năng hiện có, báo rõ trước khi mở rộng phạm vi.

## 8. Trình tự triển khai

1. Kiểm kê tất cả route bảo vệ, full-screen modal, header và các lối thoát; lập bảng mỗi form có loại nháp, ảnh, trạng thái pending/uncertain nào. Không bật header account đại trà trước khi xử lý trùng header/safe area.
2. Triển khai header và hành động Home chung; kiểm tra các màn chỉ đọc, lỗi, mất quyền và deep link trước.
3. Tích hợp nhận/cất hàng, bao gồm editor, phân bổ, picker, camera và ảnh; bảo vệ các ca lưu một phần/mất phản hồi vừa được sửa.
4. Tích hợp xuất, kiểm kê, di chuyển, điều chuyển và các màn sâu còn lại. Giữ đường quay về nhất quán, không thay đổi quy tắc nghiệp vụ.
5. Bổ sung hành động sau hoàn tất; kiểm tra chờ duyệt/giữ tại khu nhận và callback đến muộn.
6. Chạy kiểm thử mục 9, cập nhật `docs/AI_REVIEW.md` với các giới hạn nghiệm thu thực tế. Không tự commit, push hay deploy.

## 9. Tiêu chí nghiệm thu

| ID | Kịch bản | Kết quả bắt buộc |
| --- | --- | --- |
| NAV-01 | Tasks → chi tiết → chứng từ nhận/cất; cuộn xuống cuối | Header vẫn hiện Back/Home; không chồng header |
| NAV-02 | Chứng từ sạch → Home | Một lần bấm về đúng tab Trang chủ; kho đang chọn được giữ |
| NAV-03 | Về Home rồi bấm Back | Không mở lại form/chứng từ của luồng đã thoát; không tạo bản Trang chủ trùng |
| NAV-04 | Mở chứng từ bằng deep link/thông báo | Back có đích dự phòng hợp lệ; Home vẫn hoạt động |
| NAV-05 | Form dirty → Home/Back/gesture | Một hộp thoại; Tiếp tục nhập giữ nguyên dữ liệu và vị trí thao tác |
| NAV-06 | Giữ nháp trên máy rồi mở lại | Đúng account/kho/chứng từ/version được phục hồi; mã quét cần quét lại; không gọi API ghi |
| NAV-07 | Lưu/xóa nháp thất bại | Thông báo đúng, không rời với lời hứa đã lưu/xóa thành công |
| NAV-08 | Bỏ thay đổi và về | Chỉ bỏ form/nháp thuộc luồng hiện tại; phiếu BE và nháp khác còn nguyên |
| NAV-09 | Upload ảnh → lưu phiếu nháp BE → Home | Cảnh báo ảnh chưa gắn dù form sạch; không báo ảnh đã attach |
| NAV-10 | Đang gửi lệnh; nhấn Home/Back liên tiếp | Không điều hướng đúp, không gửi đúp, không hủy rồi tái tạo lệnh |
| NAV-11 | Mất phản hồi create/submit/putaway → Home → mở lại | Đọc lại metadata và pending marker; đúng bước/receiptId, không tự retry, dựng lại payload hoặc tạo command mới |
| NAV-12 | Save thành công, submit bị từ chối 400/422 | Sửa trên đúng phiếu đã lưu; guard không làm mất dữ liệu hoặc tạo phiếu thứ hai |
| NAV-13 | 409/đổi version/phân công/quyền | Không phục hồi/gửi form cũ sai version; có lối thoát hợp lệ |
| NAV-14 | Chờ manager duyệt → Home, sau đó request polling cũ trả về Approved | Không kéo người dùng khỏi Home; nếu ở lại và đủ điều kiện thì handoff vẫn chạy |
| NAV-15 | Manager duyệt và giữ tại khu nhận | Không chuyển sang cất; có đích về Công việc/Home |
| NAV-16 | Hoàn tất một phần và hoàn tất toàn task | Chỉ toàn task mới hiện kết luận hoàn tất; kết quả từng phần vẫn chính xác |
| NAV-17 | Camera/picker/ảnh/editor lồng nhau → Đóng hoặc Back | Chỉ đóng lớp gần nhất; camera được giải phóng; dữ liệu form dưới còn nguyên |
| NAV-18 | Từ editor toàn màn hình → Home | Guard xử lý một lần; modal và luồng cha đóng đúng; không còn overlay che Home |
| NAV-19 | Đổi kho/đăng xuất khi dialog hoặc request còn mở | Callback cũ không ghi nháp, chuyển màn hoặc hiển thị dữ liệu thuộc scope cũ |
| NAV-20 | Nhận/cất/xuất/kiểm kê/di chuyển/điều chuyển và màn chỉ đọc | Cùng quy tắc; màn loading/error/forbidden/not-found không kẹt |
| NAV-21 | Màn nhỏ 320, màn thường, chữ lớn, dark mode | Hai nút nhìn thấy/bấm được; title không đè icon; safe area và bàn phím đúng |
| NAV-22 | Android Back và iOS gesture back | Cùng quyết định bảo vệ với nút header; không thoát bỏ qua guard |
| NAV-23 | Mất phản hồi → Home → process restart; nhấn Đã hiểu hoặc tải kết quả thất bại | Metadata vẫn bảo toàn trong phiên hợp lệ; chưa đủ bằng chứng thì marker không bị xóa và không gửi lệnh thay thế; marker cũ không metadata cũng không tự replay |
| NAV-24 | Manager duyệt lúc dialog Home/Back đang mở, lúc flush nháp hoặc lúc modal đang đóng | Khóa rời được đặt trước await; callback handoff cũ không chuyển màn; Home/Back đến đúng đích một lần |
| NAV-25 | Hủy thoát sau NAV-24 hoặc đổi scope khi dialog còn mở | Hủy thoát giữ form và cho phép handoff kiểm tra mới; đổi scope làm callback/dialog cũ mất hiệu lực |
| NAV-26 | Upload ảnh → submit xác nhận thành công → Home; refetch detail tạm lỗi/cache cũ | Không cảnh báo mất ảnh đã attach; có thể về một lần bấm nếu không còn guard khác. Lưu nháp không attach, submit timeout và ảnh mới bổ sung vẫn được bảo vệ |
| NAV-27 | Từ các màn sâu về Trang chủ sau sạch/hoàn tất | Đúng Trang chủ hiện tại, giữ bố cục/chức năng/thanh tab/kho; dữ liệu chỉ refresh theo cơ chế cũ, không xuất hiện Home mới |
| NAV-28 | Lưu metadata thất bại, đạt giới hạn nháp/TTL, hoặc create thành công rồi submit mất phản hồi | Không phát request mới nếu chưa bảo toàn marker; pending chưa giải quyết không bị eviction/TTL; chuỗi hai bước giữ đúng receiptId và bước cuối xác định |

Kiểm thử tự động tập trung vào hành vi điều hướng qua nested stack, guard, scope, draft flush, metadata pending qua unmount/restart, attachment đã xác nhận và callback trễ trong lúc đang thoát. Không chỉ snapshot JSX hoặc kiểm tra props của icon. Chạy các test nghiệp vụ receiving/editor/recovery/handoff hiện có để phát hiện regression; kiểm tra cả caller cũ của useFormDraft khi đổi retention/nhánh pending.

Chạy `pnpm exec tsc --noEmit` và `pnpm exec expo lint`. Ghi rõ lỗi baseline không thuộc task, không tuyên bố toàn suite pass nếu còn lỗi. Chưa chạy camera/gesture/modal thực tế trên Android/iOS thì ghi rõ chưa nghiệm thu native.

Ưu tiên fixtures và mock cho các test có ghi dữ liệu. Không khởi động BE, tự chạy migration, seed/cleanup hoặc ghi vào DB deploy để nghiệm thu điều hướng. Mọi live write phải tuân thủ AGENTS.md và xác minh đích hiệu lực; spec này không cấp quyền cho thao tác DB bổ sung.

## 10. Tài liệu tham chiếu

- Quy tắc repo: `../.rules`, `../AGENTS.md`.
- Lưu nháp/khôi phục hiện có: `MOBILE_RECOVERY_ACCEPTANCE.md`; đối chiếu source hiện tại khi tài liệu nghiệm thu cũ khác source.
- [Android — App bars](https://developer.android.com/develop/ui/compose/components/app-bars): vị trí navigation icon, title, actions và header dùng chung.
- [Expo SDK 57 — Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/): API điều hướng theo phiên bản đang dùng; đặc biệt phạm vi stack của dismiss và dismissAll.
- [Expo — Stack](https://docs.expo.dev/router/advanced/stack/): cấu hình header và stack; phải đối chiếu khả năng thực tế của SDK 57 trước triển khai.

Hoàn thành spec này nghĩa là triển khai và kiểm chứng toàn bộ phạm vi trên, đồng thời ghi rõ phần chưa chạy trên thiết bị. Bản spec hiện tại chưa thay đổi hành vi của ứng dụng.

## 11. Đối chiếu findings vòng review spec

| Finding | Trạng thái trong spec bản sửa 2 | Phần xử lý |
| --- | --- | --- |
| R1: command/payload mất sau unmount; marker hiện tại không đủ để khôi phục lệnh | Đã sửa đặc tả; chưa triển khai code | Mục 6.3 phân biệt retry trong bộ nhớ với metadata đối soát, bảo toàn trước gửi, không xóa pending bằng Đã hiểu; NAV-11/23/28 |
| R2: đóng editor có thể giải phóng paused và kích hoạt handoff trong lúc về Home | Đã sửa đặc tả; chưa triển khai code | Mục 6.4 quy định khóa đồng bộ, ưu tiên ý định thoát và kiểm tra callback trước điều hướng; NAV-24/25 |
| R3: danh sách upload còn ảnh sau submit dễ tạo cảnh báo ảnh chưa gắn giả | Đã sửa đặc tả; chưa triển khai code | Mục 6.2 quy định nguồn xác nhận attachment theo ID/loại ảnh/receipt/scope, không dùng files.length đơn lẻ; NAV-09/26 |

Ràng buộc bổ sung của người dùng: giữ nguyên Trang chủ hiện tại, mục 5.2 và NAV-27. Việc cập nhật spec không xác nhận rằng các ca nghiệm thu mới đã pass trên ứng dụng.
