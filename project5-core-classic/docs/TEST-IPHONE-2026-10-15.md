# GHÉP ẢNH 093 — Ghi nhận kiểm thử iPhone

- Ngày ghi nhận: 15/10/2026
- Dự án: GHÉP ẢNH 093 (repository `ngocttgdbt-093/pti093`)
- Nguồn xác nhận: người dùng đã trực tiếp kiểm thử trên iPhone và báo “Đã test trên iphon, thành công.”
- Kết luận: **Đã xác nhận kiểm thử thực tế trên iPhone thành công theo phản hồi của người dùng.**

## Phạm vi đã cập nhật trong mã nguồn trước lần kiểm thử

1. Hiển thị ngày giám định theo định dạng `dd/mm/yyyy` trong preview và tài liệu Word.
2. Thêm trường Garage/địa điểm giám định, tích hợp lưu và khôi phục dữ liệu.
3. Trên iOS, ưu tiên chia sẻ PDF dưới dạng tệp có tên xác định; có phương án dự phòng.
4. Gửi ảnh lên Drive tuần tự, chờ xác nhận từng ảnh trước khi gửi ảnh tiếp theo.
5. Giữ cơ chế khởi tạo mô phỏng bố cục 6 ảnh A4 dọc.

## Giới hạn của xác nhận

Phản hồi của người dùng xác nhận lần kiểm thử trên iPhone thành công, nhưng không nêu riêng từng kịch bản đã chạy. Vì vậy không suy diễn rằng mọi trường hợp lưu/mở hồ sơ Drive, khôi phục bản nháp hoặc tải lô ảnh lớn đều đã được kiểm thử độc lập.

## Việc tiếp theo

- Giữ lại mốc triển khai đã kiểm thử để có thể đối chiếu nếu phát sinh lỗi.
- Nếu kiểm thử thêm, ghi rõ từng kịch bản: preview/ngày tháng, Garage và khôi phục, xuất PDF và tên tệp, tải ảnh/Drive.
- Không gộp nội dung hoặc mã nguồn của dự án GHÉP ẢNH PTI (`/pti/`) hay OCR TBTN/YCBT vào dự án này.
