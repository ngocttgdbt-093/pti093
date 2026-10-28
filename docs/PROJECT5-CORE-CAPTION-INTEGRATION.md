# Project 5 Core — tích hợp chọn ảnh, thuyết minh và bố cục

Trạng thái: **đã cập nhật trên nhánh tích hợp; chờ CI và kiểm thử trình duyệt/nghiệm thu thực tế. Không merge production.**

## Đã tích hợp trong nhánh này
- `core/caption-tools.js`: API `PTI093CaptionTools` cho chuẩn hóa chữ, áp dụng chú thích theo ID có kiểm tra toàn bộ tập chọn trước khi thay đổi, và helper toggle selection.
- `skin/classic-image-grid.js`: chọn một ảnh bằng click/chạm; Ctrl/Cmd-click chọn nhiều; Shift-click chọn dải; chế độ chọn nhiều cho thao tác chạm; khoanh vùng bằng chuột trên PC; phân biệt vùng ảnh với textarea chú thích.
- Hộp thoại thuyết minh nhóm: đếm ảnh chọn, xem trước chuẩn hóa, Áp dụng, Hủy, đóng bằng Escape/nhấp nền. Chặn cập nhật khi đang mở hồ sơ khác; áp dụng theo kiểu fail-closed rồi gọi autosave một lần.
- `skin/classic-layout.js` + `core/image-canvas.js`: điều chỉnh rowGap/columnGap; cùng giá trị được dùng cho bố cục canvas preview/PDF.
- `core/draft-recovery.js`: lưu/khôi phục hai giá trị khoảng cách trong metadata AUTO-DRAFT; giữ giá trị trong khoảng 4–36 px.
- `css/project5-caption-tools.css`: style cho chọn ảnh, khoanh vùng, hộp thoại và điều khiển khoảng cách.
- `.github/workflows/validate.yml`: thêm bước CI kiểm tra cú pháp các module liên quan, chạy unit test chú thích và xác minh thứ tự nạp module/stylesheet.

## Bảo toàn
- Không sửa mã nguồn `fusion/drive.js` hoặc pipeline upload Drive.
- Không sửa logic kéo sắp xếp, xoay, thay, chèn, xóa ảnh hoặc xây dựng PDF ngoài việc dùng khoảng cách hàng/cột trong canvas.
- Hộp thoại chú thích chỉ thay `item.caption` của tập ảnh đã chọn và gọi autosave hiện hữu một lần sau khi kiểm tra thành công.
- Nhánh tích hợp được tạo từ `test/core-093-20261023`; PR vẫn ở trạng thái Draft.

## Kết quả kiểm thử đã thực hiện
- Chạy cục bộ bộ test unit tái dựng từ nội dung hiện có của `core/caption-tools.js` và `core/caption-tools.test.cjs`: **PASS** cho chuẩn hóa tiếng Việt, cập nhật nhiều ID hợp lệ, ID thiếu không cập nhật một phần, ID trùng, toggle selection. Do môi trường làm việc không có checkout trực tiếp repository, đây không phải là lệnh chạy trực tiếp trên checkout GitHub.
- Đã thêm lệnh kiểm thử tương ứng vào GitHub Actions. Tại thời điểm cập nhật tài liệu, chưa nhận được workflow run/status check để xác nhận CI trên commit mới.
- Chưa thực hiện browser-test PC/mobile; chưa kiểm tra trực quan preview/PDF, AUTO-DRAFT sau F5 hoặc upload Drive thật.

## Kiểm thử bắt buộc trước khi merge
1. Mở bản triển khai của nhánh PR; kiểm tra console và tải đủ các asset.
2. PC: click đơn, Ctrl/Cmd-click, Shift-click, khoanh vùng; xác nhận kéo sắp xếp vẫn hoạt động khi không bật chế độ khoanh vùng.
3. Mobile: bật “Chọn nhiều”, chạm chọn/bỏ chọn; cuộn trang không bị khóa; thao tác nút và textarea không làm chọn ảnh.
4. Thuyết minh nhóm: xem trước, hủy/Escape, áp dụng cho đúng tập ảnh; nội dung đồng bộ sau render và F5.
5. Điều chỉnh rowGap/columnGap; xác nhận preview và PDF có khoảng cách tương ứng; kiểm tra AUTO-DRAFT khôi phục giá trị sau tải lại.
6. Hồi quy thêm/thay/chèn/xóa/xoay/kéo sắp xếp, lưu nháp/khôi phục, xuất PDF và lưu/upload Drive.
7. Chỉ merge sau khi CI và các kiểm thử liên quan đều đạt; nếu lỗi, rollback nhánh tích hợp hoặc revert commit cụ thể.

## Quy tắc báo cáo
Mỗi hạng mục phải ghi rõ: trạng thái, tệp đã đổi, phép thử thực tế và kết quả. Không coi việc có code hoặc test file là nghiệm thu chức năng.
