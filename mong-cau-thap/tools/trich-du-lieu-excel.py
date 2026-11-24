"""Trích dữ liệu catalogue cẩu tháp, vật liệu và giá trị tham chiếu từ file Excel gốc.

Cách chạy (từ thư mục mong-cau-thap):
    python3 -I tools/trich-du-lieu-excel.py excel-goc/<ten-file>.xlsm

Sinh ra:
    js/data/cau-thap.js          catalogue cẩu (sheet Solieu, cột A:O + bảng phụ S:AA)
    js/data/vat-lieu.js          bê tông, cốt thép, bulong (sheet Solieu, cột S:AW)
    tests/excel-tham-chieu.json  kết quả Excel đã tính sẵn, để đối chiếu app
"""
import json
import math
import os
import re
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def nhan_goc(s):
    s = '' if s is None else str(s)
    p = s.find('(')
    if p >= 0:
        s = s[:p]
    return s.strip()


def nhom_cua_nhan(nhan):
    u = nhan.upper()
    if u in ('N', 'FV', 'V'):
        return 'N'
    if u in ('MT', 'M', 'MV'):
        return 'M'
    if u in ('ET', 'H', 'FH'):
        return 'H'
    if u in ('CR', 'MR'):
        return 'CR'
    if u == 'T':
        return 'T'
    return ''


def so(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def col_idx(letters):
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n


def doc_khoi_cau(wsf, wsv, lookup):
    """Quét các khối dữ liệu cẩu giống hàm VBA DongTieuDeKhoi / VungDuLieuKhoi."""
    cranes = []
    tham_chieu = {}
    for r in range(1, wsf.max_row + 1):
        e = wsf.cell(r, 5).value
        g = wsf.cell(r, 7).value
        if not (isinstance(e, str) and 'd(m)' in e and isinstance(g, str) and '(' in g):
            continue
        ten = g[g.rfind('(') + 1:g.rfind(')')].replace(' ', '')
        hdr = r + 2
        nhom_lv = {}
        nhom_klv = {}
        nhan_lv = {}
        nhan_klv = {}
        for c in range(2, 6):
            nh = nhan_goc(wsf.cell(hdr, c).value)
            k = nhom_cua_nhan(nh)
            if k:
                nhom_lv[c] = k
                nhan_lv[k] = nh
        for c in range(9, 13):
            nh = nhan_goc(wsf.cell(hdr, c).value)
            k = nhom_cua_nhan(nh)
            if k:
                nhom_klv[c] = k
                nhan_klv[k] = nh

        rows = []
        quy_doi_excel = []
        x = r + 3
        while wsf.cell(x, 1).value not in (None, ''):
            lv = {k: so(wsv.cell(x, c).value) for c, k in nhom_lv.items()}
            klv = {k: so(wsv.cell(x, c).value) for c, k in nhom_klv.items()}
            row = {'h': wsv.cell(x, 1).value, 'lv': lv, 'klv': klv}

            # Nhận dạng công thức quy đổi của từng hàng
            def chuan(cn):
                f = wsf.cell(x, cn).value
                f = str(f)
                f = re.sub(r'\$?([A-Z]+)\$?' + str(x) + r'\b', r'\1#', f)
                return re.sub(r'\$D\$\d+', 'n', f)

            def nhom_o(letter, bang):
                return bang.get(col_idx(letter))

            quy_tac = {}
            for trang_thai, (cN, cM, cH), bang in (
                    ('lv', (6, 7, 8), nhom_lv), ('klv', (13, 14, 15), nhom_klv)):
                fN, fM, fH = chuan(cN), chuan(cM), chuan(cH)
                m = re.fullmatch(r'=([A-Z])#\*n', fN)
                if m and nhom_o(m.group(1), bang) == 'N':
                    qN = 'x_n'
                elif (m := re.fullmatch(r'=\(([A-Z])#\+40\)\*n', fN)) and \
                        nhom_o(m.group(1), bang) == 'N':
                    qN = 'cong40_n'
                else:
                    raise SystemExit(f'{ten} hàng {x}: không nhận dạng được {fN}')
                m = re.fullmatch(r'=([A-Z])#\*n', fM)
                if m and nhom_o(m.group(1), bang) == 'M':
                    qM = 'x_n'
                elif (m := re.fullmatch(r'=\(([A-Z])#\+([A-Z])#\)\*n', fM)) and \
                        {nhom_o(m.group(1), bang), nhom_o(m.group(2), bang)} == {'M', 'CR'}:
                    qM = 'cong_cr_n'
                elif (m := re.fullmatch(r'=\(IF\(([A-Z])#<2\*([A-Z])#,\2#,\1#-\2#\)\)\*n', fM)) and \
                        nhom_o(m.group(1), bang) == 'M' and nhom_o(m.group(2), bang) == 'CR':
                    qM = 'cr_klv_n'
                elif fM == '=SQRT(SUMSQ(B#:C#))' and \
                        {nhom_o('B', bang), nhom_o('C', bang)} == {'M', 'CR'}:
                    qM = 'srss'
                else:
                    raise SystemExit(f'{ten} hàng {x}: không nhận dạng được {fM}')
                m = re.fullmatch(r'=([A-Z])#\*n', fH)
                if not (m and nhom_o(m.group(1), bang) == 'H'):
                    raise SystemExit(f'{ten} hàng {x}: không nhận dạng được {fH}')
                quy_tac[trang_thai] = {'N': qN, 'M': qM, 'H': 'x_n'}
            row['quyTac'] = quy_tac
            rows.append(row)
            quy_doi_excel.append({
                'h': row['h'],
                'lv': [wsv.cell(x, c).value for c in (6, 7, 8)],
                'klv': [wsv.cell(x, c).value for c in (13, 14, 15)],
            })
            x += 1

        # Quy tắc mặc định của cẩu = quy tắc xuất hiện ở hàng đầu tiên;
        # hàng nào khác thì ghi đè riêng ở hàng đó.
        mac_dinh = rows[0]['quyTac']
        for row in rows:
            if row['quyTac'] == mac_dinh:
                del row['quyTac']

        torque_label = str(wsf.cell(r, 1).value or '').replace('=', '').strip()
        crane = {
            'ten': ten,
            'tieuDe': g,
            'loaiVI': lookup['vn'].get(ten),
            'loaiEN': lookup['en'].get(ten),
            'chieuDaiTayCan': lookup['jib'].get(ten),
            'beRongThan': wsv.cell(r, 6).value,
            'nhanXoan': torque_label or None,
            'mXoan': so(wsv.cell(r, 2).value),
            'nhan': {'lv': nhan_lv, 'klv': nhan_klv},
            'quyTac': mac_dinh,
            'pctCoDinh': lookup['pct_const'].get(ten),
            'duongKinhNhomBulong': lookup['d_bolt'].get(ten),
            'tongChieuDayBanThep': lookup['t_angle'].get(ten),
            'hang': rows,
        }
        cranes.append(crane)
        tham_chieu[ten] = {
            'quyDoi': quy_doi_excel,
            'pct': lookup['pct_value'].get(ten),
        }
    return cranes, tham_chieu


def doc_bang_phu(wsf, wsv):
    out = {'vn': {}, 'en': {}, 'jib': {}, 'pct_const': {}, 'pct_value': {},
           'd_bolt': {}, 't_angle': {}}
    for r in range(25, 37):
        s = wsv.cell(r, col_idx('S')).value
        if s:
            f = wsf.cell(r, col_idx('T')).value
            v = wsv.cell(r, col_idx('T')).value
            out['pct_value'][s] = v
            if not (isinstance(f, str) and f.startswith('=')):
                out['pct_const'][s] = v
        v = wsv.cell(r, col_idx('V')).value
        if v:
            out['d_bolt'][v] = wsv.cell(r, col_idx('W')).value
        y = wsv.cell(r, col_idx('Y')).value
        if y:
            out['vn'][y] = wsv.cell(r, col_idx('Z')).value
            out['en'][y] = wsv.cell(r, col_idx('AA')).value
    for r in range(39, 60):
        s = wsv.cell(r, col_idx('S')).value
        if s:
            out['jib'][s] = wsv.cell(r, col_idx('T')).value
        v = wsv.cell(r, col_idx('V')).value
        if v:
            out['t_angle'][v] = wsv.cell(r, col_idx('W')).value
    return out


def doc_vat_lieu(wsv):
    def bang(c1, r1, r2, keys):
        rows = []
        for r in range(r1, r2 + 1):
            first = wsv.cell(r, col_idx(c1)).value
            if first is None:
                continue
            item = {}
            for i, k in enumerate(keys):
                if k:
                    item[k] = wsv.cell(r, col_idx(c1) + i).value
            rows.append(item)
        return rows

    return {
        'beTong': bang('S', 3, 18, ['cap', 'Rbt_ser', 'Rbt', 'Rb', 'Rb_ser', 'Eb']),
        'cotThep': bang('AB', 3, 17, ['nhom', 'Rs', 'Rsw', 'Rsc', 'Es', 'fy', None, 'fu']),
        'bulongDuongKinh': bang('AK', 3, 21, ['d', 'A', 'Abn']),
        'bulongCapBen': bang('AS', 3, 8, ['cap', 'fub', 'fyb', 'fvb', 'ftb']),
    }


def doc_tham_chieu_cau_thap(wsv):
    o = lambda a: wsv[a].value
    return {
        'dauVao': {
            'cau': o('I15'), 'chieuCao': o('I17'), 'beTong': o('K28'), 'cotThep': o('K32'),
            'a_cm': o('L35'), 'X': o('L37'), 'Y': o('L38'), 'H': o('L39'),
        },
        'ketQua': {
            'n': o('P15'), 'loai': o('L15'), 'chieuDaiTayCan': o('I16'),
            'nhan': [o('H18'), o('I18'), o('J18'), o('K18'), o('L18')],
            'catalogueLv': [o('H20'), o('I20'), o('J20'), o('K20'), o('L20')],
            'catalogueKlv': [o('H21'), o('I21'), o('J21'), o('K21'), o('L21')],
            'quyDoiLv': [o('H25'), o('I25'), o('J25')],
            'quyDoiKlv': [o('H26'), o('I26'), o('J26')],
            'Rb': o('L29'), 'Rbt': o('L30'), 'Eb': o('L31'), 'Rs': o('L33'), 'Rsc': o('L34'),
            'P': o('L40'),
            'ngoaiLucLv': [o('H44'), o('I44'), o('J44')],
            'ngoaiLucKlv': [o('H45'), o('I45'), o('J45')],
            'Ht': o('L66'),
        },
    }


def doc_tham_chieu_phan_b(wsv):
    """Mục B sheet Cau thap: tọa độ cọc (E57:N58), αi, Pimax/Pimin, kiểm tra."""
    o = lambda a: wsv[a].value
    coc = []
    for c in 'EFGHIJKLMN':
        x, y = o(c + '57'), o(c + '58')
        if x is None or x == '':
            continue
        coc.append({'x': x, 'y': y, 'alpha': o(c + '59'), 'Pimax': o(c + '60'), 'Pimin': o(c + '61')})
    return {
        'dauVao': {'soCoc': o('L47'), 'Qa': o('L48'), 'QaKeo': o('L49'),
                   'toaDo': [{'x': c['x'], 'y': c['y']} for c in coc]},
        'ketQua': {'coc': coc, 'Pmax': o('G63'), 'Pmin': o('G64'),
                   'kiemTraNen': o('L63'), 'kiemTraKeo': o('L64'), 'sumY2': o('R67')},
    }


def doc_tham_chieu_phan_d(wsv):
    """Mục D sheet Cau thap: cánh tay đòn (P57:Y62) và thép đài (F75:M76, F82:M83)."""
    o = lambda a: wsv[a].value
    canh = []
    for c in 'PQRSTUVWXY':
        canh.append({'xDuong': o(c + '57'), 'xAm': o(c + '58'), 'yDuong': o(c + '59'),
                     'yAm': o(c + '60'), 'Pimax': o(c + '61'), 'PiminAm': o(c + '62')})

    def hang(r):
        return {'M': o('F%d' % r), 'alpha': o('G%d' % r), 'xi': o('H%d' % r), 'As': o('I%d' % r),
                'd': o('J%d' % r), 's': o('K%d' % r), 'AsChon': o('L%d' % r), 'kiemTra': o('M%d' % r)}
    return {
        'canhTayDon': canh,
        'duoiX': hang(75), 'duoiY': hang(76), 'trenX': hang(82), 'trenY': hang(83),
    }


def js_file(path, var, data, header):
    body = json.dumps(data, ensure_ascii=False, indent=1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(f'// {header}\n// Tự sinh bởi tools/trich-du-lieu-excel.py — không sửa tay.\n')
        f.write('(function (MCT) {\n')
        f.write(f'  MCT.data = MCT.data || {{}};\n  MCT.data.{var} = {body};\n')
        f.write('})(globalThis.MCT = globalThis.MCT || {});\n')


def main():
    src = sys.argv[1]
    wbf = openpyxl.load_workbook(src, data_only=False)
    wbv = openpyxl.load_workbook(src, data_only=True)
    wsf, wsv = wbf['Solieu'], wbv['Solieu']
    lookup = doc_bang_phu(wsf, wsv)
    cranes, tc_cau = doc_khoi_cau(wsf, wsv, lookup)
    vat_lieu = doc_vat_lieu(wsv)

    os.makedirs(os.path.join(ROOT, 'js', 'data'), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'tests'), exist_ok=True)
    js_file(os.path.join(ROOT, 'js', 'data', 'cau-thap.js'), 'cauThap', cranes,
            'Catalogue cẩu tháp (sheet Solieu)')
    js_file(os.path.join(ROOT, 'js', 'data', 'vat-lieu.js'), 'vatLieu', vat_lieu,
            'Bê tông, cốt thép, bulong (sheet Solieu)')

    tham_chieu = {
        'nguon': os.path.basename(src),
        'cauThapCatalogue': tc_cau,
        'sheetCauThap_phanA': doc_tham_chieu_cau_thap(wbv['Cau thap']),
        'sheetCauThap_phanB': doc_tham_chieu_phan_b(wbv['Cau thap']),
        'sheetCauThap_phanD': doc_tham_chieu_phan_d(wbv['Cau thap']),
    }
    with open(os.path.join(ROOT, 'tests', 'excel-tham-chieu.json'), 'w', encoding='utf-8') as f:
        json.dump(tham_chieu, f, ensure_ascii=False, indent=1)
    print(f'{len(cranes)} cẩu:', ', '.join(c["ten"] for c in cranes))


if __name__ == '__main__':
    main()
