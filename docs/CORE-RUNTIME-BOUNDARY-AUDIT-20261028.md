# Project 5 — Core runtime boundary audit (2026-10-28)

## Kết quả kiểm tra nguồn

Phân biệt ba khái niệm để tránh gọi nhầm:

1. **Các module nghiệp vụ trong `core/*.js`** (trừ `app-core.js`) hiện không import hoặc gọi trực tiếp global/API của Drive Fusion 093, GĐV Fusion 093, hay PTI GĐV Admin. Bài test `tests/core-runtime-boundaries.test.js` chặn các liên kết trực tiếp này.
2. **`core/app-core.js` không phải Core trung lập.** Đây là entry point/assembly của ứng dụng 093 hiện hữu. Nó khởi tạo `PTI093GdvFusion`, `PTI093DriveFusion` và Classic UI, đồng thời kết nối các module dùng chung với DOM của app 093.
3. **`index.html` hiện vẫn là host 093.** Nó được phép nạp `fusion/drive.js` và `fusion/gdv-093.js`; nó không được nạp trực tiếp gói PTI GĐV Admin hoặc Classic Skin package mới. Việc đặt các gói vào thư mục riêng chưa tự tách host/runtime.

## Coupling còn tồn tại cần xử lý theo từng bước

Các module trong `core/` vẫn có một số hợp đồng tương thích lịch sử liên quan đến trạng thái Drive, ví dụ `driveRecordId`, `driveOpenPending`, `driveOpenIncomplete`, `setDriveState` và metadata `driveFileId/driveUploadKey`. Các trường này không tự gọi backend, nhưng cho thấy Core hiện chưa hoàn toàn trung lập về tên gọi và trạng thái lưu trữ.

Không được xóa hàng loạt các trường đó ngay: chúng đang được dùng để khôi phục bản nháp, chặn ghi khi mở hồ sơ chưa đủ ảnh, và giữ liên kết file cho biến thể 093. Việc tách an toàn cần một adapter hợp đồng rõ ràng, sau đó chạy lại các test hồi quy lưu/mở nháp và Drive trước khi bỏ alias cũ.

## Kiến trúc mục tiêu

- **Shared Core:** workspace, xử lý ảnh, chú thích, draft/local storage, preview/PDF và hợp đồng lưu trữ trừu tượng; không nạp Fusion, không giữ endpoint/API riêng của app.
- **093 assembly:** Shared Core + adapter Drive 093 + GĐV 093 + Classic/Modern UI của 093.
- **PTI assembly:** Shared Core + API/quản trị GĐV PTI + skin được cấu hình; không nạp Drive Fusion 093.
- **Skin:** chỉ render/bind giao diện qua contract, không tự sở hữu Drive hoặc quyền quản trị GĐV.

## Trình tự an toàn

1. Chốt interface storage adapter (local/remote, open/save, progress, per-file status, incomplete-open guard) và contract cho GĐV.
2. Chuyển `core/app-core.js` thành assembly riêng của 093; không dùng file này làm entry point của PTI.
3. Dùng test boundaries để bảo đảm module Core không import các integration cụ thể.
4. Tạo host 093 và PTI riêng; browser smoke test mỗi host trước khi chuyển luồng chạy chính.
5. Chỉ sau khi kiểm thử tương đương mới xóa các alias/trạng thái Drive cũ. Không thay backend hay endpoint trong bước refactor giao diện.

## Phạm vi xác minh

Đây là source-level audit và CI guard, không phải kiểm thử backend. Chưa có bằng chứng từ bước này về upload 10 ảnh lên Google Drive thật, hay CRUD GĐV qua Apps Script PTI đã triển khai. Các kiểm thử đó vẫn là điều kiện nghiệm thu riêng.
