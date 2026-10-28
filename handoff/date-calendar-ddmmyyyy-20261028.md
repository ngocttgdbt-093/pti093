# Gói chuyển giao — Lịch chọn ngày giám định PTI/093/Core
**Ngày:** 28/10/2026  
**Phạm vi:** Trường “Ngày giám định”; lịch chọn ngày tùy chỉnh; viền xanh bo góc; giữ định dạng `dd/mm/yyyy`.  
**Không thuộc phạm vi:** Không thay đổi cơ chế ghép ảnh, lưu nháp, lưu Drive, danh sách GĐV hoặc các trường khác.

## 1. Hành vi cần có
- Người dùng có thể nhập ngày trực tiếp; tự định dạng thành `dd/mm/yyyy`.
- Nút lịch mở lịch tùy chỉnh của ứng dụng (không dùng lịch native mặc định của trình duyệt).
- Lịch có viền xanh lá mảnh, bo góc 12px, bóng nhẹ; nút chuyển tháng và ngày được chọn cùng tông xanh.
- Tuần bắt đầu từ thứ Hai; có điều hướng tháng trước/sau.
- Có thao tác **Xóa** và **Hôm nay**.
- Chọn ngày cập nhật trường nhập theo `dd/mm/yyyy`; các sự kiện `input` và `change` được phát để tương thích logic hiện hữu.
- Bấm ngoài lịch thì lịch đóng; bấm trong lịch không làm lịch đóng trước khi xử lý thao tác.
- Giữ nguyên logic kiểm tra/ngày ISO hiện có của dự án đích nếu có. Không đổi format lưu nội bộ hoặc format PDF nếu chưa kiểm tra toàn luồng.

## 2. Phạm vi thay đổi trên 093
Đã cập nhật `index.html` của `ngocttgdbt-093/pti093`, nhánh `main`.
- Commit triển khai mã: [d6a9182b1b0fa66747e0ff2933ea56d23709ed2f](https://github.com/ngocttgdbt-093/pti093/commit/d6a9182b1b0fa66747e0ff2933ea56d23709ed2f)
- Trường ngày được bọc bởi `.dateFieldWrap`, có nút `#datePickerBtn` và popup `#dateCalendar`.
- Lịch sử dụng các hàm `dateCalParse`, `dateCalRender`, `dateCalSet`; gọi hàm `setDateInput(iso)` sẵn có để giữ format dự án 093.

**Lưu ý trạng thái:** Mã đã được ghi lên GitHub; chưa xác nhận kiểm thử thực tế trên trang 093 đã triển khai. Không coi là nghiệm thu cho đến khi hoàn thành checklist ở mục 5.

## 3. Các thành phần cần mang sang Core
### HTML
- Bọc input ngày hiện hữu trong `<div class="dateFieldWrap">`.
- Giữ input ngày và các thuộc tính/ID đang được core sử dụng.
- Thêm nút `#datePickerBtn`.
- Thêm popup `#dateCalendar` gồm:
  - `#dateCalPrev`, `#dateCalNext`: điều hướng tháng.
  - `#dateCalTitle`: tiêu đề tháng/năm.
  - `#dateCalDays`: vùng các ngày.
  - `#dateCalClear`, `#dateCalToday`: xóa ngày và chọn hôm nay.
- Không sao chép mù quáng ID của ví dụ nếu core có quy ước ID khác; cập nhật đồng bộ HTML và JS.

### CSS
Chuyển các quy tắc CSS dưới đây, điều chỉnh selector nếu core dùng class khác:
```css
.dateFieldWrap{display:flex;align-items:stretch;gap:5px;position:relative;padding:3px;border:1px solid #c8ddd2;border-radius:9px;background:#fff;transition:border-color .15s ease,box-shadow .15s ease}
.dateFieldWrap:focus-within{border-color:#00854a;box-shadow:0 0 0 2px rgba(0,133,74,.08)}
.dateFieldWrap #date{flex:1;min-width:0;border:0!important;border-radius:6px!important;outline:none!important;background:transparent!important;padding:8px 9px!important}
.datePickerBtn{flex:0 0 36px;border:1px solid #c8ddd2;border-radius:7px;background:#f4faf6;color:#176b4b;cursor:pointer;font-size:17px;transition:background .15s ease,border-color .15s ease}
.datePickerBtn:hover{background:#e4f4eb;border-color:#00854a}
.dateCalendar{position:absolute;z-index:30;right:0;top:calc(100% + 7px);width:252px;padding:10px;background:#fff;border:1px solid #a8cdb8;border-radius:12px;box-shadow:0 8px 24px rgba(0,70,38,.16);color:#173b2a}
.dateCalendar.hidden{display:none}
.dateCalHead{display:grid;grid-template-columns:32px 1fr 32px;align-items:center;gap:6px;margin-bottom:10px}
.dateCalHead strong{text-align:center;font-size:13px;color:#006f3d}
.dateCalHead button{height:30px;border:1px solid #d1e4d8;border-radius:8px;background:#f4faf6;color:#176b4b;font-size:21px;line-height:1;cursor:pointer}
.dateCalHead button:hover,.dateCalFoot button:hover{border-color:#00854a;background:#e6f5ec}
.dateCalWeek,.dateCalDays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center}
.dateCalWeek{margin-bottom:5px;color:#47735c;font-size:11px;font-weight:700}
.dateCalDays button{height:28px;padding:0;border:1px solid transparent;border-radius:7px;background:#fff;color:#263c30;font-size:12px;cursor:pointer}
.dateCalDays button:hover{background:#e7f5ed;border-color:#b7d9c5}
.dateCalDays button.outside{color:#a5b0a9}
.dateCalDays button.today{border-color:#8ac5a3}
.dateCalDays button.selected{background:#00854a;border-color:#00854a;color:#fff;font-weight:700}
.dateCalFoot{display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #e6efe9}
.dateCalFoot button{border:1px solid transparent;border-radius:7px;padding:5px 9px;background:#f4faf6;color:#176b4b;font-size:12px;cursor:pointer}
```

### JavaScript / nguyên tắc tích hợp
- Dùng hàm chuyển đổi ngày ISO và hàm cập nhật trường ngày đang có trong core. Trong bản 093, `dateCalSet(iso)` gọi `setDateInput(iso)`, sau đó phát `input` và `change`.
- Khi render lịch, tạo 42 ô ngày (6 tuần), tính offset theo tuần bắt đầu thứ Hai; dùng chuỗi ngày ISO `YYYY-MM-DD` làm `data-date`.
- Khi người dùng chọn ngày: gọi hàm cập nhật input hiện có, phát sự kiện `input/change`, đóng popup.
- Không giữ đồng thời hai bộ listener cùng định dạng ngày; tránh tạo vòng lặp input.
- Không thêm `type="date"` ẩn nếu đã dùng popup tùy chỉnh.
- Đặt listener đóng popup khi bấm ngoài trên `document`, kiểm tra `closest('.dateFieldWrap')`.

## 4. Lưu ý tương thích Core
1. Tìm và tái sử dụng hàm chuyển đổi ISO ⇄ `dd/mm/yyyy` đã có; không tạo bộ chuyển đổi thứ hai nếu không cần.
2. Giữ nguyên tên ID của input ngày trong core để không làm gãy preview, lưu nháp, xuất PDF hoặc dữ liệu hồ sơ.
3. Nếu Core dùng component/skin riêng, tách CSS vào module skin và chỉ gắn markup/JS một lần; tránh selector toàn cục ảnh hưởng các input khác.
4. Kiểm tra popup không bị cắt bởi `overflow:hidden` của card/container; nếu bị cắt, điều chỉnh stacking/overflow có chủ đích.
5. Đây là gói chuyển giao tính năng UI, không phải xác nhận đã tích hợp vào Core. Cần tích hợp và kiểm thử riêng trong dự án Core.

## 5. Checklist nghiệm thu bắt buộc
- [ ] Bấm biểu tượng lịch: popup hiện ngay dưới trường, viền xanh mảnh và góc bo mềm.
- [ ] Tháng trước/sau cập nhật đúng tháng và năm.
- [ ] Thứ tự cột từ thứ Hai đến Chủ nhật; ngày đầu/cuối tháng không lệch cột.
- [ ] Chọn một ngày, ví dụ 05/01/2026: input hiển thị đúng `05/01/2026`.
- [ ] Gõ trực tiếp ngày vẫn tự định dạng `dd/mm/yyyy`.
- [ ] Chọn **Hôm nay** điền đúng ngày hiện tại theo `dd/mm/yyyy`.
- [ ] Chọn **Xóa** xóa trường ngày.
- [ ] Bấm ngoài popup đóng lịch; bấm nút/ngày bên trong vẫn hoạt động.
- [ ] Preview, lưu nháp/tải lại và xuất PDF vẫn giữ ngày đúng, không đảo tháng/ngày.
- [ ] Kiểm thử Chrome và Edge; kiểm tra bố cục mobile.
- [ ] Không phát sinh lỗi JavaScript console hoặc ảnh hưởng các chức năng ghép ảnh.

## 6. Ranh giới thực thi
- Đã thực hiện: cập nhật mã trên nhánh `main` của repo 093 và tạo gói tài liệu chuyển giao này.
- Chưa thực hiện: thay đổi repo Core (chưa có đích tích hợp được chỉ định trong yêu cầu này).
- Chưa xác nhận: kiểm thử end-to-end trên trang 093 sau deploy và nghiệm thu Core.
