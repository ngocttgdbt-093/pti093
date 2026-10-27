# Bàn giao Project 5 Core — Chọn ảnh và thuyết minh nhóm

Ngày bàn giao: 27/10/2026  
Nguồn: GHÉP ẢNH 093, nhánh `test-caption-bulk-autocorrect-20261027`  
Trạng thái: gói bàn giao để tích hợp; chưa tự động ghép vào Core/Project 5.

## Phạm vi đã thống nhất

1. Nhãn nút chọn file là **“Chọn ảnh”**.
2. Bộ chọn tệp chỉ lọc ảnh. Ở bản chính GHÉP ẢNH 093 hiện dùng `accept="image/*"`; đường xử lý ảnh kiểm tra MIME `image/*` và đọc bằng `createImageBitmap` hoặc `Image`. Khả năng đọc thực tế phụ thuộc trình duyệt/codec; không nên tuyên bố mọi định dạng ảnh đều được hỗ trợ.
3. Máy tính: chọn nhiều ảnh bằng nhấp ảnh, Ctrl/Cmd + nhấp, hoặc kéo khoanh vùng khi bật chế độ khoanh vùng.
4. Mobile: chạm vùng ảnh để chọn/bỏ chọn từng ảnh; không yêu cầu Ctrl và không bật kéo khoanh vùng desktop.
5. Nhấp vùng trắng để bỏ chọn toàn bộ. Không cần nút “Bỏ chọn”.
6. Nhấp vùng thuyết minh khi đang chọn từ 2 ảnh trở lên mở thuyết minh chung cho nhóm hiện tại. Không tự thêm ảnh được nhấp nếu ảnh đó chưa nằm trong nhóm. Với một ảnh, sửa thuyết minh riêng.
7. Thuyết minh chung có AutoCorrect bảo thủ (chuẩn hóa khoảng trắng và viết hoa đầu câu), xem trước trước khi áp dụng; Enter/Áp dụng đóng hộp thoại, Hủy/Escape đóng mà không áp dụng.
8. Khoảng cách giữa thẻ ảnh được tăng nhẹ để thao tác khoanh vùng ít chọn nhầm ảnh liền kề.

## Quy tắc tích hợp vào Core

- Giữ module giao diện (skin) tách khỏi logic Core; Core chỉ nhận danh sách ID ảnh đã chọn và nội dung thuyết minh đã xác nhận.
- Xác thực ID ảnh trước khi cập nhật; nếu ID thiếu/trùng/stale thì dừng an toàn, không cập nhật một phần.
- Không sửa cơ chế lưu Drive, draft/AUTO-DRAFT, thứ tự nhóm ảnh, xoay ảnh hoặc luồng xuất PDF.
- Không ép giao diện desktop lên mobile. Mobile chọn ảnh bằng chạm, giữ nguyên thao tác cuộn và các nút chức năng của thẻ.
- Bỏ chọn không được xóa thuyết minh đã lưu.
- Không đưa module vào production cho đến khi kiểm thử tương tác trình duyệt trên desktop và mobile, F5/khôi phục nháp, lưu, và xuất PDF.

## Tệp nguồn

- `modules/caption-tools-093/caption-tools-core.js`
- `index.html` trên nhánh nguồn nói trên (phần tích hợp giao diện thử nghiệm)

## Trạng thái kiểm chứng

Các kiểm tra tự động cho module/cú pháp đã chạy trong nhánh thử nghiệm; chưa có nghiệm thu browser-level đầy đủ. Đây là gói bàn giao kỹ thuật để Project 5 Core tích hợp và kiểm thử, không phải xác nhận rằng đã tích hợp vào repo Core.
