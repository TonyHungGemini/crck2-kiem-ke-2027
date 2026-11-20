#!/usr/bin/env python3
"""Sinh assets/phuctra.js từ bảng chi tiết kiểm kê 2026 (Tổ 1-8).

Chỉ đọc bảng chính A:H (Hàng, Tổng điểm trồng, ...). Bỏ các bảng nháp
bên phải và dòng tổng bị đánh số hàng.
"""
import glob
import json
import os
import re
import statistics
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE = os.path.join(ROOT, 'assets', 'baseline.js')
OUT = os.path.join(ROOT, 'assets', 'phuctra.js')
DIR_FILE = os.path.join(ROOT, 'tools', 'data', 'khu-vuc-8-directions.xlsx')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Desktop/Kiểm kê chi tiết 2026')

# Cột thành phần bên phải "Tổng điểm trồng" trên bảng chi tiết.
COMP_COLS = [('g', 2), ('plus', 3), ('c', 4), ('k1', 5), ('k2', 6), ('o', 7)]


def add_sums(dst, src):
    for field in ['dt'] + [name for name, _ in COMP_COLS]:
        dst[field] = dst.get(field, 0) + src.get(field, 0)


def norm(s):
    return re.sub(r'\s+', '', str(s or '')).upper()


baseline = json.loads(open(BASELINE).read().split('=', 1)[1].strip().rstrip(';'))
base_total = {lot['lot']: lot['total'] for lot in baseline['lots']}


def find_header(ws):
    return find_headers(ws)[0][0] if find_headers(ws) else None


def find_headers(ws):
    found = []
    for r in range(1, min(ws.max_row, 12) + 1):
        for c in range(1, ws.max_column + 1):
            a, b = ws.cell(r, c).value, ws.cell(r, c + 1).value
            if isinstance(a, str) and a.strip().lower().startswith('hàng') and isinstance(b, str) and 'tổng điểm' in b.lower():
                found.append((r, c))
    return found


def parse_sheet(ws, block=0):
    headers = find_headers(ws)
    if len(headers) <= block:
        return None
    header_row, col = headers[block]
    rows, order, row_of = {}, [], {}
    for r in range(header_row + 1, ws.max_row + 1):
        hang, total = ws.cell(r, col).value, ws.cell(r, col + 1).value
        if isinstance(hang, (int, float)) and float(hang).is_integer() and isinstance(total, (int, float)):
            hang = int(hang)
            rows[hang] = total
            order.append(hang)
            row_of[hang] = r
    if not rows:
        return None
    values = list(rows.values())
    median = statistics.median(values)
    whole_sum = sum(values)
    cleaned = {}
    for hang in order:
        value = rows[hang]
        # Một số sheet đánh số dòng tổng như một hàng (vd 450: hàng 115 = 18487)
        if value > max(500, median * 4) or (value == whole_sum - value and value > median * 10):
            continue
        cleaned[hang] = int(value) if float(value).is_integer() else value
    if not cleaned:
        return None
    sums = {'dt': sum(cleaned.values())}
    for field, offset in COMP_COLS:
        total = 0
        for hang in cleaned:
            v = ws.cell(row_of[hang], col + offset).value
            if isinstance(v, (int, float)):
                total += v
        sums[field] = int(total) if float(total).is_integer() else total
    label = ''
    for r in range(1, header_row):
        a = ws.cell(r, col).value
        if isinstance(a, str) and 'LÔ' in a.upper():
            label = re.split(r'[:：]', a, 1)[1].strip() if (';' not in a and (':' in a or '：' in a)) else a
            break
    return {'rows': cleaned, 'label': label, 'sheet': ws.title, 'sums': sums}


# Lô chia hướng: file chi tiết tách sheet / khối bảng theo hướng.
# 351 nằm trong bộ Tổ 1–8; các lô khu vực 8 lấy từ file phân hướng riêng.
DIR_DETAIL = {
    '351': [('351A', 0, 'A'), ('351B', 0, 'B'), ('351C', 0, 'C')],
}
DIR_FILE_DETAIL = {
    '46-13': [(' lô46', 0, 'A'), (' lô46', 1, 'B')],
    '47-13': [('LÔ47', 0, 'A'), ('LÔ47', 1, 'B')],
    '13-13': [('lô13', 0, 'A'), ('lô13', 1, 'B')],
    '12-13': [('LO12', 0, 'A'), ('LO12', 1, 'B')],
    '117': [('117A', 0, 'A'), ('117B', 0, 'B')],
}

# Phúc tra ưu tiên tổng lô theo bảng gộp của file chi tiết 2026 cũ.
# Hướng A/B (file phân hướng mới) chỉ dùng để chia hàng khi nhập.
MERGE_REF_DETAIL = {
    '46-13': [('46', 0)],
    '47-13': [('47', 0)],
    '13-13': [('13', 0)],
    '12-13': [('12', 0)],
    '117': [('117AB', 0), ('117C', 0)],
}

sheets = []
blocks_by_sheet = {}
for path in sorted(glob.glob(os.path.join(SRC, '*.xlsx'))):
    if os.path.basename(path).startswith('~$'):
        continue
    wb = openpyxl.load_workbook(path, data_only=True)
    for ws in wb.worksheets:
        if norm(ws.title) == 'MẪU':
            continue
        parsed = parse_sheet(ws)
        if parsed:
            parsed['file'] = os.path.basename(path)
            sheets.append(parsed)
        header_count = len(find_headers(ws))
        if header_count:
            blocks_by_sheet[norm(ws.title)] = [parse_sheet(ws, i) for i in range(header_count)]

dir_blocks_by_sheet = {}
if os.path.exists(DIR_FILE):
    wb = openpyxl.load_workbook(DIR_FILE, data_only=True)
    for ws in wb.worksheets:
        header_count = len(find_headers(ws))
        if header_count:
            dir_blocks_by_sheet[norm(ws.title)] = [parse_sheet(ws, i) for i in range(header_count)]

lots, missing, notes, sums_by_lot = {}, [], {}, {}
for lot in base_total:
    use_dir_file = lot in DIR_FILE_DETAIL
    detail = DIR_FILE_DETAIL.get(lot) or DIR_DETAIL.get(lot)
    if detail:
        blocks_source = dir_blocks_by_sheet if use_dir_file else blocks_by_sheet
        dirs, absent, dir_sums = {}, [], {}
        for sheet_name, block, dir_name in detail:
            blocks = blocks_source.get(norm(sheet_name), [])
            parsed = blocks[block] if len(blocks) > block else None
            if not parsed:
                absent.append(dir_name)
                continue
            dirs[dir_name] = {str(h): v for h, v in sorted(parsed['rows'].items())}
            add_sums(dir_sums, parsed['sums'])
        if absent:
            notes[lot] = 'missing dirs: ' + ', '.join(absent)
            missing.append(lot)
            continue
        lots[lot] = {'dirs': dirs}
        sums_by_lot[lot] = dir_sums
        dir_sum = sum(sum(d.values()) for d in dirs.values())
        ref_detail = MERGE_REF_DETAIL.get(lot)
        if ref_detail:
            ref, absent_ref, ref_sums = {}, [], {}
            for sheet_name, block in ref_detail:
                blocks = blocks_by_sheet.get(norm(sheet_name), [])
                parsed = blocks[block] if len(blocks) > block else None
                if not parsed:
                    absent_ref.append(sheet_name)
                    continue
                add_sums(ref_sums, parsed['sums'])
                for hang, value in parsed['rows'].items():
                    ref[hang] = ref.get(hang, 0) + value
            if absent_ref:
                notes[lot] = 'missing merge ref: ' + ', '.join(absent_ref)
            elif ref:
                lots[lot]['ref'] = {str(h): int(v) if float(v).is_integer() else v
                                    for h, v in sorted(ref.items())}
                sums_by_lot[lot] = ref_sums
                ref_sum = sum(ref.values())
                notes[lot] = f"ref sum {ref_sum}"
                if dir_sum != ref_sum:
                    notes[lot] += f", dirs sum {dir_sum}"
        if dir_sum != base_total[lot]:
            note = f"dirs sum {dir_sum} vs baseline {base_total[lot]}"
            notes[lot] = (notes[lot] + '; ' + note) if notes.get(lot) else note
        continue
    lot_n = norm(lot)
    candidates = []
    for sheet in sheets:
        sheet_n = norm(sheet['sheet'])
        score = None
        if sheet_n == lot_n:
            score = 100
        elif norm(sheet['label']) == lot_n:
            score = 90
        elif lot_n.startswith(sheet_n + '-') or (len(sheet_n) >= 3 and lot_n.startswith(sheet_n) and lot_n != sheet_n):
            score = 60  # 115 -> 115A, 12 -> 12-13
        elif sheet_n.startswith(lot_n):
            score = 50  # 352A -> 352
        if score is None:
            continue
        sheet_sum = sum(sheet['rows'].values())
        if sheet_sum == base_total[lot]:
            score += 30
        candidates.append((score, sheet_sum, sheet))
    if not candidates:
        missing.append(lot)
        continue
    candidates.sort(key=lambda x: (-x[0], -x[1]))
    top = candidates[0][0]
    tied = [c for c in candidates if c[0] == top]
    if len(tied) > 1:
        notes[lot] = 'ambiguous: ' + ', '.join(f"{c[2]['sheet']}({c[1]})" for c in tied)
        missing.append(lot)
        continue
    chosen = tied[0]
    lots[lot] = {str(h): v for h, v in sorted(chosen[2]['rows'].items())}
    sums_by_lot[lot] = chosen[2]['sums']
    if chosen[1] != base_total[lot]:
        notes[lot] = f"sum {chosen[1]} vs baseline {base_total[lot]} (sheet {chosen[2]['sheet']})"

payload = {
    'year': 2026,
    'label': 'Phúc tra chi tiết kiểm kê 2026',
    'source': 'Kiểm kê chi tiết 2026 (Tổ 1–8) + phân hướng khu vực 8 · phúc tra theo tổng lô gốc',
    'minDiff': 2,
    'missing': sorted(missing),
    'lots': lots,
    'sums': sums_by_lot,
}
with open(OUT, 'w') as f:
    f.write('/* Sinh bởi tools/build-phuctra.py — dữ liệu Tổng điểm trồng 2026 theo từng hàng */\n')
    f.write('window.KK_PHUCTRA=')
    f.write(json.dumps(payload, ensure_ascii=False, separators=(',', ':')))
    f.write(';\n')

print(f'wrote {OUT}: {len(lots)} lots, {sum(len(v) for v in lots.values())} rows, missing={missing}')
for lot, note in notes.items():
    print('  NOTE', lot, note)
