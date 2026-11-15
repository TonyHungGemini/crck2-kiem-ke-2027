/************************************************************
 * KK2027 – Nhận dữ liệu từ app kiểm kê 2027
 * - Ghi tiến độ vào Google Sheets (tự tạo file trong Drive)
 * - Ghi bảng theo ngày để theo dõi tiến độ mỗi ngày
 * - Gửi mail kèm file Excel khi một lô được đánh dấu hoàn tất
 *
 * Cài đặt: xem menu “Đồng bộ Google” trong app, hoặc README.md.
 ************************************************************/

const APP_ID = 'crck2-kiem-ke-2027';
const EMAIL_NHAN = ''; // Để trống = gửi về Gmail đang đăng nhập. Hoặc điền 'ten@gmail.com'
const TEN_FILE = 'KK2027 - Tiến độ kiểm kê';
const TIMEZONE = 'Asia/Ho_Chi_Minh';

const PROGRESS_HEADERS = [
  'KV', 'Lô', 'ID lô', 'Đội', 'Giống', 'Năm trồng', 'Diện tích (ha)',
  'Trạng thái', 'Số hàng', 'Tổng ĐT 2027', 'Tổng 2026', 'Lệch',
  'Hoàn tất', 'Hoàn tất lúc', 'Người KK', 'Ngày KK', 'Ghi chú', 'Cập nhật lúc',
  'Mã trạng thái', 'Cập nhật (ISO)',
];
const DAILY_HEADERS = [
  'Ngày', 'Lô đã nhập', 'Lô hoàn tất', 'Lô cảnh báo',
  'Hàng đã nhập', 'Tổng ĐT 2027', 'Tổng 2026 (baseline)', 'Lệch tạm', 'Cập nhật lúc',
];
const LOG_HEADERS = [
  'Thời điểm', 'Lý do', 'Lô', 'KV', 'Trạng thái',
  'Tổng 2027', 'Tổng 2026', 'Lệch', 'Người KK',
];

function doGet(e) {
  const action = e && e.parameter ? String(e.parameter.action || '') : '';
  if (action === 'progress') {
    try {
      const ss = getSpreadsheet_();
      const sh = ss.getSheetByName('Tiến độ');
      const lots = [];
      if (sh && sh.getLastRow() > 1) {
        const vals = sh.getRange(2, 1, sh.getLastRow() - 1, PROGRESS_HEADERS.length).getValues();
        vals.forEach(r => {
          const lot = String(r[1] || '');
          if (!lot) return;
          const entered = Number(r[8]) || 0;
          const done = String(r[12] || '') === 'Có';
          if (!entered && !done) return;
          lots.push({
            lot: lot,
            kv: String(r[0] || ''),
            id: String(r[2] || ''),
            doi: r[3] || '',
            status: String(r[18] || (done ? 'done' : 'doing')),
            statusLabel: String(r[7] || ''),
            entered: entered,
            dt: r[9] === '' ? null : Number(r[9]),
            baseTotal: r[10] === '' ? null : Number(r[10]),
            delta: r[11] === '' ? null : Number(r[11]),
            done: done,
            doneAt: r[13] ? String(r[13]) : '',
            nguoi: String(r[14] || ''),
            ngay: r[15] ? String(r[15]) : '',
            updatedAt: String(r[19] || ''),
            updatedAtDisplay: r[17] ? String(r[17]) : '',
          });
        });
      }
      return json_({ ok: true, app: APP_ID, at: now_(), atIso: new Date().toISOString(), count: lots.length, lots: lots });
    } catch (err) {
      return json_({ ok: false, error: String((err && err.message) || err) });
    }
  }
  return json_({
    ok: true,
    app: APP_ID,
    message: 'KK2027 sync endpoint đang chạy',
    time: now_(),
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Không nhận được dữ liệu.');
    }
    const payload = JSON.parse(e.postData.contents);
    if (payload.app !== APP_ID) {
      throw new Error('Dữ liệu không phải từ app KK2027.');
    }

    const ss = getSpreadsheet_();
    const progress = ensureSheet_(ss, 'Tiến độ', PROGRESS_HEADERS);
    const mergedRows = writeProgress_(progress, payload);
    const totals = progressTotals_(mergedRows);
    writeDaily_(ensureSheet_(ss, 'Theo ngày', DAILY_HEADERS), payload, totals);
    if (payload.reason === 'lot_done' || payload.reason === 'manual') {
      appendLog_(ensureSheet_(ss, 'Nhật ký', LOG_HEADERS), payload);
    }

    let mail = false;
    if (payload.reason === 'lot_done' || payload.reason === 'test') {
      sendReportMail_(ss, payload);
      mail = true;
    }

    return json_({
      ok: true,
      sheetUrl: ss.getUrl(),
      mail: mail,
      at: now_(),
      totals: totals,
    });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

/* ============================================================
   Google Sheets
   ============================================================ */
function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (err) {
      props.deleteProperty('SPREADSHEET_ID');
    }
  }
  const ss = SpreadsheetApp.create(TEN_FILE);
  ss.setSpreadsheetTimeZone(TIMEZONE);
  const first = ss.getSheets()[0];
  if (first && first.getLastRow() === 0) first.setName('Tiến độ');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeader_(sh, headers.length);
  } else {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

function styleHeader_(sh, cols) {
  sh.getRange(1, 1, 1, cols)
    .setFontWeight('bold')
    .setBackground('#f3efe4')
    .setFontColor('#3d3a33');
  sh.setFrozenRows(1);
}

function writeProgress_(sh, payload) {
  const lots = payload.lots || [];
  const header = PROGRESS_HEADERS;
  const width = header.length;
  const last = sh.getLastRow();
  const byLot = new Map();
  if (last > 1) {
    const vals = sh.getRange(2, 1, last - 1, width).getValues();
    vals.forEach(r => {
      const lot = String(r[1] || '');
      if (!lot) return;
      const entered = Number(r[8]) || 0;
      const done = String(r[12] || '') === 'Có';
      if (!entered && !done) return;
      byLot.set(lot, pad_(r, width));
    });
  }
  lots.forEach(l => {
    if (!l || !l.lot) return;
    const entered = Number(l.entered) || 0;
    if (!entered && !l.done) return;
    const old = byLot.get(l.lot);
    const inTs = isoTime_(l.updatedAt) || isoTime_(l.doneAt) || 0;
    const oldTs = old ? isoTime_(old[19]) : 0;
    if (old && oldTs && inTs < oldTs) return;
    byLot.set(l.lot, buildProgressRow_(l, payload));
  });
  const rows = [...byLot.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'en', { numeric: true }))
    .map(e => e[1]);

  sh.clearContents();
  sh.getRange(1, 1, 1, width).setValues([header]);
  styleHeader_(sh, width);
  if (rows.length) {
    sh.getRange(2, 1, rows.length, width).setValues(rows);
    sh.getRange(2, 7, rows.length, 1).setNumberFormat('#,##0.00');
    sh.getRange(2, 10, rows.length, 3).setNumberFormat('#,##0');
  }
  for (let c = 1; c <= width; c++) sh.setColumnWidth(c, [40, 62, 150, 40, 90, 62, 80, 120, 62, 90, 90, 80, 62, 110, 90, 82, 160, 110, 90, 150][c - 1]);
  return rows;
}

function buildProgressRow_(l, payload) {
  return [
    l.kv || '',
    l.lot || '',
    l.id || '',
    l.doi || '',
    l.clone || '',
    l.year || '',
    l.area === '' || l.area == null ? '' : Number(l.area),
    l.statusLabel || l.status || '',
    l.entered || 0,
    l.dt == null ? '' : l.dt,
    l.baseTotal == null ? '' : l.baseTotal,
    l.delta == null ? '' : l.delta,
    l.done ? 'Có' : 'Không',
    l.doneAt ? formatDateTime_(l.doneAt) : '',
    l.nguoi || '',
    l.ngay ? formatDate_(l.ngay) : '',
    l.ghiChu || '',
    formatDateTime_(payload.sentAt),
    l.status || '',
    l.updatedAt || l.doneAt || payload.sentAt || '',
  ];
}

function pad_(row, width) {
  const out = row.slice(0, width);
  while (out.length < width) out.push('');
  return out;
}

function isoTime_(v) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
}

function progressTotals_(rows) {
  let entered = 0;
  let done = 0;
  let warn = 0;
  let rowsCount = 0;
  let dt = 0;
  let baselineTotal = 0;
  rows.forEach(r => {
    const n = Number(r[8]) || 0;
    if (n > 0) {
      entered += 1;
      baselineTotal += Number(r[10]) || 0;
    }
    if (String(r[12] || '') === 'Có') done += 1;
    if (String(r[18] || '') === 'warn') warn += 1;
    rowsCount += n;
    dt += Number(r[9]) || 0;
  });
  return { entered, done, warn, rows: rowsCount, dt, baselineTotal, delta: dt - baselineTotal };
}

function writeDaily_(sh, payload, totals) {
  const t = totals || payload.totals || {};
  const dateText = formatDate_(payload.today);
  const row = [
    dateText,
    t.entered || 0,
    t.done || 0,
    t.warn || 0,
    t.rows || 0,
    t.dt || 0,
    t.baselineTotal || 0,
    t.delta || 0,
    formatDateTime_(payload.sentAt),
  ];
  const last = sh.getLastRow();
  let found = 0;
  if (last > 1) {
    const dates = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < dates.length; i++) {
      if (String(dates[i][0]) === String(dateText)) { found = i + 2; break; }
    }
  }
  if (found) {
    sh.getRange(found, 1, 1, row.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
  sh.getRange(2, 6, Math.max(1, sh.getLastRow() - 1), 3).setNumberFormat('#,##0');
}

function appendLog_(sh, payload) {
  const event = payload.event || {};
  const lot = (payload.lots || []).find(l => l.lot === event.lot) || null;
  sh.appendRow([
    formatDateTime_(payload.sentAt),
    payload.reason === 'lot_done' ? 'Lô hoàn tất' : 'Đồng bộ tay',
    event.lot || '',
    lot ? (lot.kv || '') : '',
    lot ? (lot.statusLabel || lot.status || '') : '',
    lot && lot.dt != null ? lot.dt : '',
    lot && lot.baseTotal != null ? lot.baseTotal : '',
    lot && lot.delta != null ? lot.delta : '',
    lot ? (lot.nguoi || lot.doneBy || '') : '',
  ]);
}

/* ============================================================
   Mail báo cáo
   ============================================================ */
function sendReportMail_(ss, payload) {
  const to = String(
    EMAIL_NHAN ||
    Session.getEffectiveUser().getEmail() ||
    Session.getActiveUser().getEmail() ||
    ''
  ).trim();
  if (!to) throw new Error('Chưa có email nhận báo cáo.');

  const isTest = payload.reason === 'test';
  const event = payload.event || {};
  const lot = (payload.lots || []).find(l => l.lot === event.lot) || null;
  const subject = isTest
    ? '[KK2027] Mail thử kết nối – ' + now_()
    : '[KK2027] Lô ' + (event.lot || '') + ' hoàn tất – ' + now_();
  const html = buildMailBody_(payload, lot, isTest);
  const xlsx = exportXlsx_(ss, 'KK2027_TienDo_' + stamp_() + '.xlsx');

  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: html,
    body: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    attachments: [xlsx],
    name: 'KK2027',
  });
}

function exportXlsx_(ss, name) {
  const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('Không xuất được Excel từ Google Sheets (HTTP ' + res.getResponseCode() + ').');
  }
  return res.getBlob().setName(name);
}

function buildMailBody_(payload, lot, isTest) {
  const t = payload.totals || {};
  const zones = payload.zones || [];
  const fmt = n => (n == null || n === '' ? '—' : Number(n).toLocaleString('vi-VN'));

  let intro = '<p>Đây là <b>mail thử kết nối</b> từ app kiểm kê vườn cây 2027.</p>';
  if (!isTest && lot) {
    intro = '<p>Lô <b>' + esc_(lot.lot) + '</b> (KV ' + esc_(lot.kv || '—') + ') vừa được đánh dấu <b>HOÀN TẤT</b>'
      + (lot.doneAt ? ' lúc <b>' + esc_(formatDateTime_(lot.doneAt)) + '</b>' : '') + '.</p>'
      + '<p>Tổng điểm trồng 2027: <b>' + fmt(lot.dt) + '</b> cây · 2026: <b>' + fmt(lot.baseTotal) + '</b>'
      + (lot.delta == null ? '' : ' · lệch <b>' + (lot.delta > 0 ? '+' : '') + fmt(lot.delta) + '</b>')
      + (lot.doneBy ? ' · người KK: ' + esc_(lot.doneBy) : '') + '.</p>';
  }

  const rows = zones.map(z => {
    const pending = (z.emptyLots && z.emptyLots.length) ? z.emptyLots.join(', ') : '—';
    return '<tr>'
      + '<td style="padding:4px 8px;border-bottom:1px solid #eee"><b>' + esc_(z.kv) + '</b></td>'
      + '<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">' + z.done + '/' + z.total + '</td>'
      + '<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">' + z.doing + '</td>'
      + '<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">' + z.warn + '</td>'
      + '<td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:12px">' + esc_(pending) + '</td>'
      + '</tr>';
  }).join('');

  return ''
    + '<div style="font-family:Arial,Helvetica,sans-serif;color:#1f1e1b;line-height:1.5;max-width:640px">'
    + '<h2 style="font-size:18px;margin:0 0 8px">Tiến độ kiểm kê 2027 – Đội 2</h2>'
    + intro
    + '<p style="margin:12px 0 4px"><b>Tổng quan:</b> ' + t.done + '/' + t.entered + ' lô đã nhập đã hoàn tất · '
    + t.entered + ' lô đã nhập · ' + t.rows + ' hàng · tổng 2027: <b>' + fmt(t.dt) + '</b> cây'
    + (t.delta == null ? '' : ' (lệch tạm ' + (t.delta > 0 ? '+' : '') + fmt(t.delta) + ' so với 2026)') + '.</p>'
    + '<table style="border-collapse:collapse;width:100%;font-size:13px;margin:10px 0">'
    + '<thead><tr style="background:#f3efe4">'
    + '<th style="padding:5px 8px;text-align:left">KV</th><th style="padding:5px 8px">Xong</th>'
    + '<th style="padding:5px 8px">Đang nhập</th><th style="padding:5px 8px">Cảnh báo</th>'
    + '<th style="padding:5px 8px;text-align:left">Lô chưa nhập</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '<p style="font-size:12px;color:#6f6a5f">File Excel tiến độ đầy đủ được đính kèm mail này. '
    + 'Dữ liệu cũng được lưu trong Google Sheets “' + TEN_FILE + '”.</p>'
    + '<p style="font-size:12px;color:#6f6a5f">Gửi tự động từ app KK2027 lúc ' + now_() + '.</p>'
    + '</div>';
}

/* ============================================================
   Tiện ích
   ============================================================ */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function now_() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy HH:mm');
}

function stamp_() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd_HHmm');
}

function formatDate_(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return Utilities.formatDate(d, TIMEZONE, 'dd/MM/yyyy');
}

function formatDateTime_(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return Utilities.formatDate(d, TIMEZONE, 'dd/MM/yyyy HH:mm');
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Chạy hàm này 1 lần trong Apps Script để kiểm tra quyền và tạo Sheet. */
function testSetup() {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, 'Tiến độ', PROGRESS_HEADERS);
  ensureSheet_(ss, 'Theo ngày', DAILY_HEADERS);
  ensureSheet_(ss, 'Nhật ký', LOG_HEADERS);
  Logger.log('Sheet: ' + ss.getUrl());
  return ss.getUrl();
}
