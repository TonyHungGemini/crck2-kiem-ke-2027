(() => {
'use strict';

/* ============================================================
   Hằng số & tiện ích
   ============================================================ */
const STORE_KEY = 'crck2.kk2027.v1';
const SYNC_KEY = 'crck2.kk2027.sync.v1';
const QUICK_LANG_KEY = 'crck2.kk2027.quicklang.v1';
const FIELDS = ['dt', 'g', 'plus', 'c', 'k1', 'k2', 'o'];
const CATS = [
  ['g', 'Cây cạo (G)'],
  ['plus', 'Cây +'],
  ['c', 'Cây C'],
  ['k1', 'Cây K1'],
  ['k2', 'Cây K2'],
  ['o', 'Hố trống (O)'],
];
const BASELINE = (window.KK_BASELINE && window.KK_BASELINE.lots) || [];
const BASE_BY_LOT = new Map(BASELINE.map(l => [l.lot, l]));
const BASE_ORDER = new Map(BASELINE.map((l, i) => [l.lot, i]));
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
      url: typeof d.url === 'string' ? d.url : '',
      enabled: d.enabled !== false,
      lastSyncAt: d.lastSyncAt || null,
      lastResult: d.lastResult || '',
    };
  } catch (err) {
    return { url: '', enabled: true, lastSyncAt: null, lastResult: '' };
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

function persist() {
  DB.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(DB));
  } catch (err) {
    toast('Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.', 'bad');
  }
  scheduleSync();
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
    return { level: 'bad', diff: sum, text: `thiếu Tổng ĐT (tổng 6 cột = ${fmt(sum)})` };
  }
  const dt = Number(row.dt) || 0;
  if (dt !== sum) {
    return { level: 'bad', diff: dt - sum, text: `Tổng ĐT ${fmt(dt)} ≠ tổng 6 cột ${fmt(sum)} (lệch ${signed(dt - sum)})` };
  }
  return null;
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
function lotState(key) {
  const base = BASE_BY_LOT.get(key);
  const meta = lotMeta(key);
  const rows = lotRows(key);
  const entered = rows.filter(rowHasData);
  const agg = aggregate(rows);
  const issues = rowIssuesOf(rows);
  const dups = findDuplicates(rows);
  const delta = base && entered.length ? agg.dt - base.total : null;
  const hasError = issues.length > 0 || dups.length > 0;
  let level = 'empty';
  if (entered.length) {
    if (hasError) level = 'warn';
    else if (meta.done) level = delta == null || delta === 0 ? 'done' : 'warn';
    else level = 'doing';
  }
  return { key, base, meta, rows, entered, agg, issues, dups, delta, level, hasError };
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
function readQuickLang() {
  try { return localStorage.getItem(QUICK_LANG_KEY) === 'km' ? 'km' : 'vi'; }
  catch (err) { return 'vi'; }
}
const state = {
  view: 'home', homeView: 'list', zone: null, lot: null, filter: 'all', q: '',
  quickLot: null, quickFrom: 'home', quickZone: '', quickLang: readQuickLang(), quickSeed: null,
};
const QUICK_I18N = {
  vi: {
    eyebrow: 'Nhập nhanh theo tờ', title: 'Nhập nhanh', zone: 'Khu vực', zoneAll: 'Tất cả khu vực', zoneItem: 'Khu vực {z}',
    lot: 'Lô', lotOther: 'lô khác', lotDone: 'hoàn tất',
    date: 'Ngày KK', person: 'Người KK', personPh: 'Tên người kiểm kê',
    hangNo: 'Hàng số', totalDT: 'Tổng ĐT',
    checkIdle: 'Chưa nhập', checkMissing: 'Thiếu Tổng ĐT', checkDiff: 'Lệch', checkSum6: 'tổng 6 cột',
    checkOk: 'Khớp', unitTree: 'cây', sheetThis: 'Tờ này', lotAfter: 'Lô sau lưu', diffLabel: 'Lệch',
    rowsWithData: 'hàng có số liệu', saveNext: 'Lưu & tờ tiếp', save: 'Tạm lưu', hint: 'Enter để sang ô kế tiếp.',
    pausedSaved: 'Đã tạm lưu lô {lot} · lần sau nhập tiếp từ hàng {h}.',
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
    rowsWithData: 'ជួរមានទិន្នន័យ', saveNext: 'រក្សាទុក & សន្លឹកបន្ទាប់', save: 'រក្សាទុកបណ្ដោះអាសន្ន', hint: 'Enter ដើម្បីទៅប្រអប់បន្ទាប់',
    pausedSaved: 'បានរក្សាទុកបណ្ដោះអាសន្ន ដីឡូតិ៍ {lot} · បន្តពីជួរ {h}។',
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
function qt(key) {
  const pack = QUICK_I18N[state.quickLang] || QUICK_I18N.vi;
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
      <div class="k">Lô đã nhập</div>
      <div class="v">${enteredLots}<span class="muted" style="font-size:16px">/${totalLots}</span></div>
      <div class="s">${doneLots} lô đã đánh dấu hoàn tất</div>
    </div>
    <div class="stat-card ${totalTrees ? 'good' : ''}">
      <div class="k">Tổng điểm trồng 2027</div>
      <div class="v">${fmt(totalTrees)}</div>
      <div class="s">${totalTrees ? `2026: ${fmt(baseTotal)} cây · lệch tạm ${signed(totalTrees - baseTotal)}` : `2026: ${fmt(baseTotal)} cây`}</div>
    </div>
    <div class="stat-card">
      <div class="k">Hàng đã nhập</div>
      <div class="v">${fmt(totalRows)}</div>
      <div class="s">Tổng cộng dồn trên ${enteredLots} lô</div>
    </div>
    <div class="stat-card ${warnLots ? 'warn' : ''}">
      <div class="k">Lô có cảnh báo</div>
      <div class="v">${fmt(warnLots)}</div>
      <div class="s">${doneLots} khớp 2026 · ${warnLots} cần kiểm tra</div>
    </div>`;

  renderLotList();
  if (mapCtx) {
    refreshMap();
    const panel = $('#mapPanel');
    if (panel && !panel.hidden) requestAnimationFrame(() => mapCtx.map.invalidateSize());
  }
}

function statusInfo(st) {
  if (st.level === 'empty') return { cls: 'empty', label: 'Chưa nhập', dot: '' };
  if (st.level === 'doing') return { cls: 'doing', label: st.meta.pausedAt ? 'Tạm lưu' : 'Đang nhập', dot: 'doing' };
  if (st.level === 'done') return { cls: 'done', label: st.base ? 'Khớp 2026' : 'Hoàn tất', dot: 'done' };
  if (st.hasError) return { cls: 'warn', label: 'Lỗi dữ liệu', dot: 'warn' };
  return { cls: 'warn', label: st.delta != null ? `Lệch ${signed(st.delta)}` : 'Có cảnh báo', dot: 'warn' };
}

function lotRowHtml(key) {
  const st = lotState(key);
  const base = st.base;
  const info = statusInfo(st);
  const entered = st.entered.length > 0;
  const metaBits = [];
  if (base) {
    if (base.clone) metaBits.push(base.clone);
    if (base.year) metaBits.push('trồng ' + base.year);
    if (base.area) metaBits.push(fmt2(base.area) + ' ha');
    if (base.id) metaBits.push(base.id);
  } else {
    metaBits.push('Lô ngoài danh mục');
  }
  if (st.level === 'doing' && st.meta.pausedAt) {
    metaBits.push(`tạm lưu · tiếp h.${resumeHang(key)}`);
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
    <button class="lot-row" type="button" data-lot="${esc(key)}">
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
        <span class="stat"><small>Lệch</small><b class="${deltaCls}">${deltaText}</b></span>
        <span class="stat"><small>Số hàng</small><b>${st.entered.length}</b></span>
        <span class="stat status"><small>Trạng thái</small>${pill}</span>
      </span>
    </button>`;
}

function renderLotList() {
  const q = state.q.trim().toLowerCase();
  let keys = lotsKeys();
  keys = keys.filter(key => {
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
    out[lotState(key).level].push(key);
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
    const bits = [`${s.done.length}/${s.total} xong`];
    if (s.doing.length) bits.push(`${s.doing.length} đang nhập`);
    if (s.warn.length) bits.push(`${s.warn.length} cảnh báo`);
    let miss = '';
    let missCls = '';
    if (s.empty.length) miss = `Chưa nhập ${s.empty.length}: <b>${esc(shortList(s.empty))}</b>`;
    else if (!s.warn.length) { miss = `Đã nhập đủ ${s.total}/${s.total} lô`; missCls = ' all-done'; }
    if (s.warn.length) miss += `${miss ? ' · ' : ''}Cảnh báo: <b>${esc(shortList(s.warn))}</b>`;
    return `<button class="zone-row${state.zone === zone ? ' is-active' : ''}" data-zone="${zone}" type="button">
      <span class="zone-top"><span class="zone-name">${zone}</span><span class="zone-count">${bits.join(' · ')}</span></span>
      <span class="zone-bar">${segs}</span>
      <span class="zone-miss${missCls}">${miss}</span>
    </button>`;
  }).join('');
  const doneCount = [...GEO_BY_LOT.keys()].filter(key => lotState(key).level === 'done').length;
  const badge = $('#mapBadge');
  if (badge) badge.textContent = `${doneCount}/${GEO.length} lô hoàn tất`;
  const allBtn = $('#btnZoneAll');
  if (allBtn) allBtn.hidden = !state.zone;
}

function mapPopupHtml(key) {
  const st = lotState(key);
  const base = st.base;
  const info = statusInfo(st);
  const f = GEO_BY_LOT.get(key);
  const p = f ? f.properties : {};
  const bits = [p.kv, base && base.id, base && base.clone, p.area_ha ? fmt2(p.area_ha) + ' ha' : ''].filter(Boolean);
  let delta = '—';
  let deltaCls = 'muted';
  if (base && st.entered.length) {
    delta = signed(st.delta);
    deltaCls = st.delta === 0 ? 'delta-0' : (st.meta.done ? 'delta-x' : 'delta-w');
  }
  return `<div class="map-pop">
    <h4>Lô ${esc(key)}</h4>
    <div class="map-pop-sub">${esc(bits.join(' · '))}</div>
    <span class="status-pill ${info.cls}"><span class="status-dot"></span>${esc(info.label)}</span>
    <table>
      <tr><td>2026</td><td>${base ? fmt(base.total) : '—'}</td></tr>
      <tr><td>2027</td><td>${st.entered.length ? fmt(st.agg.dt) : '—'}</td></tr>
      <tr><td>Lệch</td><td class="${deltaCls}">${delta}</td></tr>
      <tr><td>Số hàng</td><td>${st.entered.length}</td></tr>
      ${st.meta.done && st.meta.doneAt ? `<tr><td>Hoàn tất</td><td>${esc(dateTimeVN(st.meta.doneAt))}</td></tr>` : ''}
    </table>
    <button class="open-lot" data-openlot="${esc(key)}" type="button">Mở lô</button>
  </div>`;
}

function mapStyle(st) {
  const color = STATUS_COLORS[st.level] || STATUS_COLORS.empty;
  return { color, weight: 1.3, opacity: .95, fillColor: color, fillOpacity: .42 };
}

function initMap() {
  if (mapCtx) return mapCtx;
  const el = $('#mapCanvas');
  if (!window.L || !el) {
    const hint = $('#mapHint');
    if (hint) hint.textContent = 'Không tải được thư viện bản đồ.';
    return null;
  }
  if (!GEO.length) {
    const hint = $('#mapHint');
    if (hint) hint.textContent = 'Chưa có dữ liệu ranh lô.';
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
      style: () => mapStyle(lotState(key)),
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
    const base = mapStyle(lotState(key));
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

  $('#lotEyebrow').textContent = base ? `Đội ${base.doi} · ${base.id || 'chưa có ID'}` : 'Lô ngoài danh mục';
  $('#lotTitle').textContent = `Lô ${key}`;
  const doneSuffix = meta.done && meta.doneAt ? ` · Hoàn tất ${dateTimeVN(meta.doneAt)}` : '';
  const pauseSuffix = !meta.done && meta.pausedAt ? ` · Tạm lưu ${dateTimeVN(meta.pausedAt)}` : '';
  $('#lotSub').textContent = base
    ? `${base.clone || '—'} · trồng ${base.year || '—'} · ${fmt2(base.area)} ha · 2026: ${fmt(base.total)} cây${doneSuffix}${pauseSuffix}`
    : 'Không có dữ liệu baseline 2026 để đối chiếu tự động.' + doneSuffix + pauseSuffix;

  $('#metaHuong').value = meta.huong || '';
  $('#metaNgay').value = meta.ngay || '';
  $('#metaNguoi').value = meta.nguoi || '';
  $('#metaGhiChu').value = meta.ghiChu || '';

  const doneBtn = $('#btnToggleDone');
  doneBtn.textContent = meta.done ? 'Mở lại lô' : 'Đánh dấu hoàn tất';
  doneBtn.classList.toggle('btn-primary', !meta.done);
  $('#btnQuickLot').textContent = !meta.done && st.entered.length ? `Nhập tiếp h.${resumeHang(key)}` : 'Nhập nhanh';

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

function rowHtml(row) {
  const issue = rowIssue(row);
  const has = rowHasData(row);
  const sum = rowSum(row);
  let checkCls = 'empty', checkText = '—';
  if (has) {
    if (issue) {
      checkCls = 'bad';
      checkText = row.dt == null ? 'Thiếu ĐT' : 'Lệch ' + signed(Number(row.dt) - sum);
    } else {
      checkCls = 'ok';
      checkText = 'Khớp';
    }
  }
  const dtBad = issue && row.dt != null ? ' bad' : '';
  const input = (field, cls) => `<input class="${cls || ''}" type="number" inputmode="numeric" min="0" step="1"
      data-field="${field}" data-uid="${row.uid}" value="${row[field] == null ? '' : row[field]}" aria-label="${field}">`;
  return `
    <tr data-uid="${row.uid}">
      <td><input class="hang-input" type="number" inputmode="numeric" min="1" step="1" data-field="hang" data-uid="${row.uid}" value="${row.hang == null ? '' : row.hang}" aria-label="Hàng"></td>
      <td>${input('dt', 'dt-input' + dtBad)}</td>
      <td>${input('g')}</td>
      <td>${input('plus')}</td>
      <td>${input('c')}</td>
      <td>${input('k1')}</td>
      <td>${input('k2')}</td>
      <td>${input('o')}</td>
      <td class="col-check"><span class="row-check ${checkCls}">${checkText}</span></td>
      <td>
        <div class="row-tools">
          <button class="mini-btn calc" type="button" data-act="calc" data-uid="${row.uid}" title="Điền Tổng ĐT = tổng 6 cột">=</button>
          <button class="mini-btn del" type="button" data-act="del" data-uid="${row.uid}" title="Xoá hàng">
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
    body.innerHTML = `<tr><td colspan="10"><div class="empty-rows">Chưa có hàng nào. Bấm <b>Nhập nhanh</b> để nhập 2 hàng mỗi tờ, hoặc <b>+ Thêm hàng</b> để nhập thủ công.</div></td></tr>`;
    return;
  }
  body.innerHTML = rows.map(rowHtml).join('');
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
    checkNote.textContent = 'Chưa nhập';
    checkNote.className = 'muted';
  } else if (issues.length) {
    checkNote.textContent = `${issues.length} hàng lệch tổng`;
    checkNote.className = 'row-check bad';
  } else {
    checkNote.textContent = `Đã khớp ${entered.length} hàng`;
    checkNote.className = 'row-check ok';
  }
  $('#rowCountLabel').textContent = `${entered.length} hàng đã nhập`;

  // cập nhật từng dòng
  rows.forEach(row => {
    const tr = $(`#rowsBody tr[data-uid="${CSS.escape(row.uid)}"]`);
    if (!tr) return;
    const issue = rowIssue(row);
    const sum = rowSum(row);
    const dtInput = tr.querySelector('input[data-field="dt"]');
    if (dtInput) dtInput.classList.toggle('bad', !!(issue && row.dt != null));
    const hangInput = tr.querySelector('input[data-field="hang"]');
    if (hangInput) hangInput.classList.toggle('dup', row.hang != null && dupsSet.has(row.hang));
    const cell = tr.querySelector('.row-check');
    if (cell) {
      if (!rowHasData(row)) { cell.className = 'row-check empty'; cell.textContent = '—'; }
      else if (issue) { cell.className = 'row-check bad'; cell.textContent = row.dt == null ? 'Thiếu ĐT' : 'Lệch ' + signed(Number(row.dt) - sum); }
      else { cell.className = 'row-check ok'; cell.textContent = 'Khớp'; }
    }
  });

  const doneBtn = $('#btnToggleDone');
  if (doneBtn && state.view === 'lot') {
    doneBtn.textContent = meta.done ? 'Mở lại lô' : 'Đánh dấu hoàn tất';
    doneBtn.classList.toggle('btn-primary', !meta.done);
  }

  renderCompare({ base, agg, entered: entered.length, delta, meta });
  renderAlerts({ base, agg, entered: entered.length, delta, meta, issues, dups });
  renderChecks({ key, base, agg, entered: entered.length, delta, meta, issues, dups, rows });
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
    compareRow('Tổng ĐT', base ? base.total : null, has ? agg.dt : null, true, deltaCls),
    ...CATS.map(([k, label]) => compareRow(label, base ? base[k] : null, has ? agg[k] : null, false, '')),
  ];
  $('#compareBody').innerHTML = rows.join('');
  const badge = $('#compareBadge');
  if (!base) {
    badge.className = 'badge';
    badge.textContent = 'Không baseline';
  } else if (!has) {
    badge.className = 'badge';
    badge.textContent = 'Chưa nhập';
  } else if (delta === 0) {
    badge.className = 'badge good';
    badge.textContent = 'Khớp 2026';
  } else {
    badge.className = 'badge ' + (meta.done ? 'bad' : 'warn');
    badge.textContent = `Lệch ${signed(delta)} · ${pct(delta, base.total)}`;
  }
  const note = $('#baselineNote');
  if (!base) {
    note.textContent = 'Lô ngoài danh mục nên không có baseline 2026. Tool vẫn kiểm tra tổng hàng và xuất Excel bình thường.';
  } else {
    let text = `Baseline: kiểm kê 0h 01/01/2026 · ${base.id || 'không ID'} · ${fmt(base.total)} cây. Nguồn: TỔNG HỢP KIỂM KÊ 2025-2026.xlsx.`;
    if (base.mismatch) {
      text += ` Lưu ý: file 2026 có nội bộ lệch ${signed(base.mismatch)} cây (tổng 6 cột là ${fmt(base.sum)}).`;
    }
    note.textContent = text;
  }
}

function alertHtml(level, body) {
  const icon = level === 'ok'
    ? '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M5 12.5l4.2 4L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : level === 'bad'
      ? '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5v5.2M12 16.4v.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 4l8.5 15h-17L12 4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9.2v4M12 16.3v.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  return `<div class="alert ${level}">${icon}<div class="alert-body">${body}</div></div>`;
}

function renderAlerts({ base, agg, entered, delta, meta, issues, dups }) {
  const alerts = [];
  if (!entered) {
    alerts.push(alertHtml('info', '<b>Chưa nhập hàng nào.</b> Bấm <b>Nhập nhanh</b> để nhập 2 hàng mỗi tờ từ dòng cuối phiếu.'));
  }
  if (issues.length) {
    const first = issues.slice(0, 3).map(x => `Hàng ${esc(x.row.hang ?? '?')}: ${esc(x.issue.text)}`).join('<br>');
    alerts.push(alertHtml('bad', `<b>${issues.length} hàng lệch tổng.</b><br>${first}${issues.length > 3 ? `<br>… và ${issues.length - 3} hàng khác.` : ''}`));
  }
  if (dups.length) {
    alerts.push(alertHtml('bad', `<b>Hàng bị trùng số:</b> ${dups.map(h => esc(h)).join(', ')}. Mỗi hàng chỉ được nhập một lần.`));
  }
  if (entered && base) {
    if (delta !== 0) {
      const msg = `Tổng 2027 <b>${fmt(agg.dt)}</b> so với 2026 <b>${fmt(base.total)}</b> · lệch <b>${signed(delta)}</b> (${pct(delta, base.total)}).`;
      alerts.push(meta.done
        ? alertHtml('bad', `<b>Lô đã hoàn tất nhưng còn lệch.</b> ${msg}<br>Kiểm tra lại các hàng đã nhập hoặc phiếu giấy.`)
        : alertHtml('warn', `<b>Lệch tạm tính.</b> ${msg}<br>Nếu lô chưa nhập đủ hàng thì bỏ qua cảnh báo này. Khi nhập xong, đánh dấu hoàn tất để chốt.`));
    } else {
      alerts.push(alertHtml('ok', `<b>Tổng 2027 khớp 2026:</b> ${fmt(base.total)} cây.`));
    }
    if (base.mismatch) {
      alerts.push(alertHtml('warn', `<b>Baseline 2026 có nội bộ lệch ${signed(base.mismatch)} cây.</b> Tổng số cây KK là ${fmt(base.total)}, nhưng cộng 6 cột chỉ ${fmt(base.sum)}. Nên kiểm tra lại file 2026 gốc.`));
    }
  }
  if (entered && !base) {
    alerts.push(alertHtml('info', 'Lô ngoài danh mục: không có baseline 2026 để đối chiếu tổng.'));
  }
  if (entered && !meta.done && !issues.length && !dups.length && (!base || delta === 0)) {
    alerts.push(alertHtml('info', 'Dữ liệu đang khớp. Nếu đã nhập đủ, bấm <b>Đánh dấu hoàn tất</b> để chốt lô.'));
  }
  $('#lotAlerts').innerHTML = alerts.join('');
}

function renderChecks({ key, base, agg, entered, delta, meta, issues, dups, rows }) {
  const items = [];
  const rowCount = entered;
  items.push(`<li class="check-item info">Đã nhập <b>${rowCount}</b> hàng · lũy kế <b>${fmt(agg.dt)}</b> cây.</li>`);
  if (!rowCount) {
    items.push('<li class="check-item">Chưa có dữ liệu để kiểm tra.</li>');
  } else {
    items.push(issues.length
      ? `<li class="check-item bad"><b>${issues.length} hàng lệch tổng:</b> ${issues.slice(0, 6).map(x => 'hàng ' + esc(x.row.hang ?? '?')).join(', ')}${issues.length > 6 ? '…' : ''}</li>`
      : '<li class="check-item ok">Tất cả hàng đã khớp: Tổng ĐT = G + (+) + C + K1 + K2 + O.</li>');
    items.push(dups.length
      ? `<li class="check-item bad"><b>Hàng trùng:</b> ${dups.map(h => esc(h)).join(', ')}.</li>`
      : '<li class="check-item ok">Không có hàng trùng số.</li>');
    const missing = missingHangs(rows);
    if (missing.length) {
      const show = missing.slice(0, 12).map(h => esc(h)).join(', ');
      items.push(`<li class="check-item warn">Còn thiếu <b>${missing.length}</b> hàng trong dãy 1–${Math.max(...rows.filter(rowHasData).map(r => r.hang))}: ${show}${missing.length > 12 ? '…' : ''}.</li>`);
    }
    if (base) {
      if (delta === 0) {
        items.push(`<li class="check-item ok">Tổng so 2026: khớp <b>${fmt(base.total)}</b> cây.</li>`);
      } else {
        items.push(`<li class="check-item ${meta.done ? 'bad' : 'warn'}">Tổng so 2026: 2027 <b>${fmt(agg.dt)}</b> / 2026 <b>${fmt(base.total)}</b> · lệch <b>${signed(delta)}</b> (${pct(delta, base.total)}).</li>`);
      }
      if (base.mismatch) {
        items.push(`<li class="check-item warn">Baseline 2026 tự lệch <b>${signed(base.mismatch)}</b> cây (tổng 6 cột ${fmt(base.sum)}).</li>`);
      }
    } else {
      items.push('<li class="check-item warn">Lô ngoài danh mục, không có baseline 2026.</li>');
    }
    items.push(meta.done
      ? '<li class="check-item ok">Lô đã được đánh dấu hoàn tất.</li>'
      : '<li class="check-item">Lô chưa đánh dấu hoàn tất.</li>');
  }
  $('#lotChecks').innerHTML = `<h3>Kiểm tra dữ liệu</h3><ul class="check-list">${items.join('')}</ul>`;
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
  const resume = gaps.length ? gaps[0] : max + 1;
  const chips = [];
  const cap = Math.min(max, 200);
  for (let h = 1; h <= cap; h++) {
    const row = byHang.get(h);
    if (row) {
      const bad = !!rowIssue(row);
      chips.push(`<button class="hang-chip ${bad ? 'bad' : 'ok'}${h === resume ? ' is-next' : ''}" type="button" data-hang="${h}" data-mode="edit" title="Hàng ${h} ${bad ? 'lệch tổng' : 'đã khớp'} — bấm để sửa">${h}</button>`);
    } else {
      chips.push(`<button class="hang-chip gap${h === resume ? ' is-next' : ''}" type="button" data-hang="${h}" data-mode="fill" title="Hàng ${h} chưa nhập — bấm để nhập">${h}</button>`);
    }
  }
  if (!gaps.length) {
    chips.push(`<button class="hang-chip add is-next" type="button" data-hang="${resume}" data-mode="fill" title="Nhập tiếp hàng ${resume}">+${resume}</button>`);
  }
  const missingText = gaps.length
    ? `Còn thiếu <b>${gaps.length}</b> hàng: <b>${gaps.slice(0, 14).join(', ')}</b>${gaps.length > 14 ? '…' : ''}.`
    : `Đã nhập liên tục hàng 1–${max}.`;
  const badgeCls = gaps.length || issues ? 'warn' : 'good';
  const badgeText = `${entered.length} hàng${gaps.length ? ` · thiếu ${gaps.length}` : ''}${issues ? ` · ${issues} lệch` : ''}`;
  host.hidden = false;
  host.innerHTML = `
    <div class="card-head">
      <h3>Sơ đồ hàng</h3>
      <span class="badge ${badgeCls}">${badgeText}</span>
    </div>
    <div class="hang-chips">${chips.join('')}</div>
    <div class="hang-map-foot">
      <span>${missingText} Ô xanh bấm để sửa hàng; ô viền đứt bấm để nhập hàng thiếu.</span>
      <button class="btn btn-sm" id="btnHangResume" type="button" data-hang="${resume}">${gaps.length ? `Nhập hàng ${resume}` : `Nhập tiếp hàng ${resume}`}</button>
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
    $$('#filters .chip').forEach(ch => ch.classList.toggle('is-active', ch === btn));
    renderLotList();
  });
  $('#searchInput').addEventListener('input', e => {
    state.q = e.target.value;
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
  const name = prompt('Nhập số lô / tên lô mới (ví dụ: 950):');
  if (name == null) return;
  const key = name.trim();
  if (!key) return;
  if (BASE_BY_LOT.has(key) || DB.lots[key]) {
    toast('Lô này đã có trong danh sách.', 'bad');
    openLot(key);
    return;
  }
  ensureLot(key).meta.custom = true;
  persist();
  renderHome();
  openLot(key);
  toast('Đã thêm lô ngoài danh mục: ' + key, 'ok');
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
  persist();
  renderLot();
  renderHome();
  if (lot.meta.done) {
    toast(`Đã đánh dấu hoàn tất lô ${state.lot} lúc ${dateTimeVN(lot.meta.doneAt)}`, 'ok');
    syncNow('lot_done', state.lot);
  } else {
    toast('Đã mở lại lô ' + state.lot, 'ok');
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
    row.dt = rowSum(row);
    persist();
    const tr = $(`#rowsBody tr[data-uid="${CSS.escape(row.uid)}"]`);
    if (tr) { const dt = tr.querySelector('.dt-input'); if (dt) dt.value = row.dt; }
    refreshLotDerived();
  }
  if (btn.dataset.act === 'del') {
    if (rowHasData(row) && !confirm(`Xoá hàng ${row.hang ?? ''}? Dữ liệu của hàng này sẽ mất.`)) return;
    const lot = ensureLot(state.lot);
    lot.rows = lot.rows.filter(r => r.uid !== row.uid);
    persist();
    rebuildRowsTable();
    refreshLotDerived();
  }
}

/* ============================================================
   Nhập nhanh
   ============================================================ */
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
  applyQuickLang(state.quickLang);
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
}

function applyQuickLang(lang) {
  state.quickLang = lang === 'km' ? 'km' : 'vi';
  try { localStorage.setItem(QUICK_LANG_KEY, state.quickLang); } catch (err) {}
  const dlg = $('#quickDialog');
  dlg.classList.toggle('lang-km', state.quickLang === 'km');
  $$('[data-quicklang]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.quicklang === state.quickLang));
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
        <label>G<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="g" aria-label="Cây cạo"></label>
        <label>+<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="plus" aria-label="Cây cộng"></label>
        <label>C<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="c" aria-label="Cây C"></label>
        <label>K1<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="k1" aria-label="Cây K1"></label>
        <label>K2<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="k2" aria-label="Cây K2"></label>
        <label>O<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="o" aria-label="Hố trống"></label>
      </div>
      <div class="qcheck idle" data-role="check">${esc(qt('checkIdle'))}</div>
    </div>`).join('');
  refreshQuickChecks();
  refreshQuickSummary();
}

function readQuickCard(card) {
  const hang = parseHang(card.querySelector('.q-hang').value);
  const vals = {};
  card.querySelectorAll('.q-input').forEach(inp => {
    vals[inp.dataset.field] = inp.value.trim() === '' ? null : parseNum(inp.value);
  });
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
  const inputs = $$('#quickDialog .q-hang, #quickDialog .q-input');
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
  persist();
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
    toast('Đã xuất: ' + filename, 'ok');
  } catch (err) {
    toast('Không xuất được file Excel: ' + err.message, 'bad');
  }
}

function exportLot(key) {
  if (!key) return;
  const st = lotState(key);
  if (!st.entered.length) { toast('Lô chưa có dữ liệu để xuất.', 'bad'); return; }
  if (!st.meta.done && !confirm('Lô chưa được đánh dấu hoàn tất. Vẫn xuất file?')) return;
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
  if (!issues.length && !dups.length) {
    cmp.push(['Không có lỗi tổng hàng hoặc hàng trùng.']);
  } else {
    issues.forEach(x => cmp.push([`Hàng ${x.row.hang ?? '?'}`, x.issue.text]));
    if (dups.length) cmp.push(['Hàng trùng', dups.join(', ')]);
  }
  if (base && base.mismatch) cmp.push(['Baseline 2026', `File gốc tự lệch ${base.mismatch} cây giữa tổng và 6 cột.`]);
  const ws2 = makeSheet(cmp, ['A1:D1'], [22, 16, 16, 16]);
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

  if (!any) { toast('Chưa có lô nào được nhập dữ liệu.', 'bad'); return; }

  const ws = makeSheet(
    summary,
    ['A1:H1', 'I1:O1', 'A2:H2', 'I2:O2', 'A3:H3', 'A6:O6', 'A7:O7'],
    [6, 20, 6, 9, 10, 8, 10, 11, 14, 15, 14, 15, 15, 17, 13],
    { 7: '#,##0.00' }
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tổng hợp');

  const check = [['STT', 'Lô', 'Mức độ', 'Nội dung', '2026', '2027', 'Lệch']];
  let checkNo = 0;
  keys.forEach(key => {
    const st = lotState(key);
    if (!st.entered.length) return;
    st.issues.forEach(x => {
      checkNo += 1;
      check.push([checkNo, key, 'Lỗi', `Hàng ${x.row.hang ?? '?'}: ${x.issue.text}`, st.base ? st.base.total : '', st.agg.dt, st.base ? st.agg.dt - st.base.total : '']);
    });
    st.dups.forEach(h => {
      checkNo += 1;
      check.push([checkNo, key, 'Lỗi', `Hàng trùng số ${h}`, st.base ? st.base.total : '', st.agg.dt, st.base ? st.agg.dt - st.base.total : '']);
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

  const progress = [['STT', 'Lô', 'ID lô', 'Đội', 'Diện tích (ha)', 'Số hàng đã nhập', 'Tổng ĐT 2027', 'Tổng 2026', 'Lệch', '% lệch', 'Hoàn tất', 'Hoàn tất lúc', 'Trạng thái', 'Lỗi hàng']];
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
      statusInfo(st).label, st.issues.length + st.dups.length,
    ]);
  });
  const wsProgress = makeSheet(progress, null, [6, 9, 20, 6, 11, 12, 14, 12, 10, 9, 9, 18, 15, 9], { 4: '#,##0.00', 9: '0.00%' });
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
  toast('Đã tải file sao lưu JSON.', 'ok');
}
function restoreJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed && parsed.data && parsed.data.lots ? parsed.data : parsed;
      if (!data || typeof data !== 'object' || !data.lots || typeof data.lots !== 'object') {
        throw new Error('File không đúng cấu trúc.');
      }
      if (!confirm('Phục hồi sẽ ghi đè toàn bộ dữ liệu đang có. Tiếp tục?')) return;
      DB = { version: 1, lots: data.lots, updatedAt: data.updatedAt || new Date().toISOString() };
      persist();
      renderHome();
      if (state.view === 'lot') renderLot();
      toast('Đã phục hồi dữ liệu từ file.', 'ok');
    } catch (err) {
      alert('Không đọc được file: ' + err.message);
    }
  };
  reader.readAsText(file, 'utf-8');
}
function demoLot250() {
  const key = '250';
  const lot = ensureLot(key);
  if (lot.rows.some(rowHasData) && !confirm('Lô 250 đã có dữ liệu. Ghi đè hàng 1 và 2 bằng dữ liệu mẫu từ ảnh phiếu?')) return;
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
  toast('Đã điền thử 2 hàng lô 250 từ ảnh phiếu mẫu.', 'ok');
}
function resetAll() {
  if (!confirm('Xoá TOÀN BỘ dữ liệu đã nhập trên máy này? Không thể hoàn tác.')) return;
  const typed = prompt('Gõ XOA để xác nhận xoá toàn bộ:');
  if (typed !== 'XOA') { toast('Đã huỷ xoá.', ''); return; }
  DB = emptyDB();
  persist();
  renderHome();
  if (state.view === 'lot') openHome(false);
  toast('Đã xoá toàn bộ dữ liệu.', 'ok');
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
      statusLabel: statusInfo(st).label,
      entered: st.entered.length,
      dt: st.entered.length ? st.agg.dt : null,
      baseTotal: st.base ? st.base.total : null,
      delta: st.base && st.entered.length ? st.delta : null,
      done: !!st.meta.done,
      doneAt: st.meta.doneAt || null,
      doneBy: st.meta.doneBy || '',
      nguoi: st.meta.nguoi || '',
      ngay: st.meta.ngay || '',
      huong: st.meta.huong || '',
      ghiChu: st.meta.ghiChu || '',
      rows: st.entered.map(r => ({ hang: r.hang, dt: r.dt, g: r.g, plus: r.plus, c: r.c, k1: r.k1, k2: r.k2, o: r.o })),
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
    version: 2,
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
  if (!res.ok) throw new Error('Máy chủ trả về HTTP ' + res.status);
  let data = null;
  try { data = await res.json(); } catch (err) {}
  if (data && data.ok === false) throw new Error(data.error || 'Apps Script báo lỗi.');
  return data || { ok: true };
}

function updateSyncUi(message) {
  const status = $('#syncStatus');
  const sub = $('#menuSyncSub');
  const connected = !!syncCfg.url;
  if (sub) {
    sub.textContent = !connected
      ? 'Chưa kết nối'
      : syncCfg.lastSyncAt
        ? 'Đã kết nối · ' + dateTimeVN(syncCfg.lastSyncAt)
        : 'Đã cấu hình URL';
  }
  if (!status) return;
  if (message) {
    status.textContent = message;
    status.className = 'sync-status busy';
    return;
  }
  status.className = 'sync-status' + (syncCfg.lastResult.startsWith('Lỗi') ? ' bad' : connected ? ' ok' : '');
  if (!connected) {
    status.textContent = 'Chưa kết nối. Dán URL Web App bên dưới để bật đồng bộ.';
  } else if (syncCfg.lastSyncAt) {
    status.textContent = `Lần cuối: ${dateTimeVN(syncCfg.lastSyncAt)} · ${syncCfg.lastResult || 'OK'}`;
  } else {
    status.textContent = 'Đã cấu hình URL, chưa đồng bộ lần nào.';
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
      toast('Chưa cấu hình URL Apps Script trong menu Đồng bộ Google.', 'bad');
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
  updateSyncUi('Đang gửi dữ liệu lên Google…');
  try {
    const payload = buildSyncPayload(reason, lotKey);
    const res = await postSync(payload);
    saveSyncCfg({
      lastSyncAt: new Date().toISOString(),
      lastResult: res && res.uncertain
        ? 'Đã gửi (không đọc được phản hồi)'
        : res && res.sheetUrl ? 'OK · ' + res.sheetUrl : 'OK',
    });
    if (res && res.uncertain) {
      toast('Đã gửi tới Google nhưng không đọc được phản hồi. Kiểm tra Google Sheets hoặc hộp thư.', '');
      return;
    }
    if (reason === 'test') {
      toast(res && res.mail ? 'Kết nối tốt. Đã gửi mail thử, kiểm tra hộp thư.' : 'Kết nối tốt. Đã ghi dữ liệu lên Google Sheets.', 'ok');
    } else if (reason === 'lot_done') {
      toast(res && res.mail ? `Đã gửi mail báo cáo lô ${lotKey}.` : `Đã đồng bộ lô ${lotKey} lên Google Sheets.`, 'ok');
    } else if (reason === 'manual') {
      toast(res && res.sheetUrl ? 'Đã đồng bộ. Mở Google Sheets trong menu.' : 'Đã đồng bộ Google Sheets.', 'ok');
    }
  } catch (err) {
    saveSyncCfg({ lastResult: 'Lỗi: ' + err.message });
    if (reason !== 'auto') toast('Đồng bộ lỗi: ' + err.message, 'bad');
  } finally {
    syncBusy = false;
    updateSyncUi();
  }
}

function openSyncDialog() {
  const dlg = $('#syncDialog');
  if (!dlg) return;
  $('#syncUrl').value = syncCfg.url || '';
  $('#syncEnabled').checked = syncCfg.enabled;
  updateSyncUi();
  dlg.showModal();
}

function syncUrlFromInput() {
  const url = $('#syncUrl').value.trim();
  if (!url) { toast('Dán URL Web App trước đã.', 'bad'); return null; }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(url)) {
    toast('URL phải có dạng https://script.google.com/macros/s/…/exec', 'bad');
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
      toast('URL phải có dạng https://script.google.com/macros/s/…/exec', 'bad');
      return;
    }
    saveSyncCfg({ url: raw, enabled: $('#syncEnabled').checked });
    toast(raw ? 'Đã lưu cấu hình đồng bộ.' : 'Đã tắt đồng bộ (chưa có URL).', 'ok');
  });
  $('#btnSyncTest').addEventListener('click', async () => {
    const url = syncUrlFromInput();
    if (!url) return;
    saveSyncCfg({ url, enabled: $('#syncEnabled').checked });
    await syncNow('test');
  });
  $('#btnSyncNow').addEventListener('click', async () => {
    const url = syncUrlFromInput();
    if (!url) return;
    saveSyncCfg({ url, enabled: $('#syncEnabled').checked });
    await syncNow('manual');
  });
  $('#btnCopyScript').addEventListener('click', async () => {
    try {
      const res = await fetch('./apps-script/Code.gs');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      toast('Đã sao chép Code.gs. Dán vào script.google.com.', 'ok');
    } catch (err) {
      toast('Không sao chép được. Bấm "Tải Code.gs" để tải file.', 'bad');
    }
  });
  updateSyncUi();
}

/* ============================================================
   Menu & dialog
   ============================================================ */
function setupDialogs() {
  const quick = $('#quickDialog');
  $('#btnQuickClose').addEventListener('click', () => quick.close());
  $$('[data-quicklang]').forEach(btn => {
    btn.addEventListener('click', () => {
      applyQuickLang(btn.dataset.quicklang);
      if (state.quickFrom === 'home') populateQuickZoneSelect();
    });
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
    if (e.target.matches('input')) { refreshQuickChecks(); refreshQuickSummary(); }
  });
  $('#quickPages').addEventListener('click', e => {
    const btn = e.target.closest('[data-act="qcalc"]');
    if (!btn) return;
    const card = btn.closest('.qcard');
    const r = readQuickCard(card);
    card.querySelector('.dt-input').value = r.sum;
    refreshQuickChecks();
    refreshQuickSummary();
  });
  quick.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input')) {
      e.preventDefault();
      focusNextQuickInput(e.target);
    }
  });
  $('#btnQuickSave').addEventListener('click', () => saveQuick('pause'));
  $('#btnQuickSaveNext').addEventListener('click', () => saveQuick('next'));

  const menu = $('#menuDialog');
  $('#btnMenu').addEventListener('click', () => menu.showModal());
  $('#btnMenuClose').addEventListener('click', () => menu.close());
  $('#menuExport').addEventListener('click', () => { menu.close(); exportAll(); });
  $('#menuBackup').addEventListener('click', () => { menu.close(); backupJSON(); });
  $('#menuRestore').addEventListener('click', () => { menu.close(); $('#fileRestore').click(); });
  $('#menuDemo').addEventListener('click', () => { menu.close(); demoLot250(); });
  $('#menuReset').addEventListener('click', () => { menu.close(); resetAll(); });
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
  [quick, menu].forEach(dlg => {
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
  window.addEventListener('popstate', routeFromHash);
  routeFromHash();
  if (syncCfg.url && DB.updatedAt && (!syncCfg.lastSyncAt || new Date(DB.updatedAt) > new Date(syncCfg.lastSyncAt))) {
    syncTimer = setTimeout(() => syncNow('auto'), 2500);
  }
}
init();

})();
