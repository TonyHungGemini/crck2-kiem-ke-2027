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
const DETAIL_HEADERS = [
  'Lô', 'KV', 'ID lô', 'Đội', 'Hàng', 'Tổng ĐT',
  'Cây cạo (G)', 'Cây +', 'Cây C', 'Cây K1', 'Cây K2', 'Hố trống (O)',
  '2026', 'Lệch phúc tra', 'Trạng thái', 'Người KK', 'Máy / người nhập',
  'Cập nhật lúc', 'Cập nhật (ISO)', 'UID', 'Hướng',
];
const WARN_HEADERS = [
  'Lô', 'KV', 'Hàng', 'Loại cảnh báo', 'Chi tiết', '2026', '2027', 'Lệch',
  'Người KK', 'Máy / người nhập', 'Cập nhật lúc',
];
const ENTRY_HEADERS = [
  'Thời điểm', 'Máy / người nhập', 'Người KK', 'Lô', 'Hàng', 'Nội dung',
];
const DETAIL_FIELD_LABELS = [
  [5, 'Tổng ĐT'], [6, 'G'], [7, '+'], [8, 'C'], [9, 'K1'], [10, 'K2'], [11, 'O'],
  [12, '2026'], [13, 'Lệch phúc tra'], [14, 'Trạng thái'],
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
  if (action === 'detail') {
    try {
      const ss = getSpreadsheet_();
      const sh = ss.getSheetByName('Chi tiết');
      const lotFilter = String((e && e.parameter && e.parameter.lot) || '');
      const groups = new Map();
      if (sh && sh.getLastRow() > 1) {
        const width = DETAIL_HEADERS.length;
        const vals = sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues();
        vals.forEach(r => {
          const lot = String(r[0] || '');
          if (!lot || (lotFilter && lot !== lotFilter)) return;
          let g = groups.get(lot);
          if (!g) {
            g = { lot: lot, kv: String(r[1] || ''), id: String(r[2] || ''), doi: r[3] == null ? '' : r[3], rows: [], warn: 0, updatedAt: '', updatedAtDisplay: '', device: '', nguoi: '' };
            groups.set(lot, g);
          }
          const status = String(r[14] || '');
          const row = {
            hang: r[4] === '' || r[4] == null ? null : Number(r[4]),
            dt: numOrBlank_(r[5]), g: numOrBlank_(r[6]), plus: numOrBlank_(r[7]),
            c: numOrBlank_(r[8]), k1: numOrBlank_(r[9]), k2: numOrBlank_(r[10]), o: numOrBlank_(r[11]),
            pt: numOrBlank_(r[12]), pd: numOrBlank_(r[13]), status: status,
            dir: String(r[20] || ''),
          };
          g.rows.push(row);
          if (status && status !== 'OK') g.warn += 1;
          if (String(r[18] || '')) g.updatedAt = String(r[18]);
          if (String(r[17] || '')) g.updatedAtDisplay = String(r[17]);
          if (String(r[16] || '')) g.device = String(r[16]);
          if (String(r[15] || '')) g.nguoi = String(r[15]);
        });
      }
      const lots = Array.from(groups.values());
      lots.forEach(g => g.rows.sort((a, b) => (a.hang == null ? 99999 : a.hang) - (b.hang == null ? 99999 : b.hang)));
      lots.sort((a, b) => String(a.lot).localeCompare(String(b.lot), 'en', { numeric: true }));
      return json_({
        ok: true, app: APP_ID, at: now_(), atIso: new Date().toISOString(),
        sheetUrl: ss.getUrl(), count: lots.length, lots: lots,
      });
    } catch (err) {
      return json_({ ok: false, error: String((err && err.message) || err) });
    }
  }
  return json_({
    ok: true,
    app: APP_ID,
    version: 3,
    detail: true,
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
    const detail = writeDetails_(ss, payload);
    const warnCount = writeWarnings_(ss, detail);
    appendEntryLog_(ensureSheet_(ss, 'Nhật ký nhập', ENTRY_HEADERS), detail.logs);
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
      detailRows: detail.rows.length,
      warnings: warnCount,
      logRows: detail.logs.length,
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

/* ============================================================
   Chi tiết từng hàng, cảnh báo và nhật ký nhập
   ============================================================ */
function writeDetails_(ss, payload) {
  const sh = ensureSheet_(ss, 'Chi tiết', DETAIL_HEADERS);
  const width = DETAIL_HEADERS.length;
  const last = sh.getLastRow();
  const oldRows = last > 1
    ? sh.getRange(2, 1, last - 1, width).getValues().map(r => pad_(r, width))
    : [];
  const state = new Map();
  oldRows.forEach(r => {
    const lot = String(r[0] || '');
    if (!lot) return;
    const g = state.get(lot) || { rows: [], maxTs: 0 };
    g.rows.push(r);
    g.maxTs = Math.max(g.maxTs, isoTime_(r[18]));
    state.set(lot, g);
  });

  const device = String(payload.device || '').trim();
  const logs = [];
  (payload.lots || []).forEach(l => {
    if (!l || !l.lot) return;
    if (!(Number(l.entered) > 0)) return;
    const lot = String(l.lot);
    const inTs = isoTime_(l.updatedAt) || isoTime_(l.doneAt) || isoTime_(payload.sentAt);
    const old = state.get(lot);
    if (old && old.maxTs && inTs && inTs <= old.maxTs) return;
    const rows = buildDetailRows_(l, payload, device);
    if (!rows.length) return;
    compareDetail_(old ? old.rows : [], rows, { lot: lot, l: l, device: device, payload: payload, logs: logs });
    state.set(lot, { rows: rows, maxTs: inTs || isoTime_(payload.sentAt) });
  });

  const all = [];
  state.forEach(g => g.rows.forEach(r => all.push(r)));
  all.sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'en', { numeric: true })
    || String(a[20] || '').localeCompare(String(b[20] || ''), 'en')
    || (Number(a[4]) || 99999) - (Number(b[4]) || 99999));

  sh.clearContents();
  sh.getRange(1, 1, 1, width).setValues([DETAIL_HEADERS]);
  styleHeader_(sh, width);
  if (all.length) {
    sh.getRange(2, 1, all.length, width).setValues(all);
    sh.getRange(2, 6, all.length, 9).setNumberFormat('#,##0');
  }
  [58, 34, 145, 34, 50, 76, 76, 58, 58, 58, 58, 76, 64, 76, 128, 88, 108, 108, 150, 80, 50]
    .forEach((w, i) => sh.setColumnWidth(i + 1, w));
  try { sh.hideColumns(width); } catch (err) {}
  return { rows: all, logs: logs };
}

function buildDetailRows_(l, payload, device) {
  const rows = Array.isArray(l.rows) ? l.rows : [];
  const hangCount = {};
  rows.forEach(r => {
    const h = intOrNull_(r.hang);
    if (h != null) {
      const k = String(r.dir || '') + ':' + h;
      hangCount[k] = (hangCount[k] || 0) + 1;
    }
  });
  const updatedIso = l.updatedAt || l.doneAt || payload.sentAt || '';
  const updatedText = formatDateTime_(updatedIso);
  const nguoi = String(l.nguoi || '');
  return rows.map(r => {
    const h = intOrNull_(r.hang);
    const dir = String(r.dir || '');
    const vals = ['g', 'plus', 'c', 'k1', 'k2', 'o'].map(k => numOrBlank_(r[k]));
    const dt = numOrBlank_(r.dt);
    const sum6 = vals.reduce((s, v) => s + (Number(v) || 0), 0);
    const pt = numOrBlank_(r.pt);
    const pd = numOrBlank_(r.pd);
    const flags = [];
    if (dt === '') flags.push('Thiếu tổng ĐT');
    else if (dt !== sum6) flags.push('Lệch tổng');
    if (h == null) flags.push('Thiếu số hàng');
    else if ((hangCount[dir + ':' + h] || 0) > 1) flags.push('Trùng hàng');
    if (pt !== '' && pd !== '' && Math.abs(Number(pd)) >= 2) flags.push('Phúc tra ≥2');
    return [
      String(l.lot || ''), String(l.kv || ''), String(l.id || ''), l.doi == null ? '' : l.doi,
      h == null ? '' : h, dt,
    ].concat(vals, [
      pt, pd,
      flags.length ? flags.join('; ') : 'OK',
      nguoi, device || '',
      updatedText, updatedIso,
      String(r.uid || ''),
      dir,
    ]);
  });
}

function detailKey_(r) {
  const uid = String(r[19] || '');
  if (uid) return 'u:' + uid;
  const h = intOrNull_(r[4]);
  if (h != null) return 'h:' + String(r[20] || '') + ':' + h;
  return 'x:' + [r[20], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11]].join('|');
}

function compareDetail_(prevRows, nextRows, ctx) {
  const when = formatDateTime_(ctx.l.updatedAt || ctx.payload.sentAt);
  const who = ctx.device || ctx.l.nguoi || 'Không rõ';
  const nguoi = ctx.l.nguoi || '';
  const lot = ctx.lot;
  const logs = ctx.logs;
  if (!prevRows.length) {
    logs.push([when, who, nguoi, lot, '', 'Nhập lần đầu: ' + nextRows.length + ' hàng']);
    return;
  }
  const prev = new Map();
  prevRows.forEach(r => prev.set(detailKey_(r), r));
  const next = new Map();
  nextRows.forEach(r => next.set(detailKey_(r), r));
  next.forEach((r, key) => {
    const p = prev.get(key);
    const hang = (r[20] ? 'Hướng ' + r[20] + ' · ' : '') + (r[4] === '' ? '(chưa số)' : String(r[4]));
    if (!p) {
      logs.push([when, who, nguoi, lot, hang, 'Thêm hàng ' + hang + ': ' + briefRow_(r)]);
      return;
    }
    const changes = [];
    DETAIL_FIELD_LABELS.forEach(pair => {
      const idx = pair[0];
      if (String(p[idx]) !== String(r[idx])) {
        const fmtVal = idx === 13 ? signedVN_ : showVal_;
        changes.push(pair[1] + ' ' + fmtVal(p[idx]) + '→' + fmtVal(r[idx]));
      }
    });
    if (changes.length) logs.push([when, who, nguoi, lot, hang, 'Hàng ' + hang + ': ' + changes.join('; ')]);
  });
  prev.forEach((p, key) => {
    if (next.has(key)) return;
    const hang = (p[20] ? 'Hướng ' + p[20] + ' · ' : '') + (p[4] === '' ? '(chưa số)' : String(p[4]));
    logs.push([when, who, nguoi, lot, hang, 'Xoá hàng ' + hang + ' (ĐT ' + showVal_(p[5]) + ')']);
  });
}

function briefRow_(r) {
  return 'ĐT ' + showVal_(r[5])
    + ' · G ' + showVal_(r[6])
    + ' · + ' + showVal_(r[7])
    + ' · C ' + showVal_(r[8])
    + ' · K1 ' + showVal_(r[9])
    + ' · K2 ' + showVal_(r[10])
    + ' · O ' + showVal_(r[11]);
}

function writeWarnings_(ss, detail) {
  const sh = ensureSheet_(ss, 'Cảnh báo', WARN_HEADERS);
  const width = WARN_HEADERS.length;
  const out = [];
  const colors = [];
  (detail.rows || []).forEach(r => {
    const status = String(r[14] || '');
    if (!status || status === 'OK') return;
    const bits = [];
    const sum6 = [6, 7, 8, 9, 10, 11].reduce((s, i) => s + (Number(r[i]) || 0), 0);
    if (status.indexOf('Lệch tổng') >= 0) {
      bits.push('Tổng ĐT ' + showVal_(r[5]) + ' ≠ 6 cột ' + fmtVN_(sum6)
        + ' (lệch ' + signedVN_((Number(r[5]) || 0) - sum6) + ')');
    }
    if (status.indexOf('Phúc tra') >= 0) {
      bits.push('2026 ' + showVal_(r[12]) + ' · 2027 ' + showVal_(r[5])
        + ' · lệch ' + signedVN_(Number(r[13])));
    }
    if (status.indexOf('Trùng hàng') >= 0) bits.push('Nhiều dòng cùng số hàng');
    if (status.indexOf('Thiếu số hàng') >= 0) bits.push('Có số liệu nhưng chưa nhập số hàng');
    if (status.indexOf('Thiếu tổng ĐT') >= 0) bits.push('Có số liệu nhưng chưa nhập Tổng ĐT');
    const dirPrefix = r[20] ? 'Hướng ' + r[20] + ': ' : '';
    out.push([r[0], r[1], (r[20] ? r[20] + '·' : '') + r[4], status, dirPrefix + bits.join(' | '), r[12], r[5], r[13], r[15], r[16], r[17]]);
    colors.push(status.indexOf('Phúc tra') >= 0 ? '#fff1c6' : '#fde7e7');
  });

  sh.clearContents();
  sh.getRange(1, 1, 1, width).setValues([WARN_HEADERS]);
  styleHeader_(sh, width);
  if (out.length) {
    sh.getRange(2, 1, out.length, width).setValues(out);
    sh.getRange(2, 6, out.length, 3).setNumberFormat('#,##0');
    for (let i = 0; i < colors.length; i++) {
      sh.getRange(i + 2, 1, 1, width).setBackground(colors[i]);
    }
  }
  [58, 34, 50, 150, 260, 64, 64, 64, 88, 108, 108]
    .forEach((w, i) => sh.setColumnWidth(i + 1, w));
  return out.length;
}

function appendEntryLog_(sh, logs) {
  if (!logs || !logs.length) return;
  const start = sh.getLastRow() + 1;
  sh.getRange(start, 1, logs.length, ENTRY_HEADERS.length).setValues(logs);
  [118, 108, 88, 58, 50, 460].forEach((w, i) => sh.setColumnWidth(i + 1, w));
}

function numOrBlank_(v) {
  if (v === '' || v == null) return '';
  const n = Number(v);
  return isFinite(n) ? n : '';
}

function intOrNull_(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isFinite(n) && Math.floor(n) === n ? n : null;
}

function showVal_(v) {
  if (v === '' || v == null) return '—';
  return fmtVN_(v);
}

function fmtVN_(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('vi-VN');
}

function signedVN_(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return (Number(n) > 0 ? '+' : '') + fmtVN_(n);
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
  ensureSheet_(ss, 'Chi tiết', DETAIL_HEADERS);
  ensureSheet_(ss, 'Cảnh báo', WARN_HEADERS);
  ensureSheet_(ss, 'Nhật ký nhập', ENTRY_HEADERS);
  Logger.log('Sheet: ' + ss.getUrl());
  return ss.getUrl();
}
