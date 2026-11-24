// Giao diện app Móng cẩu tháp
(function (MCT) {
  'use strict';

  var KHOA_LUU = 'mong-cau-thap.du-lieu.v1';

  // Giá trị mặc định = số liệu trong file Excel gốc
  var MAC_DINH = {
    duAn: {
      ten: 'MD3-1',
      diaDiem: 'Phường Tân Mỹ, Thành Phố Hồ Chí Minh',
      nhaThau: 'Tổng Công Ty Xây Dựng Số 1 - CTCP',
      hangMuc: 'Móng Cọc Cẩu Tháp CT1'
    },
    cau: { ten: 'LLT5020-10', chieuCao: 37.5 },
    dai: { beTong: 'B35', cotThep: 'CB500-V', a_cm: 15, X: 4, Y: 3.678, H: 1.6 },
    coc: {
      D: 0.8,
      Qa: 4243.15,      // tạm nhập tay – GĐ4 tự tính từ sheet SCT cọc
      QaKeo: 2534.12,   // độ lớn sức chịu kéo Qa' (app tự mang dấu âm khi kiểm tra)
      toaDo: [{ x: -1.2, y: -0.77 }, { x: 1.2, y: -0.77 }, { x: 0, y: 1.31 }]
    },
    // Thép chọn cho đài (mm): đường kính d, khoảng cách a
    thep: {
      duoiX: { d: 20, s: 150 }, duoiY: { d: 20, s: 150 },
      trenX: { d: 20, s: 150 }, trenY: { d: 20, s: 150 }
    }
  };

  var CO_SO = [
    ['TCVN 5574:2018', 'Thiết kế kết cấu bê tông và bê tông cốt thép'],
    ['TCVN 5575:2024', 'Kết cấu thép – Tiêu chuẩn thiết kế'],
    ['TCVN 10304:2025', 'Móng cọc – Tiêu chuẩn thiết kế'],
    ['', 'Báo cáo khảo sát địa chất do chủ đầu tư cung cấp.'],
    ['', 'Catalogue cẩu tháp do nhà sản xuất cung cấp.']
  ];

  // Danh mục theo đúng thứ tự trong file Excel
  var MUC = [
    { nhom: 'Chung' },
    { id: 'du-an', ma: '', ten: 'Thông tin dự án' },
    { nhom: 'Sheet Cau thap' },
    { id: 'cau', ma: 'A.1', ten: 'Cẩu tháp & tải trọng' },
    { id: 'dai', ma: 'A.3', ten: 'Vật liệu & kích thước đài' },
    { id: 'coc', ma: 'B', ten: 'Tải trọng lên cọc' },
    { id: 'xuyen', ma: 'C', ten: 'Xuyên thủng đài' },
    { id: 'thep', ma: 'D', ten: 'Cốt thép đài' },
    { id: 'bulong', ma: 'E', ten: 'Bulong neo', sapCo: 'GĐ2' },
    { id: 'ket-luan', ma: 'F', ten: 'Kết luận', sapCo: 'GĐ2' },
    { nhom: 'Cọc & địa chất' },
    { id: 'dia-chat', ma: '', ten: 'Số liệu địa chất', sapCo: 'GĐ4' },
    { id: 'sct', ma: '', ten: 'Sức chịu tải cọc', sapCo: 'GĐ4' },
    { id: 'tai-ngang', ma: '', ten: 'Cọc chịu tải ngang', sapCo: 'GĐ5' },
    { id: 'lun', ma: '', ten: 'Ổn định – lún', sapCo: 'GĐ6' },
    { id: 'tuong-tac', ma: '', ten: 'Biểu đồ tương tác', sapCo: 'GĐ7' }
  ];

  // ---------------- Trạng thái ----------------
  function sao(o) { return JSON.parse(JSON.stringify(o)); }

  function tai() {
    var s = sao(MAC_DINH);
    try {
      var raw = localStorage.getItem(KHOA_LUU);
      if (raw) {
        var luu = JSON.parse(raw);
        Object.keys(s).forEach(function (k) {
          if (luu[k] && typeof luu[k] === 'object') Object.assign(s[k], luu[k]);
        });
      }
    } catch (e) { /* trình duyệt chặn lưu trữ: dùng mặc định */ }
    return s;
  }

  var state = tai();
  var trangHienTai = 'cau';
  var ketQua = null;   // phần A
  var kqB = null;      // phần B
  var kqC = null;      // phần C
  var kqD = null;      // phần D

  function luu() {
    try {
      localStorage.setItem(KHOA_LUU, JSON.stringify(state));
      datTrangThai('Đã lưu trên trình duyệt');
    } catch (e) {
      datTrangThai('Không lưu được trên trình duyệt này');
    }
  }

  function tinh() {
    ketQua = MCT.calc.tinhPhanA({
      cau: state.cau.ten, chieuCao: state.cau.chieuCao,
      beTong: state.dai.beTong, cotThep: state.dai.cotThep, a_cm: state.dai.a_cm,
      X: state.dai.X, Y: state.dai.Y, H: state.dai.H
    });
    kqB = MCT.calc.tinhPhanB(ketQua, {
      toaDo: state.coc.toaDo, Qa: state.coc.Qa, QaKeo: state.coc.QaKeo
    });
    kqC = MCT.calc.tinhPhanC(ketQua, kqB, { D: state.coc.D });
    kqD = MCT.calc.tinhPhanD(ketQua, kqB, state.thep);
  }

  // ---------------- Tiện ích hiển thị ----------------
  var $ = function (sel) { return document.querySelector(sel); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function so(v, d) {
    if (v === null || v === undefined || v === '') return '–';
    if (typeof v !== 'number') return esc(v);
    if (!isFinite(v)) return '–';
    // Dấu phẩy thập phân, không phân cách hàng nghìn (tránh nhầm 34.500 với 34,5)
    return v.toLocaleString('vi-VN', {
      minimumFractionDigits: d === undefined ? 2 : d,
      maximumFractionDigits: d === undefined ? 2 : d,
      useGrouping: false
    });
  }

  function datTrangThai(msg) {
    var el = $('#status');
    if (el) el.textContent = msg;
  }

  function dong(nhan, ky, giaTri, donVi) {
    return '<div class="lbl">' + nhan + '</div>' +
      '<div class="val"><span class="sym">' + (ky || '') + '</span>' +
      '<span class="num">' + giaTri + '</span><span class="unit">' + (donVi || '') + '</span></div>';
  }

  function oNhapSo(path, nhan, ky, donVi) {
    var v = layGiaTri(path);
    return '<div class="lbl"><label for="in-' + path + '">' + nhan + '</label></div>' +
      '<div class="val"><span class="sym">' + (ky || '') + '</span>' +
      '<input class="in so" type="text" inputmode="decimal" autocomplete="off" id="in-' + path +
      '" data-bind="' + path + '" data-kieu="so" value="' + esc(hienSoNhap(v)) + '">' +
      '<span class="unit">' + (donVi || '') + '</span></div>';
  }

  function oChon(path, luaChon, nhan, ky, donVi) {
    var v = String(layGiaTri(path));
    var opts = luaChon.map(function (o) {
      var val = typeof o === 'object' ? o.v : o;
      var txt = typeof o === 'object' ? o.t : o;
      return '<option value="' + esc(val) + '"' + (String(val) === v ? ' selected' : '') + '>' + esc(txt) + '</option>';
    }).join('');
    return '<div class="lbl"><label for="in-' + path + '">' + nhan + '</label></div>' +
      '<div class="val"><span class="sym">' + (ky || '') + '</span>' +
      '<select class="in" id="in-' + path + '" data-bind="' + path + '">' + opts + '</select>' +
      '<span class="unit">' + (donVi || '') + '</span></div>';
  }

  // Đường dẫn dạng "coc.toaDo.0.x"
  function layGiaTri(path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, state);
  }

  function datGiaTri(path, v) {
    var p = path.split('.');
    var o = state;
    for (var i = 0; i < p.length - 1; i++) o = o[p[i]];
    o[p[p.length - 1]] = v;
  }

  function hienSoNhap(v) {
    return v === '' || v === null || v === undefined ? '' : String(v).replace('.', ',');
  }

  function loiHtml(kq) {
    kq = kq || ketQua;
    if (!kq || kq.hopLe) return '';
    return '<div class="alert alert-fail">' + kq.loi.map(esc).join('<br>') + '</div>';
  }

  function nhanKetLuan(ok) {
    return ok ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-fail">FAIL</span>';
  }

  // ---------------- Các trang ----------------
  var TRANG = {};

  TRANG['du-an'] = {
    tieuDe: 'Thông tin dự án',
    moTa: 'Thông tin in ở đầu thuyết minh.',
    nhap: function () {
      function oChu(path, nhan) {
        return '<div class="field"><label for="in-' + path + '">' + nhan + '</label>' +
          '<input class="in wide" type="text" id="in-' + path + '" data-bind="' + path + '" value="' +
          esc(layGiaTri(path)) + '"></div>';
      }
      return '<section class="card"><h2>Thông tin chung</h2><div class="grid-2">' +
        oChu('duAn.ten', 'Dự án') + oChu('duAn.diaDiem', 'Địa điểm') +
        oChu('duAn.nhaThau', 'Nhà thầu') + oChu('duAn.hangMuc', 'Hạng mục kiểm tra') +
        '</div></section>' +
        '<section class="card"><h2>Cơ sở tính toán</h2><ul class="basis">' +
        CO_SO.map(function (c) {
          return '<li>' + (c[0] ? '<strong>' + esc(c[0]) + '</strong>: ' : '') + esc(c[1]) + '</li>';
        }).join('') + '</ul></section>';
    },
    ketQua: function () { return ''; }
  };

  TRANG.cau = {
    tieuDe: 'A.1 – A.2. Cẩu tháp và tải trọng',
    moTa: 'Chọn loại cẩu và chiều cao tự đứng. Tải trọng được tra từ catalogue rồi nhân hệ số an toàn n.',
    nhap: function () {
      var dsCau = MCT.data.cauThap.map(function (c) {
        return { v: c.ten, t: c.ten + ' ' + (c.loaiVI || '') };
      });
      var cau = MCT.calc.timCau(state.cau.ten);
      var dsCao = cau ? cau.hang.map(function (h) { return { v: h.h, t: so(h.h, 2) }; }) : [];
      return '<section class="card"><h2>Chọn cẩu</h2><div class="params">' +
        oChon('cau.ten', dsCau, 'Loại cẩu tháp') +
        oChon('cau.chieuCao', dsCao, 'Chiều cao tự đứng tính toán', '', 'm') +
        '</div></section>';
    },
    ketQua: function () {
      var r = ketQua;
      if (!r.cau) return loiHtml();
      var c = r.catalogue;
      var nh = r.nhan;
      var cot = ['N', 'M', 'H', 'CR', 'T'];
      var dv = { N: 'kN', M: 'kNm', H: 'kN', CR: 'kNm', T: 'kNm' };
      function o(v) { return v === null || v === undefined ? '<td class="c">-</td>' : '<td class="r">' + so(v) + '</td>'; }
      var bangCatalogue = '<div class="table-wrap"><table class="tbl"><thead><tr><th></th>' +
        cot.map(function (k) { return '<th>' + esc(nh[k]) + '</th>'; }).join('') + '</tr>' +
        '<tr class="units"><th></th>' + cot.map(function (k) { return '<th>' + (nh[k] === '-' ? '-' : dv[k]) + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        (c ? '<tr><td>Khi cẩu làm việc</td>' + cot.map(function (k) { return o(c.lv[k]); }).join('') + '</tr>' +
          '<tr><td>Khi cẩu không làm việc</td>' + cot.map(function (k) { return o(c.klv[k]); }).join('') + '</tr>' : '') +
        '</tbody></table></div>';

      var q = r.quyDoi;
      var bangQuyDoi = q.lv ? '<div class="table-wrap"><table class="tbl"><thead><tr><th></th><th>N<sub>qđ</sub></th><th>M<sub>qđ</sub></th><th>H<sub>qđ</sub></th></tr>' +
        '<tr class="units"><th></th><th>kN</th><th>kNm</th><th>kN</th></tr></thead><tbody>' +
        '<tr><td>Khi cẩu làm việc</td>' + o(q.lv.N) + o(q.lv.M) + o(q.lv.H) + '</tr>' +
        '<tr><td>Khi cẩu không làm việc</td>' + o(q.klv.N) + o(q.klv.M) + o(q.klv.H) + '</tr>' +
        '</tbody></table></div>' : '';

      return loiHtml() +
        '<section class="card"><h2>A.1. Thông số cẩu từ catalogue</h2><div class="params">' +
        dong('Loại cẩu', '', esc(r.cau.ten) + ' ' + esc(r.cau.loaiVI || ''), '') +
        dong('Chiều dài tay cần lớn nhất', '', so(r.chieuDaiTayCan, 0), 'm') +
        dong('Chiều cao tự đứng tính toán', '', so(Number(state.cau.chieuCao), 2), 'm') +
        dong('Bề rộng thân cẩu (chân cẩu)', '<i>H</i><sub>t</sub> =', so(r.Ht, 2), 'm') +
        '</div><h3>Tải trọng theo catalogue</h3>' + bangCatalogue + '</section>' +
        '<section class="card"><h2>A.2. Thông số cẩu tính toán</h2><div class="params">' +
        dong('Hệ số an toàn thiết kế', '<i>n</i> =', so(r.n, 2), '') +
        '</div><p class="hint">Riêng cẩu MC205B lấy n = 1,5; các cẩu khác n = 1,2 (giống ô P15 trong Excel).</p>' +
        quyTacText(r) + bangQuyDoi + '</section>' +
        bangCatalogueDayDu(r);
    }
  };

  function quyTacText(r) {
    var qt = (r.hang && r.hang.quyTac) || r.cau.quyTac;
    var nh = r.nhan;
    function t(rule, k, trangThai) {
      var m = nh.M, cr = nh.CR;
      switch (rule) {
        case 'x_n': return (k === 'N' ? nh.N : k === 'M' ? m : nh.H) + ' × n';
        case 'cong40_n': return '(' + nh.N + ' + 40) × n';
        case 'cong_cr_n': return '(' + m + ' + ' + cr + ') × n';
        case 'cr_klv_n': return '(' + m + ' < 2' + cr + ' ? ' + cr + ' : ' + m + ' − ' + cr + ') × n';
        case 'srss': return '√(' + m + '² + ' + cr + '²)  (không nhân n – giống Excel)';
        default: return rule;
      }
    }
    return '<div class="formula">Làm việc: N<sub>qđ</sub> = ' + esc(t(qt.lv.N, 'N')) +
      ';  M<sub>qđ</sub> = ' + esc(t(qt.lv.M, 'M')) + ';  H<sub>qđ</sub> = ' + esc(t(qt.lv.H, 'H')) +
      '<br>Không làm việc: N<sub>qđ</sub> = ' + esc(t(qt.klv.N, 'N')) +
      ';  M<sub>qđ</sub> = ' + esc(t(qt.klv.M, 'M')) + ';  H<sub>qđ</sub> = ' + esc(t(qt.klv.H, 'H')) + '</div>';
  }

  function bangCatalogueDayDu(r) {
    var cau = r.cau;
    var nhLv = cau.nhan.lv, nhKlv = cau.nhan.klv;
    var cotLv = ['N', 'M', 'H', 'CR'].filter(function (k) { return nhLv[k]; });
    var cotKlv = ['N', 'M', 'H', 'CR'].filter(function (k) { return nhKlv[k]; });
    var rows = cau.hang.map(function (h) {
      var hi = r.hang === h ? ' class="hi"' : '';
      return '<tr' + hi + '><td class="r">' + so(h.h) + '</td>' +
        cotLv.map(function (k) { return '<td class="r">' + so(h.lv[k]) + '</td>'; }).join('') +
        cotKlv.map(function (k) { return '<td class="r">' + so(h.klv[k]) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<section class="card"><details class="more"><summary>Xem toàn bộ catalogue ' + esc(cau.ten) +
      ' (' + cau.hang.length + ' chiều cao)</summary><div class="table-wrap" style="margin-top:10px">' +
      '<table class="tbl compact"><thead><tr><th rowspan="2">H (m)</th><th colspan="' + cotLv.length +
      '">Làm việc</th><th colspan="' + cotKlv.length + '">Không làm việc</th></tr><tr>' +
      cotLv.map(function (k) { return '<th>' + esc(nhLv[k]) + '</th>'; }).join('') +
      cotKlv.map(function (k) { return '<th>' + esc(nhKlv[k]) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="hint">Hàng tô vàng là hàng đang dùng: hàng cuối cùng có chiều cao ≤ chiều cao nhập (giống VLOOKUP tra gần đúng).</p>' +
      '</details></section>';
  }

  TRANG.dai = {
    tieuDe: 'A.3 – A.4. Vật liệu và kích thước đài cọc',
    moTa: 'Vật liệu và kích thước đài; trọng lượng đài và tổng ngoại lực quy về trọng tâm đáy đài.',
    nhap: function () {
      var dsBT = MCT.data.vatLieu.beTong.map(function (b) { return b.cap; });
      var dsCT = MCT.data.vatLieu.cotThep.map(function (b) { return b.nhom; });
      return '<section class="card"><h2>A.3. Vật liệu đài cọc</h2><div class="params">' +
        oChon('dai.beTong', dsBT, 'Bê tông') +
        oChon('dai.cotThep', dsCT, 'Cốt thép') +
        oNhapSo('dai.a_cm', 'Khoảng bê tông bảo vệ tính tới trọng tâm cốt thép', '<i>a</i> =', 'cm') +
        '</div></section>' +
        '<section class="card"><h2>A.4. Kích thước đài cọc</h2><div class="params">' +
        oNhapSo('dai.X', 'Chiều dài đài móng', '<i>X</i> =', 'm') +
        oNhapSo('dai.Y', 'Chiều rộng đài móng', '<i>Y</i> =', 'm') +
        oNhapSo('dai.H', 'Chiều cao đài móng', '<i>H</i> =', 'm') +
        '</div></section>';
    },
    ketQua: function () {
      var r = ketQua;
      var vl = r.vatLieu || {};
      var nl = r.ngoaiLuc || {};
      function o(v) { return '<td class="r">' + so(v) + '</td>'; }
      var bang = nl.lv ? '<div class="table-wrap"><table class="tbl"><thead><tr><th></th><th>M<sub>tt</sub></th><th>P<sub>tt</sub></th><th>H<sub>tt</sub></th></tr>' +
        '<tr class="units"><th></th><th>kNm</th><th>kN</th><th>kN</th></tr></thead><tbody>' +
        '<tr><td>Khi cẩu làm việc</td>' + o(nl.lv.M) + o(nl.lv.P) + o(nl.lv.H) + '</tr>' +
        '<tr><td>Khi cẩu không làm việc</td>' + o(nl.klv.M) + o(nl.klv.P) + o(nl.klv.H) + '</tr>' +
        '</tbody></table></div>' : '';
      return loiHtml() +
        '<section class="card"><h2>Cường độ vật liệu</h2><div class="params">' +
        dong('Bê tông ' + esc(state.dai.beTong) + ' – cường độ chịu nén tính toán', '<i>R</i><sub>b</sub> =', so(vl.Rb, 2), 'MPa') +
        dong('Cường độ chịu kéo tính toán', '<i>R</i><sub>bt</sub> =', so(vl.Rbt, 2), 'MPa') +
        dong('Modulus đàn hồi', '<i>E</i><sub>b</sub> =', so(vl.Eb, 0), 'MPa') +
        dong('Cốt thép ' + esc(state.dai.cotThep) + ' – cường độ chịu kéo tính toán', '<i>R</i><sub>s</sub> =', so(vl.Rs, 0), 'MPa') +
        dong('Cường độ chịu nén tính toán', '<i>R</i><sub>sc</sub> =', so(vl.Rsc, 0), 'MPa') +
        '</div></section>' +
        '<section class="card"><h2>Trọng lượng đài và tổng ngoại lực</h2>' +
        '<div class="formula"><i>P</i> = 25 × <i>X</i> × <i>Y</i> × <i>H</i> × 1,1</div><div class="params">' +
        dong('Trọng lượng tính toán đài móng', '<i>P</i> =', so(r.dai.P), 'kN') +
        '</div><h3>Tổng ngoại lực tính toán tác dụng lên móng quy tại trọng tâm đáy đài</h3>' +
        '<div class="formula"><i>M</i><sub>tt</sub> = <i>M</i><sub>qđ</sub> + <i>H</i><sub>qđ</sub> × <i>H</i>;   ' +
        '<i>P</i><sub>tt</sub> = <i>N</i><sub>qđ</sub> + <i>P</i>;   <i>H</i><sub>tt</sub> = <i>H</i><sub>qđ</sub></div>' +
        bang + '</section>';
    }
  };

  // ---------------- B. Tải trọng lên cọc ----------------
  function oSoBang(path, nhan) {
    return '<input class="in so" type="text" inputmode="decimal" autocomplete="off" aria-label="' + esc(nhan) +
      '" id="in-' + path + '" data-bind="' + path + '" data-kieu="so" value="' + esc(hienSoNhap(layGiaTri(path))) + '">';
  }

  // Sơ đồ mặt bằng đài: hệ trục tại tâm chân cẩu, x sang phải, y lên trên.
  // xt: kết quả phần C – nếu có thì vẽ thêm đáy tháp xuyên và đường bao tính toán.
  function soDoCoc(xt) {
    var X = Number(state.dai.X) || 0, Y = Number(state.dai.Y) || 0;
    var Ht = ketQua && ketQua.Ht ? ketQua.Ht : 0;
    var D = Number(state.coc.D) || 0.8;
    var dsCoc = kqB && kqB.hopLe ? kqB.coc : [];
    var pad = 0.7;
    var maxX = X / 2, maxY = Y / 2;
    if (xt) { maxX = Math.max(maxX, xt.Bxt / 2); maxY = Math.max(maxY, xt.Bxt / 2); }
    dsCoc.forEach(function (c) {
      maxX = Math.max(maxX, Math.abs(c.x) + D / 2);
      maxY = Math.max(maxY, Math.abs(c.y) + D / 2);
    });
    var vb = [-maxX - pad, -maxY - pad, 2 * (maxX + pad), 2 * (maxY + pad)];
    var fs = Math.max(vb[2], vb[3]) / 26;
    var nk = ' vector-effect="non-scaling-stroke"';
    var svg = '<svg class="so-do" viewBox="' + vb.join(' ') + '" role="img" aria-label="Sơ đồ bố trí cọc trong đài">';
    // đài
    svg += '<rect x="' + (-X / 2) + '" y="' + (-Y / 2) + '" width="' + X + '" height="' + Y +
      '" class="sd-dai"' + nk + '/>';
    // trục
    var ax = maxX + pad * 0.55, ay = maxY + pad * 0.55;
    svg += '<line x1="' + (-ax) + '" y1="0" x2="' + ax + '" y2="0" class="sd-truc"' + nk + '/>' +
      '<line x1="0" y1="' + ay + '" x2="0" y2="' + (-ay) + '" class="sd-truc"' + nk + '/>' +
      '<text x="' + (ax - fs * 0.2) + '" y="' + (-fs * 0.4) + '" font-size="' + fs + '" class="sd-chu" text-anchor="end">x</text>' +
      '<text x="' + (fs * 0.4) + '" y="' + (-ay + fs) + '" font-size="' + fs + '" class="sd-chu">y</text>';
    // chân cẩu
    if (Ht) {
      svg += '<rect x="' + (-Ht / 2) + '" y="' + (-Ht / 2) + '" width="' + Ht + '" height="' + Ht +
        '" class="sd-chan"' + nk + '/>';
    }
    // đáy tháp xuyên và đường bao tính toán (cách mép chân cẩu h0/2)
    if (xt) {
      var b = xt.Bxt, uu = xt.Ht + xt.h0;
      svg += '<rect x="' + (-b / 2) + '" y="' + (-b / 2) + '" width="' + b + '" height="' + b + '" class="sd-thap"' + nk + '/>' +
        '<rect x="' + (-uu / 2) + '" y="' + (-uu / 2) + '" width="' + uu + '" height="' + uu + '" class="sd-bao"' + nk + '/>';
    }
    // cọc
    dsCoc.forEach(function (c, i) {
      var lop;
      if (xt) lop = xt.coc[i] && !xt.coc[i].trongThap ? ' sd-coc-ngoai' : ' sd-coc-trong';
      else lop = kqB.Pmax === c.Pimax ? ' sd-coc-max' : '';
      svg += '<circle cx="' + c.x + '" cy="' + (-c.y) + '" r="' + (D / 2) + '" class="sd-coc' + lop + '"' + nk + '/>' +
        '<text x="' + c.x + '" y="' + (-c.y + fs * 0.35) + '" font-size="' + fs + '" class="sd-chu sd-so" text-anchor="middle">' +
        c.stt + '</text>';
    });
    // kích thước
    svg += '<text x="0" y="' + (Y / 2 + fs * 1.4) + '" font-size="' + fs * 0.9 + '" class="sd-chu sd-dim" text-anchor="middle">X = ' +
      so(X, 3) + ' m</text>' +
      '<text x="' + (-X / 2 - fs * 0.6) + '" y="0" font-size="' + fs * 0.9 + '" class="sd-chu sd-dim" text-anchor="middle" transform="rotate(-90 ' +
      (-X / 2 - fs * 0.6) + ' 0)">Y = ' + so(Y, 3) + ' m</text>';
    svg += '</svg>';
    var chuThich = xt
      ? 'Nét đứt xanh: chân cẩu H<sub>t</sub> = ' + so(Ht, 2) + ' m. Nét chấm: đường bao tính toán (cách mép chân cẩu h<sub>0</sub>/2). ' +
        'Vùng xanh lá: đáy tháp xuyên 45°, cạnh ' + so(xt.Bxt, 2) + ' m. Cọc đỏ: nằm ngoài tháp xuyên, gây xuyên thủng.'
      : 'Mặt bằng đài: ô vuông nét đứt là chân cẩu H<sub>t</sub> = ' + so(Ht, 2) +
        ' m; cọc tô đậm là cọc có P<sub>max</sub>. Trục tọa độ đặt tại tâm chân cẩu.';
    return '<figure class="so-do-wrap">' + svg + '<figcaption>' + chuThich + '</figcaption></figure>';
  }

  TRANG.coc = {
    tieuDe: 'B. Kiểm tra tải trọng tác dụng lên cọc',
    moTa: 'Nhập tọa độ từng cọc so với tâm chân cẩu và sức chịu tải cho phép của cọc.',
    nhap: function () {
      var toaDo = state.coc.toaDo;
      var dong1 = toaDo.map(function (c, i) {
        return '<tr><td class="c">' + (i + 1) + '</td>' +
          '<td>' + oSoBang('coc.toaDo.' + i + '.x', 'x cọc ' + (i + 1)) + '</td>' +
          '<td>' + oSoBang('coc.toaDo.' + i + '.y', 'y cọc ' + (i + 1)) + '</td>' +
          '<td class="c"><button type="button" class="btn-x" data-action="xoa-coc" data-i="' + i +
          '" aria-label="Xóa cọc ' + (i + 1) + '"' + (toaDo.length <= 1 ? ' disabled' : '') + '>✕</button></td></tr>';
      }).join('');
      return '<section class="card"><h2>Sức chịu tải của cọc</h2><div class="params">' +
        oNhapSo('coc.Qa', 'Sức chịu tải của cọc khi chịu nén', '<i>Q</i><sub>a</sub> =', 'kN') +
        oNhapSo('coc.QaKeo', 'Sức chịu tải của cọc khi chịu kéo (nhập độ lớn)', "<i>Q</i><sub>a</sub>' =", 'kN') +
        oNhapSo('coc.D', 'Đường kính cọc', '<i>D</i> =', 'm') +
        '</div><p class="hint">Tạm nhập tay. Ở giai đoạn 4, Q<sub>a</sub> và Q<sub>a</sub>\' sẽ tự lấy từ phần tính sức chịu tải cọc ' +
        '(Excel: \'SCT Coc nhoi FULL\'!N268 và N277).</p></section>' +
        '<section class="card"><h2>Tọa độ từng cọc</h2>' +
        '<div class="table-wrap"><table class="tbl tbl-nhap"><thead><tr><th>Cọc</th><th>x<sub>i</sub> (m)</th><th>y<sub>i</sub> (m)</th><th></th></tr></thead>' +
        '<tbody>' + dong1 + '</tbody></table></div>' +
        '<p><button type="button" class="btn btn-ghost" data-action="them-coc"' +
        (toaDo.length >= MCT.calc.SO_COC_TOI_DA ? ' disabled' : '') + '>+ Thêm cọc</button></p>' +
        '<p class="hint">Số cọc n lấy theo số dòng tọa độ (tối đa ' + MCT.calc.SO_COC_TOI_DA + ' cọc như Excel).</p></section>';
    },
    ketQua: function () {
      var r = kqB;
      if (!r || !r.hopLe) return loiHtml(ketQua) + loiHtml(r);
      var bang = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Cọc</th><th>x<sub>i</sub></th><th>y<sub>i</sub></th>' +
        '<th>α<sub>i</sub></th><th>P<sub>imax</sub></th><th>P<sub>imin</sub></th></tr>' +
        '<tr class="units"><th></th><th>m</th><th>m</th><th>độ</th><th>kN</th><th>kN</th></tr></thead><tbody>' +
        r.coc.map(function (c) {
          return '<tr' + (c.Pimax === r.Pmax || c.Pimin === r.Pmin ? ' class="hi"' : '') + '><td class="c">' + c.stt + '</td>' +
            '<td class="r">' + so(c.x) + '</td><td class="r">' + so(c.y) + '</td><td class="r">' + so(c.alpha) + '</td>' +
            '<td class="r">' + so(c.Pimax) + '</td><td class="r">' + so(c.Pimin) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

      var chiTiet = '<details class="more"><summary>Chi tiết từng thành phần (làm việc / không làm việc)</summary>' +
        '<div class="table-wrap" style="margin-top:10px"><table class="tbl compact"><thead><tr><th rowspan="2">Cọc</th>' +
        '<th colspan="3">Khi cẩu làm việc</th><th colspan="3">Khi cẩu không làm việc</th></tr>' +
        '<tr><th>N<sub>tt</sub>/n</th><th>M·cosα·|x|/Σx²</th><th>M·sinα·|y|/Σy²</th>' +
        '<th>N<sub>tt</sub>/n</th><th>M·cosα·|x|/Σx²</th><th>M·sinα·|y|/Σy²</th></tr></thead><tbody>' +
        r.coc.map(function (c) {
          return '<tr><td class="c">' + c.stt + '</td><td class="r">' + so(c.lv.Pn) + '</td><td class="r">' + so(c.lv.Mx) +
            '</td><td class="r">' + so(c.lv.My) + '</td><td class="r">' + so(c.klv.Pn) + '</td><td class="r">' + so(c.klv.Mx) +
            '</td><td class="r">' + so(c.klv.My) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="hint">Σx<sub>i</sub>² = ' + so(r.sumX2, 4) + ' m²; Σy<sub>i</sub>² = ' + so(r.sumY2, 4) + ' m²</p></details>';

      return loiHtml(ketQua) +
        '<section class="card"><h2>Tải trọng</h2>' +
        '<p>Tải trọng tác dụng lên cọc lớn nhất khi tay cần xoay theo phương đi qua tim cọc. ' +
        'Ở đây, tải trọng lớn nhất và nhỏ nhất tác dụng lên từng cọc có thể tính theo công thức:</p>' +
        '<div class="formula"><i>P</i><sub>imax/imin</sub> = <i>N</i><sub>tt</sub>/<i>n</i> ± ' +
        '<i>M</i>·cosα·<i>x</i><sub>max</sub>/Σ<i>x</i><sub>i</sub>² ± <i>M</i>·sinα·<i>y</i><sub>max</sub>/Σ<i>y</i><sub>i</sub>²</div>' +
        '<p class="hint">Tính cho cả 2 trường hợp cẩu làm việc và không làm việc, lấy giá trị bất lợi. ' +
        'Số cọc trong đài n = ' + r.n + ' cọc.</p>' +
        '<div class="coc-layout">' + soDoCoc() + '<div class="coc-bang">' + bang + chiTiet + '</div></div></section>' +
        '<section class="card"><h2>Tải trọng lớn nhất và nhỏ nhất tác dụng lên cọc</h2>' +
        '<div class="table-wrap"><table class="tbl kiem-tra"><tbody>' +
        '<tr><td><i>P</i><sub>max</sub> = ' + so(r.Pmax) + ' kN</td><td class="c">' + (r.Pmax <= r.Qa ? '≤' : '>') +
        '</td><td><i>Q</i><sub>a</sub> = ' + so(r.Qa) + ' kN</td><td class="c">' + nhanKetLuan(r.kiemTraNen.ok) + '</td>' +
        '<td class="r muted">Q<sub>a</sub>/P<sub>max</sub> = ' + so(r.kiemTraNen.heSo, 3) + '</td></tr>' +
        '<tr><td><i>P</i><sub>min</sub> = ' + so(r.Pmin) + ' kN</td><td class="c">' + (r.Pmin >= r.QaKeo ? '≥' : '<') +
        "</td><td><i>Q</i><sub>a</sub>' = " + so(r.QaKeo) + ' kN</td><td class="c">' + nhanKetLuan(r.kiemTraKeo.ok) + '</td>' +
        "<td class=\"r muted\">Q<sub>a</sub>'/P<sub>min</sub> = " + (isFinite(r.kiemTraKeo.heSo) ? so(r.kiemTraKeo.heSo, 3) : '–') +
        '</td></tr></tbody></table></div></section>';
    }
  };

  // ---------------- C. Xuyên thủng đài ----------------
  TRANG.xuyen = {
    tieuDe: 'C. Kiểm tra xuyên thủng cho đài móng',
    moTa: 'Xuyên thủng đài do chân cẩu, tính theo TCVN 5574:2018 mục 8.1.6.2.1. ' +
      'Số liệu lấy từ mục A (đài, vật liệu) và mục B (tọa độ, phản lực cọc).',
    nhap: function () { return ''; },
    ketQua: function () {
      var r = kqC;
      if (!r || !r.hopLe) return loiHtml(ketQua) + loiHtml(kqB) + loiHtml(r);
      var bang = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Cọc</th><th>|x<sub>i</sub>| + D/2</th>' +
        '<th>|y<sub>i</sub>| + D/2</th><th>Vị trí so với đáy tháp xuyên</th><th>P<sub>imax</sub></th><th>Tính vào F</th></tr>' +
        '<tr class="units"><th></th><th>m</th><th>m</th><th>B<sub>xt</sub>/2 = ' + so(r.Bxt / 2) + ' m</th><th>kN</th><th>kN</th></tr></thead><tbody>' +
        r.coc.map(function (c) {
          return '<tr' + (c.trongThap ? '' : ' class="hi"') + '><td class="c">' + c.stt + '</td>' +
            '<td class="r">' + so(c.mepX) + '</td><td class="r">' + so(c.mepY) + '</td>' +
            '<td class="c">' + (c.trongThap ? 'Nằm trong' : '<strong>Nằm ngoài</strong>') + '</td>' +
            '<td class="r">' + so(c.Pimax) + '</td><td class="r">' + so(c.F) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

      var ketLuan = r.baoTrumTatCa
        ? 'Tháp xuyên bao trùm tất cả các đầu cọc nên không xảy ra xuyên thủng (F = 0).'
        : (r.ok ? 'Đài móng đủ khả năng chống xuyên thủng.' : 'Đài móng KHÔNG đủ khả năng chống xuyên thủng.');

      return '<section class="card"><h2>Thông số</h2><div class="params">' +
        dong('Kích thước chân cẩu tháp', '<i>H</i><sub>t</sub> =', so(r.Ht), 'm') +
        dong('Chiều cao đài móng', '<i>H</i> =', so(r.H), 'm') +
        dong('Khoảng cách từ mép đài tới trọng tâm cốt thép', '<i>a</i> =', so(r.a), 'm') +
        dong('Chiều cao làm việc của đài', '<i>h</i><sub>0</sub> = <i>H</i> − <i>a</i> =', so(r.h0), 'm') +
        dong('Đường kính cọc', '<i>D</i> =', so(r.D), 'm') +
        dong('Cường độ chịu kéo tính toán của bê tông', '<i>R</i><sub>bt</sub> =', so(r.Rbt), 'MPa') +
        '</div></section>' +
        '<section class="card"><h2>C.1. Phạm vi tháp xuyên</h2>' +
        '<p>Tháp xuyên tạo bởi các mặt nghiêng 45° đi từ mép chân cẩu tới cao trình cốt thép chịu kéo. ' +
        'Cọc nào không nằm trọn trong đáy tháp xuyên thì phản lực của cọc đó gây xuyên thủng cho đài ' +
        '(lấy toàn bộ phản lực của cọc – thiên về an toàn).</p>' +
        '<div class="formula"><i>B</i><sub>xt</sub> = <i>H</i><sub>t</sub> + 2<i>h</i><sub>0</sub> = ' + so(r.Ht) + ' + 2 × ' +
        so(r.h0) + ' = ' + so(r.Bxt) + ' m</div>' +
        '<div class="coc-layout">' + soDoCoc(r) + '<div class="coc-bang">' + bang +
        '<p class="hint">Cọc nằm trong khi cả |x<sub>i</sub>| + D/2 và |y<sub>i</sub>| + D/2 đều ≤ B<sub>xt</sub>/2. ' +
        'Số cọc nằm ngoài tháp xuyên: ' + r.soCocNgoai + '.</p></div></div></section>' +
        '<section class="card"><h2>C.2. Kiểm tra xuyên thủng</h2>' +
        '<p>Lực gây xuyên thủng bằng tổng phản lực các cọc nằm ngoài tháp xuyên (mômen đã kể đến trong P<sub>imax</sub>):</p>' +
        '<div class="formula"><i>F</i> = Σ<i>P</i><sub>imax</sub> (cọc ngoài tháp xuyên) = ' + so(r.F) + ' kN</div>' +
        '<p>Khả năng chống xuyên thủng của đài (TCVN 5574:2018, mục 8.1.6.2.1), với u là chu vi đường bao tính toán ' +
        'cách mép chân cẩu một khoảng h<sub>0</sub>/2:</p>' +
        '<div class="formula"><i>F</i><sub>b,ult</sub> = <i>R</i><sub>bt</sub> · <i>u</i> · <i>h</i><sub>0</sub>;   ' +
        '<i>u</i> = 4(<i>H</i><sub>t</sub> + <i>h</i><sub>0</sub>)</div>' +
        '<div class="params">' +
        dong('Chu vi đường bao tính toán', '<i>u</i> =', so(r.u), 'm') +
        dong('Diện tích tiết diện tính toán', '<i>A</i><sub>b</sub> = <i>u</i>·<i>h</i><sub>0</sub> =', so(r.Ab), 'm²') +
        dong('Khả năng chống xuyên thủng', '<i>F</i><sub>b,ult</sub> =', so(r.Fbult), 'kN') +
        '</div>' +
        '<div class="table-wrap" style="margin-top:12px"><table class="tbl kiem-tra"><tbody><tr>' +
        '<td><i>F</i> = ' + so(r.F) + ' kN</td><td class="c">' + (r.ok ? '≤' : '>') + '</td>' +
        '<td><i>F</i><sub>b,ult</sub> = ' + so(r.Fbult) + ' kN</td><td class="c">' + nhanKetLuan(r.ok) + '</td>' +
        '</tr></tbody></table></div>' +
        '<p class="ket-luan ' + (r.ok ? 'ok' : 'fail') + '">' + esc(ketLuan) + '</p></section>';
    }
  };

  // ---------------- D. Cốt thép đài ----------------
  var LOP_THEP = [
    { k: 'duoiX', lop: 'Lớp dưới', phuong: 'X' }, { k: 'duoiY', lop: 'Lớp dưới', phuong: 'Y' },
    { k: 'trenX', lop: 'Lớp trên', phuong: 'X' }, { k: 'trenY', lop: 'Lớp trên', phuong: 'Y' }
  ];

  function bangThep(r, keys, coCanhBao) {
    var dau = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Phương</th><th>M<sub>tt</sub></th>' +
      '<th>h<sub>0</sub> (α<sub>m</sub> / A<sub>s</sub>)</th><th>α<sub>m</sub></th><th>ξ</th><th>A<sub>s,cal</sub></th>' +
      '<th>Thép chọn</th><th>A<sub>s,design</sub></th><th>Kiểm tra</th></tr>' +
      '<tr class="units"><th></th><th>kNm/m</th><th>mm</th><th></th><th></th><th>mm²/m</th><th>Ø d a</th>' +
      '<th>mm²/m</th><th></th></tr></thead><tbody>';
    var than = keys.map(function (k) {
      var t = r[k];
      var lech = coCanhBao && t.h0Alpha !== t.h0As;
      var canh = lech ? ' <span class="canh-bao" title="Sai khác so với Excel – xem ghi chú">⚠</span>' : '';
      return '<tr><td class="c">' + k.slice(-1) + '</td><td class="r">' + so(t.M) + '</td>' +
        '<td class="c' + (lech ? ' o-lech' : '') + '">' + so(t.h0Alpha, 0) + ' / ' + so(t.h0As, 0) + canh + '</td>' +
        '<td class="r">' + so(t.alpha, 4) + '</td><td class="r">' + so(t.xi, 4) + '</td>' +
        '<td class="r' + (lech ? ' o-lech' : '') + '">' + (t.duTietDien ? so(t.As) : 'α<sub>m</sub> > 0,5') + canh + '</td>' +
        '<td class="c nowrap">Ø' + so(t.d, 0) + 'a' + so(t.s, 0) + '</td><td class="r">' + so(t.AsChon) + '</td>' +
        '<td class="c">' + nhanKetLuan(t.ok) + '</td></tr>';
    }).join('');
    return dau + than + '</tbody></table></div>';
  }

  function ghiChuThepTren(r) {
    var x = r.trenX.ghiChu, y = r.trenY.ghiChu;
    function kl(As, chon) { return As <= chon ? 'OK' : 'FAIL'; }
    var doiKetLuan = [['trenX', x], ['trenY', y]].some(function (p) {
      var t = r[p[0]];
      return kl(p[1].thongNhatH0a, t.AsChon) !== kl(t.As, t.AsChon) || kl(p[1].thongNhatH050, t.AsChon) !== kl(t.As, t.AsChon);
    });
    return '<aside class="ghi-chu-lech" aria-label="Ghi chú sai khác">' +
      '<h3>⚠ Sai khác trong Excel</h3>' +
      '<p>Ô G82, G83 tính α<sub>m</sub> với h<sub>0</sub> = H − a = <strong>' + so(x.h0Alpha, 0) + ' mm</strong>, ' +
      'nhưng ô I82, I83 tính A<sub>s</sub> với h<sub>0</sub> = H − 50 = <strong>' + so(x.h0As, 0) + ' mm</strong>. ' +
      'App đang tính <strong>giống Excel</strong>.</p>' +
      '<p>Nếu tính thống nhất một giá trị h<sub>0</sub> (mm²/m):</p>' +
      '<table class="tbl compact"><thead><tr><th>h<sub>0</sub></th><th>A<sub>s</sub> X</th><th>A<sub>s</sub> Y</th></tr></thead><tbody>' +
      '<tr><td>Excel (lệch)</td><td class="r">' + so(r.trenX.As) + '</td><td class="r">' + so(r.trenY.As) + '</td></tr>' +
      '<tr><td>' + so(x.h0Alpha, 0) + ' (H − a)</td><td class="r">' + so(x.thongNhatH0a) + '</td><td class="r">' + so(y.thongNhatH0a) + '</td></tr>' +
      '<tr><td>' + so(x.h0As, 0) + ' (H − 50)</td><td class="r">' + so(x.thongNhatH050) + '</td><td class="r">' + so(y.thongNhatH050) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="hint">' + (doiKetLuan ? '<strong>Kết luận kiểm tra THAY ĐỔI</strong> nếu tính thống nhất.' :
        'Kết luận kiểm tra không thay đổi với cả hai cách tính thống nhất.') + '</p></aside>';
  }

  TRANG.thep = {
    tieuDe: 'D. Tính cốt thép cho đài móng',
    moTa: 'Thiên về an toàn, mômen trong đài móng được tính với hàng cọc có phản lực P = Pimax/imin.',
    nhap: function () {
      var rows = LOP_THEP.map(function (l) {
        return '<tr><td>' + l.lop + '</td><td class="c">' + l.phuong + '</td>' +
          '<td>' + oSoBang('thep.' + l.k + '.d', 'Đường kính ' + l.lop + ' ' + l.phuong) + '</td>' +
          '<td>' + oSoBang('thep.' + l.k + '.s', 'Khoảng cách ' + l.lop + ' ' + l.phuong) + '</td></tr>';
      }).join('');
      return '<section class="card"><h2>Thép chọn</h2><div class="table-wrap"><table class="tbl tbl-nhap"><thead><tr>' +
        '<th>Lớp</th><th>Phương</th><th>d (mm)</th><th>a (mm)</th></tr></thead><tbody>' + rows +
        '</tbody></table></div><p class="hint">a là khoảng cách giữa các thanh thép (không phải lớp bảo vệ).</p></section>';
    },
    ketQua: function () {
      var r = kqD;
      if (!r || !r.hopLe) return loiHtml(ketQua) + loiHtml(kqB) + loiHtml(r);
      var canh = '<div class="table-wrap"><table class="tbl"><thead><tr><th rowspan="2">Cọc</th>' +
        '<th colspan="4">Cánh tay đòn l<sub>0</sub> tính từ mép chân cẩu (m)</th><th rowspan="2">P<sub>imax</sub> (kN)</th>' +
        '<th rowspan="2">P<sub>imin</sub> ≤ 0 (kN)</th></tr><tr><th>x dương</th><th>x âm</th><th>y dương</th><th>y âm</th></tr></thead><tbody>' +
        r.canh.map(function (c) {
          return '<tr><td class="c">' + c.stt + '</td><td class="r">' + so(c.xDuong) + '</td><td class="r">' + so(c.xAm) +
            '</td><td class="r">' + so(c.yDuong) + '</td><td class="r">' + so(c.yAm) + '</td><td class="r">' + so(c.Pimax) +
            '</td><td class="r">' + so(c.PiminAm) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

      var congThuc = '<div class="formula">α<sub>m</sub> = <i>M</i> / (<i>R</i><sub>b</sub>·<i>b</i>·<i>h</i><sub>0</sub>²);   ' +
        'ξ = 1 − √(1 − 2α<sub>m</sub>);   <i>A</i><sub>s</sub> = ξ·<i>R</i><sub>b</sub>·<i>b</i>·<i>h</i><sub>0</sub> / <i>R</i><sub>s</sub>;   ' +
        '<i>b</i> = 1000 mm</div>';

      return '<section class="card"><h2>Cánh tay đòn và phản lực cọc</h2>' +
        '<p class="hint">l<sub>0</sub> = max(0; |x<sub>i</sub>| − H<sub>t</sub>/2) theo từng phía, H<sub>t</sub> = ' + so(r.Ht) +
        ' m. Lớp trên chỉ lấy phần P<sub>imin</sub> âm (cọc chịu kéo).</p>' + canh + '</section>' +
        '<section class="card"><h2>Với thép lớp dưới</h2>' +
        '<div class="formula"><i>M</i> = Σ<i>Q</i><sub>tt,i</sub>·<i>l</i><sub>i</sub> = Σ<i>P</i><sub>imax</sub>·<i>l</i><sub>0</sub> / bề rộng đài</div>' +
        congThuc + '<div class="params">' +
        dong('Bê tông / cốt thép', '', '<i>R</i><sub>b</sub> = ' + so(r.Rb) + ' MPa; <i>R</i><sub>s</sub> = ' + so(r.Rs, 0) + ' MPa', '') +
        '</div>' + bangThep(r, ['duoiX', 'duoiY'], false) +
        '<p class="hint">Phương X: mômen chia cho bề rộng Y của đài; phương Y: chia cho chiều dài X.</p></section>' +
        '<section class="card"><h2>Với thép lớp trên</h2>' +
        '<div class="formula"><i>M</i> = Σ<i>Q</i><sub>tt,i</sub>·<i>l</i><sub>i</sub> = Σ<i>P</i><sub>imin</sub>·<i>l</i><sub>0</sub> / bề rộng đài</div>' +
        '<div class="ke-ben"><div>' + bangThep(r, ['trenX', 'trenY'], true) + '</div>' + ghiChuThepTren(r) + '</div></section>' +
        '<p class="ket-luan ' + (r.tatCaOk ? 'ok' : 'fail') + '">' +
        (r.tatCaOk ? 'Cốt thép đài đủ khả năng chịu lực (theo cách tính của Excel).' : 'Cốt thép đài KHÔNG đủ – xem các dòng FAIL.') + '</p>';
    }
  };

  // ---------------- Khung điều hướng ----------------
  function veDanhMuc() {
    $('#sidenav').innerHTML = MUC.map(function (m) {
      if (m.nhom) return '<div class="nav-group">' + esc(m.nhom) + '</div>';
      var cur = m.id === trangHienTai ? ' aria-current="page"' : '';
      return '<button type="button" class="nav-item" data-trang="' + m.id + '"' + cur +
        (m.sapCo ? ' disabled' : '') + '><span class="nav-code">' + esc(m.ma) + '</span><span>' + esc(m.ten) +
        '</span>' + (m.sapCo ? '<span class="nav-soon">' + esc(m.sapCo) + '</span>' : '') + '</button>';
    }).join('');
  }

  function veTrang() {
    var t = TRANG[trangHienTai];
    $('#content').innerHTML = '<h1 class="page-title">' + esc(t.tieuDe) + '</h1>' +
      '<p class="page-lead">' + esc(t.moTa) + '</p>' +
      '<div id="vung-nhap">' + t.nhap() + '</div><div id="vung-ket-qua"></div>';
    veKetQua();
  }

  function veKetQua() {
    var el = $('#vung-ket-qua');
    if (el) el.innerHTML = TRANG[trangHienTai].ketQua();
    $('#brand-sub').textContent = [state.duAn.ten, state.duAn.hangMuc].filter(Boolean).join(' · ');
  }

  function chuyenTrang(id) {
    if (!TRANG[id]) return;
    trangHienTai = id;
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* bỏ qua */ }
    document.body.classList.remove('nav-open');
    veDanhMuc();
    veTrang();
    $('#content').focus();
    window.scrollTo(0, 0);
  }

  function khiNhap(e) {
    var el = e.target;
    var path = el.getAttribute && el.getAttribute('data-bind');
    if (!path) return;
    // Ô chọn chỉ xử lý sự kiện "change", ô gõ chỉ xử lý "input" – tránh tính hai lần.
    if ((el.tagName === 'SELECT') !== (e.type === 'change')) return;
    var v = el.value;
    if (el.getAttribute('data-kieu') === 'so') {
      // Nhận cả "3,678" và "3.678"
      var chuoi = String(v).trim().replace(',', '.');
      var hopLe = chuoi !== '' && /^[-+]?(\d+\.?\d*|\.\d+)$/.test(chuoi);
      el.classList.toggle('loi', !hopLe);
      if (!hopLe) return;
      v = Number(chuoi);
    } else if (path === 'cau.chieuCao') {
      v = Number(v);
    }
    datGiaTri(path, v);

    if (path === 'cau.ten') {
      // Đổi cẩu: giữ chiều cao nếu catalogue mới có; nếu không thì lấy hàng tra gần đúng,
      // hoặc hàng đầu tiên (giống danh sách chọn CapNhatValidationChieuCao trong Excel).
      var cau = MCT.calc.timCau(v);
      if (cau) {
        var hang = MCT.calc.traHang(cau, Number(state.cau.chieuCao)) || cau.hang[0];
        state.cau.chieuCao = hang.h;
      }
      tinh();
      $('#vung-nhap').innerHTML = TRANG.cau.nhap();
    } else {
      tinh();
    }
    veKetQua();
    luu();
  }

  function khoiDong() {
    var hash = (location.hash || '').replace('#', '');
    if (TRANG[hash]) trangHienTai = hash;
    tinh();
    veDanhMuc();
    veTrang();

    window.addEventListener('hashchange', function () {
      var id = (location.hash || '').replace('#', '');
      if (TRANG[id] && id !== trangHienTai) chuyenTrang(id);
    });
    document.addEventListener('input', khiNhap);
    document.addEventListener('change', khiNhap);
    document.addEventListener('click', function (e) {
      var nut = e.target.closest('[data-trang]');
      if (nut && !nut.disabled) chuyenTrang(nut.getAttribute('data-trang'));
      if (e.target.closest('[data-action="toggle-nav"]')) document.body.classList.toggle('nav-open');
      var them = e.target.closest('[data-action="them-coc"]');
      var xoa = e.target.closest('[data-action="xoa-coc"]');
      if ((them && !them.disabled) || (xoa && !xoa.disabled)) {
        var ds = state.coc.toaDo;
        if (them) ds.push({ x: 0, y: 0 });
        else ds.splice(Number(xoa.getAttribute('data-i')), 1);
        tinh();
        $('#vung-nhap').innerHTML = TRANG.coc.nhap();
        veKetQua();
        luu();
        if (them) {
          var oMoi = document.getElementById('in-coc.toaDo.' + (ds.length - 1) + '.x');
          if (oMoi) oMoi.focus();
        }
      }
    });
  }

  MCT.app = { state: function () { return state; }, ketQua: function () { return ketQua; } };
  khoiDong();
})(globalThis.MCT = globalThis.MCT || {});
