# Gói bàn giao — Nút Lưu HS Drive
**Dự án:** GHÉP ẢNH 093 (không áp dụng tự động sang GHÉP ẢNH PTI)  
**Ngày:** 16/10/2026  
**Mục đích:** Chuyển riêng chức năng lưu hồ sơ lên Google Drive sang bản thử nghiệm để kiểm tra an toàn trước khi cân nhắc đưa vào bản chính.

## 1. Trạng thái và phạm vi
- Đây là **gói bàn giao chức năng + tiêu chí kiểm thử**, không phải xác nhận đã triển khai vào ứng dụng thử nghiệm.
- Không sửa bản chính V40 và không thay đổi mã nguồn ứng dụng trong gói tài liệu này.
- Nhánh thử nghiệm từng được nhắc là `preview-v42` hiện không tìm thấy trong danh sách nhánh của repo tại thời điểm lập gói. Không được tự suy diễn rằng bản thử nghiệm đó đang tồn tại/đang chạy.
- Nhánh tài liệu được tạo riêng: `handover-save-hs-drive-20261016`; chỉ chứa tài liệu bàn giao.
- Repo nguồn đối chiếu: `ngocttgdbt-093/pti093`, nhánh `main`. Không sao chép sang repo PTI nếu chưa có yêu cầu riêng.
- Lỗi đã ghi nhận ở bản thử nghiệm trước: `window.pti093UploadAll is not a function`. Bản `main` hiện có định nghĩa `window.pti093UploadAll`, nhưng điều đó **không chứng minh** nhánh thử nghiệm đã được sửa hoặc triển khai.

## 2. Hành vi mong muốn của nút
Nút lưu hồ sơ Drive phải hoàn thành đủ các bước theo thứ tự và chỉ báo thành công sau khi có xác nhận phù hợp từ máy chủ:

1. Kiểm tra dữ liệu hồ sơ tối thiểu (Mã HS/BKS và các trường đang được ứng dụng yêu cầu).
2. Xác định đây là hồ sơ mới hay hồ sơ đã có:
   - Hồ sơ mới: gọi API tạo hồ sơ, nhận `recordId`.
   - Hồ sơ đã có `recordId`: cập nhật đúng hồ sơ đó, không tạo bản ghi trùng.
3. Lưu ảnh lên Drive theo thứ tự **tuần tự** (concurrency = 1), tránh gửi đồng thời gây xung đột ScriptLock.
4. Với từng ảnh, chỉ tăng bộ đếm khi máy chủ xác nhận; lưu lại trạng thái/id để có thể phục hồi khi mạng gián đoạn.
5. Lưu metadata dự án (ví dụ: Mã HS, BKS, GĐV, ngày, garage/địa điểm, nhóm ảnh, chú thích, thứ tự và tham chiếu tệp Drive).
6. Chỉ báo “lưu thành công” khi tất cả phần bắt buộc đã được xác nhận. Nếu còn ảnh lỗi/chưa xác nhận, phải hiển thị số đã xác nhận, số còn lại và lý do; cho phép thử lại mà không tải trùng ảnh đã xác nhận.
7. Khóa nút trong lúc đang lưu để tránh nhấn lặp; luôn mở khóa lại sau khi kết thúc, kể cả lỗi.

## 3. Hợp đồng kỹ thuật cần đối chiếu
Các tên dưới đây là điểm cần kiểm tra trong mã nguồn, không phải lời khẳng định rằng mọi nhánh đều có cùng phiên bản:
- Hàm điều phối lưu hồ sơ: `createDriveRecord()`.
- Hàm tải ảnh: `window.pti093UploadAll()`.
- Lưu metadata hồ sơ: `saveProjectToDrive()`.
- API backend: cấu hình `PTI093_API`, thao tác tạo hồ sơ dùng `action=createRecord`.
- Khóa hồ sơ Drive: `state.driveRecordId` / `recordId`.
- Trạng thái upload theo ảnh: `driveFileId`, `driveUploadKey`, `drivePendingUploadKey` và bộ khóa ảnh đã tải.
- UI tiến trình: `driveProgress`, `driveProgressBar`, `driveProgressPct`, `driveProgressText`, `driveProgressMeta`.
- Hàm trạng thái/lỗi cần đối chiếu: `setDriveState()`, `renderDriveUploadFailures()`, `sendDrivePayload()`, `waitForUploadStatus()`.

Không chép nguyên cả `index.html` từ nhánh main vào nhánh thử nghiệm. Chỉ chuyển các hàm và thành phần phụ thuộc cần thiết, sau khi so sánh mã nguồn hai nhánh để giữ nguyên các thay đổi riêng của bản thử nghiệm.

## 4. Các lỗi cần ngăn
- Gọi `window.pti093UploadAll()` khi hàm chưa được nạp hoặc không nằm trên `window`.
- Báo thành công dù API trả lỗi, phản hồi không hợp lệ hoặc còn ảnh chưa xác nhận.
- Tạo hồ sơ trùng khi bấm lưu lại một hồ sơ đã có `recordId`.
- Gửi ảnh đồng thời hoặc gửi lại ảnh đã được xác nhận.
- Lưu metadata trước khi có `recordId` hợp lệ hoặc lưu tham chiếu ảnh thiếu.
- Nút bị khóa vĩnh viễn sau lỗi; giao diện không nêu rõ ảnh nào lỗi.
- Dùng hồ sơ thật trong lần kiểm thử đầu.

## 5. Kịch bản kiểm thử bắt buộc
Chỉ dùng dữ liệu giả lập/ảnh thử nghiệm và một thư mục Drive thử nghiệm được phép ghi.

| Mã | Kịch bản | Kết quả đạt |
|---|---|---|
| D01 | Tạo hồ sơ mới với 1–3 ảnh | Có đúng một Record ID; metadata và ảnh được xác nhận; UI báo thành công |
| D02 | Lưu thay đổi hồ sơ đã có | Cập nhật đúng Record ID; không tạo hồ sơ mới |
| D03 | Mất mạng/lỗi ở một ảnh | Không báo thành công toàn bộ; hiển thị số đã xác nhận và ảnh lỗi |
| D04 | Thử lại sau D03 | Chỉ gửi phần chưa xác nhận; không tạo ảnh trùng |
| D05 | Nhấn nút liên tục | Chỉ có một luồng lưu hoạt động; nút được khóa trong lúc chạy |
| D06 | API tạo hồ sơ trả lỗi/JSON lỗi | Hiển thị lỗi rõ; không tiếp tục tải ảnh với Record ID rỗng |
| D07 | Không có ảnh | Thông báo rõ; không báo đã lưu ảnh |
| D08 | Tải lại trang rồi mở hồ sơ | Tìm/mở đúng hồ sơ và ảnh theo Record ID |
| D09 | Quan sát tiến trình | Bộ đếm chỉ tăng sau xác nhận máy chủ; trạng thái cuối phản ánh kết quả thực |
| D10 | Kiểm tra ranh giới dự án | Không ghi vào dữ liệu/Drive thuộc dự án PTI hoặc hồ sơ thật |

## 6. Điều kiện nghiệm thu
Chỉ chấp nhận chuyển sang giai đoạn tiếp theo khi:
- [ ] Không còn lỗi `pti093UploadAll is not a function`.
- [ ] D01, D02, D03, D04, D05 và D06 đều đạt.
- [ ] Record ID và số ảnh trên Drive khớp với trạng thái ứng dụng.
- [ ] Không tạo hồ sơ/ảnh trùng khi lưu lại hoặc thử lại.
- [ ] Ghi lại URL nhánh thử nghiệm, commit SHA, ảnh chụp kết quả và lỗi còn tồn tại.
- [ ] Chưa đưa thay đổi vào bản chính V40 trước khi người dùng duyệt.

## 7. Hướng dẫn nhận gói
1. Mở tài liệu này trên nhánh `handover-save-hs-drive-20261016`.
2. Mở mã nguồn nhánh thử nghiệm thực tế và xác nhận đúng nhánh/commit trước khi sửa.
3. So sánh phần nút lưu, `createDriveRecord()`, `window.pti093UploadAll()`, `saveProjectToDrive()`, API và các hàm phụ thuộc.
4. Chuyển các thay đổi tối thiểu vào nhánh thử nghiệm; không merge vào `main`.
5. Chạy checklist ở mục 5, ghi rõ đạt/không đạt và commit SHA.
6. Chỉ bàn giao lại để duyệt sau khi có bằng chứng kiểm thử.

## 8. Nguồn đối chiếu
- Repo GHÉP ẢNH 093: https://github.com/ngocttgdbt-093/pti093
- Mã nguồn main: https://github.com/ngocttgdbt-093/pti093/blob/main/index.html
- Nhánh tài liệu bàn giao: https://github.com/ngocttgdbt-093/pti093/tree/handover-save-hs-drive-20261016

**Lưu ý:** Gói này không chứa thông tin bí mật/API key và không bao gồm dữ liệu hồ sơ thật. Chưa có kiểm thử thực tế nào được đánh dấu đạt trong tài liệu này.
