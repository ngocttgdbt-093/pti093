# Project 5 Core — tích hợp chọn ảnh và thuyết minh

Trạng thái: nhánh tích hợp chuẩn bị cho kiểm thử; chưa nghiệm thu browser-level.

## Đã đưa vào Core
- `core/caption-tools.js`: API dùng chung `PTI093CaptionTools` gồm chuẩn hóa chữ bảo thủ, cập nhật chú thích theo ID có kiểm tra toàn bộ lựa chọn trước khi sửa, và helper toggle selection thuần dữ liệu.
- Module không thực hiện I/O, không gọi Drive, không tự lưu nháp và không sửa thứ tự/rotation/PDF.

## Bước tích hợp UI còn phải hoàn tất trước khi bật cho người dùng
1. Nạp `core/caption-tools.js` trước `core/app-core.js` trong trang thử nghiệm.
2. Kết nối sự kiện chọn ảnh của PC: Ctrl/Cmd-click, Shift-click và khoanh vùng ở chế độ riêng để không xung đột kéo sắp xếp.
3. Kết nối thao tác chạm trên mobile, không chặn cuộn.
4. Phân biệt vùng ảnh với vùng chú thích; hộp thoại thuyết minh nhóm phải có xem trước, Áp dụng, Hủy/Escape.
5. Căn giữa chú thích và kiểm soát rowGap/columnGap mà không làm lệch preview/PDF.
6. Khi áp dụng chú thích, gọi luồng render/autosave hiện hữu đúng một lần sau khi API trả `ok: true`.

## Kiểm thử bắt buộc
- Normalize khoảng trắng, chữ hoa đầu câu tiếng Việt, chuỗi rỗng.
- ID hợp lệ cập nhật đúng ảnh đã chọn; ID thiếu/trùng/stale phải thất bại an toàn, không cập nhật một phần.
- Ctrl/Cmd, Shift, khoanh vùng và chạm mobile; vùng chú thích không kích hoạt chọn ảnh ngoài ý muốn.
- Hồi quy: thêm/xóa/thay ảnh, kéo sắp xếp, xoay ảnh, AUTO-DRAFT/lưu nháp, F5/khôi phục, preview/PDF và lưu/upload Drive.

## Bảo toàn và rollback
- Nhánh được tạo từ `test/core-093-20261023`; không sửa `main`.
- Không sửa module Drive hoặc pipeline lưu nháp trong thay đổi này.
- Chưa merge vào production trước khi browser test PC/mobile và hồi quy hoàn tất.
