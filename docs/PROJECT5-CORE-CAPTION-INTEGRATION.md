# Project 5 Core — tích hợp chọn ảnh, thuyết minh và bố cục

Trạng thái: **đã tích hợp trên nhánh thử nghiệm; CI và browser tests tự động đạt; còn cần nghiệm thu trực tiếp trên thiết bị và xác nhận upload Drive thực tế. Không merge production.**

## Đã tích hợp trong nhánh này
- `core/caption-tools.js`: API `PTI093CaptionTools` cho chuẩn hóa chữ, áp dụng chú thích theo ID có kiểm tra toàn bộ tập chọn trước khi thay đổi, và helper toggle selection.
- `skin/classic-image-grid.js`: click chọn một ảnh; Ctrl/Cmd-click chọn nhiều; Shift-click chọn dải; chế độ chọn nhiều cho mobile tap; khoanh vùng bằng chuột trên PC.
- Khi bật chế độ chọn nhiều, tạm vô hiệu hóa native drag/touch-reorder để tránh xung đột với khoanh vùng/chạm chọn; khi tắt chế độ này, thao tác kéo sắp xếp được khôi phục.
- Hộp thoại thuyết minh nhóm: đếm ảnh đã chọn, xem trước chuẩn hóa, Áp dụng, Hủy, đóng bằng Escape/nhấp nền. Kiểm tra toàn bộ ID trước khi sửa; chặn cập nhật khi đang mở hồ sơ khác; gọi autosave một lần.
- `skin/classic-layout.js` + `core/image-canvas.js`: điều chỉnh rowGap/columnGap; giá trị dùng chung cho layout preview và canvas xuất PDF.
- `core/draft-recovery.js`: lưu/khôi phục khoảng cách dòng/cột trong metadata AUTO-DRAFT; giới hạn giá trị 4–36 px.
- `css/project5-caption-tools.css`: giao diện chọn ảnh, khoanh vùng, hộp thoại và điều khiển khoảng cách.
- GitHub Actions có bước kiểm tra cú pháp, unit test, kiểm tra thứ tự asset và browser test bằng Chromium cho chọn ảnh, Shift/Ctrl, khoanh vùng, thuyết minh nhóm, mobile tap và khoảng cách bố cục.

## Bảo toàn
- Không thay đổi `fusion/drive.js` hoặc thuật toán upload Drive.
- Không thay đổi thuật toán kéo sắp xếp, xoay, thay/chèn/xóa ảnh; chỉ có guard để không chạy touch-reorder khi chế độ chọn nhiều đang bật.
- Thuyết minh nhóm chỉ sửa `item.caption` sau khi xác thực đầy đủ tập ID, sau đó gọi autosave hiện hữu một lần.
- Nhánh tích hợp được tạo từ `test/core-093-20261023`; PR vẫn ở trạng thái Draft, không merge production.

## Kết quả kiểm thử đã xác minh
- GitHub Actions run **1680**: PASS — [mở kết quả CI](https://github.com/ngocttgdbt-093/pti093/actions/runs/40629884983). Sau đó, bổ sung kiểm thử AUTO-DRAFT khôi phục rowGap/columnGap và GitHub Actions run **1684** PASS — [mở kết quả CI mới nhất](https://github.com/ngocttgdbt-093/pti093/actions/runs/40630588931).
- Kiểm tra cú pháp các module Core/Skin được sửa: PASS.
- Unit test caption core: PASS — chuẩn hóa tiếng Việt, áp dụng nhiều ảnh, ID thiếu/trùng không gây cập nhật một phần, toggle selection.
- Browser test bằng Chromium: PASS — click chọn đơn, Ctrl-click, Shift-click, preview chuẩn hóa, áp dụng caption cho đúng tập ảnh, ảnh không chọn giữ nguyên caption, autosave chỉ được gọi một lần, khoanh vùng PC, mobile emulation tap chọn nhiều và điều khiển rowGap/columnGap. Bổ sung bài test Chromium dùng IndexedDB thật để lưu AUTO-DRAFT, reload trang và xác nhận rowGap=27, columnGap=31 được khôi phục đúng; cùng bài test kiểm tra các trường hồ sơ, caption, xoay ảnh và blob ảnh. Unit test canvas PDF cũng xác nhận rowGap=24/columnGap=30 tác động đúng tới tọa độ ô ảnh thực tế.
- Bộ regression Core hiện có: **PASS 10 vòng liên tiếp** trên GitHub Actions run 1684, gồm kiểm tra lưu nháp, Drive Fusion, PDF và các module Core/Skin hiện có.

## Rà soát tiếp theo — triển khai thử nghiệm và phạm vi kiểm thử
- CI run **1685** đã hoàn tất PASS sau khi cập nhật tài liệu và test: [xem kết quả](https://github.com/ngocttgdbt-093/pti093/actions/runs/40630709632).
- Đã xác minh có test trình duyệt cho các thao tác ảnh hiện hữu: `tests/classic-image-grid-skin.test.cjs` kiểm tra thay ảnh, chèn ảnh, xoay, xóa, sửa chú thích và trạng thái nút; `tests/image-reorder-browser.test.cjs` kiểm tra kéo sắp xếp bằng chuột/chạm, autosave và chặn đổi thứ tự khi hồ sơ khác đang mở; `tests/image-editing.test.js` và `tests/image-ingest.test.js` kiểm tra logic Core tương ứng.
- Tại thời điểm rà soát, `.github/workflows/validate.yml` chỉ là workflow kiểm thử; không có workflow deploy Pages trong nhánh tích hợp. Vì vậy chưa có URL chạy riêng đã được xác minh cho đúng commit Core.
- Không tự thêm nội dung vào nhánh production hoặc nhánh Pages đang phục vụ ứng dụng chỉ để tạo URL thử nghiệm. Bước triển khai cần một đích preview cô lập, hoặc xác minh được cấu hình Pages hiện tại trước khi thay đổi.

## Chưa nghiệm thu
- Chưa kiểm thử trực tiếp trên iPhone/Android vật lý; mobile hiện được kiểm thử bằng Chromium mobile emulation.
- Chưa thực hiện phiên upload Google Drive thật với bộ ảnh người dùng; CI chỉ kiểm tra các bài test hồi quy/mô-đun sẵn có.
- Chưa xác nhận bằng mắt trên dữ liệu nghiệp vụ thực rằng mọi trường hợp preview/PDF đều đạt; cần kiểm tra bản triển khai thử nghiệm và tải lại AUTO-DRAFT với gap tùy chỉnh.

## Các bước tiếp theo trước khi merge
1. Mở bản chạy thử của nhánh PR; kiểm tra console và tải đầy đủ CSS/JS.
2. Trên PC: click đơn, Ctrl/Cmd-click, Shift-click, khoanh vùng; tắt chế độ chọn nhiều rồi kiểm tra kéo sắp xếp.
3. Trên điện thoại: bật “Chọn nhiều”, chạm chọn nhiều ảnh, cuộn trang và thao tác textarea/nút.
4. Nhập thuyết minh nhóm, thử Hủy/Escape, áp dụng và kiểm tra sau F5.
5. Đổi rowGap/columnGap; kiểm tra preview, PDF và AUTO-DRAFT khôi phục cùng giá trị.
6. Thực hiện upload Drive thật và kiểm tra đủ ảnh, tiến trình, tên tệp, thứ tự ảnh và thời gian.
7. Chỉ bỏ Draft/merge khi nghiệm thu trực tiếp hoàn tất; nếu có lỗi, sửa trên nhánh tích hợp và chạy lại bộ test.

## Quy tắc báo cáo
Mỗi hạng mục phải ghi rõ trạng thái, tệp đã đổi, phép thử thực tế và kết quả. Không coi việc có code hoặc test file là nghiệm thu chức năng.
