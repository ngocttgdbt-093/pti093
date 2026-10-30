# HANDOFF — Tự bỏ chọn ảnh sau khi áp dụng thuyết minh nhóm
Ngày: 30/10/2026
Phạm vi: GHÉP ẢNH 093 và PTI
Trạng thái: Đã sửa trên nhánh kiểm thử; chưa xác nhận kiểm thử trình duyệt thực tế / chưa triển khai production.

## 1. Hành vi yêu cầu
Sau khi người dùng xác nhận thuyết minh nhóm bằng nút **Áp dụng** hoặc phím **Enter**, nếu thao tác cập nhật toàn bộ ảnh thành công thì phần mềm tự xóa trạng thái chọn của nhóm vừa áp dụng. Người dùng có thể chọn nhóm tiếp theo ngay, không cần click vùng trắng hoặc bỏ chọn từng ảnh.

Nếu nội dung trống, danh sách ảnh không hợp lệ, hoặc cập nhật thất bại: không xóa lựa chọn, không đóng hộp thoại theo luồng thành công và không báo thành công.

## 2. Thay đổi triển khai
Trong hàm `commitCaption()` của `index.html`, sau khi `CaptionTools093.applyCaptionToItems(...)` trả về `result.ok === true`, gọi:
```js
clearSelection();
closeDialog();
render();
scheduleAutoDraftSave(true);
msg('Đã áp dụng chú thích chung cho '+result.applied+' ảnh. Đã bỏ chọn nhóm ảnh.',true);
updateSelectionUI();
```
Lệnh `clearSelection()` chỉ chạy sau nhánh kiểm tra `result.ok`, vì vậy không xóa lựa chọn khi thất bại. Cơ chế chọn Ctrl/Cmd, Shift, khoanh vùng, menu chuột phải, auto-correct và lưu nháp không bị thay đổi.

## 3. Các repository / nhánh
- GHÉP ẢNH 093: `ngocttgdbt-093/pti093`
- PTI: `ngocttgdbt-093/pti`
- Nhánh sửa ở cả hai repo: `fix/auto-clear-caption-selection-20261030`

## 4. Kiểm thử nghiệm thu bắt buộc
1. Có 10 ảnh; chọn 3 ảnh; mở Chú thích gộp; nhập nội dung; bấm **Áp dụng**. Kết quả: đúng 3 ảnh nhận nội dung và cả 3 bỏ viền/đánh dấu chọn.
2. Lặp lại với nhóm ảnh khác ngay cạnh nhóm đầu, không click vùng trắng. Kết quả: chọn và áp dụng được bình thường.
3. Lặp lại thao tác bằng phím **Enter**. Kết quả giống nút Áp dụng.
4. Nhấn Hủy / Escape: lựa chọn vẫn giữ nguyên.
5. Để trống nội dung: không áp dụng, không bỏ chọn.
6. Kiểm tra Ctrl/Cmd-click, Shift-click, khoanh vùng trên PC; chạm chọn trên mobile.
7. Tải lại trang sau khi áp dụng: nội dung chú thích đã được lưu nháp theo cơ chế hiện hành.

## 5. Trạng thái xác minh
- Đã đọc mã nguồn thật của hai trang `index.html` trên nhánh `main`.
- Đã cập nhật cùng một logic trong nhánh kiểm thử riêng của hai repository.
- Chưa có bằng chứng chạy kiểm thử trình duyệt thực tế, trên thiết bị PC/mobile hoặc CI cho hai nhánh này. Không coi là PASS và chưa tuyên bố đã triển khai trang chính.
- Chỉ merge / triển khai production sau khi kiểm thử nghiệm thu các trường hợp trên.

## 6. Tích hợp vào Project 05 — Core
Đưa nguyên tắc này vào adapter UI của module thuyết minh nhóm:
- Không đưa trạng thái chọn ảnh vào dữ liệu nghiệp vụ/core.
- Adapter gọi thao tác áp dụng caption; chỉ khi kết quả thành công mới clear selection state và render lại trạng thái UI.
- Giữ lựa chọn khi cancel, validation fail hoặc apply fail.
- Áp dụng thống nhất cho skin Classic và skin giao diện mới; không phụ thuộc module Drive hay quản trị GĐV.
- Kiểm thử hành vi với cả PC và mobile trước khi đánh dấu nghiệm thu.

## 7. Rollback
Nếu phát sinh lỗi, revert commit tương ứng trên nhánh tích hợp hoặc khôi phục riêng phần thay đổi trong `commitCaption()`. Không rollback các thay đổi khác của hai dự án.
