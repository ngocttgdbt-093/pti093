# GÓI BÀN GIAO — CƠ CHẾ LƯU GOOGLE DRIVE GHÉP ẢNH 093
**Ngày đóng gói:** 2026-10-16 (GMT+7)  
**Phạm vi:** Chỉ đọc và đóng gói; không sửa file đang chạy, không đổi `main`, không chạm dự án GHÉP ẢNH PTI riêng.  
**Nguồn ưu tiên đã đọc:** [preview-v42/index.html trên nhánh main](https://github.com/ngocttgdbt-093/pti093/blob/main/preview-v42/index.html)  
**URL chạy được yêu cầu đối chiếu:** https://ngocttgdbt-093.github.io/pti093/preview-v42/?build=v53-20261016  
**SHA blob nguồn:** `3e1aec8f152dd4c67277300f2cf76784fb28651b`  
**Kích thước nguồn:** 192,164 ký tự  
**Snapshot nguyên trạng:** [handover/preview-v42-index-source.html](./preview-v42-index-source.html)

> Lưu ý về phạm vi bằng chứng: đã đọc mã HTML/JS được lưu tại đúng đường dẫn `preview-v42/index.html` của repo `ngocttgdbt-093/pti093`. Query `?build=v53-20261016` không tạo ra một bản mã riêng; nội dung được phục vụ theo file trên GitHub Pages. Tôi chưa chạy trình duyệt hoặc thực hiện upload trực tiếp tới Drive trong lần đóng gói này. Mốc 10/10 ảnh ~34 giây là kết quả người dùng cung cấp, không phải phép đo tôi vừa chạy.

## 1. Tóm tắt kết quả kiểm tra mã nguồn

- **Đã thấy trong mã nguồn:** `DRIVE_CONCURRENCY = 5`; xử lý theo từng nhóm tối đa 5 ảnh bằng `Promise.all(entries.map(processOne))`; chờ nhóm hiện tại kết thúc rồi mới chuyển nhóm tiếp theo.
- **Đã thấy:** bộ đếm `sent` chỉ tăng sau khi hàm nhận được kết quả gửi ảnh hoặc khôi phục được trạng thái đã lưu; cập nhật tiến trình, lưu dấu ảnh đã tải và ghi danh sách lỗi.
- **Đã thấy:** tạo hồ sơ qua API `action=createRecord`; gửi ảnh qua `action=uploadImage`; lưu dữ liệu hồ sơ qua `action=saveProject`; kiểm tra xác nhận ảnh qua `action=uploadStatus`; kiểm tra lưu dữ liệu qua `action=projectStatus`.
- **Đã thấy:** hàm được gắn lên global theo hai chỗ: `window.pti093UploadAll = pti093UploadAll;` và `window.pti093UploadAll=pti093UploadAll;`.
- **Chưa xác minh:** kết quả chạy thật 10/10 ảnh trên đúng deployment này, phản hồi backend hiện thời, và thời gian 34 giây hoặc mục tiêu 25,1 giây.
- **Không được kết luận:** chỉ thấy giá trị 5 không đủ chứng minh backend và mọi phần lõi giống hệt một bản V24/V40 khác. Cần so sánh với đúng mã nguồn mốc chuẩn đã kiểm thử.

## 2. Vị trí mã quan trọng trong file nguồn

Vì HTML được nén thành các dòng rất dài, vị trí dưới đây là **offset ký tự trong nội dung file**, không phải số dòng:

| Phần | Offset ký tự gần đúng | Bằng chứng / vai trò |
|---|---:|---|
| Cấu hình endpoint API | 105,293 | `const PTI093_API='https://script.google.com/macros/s/.../exec'` |
| `optimizeDriveImage(file)` | 105,4xx trở đi | Giới hạn cạnh dài 1920px, JPEG quality 0.78, giữ ảnh JPEG nhỏ khi nén không có lợi |
| Bộ nhớ trạng thái upload | 126,670–127,9xx | `getDriveUploadedKeys`, `saveDriveUploadedKeys`, `getDrivePendingUploadKey`, `saveDrivePendingUploadKey`, `sha256HexBlob` |
| `prepareDriveItem(it,index,total)` | 127,928 | Chuẩn bị/nén ảnh, chuyển Base64, tạo `sha256:` upload key và payload `action:'uploadImage'` |
| `waitForUploadStatus(recordId,uploadKey)` | 128,694 | Đọc trạng thái bằng fetch; có đường dự phòng JSONP |
| `sendDrivePayload(payload,recordId,uploadKey)` | 131,594 | Gửi POST bằng form/iframe ẩn, nhận phản hồi postMessage và xử lý trạng thái |
| `saveProjectToDrive(showMsg=true)` | 109,571 | Gửi `action:'saveProject'`, đợi `projectStatus` xác nhận tối đa 30 giây |
| `createDriveRecord()` | 155,434 | Tạo hồ sơ mới nếu chưa có ID, gọi upload ảnh, lưu project, hoàn tất phiên |
| `window.pti093UploadAll = pti093UploadAll;` / `async function pti093UploadAll()` | 157,233 | Luồng chính tải ảnh lên Drive |
| Gắn sự kiện nút tạo hồ sơ | 164,689 | `$('driveCreate').onclick=createDriveRecord;` |

Offset dựa trên nội dung file lấy được trong lần đóng gói này; nếu file được sửa về sau, offset có thể thay đổi.

## 3. Luồng xử lý đã đọc được

1. **Tạo hồ sơ:** `createDriveRecord()` gọi `?action=createRecord` với BKS, mã hồ sơ, GĐV và trạng thái. Lưu `recordId` vào state, sessionStorage và localStorage.
2. **Chọn ảnh cần gửi:** `pti093UploadAll()` gộp ảnh từ `getAllGroups()` và nhóm đang làm; bỏ qua ảnh có `driveFileId`, `driveUploadKey`, đã có trong tập đã tải hoặc bị trùng khóa.
3. **Khóa/nhận diện ảnh:** `driveImageKey(it)`; danh sách đã gửi được lưu trong `localStorage` theo `pti093_drive_uploaded_<recordId>`. Khóa upload đang chờ lưu riêng theo `pti093_drive_pending_<recordId>`.
4. **Chia nhóm:** `DRIVE_CONCURRENCY = 5`; vòng lặp lấy tối đa 5 ảnh mỗi nhóm.
5. **Chuẩn bị từng ảnh:** `prepareDriveItem` gọi `optimizeDriveImage`, đọc blob thành Base64, tạo SHA-256 upload key và payload JSON.
6. **Khôi phục trạng thái nếu có upload đang chờ:** nếu tồn tại pending upload key, gọi `waitForUploadStatus` trước để tránh gửi trùng khi máy chủ đã nhận ảnh nhưng trình duyệt chưa nhận được phản hồi.
7. **Gửi ảnh:** `sendDrivePayload`; mỗi ảnh có `recordId` và `uploadKey` riêng để đối chiếu phản hồi.
8. **Xác nhận và tiến trình:** chỉ khi kết quả được xác nhận mới gắn file ID/tên file, xóa pending key, thêm vào tập đã gửi, tăng `sent`, lưu trạng thái và cập nhật thanh tiến trình.
9. **Chờ cả nhóm:** `await Promise.all(entries.map(processOne))`, rồi mới bắt đầu nhóm 5 ảnh tiếp theo. Đây là xử lý đồng thời theo nhóm, không phải gửi fire-and-forget.
10. **Báo lỗi:** gom lỗi theo ảnh, hiển thị `sent/total`, lưu trạng thái và cho phép gửi lại các ảnh chưa xác nhận.
11. **Lưu metadata dự án:** sau khi upload, `saveProjectToDrive(false)` gửi `action:'saveProject'` và đợi `action=projectStatus` xác nhận. Không được coi ảnh đã gửi đồng nghĩa metadata dự án đã lưu xong.

## 4. Thông số quan sát được

- `DRIVE_CONCURRENCY = 5`.
- Kích thước ảnh mục tiêu: cạnh dài tối đa `1920px`.
- Chất lượng JPEG mục tiêu: `0.78`.
- Ảnh nhỏ: ngưỡng `900 * 1024` byte; nếu nén không giảm kích thước và ảnh gốc dưới ngưỡng thì giữ ảnh gốc.
- Kiểm tra upload status: tối đa 4 vòng; fetch có timeout 3,500ms mỗi vòng, có fallback JSONP.
- Gửi ảnh: timeout trong `sendDrivePayload` là 8,000ms (phần phản hồi có logic đối chiếu recordId/uploadKey và đường kiểm tra trạng thái).
- Lưu metadata: poll `projectStatus` tối đa 30,000ms, chu kỳ 700ms.
- Cơ chế theo nhóm: chờ toàn bộ Promise của nhóm kết thúc trước khi sang nhóm kế tiếp.

Các thông số trên là những gì đọc được từ snapshot; không có nghĩa đã đo được chúng trên backend hiện thời.

## 5. Lỗi hiện tại và phân tích

### Lỗi đã báo từ giao diện
`window.pti093UploadAll is not a function`

### Đối chiếu mã nguồn snapshot
Trong snapshot, hàm có khai báo gắn global ngay trước và sau định nghĩa:
```js
window.pti093UploadAll = pti093UploadAll;
async function pti093UploadAll() {
  // ...
}
window.pti093UploadAll=pti093UploadAll;
```

Vì vậy, **mã nguồn snapshot này có công khai hàm trên `window`**. Điều này không chứng minh file đang chạy tại trình duyệt là cùng byte với snapshot, cũng không chứng minh lỗi đã được sửa. Nếu lỗi vẫn xuất hiện ở giao diện, cần kiểm tra:
1. Console có lỗi cú pháp nào ngăn script chạy hết hay không.
2. URL đang mở có thực sự tải đúng `preview-v42/index.html`/đúng commit hay cache cũ.
3. Hàm có bị ghi đè hoặc gọi từ một ngữ cảnh khác không.
4. Mã được tải xuống từ trình duyệt (DevTools → Sources/Network) có khớp SHA/nội dung với snapshot hay không.
5. API Apps Script và phản hồi `uploadStatus`/`projectStatus` có còn hoạt động.

Không tự đổi endpoint hoặc sửa backend khi chưa đối chiếu bản nguồn chạy thành công.

## 6. Mốc tốc độ và ưu tiên khôi phục

- Mốc dự phòng do người dùng cung cấp: **10/10 ảnh trong khoảng 34 giây**, được mô tả là lưu thành công.
- Mốc tối ưu mục tiêu: **25,1 giây/10 ảnh**, theo kết quả V24 mà người dùng đã thử nghiệm nhiều lần.
- Mã snapshot đang đặt 5 ảnh đồng thời, nhưng không thể khẳng định mốc thời gian nào nếu chưa chạy thử với cùng 10 file, cùng máy, mạng và backend.

**Thứ tự bắt buộc:** (1) khôi phục đúng luồng lưu đã được xác nhận 10/10; (2) kiểm tra ảnh và metadata đều được xác nhận; (3) sau đó mới so sánh/tối ưu để trở về 25,1 giây. Không tăng concurrency quá 5 chỉ vì muốn nhanh hơn.

## 7. Hướng dẫn tích hợp an toàn vào dự án GHÉP ẢNH 093

1. Dùng snapshot HTML đính kèm làm bằng chứng nguồn; không copy toàn bộ giao diện skin.
2. Trong dự án đích, xác định chính xác phiên bản core đã đạt 10/10. So sánh các hàm `optimizeDriveImage`, `prepareDriveItem`, `waitForUploadStatus`, `sendDrivePayload`, `pti093UploadAll`, `createDriveRecord`, `saveProjectToDrive` cùng các hàm phụ trợ và endpoint.
3. Ưu tiên phục hồi nguyên trạng core đã thử thành công; chỉ sửa adapter/giao diện nếu có khác biệt, không viết lại luồng.
4. Kiểm tra các thao tác theo trình tự: tạo record → upload 10 ảnh → xác nhận 10/10 theo từng upload key → lưu project metadata → tìm/mở lại hồ sơ và xác minh ảnh.
5. Chạy lại cùng bộ 10 ảnh. Ghi riêng thời gian chuẩn bị, gửi/xác nhận, lưu metadata và tổng thời gian.
6. Nếu bất kỳ ảnh nào chưa xác nhận, không báo thành công và không tăng bộ đếm giả.
7. Không đưa thay đổi lên nhánh đang chạy trước khi test và có phương án quay lui.

## 8. Trạng thái gói bàn giao

- [x] Đọc file nguồn cụ thể `preview-v42/index.html` trên `main` (không lấy file gốc `/index.html`).
- [x] Ghi lại SHA blob nguồn và tạo snapshot nguyên trạng.
- [x] Xác định cấu hình concurrency 5 và các hàm chính.
- [x] Ghi lại luồng xử lý, trạng thái xác nhận, cấu hình, lỗi đã báo và checklist khắc phục.
- [ ] Chưa xác minh được rằng deployment đang mở trong trình duyệt đúng cùng nội dung snapshot.
- [ ] Chưa thực hiện chạy thử upload trên Google Drive.
- [ ] Chưa đối chiếu byte-by-byte với bản core chuẩn V24/V40 hoặc bản 10/10 ~34 giây nếu bản đó nằm ở file/commit khác.
- [ ] Chưa xác nhận mốc 25,1 giây.

**Nguyên tắc:** đây là gói chuyển giao để phục hồi core; không phải tuyên bố chức năng Drive đã được sửa hoặc đã được kiểm thử trong phiên này.
