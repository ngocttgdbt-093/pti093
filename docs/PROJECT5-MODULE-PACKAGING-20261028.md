# Project 5 — Gói module Drive, Classic Skin và quản trị GĐV

## Mục tiêu và ranh giới kiến trúc

Gói này lưu ba module độc lập để tích hợp có kiểm soát. Việc đặt mã trong thư mục không tự động nạp mã vào ứng dụng.

- **Core dùng chung:** quy tắc nghiệp vụ, quản lý workspace, chọn/chú thích ảnh, bản nháp, preview/PDF và các API lõi dùng chung.
- **093:** Core + Drive Storage/Fusion + giao diện 093.
- **PTI:** Core + module quản trị danh sách GĐV PTI. Không bật Drive Storage/Fusion hoặc UI riêng của 093 trong PTI.
- **Classic Skin:** giao diện thay thế được, không sở hữu nghiệp vụ lưu Drive hay quản trị danh sách GĐV. Skin package bao gồm lịch chọn ngày dd/mm/yyyy và dùng chung Core date utils.

## 1. Drive Storage 093

Thư mục: `modules/drive-storage-093/`

Nguồn đóng băng: Final V1-20261027; Apps Script API v25. `DriveStorage093.frontend.js` là mã nguồn tham chiếu/handoff, **không nạp trực tiếp vào Core** và không dùng để thay thế mù quáng `fusion/drive.js` hiện đang tích hợp các lớp bảo vệ bổ sung.

Các bất biến bắt buộc:
- Tối đa 5 ảnh tải đồng thời; theo dõi kết quả từng ảnh.
- Tính SHA-256, dùng upload key để retry/idempotency và đối soát phản hồi gián đoạn.
- Tải ảnh theo nhóm; chỉ xác nhận ảnh hoàn tất sau khi `commitUploadIndex` và cập nhật `project.pti` thành công.
- Bảo toàn `uploadIndex` / `uploadIndexVersion` khi lưu metadata; không xóa ảnh Drive để chữa lỗi.
- Không chuyển root Drive hoặc API production sang ứng dụng khác khi chưa cấu hình/kiểm thử riêng.

Nguồn tham chiếu: README và module map đi kèm. Gói này **chưa tuyên bố đã kiểm thử upload Drive trực tiếp** ở nhánh đóng gói mới.

## 2. Classic Skin

Thư mục: `skins/classic/`

Bao gồm template, manifest, adapter và kiểm thử ranh giới. Mục tiêu là hợp đồng mount/update/unmount ổn định. Việc đóng gói chưa đồng nghĩa đã chuyển toàn bộ ứng dụng đang chạy sang skin host mới; các controller đang phụ thuộc DOM cần được tích hợp theo từng bước.

- Không đưa Drive Storage/Fusion, UI mới riêng 093 hoặc UI quản trị GĐV vào template Classic.
- Không thay đổi Core nghiệp vụ chỉ để phục vụ skin.
- Giữ các ID/điểm móc DOM cần thiết cho Core, và bổ sung kiểm thử trước khi đổi host ứng dụng.

### Phụ thuộc lịch chọn ngày

Template Classic hiện đã đóng gói markup, CSS và controller lịch chọn ngày. Controller cần Core khởi tạo sau khi `PTI093DateUtils` sẵn sàng; wiring Core đang được kiểm thử riêng ở [PR #16](https://github.com/ngocttgdbt-093/pti093/pull/16). Không đánh dấu lịch hoạt động trong host mới cho đến khi wiring được tích hợp và bài kiểm thử trình duyệt chạy trên template skin.

## 3. PTI GĐV Admin

Thư mục: `modules/pti-gdv-admin/`

Nguồn: `admin-gdv/admin-gdv.js` từ repo PTI. Module dùng API quản trị PTI riêng, không gọi API hồ sơ/Drive của 093. Backend/API và phân quyền đăng nhập vẫn là phụ thuộc triển khai riêng.

- Chỉ gắn vào biến thể PTI; không nạp vào Core dùng chung hoặc ứng dụng 093.
- Danh sách quản trị phải lấy từ API PTI chuyên biệt, không đồng bộ ngầm với danh sách GĐV 093.
- Thao tác thêm/sửa/xóa trong giao diện chưa được xem là đã lưu cho đến khi API xác nhận.
- Không coi kiểm thử nguồn tĩnh là xác minh bảo mật backend; cần kiểm tra cấu hình mật khẩu, quyền, CORS/origin và triển khai Apps Script trước phát hành.

## Kiểm thử và nghiệm thu

CI kiểm tra ranh giới module, manifest, hợp đồng Drive (concurrency 5 / index commit / SHA-256) và bảo đảm các gói chưa bị nạp nhầm vào `index.html`. Bộ Core hồi quy chạy 10 vòng liên tiếp.

Còn phải nghiệm thu riêng trước phát hành:
1. 093: tạo hồ sơ Drive thật, tải 10 ảnh, đối soát đủ 10/10, mở lại và xác minh chú thích/thứ tự/xoay ảnh; đo thời gian nhưng không hy sinh tính toàn vẹn dữ liệu.
2. PTI: đăng nhập quản trị GĐV bằng backend triển khai thật; thêm/sửa/xóa, tải lại trang và xác minh danh sách tồn tại trên server; xác nhận PTI không gọi API 093.
3. Skin: chạy trên trình duyệt thật ở desktop/mobile; kiểm tra layout, preview/PDF và không mất các điểm móc DOM.
4. Sau khi tích hợp mỗi gói, chạy lại Core regression; không gộp production chỉ dựa trên kiểm thử tĩnh.

## Nguồn gốc

- Drive handoff: `drive-module-handoff-20261027`, Final V1-20261027, API v25.
- Classic skin: `refactor/classic-skin-module-20261028`.
- PTI GĐV Admin: repo `ngocttgdbt-093/pti`, branch `main`.
- Base Core: `integration/project5-caption-core-20261027`.
