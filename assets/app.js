(() => {
'use strict';

/* ============================================================
   Hằng số & tiện ích
   ============================================================ */
const STORE_KEY = 'crck2.kk2027.v1';
const SYNC_KEY = 'crck2.kk2027.sync.v1';
const DEFAULT_SYNC_URL = 'https://script.google.com/macros/s/AKfycbw4IYI3JHEnmt3GdwFp_sdr4obTpT6HCOxoLS4a3SQI_9DWWWKd_2cuWYygu6rgQcYR/exec';
const QUICK_LANG_KEY = 'crck2.kk2027.quicklang.v1';
const LANG_KEY = 'crck2.kk2027.lang.v1';
const DRAFT_KEY = 'crck2.kk2027.qdraft.v1';
const GAUTO_KEY = 'crck2.kk2027.gauto.v1';
const REMOTE_KEY = 'crck2.kk2027.remote.v1';
const FIELDS = ['dt', 'g', 'plus', 'c', 'k1', 'k2', 'o'];
const CATS = [
  ['g', 'catG'],
  ['plus', 'catPlus'],
  ['c', 'catC'],
  ['k1', 'catK1'],
  ['k2', 'catK2'],
  ['o', 'catO'],
];
const BASELINE = (window.KK_BASELINE && window.KK_BASELINE.lots) || [];
const BASE_BY_LOT = new Map(BASELINE.map(l => [l.lot, l]));
const BASE_ORDER = new Map(BASELINE.map((l, i) => [l.lot, i]));
const PHUC_TRA = (window.KK_PHUCTRA && window.KK_PHUCTRA.lots) || {};
const PHUC_TRA_MIN = (window.KK_PHUCTRA && window.KK_PHUCTRA.minDiff) || 2;
const GEO = (window.KK_GEO && window.KK_GEO.features) || [];
const GEO_BY_LOT = new Map(GEO.map(f => [f.properties.ma_lo, f]));
const ZONE_ORDER = ['KV1', 'KV2', 'KV3', 'KV4', 'KV5', 'KV6', 'KV7', 'KV8'];
const STATUS_COLORS = { empty: '#9a9487', doing: '#d97757', done: '#3f7d58', warn: '#b3402f' };
const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const nf = new Intl.NumberFormat('vi-VN');
const nf2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function fmt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? nf.format(Math.round(n)) : '—';
}
function fmt2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? nf2.format(n) : '—';
}
function signed(v) {
  const n = Number(v) || 0;
  return (n > 0 ? '+' : '') + fmt(n);
}
function pct(v, base) {
  if (!base) return '—';
  return (v / base * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
}
function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function parseNum(value) {
  if (value == null || String(value).trim() === '') return null;
  const n = parseInt(String(value).replace(/[^\d-]/g, ''), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
function parseHang(value) {
  const n = parseInt(String(value).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function dateVN(iso) {
  if (!iso) return '…';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
function dateTimeVN(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function todayVNText() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function naturalSortKeys(keys) {
  return keys.slice().sort((a, b) => {
    const ba = BASE_BY_LOT.get(a);
    const bb = BASE_BY_LOT.get(b);
    if (ba && bb) return BASE_ORDER.get(a) - BASE_ORDER.get(b);
    if (ba) return -1;
    if (bb) return 1;
    return collator.compare(a, b);
  });
}

/* ============================================================
   Lưu trữ
   ============================================================ */
function emptyDB() {
  return { version: 1, lots: {}, updatedAt: null };
}
function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyDB();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.lots) return emptyDB();
    return { version: 1, lots: data.lots, updatedAt: data.updatedAt || null };
  } catch (err) {
    return emptyDB();
  }
}
let DB = loadDB();

function loadSyncCfg() {
  try {
    const d = JSON.parse(localStorage.getItem(SYNC_KEY) || '{}');
    return {
      url: typeof d.url === 'string' ? d.url : DEFAULT_SYNC_URL,
      enabled: d.enabled !== false,
      device: typeof d.device === 'string' ? d.device : '',
      lastSyncAt: d.lastSyncAt || null,
      lastResult: d.lastResult || '',
    };
  } catch (err) {
    return { url: DEFAULT_SYNC_URL, enabled: true, device: '', lastSyncAt: null, lastResult: '' };
  }
}
let syncCfg = loadSyncCfg();
let syncBusy = false;
let syncTimer = null;

function saveSyncCfg(patch) {
  Object.assign(syncCfg, patch);
  try { localStorage.setItem(SYNC_KEY, JSON.stringify(syncCfg)); } catch (err) {}
  updateSyncUi();
}
function userName() {
  return (syncCfg.device || '').trim();
}

function persist() {
  DB.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(DB));
  } catch (err) {
    toast('Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.', 'bad');
  }
  scheduleSync();
}
function touchLot(key) {
  const lot = key && DB.lots[key];
  if (lot) lot.updatedAt = new Date().toISOString();
}
function lotsKeys() {
  const set = new Set(BASELINE.map(l => l.lot));
  Object.keys(DB.lots).forEach(k => set.add(k));
  return naturalSortKeys([...set]);
}
function lotMeta(key) {
  return (DB.lots[key] && DB.lots[key].meta) || {
    huong: '', ngay: '', nguoi: '', ghiChu: '', done: false, doneAt: null, doneBy: '', custom: !BASE_BY_LOT.has(key),
  };
}
function lotRows(key) {
  return (DB.lots[key] && DB.lots[key].rows) || [];
}
function ensureLot(key) {
  if (!DB.lots[key]) {
    DB.lots[key] = {
      meta: { huong: '', ngay: '', nguoi: '', ghiChu: '', done: false, doneAt: null, doneBy: '', custom: !BASE_BY_LOT.has(key) },
      rows: [],
    };
  }
  return DB.lots[key];
}

/* ============================================================
   Tính toán & kiểm tra
   ============================================================ */
function rowHasData(row) {
  return FIELDS.some(k => row[k] != null && row[k] !== '');
}
function rowSum(row) {
  return FIELDS.filter(k => k !== 'dt').reduce((sum, k) => sum + (Number(row[k]) || 0), 0);
}
function rowIssue(row) {
  if (!rowHasData(row)) return null;
  const sum = rowSum(row);
  if (row.dt == null) {
    return { level: 'bad', diff: sum, text: t('issueMissing', { sum: fmt(sum) }) };
  }
  const dt = Number(row.dt) || 0;
  if (dt !== sum) {
    return { level: 'bad', diff: dt - sum, text: t('issueDiff', { dt: fmt(dt), sum: fmt(sum), d: signed(dt - sum) }) };
  }
  return null;
}
function issueTextVN(row) {
  const sum = rowSum(row);
  if (row.dt == null) return `thiếu Tổng ĐT (tổng 6 cột = ${fmt(sum)})`;
  const dt = Number(row.dt) || 0;
  return `Tổng ĐT ${fmt(dt)} ≠ tổng 6 cột ${fmt(sum)} (lệch ${signed(dt - sum)})`;
}
/* Hàng có Tổng ĐT khác mức chung (giá trị xuất hiện nhiều nhất) của lô. */
function rowOutliers(rows) {
  const vals = rows
    .filter(r => rowHasData(r) && r.dt != null && Number(r.dt) > 0)
    .map(r => ({ uid: r.uid, v: Number(r.dt) }));
  if (vals.length < 4) return new Map();
  const freq = new Map();
  vals.forEach(o => freq.set(o.v, (freq.get(o.v) || 0) + 1));
  let ref = null;
  let best = 0;
  let tie = false;
  freq.forEach((count, v) => {
    if (count > best) { best = count; ref = v; tie = false; }
    else if (count === best) tie = true;
  });
  if (ref == null || best < 2 || tie) return new Map();
  const flags = new Map();
  vals.forEach(({ uid, v }) => {
    if (v !== ref) flags.set(uid, { diff: v - ref, ref });
  });
  return flags;
}
function aggregate(rows) {
  const a = { dt: 0, g: 0, plus: 0, c: 0, k1: 0, k2: 0, o: 0, count: 0 };
  rows.forEach(row => {
    if (!rowHasData(row)) return;
    a.count += 1;
    FIELDS.forEach(k => { a[k] += Number(row[k]) || 0; });
  });
  return a;
}
function findDuplicates(rows) {
  const seen = new Map();
  const dup = new Set();
  rows.forEach(row => {
    if (!rowHasData(row) || row.hang == null) return;
    if (seen.has(row.hang)) dup.add(row.hang);
    seen.set(row.hang, (seen.get(row.hang) || 0) + 1);
  });
  return [...dup].sort((a, b) => a - b);
}
function missingHangs(rows) {
  const has = new Set(rows.filter(rowHasData).map(r => r.hang).filter(Number.isInteger));
  if (!has.size) return [];
  const max = Math.max(...has);
  const missing = [];
  for (let h = 1; h <= max; h++) if (!has.has(h)) missing.push(h);
  return missing;
}
function resumeHang(key) {
  const rows = lotRows(key);
  const gaps = missingHangs(rows);
  if (gaps.length) return gaps[0];
  const filled = rows.filter(rowHasData).map(r => r.hang).filter(Number.isInteger);
  return filled.length ? Math.max(...filled) + 1 : 1;
}
function quickHangPair(key, seed) {
  const rows = lotRows(key);
  const filled = new Set(rows.filter(rowHasData).map(r => r.hang).filter(Number.isInteger));
  const gaps = missingHangs(rows);
  const max = filled.size ? Math.max(...filled) : 0;
  const secondFrom = first => {
    const gap = gaps.find(h => h > first);
    return gap != null ? gap : Math.max(max, first) + 1;
  };
  if (Number.isInteger(seed) && seed > 0) return [seed, secondFrom(seed)];
  if (gaps.length) return [gaps[0], secondFrom(gaps[0])];
  return [max + 1, max + 2];
}
function rowIssuesOf(rows) {
  return rows
    .filter(rowHasData)
    .map(row => ({ row, issue: rowIssue(row) }))
    .filter(x => x.issue);
}
function phucTraRef(key, hang) {
  const lot = PHUC_TRA[key];
  if (!lot || !Number.isInteger(hang)) return null;
  const ref = lot[String(hang)];
  return Number.isFinite(ref) ? ref : null;
}
function hasPhucTra(key) {
  return !!PHUC_TRA[key];
}
function phucTraOf(key, row) {
  if (!rowHasData(row) || row.dt == null) return null;
  const ref = phucTraRef(key, row.hang);
  if (ref == null) return null;
  const diff = (Number(row.dt) || 0) - ref;
  return { ref, diff, warn: Math.abs(diff) >= PHUC_TRA_MIN };
}
function phucTraIssues(key) {
  return lotRows(key)
    .filter(rowHasData)
    .map(row => ({ row, pt: phucTraOf(key, row) }))
    .filter(x => x.pt && x.pt.warn);
}
function lotState(key) {
  const base = BASE_BY_LOT.get(key);
  const meta = lotMeta(key);
  const rows = lotRows(key);
  const entered = rows.filter(rowHasData);
  const agg = aggregate(rows);
  const issues = rowIssuesOf(rows);
  const dups = findDuplicates(rows);
  const ptIssues = phucTraIssues(key);
  const delta = base && entered.length ? agg.dt - base.total : null;
  const hasError = issues.length > 0 || dups.length > 0;
  const hasPt = ptIssues.length > 0;
  let level = 'empty';
  if (entered.length) {
    if (hasError || hasPt) level = 'warn';
    else if (meta.done) level = delta == null || delta === 0 ? 'done' : 'warn';
    else level = 'doing';
  }
  return { key, base, meta, rows, entered, agg, issues, dups, ptIssues, hasPt, delta, level, hasError };
}

function remoteLot(key) {
  const r = state.remote && state.remote.lots ? state.remote.lots[key] : null;
  return r && (r.entered > 0 || r.done) ? r : null;
}
function viewLevel(key) {
  const st = lotState(key);
  if (st.level !== 'empty') return { st, level: st.level, remote: null };
  const r = remoteLot(key);
  if (!r) return { st, level: 'empty', remote: null };
  const level = r.status === 'done' || r.status === 'doing' || r.status === 'warn'
    ? r.status
    : (r.done ? 'done' : 'doing');
  return { st, level, remote: r };
}
function remoteStatusInfo(level) {
  const label = level === 'done' ? t('remoteDone') : level === 'warn' ? t('remoteWarn') : t('remoteDoing');
  return { cls: level, label, dot: level };
}

/* ============================================================
   Toast
   ============================================================ */
let toastTimer = null;
function toast(message, type) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
}

/* ============================================================
   Điều hướng
   ============================================================ */
function readLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'vi' || v === 'km') return v;
    if (localStorage.getItem(QUICK_LANG_KEY) === 'km') return 'km';
  } catch (err) {}
  return null;
}
function readLangChosen() {
  try { return !!localStorage.getItem(LANG_KEY); } catch (err) { return false; }
}
function readGAuto() {
  try { return localStorage.getItem(GAUTO_KEY) !== '0'; } catch (err) { return true; }
}
function readRemote() {
  try {
    const d = JSON.parse(localStorage.getItem(REMOTE_KEY) || '{}');
    if (!d || typeof d !== 'object' || !d.lots || typeof d.lots !== 'object') return { at: null, lots: {} };
    return { at: d.at || null, lots: d.lots };
  } catch (err) {
    return { at: null, lots: {} };
  }
}
/* uid hàng → Tổng ĐT trước lần bấm "=" đầu tiên, để hoàn lại khi xem lô. */
const rowUndo = new Map();
const state = {
  view: 'home', homeView: 'list', zone: null, lot: null, filter: 'all', q: '',
  quickLot: null, quickFrom: 'home', quickZone: '', quickSeed: null,
  recentLot: null, gAuto: readGAuto(), remote: readRemote(),
  lang: readLang() || 'vi', langChosen: readLangChosen(),
  detailLot: null, remoteDetail: null,
};
const QUICK_I18N = {
  vi: {
    eyebrow: 'Nhập nhanh theo tờ', title: 'Nhập nhanh', zone: 'Khu vực', zoneAll: 'Tất cả khu vực', zoneItem: 'Khu vực {z}',
    lot: 'Lô', lotOther: 'lô khác', lotDone: 'hoàn tất',
    date: 'Ngày KK', person: 'Người KK', personPh: 'Tên người kiểm kê',
    hangNo: 'Hàng số', totalDT: 'Tổng ĐT',
    checkIdle: 'Chưa nhập', checkMissing: 'Thiếu Tổng ĐT', checkDiff: 'Lệch', checkSum6: 'tổng 6 cột',
    checkOk: 'Khớp', unitTree: 'cây', sheetThis: 'Tờ này', lotAfter: 'Lô sau lưu', diffLabel: 'Lệch',
    gAuto: 'G tự tính', gManual: 'Đủ 7 số', autoPh: 'tự tính',
    gNote: 'G = Tổng ĐT − (+, C, K1, K2, O)', gManualNote: 'Nhập đủ 7 số — tool dò khớp/lệch.',
    rowsWithData: 'hàng có số liệu', saveNext: 'Lưu & tờ tiếp', save: 'Tạm lưu', hint: 'Enter sang ô kế tiếp · Space: Lưu & tờ tiếp.',
    pausedSaved: 'Đã tạm lưu lô {lot} · lần sau nhập tiếp từ hàng {h}.',
    draftRestored: 'Đã khôi phục bản nháp đang nhập lúc {time}.',
    progressNone: 'Lô chưa có hàng nào', progressStart: 'Bắt đầu từ hàng {h}',
    progressEntered: 'Đã nhập {n} hàng', progressMissing: 'Còn thiếu hàng {list}',
    progressContinuous: 'Đã nhập liên tục 1–{max}', progressEntering: 'Đang vào hàng {list}',
    errEmptySheet: 'Chưa nhập số liệu cho tờ này.', errNoHang: 'Tờ {n}: chưa nhập số hàng.',
    warnMissing: 'Hàng {h}: thiếu Tổng ĐT (tổng 6 cột {sum})',
    warnDiff: 'Hàng {h}: Tổng ĐT {dt} lệch {diff} so với tổng 6 cột',
    warnDup: 'Hai hàng trong tờ bị trùng số. Sửa lại số hàng.',
    confirmOverwrite: 'Hàng {h} đã có dữ liệu. Ghi đè?',
    confirmMismatch: 'Có hàng lệch tổng:\n\n{list}\n\nVẫn lưu và đánh dấu cảnh báo?',
    savedRows: 'Đã lưu hàng {h}.',
  },
  km: {
    eyebrow: 'បញ្ចូលរហ័សតាមសន្លឹក', title: 'បញ្ចូលរហ័ស', zone: 'តំបន់', zoneAll: 'គ្រប់តំបន់', zoneItem: 'តំបន់ {z}',
    lot: 'ដីឡូតិ៍', lotOther: 'ដីឡូតិ៍ផ្សេង', lotDone: 'រួចរាល់',
    date: 'កាលបរិច្ឆេទពិនិត្យ', person: 'អ្នកពិនិត្យ', personPh: 'ឈ្មោះអ្នកពិនិត្យ',
    hangNo: 'លេខជួរ', totalDT: 'សរុប',
    checkIdle: 'មិនទាន់បញ្ចូល', checkMissing: 'ខ្វះសរុប', checkDiff: 'ខុសគ្នា', checkSum6: 'សរុប 6 ជួរឈរ',
    checkOk: 'ត្រូវគ្នា', unitTree: 'ដើម', sheetThis: 'សន្លឹកនេះ', lotAfter: 'ដីឡូតិ៍ក្រោយរក្សាទុក', diffLabel: 'ខុសគ្នា',
    gAuto: 'G គណនាស្វ័យប្រវត្តិ', gManual: '7 លេខ', autoPh: 'ស្វ័យប្រវត្តិ',
    gNote: 'G = សរុប − (+, C, K1, K2, O)', gManualNote: 'បញ្ចូល 7 លេខ — ពិនិត្យត្រូវ/ខុស។',
    rowsWithData: 'ជួរមានទិន្នន័យ', saveNext: 'រក្សាទុក & សន្លឹកបន្ទាប់', save: 'រក្សាទុកបណ្ដោះអាសន្ន', hint: 'Enter ទៅប្រអប់បន្ទាប់ · Space: រក្សាទុក & សន្លឹកបន្ទាប់',
    pausedSaved: 'បានរក្សាទុកបណ្ដោះអាសន្ន ដីឡូតិ៍ {lot} · បន្តពីជួរ {h}។',
    draftRestored: 'បានស្ដារសេចក្ដីព្រាងដែលកំពុងបញ្ចូល ម៉ោង {time}។',
    progressNone: 'ដីឡូតិ៍មិនទាន់មានជួរ', progressStart: 'ចាប់ពីជួរ {h}',
    progressEntered: 'បានបញ្ចូល {n} ជួរ', progressMissing: 'នៅខ្វះជួរ {list}',
    progressContinuous: 'បញ្ចូលជាប់គ្នា 1–{max}', progressEntering: 'កំពុងបញ្ចូលជួរ {list}',
    errEmptySheet: 'មិនទាន់បញ្ចូលទិន្នន័យសម្រាប់សន្លឹកនេះទេ។', errNoHang: 'សន្លឹក {n}: មិនទាន់បញ្ចូលលេខជួរ។',
    warnMissing: 'ជួរ {h}: ខ្វះសរុប (សរុប 6 ជួរឈរ {sum})',
    warnDiff: 'ជួរ {h}: សរុប {dt} ខុសគ្នា {diff} ពីសរុប 6 ជួរឈរ',
    warnDup: 'ជួរពីរក្នុងសន្លឹកមានលេខដូចគ្នា។ សូមកែលេខជួរ។',
    confirmOverwrite: 'ជួរ {h} មានទិន្នន័យរួចហើយ។ សរសេរជាន់?',
    confirmMismatch: 'មានជួរខុសសរុប:\n\n{list}\n\nនៅតែរក្សាទុក និងសម្គាល់ថាមានបញ្ហា?',
    savedRows: 'បានរក្សាទុកជួរ {h}។',
  },
};
const APP_I18N = {
  vi: {
    appTitle: 'Kiểm kê 2027 · Đội 2 CRCK2',
    brandTitle: 'Kiểm kê vườn cây 2027',
    brandSub: 'Đội 2 · CRCK2 Aphivath',
    quickEntry: 'Nhập nhanh',
    menu: 'Menu',
    close: 'Đóng',
    language: 'Ngôn ngữ',
    langVi: 'Tiếng Việt',
    langKm: 'ខ្មែរ',
    langTitle: 'Chọn ngôn ngữ',
    langToVi: 'Tiếng Việt',
    langToKm: 'ខ្មែរ',
    langToggleAriaVi: 'Chuyển sang tiếng Việt',
    langToggleAriaKm: 'Chuyển sang tiếng Khmer',
    langLead: 'Ngôn ngữ áp dụng cho toàn bộ ứng dụng. Có thể đổi lại trong Menu.',
    langFoot: 'Số, số lô và ký hiệu G, +, C, K1, K2, O giữ nguyên ở cả hai ngôn ngữ.',
    nameEyebrow: 'Trước khi bắt đầu',
    nameTitle: 'Nhập tên người dùng',
    nameLead: 'Tên này dùng để ghi rõ ai nhập dữ liệu từng lô trên Google Sheets. Chỉ cần điền một lần trên máy này.',
    nameLabel: 'Tên người dùng',
    namePh: 'VD: Lan – Đội 2',
    nameHint: 'Có thể điền sau. Tối đa 40 ký tự. Đổi lại trong ☰ → Đồng bộ Google.',
    nameContinue: 'Lưu tên',
    nameLater: 'Để sau',
    nameRequired: 'Vui lòng nhập tên trước khi lưu.',
    nameSaved: 'Đã lưu tên người dùng: {name}',
    nameLaterToast: 'Chưa có tên người dùng. Có thể điền sau trong ☰ → Đồng bộ Google.',
    heroEyebrow: 'Kiểm kê 0h · 01/01/2027',
    heroTitle: 'Nhập kết quả theo dòng tổng từng hàng',
    heroLead: 'Mỗi tờ phiếu có 2 hàng. Chỉ cần nhập 7 số ở dòng cuối. Tool tự kiểm tra <span class="nowrap">Tổng ĐT = G + (+) + C + K1 + K2 + O</span>, chặn trùng hàng và đối chiếu với kiểm kê 2026.',
    quickBySheet: 'Nhập nhanh theo tờ',
    exportAll: 'Xuất Excel tổng hợp',
    statEnteredLots: 'Lô đã nhập',
    statEnteredSub: '{n} lô đã đánh dấu hoàn tất',
    statTrees: 'Tổng điểm trồng 2027',
    statTreesSub: '2026: {base} cây · lệch tạm {delta}',
    statTreesSubNo: '2026: {base} cây',
    statRows: 'Hàng đã nhập',
    statRowsSub: 'Tổng cộng dồn trên {n} lô',
    statWarn: 'Lô có cảnh báo',
    statWarnSub: '{done} khớp 2026 · {warn} cần kiểm tra',
    tabList: 'Danh sách lô',
    tabMap: 'Bản đồ tiến độ',
    filterAll: 'Tất cả',
    filterEmpty: 'Chưa nhập',
    filterDoing: 'Đang nhập',
    filterDone: 'Hoàn tất',
    filterWarn: 'Cảnh báo',
    searchPh: 'Tìm số lô, ID lô, giống…',
    addLot: '+ Lô khác',
    backup: 'Sao lưu',
    restore: 'Phục hồi',
    thLot: 'Lô',
    th2026: '2026',
    th2027: '2027',
    thDelta: 'Lệch',
    thRows: 'Số hàng',
    thStatus: 'Trạng thái',
    emptyTitle: 'Không có lô phù hợp',
    emptySub: 'Thử xoá từ khoá tìm kiếm hoặc đổi bộ lọc.',
    guideTitle: 'Hướng dẫn nhanh',
    guide1: 'Bấm <b>Nhập nhanh</b>, chọn <b>Khu vực</b> rồi chọn <b>Lô</b>, nhập <b>Hàng số</b>, <b>Tổng ĐT</b> và các số còn lại ở dòng cuối phiếu; mặc định ô <b>G tự tính</b> = Tổng ĐT − (+, C, K1, K2, O). Muốn nhập tay đủ 7 số và dò khớp/lệch thì bấm <b>Đủ 7 số</b>. Nút <b>VI / ខ្មែរ</b> đổi ngôn ngữ toàn app; số và ký hiệu G, +, C, K1, K2, O vẫn giữ nguyên.',
    guide2: 'Tool báo đỏ nếu <b>Tổng ĐT không bằng tổng 6 cột</b>. Sửa lại theo phiếu trước khi lưu.',
    guide3: 'Bấm <b>Lưu &amp; tờ tiếp</b> (hoặc nhấn <b>Space</b>) để nhập liên tục; số hàng tự tăng.',
    guide4: 'Có sự cố (thiếu phiếu…) thì bấm <b>Tạm lưu</b>. Lô sẽ hiện <b>Sơ đồ hàng</b>: ô xanh bấm để sửa, ô viền đứt bấm để nhập hàng còn thiếu; nút <b>Nhập tiếp h.N</b> mở lại đúng hàng đang dở.',
    guide5: 'Khi nhập xong một lô, bấm <b>Đánh dấu hoàn tất</b>. Mọi chênh lệch tổng so với 2026 sẽ hiện cảnh báo đỏ.',
    guide6: 'Mở tab <b>Bản đồ tiến độ</b> để biết khu vực nào còn lô chưa nhập. Bấm khu vực để phóng to, bấm ranh lô để xem nhanh hoặc mở lô.',
    guide7: 'Dữ liệu lưu trong trình duyệt trên máy này. Định kỳ bấm <b>Sao lưu</b> để tải file JSON dự phòng. Vào menu <b>Đồng bộ Google</b> để tự lưu lên Google Sheets và nhận mail khi lô hoàn tất.',
    guide8: 'Bấm <b>Xuất Excel</b> để lấy file từng lô (theo Mẫu nhập KK) hoặc file tổng hợp 0h 01/01/2027.',
    mapZonesTitle: 'Tiến độ theo khu vực',
    all: 'Tất cả',
    mapTitle: 'Bản đồ 95 lô',
    legendEmpty: 'Chưa nhập',
    legendDoing: 'Đang nhập',
    legendDone: 'Hoàn tất',
    legendWarn: 'Cảnh báo',
    mapLoading: 'Đang tải bản đồ…',
    mapFoot: 'Bấm vào ranh lô để xem nhanh và bấm <b>Mở lô</b> để nhập. Nền vệ tinh cần internet; khi offline ranh lô vẫn hiển thị. Lô thêm ngoài danh mục (+ Lô khác) không có ranh trên bản đồ.',
    mapLibError: 'Không tải được thư viện bản đồ.',
    mapNoGeo: 'Chưa có dữ liệu ranh lô.',
    zoneDone: '{a}/{b} xong',
    zoneDoing: '{n} đang nhập',
    zoneWarn: '{n} cảnh báo',
    zoneMissing: 'Chưa nhập {n}: <b>{list}</b>',
    zoneAllDone: 'Đã nhập đủ {a}/{b} lô',
    zoneWarnList: 'Cảnh báo: <b>{list}</b>',
    mapBadge: '{done}/{total} lô hoàn tất',
    openLot: 'Mở lô',
    backList: 'Danh sách lô',
    exportLot: 'Xuất Excel lô',
    markDone: 'Đánh dấu hoàn tất',
    reopenLot: 'Mở lại lô',
    compareTitle: 'Đối chiếu 2026 → 2027',
    metric: 'Chỉ tiêu',
    metricTotal: 'Tổng ĐT',
    catG: 'Cây cạo (G)',
    catPlus: 'Cây +',
    catC: 'Cây C',
    catK1: 'Cây K1',
    catK2: 'Cây K2',
    catO: 'Hố trống (O)',
    infoCard: 'Thông tin phiếu',
    huongLot: 'Hướng lô',
    huongPh: 'VD: Đông Tây',
    ngayKK: 'Ngày KK',
    nguoiKK: 'Người KK',
    personPh: 'Tên người kiểm kê',
    ghiChu: 'Ghi chú',
    ghiChuPh: 'Ghi chú riêng của lô…',
    rowsTitle: 'Chi tiết theo hàng',
    addRow: '+ Thêm hàng',
    thHang: 'Hàng',
    thTotal: 'Tổng ĐT',
    thCheck: 'Kiểm tra',
    thPhucTra: 'Phúc tra',
    thPhucTraTip: 'So sánh Tổng ĐT từng hàng với bảng chi tiết kiểm kê 2026 · lệch từ 2 cây được tô sáng',
    phucTraTip: 'Kiểm kê 2026: {ref} cây · 2027 lệch {d}',
    phucTraNoRef: 'Không có số 2026 cho hàng này',
    rowsPtNote: 'Phúc tra theo bảng chi tiết 2026. Hàng lệch từ 2 cây được tô sáng để Giám sát kiểm tra lại.',
    rowsPtNoData: 'Lô này chưa có bảng chi tiết 2026 theo từng hàng (lô chia nhiều hướng A/B/C hoặc lô mới) nên chưa phúc tra từng hàng.',
    ptSumWarn: '{n} hàng lệch',
    ptSumWarnTip: '{n} hàng lệch từ 2 cây so với 2026 — cần kiểm tra lại',
    ptSumOk: 'Khớp 2026',
    checksPhucTra: '<b>Phúc tra 2026:</b> {n} hàng lệch từ 2 cây: {list}. Đề nghị Giám sát kiểm tra lại.',
    checksPhucTraOk: 'Phúc tra 2026: các hàng đã nhập khớp bảng chi tiết (lệch dưới 2 cây).',
    checksPhucTraNoData: 'Lô chia nhiều hướng (A/B/C): chưa có bảng chi tiết 2026 để phúc tra từng hàng.',
    alertPhucTra: '<b>Phúc tra 2026:</b> {n} hàng lệch từ 2 cây trở lên so với bảng chi tiết 2026: {list}. Đề nghị Giám sát kiểm tra lại các hàng này.',
    hangChipPt: 'phúc tra lệch {d}',
    total: 'Tổng',
    rowsFoot: 'Nhập số âm? Không. Ô trống được tính là 0. Nút <b>=</b> cạnh Tổng ĐT để tự điền tổng 6 cột.',
    rowMissing: 'Thiếu ĐT',
    rowDiff: 'Lệch {n}',
    rowOk: 'Khớp',
    rowsOddNote: 'Có {n} hàng có Tổng ĐT khác mức chung {med}: hàng {list}. Xem lại trước khi chốt lô.',
    rowOddTip: 'Tổng ĐT lệch {n} cây so với mức chung {med} của lô',
    treeUnit: 'cây',
    emptyRows: 'Chưa có hàng nào. Bấm <b>Nhập nhanh</b> để nhập 2 hàng mỗi tờ, hoặc <b>+ Thêm hàng</b> để nhập thủ công.',
    sumIssues: '{n} hàng lệch tổng',
    sumOk: 'Đã khớp {n} hàng',
    rowCount: '{n} hàng đã nhập',
    calcTitle: 'Điền Tổng ĐT = tổng 6 cột',
    undoCalcTitle: 'Trả lại Tổng ĐT trước khi bấm =',
    delRowTitle: 'Xoá hàng',
    confirmDelRow: 'Xoá hàng {h}? Dữ liệu của hàng này sẽ mất.',
    toastDone: 'Đã đánh dấu hoàn tất lô {lot} lúc {time}',
    issueMissing: 'thiếu Tổng ĐT (tổng 6 cột = {sum})',
    issueDiff: 'Tổng ĐT {dt} ≠ tổng 6 cột {sum} (lệch {d})',
    hangMapTitle: 'Sơ đồ hàng',
    hangBadge: '{n} hàng',
    hangBadgeMissing: ' · thiếu {n}',
    hangBadgeIssues: ' · {n} lệch',
    hangMissing: 'Còn thiếu <b>{n}</b> hàng: <b>{list}</b>.',
    hangContinuous: 'Đã nhập liên tục hàng 1–{max}.',
    hangHint: ' Ô xanh bấm để sửa hàng; ô viền đứt bấm để nhập hàng thiếu.',
    hangBtnFill: 'Nhập hàng {h}',
    hangBtnResume: 'Nhập tiếp hàng {h}',
    hangChipEdit: 'Hàng {h} {st} — bấm để sửa',
    hangChipFill: 'Hàng {h} chưa nhập — bấm để nhập',
    hangChipMatched: 'đã khớp',
    hangChipDiff: 'lệch tổng',
    checksTitle: 'Kiểm tra dữ liệu',
    checksNoData: 'Chưa có dữ liệu để kiểm tra.',
    checksIssueCount: '{n} hàng lệch tổng:',
    checksRow: 'hàng {h}',
    checksAllOk: 'Tất cả hàng đã khớp: Tổng ĐT = G + (+) + C + K1 + K2 + O.',
    checksNoDup: 'Không có hàng trùng số.',
    checksDup: '<b>Hàng trùng:</b> {list}.',
    checksTotalLine: 'Đã nhập <b>{n}</b> hàng · lũy kế <b>{dt}</b> cây.',
    baselineEqual: 'Tổng so 2026: khớp <b>{n}</b> cây.',
    baselineDiff: 'Tổng so 2026: 2027 <b>{a}</b> / 2026 <b>{b}</b> · lệch <b>{d}</b> ({p}).',
    baselineMismatch: 'Baseline 2026 tự lệch <b>{n}</b> cây (tổng 6 cột {sum}).',
    checksNoBaseline: 'Lô ngoài danh mục, không có baseline 2026.',
    checksDone: 'Lô đã được đánh dấu hoàn tất.',
    checksNotDone: 'Lô chưa đánh dấu hoàn tất.',
    statusEmpty: 'Chưa nhập',
    statusDoing: 'Đang nhập',
    statusPaused: 'Tạm lưu',
    statusDone: 'Hoàn tất',
    statusMatch2026: 'Khớp 2026',
    statusError: 'Lỗi dữ liệu',
    statusPhucTra: 'Cần phúc tra',
    statusWarn: 'Có cảnh báo',
    statusDiff: 'Lệch {n}',
    lotOutside: 'Lô ngoài danh mục',
    metaPlantYear: 'trồng {year}',
    metaPaused: 'tạm lưu · tiếp h.{h}',
    compareBadgeNoBase: 'Không baseline',
    compareBadgeEmpty: 'Chưa nhập',
    compareBadgeMatch: 'Khớp 2026',
    compareBadgeWarn: 'Có cảnh báo',
    compareBadgeDiff: 'Lệch {n}',
    noBaseNote: 'Lô ngoài danh mục nên không có baseline 2026. Tool vẫn kiểm tra tổng hàng và xuất Excel bình thường.',
    baselineNote: 'Baseline: kiểm kê 0h 01/01/2026 · {id} · {total} cây. Nguồn: TỔNG HỢP KIỂM KÊ 2025-2026.xlsx.',
    alertNoRows: '<b>Chưa nhập hàng nào.</b> Bấm <b>Nhập nhanh</b> để nhập 2 hàng mỗi tờ từ dòng cuối phiếu.',
    alertIssues: '<b>{n} hàng lệch tổng.</b><br>{first}',
    alertIssuesMore: '<br>… và {n} hàng khác.',
    alertDup: '<b>Hàng bị trùng số:</b> {list}. Mỗi hàng chỉ được nhập một lần.',
    alertNoBase: 'Lô ngoài danh mục: không có baseline 2026 để đối chiếu tổng.',
    alertAllOk: 'Dữ liệu đang khớp. Nếu đã nhập đủ, bấm <b>Đánh dấu hoàn tất</b> để chốt lô.',
    alertMsgDiff: 'Tổng 2027 <b>{dt}</b> so với 2026 <b>{base}</b> · lệch <b>{d}</b> ({p}).',
    alertDoneDiff: '<b>Lô đã hoàn tất nhưng còn lệch.</b> {msg}<br>Kiểm tra lại các hàng đã nhập hoặc phiếu giấy.',
    alertTempDiff: '<b>Lệch tạm tính.</b> {msg}<br>Nếu lô chưa nhập đủ hàng thì bỏ qua cảnh báo này. Khi nhập xong, <b>đánh dấu hoàn tất</b> để chốt lô — hệ thống sẽ tự động gửi file báo cáo cho Trợ lý tổng hợp.',
    alertMatch: '<b>Tổng 2027 khớp 2026:</b> {n}',
    alertBaseMismatch: '<b>Baseline 2026 có nội bộ lệch {n}.</b> Tổng số cây KK là {total}, nhưng cộng 6 cột chỉ {sum}. Nên kiểm tra lại file 2026 gốc.',
    checksMissingRow: 'Còn thiếu <b>{n}</b> hàng trong dãy 1–{max}: {list}.',
    checksMatchTotal: 'Tổng so 2026: khớp <b>{n}</b> cây.',
    lotEyebrow: 'Đội {doi} · {id}',
    lotNoId: 'chưa có ID',
    noBaselineSub: 'Không có dữ liệu baseline 2026 để đối chiếu tự động.',
    doneSuffix: ' · Hoàn tất {time}',
    pauseSuffix: ' · Tạm lưu {time}',
    resumeHangBtn: 'Nhập tiếp h.{h}',
    menuTitle: 'Menu',
    menuExport: 'Xuất Excel tổng hợp',
    menuExportSub: '95 lô + sheet cảnh báo',
    menuBackup: 'Sao lưu dữ liệu (JSON)',
    menuBackupSub: 'Tải file dự phòng về máy',
    menuRestore: 'Phục hồi từ JSON',
    menuRestoreSub: 'Ghi đè dữ liệu đang có',
    menuSync: 'Đồng bộ Google & báo cáo mail',
    menuSyncSub: 'Chưa kết nối',
    menuDetail: 'Chi tiết đồng bộ (Google)',
    menuDetailSub: 'Xem từng hàng máy khác đã nhập',
    menuInstall: 'Cài ứng dụng lên Desktop',
    menuInstallSub: 'Chạy như app, dùng offline',
    menuDemo: 'Điền thử lô 250',
    menuDemoSub: 'Hàng 01 + 02 từ ảnh phiếu mẫu',
    menuReset: 'Xoá toàn bộ dữ liệu',
    menuResetSub: 'Không thể hoàn tác',
    menuLang: 'Ngôn ngữ',
    menuFootnote: 'Dữ liệu nằm trong trình duyệt của máy này (localStorage). Đổi máy hoặc xoá dữ liệu trình duyệt sẽ mất, nên hãy sao lưu JSON định kỳ.',
    syncEyebrow: 'Google Sheets + Gmail',
    syncTitle: 'Đồng bộ & báo cáo mail',
    syncLead: 'Dán URL Web App của Apps Script. App tự ghi dữ liệu vào Google Sheets; khi một lô được đánh dấu <b>hoàn tất</b>, Google gửi mail kèm file Excel báo cáo cho anh.',
    syncUrlLabel: 'URL Web App (Apps Script)',
    syncDeviceLabel: 'Tên máy / người nhập',
    syncDeviceHint: 'Điền một lần trên máy này (VD: Lan – Đội 2) để tab Chi tiết và Nhật ký ghi rõ ai nhập.',
    syncDevicePh: 'VD: Lan – Đội 2',
    syncEnabled: 'Tự đồng bộ sau khi lưu dữ liệu',
    syncStatusInit: 'Chưa kết nối.',
    syncSave: 'Lưu cấu hình',
    syncTest: 'Gửi thử',
    syncNow: 'Đồng bộ ngay',
    syncGuideTitle: 'Hướng dẫn cài đặt (5 phút)',
    syncStep1: 'Mở <a href="https://script.google.com/" target="_blank" rel="noopener">script.google.com</a> → <b>Dự án mới</b>.',
    syncStep2: 'Xoá nội dung mặc định, dán toàn bộ mã <code>Code.gs</code> (bấm <b>Sao chép mã Code.gs</b> bên dưới).',
    syncStep3: 'Sửa <code>EMAIL_NHAN</code> ở đầu file nếu muốn nhận mail ở địa chỉ khác (mặc định: Gmail đang đăng nhập).',
    syncStep4: 'Bấm <b>Triển khai → Triển khai mới → Ứng dụng web</b>; chọn <b>Thực thi với tư cách: Tôi</b>; <b>Ai có quyền truy cập: Mọi người</b>. Cấp quyền khi Google hỏi.',
    syncStep5: 'Sao chép URL dạng <code>…/exec</code> dán vào ô trên, bấm <b>Gửi thử</b>.',
    copyScript: 'Sao chép mã Code.gs',
    downloadScript: 'Tải Code.gs',
    syncFootnote: 'Lần chạy đầu Google sẽ yêu cầu quyền đọc/ghi Google Sheets và gửi mail. Dữ liệu chỉ nằm trong Drive của anh, không gửi cho bên thứ ba. Mỗi lần bấm “Gửi thử” sẽ gửi 1 mail thử.',
    toastNoStore: 'Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.',
    toastAddedLot: 'Đã thêm lô ngoài danh mục: {lot}',
    toastLotExists: 'Lô này đã có trong danh sách.',
    toastReopened: 'Đã mở lại lô {lot}',
    toastExportOk: 'Đã xuất: {file}',
    toastExportFail: 'Không xuất được file Excel: {err}',
    toastNoExportData: 'Lô chưa có dữ liệu để xuất.',
    toastNoExportAll: 'Chưa có lô nào được nhập dữ liệu.',
    exportConfirm: 'Lô chưa được đánh dấu hoàn tất. Vẫn xuất file?',
    addLotPrompt: 'Nhập số lô / tên lô mới (ví dụ: 950):',
    backupOk: 'Đã tải file sao lưu JSON.',
    restoreBadFile: 'File không đúng cấu trúc.',
    restoreConfirm: 'Phục hồi sẽ ghi đè toàn bộ dữ liệu đang có. Tiếp tục?',
    restoreOk: 'Đã phục hồi dữ liệu từ file.',
    restoreFail: 'Không đọc được file: {err}',
    demoConfirm: 'Lô 250 đã có dữ liệu. Ghi đè hàng 1 và 2 bằng dữ liệu mẫu từ ảnh phiếu?',
    demoDone: 'Đã điền thử 2 hàng lô 250 từ ảnh phiếu mẫu.',
    resetConfirm: 'Xoá TOÀN BỘ dữ liệu đã nhập trên máy này? Không thể hoàn tác.',
    resetPrompt: 'Gõ XOA để xác nhận xoá toàn bộ:',
    resetCancel: 'Đã huỷ xoá.',
    resetDone: 'Đã xoá toàn bộ dữ liệu.',
    syncUrlMissing: 'Chưa cấu hình URL Apps Script.',
    syncHttpError: 'Máy chủ trả về HTTP {code}',
    syncAppError: 'Apps Script báo lỗi: {err}',
    syncStatusNone: 'Chưa kết nối',
    syncStatusConnected: 'Đã kết nối · {time}',
    syncStatusConfigured: 'Đã cấu hình URL',
    syncStatusHelp: 'Chưa kết nối. Dán URL Web App bên dưới để bật đồng bộ.',
    syncStatusNotSynced: 'Đã cấu hình URL, chưa đồng bộ lần nào.',
    syncNoUrl: 'Chưa cấu hình URL Apps Script trong menu Đồng bộ Google.',
    syncSending: 'Đang gửi dữ liệu lên Google…',
    syncNoResponse: 'Đã gửi (không đọc được phản hồi)',
    syncNoResponseToast: 'Đã gửi tới Google nhưng không đọc được phản hồi. Kiểm tra Google Sheets hoặc hộp thư.',
    syncTestOkMail: 'Kết nối tốt. Đã gửi mail thử, kiểm tra hộp thư.',
    syncTestOkSheet: 'Kết nối tốt. Đã ghi dữ liệu lên Google Sheets.',
    syncOkUrl: 'Đã đồng bộ. Mở Google Sheets trong menu.',
    syncOk: 'Đã đồng bộ Google Sheets.',
    syncErrorPrefix: 'Lỗi',
    syncErrorToast: 'Đồng bộ lỗi: {err}',
    syncPasteFirst: 'Dán URL Web App trước đã.',
    syncUrlFormat: 'URL phải có dạng https://script.google.com/macros/s/…/exec',
    syncSaved: 'Đã lưu cấu hình đồng bộ.',
    syncDisabled: 'Đã tắt đồng bộ (chưa có URL).',
    syncLast: 'Lần cuối: {time}',
    syncLotMail: 'Đã gửi mail báo cáo lô {lot}.',
    syncLotSheet: 'Đã đồng bộ lô {lot} lên Google Sheets.',
    copyOk: 'Đã sao chép Code.gs. Dán vào script.google.com.',
    copyFail: 'Không sao chép được. Bấm "Tải Code.gs" để tải file.',
    langChange: 'Đổi ngôn ngữ',
    syncPull: 'Tải tiến độ đội về máy',
    syncPullHint: 'Bấm “Tải tiến độ đội về máy” để xem lô máy khác đã nhập/hoàn tất trên bản đồ. Chỉ đọc, không ghi vào dữ liệu máy này.',
    legendRemote: 'Từ máy khác',
    remoteDoing: 'Máy khác đang nhập',
    remoteDone: 'Máy khác đã hoàn tất',
    remoteWarn: 'Máy khác: cảnh báo',
    remotePopNote: 'Số liệu từ máy khác · cập nhật {time}',
    remoteNone: 'Chưa có tiến độ từ máy khác.',
    remoteEmpty: 'Đã kết nối Google · hiện chưa có lô nào từ máy khác.',
    remotePulling: 'Đang tải tiến độ đội…',
    remotePulled: 'Đã tải tiến độ đội: {n} lô.',
    remotePullFail: 'Không tải được tiến độ: {err}',
    remoteOldScript: 'Code.gs trên Google chưa cập nhật. Dán lại Code.gs mới và Triển khai phiên bản mới.',
    remoteSummary: 'Đội: {doing} đang nhập · {done} hoàn tất · cập nhật {time}',
    btnDetailLot: 'Chi tiết đồng bộ',
    detailEyebrow: 'Google Sheets',
    detailTitle: 'Chi tiết đồng bộ',
    detailLead: 'Dữ liệu đọc từ tab Chi tiết trên Google Sheets. Chỉ xem, không sửa dữ liệu trên máy này.',
    detailLotLabel: 'Lô',
    detailRefresh: 'Tải lại',
    detailDiff: 'Lệch phúc tra',
    detailLoading: 'Đang tải chi tiết từ Google…',
    detailError: 'Không tải được chi tiết: {err}',
    detailEmpty: 'Chưa có dữ liệu chi tiết trên Google Sheets. Hãy đồng bộ từ máy đã nhập dữ liệu.',
    detailFoot: 'Dòng tô vàng: phúc tra lệch từ 2 cây. Dòng tô hồng: thiếu/lệch tổng, thiếu hoặc trùng số hàng. Dữ liệu này chỉ để xem, mọi chỉnh sửa phải thực hiện trên máy đã nhập lô.',
    detailUpdated: 'Cập nhật {time}',
    detailRowsCount: '{n} hàng',
    detailWarnCount: '{n} cảnh báo',
    detailNoWarn: 'Không có cảnh báo',
    detailDevice: 'Máy / người nhập: {device}',
    detailNguoi: 'Người KK: {nguoi}',
    detailOption: '{lot} · {n} hàng',
  },
  km: {
    appTitle: 'ការរាប់ដើមឈើ 2027 · ក្រុមទី 2 CRCK2',
    brandTitle: 'ការរាប់ដើមឈើកៅស៊ូ 2027',
    brandSub: 'ក្រុមទី 2 · CRCK2 Aphivath',
    quickEntry: 'បញ្ចូលរហ័ស',
    menu: 'ម៉ឺនុយ',
    close: 'បិទ',
    language: 'ភាសា',
    langVi: 'ភាសាវៀតណាម',
    langKm: 'ខ្មែរ',
    langTitle: 'ជ្រើសរើសភាសា',
    langToVi: 'Tiếng Việt',
    langToKm: 'ខ្មែរ',
    langToggleAriaVi: 'ប្តូរទៅភាសាវៀតណាម',
    langToggleAriaKm: 'ប្តូរទៅភាសាខ្មែរ',
    langLead: 'ភាសានឹងប្រើសម្រាប់កម្មវិធីទាំងមូល។ អាចប្តូរវិញនៅក្នុងម៉ឺនុយ។',
    langFoot: 'លេខ លេខដីឡូតិ៍ និងសញ្ញា G, +, C, K1, K2, O រក្សាដូចដើមទាំងពីរភាសា។',
    nameEyebrow: 'មុនពេលចាប់ផ្តើម',
    nameTitle: 'បញ្ចូលឈ្មោះអ្នកប្រើ',
    nameLead: 'ឈ្មោះនេះប្រើដើម្បីកត់ត្រាថាអ្នកណាបញ្ចូលទិន្នន័យដីឡូតិ៍នីមួយៗក្នុង Google Sheets។ បំពេញតែម្តងលើឧបករណ៍នេះ។',
    nameLabel: 'ឈ្មោះអ្នកប្រើ',
    namePh: 'ឧ. Lan – Team 2',
    nameHint: 'មិនចាំបាច់បំពេញភ្លាមក៏បាន។ អតិបរមា 40 តួអក្សរ។ សូមសរសេរឈ្មោះជាអក្សរឡាតាំង (English)។ អាចប្តូរពេលក្រោយក្នុង ☰ → ធ្វើសមកាល Google។',
    nameContinue: 'រក្សាទុកឈ្មោះ',
    nameLater: 'ពេលក្រោយ',
    nameRequired: 'សូមបញ្ចូលឈ្មោះមុននឹងរក្សាទុក។',
    nameSaved: 'បានរក្សាទុកឈ្មោះអ្នកប្រើ៖ {name}',
    nameLaterToast: 'មិនទាន់មានឈ្មោះអ្នកប្រើ។ អាចបំពេញពេលក្រោយក្នុង ☰ → ធ្វើសមកាល Google។',
    heroEyebrow: 'ការរាប់ពេល 0 ម៉ោង · 01/01/2027',
    heroTitle: 'បញ្ចូលលទ្ធផលតាមជួរសរុបនៃជួរនីមួយៗ',
    heroLead: 'សន្លឹកមួយមាន 2 ជួរ។ បញ្ចូលតែ 7 លេខនៅជួរចុងក្រោយ។ កម្មវិធីពិនិត្យស្វ័យប្រវត្តិ <span class="nowrap">សរុប = G + (+) + C + K1 + K2 + O</span> ហាមជួរស្ទួន និងប្រៀបធៀបនឹងការរាប់ឆ្នាំ 2026។',
    quickBySheet: 'បញ្ចូលរហ័សតាមសន្លឹក',
    exportAll: 'នាំចេញ Excel សរុប',
    statEnteredLots: 'ដីឡូតិ៍បានបញ្ចូល',
    statEnteredSub: 'ដីឡូតិ៍ {n} បានសម្គាល់រួចរាល់',
    statTrees: 'សរុបចំណុចដាំ 2027',
    statTreesSub: '2026: {base} ដើម · ខុសគ្នាបណ្ដោះអាសន្ន {delta}',
    statTreesSubNo: '2026: {base} ដើម',
    statRows: 'ជួរបានបញ្ចូល',
    statRowsSub: 'សរុបលើដីឡូតិ៍ {n}',
    statWarn: 'ដីឡូតិ៍មានការព្រមាន',
    statWarnSub: '{done} ត្រូវនឹង 2026 · {warn} ត្រូវពិនិត្យ',
    tabList: 'បញ្ជីដីឡូតិ៍',
    tabMap: 'ផែនទីវឌ្ឍនភាព',
    filterAll: 'ទាំងអស់',
    filterEmpty: 'មិនទាន់បញ្ចូល',
    filterDoing: 'កំពុងបញ្ចូល',
    filterDone: 'រួចរាល់',
    filterWarn: 'ការព្រមាន',
    searchPh: 'ស្វែងរកលេខដីឡូតិ៍, ID, ពូជ…',
    addLot: '+ ដីឡូតិ៍ផ្សេង',
    backup: 'បម្រុងទុក',
    restore: 'ស្ដារឡើងវិញ',
    thLot: 'ដីឡូតិ៍',
    th2026: '2026',
    th2027: '2027',
    thDelta: 'ខុសគ្នា',
    thRows: 'ចំនួនជួរ',
    thStatus: 'ស្ថានភាព',
    emptyTitle: 'គ្មានដីឡូតិ៍ត្រូវគ្នា',
    emptySub: 'សូមលុបពាក្យស្វែងរក ឬប្តូរតម្រង។',
    guideTitle: 'ការណែនាំខ្លី',
    guide1: 'ចុច <b>បញ្ចូលរហ័ស</b> ជ្រើស <b>តំបន់</b> រួចជ្រើស <b>ដីឡូតិ៍</b> បញ្ចូល <b>លេខជួរ</b>, <b>សរុប</b> និងលេខផ្សេងទៀតនៅជួរចុងក្រោយនៃសន្លឹក; តាមលំនាំដើម <b>G គណនាស្វ័យប្រវត្តិ</b> = សរុប − (+, C, K1, K2, O)។ បើចង់បញ្ចូល 7 លេខដោយដៃ និងពិនិត្យត្រូវ/ខុស សូមចុច <b>7 លេខ</b>។ ប៊ូតុង <b>VI / ខ្មែរ</b> ប្តូរភាសាទាំងកម្មវិធី; លេខ និងសញ្ញា G, +, C, K1, K2, O នៅដដែល។',
    guide2: 'កម្មវិធីព្រមានពណ៌ក្រហម បើ <b>សរុបមិនស្មើនឹងសរុប 6 ជួរឈរ</b>។ កែតាមសន្លឹកមុនរក្សាទុក។',
    guide3: 'ចុច <b>រក្សាទុក &amp; សន្លឹកបន្ទាប់</b> (ឬចុច <b>Space</b>) ដើម្បីបញ្ចូលបន្ត; លេខជួរកើនដោយស្វ័យប្រវត្តិ។',
    guide4: 'បើមានបញ្ហា (ខ្វះសន្លឹក…) ចុច <b>រក្សាទុកបណ្ដោះអាសន្ន</b>។ ដីឡូតិ៍នឹងបង្ហាញ <b>តារាងជួរ</b>៖ ប្រអប់ពណ៌បៃតងចុចដើម្បីកែ, ប្រអប់ជួរដេកដាច់ៗចុចដើម្បីបញ្ចូលជួរខ្វះ; ប៊ូតុង <b>បន្ត ជួរ N</b> បើកត្រង់ជួរដែលកំពុងធ្វើ។',
    guide5: 'ពេលបញ្ចូលដីឡូតិ៍រួច ចុច <b>សម្គាល់ថារួចរាល់</b>។ រាល់ភាពខុសគ្នាធៀប 2026 នឹងបង្ហាញការព្រមានក្រហម។',
    guide6: 'បើកផ្ទាំង <b>ផែនទីវឌ្ឍនភាព</b> ដើម្បីដឹងតំបន់ណាមិនទាន់បញ្ចូល។ ចុចតំបន់ដើម្បីពង្រីក, ចុចព្រំដីឡូតិ៍ដើម្បីមើលឬបើក។',
    guide7: 'ទិន្នន័យរក្សាទុកក្នុងកម្មវិធីរុករកលើម៉ាស៊ីននេះ។ ម្ដងម្កាលចុច <b>បម្រុងទុក</b> ដើម្បីទាញឯកសារ JSON។ ចូលម៉ឺនុយ <b>ធ្វើសមកាល Google</b> ដើម្បីរក្សាទុកលើ Google Sheets និងទទួលអ៊ីមែលពេលដីឡូតិ៍រួចរាល់។',
    guide8: 'ចុច <b>នាំចេញ Excel</b> ដើម្បីទាញឯកសារតាមដីឡូតិ៍ (តាមទម្រង់ Mẫu nhập KK) ឬឯកសារសរុប 0h 01/01/2027។',
    mapZonesTitle: 'វឌ្ឍនភាពតាមតំបន់',
    all: 'ទាំងអស់',
    mapTitle: 'ផែនទីដីឡូតិ៍ 95',
    legendEmpty: 'មិនទាន់បញ្ចូល',
    legendDoing: 'កំពុងបញ្ចូល',
    legendDone: 'រួចរាល់',
    legendWarn: 'ការព្រមាន',
    mapLoading: 'កំពុងផ្ទុកផែនទី…',
    mapFoot: 'ចុចព្រំដីឡូតិ៍ដើម្បីមើលរហ័ស រួចចុច <b>បើកដីឡូតិ៍</b> ដើម្បីបញ្ចូល។ ផ្ទៃខាងក្រោយផ្កាយរណបត្រូវការអ៊ីនធឺណិត; ពេលក្រៅបណ្ដាញព្រំដីឡូតិ៍នៅបង្ហាញ។ ដីឡូតិ៍បន្ថែមក្រៅបញ្ជី (+ ដីឡូតិ៍ផ្សេង) គ្មានព្រំលើផែនទី។',
    mapLibError: 'មិនអាចផ្ទុកបណ្ណាល័យផែនទី។',
    mapNoGeo: 'មិនទាន់មានទិន្នន័យព្រំដីឡូតិ៍។',
    zoneDone: '{a}/{b} រួចរាល់',
    zoneDoing: '{n} កំពុងបញ្ចូល',
    zoneWarn: '{n} ការព្រមាន',
    zoneMissing: 'មិនទាន់បញ្ចូល {n}: <b>{list}</b>',
    zoneAllDone: 'បានបញ្ចូលគ្រប់ {a}/{b} ដីឡូតិ៍',
    zoneWarnList: 'ការព្រមាន: <b>{list}</b>',
    mapBadge: '{done}/{total} ដីឡូតិ៍រួចរាល់',
    openLot: 'បើកដីឡូតិ៍',
    backList: 'បញ្ជីដីឡូតិ៍',
    exportLot: 'នាំចេញ Excel ដីឡូតិ៍',
    markDone: 'សម្គាល់ថារួចរាល់',
    reopenLot: 'បើកដីឡូតិ៍ឡើងវិញ',
    compareTitle: 'ប្រៀបធៀប 2026 → 2027',
    metric: 'ចំណុច',
    metricTotal: 'សរុប',
    catG: 'ដើមកៅស៊ូ (G)',
    catPlus: 'ដើម +',
    catC: 'ដើម C',
    catK1: 'ដើម K1',
    catK2: 'ដើម K2',
    catO: 'រណ្ដៅទទេ (O)',
    infoCard: 'ព័ត៌មានសន្លឹក',
    huongLot: 'ទិសដីឡូតិ៍',
    huongPh: 'ឧ. ខាងកើត-ខាងលិច',
    ngayKK: 'កាលបរិច្ឆេទពិនិត្យ',
    nguoiKK: 'អ្នកពិនិត្យ',
    personPh: 'ឈ្មោះអ្នកពិនិត្យ',
    ghiChu: 'កំណត់សម្គាល់',
    ghiChuPh: 'កំណត់សម្គាល់ដីឡូតិ៍…',
    rowsTitle: 'ព័ត៌មានលម្អិតតាមជួរ',
    addRow: '+ បន្ថែមជួរ',
    thHang: 'ជួរ',
    thTotal: 'សរុប',
    thCheck: 'ត្រួតពិនិត្យ',
    thPhucTra: 'ផ្ទៀងផ្ទាត់',
    thPhucTraTip: 'ប្រៀបធៀបសរុបដាំជួរនីមួយៗជាមួយតារាងលម្អិត 2026 · ខុសគ្នាចាប់ពី 2 ដើម នឹងត្រូវបន្លិច',
    phucTraTip: 'រាប់ 2026: {ref} ដើម · 2027 ខុស {d}',
    phucTraNoRef: 'គ្មានលេខ 2026 សម្រាប់ជួរនេះ',
    rowsPtNote: 'ផ្ទៀងផ្ទាត់តាមតារាងលម្អិត 2026។ ជួរខុសចាប់ពី 2 ដើម ត្រូវបន្លិច ដើម្បីឱ្យអ្នកត្រួតពិនិត្យពិនិត្យឡើងវិញ។',
    rowsPtNoData: 'ដីឡូតិ៍នេះមិនទាន់មានតារាងលម្អិត 2026 តាមជួរ (ដីឡូតិ៍បែងចែកច្រើនទិស A/B/C ឬដីឡូតិ៍ថ្មី) ដូច្នេះមិនអាចផ្ទៀងផ្ទាត់តាមជួរបានទេ។',
    ptSumWarn: '{n} ជួរខុស',
    ptSumWarnTip: '{n} ជួរខុសចាប់ពី 2 ដើមធៀប 2026 — ត្រូវពិនិត្យឡើងវិញ',
    ptSumOk: 'ត្រូវ 2026',
    checksPhucTra: '<b>ផ្ទៀងផ្ទាត់ 2026:</b> {n} ជួរខុសចាប់ពី 2 ដើម: {list}។ សូមអ្នកត្រួតពិនិត្យពិនិត្យឡើងវិញ។',
    checksPhucTraOk: 'ផ្ទៀងផ្ទាត់ 2026: ជួរដែលបានបញ្ចូលត្រូវតារាងលម្អិត (ខុសក្រោម 2 ដើម)។',
    checksPhucTraNoData: 'ដីឡូតិ៍បែងចែកច្រើនទិស (A/B/C): មិនទាន់មានតារាងលម្អិត 2026 សម្រាប់ផ្ទៀងផ្ទាត់តាមជួរ។',
    alertPhucTra: '<b>ផ្ទៀងផ្ទាត់ 2026:</b> {n} ជួរខុសចាប់ពី 2 ដើមធៀបតារាងលម្អិត 2026: {list}។ សូមអ្នកត្រួតពិនិត្យពិនិត្យឡើងវិញជួរទាំងនេះ។',
    hangChipPt: 'ផ្ទៀងផ្ទាត់ខុស {d}',
    total: 'សរុប',
    rowsFoot: 'បញ្ចូលលេខអវិជ្ជមាន? ទេ។ ប្រអប់ទទេគិតជា 0។ ប៊ូតុង <b>=</b> ក្បែរសរុប ដើម្បីបំពេញសរុប 6 ជួរឈរ។',
    rowMissing: 'ខ្វះសរុប',
    rowDiff: 'ខុសគ្នា {n}',
    rowOk: 'ត្រូវគ្នា',
    rowsOddNote: 'មាន {n} ជួរដែលសរុបដាំខុសពីកម្រិតធម្មតា {med}: ជួរ {list}។ សូមពិនិត្យឡើងវិញមុនបិទដីឡូតិ៍។',
    rowOddTip: 'សរុបដាំខុស {n} ដើមពីកម្រិតធម្មតា {med} នៃដីឡូតិ៍',
    treeUnit: 'ដើម',
    emptyRows: 'មិនទាន់មានជួរណាមួយ។ ចុច <b>បញ្ចូលរហ័ស</b> ដើម្បីបញ្ចូល 2 ជួរក្នុងមួយសន្លឹក ឬ <b>+ បន្ថែមជួរ</b> ដើម្បីបញ្ចូលដោយដៃ។',
    sumIssues: 'ជួរ {n} ខុសសរុប',
    sumOk: 'ត្រូវគ្នា {n} ជួរ',
    rowCount: 'បានបញ្ចូល {n} ជួរ',
    calcTitle: 'បំពេញសរុប = ផលបូក 6 ជួរឈរ',
    undoCalcTitle: 'ស្ដារសរុបមុនពេលចុច =',
    delRowTitle: 'លុបជួរ',
    confirmDelRow: 'លុបជួរ {h}? ទិន្នន័យជួរនេះនឹងបាត់។',
    toastDone: 'បានសម្គាល់ដីឡូតិ៍ {lot} ថាបានបញ្ចប់ នៅ {time}',
    issueMissing: 'ខ្វះសរុប (ផលបូក 6 ជួរឈរ = {sum})',
    issueDiff: 'សរុប {dt} ≠ ផលបូក 6 ជួរឈរ {sum} (ខុសគ្នា {d})',
    hangMapTitle: 'តារាងជួរ',
    hangBadge: '{n} ជួរ',
    hangBadgeMissing: ' · ខ្វះ {n}',
    hangBadgeIssues: ' · {n} ខុសគ្នា',
    hangMissing: 'នៅខ្វះ <b>{n}</b> ជួរ: <b>{list}</b>.',
    hangContinuous: 'បានបញ្ចូលជាប់គ្នា ជួរ 1–{max}.',
    hangHint: ' ប្រអប់ពណ៌បៃតងចុចដើម្បីកែជួរ; ប្រអប់ជួរដេកដាច់ៗចុចដើម្បីបញ្ចូលជួរខ្វះ។',
    hangBtnFill: 'បញ្ចូលជួរ {h}',
    hangBtnResume: 'បន្តបញ្ចូលជួរ {h}',
    hangChipEdit: 'ជួរ {h} {st} — ចុចដើម្បីកែ',
    hangChipFill: 'ជួរ {h} មិនទាន់បញ្ចូល — ចុចដើម្បីបញ្ចូល',
    hangChipMatched: 'ត្រូវគ្នា',
    hangChipDiff: 'ខុសសរុប',
    checksTitle: 'ត្រួតពិនិត្យទិន្នន័យ',
    checksNoData: 'មិនទាន់មានទិន្នន័យសម្រាប់ត្រួតពិនិត្យ។',
    checksIssueCount: 'ជួរ {n} ខុសសរុប:',
    checksRow: 'ជួរ {h}',
    checksAllOk: 'គ្រប់ជួរត្រូវគ្នា: សរុប = G + (+) + C + K1 + K2 + O។',
    checksNoDup: 'គ្មានជួរស្ទួនលេខ។',
    checksDup: '<b>ជួរស្ទួន:</b> {list}។',
    checksTotalLine: 'បានបញ្ចូល <b>{n}</b> ជួរ · សរុប <b>{dt}</b> ដើម។',
    baselineEqual: 'សរុបធៀប 2026: ត្រូវគ្នា <b>{n}</b> ដើម។',
    baselineDiff: 'សរុបធៀប 2026: 2027 <b>{a}</b> / 2026 <b>{b}</b> · ខុសគ្នា <b>{d}</b> ({p})។',
    baselineMismatch: 'ទិន្នន័យគោល 2026 ខុសគ្នាខ្លួនឯង <b>{n}</b> ដើម (សរុប 6 ជួរឈរ {sum})។',
    checksNoBaseline: 'ដីឡូតិ៍ក្រៅបញ្ជី គ្មានទិន្នន័យគោល 2026។',
    checksDone: 'ដីឡូតិ៍បានសម្គាល់ថារួចរាល់។',
    checksNotDone: 'ដីឡូតិ៍មិនទាន់សម្គាល់ថារួចរាល់។',
    statusEmpty: 'មិនទាន់បញ្ចូល',
    statusDoing: 'កំពុងបញ្ចូល',
    statusPaused: 'រក្សាទុកបណ្ដោះអាសន្ន',
    statusDone: 'រួចរាល់',
    statusMatch2026: 'ត្រូវនឹង 2026',
    statusError: 'ទិន្នន័យមានបញ្ហា',
    statusPhucTra: 'ត្រូវផ្ទៀងផ្ទាត់',
    statusWarn: 'មានការព្រមាន',
    statusDiff: 'ខុសគ្នា {n}',
    lotOutside: 'ដីឡូតិ៍ក្រៅបញ្ជី',
    metaPlantYear: 'ដាំ {year}',
    metaPaused: 'បណ្ដោះអាសន្ន · បន្ត ជួរ {h}',
    compareBadgeNoBase: 'គ្មានទិន្នន័យគោល',
    compareBadgeEmpty: 'មិនទាន់បញ្ចូល',
    compareBadgeMatch: 'ត្រូវនឹង 2026',
    compareBadgeWarn: 'មានការព្រមាន',
    compareBadgeDiff: 'ខុសគ្នា {n}',
    noBaseNote: 'ដីឡូតិ៍ក្រៅបញ្ជី គ្មានទិន្នន័យគោល 2026។ កម្មវិធីនៅតែពិនិត្យសរុបជួរ និងនាំចេញ Excel ធម្មតា។',
    baselineNote: 'ទិន្នន័យគោល: ការរាប់ 0h 01/01/2026 · {id} · {total} ដើម។ ប្រភព: TỔNG HỢP KIỂM KÊ 2025-2026.xlsx។',
    alertNoRows: '<b>មិនទាន់បញ្ចូលជួរណាមួយ។</b> ចុច <b>បញ្ចូលរហ័ស</b> ដើម្បីបញ្ចូល 2 ជួរក្នុងមួយសន្លឹកពីជួរចុងក្រោយ។',
    alertIssues: '<b>ជួរ {n} ខុសសរុប។</b><br>{first}',
    alertIssuesMore: '<br>… និងជួរ {n} ផ្សេងទៀត។',
    alertDup: '<b>ជួរស្ទួនលេខ:</b> {list}។ ជួរនីមួយៗបញ្ចូលបានតែម្ដង។',
    alertNoBase: 'ដីឡូតិ៍ក្រៅបញ្ជី: គ្មានទិន្នន័យគោល 2026 សម្រាប់ប្រៀបធៀបសរុប។',
    alertAllOk: 'ទិន្នន័យត្រូវគ្នា។ បើបញ្ចូលគ្រប់ ចុច <b>សម្គាល់ថារួចរាល់</b> ដើម្បីបិទដីឡូតិ៍។',
    alertMsgDiff: 'សរុប 2027 <b>{dt}</b> ធៀប 2026 <b>{base}</b> · ខុសគ្នា <b>{d}</b> ({p})។',
    alertDoneDiff: '<b>ដីឡូតិ៍រួចរាល់ហើយ តែនៅខុសគ្នា។</b> {msg}<br>ពិនិត្យជួរដែលបានបញ្ចូល ឬសន្លឹកក្រដាសឡើងវិញ។',
    alertTempDiff: '<b>ខុសគ្នាបណ្ដោះអាសន្ន។</b> {msg}<br>បើដីឡូតិ៍មិនទាន់បញ្ចូលគ្រប់ជួរ សូមមិនខ្វល់ការព្រមាននេះ។ ពេលបញ្ចូលរួចហើយ <b>សម្គាល់ថារួចរាល់</b> ដើម្បីបិទដីឡូតិ៍ — ប្រព័ន្ធនឹងផ្ញើឯកសាររាយការណ៍ដោយស្វ័យប្រវត្តិទៅជំនួយការសម្របសម្រួល។',
    alertMatch: '<b>សរុប 2027 ត្រូវនឹង 2026:</b> {n}',
    alertBaseMismatch: '<b>ទិន្នន័យគោល 2026 ខុសគ្នាខាងក្នុង {n}។</b> សរុបដើមគឺ {total} តែផលបូក 6 ជួរឈរគ្រាន់តែ {sum}។ គួរពិនិត្យឯកសារ 2026 ដើមឡើងវិញ។',
    checksMissingRow: 'នៅខ្វះ <b>{n}</b> ជួរក្នុងជួរលេខ 1–{max}: {list}។',
    checksMatchTotal: 'សរុបធៀប 2026: ត្រូវគ្នា <b>{n}</b> ដើម។',
    lotEyebrow: 'ក្រុម {doi} · {id}',
    lotNoId: 'គ្មាន ID',
    noBaselineSub: 'គ្មានទិន្នន័យគោល 2026 សម្រាប់ប្រៀបធៀបស្វ័យប្រវត្តិ។',
    doneSuffix: ' · រួចរាល់ {time}',
    pauseSuffix: ' · បណ្ដោះអាសន្ន {time}',
    resumeHangBtn: 'បន្ត ជួរ {h}',
    menuTitle: 'ម៉ឺនុយ',
    menuExport: 'នាំចេញ Excel សរុប',
    menuExportSub: '95 ដីឡូតិ៍ + សន្លឹកការព្រមាន',
    menuBackup: 'បម្រុងទុកទិន្នន័យ (JSON)',
    menuBackupSub: 'ទាញឯកសារបម្រុងទុកមកម៉ាស៊ីន',
    menuRestore: 'ស្ដារពី JSON',
    menuRestoreSub: 'សរសេរជាន់ទិន្នន័យបច្ចុប្បន្ន',
    menuSync: 'ធ្វើសមកាល Google & របាយការណ៍អ៊ីមែល',
    menuSyncSub: 'មិនទាន់ភ្ជាប់',
    menuDetail: 'លម្អិតសមកាល (Google)',
    menuDetailSub: 'មើលជួរនីមួយៗដែលឧបករណ៍ផ្សេងបានបញ្ចូល',
    menuInstall: 'ដំឡើងកម្មវិធីលើ Desktop',
    menuInstallSub: 'ដំណើរការដូចកម្មវិធី, ប្រើក្រៅបណ្ដាញ',
    menuDemo: 'បំពេញសាកល្បងដីឡូតិ៍ 250',
    menuDemoSub: 'ជួរ 01 + 02 ពីរូបសន្លឹកគំរូ',
    menuReset: 'លុបទិន្នន័យទាំងអស់',
    menuResetSub: 'មិនអាចត្រឡប់វិញបាន',
    menuLang: 'ភាសា',
    menuFootnote: 'ទិន្នន័យនៅក្នុងកម្មវិធីរុករករបស់ម៉ាស៊ីននេះ (localStorage)។ ប្តូរម៉ាស៊ីន ឬលុបទិន្នន័យកម្មវិធីរុករកនឹងបាត់ ដូច្នេះសូមបម្រុងទុក JSON ជាប្រចាំ។',
    syncEyebrow: 'Google Sheets + Gmail',
    syncTitle: 'ធ្វើសមកាល & របាយការណ៍អ៊ីមែល',
    syncLead: 'បិទភ្ជាប់ URL Web App របស់ Apps Script។ កម្មវិធីនឹងសរសេរទិន្នន័យទៅ Google Sheets; ពេលដីឡូតិ៍ត្រូវបានសម្គាល់ <b>រួចរាល់</b> Google នឹងផ្ញើអ៊ីមែលជាមួយឯកសារ Excel។',
    syncUrlLabel: 'URL Web App (Apps Script)',
    syncDeviceLabel: 'ឈ្មោះឧបករណ៍ / អ្នកបញ្ចូល',
    syncDeviceHint: 'បំពេញម្តងលើឧបករណ៍នេះ (ឧ. Lan – Team 2) ដើម្បីឱ្យតារាងលម្អិត និងកំណត់ហេតុកត់ត្រាច្បាស់ថាអ្នកណាបញ្ចូល។ សូមសរសេរឈ្មោះជាអក្សរឡាតាំង (English)។',
    syncDevicePh: 'ឧ. Lan – Team 2',
    syncEnabled: 'ធ្វើសមកាលស្វ័យប្រវត្តិក្រោយរក្សាទុក',
    syncStatusInit: 'មិនទាន់ភ្ជាប់។',
    syncSave: 'រក្សាទុកការកំណត់',
    syncTest: 'ផ្ញើសាកល្បង',
    syncNow: 'ធ្វើសមកាលឥឡូវ',
    syncGuideTitle: 'ការណែនាំដំឡើង (5 នាទី)',
    syncStep1: 'បើក <a href="https://script.google.com/" target="_blank" rel="noopener">script.google.com</a> → <b>គម្រោងថ្មី</b>។',
    syncStep2: 'លុបខ្លឹមសារដើម បិទភ្ជាប់កូដ <code>Code.gs</code> ទាំងអស់ (ចុច <b>ចម្លងកូដ Code.gs</b> ខាងក្រោម)។',
    syncStep3: 'កែ <code>EMAIL_NHAN</code> នៅដើមឯកសារ បើចង់ទទួលអ៊ីមែលនៅអាសយដ្ឋានផ្សេង (លំនាំដើម: Gmail ដែលកំពុងចូល)។',
    syncStep4: 'ចុច <b>Deploy → New deployment → Web app</b>; ជ្រើស <b>Execute as: Me</b>; <b>Who has access: Anyone</b>។ ផ្ដល់សិទ្ធិពេល Google សួរ។',
    syncStep5: 'ចម្លង URL ទម្រង់ <code>…/exec</code> បិទភ្ជាប់ក្នុងប្រអប់ខាងលើ ចុច <b>ផ្ញើសាកល្បង</b>។',
    copyScript: 'ចម្លងកូដ Code.gs',
    downloadScript: 'ទាញយក Code.gs',
    syncFootnote: 'លើកដំបូង Google នឹងសុំសិទ្ធិអាន/សរសេរ Google Sheets និងផ្ញើអ៊ីមែល។ ទិន្នន័យនៅក្នុង Drive របស់អ្នក មិនផ្ញើទៅភាគីទីបី។ រាល់ពេលចុច “ផ្ញើសាកល្បង” នឹងផ្ញើអ៊ីមែលសាកល្បង 1 សារ។',
    toastNoStore: 'មិនអាចរក្សាទុកទិន្នន័យ។ អង្គចងចាំកម្មវិធីរុករកអាចពេញ។',
    toastAddedLot: 'បានបន្ថែមដីឡូតិ៍ក្រៅបញ្ជី: {lot}',
    toastLotExists: 'ដីឡូតិ៍នេះមានក្នុងបញ្ជីរួចហើយ។',
    toastReopened: 'បានបើកដីឡូតិ៍ {lot} ឡើងវិញ',
    toastExportOk: 'បាននាំចេញ: {file}',
    toastExportFail: 'មិនអាចនាំចេញ Excel: {err}',
    toastNoExportData: 'ដីឡូតិ៍មិនទាន់មានទិន្នន័យសម្រាប់នាំចេញ។',
    toastNoExportAll: 'មិនទាន់មានដីឡូតិ៍ណាមួយបញ្ចូលទិន្នន័យ។',
    exportConfirm: 'ដីឡូតិ៍មិនទាន់សម្គាល់ថារួចរាល់។ នៅតែនាំចេញ?',
    addLotPrompt: 'បញ្ចូលលេខ / ឈ្មោះដីឡូតិ៍ថ្មី (ឧ. 950):',
    backupOk: 'បានទាញឯកសារបម្រុងទុក JSON។',
    restoreBadFile: 'ឯកសារមិនត្រឹមត្រូវតាមទម្រង់។',
    restoreConfirm: 'ការស្ដារនឹងសរសេរជាន់ទិន្នន័យបច្ចុប្បន្នទាំងអស់។ បន្ត?',
    restoreOk: 'បានស្ដារទិន្នន័យពីឯកសារ។',
    restoreFail: 'មិនអាចអានឯកសារ: {err}',
    demoConfirm: 'ដីឡូតិ៍ 250 មានទិន្នន័យហើយ។ សរសេរជាន់ជួរ 1 និង 2 ដោយទិន្នន័យគំរូពីរូបសន្លឹក?',
    demoDone: 'បានបំពេញសាកល្បង 2 ជួរដីឡូតិ៍ 250 ពីរូបសន្លឹកគំរូ។',
    resetConfirm: 'លុបទិន្នន័យទាំងអស់ដែលបានបញ្ចូលលើម៉ាស៊ីននេះ? មិនអាចត្រឡប់វិញបាន។',
    resetPrompt: 'វាយ XOA ដើម្បីបញ្ជាក់ការលុបទាំងអស់:',
    resetCancel: 'បានបោះបង់ការលុប។',
    resetDone: 'បានលុបទិន្នន័យទាំងអស់។',
    syncUrlMissing: 'មិនទាន់កំណត់ URL Apps Script។',
    syncHttpError: 'ម៉ាស៊ីនបម្រើឆ្លើយ HTTP {code}',
    syncAppError: 'Apps Script រាយការណ៍កំហុស: {err}',
    syncStatusNone: 'មិនទាន់ភ្ជាប់',
    syncStatusConnected: 'បានភ្ជាប់ · {time}',
    syncStatusConfigured: 'បានកំណត់ URL',
    syncStatusHelp: 'មិនទាន់ភ្ជាប់។ បិទភ្ជាប់ URL Web App ខាងក្រោមដើម្បីបើកសមកាលកម្ម។',
    syncStatusNotSynced: 'បានកំណត់ URL មិនទាន់ធ្វើសមកាលនៅឡើយ។',
    syncNoUrl: 'មិនទាន់កំណត់ URL Apps Script ក្នុងម៉ឺនុយ ធ្វើសមកាល Google។',
    syncSending: 'កំពុងផ្ញើទិន្នន័យទៅ Google…',
    syncNoResponse: 'បានផ្ញើ (មិនអាចអានការឆ្លើយតប)',
    syncNoResponseToast: 'បានផ្ញើទៅ Google ប៉ុន្តែមិនអាចអានការឆ្លើយតប។ សូមពិនិត្យ Google Sheets ឬប្រអប់សំបុត្រ។',
    syncTestOkMail: 'ភ្ជាប់បានល្អ។ បានផ្ញើអ៊ីមែលសាកល្បង សូមពិនិត្យប្រអប់សំបុត្រ។',
    syncTestOkSheet: 'ភ្ជាប់បានល្អ។ បានសរសេរទិន្នន័យទៅ Google Sheets។',
    syncOkUrl: 'បានធ្វើសមកាល។ បើក Google Sheets ក្នុងម៉ឺនុយ។',
    syncOk: 'បានធ្វើសមកាល Google Sheets។',
    syncErrorPrefix: 'កំហុស',
    syncErrorToast: 'កំហុសសមកាលកម្ម: {err}',
    syncPasteFirst: 'សូមបិទភ្ជាប់ URL Web App សិន។',
    syncUrlFormat: 'URL ត្រូវមានទម្រង់ https://script.google.com/macros/s/…/exec',
    syncSaved: 'បានរក្សាទុកការកំណត់សមកាលកម្ម។',
    syncDisabled: 'បានបិទសមកាលកម្ម (មិនទាន់មាន URL)។',
    syncLast: 'លើកចុងក្រោយ: {time}',
    syncLotMail: 'បានផ្ញើអ៊ីមែលរបាយការណ៍ដីឡូតិ៍ {lot}។',
    syncLotSheet: 'បានធ្វើសមកាលដីឡូតិ៍ {lot} ទៅ Google Sheets។',
    copyOk: 'បានចម្លង Code.gs។ បិទភ្ជាប់ក្នុង script.google.com។',
    copyFail: 'មិនអាចចម្លងបាន។ ចុច "ទាញយក Code.gs" ដើម្បីទាញឯកសារ។',
    langChange: 'ប្តូរភាសា',
    syncPull: 'ទាញវឌ្ឍនភាពក្រុម',
    syncPullHint: 'ចុច “ទាញវឌ្ឍនភាពក្រុម” ដើម្បីមើលដីឡូតិ៍ដែលម៉ាស៊ីនផ្សេងបានបញ្ចូល/រួចរាល់លើផែនទី។ អានប៉ុណ្ណោះ មិនសរសេរចូលទិន្នន័យម៉ាស៊ីននេះទេ។',
    legendRemote: 'ពីម៉ាស៊ីនផ្សេង',
    remoteDoing: 'ម៉ាស៊ីនផ្សេងកំពុងបញ្ចូល',
    remoteDone: 'ម៉ាស៊ីនផ្សេងបានរួចរាល់',
    remoteWarn: 'ម៉ាស៊ីនផ្សេង៖ ការព្រមាន',
    remotePopNote: 'ទិន្នន័យពីម៉ាស៊ីនផ្សេង · ធ្វើបច្ចុប្បន្នភាព {time}',
    remoteNone: 'មិនមានវឌ្ឍនភាពពីម៉ាស៊ីនផ្សេងទេ។',
    remoteEmpty: 'បានភ្ជាប់ Google · មិនទាន់មានដីឡូតិ៍ពីម៉ាស៊ីនផ្សេងទេ។',
    remotePulling: 'កំពុងទាញវឌ្ឍនភាពក្រុម…',
    remotePulled: 'បានទាញវឌ្ឍនភាព៖ {n} ដីឡូតិ៍។',
    remotePullFail: 'មិនអាចទាញវឌ្ឍនភាព៖ {err}',
    remoteOldScript: 'Code.gs លើ Google មិនទាន់បានធ្វើបច្ចុប្បន្នភាពទេ។ បិទភ្ជាប់ Code.gs ថ្មី ហើយដាក់ផ្សព្វផ្សាយកំណែថ្មី។',
    remoteSummary: 'ក្រុម៖ {doing} កំពុងបញ្ចូល · {done} រួចរាល់ · {time}',
    btnDetailLot: 'លម្អិតសមកាល',
    detailEyebrow: 'Google Sheets',
    detailTitle: 'លម្អិតសមកាល',
    detailLead: 'ទិន្នន័យអានពីផ្ទាំង លម្អិត ក្នុង Google Sheets។ មើលបានតែប៉ុណ្ណោះ មិនកែទិន្នន័យលើឧបករណ៍នេះទេ។',
    detailLotLabel: 'ដីឡូតិ៍',
    detailRefresh: 'ផ្ទុកឡើងវិញ',
    detailDiff: 'ខុសគ្នាផ្ទៀងផ្ទាត់',
    detailLoading: 'កំពុងផ្ទុកលម្អិតពី Google…',
    detailError: 'មិនអាចផ្ទុកលម្អិតបាន៖ {err}',
    detailEmpty: 'មិនទាន់មានទិន្នន័យលម្អិតនៅ Google Sheets។ សូមធ្វើសមកាលពីឧបករណ៍ដែលបានបញ្ចូលទិន្នន័យ។',
    detailFoot: 'ជួរពណ៌លឿង៖ ផ្ទៀងផ្ទាត់ខុសគ្នាចាប់ពី 2 ដើម។ ជួរពណ៌ផ្កាឈូក៖ ខ្វះ/សរុបមិនត្រូវ ខ្វះ ឬស្ទួនលេខជួរ។ ទិន្នន័យនេះសម្រាប់តែមើល ត្រូវកែនៅឧបករណ៍ដែលបានបញ្ចូលដីឡូតិ៍។',
    detailUpdated: 'ធ្វើបច្ចុប្បន្នភាព {time}',
    detailRowsCount: '{n} ជួរ',
    detailWarnCount: '{n} ការព្រមាន',
    detailNoWarn: 'គ្មានការព្រមាន',
    detailDevice: 'ឧបករណ៍ / អ្នកបញ្ចូល៖ {device}',
    detailNguoi: 'អ្នករាប់៖ {nguoi}',
    detailOption: '{lot} · {n} ជួរ',
  },
};
function t(key, vars) {
  const pack = APP_I18N[state.lang] || APP_I18N.vi;
  let s = pack[key] != null ? pack[key] : (APP_I18N.vi[key] != null ? APP_I18N.vi[key] : key);
  if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
  return s;
}
function qt(key) {
  const pack = QUICK_I18N[state.lang] || QUICK_I18N.vi;
  return pack[key] != null ? pack[key] : QUICK_I18N.vi[key];
}
function qtf(key, vars) {
  let s = qt(key);
  Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
  return s;
}

function openLot(key, push = true) {
  state.view = 'lot';
  state.lot = key;
  state.recentLot = null;
  $('#view-home').hidden = true;
  $('#view-lot').hidden = false;
  renderLot();
  if (push) history.pushState({ lot: key }, '', '#lo/' + encodeURIComponent(key));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function openHome(push = true) {
  state.view = 'home';
  state.lot = null;
  $('#view-lot').hidden = true;
  $('#view-home').hidden = false;
  renderHome();
  if (push) history.pushState({}, '', '#');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function routeFromHash() {
  const m = location.hash.match(/^#lo\/(.+)$/);
  if (m) {
    const key = decodeURIComponent(m[1]);
    if (BASE_BY_LOT.has(key) || DB.lots[key]) {
      state.view = 'lot';
      state.lot = key;
      $('#view-home').hidden = true;
      $('#view-lot').hidden = false;
      renderLot();
      return;
    }
  }
  state.view = 'home';
  state.lot = null;
  $('#view-lot').hidden = true;
  $('#view-home').hidden = false;
  renderHome();
}

/* ============================================================
   Trang chủ
   ============================================================ */
function renderHome() {
  const keys = lotsKeys();
  let enteredLots = 0, doneLots = 0, warnLots = 0, totalRows = 0, totalTrees = 0;
  keys.forEach(key => {
    const st = lotState(key);
    if (st.entered.length) enteredLots += 1;
    if (st.level === 'done') doneLots += 1;
    if (st.level === 'warn') warnLots += 1;
    totalRows += st.entered.length;
    totalTrees += st.agg.dt;
  });
  const totalLots = keys.length;
  const baseTotal = BASELINE.reduce((s, l) => s + (l.total || 0), 0);

  $('#stats').innerHTML = `
    <div class="stat-card">
      <div class="k">${t('statEnteredLots')}</div>
      <div class="v">${enteredLots}<span class="muted" style="font-size:16px">/${totalLots}</span></div>
      <div class="s">${t('statEnteredSub', { n: doneLots })}</div>
    </div>
    <div class="stat-card ${totalTrees ? 'good' : ''}">
      <div class="k">${t('statTrees')}</div>
      <div class="v">${fmt(totalTrees)}</div>
      <div class="s">${totalTrees ? t('statTreesSub', { base: fmt(baseTotal), delta: signed(totalTrees - baseTotal) }) : t('statTreesSubNo', { base: fmt(baseTotal) })}</div>
    </div>
    <div class="stat-card">
      <div class="k">${t('statRows')}</div>
      <div class="v">${fmt(totalRows)}</div>
      <div class="s">${t('statRowsSub', { n: enteredLots })}</div>
    </div>
    <div class="stat-card ${warnLots ? 'warn' : ''}">
      <div class="k">${t('statWarn')}</div>
      <div class="v">${fmt(warnLots)}</div>
      <div class="s">${t('statWarnSub', { done: doneLots, warn: warnLots })}</div>
    </div>`;

  renderLotList();
  if (mapCtx) {
    refreshMap();
    const panel = $('#mapPanel');
    if (panel && !panel.hidden) requestAnimationFrame(() => mapCtx.map.invalidateSize());
  }
}

function statusInfo(st) {
  if (st.level === 'empty') return { cls: 'empty', label: t('statusEmpty'), dot: '' };
  if (st.level === 'doing') return { cls: 'doing', label: st.meta.pausedAt ? t('statusPaused') : t('statusDoing'), dot: 'doing' };
  if (st.level === 'done') return { cls: 'done', label: st.base ? t('statusMatch2026') : t('statusDone'), dot: 'done' };
  if (st.hasError) return { cls: 'warn', label: t('statusError'), dot: 'warn' };
  if (st.hasPt) return { cls: 'warn', label: t('statusPhucTra'), dot: 'warn' };
  return { cls: 'warn', label: st.delta != null ? t('statusDiff', { n: signed(st.delta) }) : t('statusWarn'), dot: 'warn' };
}
function statusLabelVN(st) {
  if (st.level === 'empty') return 'Chưa nhập';
  if (st.level === 'doing') return st.meta.pausedAt ? 'Tạm lưu' : 'Đang nhập';
  if (st.level === 'done') return st.base ? 'Khớp 2026' : 'Hoàn tất';
  if (st.hasError) return 'Lỗi dữ liệu';
  if (st.hasPt) return 'Cần phúc tra';
  return st.delta != null ? `Lệch ${signed(st.delta)}` : 'Có cảnh báo';
}

function lotRowHtml(key) {
  const st = lotState(key);
  const base = st.base;
  const info = statusInfo(st);
  const entered = st.entered.length > 0;
  const metaBits = [];
  if (base) {
    if (base.clone) metaBits.push(base.clone);
    if (base.year) metaBits.push(t('metaPlantYear', { year: base.year }));
    if (base.area) metaBits.push(fmt2(base.area) + ' ha');
    if (base.id) metaBits.push(base.id);
  } else {
    metaBits.push(t('lotOutside'));
  }
  if (st.level === 'doing' && st.meta.pausedAt) {
    metaBits.push(t('metaPaused', { h: resumeHang(key) }));
  }
  let deltaCls = 'muted';
  let deltaText = '—';
  if (base && entered) {
    deltaText = signed(st.delta);
    if (st.delta === 0) deltaCls = 'delta-0';
    else deltaCls = st.meta.done ? 'delta-x' : 'delta-w';
  }
  const pill = `<span class="status-pill ${info.cls}"><span class="status-dot"></span>${esc(info.label)}</span>`;
  return `
    <button class="lot-row${key === state.recentLot ? ' is-recent' : ''}" type="button" data-lot="${esc(key)}"${key === state.recentLot ? ' aria-current="true"' : ''}>
      <span class="lot-main">
        <span class="lot-dot ${info.dot}"></span>
        <span style="min-width:0">
          <span class="lot-name">${esc(key)}</span>
          <span class="lot-meta">${esc(metaBits.join(' · '))}</span>
        </span>
      </span>
      <span class="lot-stats">
        <span class="stat"><small>2026</small><b>${base ? fmt(base.total) : '—'}</b></span>
        <span class="stat"><small>2027</small><b>${entered ? fmt(st.agg.dt) : '—'}</b></span>
        <span class="stat"><small>${t('thDelta')}</small><b class="${deltaCls}">${deltaText}</b></span>
        <span class="stat"><small>${t('thRows')}</small><b>${st.entered.length}</b></span>
        <span class="stat status"><small>${t('thStatus')}</small>${pill}</span>
      </span>
    </button>`;
}

function renderLotList() {
  const q = state.q.trim().toLowerCase();
  const all = lotsKeys();
  const recent = state.recentLot && all.includes(state.recentLot) ? state.recentLot : null;
  let keys = all.filter(key => {
    if (key === recent) return false;
    const st = lotState(key);
    if (state.filter === 'empty' && st.level !== 'empty') return false;
    if (state.filter === 'doing' && st.level !== 'doing') return false;
    if (state.filter === 'done' && st.level !== 'done') return false;
    if (state.filter === 'warn' && st.level !== 'warn') return false;
    if (!q) return true;
    const base = BASE_BY_LOT.get(key);
    const hay = [key, base && base.id, base && base.clone, base && base.year].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
  if (recent) keys.unshift(recent);
  const list = $('#lotList');
  list.innerHTML = keys.map(lotRowHtml).join('');
  $('#emptyState').hidden = keys.length > 0;
}

/* ============================================================
   Bản đồ tiến độ
   ============================================================ */
let mapCtx = null;

function zoneStats(zone) {
  const out = { zone, total: 0, empty: [], doing: [], done: [], warn: [] };
  GEO.forEach(f => {
    if (f.properties.kv !== zone) return;
    const key = f.properties.ma_lo;
    out.total += 1;
    out[viewLevel(key).level].push(key);
  });
  return out;
}

function shortList(keys, max = 5) {
  const shown = keys.slice(0, max).join(', ');
  return keys.length > max ? shown + ', …' : shown;
}

function renderZones() {
  const host = $('#mapZones');
  if (!host) return;
  host.innerHTML = ZONE_ORDER.map(zone => {
    const s = zoneStats(zone);
    if (!s.total) return '';
    const segs = ['done', 'doing', 'warn', 'empty']
      .filter(k => s[k].length)
      .map(k => `<i style="width:${(s[k].length / s.total * 100).toFixed(2)}%;background:${STATUS_COLORS[k]}"></i>`)
      .join('');
    const bits = [t('zoneDone', { a: s.done.length, b: s.total })];
    if (s.doing.length) bits.push(t('zoneDoing', { n: s.doing.length }));
    if (s.warn.length) bits.push(t('zoneWarn', { n: s.warn.length }));
    let miss = '';
    let missCls = '';
    if (s.empty.length) miss = t('zoneMissing', { n: s.empty.length, list: esc(shortList(s.empty)) });
    else if (!s.warn.length) { miss = t('zoneAllDone', { a: s.total, b: s.total }); missCls = ' all-done'; }
    if (s.warn.length) miss += `${miss ? ' · ' : ''}${t('zoneWarnList', { list: esc(shortList(s.warn)) })}`;
    return `<button class="zone-row${state.zone === zone ? ' is-active' : ''}" data-zone="${zone}" type="button">
      <span class="zone-top"><span class="zone-name">${zone}</span><span class="zone-count">${bits.join(' · ')}</span></span>
      <span class="zone-bar">${segs}</span>
      <span class="zone-miss${missCls}">${miss}</span>
    </button>`;
  }).join('');
  const doneCount = [...GEO_BY_LOT.keys()].filter(key => viewLevel(key).level === 'done').length;
  const badge = $('#mapBadge');
  if (badge) badge.textContent = t('mapBadge', { done: doneCount, total: GEO.length });
  const allBtn = $('#btnZoneAll');
  if (allBtn) allBtn.hidden = !state.zone;
}

function mapPopupHtml(key) {
  const st = lotState(key);
  const v = viewLevel(key);
  const r = v.remote;
  const base = st.base;
  const info = r ? remoteStatusInfo(v.level) : statusInfo(st);
  const f = GEO_BY_LOT.get(key);
  const p = f ? f.properties : {};
  const bits = [p.kv, base && base.id, base && base.clone, p.area_ha ? fmt2(p.area_ha) + ' ha' : ''].filter(Boolean);
  const entered = r ? r.entered : st.entered.length;
  const dt = r ? r.dt : (st.entered.length ? st.agg.dt : null);
  const deltaNum = r ? r.delta : (base && st.entered.length ? st.delta : null);
  const isDone = r ? r.done : st.meta.done;
  let delta = '—';
  let deltaCls = 'muted';
  if (deltaNum != null) {
    delta = signed(deltaNum);
    deltaCls = deltaNum === 0 ? 'delta-0' : (isDone ? 'delta-x' : 'delta-w');
  }
  const doneAt = r ? (r.doneAt || '') : (st.meta.done && st.meta.doneAt ? dateTimeVN(st.meta.doneAt) : '');
  return `<div class="map-pop">
    <h4>${t('thLot')} ${esc(key)}</h4>
    <div class="map-pop-sub">${esc(bits.join(' · '))}</div>
    <span class="status-pill ${info.cls}"><span class="status-dot"></span>${esc(info.label)}</span>
    <table>
      <tr><td>2026</td><td>${base ? fmt(base.total) : '—'}</td></tr>
      <tr><td>2027</td><td>${dt != null ? fmt(dt) : '—'}</td></tr>
      <tr><td>${t('thDelta')}</td><td class="${deltaCls}">${delta}</td></tr>
      <tr><td>${t('thRows')}</td><td>${entered}</td></tr>
      ${doneAt ? `<tr><td>${t('statusDone')}</td><td>${esc(doneAt)}</td></tr>` : ''}
    </table>
    ${r ? `<p class="remote-note">${esc(t('remotePopNote', { time: r.updatedAtDisplay || r.updatedAt || '—' }))}${r.nguoi ? ' · ' + esc(r.nguoi) : ''}</p>` : ''}
    <button class="open-lot" data-openlot="${esc(key)}" type="button">${t('openLot')}</button>
  </div>`;
}

function mapStyle(key) {
  const v = viewLevel(key);
  const color = STATUS_COLORS[v.level] || STATUS_COLORS.empty;
  const style = { color, weight: 1.3, opacity: .95, fillColor: color, fillOpacity: .42 };
  if (v.remote) {
    style.weight = 1.8;
    style.dashArray = '6 4';
    style.fillOpacity = .24;
  }
  return style;
}

function initMap() {
  if (mapCtx) return mapCtx;
  const el = $('#mapCanvas');
  if (!window.L || !el) {
    const hint = $('#mapHint');
    if (hint) hint.textContent = t('mapLibError');
    return null;
  }
  if (!GEO.length) {
    const hint = $('#mapHint');
    if (hint) hint.textContent = t('mapNoGeo');
    return null;
  }
  const map = L.map(el, { zoomControl: true, preferCanvas: true });
  map.setView([13.2, 104.72], 14);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Esri Satellite',
  }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);

  const layers = new Map();
  const zoneBounds = new Map();
  const allBounds = L.latLngBounds([]);
  GEO.forEach(f => {
    const key = f.properties.ma_lo;
    const layer = L.geoJSON(f, {
      style: () => mapStyle(key),
      onEachFeature: (_feat, lyr) => lyr.bindPopup(() => mapPopupHtml(key), { maxWidth: 280 }),
    }).addTo(map);
    layers.set(key, layer);
    const kv = f.properties.kv;
    const b = layer.getBounds();
    if (b.isValid()) {
      allBounds.extend(b);
      if (!zoneBounds.has(kv)) zoneBounds.set(kv, L.latLngBounds([]));
      zoneBounds.get(kv).extend(b);
    }
  });

  mapCtx = { map, layers, zoneBounds, allBounds };
  if (allBounds.isValid()) map.fitBounds(allBounds, { padding: [18, 18] });
  const wrap = el.closest('.map-wrap');
  if (wrap) wrap.classList.add('is-ready');
  return mapCtx;
}

function applyZoneStyles() {
  if (!mapCtx) return;
  mapCtx.layers.forEach((layer, key) => {
    const base = mapStyle(key);
    const kv = GEO_BY_LOT.get(key).properties.kv;
    const dim = state.zone && kv !== state.zone;
    layer.setStyle(dim ? Object.assign({}, base, { opacity: .18, fillOpacity: .06 }) : base);
  });
}

function refreshMap() {
  applyZoneStyles();
  renderZones();
}

function setZone(zone, opts = {}) {
  state.zone = zone || null;
  applyZoneStyles();
  renderZones();
  if (!mapCtx) return;
  const bounds = state.zone ? mapCtx.zoneBounds.get(state.zone) : mapCtx.allBounds;
  if (bounds && bounds.isValid()) mapCtx.map.fitBounds(bounds, { padding: [22, 22], maxZoom: 17 });
  if (opts.scroll && window.innerWidth <= 980) {
    const wrap = $('.map-wrap');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function setHomeView(mode) {
  state.homeView = mode === 'map' ? 'map' : 'list';
  $$('.home-tabs .seg').forEach(btn => {
    const active = btn.dataset.homeview === state.homeView;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  $('#listPanel').hidden = state.homeView !== 'list';
  $('#mapPanel').hidden = state.homeView !== 'map';
  if (state.homeView === 'map') {
    pullRemote(false);
    const ctx = initMap();
    if (ctx) {
      refreshMap();
      requestAnimationFrame(() => ctx.map.invalidateSize());
    } else {
      renderZones();
    }
  }
}

/* ============================================================
   Chi tiết lô
   ============================================================ */
function renderLot() {
  const key = state.lot;
  if (!key) { openHome(false); return; }
  const st = lotState(key);
  const base = st.base;
  const meta = st.meta;

  $('#lotEyebrow').textContent = base ? t('lotEyebrow', { doi: base.doi, id: base.id || t('lotNoId') }) : t('lotOutside');
  $('#lotTitle').textContent = `${t('thLot')} ${key}`;
  const doneSuffix = meta.done && meta.doneAt ? t('doneSuffix', { time: dateTimeVN(meta.doneAt) }) : '';
  const pauseSuffix = !meta.done && meta.pausedAt ? t('pauseSuffix', { time: dateTimeVN(meta.pausedAt) }) : '';
  $('#lotSub').textContent = base
    ? `${base.clone || '—'} · ${t('metaPlantYear', { year: base.year || '—' })} · ${fmt2(base.area)} ha · 2026: ${fmt(base.total)} ${t('treeUnit')}${doneSuffix}${pauseSuffix}`
    : t('noBaselineSub') + doneSuffix + pauseSuffix;

  $('#metaHuong').value = meta.huong || '';
  $('#metaNgay').value = meta.ngay || '';
  $('#metaNguoi').value = meta.nguoi || '';
  $('#metaGhiChu').value = meta.ghiChu || '';

  const doneBtn = $('#btnToggleDone');
  doneBtn.textContent = meta.done ? t('reopenLot') : t('markDone');
  doneBtn.classList.toggle('btn-primary', !meta.done);
  $('#btnQuickLot').textContent = !meta.done && st.entered.length ? t('resumeHangBtn', { h: resumeHang(key) }) : t('quickEntry');

  rebuildRowsTable();
  refreshLotDerived();
}

function sortedRows(key) {
  return lotRows(key).slice().sort((a, b) => {
    const ha = a.hang == null ? 999999 : a.hang;
    const hb = b.hang == null ? 999999 : b.hang;
    if (ha !== hb) return ha - hb;
    return 0;
  });
}

function ptCellHtml(pt) {
  if (!pt) {
    return `<span class="pt-empty" title="${esc(t('phucTraNoRef'))}">—</span>`;
  }
  const cls = pt.warn ? 'alert' : 'ok';
  return `<span class="pt-cell ${cls}" title="${esc(t('phucTraTip', { ref: fmt(pt.ref), d: signed(pt.diff) }))}">
    <span class="pt-ref">2026 · ${fmt(pt.ref)}</span>
    <span class="pt-diff ${cls}">${signed(pt.diff)}</span>
  </span>`;
}

function rowHtml(row, odd) {
  const key = state.lot;
  const issue = rowIssue(row);
  const has = rowHasData(row);
  const sum = rowSum(row);
  const oddInfo = odd ? odd.get(row.uid) : null;
  const pt = phucTraOf(key, row);
  const ptWarn = !!(pt && pt.warn);
  let checkCls = 'empty', checkText = '—';
  if (has) {
    if (issue) {
      checkCls = 'bad';
      checkText = row.dt == null ? t('rowMissing') : t('rowDiff', { n: signed(Number(row.dt) - sum) });
    } else {
      checkCls = 'ok';
      checkText = t('rowOk');
    }
  }
  const dtBad = issue && row.dt != null ? ' bad' : '';
  const dtOdd = oddInfo ? ' odd' : '';
  const dtTitle = oddInfo ? ` title="${t('rowOddTip', { n: signed(oddInfo.diff), med: fmt(oddInfo.ref) })}"` : '';
  const input = (field, cls) => `<input class="${cls || ''}" type="number" inputmode="numeric" min="0" step="1"
      data-field="${field}" data-uid="${row.uid}" value="${row[field] == null ? '' : row[field]}" aria-label="${field}">`;
  const rowCls = [oddInfo ? 'row-outlier' : '', ptWarn ? 'pt-warn' : ''].filter(Boolean).join(' ');
  return `
    <tr data-uid="${row.uid}"${rowCls ? ` class="${rowCls}"` : ''}>
      <td><input class="hang-input" type="number" inputmode="numeric" min="1" step="1" data-field="hang" data-uid="${row.uid}" value="${row.hang == null ? '' : row.hang}" aria-label="${t('thHang')}"></td>
      <td><input class="dt-input${dtBad}${dtOdd}"${dtTitle} type="number" inputmode="numeric" min="0" step="1" data-field="dt" data-uid="${row.uid}" value="${row.dt == null ? '' : row.dt}" aria-label="dt"></td>
      <td>${input('g')}</td>
      <td>${input('plus')}</td>
      <td>${input('c')}</td>
      <td>${input('k1')}</td>
      <td>${input('k2')}</td>
      <td>${input('o')}</td>
      <td class="col-pt">${ptCellHtml(pt)}</td>
      <td class="col-check"><span class="row-check ${checkCls}">${checkText}</span></td>
      <td>
        <div class="row-tools">
          <button class="mini-btn undo" type="button" data-act="undo" data-uid="${row.uid}" title="${t('undoCalcTitle')}"${rowUndo.has(row.uid) ? '' : ' hidden'}>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.5L4.5 9 8 12.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 9H14a5.2 5.2 0 0 1 0 10.4h-3.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
          </button>
          <button class="mini-btn calc" type="button" data-act="calc" data-uid="${row.uid}" title="${t('calcTitle')}">=</button>
          <button class="mini-btn del" type="button" data-act="del" data-uid="${row.uid}" title="${t('delRowTitle')}">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
}

function rebuildRowsTable() {
  const rows = sortedRows(state.lot);
  const body = $('#rowsBody');
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="11"><div class="empty-rows">${t('emptyRows')}</div></td></tr>`;
    return;
  }
  const odd = rowOutliers(rows);
  body.innerHTML = rows.map(row => rowHtml(row, odd)).join('');
}

function refreshLotDerived() {
  const key = state.lot;
  if (!key) return;
  const rows = lotRows(key);
  const entered = rows.filter(rowHasData);
  const agg = aggregate(rows);
  const issues = rowIssuesOf(rows);
  const dups = findDuplicates(rows);
  const dupsSet = new Set(dups);
  const ptIssues = phucTraIssues(key);
  const base = BASE_BY_LOT.get(key);
  const meta = lotMeta(key);
  const delta = base && entered.length ? agg.dt - base.total : null;

  $('#sumDt').textContent = fmt(agg.dt);
  $('#sumG').textContent = fmt(agg.g);
  $('#sumPlus').textContent = fmt(agg.plus);
  $('#sumC').textContent = fmt(agg.c);
  $('#sumK1').textContent = fmt(agg.k1);
  $('#sumK2').textContent = fmt(agg.k2);
  $('#sumO').textContent = fmt(agg.o);
  const checkNote = $('#sumCheckNote');
  if (!entered.length) {
    checkNote.textContent = t('statusEmpty');
    checkNote.className = 'muted';
  } else if (issues.length) {
    checkNote.textContent = t('sumIssues', { n: issues.length });
    checkNote.className = 'row-check bad';
  } else {
    checkNote.textContent = t('sumOk', { n: entered.length });
    checkNote.className = 'row-check ok';
  }
  $('#rowCountLabel').textContent = t('rowCount', { n: entered.length });

  // cập nhật từng dòng
  const odd = rowOutliers(rows);
  rows.forEach(row => {
    const tr = $(`#rowsBody tr[data-uid="${CSS.escape(row.uid)}"]`);
    if (!tr) return;
    const issue = rowIssue(row);
    const sum = rowSum(row);
    const oddInfo = odd.get(row.uid);
    tr.classList.toggle('row-outlier', !!oddInfo);
    const dtInput = tr.querySelector('input[data-field="dt"]');
    if (dtInput) {
      dtInput.classList.toggle('bad', !!(issue && row.dt != null));
      dtInput.classList.toggle('odd', !!oddInfo);
      if (oddInfo) dtInput.title = t('rowOddTip', { n: signed(oddInfo.diff), med: fmt(oddInfo.ref) });
      else dtInput.removeAttribute('title');
    }
    const hangInput = tr.querySelector('input[data-field="hang"]');
    if (hangInput) hangInput.classList.toggle('dup', row.hang != null && dupsSet.has(row.hang));
    const cell = tr.querySelector('.row-check');
    if (cell) {
      if (!rowHasData(row)) { cell.className = 'row-check empty'; cell.textContent = '—'; }
      else if (issue) { cell.className = 'row-check bad'; cell.textContent = row.dt == null ? t('rowMissing') : t('rowDiff', { n: signed(Number(row.dt) - sum) }); }
      else { cell.className = 'row-check ok'; cell.textContent = t('rowOk'); }
    }
    const pt = phucTraOf(key, row);
    tr.classList.toggle('pt-warn', !!(pt && pt.warn));
    const ptCell = tr.querySelector('.col-pt');
    if (ptCell) ptCell.innerHTML = ptCellHtml(pt);
  });

  const sumPt = $('#sumPt');
  if (sumPt) {
    if (!entered.length || !hasPhucTra(key)) {
      sumPt.textContent = '—';
      sumPt.className = 'pt-sum';
      sumPt.removeAttribute('title');
    } else if (ptIssues.length) {
      sumPt.textContent = t('ptSumWarn', { n: ptIssues.length });
      sumPt.className = 'pt-sum alert';
      sumPt.title = t('ptSumWarnTip', { n: ptIssues.length });
    } else {
      sumPt.textContent = t('ptSumOk');
      sumPt.className = 'pt-sum ok';
      sumPt.removeAttribute('title');
    }
  }
  const ptNoteEl = $('#rowsPtNote');
  if (ptNoteEl) {
    if (!hasPhucTra(key)) {
      ptNoteEl.textContent = t('rowsPtNoData');
      ptNoteEl.className = 'rows-pt-note muted';
      ptNoteEl.hidden = false;
    } else {
      ptNoteEl.textContent = t('rowsPtNote');
      ptNoteEl.className = 'rows-pt-note';
      ptNoteEl.hidden = false;
    }
  }

  const oddNote = $('#rowsOddNote');
  if (oddNote) {
    if (odd.size) {
      const list = rows
        .filter(r => odd.has(r.uid))
        .sort((a, b) => (a.hang == null ? 1e9 : a.hang) - (b.hang == null ? 1e9 : b.hang))
        .map(r => (r.hang == null ? '—' : r.hang))
        .join(', ');
      oddNote.textContent = t('rowsOddNote', { n: odd.size, list, med: fmt(odd.values().next().value.ref) });
      oddNote.hidden = false;
    } else {
      oddNote.hidden = true;
      oddNote.textContent = '';
    }
  }

  const doneBtn = $('#btnToggleDone');
  if (doneBtn && state.view === 'lot') {
    doneBtn.textContent = meta.done ? t('reopenLot') : t('markDone');
    doneBtn.classList.toggle('btn-primary', !meta.done);
  }

  renderCompare({ base, agg, entered: entered.length, delta, meta });
  renderAlerts({ base, agg, entered: entered.length, delta, meta, issues, dups, ptIssues });
  renderChecks({ key, base, agg, entered: entered.length, delta, meta, issues, dups, rows, ptIssues });
  renderHangMap(key);
}

function compareRow(label, v26, v27, isTotal, deltaCls) {
  const show27 = v27 == null ? '—' : fmt(v27);
  const show26 = v26 == null ? '—' : fmt(v26);
  let d = '—', cls = '';
  if (v26 != null && v27 != null) {
    const diff = v27 - v26;
    d = signed(diff);
    if (isTotal && diff !== 0) cls = deltaCls;
    else if (isTotal && diff === 0) cls = 'pos';
  }
  return `<tr class="${isTotal ? 'total-row' : ''}"><td>${label}</td><td>${show26}</td><td>${show27}</td><td class="${cls}">${d}</td></tr>`;
}

function renderCompare({ base, agg, entered, delta, meta }) {
  const has = entered > 0;
  const deltaCls = meta.done ? 'neg' : 'neg';
  const rows = [
    compareRow(t('metricTotal'), base ? base.total : null, has ? agg.dt : null, true, deltaCls),
    ...CATS.map(([k, key]) => compareRow(t(key), base ? base[k] : null, has ? agg[k] : null, false, '')),
  ];
  $('#compareBody').innerHTML = rows.join('');
  const badge = $('#compareBadge');
  if (!base) {
    badge.className = 'badge';
    badge.textContent = t('compareBadgeNoBase');
  } else if (!has) {
    badge.className = 'badge';
    badge.textContent = t('compareBadgeEmpty');
  } else if (delta === 0) {
    badge.className = 'badge good';
    badge.textContent = t('compareBadgeMatch');
  } else {
    badge.className = 'badge ' + (meta.done ? 'bad' : 'warn');
    badge.textContent = `${t('compareBadgeDiff', { n: signed(delta) })} · ${pct(delta, base.total)}`;
  }
  const note = $('#baselineNote');
  if (!base) {
    note.textContent = t('noBaseNote');
  } else {
    let text = t('baselineNote', { id: base.id || '—', total: fmt(base.total) });
    if (base.mismatch) {
      text += ' ' + t('baselineMismatch', { n: signed(base.mismatch), sum: fmt(base.sum) });
    }
    note.textContent = text;
  }
}

function alertHtml(level, body, extraClass) {
  const icon = level === 'ok'
    ? '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M5 12.5l4.2 4L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : level === 'bad'
      ? '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5v5.2M12 16.4v.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 4l8.5 15h-17L12 4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9.2v4M12 16.3v.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  return `<div class="alert ${level}${extraClass ? ' ' + extraClass : ''}">${icon}<div class="alert-body">${body}</div></div>`;
}

function renderAlerts({ base, agg, entered, delta, meta, issues, dups, ptIssues }) {
  const alerts = [];
  if (!entered) {
    alerts.push(alertHtml('info', t('alertNoRows')));
  }
  if (issues.length) {
    const first = issues.slice(0, 3).map(x => `${t('checksRow', { h: esc(x.row.hang ?? '?') })}: ${esc(x.issue.text)}`).join('<br>');
    alerts.push(alertHtml('bad', t('alertIssues', { n: issues.length, first }) + (issues.length > 3 ? t('alertIssuesMore', { n: issues.length - 3 }) : '')));
  }
  if (dups.length) {
    alerts.push(alertHtml('bad', t('alertDup', { list: dups.map(h => esc(h)).join(', ') })));
  }
  if (ptIssues.length) {
    const list = ptIssues.slice(0, 6)
      .map(x => `${t('checksRow', { h: esc(x.row.hang ?? '?') })} (${signed(x.pt.diff)})`)
      .join(', ');
    alerts.push(alertHtml('warn', t('alertPhucTra', { n: ptIssues.length, list: list + (ptIssues.length > 6 ? '…' : '') }), 'pt'));
  }
  if (entered && base) {
    if (delta !== 0) {
      const msg = t('alertMsgDiff', { dt: fmt(agg.dt), base: fmt(base.total), d: signed(delta), p: pct(delta, base.total) });
      alerts.push(meta.done
        ? alertHtml('bad', t('alertDoneDiff', { msg }))
        : alertHtml('warn', t('alertTempDiff', { msg }), 'alert-cta'));
    } else {
      alerts.push(alertHtml('ok', t('alertMatch', { n: fmt(base.total) })));
    }
    if (base.mismatch) {
      alerts.push(alertHtml('warn', t('alertBaseMismatch', { n: signed(base.mismatch), total: fmt(base.total), sum: fmt(base.sum) })));
    }
  }
  if (entered && !base) {
    alerts.push(alertHtml('info', t('alertNoBase')));
  }
  if (entered && !meta.done && !issues.length && !dups.length && (!base || delta === 0)) {
    alerts.push(alertHtml('info', t('alertAllOk')));
  }
  $('#lotAlerts').innerHTML = alerts.join('');
}

function renderChecks({ key, base, agg, entered, delta, meta, issues, dups, rows, ptIssues }) {
  const items = [];
  const rowCount = entered;
  items.push(`<li class="check-item info">${t('checksTotalLine', { n: rowCount, dt: fmt(agg.dt) })}</li>`);
  if (!rowCount) {
    items.push(`<li class="check-item">${t('checksNoData')}</li>`);
  } else {
    items.push(issues.length
      ? `<li class="check-item bad"><b>${t('checksIssueCount', { n: issues.length })}</b> ${issues.slice(0, 6).map(x => t('checksRow', { h: esc(x.row.hang ?? '?') })).join(', ')}${issues.length > 6 ? '…' : ''}</li>`
      : `<li class="check-item ok">${t('checksAllOk')}</li>`);
    items.push(dups.length
      ? `<li class="check-item bad">${t('checksDup', { list: dups.map(h => esc(h)).join(', ') })}</li>`
      : `<li class="check-item ok">${t('checksNoDup')}</li>`);
    if (hasPhucTra(key)) {
      if (ptIssues.length) {
        const list = ptIssues.slice(0, 8)
          .map(x => `${esc(x.row.hang ?? '?')} (${signed(x.pt.diff)})`)
          .join(', ');
        items.push(`<li class="check-item pt">${t('checksPhucTra', { n: ptIssues.length, list: list + (ptIssues.length > 8 ? '…' : '') })}</li>`);
      } else {
        items.push(`<li class="check-item ok">${t('checksPhucTraOk')}</li>`);
      }
    } else {
      items.push(`<li class="check-item info">${t('checksPhucTraNoData')}</li>`);
    }
    const missing = missingHangs(rows);
    if (missing.length) {
      const show = missing.slice(0, 12).map(h => esc(h)).join(', ');
      items.push(`<li class="check-item warn">${t('checksMissingRow', { n: missing.length, max: Math.max(...rows.filter(rowHasData).map(r => r.hang)), list: show + (missing.length > 12 ? '…' : '') })}</li>`);
    }
    if (base) {
      if (delta === 0) {
        items.push(`<li class="check-item ok">${t('checksMatchTotal', { n: fmt(base.total) })}</li>`);
      } else {
        items.push(`<li class="check-item ${meta.done ? 'bad' : 'warn'}">${t('baselineDiff', { a: fmt(agg.dt), b: fmt(base.total), d: signed(delta), p: pct(delta, base.total) })}</li>`);
      }
      if (base.mismatch) {
        items.push(`<li class="check-item warn">${t('baselineMismatch', { n: signed(base.mismatch), sum: fmt(base.sum) })}</li>`);
      }
    } else {
      items.push(`<li class="check-item warn">${t('checksNoBaseline')}</li>`);
    }
    items.push(meta.done
      ? `<li class="check-item ok">${t('checksDone')}</li>`
      : `<li class="check-item">${t('checksNotDone')}</li>`);
  }
  $('#lotChecks').innerHTML = `<h3>${t('checksTitle')}</h3><ul class="check-list">${items.join('')}</ul>`;
}

function renderHangMap(key) {
  const host = $('#lotHangMap');
  if (!host) return;
  const rows = lotRows(key);
  const entered = rows.filter(r => rowHasData(r) && Number.isInteger(r.hang));
  if (!entered.length) { host.hidden = true; host.innerHTML = ''; return; }
  const max = Math.max(...entered.map(r => r.hang));
  const byHang = new Map(entered.map(r => [r.hang, r]));
  const gaps = missingHangs(rows);
  const issues = rowIssuesOf(rows).length;
  const odd = rowOutliers(rows);
  const resume = gaps.length ? gaps[0] : max + 1;
  const chips = [];
  const cap = Math.min(max, 200);
  for (let h = 1; h <= cap; h++) {
    const row = byHang.get(h);
    if (row) {
      const bad = !!rowIssue(row);
      const oddCls = odd.has(row.uid) ? ' odd' : '';
      const pt = phucTraOf(key, row);
      const ptCls = pt && pt.warn ? ' pt' : '';
      const ptTip = pt && pt.warn ? ' · ' + t('hangChipPt', { d: signed(pt.diff) }) : '';
      chips.push(`<button class="hang-chip ${bad ? 'bad' : 'ok'}${oddCls}${ptCls}${h === resume ? ' is-next' : ''}" type="button" data-hang="${h}" data-mode="edit" title="${t('hangChipEdit', { h, st: bad ? t('hangChipDiff') : t('hangChipMatched') })}${ptTip}">${h}</button>`);
    } else {
      chips.push(`<button class="hang-chip gap${h === resume ? ' is-next' : ''}" type="button" data-hang="${h}" data-mode="fill" title="${t('hangChipFill', { h })}">${h}</button>`);
    }
  }
  if (!gaps.length) {
    chips.push(`<button class="hang-chip add is-next" type="button" data-hang="${resume}" data-mode="fill" title="${t('hangBtnResume', { h: resume })}">+${resume}</button>`);
  }
  const missingText = gaps.length
    ? t('hangMissing', { n: gaps.length, list: gaps.slice(0, 14).join(', ') + (gaps.length > 14 ? '…' : '') })
    : t('hangContinuous', { max });
  const badgeCls = gaps.length || issues ? 'warn' : 'good';
  const badgeText = t('hangBadge', { n: entered.length })
    + (gaps.length ? t('hangBadgeMissing', { n: gaps.length }) : '')
    + (issues ? t('hangBadgeIssues', { n: issues }) : '');
  host.hidden = false;
  host.innerHTML = `
    <div class="card-head">
      <h3>${t('hangMapTitle')}</h3>
      <span class="badge ${badgeCls}">${badgeText}</span>
    </div>
    <div class="hang-chips">${chips.join('')}</div>
    <div class="hang-map-foot">
      <span>${missingText}${t('hangHint')}</span>
      <button class="btn btn-sm" id="btnHangResume" type="button" data-hang="${resume}">${gaps.length ? t('hangBtnFill', { h: resume }) : t('hangBtnResume', { h: resume })}</button>
    </div>`;
}

function focusLotRow(uid) {
  if (!uid) return;
  const tr = document.querySelector(`#rowsBody tr[data-uid="${CSS.escape(uid)}"]`);
  if (!tr) return;
  tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const input = tr.querySelector('input[data-field="dt"]');
  if (input) {
    input.focus({ preventScroll: true });
    input.select();
  }
  tr.classList.add('is-flash');
  setTimeout(() => tr.classList.remove('is-flash'), 1500);
}

/* ============================================================
   Sự kiện trang chủ
   ============================================================ */
function setupHomeEvents() {
  $('#filters').addEventListener('click', e => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    state.filter = btn.dataset.filter;
    state.recentLot = null;
    $$('#filters .chip').forEach(ch => ch.classList.toggle('is-active', ch === btn));
    renderLotList();
  });
  $('#searchInput').addEventListener('input', e => {
    state.q = e.target.value;
    state.recentLot = null;
    renderLotList();
  });
  $('#lotList').addEventListener('click', e => {
    const row = e.target.closest('.lot-row');
    if (row) openLot(row.dataset.lot);
  });
  $$('.home-tabs .seg').forEach(btn => {
    btn.addEventListener('click', () => setHomeView(btn.dataset.homeview));
  });
  $('#mapZones').addEventListener('click', e => {
    const row = e.target.closest('.zone-row');
    if (!row) return;
    setZone(row.dataset.zone === state.zone ? null : row.dataset.zone, { scroll: true });
  });
  $('#mapCanvas').addEventListener('click', e => {
    const btn = e.target.closest('[data-openlot]');
    if (btn) openLot(btn.dataset.openlot);
  });
  $('#btnZoneAll').addEventListener('click', () => setZone(null));
  $('#btnAddLot').addEventListener('click', addCustomLot);
  $('#btnBack').addEventListener('click', () => openHome());
  $('#btnQuickHome').addEventListener('click', () => openQuick(false));
  $('#btnQuickHome2').addEventListener('click', () => openQuick(false));
  $('#btnQuickLot').addEventListener('click', () => {
    if (!state.lot) return;
    openQuick(true, resumeHang(state.lot));
  });
  $('#lotHangMap').addEventListener('click', e => {
    if (!state.lot) return;
    const resumeBtn = e.target.closest('#btnHangResume');
    if (resumeBtn) { openQuick(true, Number(resumeBtn.dataset.hang)); return; }
    const chip = e.target.closest('.hang-chip');
    if (!chip) return;
    const hang = Number(chip.dataset.hang);
    if (chip.dataset.mode === 'fill') { openQuick(true, hang); return; }
    const row = lotRows(state.lot).find(r => r.hang === hang);
    if (row) focusLotRow(row.uid);
  });
  $('#btnExportLot').addEventListener('click', () => exportLot(state.lot));
  $('#btnExportAll').addEventListener('click', exportAll);
  $('#btnToggleDone').addEventListener('click', toggleDone);

  ['huong', 'ngay', 'nguoi', 'ghiChu'].forEach(field => {
    const id = '#meta' + field.charAt(0).toUpperCase() + field.slice(1);
    $(id).addEventListener('input', e => {
      if (!state.lot) return;
      ensureLot(state.lot).meta[field] = e.target.value;
      touchLot(state.lot);
      persist();
      refreshLotDerived();
    });
  });

  $('#btnAddRow').addEventListener('click', addRow);
  $('#rowsBody').addEventListener('input', onRowInput);
  $('#rowsBody').addEventListener('keydown', onRowKeydown);
  $('#rowsBody').addEventListener('click', onRowClick);
}

function addCustomLot() {
  const name = prompt(t('addLotPrompt'));
  if (name == null) return;
  const key = name.trim();
  if (!key) return;
  if (BASE_BY_LOT.has(key) || DB.lots[key]) {
    toast(t('toastLotExists'), 'bad');
    openLot(key);
    return;
  }
  ensureLot(key).meta.custom = true;
  touchLot(key);
  persist();
  renderHome();
  openLot(key);
  toast(t('toastAddedLot', { lot: key }), 'ok');
}

function toggleDone() {
  if (!state.lot) return;
  const lot = ensureLot(state.lot);
  lot.meta.done = !lot.meta.done;
  if (lot.meta.done) {
    lot.meta.doneAt = new Date().toISOString();
    lot.meta.doneBy = lot.meta.nguoi || '';
    lot.meta.pausedAt = null;
  } else {
    lot.meta.doneAt = null;
    lot.meta.doneBy = '';
  }
  touchLot(state.lot);
  persist();
  renderLot();
  renderHome();
  if (lot.meta.done) {
    toast(t('toastDone', { lot: state.lot, time: dateTimeVN(lot.meta.doneAt) }), 'ok');
    syncNow('lot_done', state.lot);
  } else {
    toast(t('toastReopened', { lot: state.lot }), 'ok');
    scheduleSync();
  }
}

function addRow() {
  if (!state.lot) return;
  const lot = ensureLot(state.lot);
  const hangs = lot.rows.map(r => r.hang).filter(Number.isInteger);
  const next = hangs.length ? Math.max(...hangs) + 1 : 1;
  const row = { uid: uid(), hang: next, dt: null, g: null, plus: null, c: null, k1: null, k2: null, o: null };
  lot.rows.push(row);
  touchLot(state.lot);
  persist();
  rebuildRowsTable();
  refreshLotDerived();
  const tr = $(`#rowsBody tr[data-uid="${CSS.escape(row.uid)}"]`);
  if (tr) { const inp = tr.querySelector('.dt-input'); if (inp) inp.focus(); }
}

function onRowInput(e) {
  const inp = e.target.closest('input[data-field]');
  if (!inp || !state.lot) return;
  const uidVal = inp.dataset.uid;
  const row = lotRows(state.lot).find(r => r.uid === uidVal);
  if (!row) return;
  const field = inp.dataset.field;
  if (field === 'hang') {
    row.hang = inp.value.trim() === '' ? null : parseHang(inp.value);
  } else {
    row[field] = inp.value.trim() === '' ? null : parseNum(inp.value);
  }
  touchLot(state.lot);
  persist();
  refreshLotDerived();
}

function onRowKeydown(e) {
  if (e.key !== 'Enter' || !e.target.matches('input')) return;
  e.preventDefault();
  const inputs = $$('#rowsBody input');
  const idx = inputs.indexOf(e.target);
  if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
}

function onRowClick(e) {
  const btn = e.target.closest('button[data-act]');
  if (!btn || !state.lot) return;
  const row = lotRows(state.lot).find(r => r.uid === btn.dataset.uid);
  if (!row) return;
  if (btn.dataset.act === 'calc') {
    if (!rowUndo.has(row.uid)) rowUndo.set(row.uid, row.dt == null ? null : Number(row.dt));
    row.dt = rowSum(row);
    touchLot(state.lot);
    persist();
    const tr = $(`#rowsBody tr[data-uid="${CSS.escape(row.uid)}"]`);
    if (tr) {
      const dt = tr.querySelector('.dt-input');
      if (dt) dt.value = row.dt;
      const undo = tr.querySelector('.mini-btn.undo');
      if (undo) undo.hidden = false;
    }
    refreshLotDerived();
  }
  if (btn.dataset.act === 'undo') {
    if (!rowUndo.has(row.uid)) return;
    const prev = rowUndo.get(row.uid);
    rowUndo.delete(row.uid);
    row.dt = prev;
    touchLot(state.lot);
    persist();
    const tr = $(`#rowsBody tr[data-uid="${CSS.escape(row.uid)}"]`);
    if (tr) {
      const dt = tr.querySelector('.dt-input');
      if (dt) dt.value = prev == null ? '' : prev;
    }
    btn.hidden = true;
    refreshLotDerived();
  }
  if (btn.dataset.act === 'del') {
    if (rowHasData(row) && !confirm(t('confirmDelRow', { h: row.hang ?? '' }))) return;
    const lot = ensureLot(state.lot);
    lot.rows = lot.rows.filter(r => r.uid !== row.uid);
    rowUndo.delete(row.uid);
    touchLot(state.lot);
    persist();
    rebuildRowsTable();
    refreshLotDerived();
  }
}

/* ============================================================
   Nhập nhanh
   ============================================================ */
function readDrafts() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    return d && typeof d === 'object' ? d : {};
  } catch (err) { return {}; }
}
function writeDrafts(map) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(map)); } catch (err) {}
}
function clearDraft(key) {
  if (!key) return;
  const map = readDrafts();
  if (!map[key]) return;
  delete map[key];
  writeDrafts(map);
}
function clearAllDrafts() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (err) {}
}
function timeHM(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function saveQuickDraft() {
  const key = state.quickLot;
  if (!key) return;
  const cards = $$('#quickPages .qcard').map(card => {
    const vals = {};
    card.querySelectorAll('.q-input').forEach(inp => { vals[inp.dataset.field] = inp.value; });
    return { hang: card.querySelector('.q-hang').value, vals };
  });
  const hasAny = cards.some(c => Object.values(c.vals).some(v => (v || '').trim() !== ''))
    || ($('#quickNguoi').value || '').trim() !== '';
  const map = readDrafts();
  if (!hasAny) {
    if (map[key]) { delete map[key]; writeDrafts(map); }
    return;
  }
  map[key] = {
    zone: state.quickZone || '',
    ngay: $('#quickNgay').value,
    nguoi: $('#quickNguoi').value,
    cards,
    at: new Date().toISOString(),
  };
  writeDrafts(map);
}
function restoreQuickDraft(key) {
  const draft = key && readDrafts()[key];
  if (!draft) return false;
  if (draft.ngay != null) $('#quickNgay').value = draft.ngay;
  if (draft.nguoi != null) $('#quickNguoi').value = draft.nguoi;
  const cards = $$('#quickPages .qcard');
  (draft.cards || []).slice(0, cards.length).forEach((dc, i) => {
    const card = cards[i];
    if (!card) return;
    if (dc.hang != null) card.querySelector('.q-hang').value = dc.hang;
    FIELDS.forEach(f => {
      const el = card.querySelector(`.q-input[data-field="${f}"]`);
      if (el && dc.vals && dc.vals[f] != null) el.value = dc.vals[f];
    });
  });
  refreshQuickChecks();
  refreshQuickSummary();
  return true;
}

function pickDefaultQuickLot() {
  const keys = lotsKeys();
  const doing = keys.find(k => lotState(k).level === 'doing');
  if (doing) return doing;
  const empty = keys.find(k => lotState(k).level === 'empty');
  return empty || keys[0] || '';
}
function zoneOfLot(key) {
  const f = GEO_BY_LOT.get(key);
  return (f && f.properties.kv) || '';
}
function populateQuickZoneSelect() {
  const used = new Set([...GEO_BY_LOT.values()].map(f => f.properties.kv));
  const zones = ZONE_ORDER.filter(z => used.has(z));
  $('#quickZone').innerHTML = [`<option value="">${esc(qt('zoneAll'))}</option>`]
    .concat(zones.map(z => `<option value="${esc(z)}">${esc(qtf('zoneItem', { z }))}</option>`))
    .join('');
  $('#quickZone').value = state.quickZone;
  return zones;
}
function populateQuickLotSelect(zone) {
  const sel = $('#quickLot');
  const keys = lotsKeys().filter(key => !zone || zoneOfLot(key) === zone);
  sel.innerHTML = keys.map(key => {
    const st = lotState(key);
    const base = BASE_BY_LOT.get(key);
    const suffix = base ? ` · ${base.clone || ''}` : ` · ${qt('lotOther')}`;
    const done = st.level === 'done' ? ` · ${qt('lotDone')}` : '';
    return `<option value="${esc(key)}">${esc(key)}${esc(suffix)}${done}</option>`;
  }).join('');
  return keys;
}

function openQuick(fromLot, seed) {
  state.quickFrom = fromLot ? 'lot' : 'home';
  state.quickSeed = fromLot && Number.isInteger(seed) && seed > 0 ? seed : null;
  const sel = $('#quickLot');
  applyQuickLang();
  populateQuickZoneSelect();
  $('#quickZoneWrap').hidden = !!fromLot;
  if (fromLot) {
    state.quickZone = zoneOfLot(state.lot);
    $('#quickZone').value = state.quickZone;
    $('#quickLotWrap').hidden = true;
    sel.value = state.lot;
    state.quickLot = state.lot;
  } else {
    $('#quickLotWrap').hidden = false;
    if (!state.quickLot) state.quickLot = pickDefaultQuickLot();
    const zones = populateQuickZoneSelect();
    if (state.quickZone && !zones.includes(state.quickZone)) state.quickZone = '';
    if (!state.quickZone) state.quickZone = zoneOfLot(state.quickLot);
    populateQuickZoneSelect();
    const keys = populateQuickLotSelect(state.quickZone);
    sel.value = keys.includes(state.quickLot) ? state.quickLot : (keys[0] || '');
    state.quickLot = sel.value;
  }
  setQuickLot(state.quickLot, true);
  const dlg = $('#quickDialog');
  if (!dlg.open) dlg.showModal();
  setTimeout(() => {
    const first = dlg.querySelector('.qcard .dt-input');
    if (first) first.focus();
  }, 60);
}

function setQuickLot(key, resetHang) {
  if (!key) return;
  state.quickLot = key;
  const meta = lotMeta(key);
  $('#quickTitle').textContent = `${qt('title')} · ${qt('lot')} ${key}`;
  $('#quickNgay').value = meta.ngay || todayISO();
  $('#quickNguoi').value = meta.nguoi || '';
  buildQuickCards(resetHang);
  refreshQuickSummary();
  if (restoreQuickDraft(key)) {
    toast(qtf('draftRestored', { time: timeHM(readDrafts()[key].at) }), '');
  }
}

function applyQuickMode() {
  $$('#quickDialog [data-gmode]').forEach(btn => {
    btn.setAttribute('aria-pressed', String((btn.dataset.gmode === 'auto') === state.gAuto));
  });
  const note = $('#quickModeNote');
  if (note) note.textContent = qt(state.gAuto ? 'gNote' : 'gManualNote');
  const host = $('#quickPages');
  if (host) host.classList.toggle('auto-g', state.gAuto);
  $$('#quickPages .q-input[data-field="g"]').forEach(inp => {
    inp.readOnly = state.gAuto;
    inp.classList.toggle('q-auto', state.gAuto);
    inp.placeholder = state.gAuto ? qt('autoPh') : '';
    inp.title = state.gAuto ? qt('gNote') : '';
  });
}
function setGAuto(on) {
  state.gAuto = !!on;
  try { localStorage.setItem(GAUTO_KEY, state.gAuto ? '1' : '0'); } catch (err) {}
  applyQuickMode();
  refreshQuickChecks();
  refreshQuickSummary();
  saveQuickDraft();
}
function quickInputsInOrder() {
  const fields = state.gAuto
    ? ['dt', 'plus', 'c', 'k1', 'k2', 'o']
    : ['dt', 'g', 'plus', 'c', 'k1', 'k2', 'o'];
  const list = [];
  $$('#quickPages .qcard').forEach(card => {
    const hang = card.querySelector('.q-hang');
    if (hang) list.push(hang);
    fields.forEach(f => {
      const el = card.querySelector(`.q-input[data-field="${f}"]`);
      if (el) list.push(el);
    });
  });
  return list;
}
function applyQuickLang(lang) {
  if (lang) state.lang = lang === 'km' ? 'km' : 'vi';
  const dlg = $('#quickDialog');
  dlg.classList.toggle('lang-km', state.lang === 'km');
  $$('[data-quicklang]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.quicklang === state.lang));
  });
  $$('#quickDialog [data-qk]').forEach(el => {
    el.textContent = qt(el.dataset.qk);
  });
  $$('#quickDialog [data-qk-placeholder]').forEach(el => {
    el.placeholder = qt(el.dataset.qkPlaceholder);
  });
  $('#quickHint').textContent = qt('hint');
  $('#btnQuickSave').textContent = qt('save');
  $('#btnQuickSaveNext').textContent = qt('saveNext');
  $('#quickEyebrow').textContent = qt('eyebrow');
  applyQuickMode();
  if (state.quickLot) {
    $('#quickTitle').textContent = `${qt('title')} · ${qt('lot')} ${state.quickLot}`;
  } else {
    $('#quickTitle').textContent = qt('title');
  }
  if ($('#quickPages').childElementCount) {
    $$('#quickPages .qcard').forEach(card => {
      const hangLab = card.querySelector('.q-hang-i18n');
      if (hangLab) hangLab.textContent = qt('hangNo') + ' ';
      const tt = card.querySelector('.q-tt');
      if (tt) tt.textContent = qt('totalDT');
    });
    refreshQuickChecks();
    refreshQuickSummary();
  }
}

function syncLanguageUi() {
  document.documentElement.lang = state.lang;
  document.body.classList.toggle('lang-km', state.lang === 'km');
  document.title = t('appTitle');
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  const langSub = $('#menuLangSub');
  if (langSub) langSub.textContent = t(state.lang === 'km' ? 'langKm' : 'langVi');
  const langBtn = $('#btnLangToggle');
  if (langBtn) {
    langBtn.textContent = state.lang === 'km' ? t('langToVi') : t('langToKm');
    langBtn.setAttribute('aria-label', state.lang === 'km' ? t('langToggleAriaVi') : t('langToggleAriaKm'));
    langBtn.title = langBtn.getAttribute('aria-label');
  }
  applyQuickLang();
  updateSyncUi();
}

function setLang(lang) {
  state.lang = lang === 'km' ? 'km' : 'vi';
  state.langChosen = true;
  try {
    localStorage.setItem(LANG_KEY, state.lang);
    localStorage.setItem(QUICK_LANG_KEY, state.lang);
  } catch (err) {}
  const dlg = $('#langDialog');
  if (dlg && dlg.open) dlg.close();
  syncLanguageUi();
  if (state.view === 'home') renderHome();
  else if (state.lot) renderLot();
  if (state.view === 'home' && state.homeView === 'map' && mapCtx) refreshMap();
  const detailDlg = $('#detailDialog');
  if (detailDlg && detailDlg.open && state.remoteDetail) {
    fillDetailLotSelect();
    renderDetailLot();
  }
}

function maybePromptName() {
  const dlg = $('#nameDialog');
  if (!dlg || dlg.open || userName()) return;
  const langDlg = $('#langDialog');
  if (langDlg && langDlg.open) return;
  const input = $('#nameInput');
  const save = $('#btnNameSave');
  const err = $('#nameError');
  input.value = '';
  save.disabled = true;
  if (err) err.hidden = true;
  dlg.showModal();
  setTimeout(() => input.focus(), 50);
}

function saveUserName() {
  const input = $('#nameInput');
  if (!input) return;
  const name = input.value.replace(/\s+/g, ' ').trim().slice(0, 40);
  const err = $('#nameError');
  if (!name) {
    if (err) err.hidden = false;
    input.focus();
    return;
  }
  saveSyncCfg({ device: name });
  const dlg = $('#nameDialog');
  if (dlg && dlg.open) dlg.close();
  toast(t('nameSaved', { name }), 'ok');
  if (DB.updatedAt) scheduleSync();
}

function buildQuickCards() {
  const key = state.quickLot;
  const [h1, h2] = quickHangPair(key, state.quickSeed);
  $('#quickPages').innerHTML = [h1, h2].map((hang, i) => `
    <div class="qcard" data-idx="${i}">
      <div class="qcard-head">
        <div class="qhang"><span class="q-hang-i18n">${esc(qt('hangNo') + ' ')}</span><input class="q-hang" type="number" inputmode="numeric" min="1" step="1" value="${hang}" aria-label="${esc(qt('hangNo'))}"></div>
        <button class="mini-btn calc" type="button" data-act="qcalc" title="Tổng ĐT = G + (+) + C + K1 + K2 + O">=</button>
      </div>
      <div class="qgrid">
        <label class="qdt"><span class="q-tt">${esc(qt('totalDT'))}</span><input class="q-input dt-input" type="number" inputmode="numeric" min="0" step="1" data-field="dt" aria-label="${esc(qt('totalDT'))}"></label>
        <label class="q-cell-g">G<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="g" aria-label="Cây cạo"></label>
        <label>+<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="plus" aria-label="Cây cộng"></label>
        <label>C<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="c" aria-label="Cây C"></label>
        <label>K1<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="k1" aria-label="Cây K1"></label>
        <label>K2<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="k2" aria-label="Cây K2"></label>
        <label>O<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="o" aria-label="Hố trống"></label>
      </div>
      <div class="qcheck idle" data-role="check">${esc(qt('checkIdle'))}</div>
    </div>`).join('');
  applyQuickMode();
  refreshQuickChecks();
  refreshQuickSummary();
}

function readQuickCard(card) {
  const hang = parseHang(card.querySelector('.q-hang').value);
  const vals = {};
  card.querySelectorAll('.q-input').forEach(inp => {
    vals[inp.dataset.field] = inp.value.trim() === '' ? null : parseNum(inp.value);
  });
  if (state.gAuto) {
    const gEl = card.querySelector('.q-input[data-field="g"]');
    if (vals.dt != null) {
      const others = ['plus', 'c', 'k1', 'k2', 'o'].reduce((s, k) => s + (vals[k] || 0), 0);
      vals.g = vals.dt - others;
    } else {
      vals.g = null;
    }
    if (gEl) {
      gEl.value = vals.g == null ? '' : String(vals.g);
      gEl.classList.toggle('neg', vals.g != null && vals.g < 0);
    }
  }
  const has = FIELDS.some(k => vals[k] != null);
  const sum = FIELDS.filter(k => k !== 'dt').reduce((s, k) => s + (vals[k] || 0), 0);
  const dt = vals.dt;
  return { hang, vals, has, sum, dt, diff: dt == null ? null : dt - sum };
}

function refreshQuickChecks() {
  $$('#quickPages .qcard').forEach(card => {
    const r = readQuickCard(card);
    const check = card.querySelector('[data-role="check"]');
    const dtInput = card.querySelector('.dt-input');
    dtInput.classList.remove('bad');
    if (!r.has) {
      check.className = 'qcheck idle';
      check.innerHTML = esc(qt('checkIdle'));
    } else if (r.dt == null) {
      check.className = 'qcheck bad';
      check.innerHTML = `<span class="qc-text">${esc(qt('checkMissing'))}</span><span>${esc(qt('checkSum6'))}: ${fmt(r.sum)}</span>`;
      dtInput.classList.add('bad');
    } else if (r.diff !== 0) {
      check.className = 'qcheck bad';
      check.innerHTML = `<span class="qc-text">${esc(qt('checkDiff'))} ${signed(r.diff)}</span><span>${esc(qt('checkSum6'))}: ${fmt(r.sum)}</span>`;
      dtInput.classList.add('bad');
    } else {
      check.className = 'qcheck ok';
      check.innerHTML = `<span class="qc-text">${esc(qt('checkOk'))}</span><span>${fmt(r.dt)} ${esc(qt('unitTree'))}</span>`;
    }
  });
}

function renderQuickProgress() {
  const host = $('#quickProgress');
  if (!host) return;
  const key = state.quickLot;
  if (!key) { host.innerHTML = ''; return; }
  const rows = lotRows(key);
  const filled = [...new Set(rows.filter(rowHasData).map(r => r.hang).filter(Number.isInteger))].sort((a, b) => a - b);
  const gaps = missingHangs(rows);
  const pair = $$('#quickPages .qcard').map(c => readQuickCard(c).hang).filter(Number.isInteger);
  const bits = [];
  if (!filled.length) {
    bits.push(`<span>${esc(qt('progressNone'))}</span>`);
    if (pair.length) bits.push(`<span class="qp-next">${esc(qtf('progressStart', { h: pair[0] }))}</span>`);
  } else {
    bits.push(`<span>${esc(qtf('progressEntered', { n: filled.length }))}</span>`);
    bits.push(gaps.length
      ? `<span class="qp-gap">${esc(qtf('progressMissing', { list: gaps.slice(0, 10).join(', ') + (gaps.length > 10 ? '…' : '') }))}</span>`
      : `<span class="qp-ok">${esc(qtf('progressContinuous', { max: Math.max(...filled) }))}</span>`);
    if (pair.length) bits.push(`<span class="qp-next">${esc(qtf('progressEntering', { list: pair.join(', ') }))}</span>`);
  }
  host.innerHTML = bits.join('');
}

function refreshQuickSummary() {
  const key = state.quickLot;
  if (!key) return;
  const cards = $$('#quickPages .qcard').map(readQuickCard);
  const enteredCards = cards.filter(c => c.has);
  const base = BASE_BY_LOT.get(key);
  const existing = aggregate(lotRows(key));
  const replacedHangs = new Set(enteredCards.map(c => c.hang).filter(h => h != null));
  const replacedSum = lotRows(key).filter(r => rowHasData(r) && replacedHangs.has(r.hang)).reduce((s, r) => s + (Number(r.dt) || 0), 0);
  const addSum = enteredCards.reduce((s, c) => s + (c.dt || 0), 0);
  const projected = existing.dt - replacedSum + addSum;
  let html = `<span>${esc(qt('sheetThis'))}: <b>${fmt(addSum)}</b> ${esc(qt('unitTree'))}</span><span>${esc(qt('lotAfter'))}: <b>${fmt(projected)}</b> ${esc(qt('unitTree'))}</span>`;
  if (base) {
    const d = projected - base.total;
    html += `<span>2026: <b>${fmt(base.total)}</b></span><span>${esc(qt('diffLabel'))}: <b style="color:${d === 0 ? 'var(--green)' : 'var(--red)'}">${signed(d)}</b></span>`;
  }
  html += `<span class="muted">${enteredCards.length}/2 ${esc(qt('rowsWithData'))}</span>`;
  $('#quickSummary').innerHTML = html;
  renderQuickProgress();
}

function focusNextQuickInput(current) {
  const inputs = quickInputsInOrder();
  const idx = inputs.indexOf(current);
  if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
}

function saveQuick(mode) {
  const advance = mode === 'next';
  const pause = mode === 'pause';
  const key = state.quickLot;
  if (!key) return;
  const lot = ensureLot(key);
  const cards = $$('#quickPages .qcard').map(readQuickCard);
  const entries = [];
  const errors = [];
  const mismatches = [];
  cards.forEach((c, i) => {
    if (!c.has) return;
    if (c.hang == null) { errors.push(qtf('errNoHang', { n: i + 1 })); return; }
    if (c.dt == null) mismatches.push(qtf('warnMissing', { h: c.hang, sum: fmt(c.sum) }));
    else if (c.diff !== 0) mismatches.push(qtf('warnDiff', { h: c.hang, dt: fmt(c.dt), diff: signed(c.diff) }));
    entries.push({ hang: c.hang, vals: c.vals });
  });
  if (!entries.length) { toast(qt('errEmptySheet'), 'bad'); return; }
  if (errors.length) { alert(errors.join('\n')); return; }
  const hset = new Set(entries.map(e => e.hang));
  if (hset.size !== entries.length) { alert(qt('warnDup')); return; }
  const existingHangs = new Set(lot.rows.map(r => r.hang).filter(Number.isInteger));
  const replacing = entries.filter(e => existingHangs.has(e.hang)).map(e => e.hang);
  if (replacing.length && !confirm(qtf('confirmOverwrite', { h: replacing.join(', ') }))) return;
  if (mismatches.length && !confirm(qtf('confirmMismatch', { list: mismatches.join('\n') }))) return;

  lot.meta.ngay = $('#quickNgay').value || '';
  lot.meta.nguoi = $('#quickNguoi').value.trim();
  if (pause) lot.meta.pausedAt = new Date().toISOString();
  else if (advance) lot.meta.pausedAt = null;
  entries.forEach(entry => {
    const old = lot.rows.find(r => r.hang === entry.hang);
    if (old) {
      FIELDS.forEach(k => { old[k] = entry.vals[k]; });
    } else {
      lot.rows.push({
        uid: uid(), hang: entry.hang,
        dt: entry.vals.dt, g: entry.vals.g, plus: entry.vals.plus,
        c: entry.vals.c, k1: entry.vals.k1, k2: entry.vals.k2, o: entry.vals.o,
      });
    }
  });
  touchLot(key);
  persist();
  clearDraft(key);
  if (pause) state.recentLot = key;
  const savedHangs = entries.map(e => e.hang).join(', ');
  if (pause) toast(qtf('pausedSaved', { lot: key, h: resumeHang(key) }), 'ok');
  else toast(qtf('savedRows', { h: savedHangs }), 'ok');
  renderHome();
  if (state.view === 'lot' && state.lot === key) {
    renderLot();
  }
  if (advance) {
    state.quickSeed = null;
    buildQuickCards();
    setTimeout(() => {
      const first = $('#quickPages .qcard .dt-input');
      if (first) first.focus();
    }, 40);
  } else {
    state.quickSeed = null;
    $('#quickDialog').close();
    if (pause && state.quickFrom === 'home') {
      setHomeView('list');
      setTimeout(() => {
        const row = $('#lotList .lot-row.is-recent');
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  }
}

/* ============================================================
   Xuất Excel
   ============================================================ */
function setNumberFormat(ws, decimalsByCol) {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell || typeof cell.v !== 'number') continue;
      if (decimalsByCol && Object.prototype.hasOwnProperty.call(decimalsByCol, C)) {
        cell.z = decimalsByCol[C];
      } else {
        cell.z = '#,##0';
      }
    }
  }
}
function makeSheet(aoa, merges, widths, decimalsByCol) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (merges) ws['!merges'] = merges.map(r => XLSX.utils.decode_range(r));
  if (widths) ws['!cols'] = widths.map(w => ({ wch: w }));
  setNumberFormat(ws, decimalsByCol);
  return ws;
}
function safeSheetName(name) {
  return name.replace(/[\\/?*[\]:]/g, '').slice(0, 31);
}
const XL_BORDER = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};
function xlCell(ws, r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (!ws[addr]) ws[addr] = { t: 's', v: '' };
  return ws[addr];
}
function xlStyleRow(ws, r, c0, c1, style) {
  for (let c = c0; c <= c1; c++) {
    const cell = xlCell(ws, r, c);
    cell.s = Object.assign({}, cell.s || {}, style);
  }
}
function xlFormula(ws, r, c, f, v) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr] || {};
  cell.t = typeof v === 'number' ? 'n' : 'str';
  cell.f = f;
  cell.v = v == null ? '' : v;
  cell.z = cell.z || '#,##0';
  ws[addr] = cell;
}
function styleLotSheet(ws, maxHang) {
  const center = { horizontal: 'center', vertical: 'center' };
  const headerRow = 4;
  const firstData = 5;
  const totalRow = firstData + maxHang;
  xlCell(ws, 1, 0).s = {
    font: { name: 'Times New Roman', sz: 14, bold: true, color: { rgb: '000000' } },
    alignment: center,
  };
  xlCell(ws, 2, 0).s = {
    font: { name: 'Times New Roman', sz: 14, bold: true, color: { rgb: '000000' } },
    alignment: center,
  };
  xlCell(ws, 3, 0).s = {
    font: { name: 'Times New Roman', sz: 10, italic: true, color: { rgb: '404040' } },
    alignment: center,
  };
  xlStyleRow(ws, headerRow, 0, 7, {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: center,
    border: XL_BORDER,
  });
  for (let r = firstData; r < totalRow; r++) {
    xlStyleRow(ws, r, 0, 7, {
      font: { name: 'Calibri', sz: 11, color: { rgb: '000000' } },
      alignment: center,
      border: XL_BORDER,
    });
  }
  xlStyleRow(ws, totalRow, 0, 7, {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: center,
    border: XL_BORDER,
  });
  ws['!rows'] = [];
  ws['!rows'][1] = { hpt: 17.4 };
  ws['!rows'][2] = { hpt: 17.4 };
  ws['!rows'][3] = { hpt: 16 };
  ws['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };
}
function downloadWorkbook(wb, filename) {
  try {
    XLSX.writeFile(wb, filename, { compression: true, cellStyles: true });
    toast(t('toastExportOk', { file: filename }), 'ok');
  } catch (err) {
    toast(t('toastExportFail', { err: err.message }), 'bad');
  }
}

function exportLot(key) {
  if (!key) return;
  const st = lotState(key);
  if (!st.entered.length) { toast(t('toastNoExportData'), 'bad'); return; }
  if (!st.meta.done && !confirm(t('exportConfirm'))) return;
  const { rows, agg, meta, base } = st;
  const sorted = rows.filter(rowHasData).slice().sort((a, b) => (a.hang || 0) - (b.hang || 0));
  const map = new Map(sorted.map(r => [r.hang, r]));
  const maxHang = Math.max(84, ...sorted.map(r => r.hang || 0));
  const aoa = [];
  aoa.push([]);
  aoa.push(['BẢNG TỔNG HỢP KẾT QUẢ KIỂM KÊ']);
  aoa.push([`LÔ : ${key}    Hướng lô: ${meta.huong || '…'}    Ngày KK: ${dateVN(meta.ngay)}    Người KK: ${meta.nguoi || '…'}`]);
  aoa.push([`Trạng thái: ${meta.done ? 'Hoàn tất' : 'Đang nhập'} · ${sorted.length} hàng · ${fmt(agg.dt)} cây`]);
  aoa.push(['Hàng', 'Tổng điểm trồng', 'Cây cạo', 'Cây +', 'Cây C', 'Cây K1', 'Cây K2', 'Hố trống']);
  for (let h = 1; h <= maxHang; h++) {
    const r = map.get(h);
    aoa.push(r
      ? [h, r.dt != null ? r.dt : 0, r.g != null ? r.g : 0, r.plus != null ? r.plus : 0, r.c != null ? r.c : 0, r.k1 != null ? r.k1 : 0, r.k2 != null ? r.k2 : 0, r.o != null ? r.o : 0]
      : [h, null, 0, null, null, null, null, null]);
  }
  aoa.push(['Tổng', agg.dt, agg.g, agg.plus, agg.c, agg.k1, agg.k2, agg.o]);

  const ws = makeSheet(aoa, ['A2:H2', 'A3:H3', 'A4:H4'], [8.5, 14.73, 13, 10, 10, 10, 10, 12]);
  styleLotSheet(ws, maxHang);
  for (let h = 1; h <= maxHang; h++) {
    const r = map.get(h);
    const rowNo = h + 5;
    const g = r
      ? (Number(r.dt) || 0) - ['plus', 'c', 'k1', 'k2', 'o'].reduce((s, k) => s + (Number(r[k]) || 0), 0)
      : '';
    xlFormula(ws, h + 4, 2, `IF(B${rowNo}="","",B${rowNo}-SUM(D${rowNo}:H${rowNo}))`, g);
  }
  const sumNo = maxHang + 6;
  xlFormula(ws, maxHang + 5, 2, `B${sumNo}-SUM(D${sumNo}:H${sumNo})`,
    (Number(agg.dt) || 0) - ['plus', 'c', 'k1', 'k2', 'o'].reduce((s, k) => s + (Number(agg[k]) || 0), 0));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName('Lô ' + key));

  const cmp = [
    ['ĐỐI CHIẾU VỚI KIỂM KÊ 0H NGÀY 01/01/2026'],
    [`Lô ${key}`],
    [],
    ['Chỉ tiêu', '2026', '2027', 'Lệch'],
    ['Tổng điểm trồng', base ? base.total : '', agg.dt, base ? agg.dt - base.total : ''],
    ['Cây cạo (G)', base ? base.g : '', agg.g, base ? agg.g - base.g : ''],
    ['Cây +', base ? base.plus : '', agg.plus, base ? agg.plus - base.plus : ''],
    ['Cây C', base ? base.c : '', agg.c, base ? agg.c - base.c : ''],
    ['Cây K1', base ? base.k1 : '', agg.k1, base ? agg.k1 - base.k1 : ''],
    ['Cây K2', base ? base.k2 : '', agg.k2, base ? agg.k2 - base.k2 : ''],
    ['Hố trống (O)', base ? base.o : '', agg.o, base ? agg.o - base.o : ''],
    [],
    ['CẢNH BÁO'],
  ];
  const issues = rowIssuesOf(rows);
  const dups = findDuplicates(rows);
  const ptIssues = phucTraIssues(key);
  if (!issues.length && !dups.length && !ptIssues.length) {
    cmp.push(['Không có lỗi tổng hàng hoặc hàng trùng.']);
  } else {
    issues.forEach(x => cmp.push([`Hàng ${x.row.hang ?? '?'}`, issueTextVN(x.row)]));
    if (dups.length) cmp.push(['Hàng trùng', dups.join(', ')]);
    ptIssues.forEach(x => cmp.push([
      `Phúc tra hàng ${x.row.hang ?? '?'}`,
      `2026: ${x.pt.ref} · 2027: ${x.row.dt} · lệch ${signed(x.pt.diff)} (≥2 cây — cần kiểm tra lại)`,
    ]));
  }
  if (base && base.mismatch) cmp.push(['Baseline 2026', `File gốc tự lệch ${base.mismatch} cây giữa tổng và 6 cột.`]);
  const ws2 = makeSheet(cmp, ['A1:D1'], [22, 16, 16, 16]);
  const gCalc = (Number(agg.dt) || 0) - ['plus', 'c', 'k1', 'k2', 'o'].reduce((s, k) => s + (Number(agg[k]) || 0), 0);
  xlFormula(ws2, 5, 2, 'C5-SUM(C7:C11)', gCalc);
  if (base) xlFormula(ws2, 5, 3, 'C6-B6', gCalc - (Number(base.g) || 0));
  XLSX.utils.book_append_sheet(wb, ws2, 'Đối chiếu 2026');

  downloadWorkbook(wb, `KK2027_Lo_${key.replace(/[^\w\-]+/g, '_')}.xlsx`);
}

function exportAll() {
  const keys = lotsKeys();
  let any = false;
  const summary = [
    ['VƯƠNG QUỐC CAMPUCHIA', '', '', '', '', '', '', '', 'Dân tộc - Tôn giáo - Quốc vương', '', '', '', '', '', ''],
    ['CRCK2 APHIVATH', '', '', '', '', '', '', '', `Kampong Thom, ngày ${todayVNText()}`, '', '', '', '', '', ''],
    ['CAOUTCHOUC CO.,LTD', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Đội sản xuất số 2', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['BẢNG TỔNG HỢP KẾT QUẢ KIỂM KÊ VƯỜN CÂY 0H NGÀY 01/01/2027', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['(Đính kèm thông báo số: …/TB-CRCK ngày …/…/2026)', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['STT', 'ID lô', 'Đội', 'Lô', 'Năm trồng', 'Tuổi cạo', 'Giống', 'Diện tích (ha)', 'Tổng số cây KK', 'Cây cạo 1.1.2027 (cây G)', 'Cây cạo 1.5.2027 (cây +)', 'Cây chưa cạo 2027 (cây C)', 'Cây KMC 2027 (cây K1)', 'Cây không phát triển 2027 (cây K2)', 'Hố trống 2027 (O)'],
  ];
  const total = { area: 0, dt: 0, g: 0, plus: 0, c: 0, k1: 0, k2: 0, o: 0 };
  keys.forEach((key, idx) => {
    const base = BASE_BY_LOT.get(key);
    const st = lotState(key);
    const has = st.entered.length > 0;
    if (has) any = true;
    const age = base && base.age != null ? base.age + 1 : '';
    summary.push([
      idx + 1,
      base ? base.id : '',
      base ? base.doi : 2,
      key,
      base ? base.year : '',
      age,
      base ? base.clone : '',
      base ? base.area : '',
      has ? st.agg.dt : '',
      has ? st.agg.g : '',
      has ? st.agg.plus : '',
      has ? st.agg.c : '',
      has ? st.agg.k1 : '',
      has ? st.agg.k2 : '',
      has ? st.agg.o : '',
    ]);
    if (base) total.area += Number(base.area) || 0;
    if (has) {
      total.dt += st.agg.dt; total.g += st.agg.g; total.plus += st.agg.plus;
      total.c += st.agg.c; total.k1 += st.agg.k1; total.k2 += st.agg.k2; total.o += st.agg.o;
    }
  });
  summary.push(['Tổng cộng', '', '', '', '', '', '', total.area, total.dt, total.g, total.plus, total.c, total.k1, total.k2, total.o]);
  summary.push([]);
  summary.push(['LẬP BIỂU', '', '', '', '', '', '', '', '', 'ĐỘI TRƯỞNG', '', '', '', '', '']);

  if (!any) { toast(t('toastNoExportAll'), 'bad'); return; }

  const ws = makeSheet(
    summary,
    ['A1:H1', 'I1:O1', 'A2:H2', 'I2:O2', 'A3:H3', 'A6:O6', 'A7:O7'],
    [6, 20, 6, 9, 10, 8, 10, 11, 14, 15, 14, 15, 15, 17, 13],
    { 7: '#,##0.00' }
  );
  keys.forEach((key, idx) => {
    const st = lotState(key);
    const rowNo = 10 + idx;
    const g = st.entered.length
      ? st.agg.dt - (st.agg.plus + st.agg.c + st.agg.k1 + st.agg.k2 + st.agg.o)
      : '';
    xlFormula(ws, 9 + idx, 9, `IF(I${rowNo}="","",I${rowNo}-SUM(K${rowNo}:O${rowNo}))`, g);
  });
  const totalNo = 10 + keys.length;
  xlFormula(ws, 9 + keys.length, 9, `I${totalNo}-SUM(K${totalNo}:O${totalNo})`,
    total.dt - (total.plus + total.c + total.k1 + total.k2 + total.o));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tổng hợp');

  const check = [['STT', 'Lô', 'Mức độ', 'Nội dung', '2026', '2027', 'Lệch']];
  let checkNo = 0;
  keys.forEach(key => {
    const st = lotState(key);
    if (!st.entered.length) return;
    st.issues.forEach(x => {
      checkNo += 1;
      check.push([checkNo, key, 'Lỗi', `Hàng ${x.row.hang ?? '?'}: ${issueTextVN(x.row)}`, st.base ? st.base.total : '', st.agg.dt, st.base ? st.agg.dt - st.base.total : '']);
    });
    st.dups.forEach(h => {
      checkNo += 1;
      check.push([checkNo, key, 'Lỗi', `Hàng trùng số ${h}`, st.base ? st.base.total : '', st.agg.dt, st.base ? st.agg.dt - st.base.total : '']);
    });
    st.ptIssues.forEach(x => {
      checkNo += 1;
      check.push([checkNo, key, 'Phúc tra', `Hàng ${x.row.hang ?? '?'}: 2026 ${x.pt.ref} · 2027 ${x.row.dt} · lệch ${signed(x.pt.diff)} (≥2 cây — cần kiểm tra lại)`, x.pt.ref, x.row.dt, x.pt.diff]);
    });
    if (st.base && st.delta !== 0) {
      checkNo += 1;
      check.push([checkNo, key, st.meta.done ? 'Cảnh báo' : 'Tạm tính', `Tổng 2027 lệch 2026 ${signed(st.delta)} cây (${pct(st.delta, st.base.total)})`, st.base.total, st.agg.dt, st.delta]);
    }
    if (st.base && st.base.mismatch) {
      checkNo += 1;
      check.push([checkNo, key, 'Baseline', `File 2026 tự lệch ${signed(st.base.mismatch)} cây giữa tổng và 6 cột`, st.base.total, st.agg.dt, st.delta]);
    }
    if (!st.meta.done) {
      checkNo += 1;
      check.push([checkNo, key, 'Thông tin', 'Chưa đánh dấu hoàn tất', st.base ? st.base.total : '', st.agg.dt, st.base ? st.agg.dt - st.base.total : '']);
    }
  });
  if (check.length === 1) check.push([1, '', '', 'Không có cảnh báo', '', '', '']);
  const wsCheck = makeSheet(check, null, [6, 9, 12, 60, 12, 12, 12]);
  XLSX.utils.book_append_sheet(wb, wsCheck, 'Kiểm tra');

  const progress = [['STT', 'Lô', 'ID lô', 'Đội', 'Diện tích (ha)', 'Số hàng đã nhập', 'Tổng ĐT 2027', 'Tổng 2026', 'Lệch', '% lệch', 'Hoàn tất', 'Hoàn tất lúc', 'Trạng thái', 'Lỗi hàng', 'Phúc tra lệch']];
  keys.forEach((key, idx) => {
    const st = lotState(key);
    const base = st.base;
    const has = st.entered.length > 0;
    const delta = base && has ? st.agg.dt - base.total : '';
    const ratio = base && has && base.total ? (st.agg.dt - base.total) / base.total : '';
    progress.push([
      idx + 1, key, base ? base.id : '', base ? base.doi : 2, base ? base.area : '',
      st.entered.length, has ? st.agg.dt : '', base ? base.total : '',
      delta, ratio, st.meta.done ? 'Có' : 'Không',
      st.meta.done && st.meta.doneAt ? dateTimeVN(st.meta.doneAt) : '',
      statusInfo(st).label, st.issues.length + st.dups.length, st.ptIssues.length,
    ]);
  });
  const wsProgress = makeSheet(progress, null, [6, 9, 20, 6, 11, 12, 14, 12, 10, 9, 9, 18, 15, 9, 11], { 4: '#,##0.00', 9: '0.00%' });
  XLSX.utils.book_append_sheet(wb, wsProgress, 'Tiến độ');

  downloadWorkbook(wb, `KK2027_TongHop_D2_${todayISO().replace(/-/g, '')}.xlsx`);
}

/* ============================================================
   Sao lưu / phục hồi / demo
   ============================================================ */
function backupJSON() {
  const payload = {
    app: 'crck2-kiem-ke-2027',
    version: 1,
    exportedAt: new Date().toISOString(),
    baselineYear: 2026,
    data: DB,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KK2027_backup_${todayISO().replace(/-/g, '')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast(t('backupOk'), 'ok');
}
function restoreJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed && parsed.data && parsed.data.lots ? parsed.data : parsed;
      if (!data || typeof data !== 'object' || !data.lots || typeof data.lots !== 'object') {
        throw new Error(t('restoreBadFile'));
      }
      if (!confirm(t('restoreConfirm'))) return;
      DB = { version: 1, lots: data.lots, updatedAt: data.updatedAt || new Date().toISOString() };
      clearAllDrafts();
      persist();
      renderHome();
      if (state.view === 'lot') renderLot();
      toast(t('restoreOk'), 'ok');
    } catch (err) {
      alert(t('restoreFail', { err: err.message }));
    }
  };
  reader.readAsText(file, 'utf-8');
}
function demoLot250() {
  const key = '250';
  const lot = ensureLot(key);
  if (lot.rows.some(rowHasData) && !confirm(t('demoConfirm'))) return;
  const demo = [
    { hang: 1, dt: 165, g: 123, plus: 0, c: 0, k1: 32, k2: 6, o: 4 },
    { hang: 2, dt: 161, g: 130, plus: 1, c: 0, k1: 26, k2: 3, o: 1 },
  ];
  demo.forEach(v => {
    const old = lot.rows.find(r => r.hang === v.hang);
    if (old) Object.assign(old, v);
    else lot.rows.push({ uid: uid(), ...v });
  });
  lot.meta.ngay = '2026-11-14';
  lot.meta.nguoi = 'Duy';
  lot.meta.huong = 'ĐN';
  persist();
  renderHome();
  openLot(key);
  toast(t('demoDone'), 'ok');
}
function resetAll() {
  if (!confirm(t('resetConfirm'))) return;
  const typed = prompt(t('resetPrompt'));
  if (typed !== 'XOA') { toast(t('resetCancel'), ''); return; }
  DB = emptyDB();
  clearAllDrafts();
  persist();
  renderHome();
  if (state.view === 'lot') openHome(false);
  toast(t('resetDone'), 'ok');
}

/* ============================================================
   Đồng bộ Google Sheets + mail báo cáo
   ============================================================ */
function buildSyncPayload(reason, lotKey) {
  const keys = lotsKeys();
  const lots = keys.map(key => {
    const st = lotState(key);
    const f = GEO_BY_LOT.get(key);
    return {
      lot: key,
      id: st.base ? st.base.id : '',
      doi: st.base ? st.base.doi : 2,
      kv: f ? f.properties.kv : '',
      area: st.base ? st.base.area : '',
      clone: st.base ? st.base.clone : '',
      year: st.base ? st.base.year : '',
      status: st.level,
      statusLabel: statusLabelVN(st),
      entered: st.entered.length,
      dt: st.entered.length ? st.agg.dt : null,
      baseTotal: st.base ? st.base.total : null,
      delta: st.base && st.entered.length ? st.delta : null,
      done: !!st.meta.done,
      doneAt: st.meta.doneAt || null,
      doneBy: st.meta.doneBy || '',
      updatedAt: (DB.lots[key] && DB.lots[key].updatedAt) || st.meta.doneAt || null,
      nguoi: st.meta.nguoi || '',
      ngay: st.meta.ngay || '',
      huong: st.meta.huong || '',
      ghiChu: st.meta.ghiChu || '',
      rows: st.entered.map(r => {
        const pt = phucTraOf(key, r);
        return {
          uid: r.uid, hang: r.hang, dt: r.dt, g: r.g, plus: r.plus, c: r.c, k1: r.k1, k2: r.k2, o: r.o,
          pt: pt ? pt.ref : null, pd: pt ? pt.diff : null,
        };
      }),
    };
  });
  const entered = lots.filter(l => l.entered > 0).length;
  const done = lots.filter(l => l.done).length;
  const warn = lots.filter(l => l.status === 'warn').length;
  const rows = lots.reduce((s, l) => s + l.entered, 0);
  const dt = lots.reduce((s, l) => s + (l.dt || 0), 0);
  const baselineTotal = BASELINE.reduce((s, l) => s + (l.total || 0), 0);
  const zones = ZONE_ORDER.map(kv => {
    const s = zoneStats(kv);
    return {
      kv, total: s.total, done: s.done.length, doing: s.doing.length,
      warn: s.warn.length, empty: s.empty.length,
      emptyLots: s.empty, warnLots: s.warn,
    };
  });
  const eventLot = reason === 'lot_done' && lotKey ? lots.find(l => l.lot === lotKey) : null;
  return {
    app: 'crck2-kiem-ke-2027',
    version: 3,
    device: (syncCfg.device || '').trim(),
    sentAt: new Date().toISOString(),
    today: todayISO(),
    reason,
    event: eventLot ? { type: 'lot_done', lot: eventLot.lot, label: eventLot.statusLabel } : null,
    totals: { entered, done, warn, rows, dt, baselineTotal, delta: dt - baselineTotal },
    zones,
    lots,
  };
}

async function postSync(payload) {
  const url = syncCfg.url.trim();
  if (!url) throw new Error('Chưa cấu hình URL Apps Script.');
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  };
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (err && err.name === 'TypeError' && navigator.onLine !== false) {
      // CORS chặn đọc phản hồi: request vẫn có thể đã tới Apps Script.
      // Không gửi lại để tránh trùng mail.
      return { ok: true, uncertain: true };
    }
    throw err;
  }
  if (!res.ok) throw new Error(t('syncHttpError', { code: res.status }));
  let data = null;
  try { data = await res.json(); } catch (err) {}
  if (data && data.ok === false) throw new Error(data.error || t('syncAppError', { err: '' }));
  return data || { ok: true };
}

function updateSyncUi(message) {
  const status = $('#syncStatus');
  const sub = $('#menuSyncSub');
  const connected = !!syncCfg.url;
  if (sub) {
    sub.textContent = !connected
      ? t('syncStatusNone')
      : syncCfg.lastSyncAt
        ? t('syncStatusConnected', { time: dateTimeVN(syncCfg.lastSyncAt) })
        : t('syncStatusConfigured');
  }
  if (!status) return;
  if (message) {
    status.textContent = message;
    status.className = 'sync-status busy';
    return;
  }
  status.className = 'sync-status' + (syncCfg.lastResult.startsWith('Lỗi') ? ' bad' : connected ? ' ok' : '');
  if (!connected) {
    status.textContent = t('syncStatusHelp');
  } else if (syncCfg.lastSyncAt) {
    status.textContent = `${t('syncLast', { time: dateTimeVN(syncCfg.lastSyncAt) })} · ${syncCfg.lastResult || 'OK'}`;
  } else {
    status.textContent = t('syncStatusNotSynced');
  }
}

function scheduleSync() {
  if (!syncCfg.url || !syncCfg.enabled) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow('auto'), 5000);
}

async function syncNow(reason = 'manual', lotKey = null) {
  if (!syncCfg.url) {
    if (reason !== 'auto') {
      toast(t('syncNoUrl'), 'bad');
    }
    return;
  }
  if (reason === 'auto' && !syncCfg.enabled) return;
  if (syncBusy) {
    if (reason !== 'auto') {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => syncNow(reason, lotKey), 1500);
    }
    return;
  }
  clearTimeout(syncTimer);
  syncBusy = true;
  updateSyncUi(t('syncSending'));
  try {
    const payload = buildSyncPayload(reason, lotKey);
    const res = await postSync(payload);
    saveSyncCfg({
      lastSyncAt: new Date().toISOString(),
      lastResult: res && res.uncertain
        ? t('syncNoResponse')
        : res && res.sheetUrl ? 'OK · ' + res.sheetUrl : 'OK',
    });
    if (res && res.uncertain) {
      toast(t('syncNoResponseToast'), '');
      return;
    }
    if (reason === 'test') {
      toast(res && res.mail ? t('syncTestOkMail') : t('syncTestOkSheet'), 'ok');
    } else if (reason === 'lot_done') {
      toast(res && res.mail ? t('syncLotMail', { lot: lotKey }) : t('syncLotSheet', { lot: lotKey }), 'ok');
    } else if (reason === 'manual') {
      toast(res && res.sheetUrl ? t('syncOkUrl') : t('syncOk'), 'ok');
    }
  } catch (err) {
    saveSyncCfg({ lastResult: 'Lỗi: ' + err.message });
    if (reason !== 'auto') toast(t('syncErrorToast', { err: err.message }), 'bad');
  } finally {
    syncBusy = false;
    updateSyncUi();
  }
}

function openSyncDialog() {
  const dlg = $('#syncDialog');
  if (!dlg) return;
  $('#syncUrl').value = syncCfg.url || '';
  const deviceEl = $('#syncDevice');
  if (deviceEl) deviceEl.value = syncCfg.device || '';
  $('#syncEnabled').checked = syncCfg.enabled;
  updateSyncUi();
  updateRemoteUi();
  dlg.showModal();
}

let remoteBusy = false;
let remoteFetched = !!(state.remote && state.remote.at);
function remoteCounts() {
  let doing = 0;
  let done = 0;
  Object.keys(state.remote.lots || {}).forEach(key => {
    const r = state.remote.lots[key];
    if (!r || (!r.done && !(r.entered > 0))) return;
    if (r.done) done += 1;
    else doing += 1;
  });
  return { doing, done };
}
function updateRemoteUi(message) {
  const el = $('#remoteStatus');
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.className = 'sync-status busy';
    return;
  }
  const c = remoteCounts();
  if (!c.doing && !c.done) {
    el.textContent = remoteFetched ? t('remoteEmpty') : t('remoteNone');
    el.className = remoteFetched ? 'sync-status ok' : 'sync-status';
    return;
  }
  el.textContent = t('remoteSummary', {
    doing: c.doing,
    done: c.done,
    time: state.remote.at ? dateTimeVN(state.remote.at) : '—',
  });
  el.className = 'sync-status ok';
}
async function pullRemote(manual) {
  if (!syncCfg.url) {
    if (manual) toast(t('syncNoUrl'), 'bad');
    updateRemoteUi();
    return;
  }
  if (remoteBusy) return;
  remoteBusy = true;
  if (manual) updateRemoteUi(t('remotePulling'));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const u = syncCfg.url.trim();
    const res = await fetch(u + (u.indexOf('?') >= 0 ? '&' : '?') + 'action=progress', {
      redirect: 'follow',
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(t('syncHttpError', { code: res.status }));
    const data = await res.json();
    if (!data || data.ok === false) throw new Error((data && data.error) || t('syncAppError', { err: '' }));
    if (!Array.isArray(data.lots)) throw new Error(t('remoteOldScript'));
    const lots = {};
    (data.lots || []).forEach(l => {
      if (!l || !l.lot) return;
      const entered = Number(l.entered) || 0;
      const done = !!l.done;
      if (!entered && !done) return;
      lots[l.lot] = {
        status: l.status === 'done' || l.status === 'doing' || l.status === 'warn' ? l.status : (done ? 'done' : 'doing'),
        entered,
        done,
        dt: l.dt == null ? null : Number(l.dt),
        delta: l.delta == null ? null : Number(l.delta),
        doneAt: l.doneAt || '',
        nguoi: l.nguoi || '',
        updatedAt: l.updatedAt || '',
        updatedAtDisplay: l.updatedAtDisplay || '',
      };
    });
    state.remote = { at: data.atIso || data.at || new Date().toISOString(), lots };
    remoteFetched = true;
    try { localStorage.setItem(REMOTE_KEY, JSON.stringify(state.remote)); } catch (err) {}
    if (mapCtx) {
      applyZoneStyles();
      renderZones();
    }
    if (manual) toast(t('remotePulled', { n: Object.keys(lots).length }), 'ok');
  } catch (err) {
    if (manual) toast(t('remotePullFail', { err: err.message }), 'bad');
  } finally {
    clearTimeout(timer);
    remoteBusy = false;
    updateRemoteUi();
  }
}

let detailBusy = false;
const DETAIL_STATUS_KM = {
  'Thiếu tổng ĐT': 'ខ្វះសរុប',
  'Lệch tổng': 'សរុបមិនត្រូវ',
  'Thiếu số hàng': 'ខ្វះលេខជួរ',
  'Trùng hàng': 'ជួរស្ទួន',
  'Phúc tra ≥2': 'ផ្ទៀងផ្ទាត់ ≥2',
};

function detailStatusText(status) {
  const s = String(status || '');
  if (!s) return '—';
  if (state.lang !== 'km') return s;
  return s.split('; ').map(part => DETAIL_STATUS_KM[part] || part).join(' · ');
}

function detailCell(v) {
  if (v === '' || v == null) return '—';
  const n = Number(v);
  return Number.isFinite(n) ? fmt(n) : '—';
}

function setDetailStatus(text, bad) {
  const el = $('#detailStatusLine');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'muted' + (bad ? ' bad' : '');
}

function detailLotList() {
  const lots = (state.remoteDetail && Array.isArray(state.remoteDetail.lots)) ? state.remoteDetail.lots.slice() : [];
  return lots.sort((a, b) => String(a.lot).localeCompare(String(b.lot), 'vi', { numeric: true }));
}

function fillDetailLotSelect() {
  const sel = $('#detailLot');
  if (!sel) return;
  const lots = detailLotList();
  sel.innerHTML = lots.map(l => `<option value="${esc(l.lot)}">${esc(t('detailOption', { lot: l.lot, n: (l.rows || []).length }))}</option>`).join('');
  const current = [state.detailLot, state.lot].find(key => key && lots.some(l => l.lot === key)) || (lots[0] && lots[0].lot) || '';
  sel.value = current;
  sel.disabled = !lots.length;
  state.detailLot = current || null;
}

function renderDetailLot() {
  const lot = detailLotList().find(l => l.lot === state.detailLot);
  const rows = (lot && Array.isArray(lot.rows)) ? lot.rows : [];
  const body = $('#detailBody');
  const empty = $('#detailEmpty');
  if (!body || !empty) return;

  const sums = { dt: 0, g: 0, plus: 0, c: 0, k1: 0, k2: 0, o: 0, pt: 0, pd: 0 };
  let warn = 0;
  body.innerHTML = rows.map(r => {
    FIELDS.forEach(k => { sums[k] += Number(r[k]) || 0; });
    sums.pt += Number(r.pt) || 0;
    sums.pd += Number(r.pd) || 0;
    const status = String(r.status || '');
    const isWarn = !!status && status !== 'OK';
    if (isWarn) warn += 1;
    const cls = isWarn ? (status.indexOf('Phúc tra') >= 0 ? 'detail-pt' : 'detail-warn') : '';
    const pdVal = r.pd === '' || r.pd == null ? '—' : signed(r.pd);
    const pdCls = r.pd !== '' && r.pd != null && Math.abs(Number(r.pd)) >= PHUC_TRA_MIN ? ' class="pd-warn"' : '';
    return `<tr class="${cls}">
      <td>${r.hang == null ? '—' : esc(r.hang)}</td>
      <td>${detailCell(r.dt)}</td>
      <td>${detailCell(r.g)}</td>
      <td>${detailCell(r.plus)}</td>
      <td>${detailCell(r.c)}</td>
      <td>${detailCell(r.k1)}</td>
      <td>${detailCell(r.k2)}</td>
      <td>${detailCell(r.o)}</td>
      <td>${detailCell(r.pt)}</td>
      <td${pdCls}>${pdVal}</td>
      <td><span class="st ${isWarn ? 'st-warn' : 'st-ok'}">${esc(detailStatusText(status))}</span></td>
    </tr>`;
  }).join('');

  empty.hidden = rows.length > 0;
  empty.className = 'detail-empty';
  empty.textContent = t('detailEmpty');
  ['dt', 'g', 'plus', 'c', 'k1', 'k2', 'o'].forEach(k => {
    const el = $('#detailSum' + k.charAt(0).toUpperCase() + k.slice(1));
    if (el) el.textContent = fmt(sums[k]);
  });
  const sumPt = $('#detailSumPt');
  const sumPd = $('#detailSumPd');
  if (sumPt) sumPt.textContent = rows.length ? fmt(sums.pt) : '0';
  if (sumPd) sumPd.textContent = rows.length ? signed(sums.pd) : '0';

  if (!lot) {
    setDetailStatus('');
    const box = $('#detailSummary');
    if (box) box.innerHTML = '';
    return;
  }
  setDetailStatus(t('detailUpdated', { time: dateTimeVN(lot.updatedAt || state.remoteDetail.at) }));
  const bits = [
    t('detailRowsCount', { n: `<b>${fmt(rows.length)}</b>` }),
    warn
      ? t('detailWarnCount', { n: `<b class="warn">${fmt(warn)}</b>` })
      : t('detailNoWarn'),
  ];
  if (lot.device) bits.push(t('detailDevice', { device: `<b>${esc(lot.device)}</b>` }));
  if (lot.nguoi) bits.push(t('detailNguoi', { nguoi: `<b>${esc(lot.nguoi)}</b>` }));
  const box = $('#detailSummary');
  if (box) box.innerHTML = bits.map(b => `<span>${b}</span>`).join('');
}

async function loadRemoteDetail() {
  if (detailBusy) return;
  const url = syncCfg.url.trim();
  const empty = $('#detailEmpty');
  if (!url) {
    setDetailStatus(t('syncNoUrl'), true);
    if (empty) { empty.hidden = false; empty.className = 'detail-empty bad'; empty.textContent = t('syncNoUrl'); }
    return;
  }
  detailBusy = true;
  setDetailStatus(t('detailLoading'));
  const btn = $('#btnDetailRefresh');
  if (btn) btn.disabled = true;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const u = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'action=detail';
    const res = await fetch(u, { redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(t('syncHttpError', { code: res.status }));
    const data = await res.json();
    if (!data || data.ok === false) throw new Error((data && data.error) || t('syncAppError', { err: '' }));
    if (!Array.isArray(data.lots)) throw new Error(t('remoteOldScript'));
    state.remoteDetail = { at: data.atIso || new Date().toISOString(), sheetUrl: data.sheetUrl || '', lots: data.lots };
    fillDetailLotSelect();
    renderDetailLot();
  } catch (err) {
    setDetailStatus(t('detailError', { err: err.message }), true);
    const hasOld = !!(state.remoteDetail && state.remoteDetail.lots && state.remoteDetail.lots.length);
    if (empty && !hasOld) { empty.hidden = false; empty.className = 'detail-empty bad'; empty.textContent = t('detailError', { err: err.message }); }
  } finally {
    clearTimeout(timer);
    detailBusy = false;
    if (btn) btn.disabled = false;
  }
}

async function openDetailDialog(lotKey) {
  const dlg = $('#detailDialog');
  if (!dlg) return;
  state.detailLot = lotKey || (state.view === 'lot' ? state.lot : null) || state.detailLot;
  if (!dlg.open) dlg.showModal();
  await loadRemoteDetail();
}

function syncUrlFromInput() {
  const url = $('#syncUrl').value.trim();
  if (!url) { toast(t('syncPasteFirst'), 'bad'); return null; }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(url)) {
    toast(t('syncUrlFormat'), 'bad');
    return null;
  }
  return url;
}

function setupSyncUi() {
  const dlg = $('#syncDialog');
  if (!dlg) return;
  $('#menuSync').addEventListener('click', () => { $('#menuDialog').close(); openSyncDialog(); });
  $('#btnSyncClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  $('#btnSyncSave').addEventListener('click', () => {
    const raw = $('#syncUrl').value.trim();
    if (raw && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(raw)) {
      toast(t('syncUrlFormat'), 'bad');
      return;
    }
    saveSyncCfg({ url: raw, enabled: $('#syncEnabled').checked, device: $('#syncDevice').value.trim() });
    toast(raw ? t('syncSaved') : t('syncDisabled'), 'ok');
  });
  $('#syncDevice').addEventListener('input', e => {
    saveSyncCfg({ device: e.target.value.trim().slice(0, 40) });
  });
  $('#btnSyncTest').addEventListener('click', async () => {
    const url = syncUrlFromInput();
    if (!url) return;
    saveSyncCfg({ url, enabled: $('#syncEnabled').checked, device: $('#syncDevice').value.trim() });
    await syncNow('test');
  });
  $('#btnSyncNow').addEventListener('click', async () => {
    const url = syncUrlFromInput();
    if (!url) return;
    saveSyncCfg({ url, enabled: $('#syncEnabled').checked, device: $('#syncDevice').value.trim() });
    await syncNow('manual');
  });
  $('#btnSyncPull').addEventListener('click', async () => {
    const url = syncUrlFromInput();
    if (!url) return;
    saveSyncCfg({ url, enabled: $('#syncEnabled').checked, device: $('#syncDevice').value.trim() });
    await pullRemote(true);
  });
  $('#btnCopyScript').addEventListener('click', async () => {
    try {
      const res = await fetch('./apps-script/Code.gs');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      toast(t('copyOk'), 'ok');
    } catch (err) {
      toast(t('copyFail'), 'bad');
    }
  });
  updateSyncUi();
  updateRemoteUi();
}

/* ============================================================
   Menu & dialog
   ============================================================ */
function setupDialogs() {
  const quick = $('#quickDialog');
  $('#btnQuickClose').addEventListener('click', () => quick.close());
  $$('[data-quicklang]').forEach(btn => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.quicklang);
      if (state.quickFrom === 'home') {
        populateQuickZoneSelect();
        const keys = populateQuickLotSelect(state.quickZone);
        $('#quickLot').value = keys.includes(state.quickLot) ? state.quickLot : (keys[0] || '');
      }
    });
  });
  $$('#quickDialog [data-gmode]').forEach(btn => {
    btn.addEventListener('click', () => setGAuto(btn.dataset.gmode === 'auto'));
  });
  $('#quickZone').addEventListener('change', e => {
    state.quickZone = e.target.value;
    state.quickSeed = null;
    const keys = populateQuickLotSelect(state.quickZone);
    const next = keys.includes(state.quickLot) ? state.quickLot : (keys[0] || '');
    $('#quickLot').value = next;
    setQuickLot(next, true);
    setTimeout(() => { const f = $('#quickPages .qcard .dt-input'); if (f) f.focus(); }, 40);
  });
  $('#quickLot').addEventListener('change', e => {
    state.quickSeed = null;
    setQuickLot(e.target.value, true);
    setTimeout(() => { const f = $('#quickPages .qcard .dt-input'); if (f) f.focus(); }, 40);
  });
  $('#quickPages').addEventListener('input', e => {
    if (e.target.matches('input')) {
      refreshQuickChecks();
      refreshQuickSummary();
      saveQuickDraft();
    }
  });
  $('#quickNgay').addEventListener('input', saveQuickDraft);
  $('#quickNguoi').addEventListener('input', saveQuickDraft);
  $('#quickPages').addEventListener('click', e => {
    const btn = e.target.closest('[data-act="qcalc"]');
    if (!btn) return;
    const card = btn.closest('.qcard');
    const r = readQuickCard(card);
    card.querySelector('.dt-input').value = r.sum;
    refreshQuickChecks();
    refreshQuickSummary();
    saveQuickDraft();
  });
  quick.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input')) {
      e.preventDefault();
      focusNextQuickInput(e.target);
      return;
    }
    if ((e.key === ' ' || e.code === 'Space') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.target.closest('input[type="text"], input[type="date"], textarea, select, button')) return;
      e.preventDefault();
      saveQuick('next');
    }
  });
  $('#btnQuickSave').addEventListener('click', () => saveQuick('pause'));
  $('#btnQuickSaveNext').addEventListener('click', () => saveQuick('next'));

  const menu = $('#menuDialog');
  $('#btnMenu').addEventListener('click', () => menu.showModal());
  $('#btnLangToggle').addEventListener('click', () => setLang(state.lang === 'km' ? 'vi' : 'km'));
  $('#btnMenuClose').addEventListener('click', () => menu.close());
  $('#menuLang').addEventListener('click', () => {
    menu.close();
    const dlg = $('#langDialog');
    if (dlg && !dlg.open) dlg.showModal();
  });
  $$('#langDialog [data-lang]').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
  const langDlg = $('#langDialog');
  langDlg.addEventListener('close', () => setTimeout(maybePromptName, 80));
  const nameDlg = $('#nameDialog');
  const nameInput = $('#nameInput');
  const btnNameSave = $('#btnNameSave');
  nameDlg.addEventListener('click', e => { if (e.target === nameDlg) nameDlg.close(); });
  nameDlg.addEventListener('close', () => {
    if (!userName()) toast(t('nameLaterToast'), '');
  });
  nameInput.addEventListener('input', () => {
    btnNameSave.disabled = !nameInput.value.trim();
    const err = $('#nameError');
    if (err) err.hidden = true;
  });
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.repeat && !e.isComposing) {
      e.preventDefault();
      saveUserName();
    }
  });
  btnNameSave.addEventListener('click', saveUserName);
  $('#btnNameLater').addEventListener('click', () => nameDlg.close());
  $('#menuExport').addEventListener('click', () => { menu.close(); exportAll(); });
  $('#menuBackup').addEventListener('click', () => { menu.close(); backupJSON(); });
  $('#menuRestore').addEventListener('click', () => { menu.close(); $('#fileRestore').click(); });
  $('#menuDemo').addEventListener('click', () => { menu.close(); demoLot250(); });
  $('#menuDetail').addEventListener('click', () => {
    menu.close();
    openDetailDialog(state.view === 'lot' ? state.lot : null);
  });
  $('#menuReset').addEventListener('click', () => { menu.close(); resetAll(); });
  const detailDlg = $('#detailDialog');
  $('#btnDetailLot').addEventListener('click', () => openDetailDialog(state.lot));
  $('#btnDetailClose').addEventListener('click', () => detailDlg.close());
  $('#btnDetailRefresh').addEventListener('click', () => loadRemoteDetail());
  $('#detailLot').addEventListener('change', e => {
    state.detailLot = e.target.value;
    renderDetailLot();
  });
  $('#fileRestore').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) restoreJSON(f);
    e.target.value = '';
  });
  [$('#btnBackup'), $('#btnRestore')].forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      if (idx === 0) backupJSON();
      else $('#fileRestore').click();
    });
  });
  [quick, menu, detailDlg].forEach(dlg => {
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  });
}

/* ============================================================
   PWA
   ============================================================ */
let deferredPrompt = null;
function setupPWA() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = $('#menuInstall');
    if (btn) btn.hidden = false;
  });
  const install = $('#menuInstall');
  if (install) {
    install.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      install.hidden = true;
      $('#menuDialog').close();
    });
  }
}

/* ============================================================
   Khởi động
   ============================================================ */
function init() {
  setupHomeEvents();
  setupDialogs();
  setupSyncUi();
  setupPWA();
  syncLanguageUi();
  window.addEventListener('popstate', routeFromHash);
  routeFromHash();
  if (!state.langChosen) {
    const dlg = $('#langDialog');
    if (dlg) setTimeout(() => { if (!state.langChosen) dlg.showModal(); }, 250);
  }
  setTimeout(maybePromptName, 500);
  if (syncCfg.url && DB.updatedAt && (!syncCfg.lastSyncAt || new Date(DB.updatedAt) > new Date(syncCfg.lastSyncAt))) {
    syncTimer = setTimeout(() => syncNow('auto'), 2500);
  }
  if (syncCfg.url) setTimeout(() => pullRemote(false), 1800);
}
init();

})();
