# Kết nối Google Sheets + Gmail (5 phút)

App tĩnh không tự gửi mail được. Phần này dùng **Google Apps Script của chính anh**:
app gửi dữ liệu lên một Web App, script ghi vào Google Sheets trong Drive và gửi mail
kèm file Excel **mỗi khi một lô được đánh dấu hoàn tất**. Miễn phí, không lộ mật khẩu.

## Cài đặt

1. Mở app → menu (☰) → **Đồng bộ Google & báo cáo mail** → mở **Hướng dẫn cài đặt** →
   bấm **Sao chép mã Code.gs** (hoặc tải file `Code.gs` trong thư mục này).
2. Vào [script.google.com](https://script.google.com/) → **Dự án mới**, đặt tên “KK2027”.
3. Xoá nội dung mặc định trong `Code.gs`, dán toàn bộ mã vừa sao chép.
4. (Tuỳ chọn) Sửa dòng đầu:
   ```js
   const EMAIL_NHAN = ''; // để trống = gửi về Gmail đang đăng nhập
   ```
   Muốn nhận ở địa chỉ khác thì điền, ví dụ `'ten@gmail.com'`.
5. Bấm **Chạy** hàm `testSetup` một lần → Google hỏi quyền → **Cho phép**
   (Drive, Trang tính, Gửi email; sau đó thêm **Kết nối với dịch vụ bên ngoài**
   để script tải file `.xlsx` từ Google Sheets làm tệp đính kèm).
   Script sẽ tạo file **“KK2027 - Tiến độ kiểm kê”** trong Drive của anh
   (kiểm tra bằng link trong phần Kết quả chạy).
6. Bấm **Triển khai → Triển khai mới → Ứng dụng web**:
   - **Thực thi với tư cách:** Tôi
   - **Ai có quyền truy cập:** Mọi người
   - Bấm **Triển khai**, cấp quyền nếu được hỏi.
7. Sao chép URL dạng `https://script.google.com/macros/s/…/exec`.
8. Quay lại app, dán URL vào ô **URL Web App**, bấm **Lưu cấu hình**, rồi **Gửi thử**.
   - Nhận được mail “Mail thử kết nối” là xong.
   - Nếu không thấy mail, kiểm tra mục **Thư rác/Spam**.

## Cách hoạt động

- Sau mỗi lần lưu dữ liệu, app tự gửi bản mới lên Google sau ~5 giây
  (bật/tắt bằng ô **Tự đồng bộ sau khi lưu dữ liệu**).
- Khi bấm **Đánh dấu hoàn tất** một lô, app gửi ngay và Google gửi 1 mail kèm file
  Excel `.xlsx` của toàn bộ tiến độ.
- Trong Google Sheets có 3 tab:
  - **Tiến độ**: 95 lô + KV, trạng thái, tổng 2026/2027, lệch, giờ hoàn tất.
  - **Theo ngày**: mỗi ngày một dòng (lô đã nhập, đã xong, cảnh báo, tổng cây…)
    để xem tiến độ theo ngày.
  - **Nhật ký**: các lần lô hoàn tất và đồng bộ tay.
- Nhiều máy/điện thoại dùng **cùng một URL** sẽ ghi về cùng một Sheet
  (bản gửi sau ghi đè bảng Tiến độ bằng dữ liệu của máy đó — không tự gộp số liệu).
  Vì vậy nên nhập tập trung trên 1 máy, hoặc mỗi người xuất Excel phần lô của mình.

## Khi sửa Code.gs

Sửa xong phải vào **Triển khai → Quản lý triển khai → biểu tượng bút → Phiên bản: Mới**
rồi **Triển khai**. Không cần đổi URL nếu vẫn dùng đúng deployment cũ.

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| App báo “HTTP 401/403” hoặc trả về trang đăng nhập | Kiểm tra lại quyền truy cập Web App = **Mọi người** |
| Gửi thử báo “không đọc được phản hồi” | Trình duyệt chặn CORS; dữ liệu vẫn được ghi nhưng app không hiện được link Sheet. Mở Drive kiểm tra file “KK2027 - Tiến độ kiểm kê”. |
| Không nhận được mail | Xem Spam; kiểm tra `EMAIL_NHAN`; tài khoản Gmail còn hạn mức gửi mail |
| Muốn đổi nơi lưu | Xoá property `SPREADSHEET_ID` trong Apps Script (Cài đặt dự án → Thuộc tính tập lệnh), chạy `testSetup` lại |
