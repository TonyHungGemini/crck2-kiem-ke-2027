# Kết nối Google Sheets + Gmail (5 phút)

App tĩnh không tự gửi mail được. Phần này dùng **Google Apps Script của chính anh**:
app gửi dữ liệu lên một Web App, script ghi vào Google Sheets trong Drive và gửi mail
kèm file Excel **mỗi khi một lô được đánh dấu hoàn tất**. Miễn phí, không lộ mật khẩu.
Ngoài tổng tiến độ, script còn ghi **chi tiết từng hàng**, **danh sách cảnh báo** và
**nhật ký nhập** (ai/máy nào sửa hàng nào, lúc nào).

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
8. App đã điền sẵn URL này; máy mới mở app là đồng bộ được ngay.
   Nếu anh tự tạo dự án Apps Script khác, dán URL của mình vào ô **URL Web App**,
   bấm **Lưu cấu hình**, rồi **Gửi thử**.
   - Nhận được mail “Mail thử kết nối” là xong.
   - Nếu không thấy mail, kiểm tra mục **Thư rác/Spam**.

## Cách hoạt động

- Sau mỗi lần lưu dữ liệu, app tự gửi bản mới lên Google sau ~5 giây
  (bật/tắt bằng ô **Tự đồng bộ sau khi lưu dữ liệu**).
- Điền **Tên máy / người nhập** trong menu **Đồng bộ Google** (một lần trên mỗi
  điện thoại) để cột “Máy / người nhập” trong các tab ghi đúng người thực hiện.
- Khi bấm **Đánh dấu hoàn tất** một lô, app gửi ngay và Google gửi 1 mail kèm **2 file Excel**:
  file **KK2027_Lo_…xlsx** của chính lô đó (đúng mẫu **Xuất Excel lô**: sheet `Lô …` + `Đối chiếu 2026`)
  và file tiến độ chung của cả vườn.
- Trong Google Sheets có 6 tab:
  - **Tiến độ**: 95 lô + KV, trạng thái, tổng 2026/2027, lệch, giờ hoàn tất.
  - **Theo ngày**: mỗi ngày một dòng (lô đã nhập, đã xong, cảnh báo, tổng cây…)
    để xem tiến độ theo ngày.
  - **Chi tiết**: từng hàng của từng lô — Tổng ĐT, G, +, C, K1, K2, O, số 2026,
    lệch phúc tra, trạng thái, người nhập, máy nhập, giờ cập nhật, **Hướng** (A/B/C
    với lô 117 và 351).
  - **Cảnh báo**: tự lọc hàng lệch tổng 6 cột, trùng số hàng, thiếu số hàng và
    lệch phúc tra ≥ 2 cây; hàng phúc tra tô vàng cam, lỗi khác tô hồng đỏ; hàng
    của lô chia hướng ghi rõ “Hướng A/B/C”.
  - **Nhật ký nhập**: ai/máy nào thêm, sửa hay xoá hàng nào, giá trị cũ → mới.
    Lần đồng bộ đầu tiên ghi gọn “Nhập lần đầu: N hàng” cho mỗi lô.
  - **Nhật ký**: các lần lô hoàn tất và đồng bộ tay.
- Nhiều máy/điện thoại dùng **cùng một URL** sẽ ghi về cùng một Sheet. Mỗi lần gửi,
  script **gộp theo lô**: lô nào đã có số liệu và mới hơn (theo thời điểm lưu trên máy)
  thì giữ bản mới, máy khác không xoá mất lô đã nhập. Ngoại lệ: máy nào **xoá hết
  dữ liệu nháp của một lô rồi đồng bộ** (bản gửi có mốc cập nhật mới hơn) thì script
  gỡ các dòng cũ của lô đó ở tab **Tiến độ** và **Chi tiết** — máy khác chỉ gửi mốc
  giờ rỗng sẽ không xoá nhầm.
- Trong app, bấm **Đồng bộ Google → Tải tiến độ đội về máy** (hoặc mở tab **Bản đồ tiến độ**)
  để đọc tiến độ các máy khác về bản đồ: lô do máy khác nhập/hoàn tất hiện viền nét đứt.
  Dữ liệu chỉ để xem, không ghi vào dữ liệu của máy đang dùng.
- Muốn xem **từng hàng** đã đồng bộ ngay trong app: menu ☰ → **Chi tiết đồng bộ (Google)**,
  hoặc bấm **Chi tiết đồng bộ** khi đang mở một lô. Màn hình này đọc tab **Chi tiết** trên
  Sheet, có chọn lô, tô màu cảnh báo/phúc tra và chỉ để xem — không sửa dữ liệu máy.

## Khi sửa Code.gs

Sửa xong phải vào **Triển khai → Quản lý triển khai → biểu tượng bút → Phiên bản: Mới**
rồi **Triển khai**. Không cần đổi URL nếu vẫn dùng đúng deployment cũ.

Bản mới tự tạo thêm 3 tab **Chi tiết**, **Cảnh báo**, **Nhật ký nhập** ngay lần đồng bộ
kế tiếp. Muốn tạo trước, chạy hàm `testSetup` trong editor.

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| App báo “HTTP 401/403” hoặc trả về trang đăng nhập | Kiểm tra lại quyền truy cập Web App = **Mọi người** |
| Gửi thử báo “không đọc được phản hồi” | Trình duyệt chặn CORS; dữ liệu vẫn được ghi nhưng app không hiện được link Sheet. Mở Drive kiểm tra file “KK2027 - Tiến độ kiểm kê”. |
| Không nhận được mail | Xem Spam; kiểm tra `EMAIL_NHAN`; tài khoản Gmail còn hạn mức gửi mail |
| Muốn đổi nơi lưu | Xoá property `SPREADSHEET_ID` trong Apps Script (Cài đặt dự án → Thuộc tính tập lệnh), chạy `testSetup` lại |
