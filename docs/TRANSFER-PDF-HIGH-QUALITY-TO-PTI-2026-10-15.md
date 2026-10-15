# Bàn giao chức năng xuất PDF chất lượng cao — GHÉP ẢNH 093 → GHÉP ẢNH PTI

Ngày: 15/10/2026

## Mục tiêu
Chuyển riêng phần sửa lỗi xuất PDF chất lượng cao có tự tách file và trạng thái tiến trình từ Project GHÉP ẢNH 093 sang Project GHÉP ẢNH PTI. Không đồng bộ các tính năng khác, không thay đổi cơ chế lưu Google Drive hoặc danh sách GĐV của PTI.

## Nguyên nhân đã xác minh trong mã nguồn 093
Nút trong cảnh báo PDF gọi `exportHighQualitySplit(baseName)`, nhưng hàm `exportHighQualitySplit` chưa được định nghĩa. Vì vậy nhánh xuất chất lượng cao có thể dừng khi bấm. Giao diện cũng không có trạng thái theo dõi quá trình.

## Nội dung chuyển giao
- Giữ nguyên `splitHighQualityPdf(filenameBase)` và các hàm PDF liên quan sẵn có ở PTI.
- Thêm hàm `exportHighQualitySplit(filenameBase, button, progress)`.
- Hiển thị trạng thái xử lý, số phần PDF đã gửi để lưu, tên và dung lượng phần đang xử lý.
- Khóa nút và checkbox trong lúc chạy để hạn chế thao tác lặp.
- Hiển thị lỗi rõ ràng khi xuất bị gián đoạn.
- Giữ giới hạn mục tiêu dưới 10 MB cho từng phần theo logic hiện có.

## Thay đổi trong repo PTI
- Repo: https://github.com/ngocttgdbt-093/pti
- Nhánh triển khai: `feature/pdf-high-quality-progress-20261015`
- PR cần xem xét: tạo sau khi đóng gói (chưa merge vào main).
- File: `index.html`

## Kiểm thử và giới hạn
- Đã xác nhận trong mã nguồn 093 có lời gọi tới hàm bị thiếu; nhánh sửa 093 đã thêm hàm và trạng thái tiến trình.
- Đã chuyển cùng thay đổi chọn lọc sang nhánh PTI.
- Chưa chạy thử trình duyệt thực tế với 300 ảnh; chưa xác minh hoàn chỉnh các trình duyệt có chặn tải nhiều tệp hay không.
- Trạng thái “đã gửi để lưu” không đồng nghĩa mọi tệp đã được ghi thành công vào thư mục Downloads; người dùng cần xác nhận tệp đầu ra thực tế.
- Trước khi merge vào PTI main, cần chạy kiểm tra cú pháp JavaScript và xác nhận các workflow GitHub Actions đạt thành công; sau triển khai cần thử một bộ ảnh lớn.

## Nguyên tắc tách dự án
Chỉ chuyển chức năng xuất PDF chất lượng cao và trạng thái tiến trình. Không chép toàn bộ mã 093 sang PTI. Không sửa repo OCR TBTN/YCBT.
