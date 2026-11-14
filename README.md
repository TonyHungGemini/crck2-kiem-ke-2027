# Kiểm kê vườn cây 2027 – Đội 2 CRCK2

**Chạy online:** https://tonyhunggemini.github.io/crck2-kiem-ke-2027/

Web app tĩnh (PWA) nhập kết quả kiểm kê vườn cây cao su theo dòng tổng từng hàng, tự kiểm tra chéo và đối chiếu với kiểm kê 0h ngày 01/01/2026.

## Tính năng

- **Nhập nhanh theo tờ**: mỗi tờ 2 hàng, chỉ nhập 7 số ở dòng cuối phiếu: `Tổng ĐT, G, +, C, K1, K2, O`.
- **Tự kiểm tra từng hàng**: báo đỏ nếu `Tổng ĐT ≠ G + (+) + C + K1 + K2 + O`; chặn hàng trùng số.
- **Đối chiếu 2026 theo lô**: so tổng điểm trồng 2027 với baseline 2026; mọi chênh lệch đều được cảnh báo khi lô được đánh dấu hoàn tất. Đối chiếu thêm từng loại cây để tham khảo.
- **Cảnh báo baseline lỗi**: 9 lô trong file 2026 gốc có nội bộ lệch 2–241 cây giữa "Tổng số cây KK" và tổng 6 cột; tool hiển thị riêng để kiểm tra.
- **Xuất Excel**:
  - Từng lô: `BẢNG TỔNG HỢP KẾT QUẢ KIỂM KÊ` theo mẫu `Mẫu nhập KK.xlsx`.
  - Tổng hợp: `BẢNG TỔNG HỢP KẾT QUẢ KIỂM KÊ VƯỜN CÂY 0H NGÀY 01/01/2027` + sheet `Kiểm tra` + sheet `Tiến độ`.
- **Lưu trên máy**: localStorage, tự lưu khi nhập; có sao lưu/phục hồi JSON.
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
2. Không trùng số hàng trong cùng lô.
3. Tổng điểm trồng của lô = tổng `Tổng ĐT` các hàng.
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
vendor/xlsx.full.min.js    SheetJS (xuất Excel, chạy offline)
vendor/leaflet/            Leaflet 1.9.4 (bản đồ, chạy offline)
manifest.webmanifest       PWA
sw.js                      service worker cache offline
icons/                     icon PWA
.github/workflows/pages.yml
```

## Sao lưu

Dữ liệu nằm trong localStorage của trình duyệt trên máy đang dùng — **không tự lưu lên Google Drive hay cloud**, và mỗi máy/trình duyệt có một bản riêng. Định kỳ bấm **Sao lưu** để tải file JSON (có thể cất vào Drive); đổi máy thì dùng **Phục hồi** để nhập lại (ghi đè, không gộp). Xoá dữ liệu trình duyệt sẽ mất dữ liệu chưa sao lưu.
