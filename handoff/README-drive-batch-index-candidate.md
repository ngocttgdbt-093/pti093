# GHÉP ẢNH 093 — candidate backend batch index

**Trạng thái:** bản ứng viên để kiểm thử; chưa triển khai vào Google Apps Script và không làm thay đổi nhánh `main`.

Nguồn tham chiếu là bản chẩn đoán `Ma_perf_diagnostic.gs` trong phiên làm việc. Tương thích với frontend `index.html` tại commit `ce0da7ceba6f6aebe5f9f55a528ffcac841e28fa`, hiện gửi `deferIndex:true` và action `commitUploadIndex`.

## Thay đổi trong candidate

- Thêm action `commitUploadIndex`: gộp các mục SHA-256 vào `project.pti` bằng một lần ghi cho cả nhóm.
- `uploadImage` giữ nguyên xác minh SHA-256, kiểm tra index, migration/recovery và tạo file ngoài khóa; khi `deferIndex:true`, trả `pendingIndex:true` và cache thông tin file để frontend gom nhóm.
- `uploadStatus` trả thêm cờ `pendingIndex`, để frontend không nhầm file đã tạo nhưng chưa commit chỉ mục là upload hoàn tất.
- Kiểm tra file commit thuộc đúng thư mục `images` và dấu SHA-256 khớp; nếu cùng hash được tạo đồng thời, giữ một file chuẩn và chuyển bản trùng vào thùng rác.
- Giữ nguyên các nhánh `saveProject`, cấu trúc hồ sơ Drive, `project.pti`, SHA-256 và khóa `LockService`.
- Ghi log `PTI093_UPLOAD_PERF` theo các giai đoạn, bao gồm chờ khóa, tạo file và ghi index.

## Kiểm thử cần làm trước khi thay bản đang chạy

1. Sao lưu mã Apps Script đang chạy; không thay đổi `backupfull_093_helper.gs.gs` hoặc `update_full_backup_093.gs.gs`.
2. Triển khai candidate trong Apps Script đúng project, sau đó tạo hồ sơ thử nghiệm riêng.
3. Tải 10 ảnh khác nhau; xác nhận đủ 10 file trong thư mục `images`, 10 khóa tương ứng trong `project.pti.uploadIndex`, và thanh tiến độ chỉ tăng sau commit.
4. Gửi lại một ảnh giống hệt; xác nhận không phát sinh file trùng.
5. Thử hai ảnh có cùng nội dung trong cùng một lô; xác nhận chỉ giữ một file cho cùng SHA-256.
6. Thử mất phản hồi iframe/timeout; xác nhận `uploadStatus` trả đúng `pendingIndex` và commit có thể retry an toàn.
7. Ghi lại log `PTI093_UPLOAD_PERF`, thời gian tổng và số file thực tế. Chỉ chấp nhận sau 10 lượt kiểm thử liên tiếp đạt đủ số ảnh và không có file trùng.

**Giới hạn của lượt này:** đã kiểm tra cú pháp JavaScript và các điều kiện tương thích tĩnh; chưa có quyền chạy/deploy Apps Script hoặc ghi thử vào Google Drive, nên chưa có số đo hiệu năng thực tế và chưa thể xác nhận mục tiêu dưới 30 giây.
