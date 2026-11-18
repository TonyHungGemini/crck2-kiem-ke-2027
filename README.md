# Kiểm kê vườn cây 2027 – Đội 2 CRCK2

**Chạy online:** https://tonyhunggemini.github.io/crck2-kiem-ke-2027/

Web app tĩnh (PWA) nhập kết quả kiểm kê vườn cây cao su theo dòng tổng từng hàng, tự kiểm tra chéo và đối chiếu với kiểm kê 0h ngày 01/01/2026.

## Tính năng

- **Nhập nhanh theo tờ**: chọn Khu vực rồi chọn lô, mỗi tờ 2 hàng, nhập các số ở dòng cuối phiếu: `Tổng ĐT, +, C, K1, K2, O` và `G`. Trên máy tính, nhấn **Space** thay cho nút **Lưu & tờ tiếp** để nhập liên tục.
- **G tự tính (mặc định)**: chỉ cần nhập `Tổng ĐT` và các cột `+, C, K1, K2, O`; ô `G` tự tính `= Tổng ĐT − (+, C, K1, K2, O)` và được đặt cuối lưới nhập để gõ liên tục một lượt. Bấm **Đủ 7 số** để quay lại nhập tay đủ 7 số và dò khớp/lệch; lựa chọn được ghi nhớ trên máy.
- **Chọn ngôn ngữ toàn app**: lần đầu mở app sẽ hỏi chọn **Tiếng Việt / ខ្មែរ**; áp dụng cho toàn bộ giao diện (trang chủ, nhập nhanh, chi tiết lô, bản đồ, menu). Số, số lô và ký hiệu G, +, C, K1, K2, O giữ nguyên; file Excel xuất ra luôn là tiếng Việt. Đổi lại bất cứ lúc nào bằng nút ngôn ngữ ở góc phải trên màn hình chính (hoặc **Menu → Ngôn ngữ**).
- **Tạm lưu & nhập tiếp**: bấm **Tạm lưu** khi có sự cố (thiếu phiếu…); lô hiện **Sơ đồ hàng** — ô xanh bấm để sửa hàng, ô viền đứt bấm để nhập hàng thiếu, nút **Nhập tiếp h.N** mở lại đúng hàng đang dở. Sau khi tạm lưu, lô vừa nhập tự lên đầu danh sách và được tô nổi bật.
- **Tự lưu bản nháp**: số đang gõ trong hộp Nhập nhanh được lưu nháp liên tục; lỡ tải lại trang hay đóng app vẫn khôi phục đúng tờ đang nhập. Bản nháp tự xoá sau khi bấm **Tạm lưu** hoặc **Lưu & tờ tiếp**.
- **Tự kiểm tra từng hàng**: báo đỏ nếu `Tổng ĐT ≠ G + (+) + C + K1 + K2 + O`; chặn hàng trùng số.
- **Lô chia hướng A/B/C (lô 117 và 351)**: mỗi lô nhập lần lượt từng hướng; thanh chọn **Tất cả / A / B / C** hiện số hàng từng hướng, bảng có thêm cột **Hướng** để đổi hướng cho từng hàng. Tổng cây của lô là tổng cả 3 hướng và đối chiếu với một mốc 2026 duy nhất (117: 8.178; 351: 10.163). Kiểm tra hàng trùng/thiếu hàng/hàng bất thường, phúc tra và cảnh báo đều tính riêng theo từng hướng; sổ nhập nhanh lưu nháp riêng từng hướng. Phúc tra đọc bảng chi tiết 2026 tách hướng (117A/B/C, 351A/B/C) nên so từng hàng theo đúng hướng. Xuất Excel lô chia hướng ra một sheet cho mỗi hướng + sheet `Đối chiếu 2026` cộng cả 3 hướng.
- **Nhắc hàng bất thường**: khi xem lô, hàng có `Tổng ĐT` khác mức chung của lô (giá trị xuất hiện nhiều nhất, từ 4 hàng đã nhập trở lên) — lệch từ 1 cây trở lên — được tô nhẹ màu vàng, kèm dòng nhắc liệt kê số hàng để xem lại; hết lệch thì tự bỏ đánh dấu.
- **Đối chiếu 2026 theo lô**: so tổng điểm trồng 2027 với baseline 2026; mọi chênh lệch đều được cảnh báo khi lô được đánh dấu hoàn tất. Đối chiếu thêm từng loại cây để tham khảo.
- **Cảnh báo baseline lỗi**: 9 lô trong file 2026 gốc có nội bộ lệch 2–241 cây giữa "Tổng số cây KK" và tổng 6 cột; tool hiển thị riêng để kiểm tra.
- **Xuất Excel**:
  - Từng lô: `BẢNG TỔNG HỢP KẾT QUẢ KIỂM KÊ` theo mẫu `Mẫu nhập KK.xlsx`.
  - Tổng hợp: `BẢNG TỔNG HỢP KẾT QUẢ KIỂM KÊ VƯỜN CÂY 0H NGÀY 01/01/2027` + sheet `Kiểm tra` + sheet `Tiến độ`.
  - Ô **cây G** luôn là công thức `= Tổng điểm trồng − (+, C, K1, K2, O)`, sửa các số kia thì G tự cập nhật.
- **Lưu trên máy**: localStorage, tự lưu khi nhập; có sao lưu/phục hồi JSON.
- **Đồng bộ Google + mail**: tự ghi tiến độ vào Google Sheets (Drive của anh); khi một lô hoàn tất, Apps Script gửi mail kèm **file Excel lô đúng mẫu "Xuất Excel lô"** (sheet `Lô …` + `Đối chiếu 2026`) để tổng hợp, cùng file Excel tiến độ chung. URL Web App đã điền sẵn nên máy mới mở app là đồng bộ được ngay. Lần đầu mở app hiện nhắc nhập **Tên người dùng** (có thể **Để sau**; vẫn đồng bộ bình thường) để tab Chi tiết và Nhật ký ghi rõ ai nhập; người dùng Khmer ghi tên bằng chữ Latin/English. Nhiều máy dùng chung một Sheet và được gộp theo lô, không đè dữ liệu của nhau. App tự tải tiến độ đội khi mở; bấm **Tải tiến độ đội về máy** để làm mới, lô máy khác đã nhập/hoàn tất hiện viền nét đứt trên bản đồ. Xem `apps-script/README.md`.
- **Chuông thông báo lô hôm nay**: nút chuông trên thanh trên cùng hiện số lô **máy khác đã nhập trong hôm nay** (kèm khu vực, người nhập, số hàng/cây). Bấm một lô để mở thẳng tab Chi tiết của lô đó. Trạng thái đã xem lưu riêng trên từng máy: máy này bấm xem không làm mất thông báo trên máy khác. Cần có URL đồng bộ; ở hộp **Chi tiết đồng bộ**, danh sách lô hiện kèm khu vực (ví dụ `250 · KV2 · 83 hàng`).
- **Bản đồ tiến độ**: ranh 95 lô tô màu theo trạng thái (chưa nhập / đang nhập / hoàn tất / cảnh báo); tổng hợp theo 8 khu vực, liệt kê lô còn thiếu; bấm khu vực để phóng to, bấm lô để mở.
- **Offline/PWA**: cài lên Desktop hoặc điện thoại, dùng không cần mạng (nền vệ tinh cần mạng, ranh lô vẫn hiện khi offline).
- **Mobile-first**: bàn phím số, tự chuyển ô khi Enter, bảng cuộn ngang trên điện thoại.

## Dữ liệu baseline

`assets/baseline.js` được trích từ:

`Data Nông trường Đội 2/04_KỸ THUẬT & PHẦN CÂY/Chung/KIỂM KÊ CÂY CẠO/2026/TỔNG HỢP KIỂM KÊ 2025-2026.xlsx`

- 95 lô, đủ 6 cột `G, +, C, K1, K2, O`.
- Tổng số cây KK: **1.146.724**.
- Tổng 6 cột: **1.146.434** (chênh 290 cây do 9 lô lệch nội bộ trong file gốc).

File `KIỂM KÊ CÂY CẠO CHI TIẾT THEO KHU VỰC.xlsx` (984.085 cây) là bảng giao kế hoạch sản lượng 2026, thiếu cột K1/K2/O, không dùng làm baseline.

## Quy tắc kiểm tra

1. `Tổng ĐT = G + (+) + C + K1 + K2 + O` cho từng hàng.
2. Không trùng số hàng trong cùng lô — với lô chia hướng, xét riêng trong từng hướng.
3. Tổng điểm trồng của lô = tổng `Tổng ĐT` các hàng (lô chia hướng: cộng cả 3 hướng).
4. Khi lô được đánh dấu **hoàn tất**, mọi chênh lệch tổng so với 2026 đều là cảnh báo đỏ.
5. Khi lô đang nhập, chênh lệch chỉ là "tạm tính" để tránh nhiễu.

## Dùng trên máy

```bash
cd crck2-kiem-ke-2027
python3 -m http.server 8080
# mở http://localhost:8080
```

## Deploy GitHub Pages

1. Tạo repo mới trên GitHub, ví dụ `crck2-kiem-ke-2027` (public).
2. Push mã nguồn lên nhánh `main`.
3. Vào **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Workflow `.github/workflows/pages.yml` sẽ tự deploy mỗi lần push.
5. Link dạng: `https://<user>.github.io/crck2-kiem-ke-2027/`.

## Cấu trúc

```
index.html                 giao diện
assets/styles.css          giao diện Claude-like, responsive
assets/app.js              logic nhập liệu, kiểm tra, xuất Excel
assets/baseline.js         baseline 2026 (95 lô)
assets/geo.js              ranh 95 lô (GeoJSON, từ bando_NT2.html)
apps-script/Code.gs        Apps Script: Google Sheets + mail báo cáo
apps-script/README.md      hướng dẫn cài Apps Script (5 phút)
vendor/xlsx.style.min.js  xlsx-js-style (xuất Excel có định dạng, chạy offline)
vendor/leaflet/            Leaflet 1.9.4 (bản đồ, chạy offline)
manifest.webmanifest       PWA
sw.js                      service worker cache offline
icons/                     icon PWA
.github/workflows/pages.yml
```

## Sao lưu

Dữ liệu nằm trong localStorage của trình duyệt trên máy đang dùng — **không tự lưu lên Google Drive hay cloud**, và mỗi máy/trình duyệt có một bản riêng. Định kỳ bấm **Sao lưu** để tải file JSON (có thể cất vào Drive); đổi máy thì dùng **Phục hồi** để nhập lại (ghi đè, không gộp). Xoá dữ liệu trình duyệt sẽ mất dữ liệu chưa sao lưu.
