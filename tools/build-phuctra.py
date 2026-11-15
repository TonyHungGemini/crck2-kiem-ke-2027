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
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Desktop/Kiểm kê chi tiết 2026')


def norm(s):
    return re.sub(r'\s+', '', str(s or '')).upper()


baseline = json.loads(open(BASELINE).read().split('=', 1)[1].strip().rstrip(';'))
base_total = {lot['lot']: lot['total'] for lot in baseline['lots']}


def find_header(ws):
    for r in range(1, min(ws.max_row, 12) + 1):
        a, b = ws.cell(r, 1).value, ws.cell(r, 2).value
        if isinstance(a, str) and a.strip().lower().startswith('hàng') and isinstance(b, str) and 'tổng điểm' in b.lower():
            return r
    return None


def parse_sheet(ws):
    header_row = find_header(ws)
    if not header_row:
        return None
    rows, order = {}, []
    for r in range(header_row + 1, ws.max_row + 1):
        hang, total = ws.cell(r, 1).value, ws.cell(r, 2).value
        if isinstance(hang, (int, float)) and float(hang).is_integer() and isinstance(total, (int, float)):
            hang = int(hang)
            rows[hang] = total
            order.append(hang)
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
    label = ''
    for r in range(1, header_row):
        a = ws.cell(r, 1).value
        if isinstance(a, str) and 'LÔ' in a.upper():
            label = re.split(r'[:：]', a, 1)[1].strip() if (';' not in a and (':' in a or '：' in a)) else a
            break
    return {'rows': cleaned, 'label': label, 'sheet': ws.title}


sheets = []
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

lots, missing, notes = {}, [], {}
for lot in base_total:
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
    if chosen[1] != base_total[lot]:
        notes[lot] = f"sum {chosen[1]} vs baseline {base_total[lot]} (sheet {chosen[2]['sheet']})"

payload = {
    'year': 2026,
    'label': 'Phúc tra chi tiết kiểm kê 2026',
    'source': 'Kiểm kê chi tiết 2026 (Tổ 1–8).xlsx',
    'minDiff': 2,
    'missing': sorted(missing),
    'lots': lots,
}
with open(OUT, 'w') as f:
    f.write('/* Sinh bởi tools/build-phuctra.py — dữ liệu Tổng điểm trồng 2026 theo từng hàng */\n')
    f.write('window.KK_PHUCTRA=')
    f.write(json.dumps(payload, ensure_ascii=False, separators=(',', ':')))
    f.write(';\n')

print(f'wrote {OUT}: {len(lots)} lots, {sum(len(v) for v in lots.values())} rows, missing={missing}')
for lot, note in notes.items():
    print('  NOTE', lot, note)
