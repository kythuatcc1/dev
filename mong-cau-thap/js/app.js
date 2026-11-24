// Giao diện app Móng cẩu tháp
(function (MCT) {
  'use strict';

  var KHOA_LUU = 'mong-cau-thap.du-lieu.v1';

  // Giá trị mặc định: js/mac-dinh.js
  var MAC_DINH = MCT.macDinh;

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
    { id: 'bulong', ma: 'E', ten: 'Bulong neo' },
    { id: 'ket-luan', ma: 'F', ten: 'Kết luận' },
    { nhom: 'Cọc & địa chất' },
    { id: 'dia-chat', ma: '', ten: 'Số liệu địa chất' },
    { id: 'sct', ma: '', ten: 'Sức chịu tải cọc' },
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
  var kqE = null;      // phần E
  var kqF = null;      // kết luận

  function luu() {
    try {
      localStorage.setItem(KHOA_LUU, JSON.stringify(state));
      datTrangThai('Đã lưu trên trình duyệt');
    } catch (e) {
      datTrangThai('Không lưu được trên trình duyệt này');
    }
  }

  var tatCa = null;     // { A, B, C, D, E, F }

  function tinh() {
    tatCa = MCT.calc.tinhTatCa(state);
    ketQua = tatCa.A; kqB = tatCa.B; kqC = tatCa.C; kqD = tatCa.D; kqE = tatCa.E; kqF = tatCa.F;
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
    var dd = d === undefined ? 2 : d;
    if (Math.abs(v) < 0.5 * Math.pow(10, -dd)) v = 0;   // tránh "-0,0"
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

  function oChon(path, luaChon, nhan, ky, donVi, laSo, veLai) {
    var v = String(layGiaTri(path));
    var opts = luaChon.map(function (o) {
      var val = typeof o === 'object' ? o.v : o;
      var txt = typeof o === 'object' ? o.t : o;
      return '<option value="' + esc(val) + '"' + (String(val) === v ? ' selected' : '') + '>' + esc(txt) + '</option>';
    }).join('');
    return '<div class="lbl"><label for="in-' + path + '">' + nhan + '</label></div>' +
      '<div class="val"><span class="sym">' + (ky || '') + '</span>' +
      '<select class="in" id="in-' + path + '" data-bind="' + path + '"' + (laSo ? ' data-kieu="so-chon"' : '') + (veLai ? ' data-ve-lai="1"' : '') + '>' +
      opts + '</select>' +
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
    tieuDe: 'Thông tin dự án và thuyết minh',
    moTa: 'Thông tin in ở trang bìa, khung tiêu đề, trang ký và chương I của thuyết minh.',
    nhap: function () {
      function oChu(path, nhan) {
        return '<div class="field"><label for="in-' + path + '">' + nhan + '</label>' +
          '<input class="in wide" type="text" id="in-' + path + '" data-bind="' + path + '" value="' +
          esc(layGiaTri(path)) + '"></div>';
      }
      function oDoan(path, nhan, dong, goiY) {
        return '<div class="field field-wide"><label for="in-' + path + '">' + nhan + '</label>' +
          '<textarea class="in wide" rows="' + (dong || 3) + '" id="in-' + path + '" data-bind="' + path + '">' +
          esc(layGiaTri(path)) + '</textarea>' + (goiY ? '<span class="hint">' + goiY + '</span>' : '') + '</div>';
      }
      return '<section class="card"><h2>Thông tin chung</h2><div class="grid-2">' +
        oChu('duAn.ten', 'Dự án') + oChu('duAn.goiThau', 'Gói thầu') +
        oChu('duAn.diaDiem', 'Địa điểm') + oChu('duAn.hangMuc', 'Hạng mục kiểm tra') +
        oChu('duAn.tenMong', 'Tên móng cẩu (ví dụ CT1)') + oChu('duAn.trangThai', 'Trạng thái hồ sơ (ô phải khung tiêu đề)') +
        '</div></section>' +
        '<section class="card"><h2>Các đơn vị (trang ký)</h2><div class="grid-2">' +
        oChu('duAn.chuDauTu', 'Chủ đầu tư') + oChu('duAn.tuVanGiamSat', 'Tư vấn giám sát') +
        oChu('duAn.nhaThau', 'Nhà thầu') + oChu('duAn.donViThamTra', 'Đơn vị thẩm tra') +
        '</div></section>' +
        '<section class="card"><h2>Nội dung chương I</h2><div class="grid-2">' +
        oDoan('baoCao.moTaThem', 'Mô tả móng (sau câu "Móng cẩu tháp được đỡ … cọc khoan nhồi có đường kính D…mm.")', 3) +
        oDoan('baoCao.coSo', 'Phần 1 – Cơ sở tính toán', 4, 'Mỗi dòng là một gạch đầu dòng.') +
        oDoan('baoCao.tieuChuan', 'Phần 2 – Tiêu chuẩn tham khảo', 4, 'Mỗi dòng là một gạch đầu dòng.') +
        oDoan('baoCao.phanMem', 'Phần 2 – Phần mềm áp dụng', 2, 'Mỗi dòng là một gạch đầu dòng.') +
        oDoan('baoCao.ghiChuGio', 'Phần 3 – Ghi chú tải trọng gió (in nghiêng)', 4) +
        '</div><div class="params" style="margin-top:12px">' +
        oNhapSo('baoCao.taiToiDa', 'Tải tối đa của cẩu (Bảng 3.2)', '', 'T') +
        oNhapSo('baoCao.taiDauCan', 'Tải đầu cần (Bảng 3.2)', '', 'T') +
        '</div></section>' +
        '<section class="card"><h2>Xuất thuyết minh</h2><p>File Word (.docx) trình bày theo thuyết minh mẫu MD3-1: trang bìa, ' +
        'khung tiêu đề, trang ký, mục lục, chương I và chương II. Hình mặt bằng và catalogue cẩu để ô trống, bạn dán hình vào trong Word.</p>' +
        '<p><button type="button" class="btn" data-action="xuat-tm">Xuất thuyết minh (.docx)</button></p>' +
        '<p class="hint">Khi mở file, Word hỏi cập nhật trường dữ liệu: chọn <strong>Yes</strong> để điền mục lục.</p></section>';
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
    var D = Number(state.sct.D) || 0.8;
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
      var tuDong = state.coc.nguonQa !== 'nhap';
      var S = tatCa && tatCa.SCT;
      var khoiQa = tuDong
        ? dong('Sức chịu tải của cọc khi chịu nén (N<sub>c,d</sub>)', '<i>Q</i><sub>a</sub> =', S && S.hopLe ? so(S.Ncd) : '–', 'kN') +
          dong('Sức chịu tải của cọc khi chịu kéo (N<sub>t,d</sub>)', "<i>Q</i><sub>a</sub>' =", S && S.hopLe ? so(-S.Ntd) : '–', 'kN')
        : oNhapSo('coc.Qa', 'Sức chịu tải của cọc khi chịu nén', '<i>Q</i><sub>a</sub> =', 'kN') +
          oNhapSo('coc.QaKeo', 'Sức chịu tải của cọc khi chịu kéo (nhập độ lớn)', "<i>Q</i><sub>a</sub>' =", 'kN');
      return '<section class="card"><h2>Sức chịu tải của cọc</h2><div class="params">' +
        oChon('coc.nguonQa', [{ v: 'tu-dong', t: 'Tự động – lấy từ phần sức chịu tải cọc' }, { v: 'nhap', t: 'Nhập tay' }],
          'Nguồn số liệu Q<sub>a</sub>, Q<sub>a</sub>\'', '', '', false, true) +
        khoiQa +
        dong('Đường kính cọc (nhập ở trang Sức chịu tải cọc)', '<i>D</i> =', so(Number(state.sct.D), 2), 'm') +
        '</div><p class="hint">' + (tuDong
          ? 'Giống Excel: Q<sub>a</sub> = \'SCT Coc nhoi FULL\'!N268, Q<sub>a</sub>\' = −N277. Nếu phần sức chịu tải cọc còn lỗi, app dùng giá trị nhập tay.'
          : 'Đang dùng giá trị nhập tay thay cho kết quả tính sức chịu tải cọc.') + '</p></section>' +
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

  // ---------------- E. Bulong neo ----------------
  function dongKiemTra(trai, dau, phai, ok) {
    return '<div class="table-wrap"><table class="tbl kiem-tra"><tbody><tr><td>' + trai + '</td><td class="c">' + dau +
      '</td><td>' + phai + '</td><td class="c">' + nhanKetLuan(ok) + '</td></tr></tbody></table></div>';
  }

  function ghiChuLech(tieuDe, noiDung) {
    return '<aside class="ghi-chu-lech" aria-label="Ghi chú sai khác"><h3>⚠ ' + tieuDe + '</h3>' + noiDung + '</aside>';
  }

  TRANG.bulong = {
    tieuDe: 'E. Kiểm tra bulong neo',
    moTa: 'Bulong neo chân cẩu tháp theo TCVN 5575:2024 và TCVN 5574:2018. Lực lấy từ catalogue cẩu (mục A).',
    nhap: function () {
      var VL = MCT.data.vatLieu;
      var dsD = VL.bulongDuongKinh.map(function (b) { return { v: b.d, t: 'M' + b.d }; });
      var dsCap = VL.bulongCapBen.filter(function (b) { return typeof b.fvb === 'number' && typeof b.fyb === 'number'; })
        .map(function (b) { return { v: b.cap, t: so(b.cap, 1) }; });
      return '<section class="card"><h2>Số liệu nhập: bulong</h2><div class="params">' +
        oChon('bulong.d', dsD, 'Đường kính bulong', '<i>d</i><sub>bl</sub> =', 'mm', true) +
        oChon('bulong.loai', MCT.calc.LOAI_BULONG, 'Chất lượng, độ chính xác bulong') +
        oChon('bulong.capBen', dsCap, 'Cấp độ bền bulong', 'Grade =', '', true) +
        oNhapSo('bulong.fcb', 'Cường độ chịu ép mặt của bulong', '<i>f</i><sub>cb</sub> =', 'MPa') +
        oNhapSo('bulong.n', 'Số lượng bulong (1 chân cẩu)', '<i>n</i> =', 'con') +
        '</div></section>' +
        '<section class="card"><h2>Số liệu nhập: chiều dài và hệ số</h2><div class="params">' +
        oNhapSo('bulong.L1L2', 'Tổng chiều dài của bulong (bao gồm cả đoạn bẻ móc)', '<i>L</i><sub>1</sub>+<i>L</i><sub>2</sub> =', 'mm') +
        oNhapSo('bulong.L2', 'Chiều dài đoạn bulong bẻ móc', '<i>L</i><sub>2</sub> =', 'mm') +
        oNhapSo('bulong.L3', 'Chiều dài đoạn bulong trên mặt móng', '<i>L</i><sub>3</sub> =', 'mm') +
        oNhapSo('bulong.eta1', 'Hệ số η<sub>1</sub> (bulong trơn)', 'η<sub>1</sub> =', '') +
        oNhapSo('bulong.eta2', 'Hệ số η<sub>2</sub> (d<sub>bl</sub> ≥ 36 mm)', 'η<sub>2</sub> =', '') +
        oNhapSo('bulong.alpha1', 'Hệ số α<sub>1</sub> (bulong trơn có móc, chịu kéo)', 'α<sub>1</sub> =', '') +
        oNhapSo('bulong.k0', 'Hệ số tải trọng (tải trọng động)', '<i>k</i><sub>0</sub> =', '') +
        oNhapSo('bulong.nv', 'Số lượng mặt cắt tính toán', '<i>n</i><sub>v</sub> =', '') +
        '</div><p class="hint">α<sub>1</sub> chỉ để hiển thị như trong Excel, không tham gia công thức nào.</p></section>';
    },
    ketQua: function () {
      var r = kqE;
      if (!r || !r.hopLe) return loiHtml(ketQua) + loiHtml(r);
      var g = r.ghiChu;
      var e1 = '<section class="card"><h2>E.1. Đặc trưng bulong</h2><div class="params">' +
        dong('Diện tích danh định bulong', '<i>A</i> =', so(r.A), 'cm²') +
        dong('Diện tích giảm yếu bulong', '<i>A</i><sub>bn</sub> =', so(r.Abn), 'cm²') +
        dong('Cường độ chịu cắt của bulong', '<i>f</i><sub>vb</sub> =', so(r.fvb, 0), 'MPa') +
        dong('Cường độ chịu kéo của bulong (0,8·f<sub>yb</sub>)', '<i>f</i><sub>ba</sub> =', so(r.fba, 0), 'MPa') +
        dong('Hệ số điều kiện làm việc của bulong', 'γ<sub>b</sub> =', so(r.gammaB, 1), '') +
        '</div></section>';

      var e2 = '<section class="card"><h2>E.2. Kiểm tra chiều dài bulong</h2><div class="ke-ben"><div>' +
        '<div class="params">' +
        dong('Chiều dài của bulong nằm trong bê tông', '<i>L</i><sub>1</sub> =', so(r.L1, 0), 'mm') +
        dong('Chiều dài đoạn bulong bẻ móc', '<i>L</i><sub>2</sub> =', so(r.L2, 0), 'mm') +
        '</div><p>Chiều dài neo yêu cầu của bulong (Bảng L.1, CT L.10 TCVN 5575:2024):</p>' +
        '<div class="formula"><i>H</i><sub>0</sub> = 25<i>d</i><sub>bl</sub>·<i>m</i><sub>1</sub>·<i>m</i><sub>2</sub>;  ' +
        '<i>m</i><sub>1</sub> = <i>R</i><sub>bt</sub>(B12,5)/<i>R</i><sub>bt</sub> = 0,66/' + so(r.Rbt) + ';  ' +
        '<i>m</i><sub>2</sub> = <i>f</i><sub>yb</sub>/235</div><div class="params">' +
        dong('Chiều dài neo yêu cầu', '<i>H</i><sub>0</sub> =', so(r.H0), 'mm') + '</div>' +
        dongKiemTra('<i>H</i><sub>0</sub> = ' + so(r.H0) + ' mm', r.kiemTra.neo ? '≤' : '>',
          '<i>L</i><sub>1</sub> + <i>L</i><sub>2</sub> = ' + so(r.L1L2, 0) + ' mm', r.kiemTra.neo) + '</div>' +
        ghiChuLech('Ô phụ trong Excel', '<p>Ô P102 (ngoài vùng in) có tính chiều dài neo theo cách khác: ' +
          '<i>l</i> = f<sub>ba</sub>·A<sub>bn</sub> / (π·d·η<sub>1</sub>·η<sub>2</sub>·R<sub>bt</sub>) = <strong>' + so(g.neoP102.l0an, 1) +
          ' mm</strong>, nhưng Excel không dùng giá trị này.</p><p>So với L<sub>1</sub> + L<sub>2</sub> = ' + so(r.L1L2, 0) + ' mm: ' +
          (g.neoP102.ok ? 'vẫn đạt.' : '<strong>không đạt</strong> nếu kiểm tra theo cách này.') + '</p>') +
        '</div></section>';

      var e3 = '<section class="card"><h2>E.3. Kiểm tra bulong chịu kéo</h2><div class="params">' +
        dong('Lực nhổ lớn nhất theo catalogue tại 1 chân cẩu tháp', '<i>P</i><sub>ct</sub> =', so(r.Pct), 'kN') +
        dong('Lực nhổ tính toán lớn nhất tại 1 chân cẩu tháp (×n = ' + so(r.nHs, 1) + ')', '<i>P</i><sub>t</sub> =', so(r.Pt), 'kN') +
        dong('Lực nhổ tính toán lớn nhất tại 1 bulong', '<i>P</i><sub>t</sub>/1bl =', so(r.Pt1), 'kN') +
        '</div><p>Khả năng chịu kéo của 1 bulong neo (mục L.4.2, Phụ lục L TCVN 5575:2024), hệ số tải trọng k<sub>0</sub> = ' +
        so(r.k0) + ':</p><div class="formula">[<i>N</i>]<sub>tb</sub> = <i>f</i><sub>ba</sub>·<i>A</i><sub>bn</sub> / <i>k</i><sub>0</sub> = ' +
        so(r.Ntb) + ' kN</div>' +
        dongKiemTra('<i>P</i><sub>t</sub>/1bl = ' + so(r.Pt1) + ' kN', r.kiemTra.keo ? '<' : '≥', '[<i>N</i>]<sub>tb</sub> = ' + so(r.Ntb) + ' kN', r.kiemTra.keo) +
        '</section>';

      var e4 = '<section class="card"><h2>E.4. Kiểm tra bulong chịu tuột</h2><div class="params">' +
        dong('Cường độ bám dính tính toán (CT 256, mục 10.3.5.4 TCVN 5574:2018)', '<i>R</i><sub>bond</sub> = η<sub>1</sub>η<sub>2</sub><i>R</i><sub>bt</sub> =', so(r.Rbond, 3), 'MPa') +
        '</div><p>Khả năng chịu tuột của 1 bulong (mục 10.3.5.6 TCVN 5574:2018):</p>' +
        '<div class="formula">[<i>N</i>] = π·<i>d</i><sub>bl</sub>·(<i>L</i><sub>1</sub> + <i>L</i><sub>2</sub>)·<i>R</i><sub>bond</sub> = ' + so(r.Ntuot) + ' kN</div>' +
        dongKiemTra('<i>P</i><sub>t</sub>/1bl = ' + so(r.Pt1) + ' kN', r.kiemTra.tuot ? '<' : '≥', '[<i>N</i>] = ' + so(r.Ntuot) + ' kN', r.kiemTra.tuot) +
        '</section>';

      var mx = g.momenXoan;
      var e5 = '<section class="card"><h2>E.5. Kiểm tra bulong chịu cắt</h2><div class="ke-ben"><div>' +
        '<p>Lực cắt lớn nhất tại 1 chân cẩu tháp theo catalogue:</p>' +
        '<div class="formula">Khi cẩu làm việc: <i>P</i><sub>stc1</sub> = ' + esc(r.nhanFh) + '/2 + ' + esc(r.nhanT) + '/H<sub>t</sub> = ' +
        so(r.FhLv) + '/2 + ' + so(r.T) + '/' + so(r.Ht) + ' = ' + so(r.Pstc1, 3) + ' kN<br>' +
        'Khi cẩu không làm việc: <i>P</i><sub>stc2</sub> = ' + esc(r.nhanFh) + '/2 = ' + so(r.FhKlv) + '/2 = ' + so(r.Pstc2, 3) + ' kN</div>' +
        '<div class="params">' +
        dong('Lực cắt tiêu chuẩn lớn nhất tại 1 chân cẩu tháp', '<i>P</i><sub>stc</sub> =', so(r.Pstc, 3), 'kN') +
        dong('Lực cắt tính toán lớn nhất tại 1 chân cẩu tháp', '<i>P</i><sub>s</sub> =', so(r.Ps), 'kN') +
        dong('Lực cắt tính toán lớn nhất tại 1 bulong', '<i>P</i><sub>s</sub>/1bl =', so(r.Ps1), 'kN') +
        '</div><p>Khả năng chịu cắt của 1 bulong (CT 186, mục 14.2.9 TCVN 5575:2024):</p>' +
        '<div class="formula">[<i>N</i>]<sub>vb</sub> = <i>f</i><sub>vb</sub>·γ<sub>b</sub>·<i>A</i>·<i>n</i><sub>v</sub> = ' + so(r.Nvb) + ' kN</div>' +
        dongKiemTra('<i>P</i><sub>s</sub>/1bl = ' + so(r.Ps1) + ' kN', r.kiemTra.cat ? '<' : '≥', '[<i>N</i>]<sub>vb</sub> = ' + so(r.Nvb) + ' kN', r.kiemTra.cat) +
        '</div>' +
        ghiChuLech('Mômen xoắn T trong Excel', '<p>Excel lấy T từ ô cố định <strong>Solieu!E111</strong> (= ' + so(mx.TExcel) +
          ' kNm, của cẩu LLT5020-10) cho <em>mọi</em> loại cẩu. App lấy T của đúng cẩu đang chọn.</p>' +
          (mx.lech
            ? '<p><strong>Cẩu đang chọn có T = ' + so(mx.TApp) + ' kNm</strong>, khác Excel. Nếu dùng T của Excel: P<sub>stc1</sub> = ' +
              so(mx.Pstc1Excel, 3) + ' kN, P<sub>s</sub>/1bl = ' + so(mx.PsExcel) + ' kN.</p>'
            : '<p>Cẩu đang chọn là LLT5020-10 nên kết quả <strong>giống hệt Excel</strong>.</p>')) +
        '</div></section>';

      var e6 = '<section class="card"><h2>E.6. Kiểm tra bulong chịu ép mặt</h2><div class="params">' +
        dong('Lực ép mặt tính toán lớn nhất tại 1 bulong', '<i>P</i><sub>s</sub>/1bl =', so(r.Ps1), 'kN') +
        dong('Tổng chiều dày các bản thép cùng trượt về một phía', 'Σ<i>t</i> =', so(r.tongT, 0), 'mm') +
        '</div><p>Khả năng chịu ép mặt của 1 bulong (CT 187, mục 14.2.9 TCVN 5575:2024):</p>' +
        '<div class="formula">[<i>N</i>]<sub>cb</sub> = <i>f</i><sub>cb</sub>·γ<sub>b</sub>·<i>d</i>·Σ<i>t</i> = ' + so(r.Ncb) + ' kN</div>' +
        dongKiemTra('<i>P</i><sub>s</sub>/1bl = ' + so(r.Ps1) + ' kN', r.kiemTra.epMat ? '<' : '≥', '[<i>N</i>]<sub>cb</sub> = ' + so(r.Ncb) + ' kN', r.kiemTra.epMat) +
        '</section>';

      var e7 = '<section class="card"><h2>E.7. Kiểm tra chọc thủng của 1 cụm bulong</h2><div class="ke-ben"><div><div class="params">' +
        dong('Đường kính đáy bé tháp chọc thủng', '<i>D</i><sub>1</sub> =', so(r.D1), 'm') +
        dong('Đường kính đáy lớn tháp chọc thủng', '<i>D</i><sub>2</sub> = <i>D</i><sub>1</sub> + 2<i>L</i><sub>1</sub> =', so(r.D2), 'm') +
        dong('Lực gây chọc thủng của 1 cụm bulong', '<i>P</i><sub>xt</sub> = <i>P</i><sub>t</sub> =', so(r.Pxt), 'kN') +
        '</div><p>Khả năng chống chọc thủng của 1 cụm bulong (mục 8.1.6.2.1 TCVN 5574:2018):</p>' +
        '<div class="formula">[<i>P</i>]<sub>xt</sub> = <span class="o-lech-inline">0,4 ×</span> <i>R</i><sub>bt</sub>·<i>L</i><sub>1</sub>·π(<i>D</i><sub>1</sub> + <i>D</i><sub>2</sub>)/2 = ' +
        so(r.PxtGh) + ' kN <span class="canh-bao" title="Sai khác so với Excel – xem ghi chú">⚠</span></div>' +
        dongKiemTra('<i>P</i><sub>xt</sub> = ' + so(r.Pxt) + ' kN', r.kiemTra.chocThung ? '<' : '≥', '[<i>P</i>]<sub>xt</sub> = ' + so(r.PxtGh) + ' kN', r.kiemTra.chocThung) +
        '</div>' +
        ghiChuLech('Hệ số 0,4 không ghi trong công thức', '<p>Ô L141 nhân thêm <strong>0,4</strong>, nhưng dòng công thức in ra thuyết minh trong Excel chỉ ghi ' +
          '"[P]xt = Rbt·u·h0 = Rbt·L1·π(D1+D2)/2". App tính giống Excel (có 0,4) và hiện rõ hệ số này trong công thức.</p>' +
          '<p>Nếu bỏ hệ số 0,4: [P]<sub>xt</sub> = ' + so(g.chocThung.PxtKhong04) + ' kN.</p>') +
        '</div></section>';

      return loiHtml(ketQua) + e1 + e2 + e3 + e4 + e5 + e6 + e7 +
        '<p class="ket-luan ' + (r.tatCaOk ? 'ok' : 'fail') + '">' +
        (r.tatCaOk ? 'Bulong neo đạt cả 6 kiểm tra (theo cách tính của Excel).' : 'Bulong neo KHÔNG đạt – xem các dòng FAIL.') + '</p>';
    }
  };

  // ---------------- F. Kết luận ----------------
  function soCoDonVi(o) {
    var d = o.dv === 'mm' ? 0 : 2;
    return '<i>' + esc(o.k) + '</i> = ' + so(o.v, d) + ' ' + esc(o.dv);
  }

  TRANG['ket-luan'] = {
    tieuDe: 'F. Kết luận',
    moTa: 'Tổng hợp các kiểm tra của sheet Cau thap.',
    nhap: function () { return ''; },
    ketQua: function () {
      var r = kqF;
      if (!r || !r.hopLe) return loiHtml(r);
      var nhomTruoc = '';
      var rows = r.ds.map(function (m) {
        var dauNhom = m.ma !== nhomTruoc ? '<td class="c o-nhom" rowspan="' +
          r.ds.filter(function (x) { return x.ma === m.ma; }).length + '"><button type="button" class="link" data-trang="' +
          m.trang + '">' + m.ma + '</button></td>' : '';
        nhomTruoc = m.ma;
        return '<tr' + (m.ok ? '' : ' class="dong-fail"') + '>' + dauNhom +
          '<td>' + esc(m.ten) + (m.boSung ? ' <span class="nhan-bo-sung" title="Excel không có kiểm tra này">app bổ sung</span>' : '') + '</td>' +
          '<td class="r nowrap">' + soCoDonVi(m.trai) + '</td><td class="c">' + m.dau + '</td>' +
          '<td class="r nowrap">' + soCoDonVi(m.phai) + '</td><td class="c">' + nhanKetLuan(m.ok) + '</td>' +
          '<td class="c muted">' + (m.oExcel || '–') + '</td></tr>';
      }).join('');
      var bang = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Mục</th><th>Kiểm tra</th><th>Giá trị</th><th></th>' +
        '<th>Giới hạn</th><th>Kết quả</th><th>Ô Excel</th></tr></thead><tbody>' + rows + '</tbody></table></div>';

      var ghiChu = ghiChuLech('Khác với ô D143 của Excel',
        '<p>Công thức kết luận của Excel (ô D143) chỉ gồm <strong>12 kiểm tra</strong> của mục B, D, E, vì Excel không tính xuyên thủng đài.</p>' +
        '<p>App <strong>bổ sung mục C</strong> (xuyên thủng đài, TCVN 5574:2018 mục 8.1.6.2.1) vào kết luận chung.</p>' +
        '<p>Kết luận theo đúng Excel (không có mục C): <strong>' + esc(r.ketLuanExcel) + '</strong>' +
        (r.okExcel === r.ok ? ' – giống kết luận của app.' : ' – <strong>khác</strong> kết luận của app.') + '</p>');

      return '<div class="ket-luan-lon ' + (r.ok ? 'ok' : 'fail') + '">' + esc(r.ketLuan) +
        (r.ok ? '' : '<span>' + r.soFail + ' kiểm tra không đạt</span>') + '</div>' + ghiChu +
        '<section class="card" style="margin-top:18px"><h2>Tổng hợp các kiểm tra</h2>' + bang +
        '<p class="hint">Bấm chữ cái ở cột "Mục" để mở trang chi tiết. Ô Excel là ô chứa kết quả OK/FAIL tương ứng trong sheet Cau thap.</p></section>';
    }
  };

  // ---------------- Số liệu địa chất ----------------
  var LOAI_DAT = ['Cát', 'Cát pha', 'Sét', 'Sét pha'];
  var TINH_CHAT = ['', 'Rời', 'Chặt vừa', 'Chặt'];
  var KICH_THUOC = ['', 'Bụi', 'Nhỏ', 'Vừa', 'Thô', 'Sạn'];

  function oChuBang(path, nhan, rong) {
    return '<input class="in" type="text" style="width:' + (rong || 70) + 'px" aria-label="' + esc(nhan) + '" id="in-' + path +
      '" data-bind="' + path + '" value="' + esc(layGiaTri(path)) + '">';
  }
  function oChonBang(path, ds, nhan, veLai, tat) {
    var v = String(layGiaTri(path) == null ? '' : layGiaTri(path));
    return '<select class="in" aria-label="' + esc(nhan) + '" id="in-' + path + '" data-bind="' + path + '"' +
      (veLai ? ' data-ve-lai="1"' : '') + (tat ? ' disabled' : '') + '>' +
      ds.map(function (o) { return '<option value="' + esc(o) + '"' + (o === v ? ' selected' : '') + '>' + esc(o || '–') + '</option>'; }).join('') +
      '</select>';
  }

  // Biểu đồ SPT theo độ sâu (SVG) – ranh giới lớp và mực nước ngầm
  function bieuDoSPT(dc) {
    var ds = dc.sptTheoDoSau;
    if (!ds.length) return '';
    var W = 360, H = 520, l = 46, r = 14, t = 38, b = 16;
    var sMax = Math.max(10, Math.ceil(Math.max.apply(null, ds.map(function (x) { return x.spt; })) / 10) * 10);
    var zMin = Math.min(dc.caoDoDay, ds[ds.length - 1].doSau);
    var X = function (v) { return l + v / sMax * (W - l - r); };
    var Y = function (z) { return t + (0 - z) / (0 - zMin) * (H - t - b); };
    var svg = '<svg class="bieu-do-spt" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Biểu đồ SPT theo độ sâu">';
    for (var v = 0; v <= sMax; v += 10) {
      svg += '<line x1="' + X(v) + '" y1="' + t + '" x2="' + X(v) + '" y2="' + (H - b) + '" class="bd-luoi"/>' +
        '<text x="' + X(v) + '" y="' + (t - 6) + '" class="bd-chu" text-anchor="middle">' + v + '</text>';
    }
    dc.lop.forEach(function (lp) {
      svg += '<line x1="' + l + '" y1="' + Y(lp.dinh) + '" x2="' + (W - r) + '" y2="' + Y(lp.dinh) + '" class="bd-lop"/>' +
        '<text x="' + (W - r - 4) + '" y="' + (Y(lp.dinh) + 13) + '" class="bd-chu" text-anchor="end">Lớp ' + esc(lp.ten) + '</text>' +
        '<text x="' + (l - 6) + '" y="' + (Y(lp.dinh) + 4) + '" class="bd-chu" text-anchor="end">' + so(lp.dinh, 1) + '</text>';
    });
    svg += '<line x1="' + l + '" y1="' + Y(dc.caoDoDay) + '" x2="' + (W - r) + '" y2="' + Y(dc.caoDoDay) + '" class="bd-lop"/>' +
      '<text x="' + (l - 6) + '" y="' + (Y(dc.caoDoDay) + 4) + '" class="bd-chu" text-anchor="end">' + so(dc.caoDoDay, 1) + '</text>';
    if (isFinite(dc.MNN)) {
      svg += '<line x1="' + l + '" y1="' + Y(dc.MNN) + '" x2="' + (W - r) + '" y2="' + Y(dc.MNN) + '" class="bd-mnn"/>' +
        '<text x="' + (l + 4) + '" y="' + (Y(dc.MNN) - 4) + '" class="bd-chu bd-chu-mnn">MNN ' + so(dc.MNN, 1) + '</text>';
    }
    svg += '<polyline class="bd-duong" points="' + ds.map(function (x) { return X(x.spt) + ',' + Y(x.doSau); }).join(' ') + '"/>';
    ds.forEach(function (x) { svg += '<circle cx="' + X(x.spt) + '" cy="' + Y(x.doSau) + '" r="2.6" class="bd-diem"/>'; });
    svg += '<text x="' + ((l + W - r) / 2) + '" y="13" class="bd-chu" text-anchor="middle">Chỉ số SPT (N)</text></svg>';
    return '<figure class="so-do-wrap">' + svg + '<figcaption>Biểu đồ SPT – hố khoan ' + esc(dc.hoKhoan) +
      '. Trục đứng: cao độ (m); nét đứt xanh: mực nước ngầm.</figcaption></figure>';
  }

  TRANG['dia-chat'] = {
    tieuDe: 'Số liệu địa chất',
    moTa: 'Lớp đất theo hố khoan và chỉ số SPT theo độ sâu (sheet SL Dia chat). Cao độ là số âm, tính từ mặt đất.',
    nhap: function () {
      var dc = state.diaChat;
      var lopRows = dc.lop.map(function (l, i) {
        var pth = 'diaChat.lop.' + i + '.';
        var laCat = l.loai === 'Cát';
        return '<tr><td class="c">' + (i + 1) + '</td>' +
          '<td>' + oChuBang(pth + 'ten', 'Tên lớp ' + (i + 1), 54) + '</td>' +
          '<td>' + oSoBang(pth + 'caoDoDinh', 'Cao độ đỉnh lớp ' + (i + 1)) + '</td>' +
          '<td>' + oChonBang(pth + 'loai', LOAI_DAT, 'Loại đất lớp ' + (i + 1), true) + '</td>' +
          '<td>' + oChonBang(pth + 'tinhChat', TINH_CHAT, 'Tính chất hạt lớp ' + (i + 1), false, !laCat) + '</td>' +
          '<td>' + oChonBang(pth + 'kichThuoc', KICH_THUOC, 'Kích thước hạt lớp ' + (i + 1), false, !laCat) + '</td>' +
          ['gamma', 'phi', 'c', 'IL', 'e'].map(function (k) { return '<td>' + oSoBang(pth + k, k + ' lớp ' + (i + 1)) + '</td>'; }).join('') +
          '<td class="c"><button type="button" class="btn-x" data-action="xoa-dong" data-ds="diaChat.lop" data-i="' + i +
          '" aria-label="Xóa lớp ' + (i + 1) + '"' + (dc.lop.length <= 1 ? ' disabled' : '') + '>✕</button></td></tr>';
      }).join('');
      var sptRows = dc.spt.map(function (v, i) {
        return '<tr><td class="c">' + (i + 1) + '</td><td class="r muted">' + so(-i * (Number(dc.sptBuoc) || 2), 1) + '</td>' +
          '<td>' + oSoBang('diaChat.spt.' + i, 'SPT dòng ' + (i + 1)) + '</td>' +
          '<td class="c"><button type="button" class="btn-x" data-action="xoa-dong" data-ds="diaChat.spt" data-i="' + i +
          '" aria-label="Xóa dòng SPT ' + (i + 1) + '"' + (dc.spt.length <= 1 ? ' disabled' : '') + '>✕</button></td></tr>';
      }).join('');
      return '<section class="card"><h2>Hố khoan</h2><div class="params">' +
        '<div class="lbl"><label for="in-diaChat.hoKhoan">Địa chất được chọn (tên hố khoan)</label></div><div class="val">' +
        oChuBang('diaChat.hoKhoan', 'Tên hố khoan', 110) + '</div>' +
        oNhapSo('diaChat.MNN', 'Cao độ mực nước ngầm', 'GWL =', 'm') +
        oNhapSo('diaChat.caoDoDay', 'Cao độ đáy lớp cuối cùng', '', 'm') +
        '</div></section>' +
        '<section class="card"><h2>Các lớp đất</h2><div class="table-wrap"><table class="tbl tbl-nhap tbl-dia-chat"><thead><tr>' +
        '<th>STT</th><th>Tên lớp</th><th>Cao độ đỉnh (m)</th><th>Loại đất</th><th>Tính chất hạt</th><th>Kích thước hạt</th>' +
        '<th>γ (kN/m³)</th><th>φ (độ)</th><th>c (kN/m²)</th><th>I<sub>L</sub></th><th>e</th><th></th></tr></thead><tbody>' + lopRows +
        '</tbody></table></div><p><button type="button" class="btn btn-ghost" data-action="them-dong" data-ds="diaChat.lop">+ Thêm lớp</button></p>' +
        '<p class="hint">Tính chất hạt và kích thước hạt chỉ dùng cho đất cát. Để trống I<sub>L</sub>, e thì nhập 0 (giống ô trống trong Excel).</p></section>' +
        '<section class="card"><h2>Chỉ số SPT theo độ sâu</h2><div class="params">' +
        oNhapSo('diaChat.sptBuoc', 'Khoảng cách giữa các lần đo SPT (biên độ)', '', 'm') +
        '</div><div class="spt-nhap"><div class="table-wrap"><table class="tbl tbl-nhap"><thead><tr><th>STT</th><th>Độ sâu (m)</th><th>SPT</th><th></th></tr></thead>' +
        '<tbody>' + sptRows + '</tbody></table></div>' +
        '<div><p><button type="button" class="btn btn-ghost" data-action="them-dong" data-ds="diaChat.spt">+ Thêm dòng SPT</button></p>' +
        '<div class="field"><label for="dan-spt">Dán nhanh cả dãy SPT (cách nhau bởi dấu cách, xuống dòng hoặc dấu chấm phẩy)</label>' +
        '<textarea class="in wide" id="dan-spt" rows="4" placeholder="0 7 1 1 1 2 2 3 16 18 …"></textarea></div>' +
        '<p><button type="button" class="btn" data-action="dan-spt">Thay bằng dãy vừa dán</button></p></div></div></section>';
    },
    ketQua: function () {
      var r = tatCa && tatCa.DC;
      if (!r || !r.hopLe) return loiHtml(r);
      var bangLop = '<div class="table-wrap"><table class="tbl"><thead><tr><th>STT</th><th>Tên lớp</th><th>Loại đất</th>' +
        '<th>Cao độ đỉnh</th><th>Độ dày</th><th>SPT TB</th><th>γ</th><th>φ</th><th>c</th><th>I<sub>L</sub></th><th>e</th><th>k</th></tr>' +
        '<tr class="units"><th></th><th></th><th></th><th>m</th><th>m</th><th></th><th>kN/m³</th><th>độ</th><th>kN/m²</th><th></th><th></th><th>kN/m⁴</th></tr></thead><tbody>' +
        r.lop.map(function (l) {
          var loai = l.loai + (l.tinhChat ? ' – ' + l.tinhChat : '') + (l.kichThuoc ? ' – ' + l.kichThuoc : '');
          return '<tr><td class="c">' + l.stt + '</td><td class="c">' + esc(l.ten) + '</td><td>' + esc(loai) + '</td>' +
            '<td class="r">' + so(l.dinh, 2) + '</td><td class="r">' + so(l.day, 2) + '</td><td class="r">' + so(l.spt, 2) + '</td>' +
            '<td class="r">' + so(l.gamma, 2) + '</td><td class="r">' + so(l.phi, 2) + '</td><td class="r">' + so(l.c, 2) + '</td>' +
            '<td class="r">' + so(l.IL, 2) + '</td><td class="r">' + so(l.e, 2) + '</td><td class="r">' + so(l.k, 0) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var bangSpt = '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Độ sâu (m)</th><th>SPT</th><th>Lớp</th></tr></thead><tbody>' +
        r.sptTheoDoSau.map(function (x) {
          return '<tr><td class="r">' + so(x.doSau, 1) + '</td><td class="r">' + so(x.spt, 0) + '</td><td class="c">' + esc(x.lop || '–') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      return '<section class="card"><h2>Bảng thống kê địa chất – hố khoan ' + esc(r.hoKhoan) + '</h2>' + bangLop +
        '<p class="hint">SPT TB: trung bình các giá trị SPT có độ sâu thuộc lớp (giống AVERAGEIF trong Excel). ' +
        'k: hệ số tỷ lệ theo bảng A.1 TCVN 10304:2025 (nội suy theo I<sub>L</sub> với đất dính, theo e với đất cát).</p></section>' +
        '<section class="card"><h2>Biểu đồ SPT</h2><div class="coc-layout">' + bieuDoSPT(r) + '<div>' + bangSpt + '</div></div></section>';
    }
  };

  // ---------------- Sức chịu tải cọc ----------------
  TRANG.sct = {
    tieuDe: 'Sức chịu tải cọc khoan nhồi',
    moTa: 'Theo vật liệu và theo chỉ số SPT (TCVN 10304:2025) – sheet SCT Coc nhoi / SCT Coc nhoi FULL. ' +
      'Kết quả Nc,d, Nt,d được dùng làm Qa, Qa\' ở mục B.',
    nhap: function () {
      var VL = MCT.data.vatLieu;
      var thepRows = state.sct.thep.map(function (t, i) {
        return '<tr><td>Thép ' + (i + 1) + '</td><td>' + oSoBang('sct.thep.' + i + '.n', 'Số thanh thép ' + (i + 1)) + '</td>' +
          '<td>' + oSoBang('sct.thep.' + i + '.d', 'Đường kính thép ' + (i + 1)) + '</td></tr>';
      }).join('');
      var ppKhacExcel = state.sct.phuongPhapThiCong !== 'Cọc Khoan Thả';
      return '<section class="card"><h2>B.2.1–B.2.2. Tiết diện và cốt thép cọc</h2><div class="params">' +
        oNhapSo('sct.D', 'Đường kính cọc', '<i>D</i> =', 'm') +
        oChon('sct.beTong', VL.beTong.map(function (b) { return b.cap; }), 'Bê tông cọc') +
        oChon('sct.cotThep', VL.cotThep.map(function (b) { return b.nhom; }), 'Cốt thép cọc') +
        '</div><div class="table-wrap" style="margin-top:10px"><table class="tbl tbl-nhap"><thead><tr><th></th><th>n (thanh)</th><th>d (mm)</th></tr></thead><tbody>' +
        thepRows + '</tbody></table></div></section>' +
        '<section class="card"><h2>B.2.3. Cao độ cọc</h2><div class="params">' +
        oNhapSo('sct.L', 'Tổng chiều dài cọc', '', 'm') +
        oNhapSo('sct.dayDai', 'Cao độ mặt đáy đài cọc', '', 'm') +
        oNhapSo('sct.dayHo', 'Cao độ mặt đáy hố đào (cao độ san nền)', '', 'm') +
        oNhapSo('sct.dauCocTinhToan', 'Cao độ đầu cọc tính toán (bắt đầu tính ma sát)', '', 'm') +
        oNhapSo('sct.doanNgam', 'Đoạn cọc ngàm vào đài', '', 'm') +
        '</div><p class="hint">Đoạn đập đầu cọc để ngàm vào đài tự tính = 40d làm tròn lên bội số 50 mm (bảng NEO CỌC).</p></section>' +
        '<section class="card"><h2>Hệ số và phương pháp</h2><div class="ke-ben"><div class="params">' +
        oChon('sct.phuongPhapThiCong', MCT.calc.PHUONG_PHAP_THI_CONG.map(function (p) { return p.ten; }), 'Phương pháp thi công (fs, fc theo Phụ lục D)', '', '', false, true) +
        oNhapSo('sct.gammaCb', 'Hệ số điều kiện làm việc bê tông (7.1.5.3)', 'γ<sub>cb</sub> =', '') +
        oNhapSo('sct.gammaCb2', 'Hệ số do phương pháp thi công (7.1.5.3)', "γ'<sub>cb</sub> =", '') +
        oNhapSo('sct.eta', 'Hệ số η mũi cọc (kín mũi = 1)', 'η =', '') +
        oNhapSo('sct.gamma0', 'Hệ số kể đến nhóm cọc', 'γ<sub>0</sub> =', '') +
        oChon('sct.capCongTrinh', ['I', 'II', 'III'], 'Cấp quan trọng công trình (→ γ<sub>n</sub>)') +
        oChon('sct.phuongPhapGk', MCT.data.bangTra.gammaK.map(function (g) { return g.ten; }), 'Hệ số độ tin cậy theo đất γ<sub>k</sub> – theo') +
        oChon('sct.xetVatLieu', [{ v: 'Yes', t: 'Có' }, { v: 'No', t: 'Không' }], 'Xét sức chịu tải theo vật liệu') +
        oChon('sct.xetSPT', [{ v: 'Yes', t: 'Có' }, { v: 'No', t: 'Không' }], 'Xét sức chịu tải theo SPT') +
        '</div>' + ghiChuLech('Cần xác nhận',
          '<p><strong>Phương pháp thi công:</strong> Excel chọn "Cọc Khoan Thả" (ô H36 sheet SCT Coc nhoi FULL) dù tiêu đề là cọc khoan nhồi. ' +
          'Bạn đã xác nhận cọc thực tế là <strong>khoan nhồi</strong>; app đang để giống Excel' +
          (ppKhacExcel ? ' – <strong>hiện bạn đã đổi sang ' + esc(state.sct.phuongPhapThiCong) + '</strong>.' : '. Chọn "Cọc Khoan Nhồi" ở ô bên trái để tính đúng loại cọc.') + '</p>' +
          '<p><strong>γ<sub>n</sub>:</strong> Excel lấy 1,2 cho cấp III, 1,15 cho cấp II, 1 cho cấp khác (ô N259). ' +
          'Theo mình nhớ TCVN 10304 lấy 1,2 / 1,15 / 1,1 cho cấp I / II / III – bạn kiểm tra lại giúp.</p>') +
        '</div></section>';
    },
    ketQua: function () {
      var r = tatCa && tatCa.SCT;
      if (!r || !r.hopLe) return loiHtml(tatCa && tatCa.DC) + loiHtml(r);
      var c = r.coc, vl = r.vatLieu, sp = r.spt;
      var bThongSo = '<section class="card"><h2>Đặc trưng cọc và cao độ</h2><div class="grid-2"><div class="params">' +
        dong('Diện tích mặt cắt ngang cọc', '<i>A</i><sub>b</sub> =', so(c.Ab, 4), 'm²') +
        dong('Chu vi ngoài của cọc', '<i>u</i> =', so(c.u, 4), 'm') +
        dong('Mômen quán tính tiết diện', '<i>I</i> =', so(c.I, 5), 'm⁴') +
        dong('Diện tích cốt thép', '<i>A</i><sub>s</sub> =', so(c.As, 1), 'mm²') +
        dong('Hàm lượng thép', 'μ =', so(c.mu, 2), '%') +
        '</div><div class="params">' +
        dong('Đoạn đập đầu cọc để ngàm vào đài', '', so(c.doanDap, 2), 'm') +
        dong('Cao độ đầu cọc thực tế', '', so(c.dauCocThucTe, 2), 'm') +
        dong('Cao độ mũi cọc', '', so(c.muiCoc, 2), 'm') +
        dong('Chiều dài tự do l<sub>0</sub> (đáy đài → đáy hố đào)', '<i>l</i><sub>0</sub> =', so(c.l0, 2), 'm') +
        '</div></div></section>';

      var bangK = '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Lớp</th><th>Loại đất</th><th>Đỉnh tính toán (m)</th>' +
        '<th>Đáy tính toán (m)</th><th>l<sub>i</sub> (m)</th><th>I<sub>L</sub></th><th>e</th><th>k<sub>i</sub> (kN/m⁴)</th><th>k<sub>i</sub>·l<sub>i</sub></th></tr></thead><tbody>' +
        vl.doan.map(function (d) {
          return '<tr><td class="c">' + esc(d.lop.ten) + '</td><td>' + esc(d.lop.loai) + '</td><td class="r">' + so(d.dinh) + '</td><td class="r">' + so(d.day) +
            '</td><td class="r">' + so(d.l) + '</td><td class="r">' + so(d.lop.IL) + '</td><td class="r">' + so(d.lop.e) + '</td><td class="r">' + so(d.k, 0) +
            '</td><td class="r">' + so(d.kl, 0) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var c1 = '<section class="card"><h2>C.1. Sức chịu tải cọc theo vật liệu</h2>' +
        '<div class="formula"><i>R</i><sub>c,u/vl</sub> = φ(γ<sub>cb</sub>γ\'<sub>cb</sub><i>R</i><sub>b</sub><i>A</i><sub>b</sub> + <i>R</i><sub>sc</sub><i>A</i><sub>s</sub>);   ' +
        'φ = 1 khi λ ≤ 28; φ = 1,028 − 0,0000288λ² − 0,0016λ khi λ > 28</div>' +
        '<h3>Hệ số tỷ lệ k theo bảng A.1 (đoạn cọc từ đầu cọc tính toán đến mũi cọc)</h3>' + bangK +
        '<div class="grid-2" style="margin-top:12px"><div class="params">' +
        dong('Hệ số tỷ lệ', '<i>k</i> = Σk<sub>i</sub>l<sub>i</sub>/Σl<sub>i</sub> =', so(vl.k, 1), 'kN/m⁴') +
        dong('Chiều rộng quy ước', '<i>b</i><sub>p</sub> =', so(vl.bp, 2), 'm') +
        dong('Mô đun đàn hồi bê tông', '<i>E</i> =', so(vl.E, 0), 'MPa') +
        dong('Hệ số biến dạng', 'α<sub>ε</sub> = (k·b<sub>p</sub>/EI)<sup>1/5</sup> =', so(vl.alphaE, 4), '1/m') +
        '</div><div class="params">' +
        dong('Chiều dài tính toán', '<i>l</i><sub>1</sub> = <i>l</i><sub>0</sub> + 2/α<sub>ε</sub> =', so(vl.l1, 3), 'm') +
        dong('Bán kính quán tính', '<i>r</i> =', so(vl.r, 3), 'm') +
        dong('Độ mảnh', 'λ = <i>l</i><sub>1</sub>/<i>r</i> =', so(vl.lambda, 2), '') +
        dong('Hệ số uốn dọc', 'φ =', so(vl.phi, 4), '') +
        '</div></div><div class="params" style="margin-top:8px">' +
        dong('Sức chịu tải trọng nén theo vật liệu', '<i>R</i><sub>c,u/vl</sub> =', so(vl.Rcu), 'kN') +
        dong('Sức chịu tải trọng kéo theo vật liệu (R<sub>s</sub>A<sub>s</sub>)', '<i>R</i><sub>t,u/vl</sub> =', so(vl.Rtu), 'kN') +
        '</div></section>';

      var bangSpt = '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Lớp</th><th>Loại đất</th><th>Cao độ đỉnh đoạn</th>' +
        '<th>l<sub>i</sub> (m)</th><th>SPT TB</th><th>f<sub>s,i</sub> (kPa)</th><th>c<sub>u,i</sub> (kPa)</th><th>f<sub>c,i</sub> (kPa)</th></tr></thead><tbody>' +
        sp.doan.map(function (d) {
          return '<tr><td class="c">' + esc(d.lop.ten) + '</td><td>' + esc(d.lop.loai) + '</td><td class="r">' + so(d.dinh) + '</td><td class="r">' + so(d.l) +
            '</td><td class="r">' + so(d.spt) + '</td><td class="r">' + so(d.fs) + '</td><td class="r">' + so(d.cu) + '</td><td class="r">' + so(d.fc) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var pp = sp.phuongPhap;
      var c2 = '<section class="card"><h2>C.2. Sức chịu tải cọc theo chỉ số SPT (Phụ lục D TCVN 10304:2025)</h2>' +
        '<div class="formula"><i>R</i><sub>c,u</sub> = <i>q</i><sub>b</sub><i>A</i><sub>b</sub> + <i>u</i>Σ(<i>f</i><sub>c,i</sub><i>l</i><sub>c,i</sub> + <i>f</i><sub>s,i</sub><i>l</i><sub>s,i</sub>);   ' +
        esc(pp.ten) + ': f<sub>c,i</sub> = min(' + so(pp.heSoFc, 1) + 'c<sub>u</sub>; ' + pp.chanFc + '), c<sub>u</sub> = 6,25N; ' +
        'f<sub>s,i</sub> = min(' + so(pp.heSoFs, 1) + 'N; ' + pp.chanFs + ')</div>' +
        '<p class="hint">Mỗi đoạn chia thành các lớp phân tố dày ≤ 1 m; SPT mỗi lớp phân tố nội suy theo cao độ (hàm TinhSPTfi).</p>' + bangSpt +
        '<div class="grid-2" style="margin-top:12px"><div class="params">' +
        dong('Loại đất tại mũi cọc', '', esc(sp.loaiMui || '–'), '') +
        dong('SPT tại mũi + 1D / − 1D', '', so(sp.NpTren, 1) + ' / ' + so(sp.NpDuoi, 1), '') +
        dong('SPT trung bình quanh mũi (lấy phần nguyên)', '<i>N</i><sub>p</sub> =', so(sp.Np, 0), '') +
        '</div><div class="params">' +
        dong('Đất dính: q<sub>b</sub> = min(6c<sub>u</sub>η; 9000)', '', so(sp.qbSet, 0), 'kPa') +
        dong('Đất rời: q<sub>b</sub> = min(120N<sub>p</sub>η; 9000)', '', so(sp.qbCat, 0), 'kPa') +
        dong('Cường độ sức kháng mũi', '<i>q</i><sub>b</sub> =', so(sp.qb, 0), 'kPa') +
        '</div></div><div class="params" style="margin-top:8px">' +
        dong('Sức chịu tải trọng nén theo SPT', '<i>R</i><sub>c,u/SPT</sub> =', so(sp.Rcu), 'kN') +
        dong('Sức chịu tải trọng kéo theo SPT (không kể mũi)', '<i>R</i><sub>t,u/SPT</sub> =', so(sp.Rtu), 'kN') +
        '</div></section>';

      var d = '<section class="card"><h2>D. Sức chịu tải thiết kế của cọc</h2>' +
        '<div class="formula"><i>N</i><sub>c,d</sub> = min(γ<sub>0</sub>/γ<sub>n</sub> × <i>R</i><sub>c,k</sub>/γ<sub>k</sub> ; <i>R</i><sub>c,u/vl</sub>);   ' +
        '<i>N</i><sub>t,d</sub> = min(γ<sub>0</sub>/γ<sub>n</sub> × <i>R</i><sub>t,k</sub>/γ<sub>k</sub> ; <i>R</i><sub>t,u/vl</sub>)</div><div class="params">' +
        dong('Hệ số kể đến nhóm cọc', 'γ<sub>0</sub> =', so(r.gamma0, 2), '') +
        dong('Hệ số tầm quan trọng (cấp ' + esc(r.capCongTrinh) + ')', 'γ<sub>n</sub> =', so(r.gammaN, 2), '') +
        dong('Hệ số độ tin cậy theo đất (' + esc(r.phuongPhapGk) + ')', 'γ<sub>k</sub> =', so(r.gammaK, 2), '') +
        '</div><div class="table-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th></th><th>Nén (kN)</th><th>Kéo (kN)</th></tr></thead><tbody>' +
        '<tr><td>Theo vật liệu (1)' + (r.xetVatLieu ? '' : ' – không xét') + '</td><td class="r">' + so(vl.Rcu) + '</td><td class="r">' + so(vl.Rtu) + '</td></tr>' +
        '<tr><td>Theo chỉ số SPT (2)' + (r.xetSPT ? '' : ' – không xét') + '</td><td class="r">' + so(sp.Rcu) + '</td><td class="r">' + so(sp.Rtu) + '</td></tr>' +
        '<tr><td>Trị tiêu chuẩn R<sub>k</sub></td><td class="r">' + so(r.Rck) + '</td><td class="r">' + so(r.Rtk) + '</td></tr>' +
        '<tr class="hi"><td>Sức chịu tải thiết kế N<sub>c,d</sub> / N<sub>t,d</sub></td><td class="r">' + so(r.Ncd) + '</td><td class="r">' + so(r.Ntd) + '</td></tr>' +
        '</tbody></table></div><p class="hint">Hai giá trị dòng tô vàng là Q<sub>a</sub>, Q<sub>a</sub>\' dùng ở mục B (khi chọn nguồn "Tự động").</p></section>';
      return bThongSo + c1 + c2 + d;
    }
  };

  // ---------------- Khung điều hướng ----------------
  // Trạng thái đạt/không đạt của từng mục để hiện ở thanh danh mục
  function trangThaiMuc(id) {
    switch (id) {
      case 'coc': return kqB && kqB.hopLe ? kqB.kiemTraNen.ok && kqB.kiemTraKeo.ok : null;
      case 'xuyen': return kqC && kqC.hopLe ? kqC.ok : null;
      case 'thep': return kqD && kqD.hopLe ? kqD.tatCaOk : null;
      case 'bulong': return kqE && kqE.hopLe ? kqE.tatCaOk : null;
      case 'ket-luan': return kqF && kqF.hopLe ? kqF.ok : null;
      default: return undefined;
    }
  }

  function veDanhMuc() {
    $('#sidenav').innerHTML = MUC.map(function (m) {
      if (m.nhom) return '<div class="nav-group">' + esc(m.nhom) + '</div>';
      var cur = m.id === trangHienTai ? ' aria-current="page"' : '';
      var tt = m.sapCo ? undefined : trangThaiMuc(m.id);
      var dau = tt === true ? '<span class="nav-tt ok" title="Đạt">✓</span>'
        : tt === false ? '<span class="nav-tt fail" title="Không đạt">✗</span>'
        : tt === null ? '<span class="nav-tt" title="Chưa đủ dữ liệu">–</span>' : '';
      return '<button type="button" class="nav-item" data-trang="' + m.id + '"' + cur +
        (m.sapCo ? ' disabled' : '') + '><span class="nav-code">' + esc(m.ma) + '</span><span>' + esc(m.ten) +
        '</span>' + (m.sapCo ? '<span class="nav-soon">' + esc(m.sapCo) + '</span>' : dau) + '</button>';
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
    veDanhMuc();
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
    } else if (path === 'cau.chieuCao' || el.getAttribute('data-kieu') === 'so-chon') {
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
    } else if (el.getAttribute('data-ve-lai')) {
      tinh();
      $('#vung-nhap').innerHTML = TRANG[trangHienTai].nhap();
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
      if (e.target.closest('[data-action="xuat-tm"]')) xuatThuyetMinh();
      var themDong = e.target.closest('[data-action="them-dong"]');
      var xoaDong = e.target.closest('[data-action="xoa-dong"]');
      if ((themDong && !themDong.disabled) || (xoaDong && !xoaDong.disabled)) {
        var nutDong = themDong || xoaDong;
        var mang = layGiaTri(nutDong.getAttribute('data-ds'));
        if (themDong) {
          var cuoi = mang[mang.length - 1];
          mang.push(typeof cuoi === 'object' ? Object.assign(JSON.parse(JSON.stringify(cuoi)), cuoi.ten !== undefined ? { ten: '' } : {}) : 0);
        } else {
          mang.splice(Number(xoaDong.getAttribute('data-i')), 1);
        }
        tinh();
        $('#vung-nhap').innerHTML = TRANG[trangHienTai].nhap();
        veKetQua();
        luu();
      }
      if (e.target.closest('[data-action="dan-spt"]')) {
        var day = (($('#dan-spt') || {}).value || '').split(/[\s;]+/).map(function (t) { return t.replace(',', '.'); })
          .filter(function (t) { return t !== '' && isFinite(Number(t)); }).map(Number);
        if (day.length) {
          state.diaChat.spt = day;
          tinh();
          $('#vung-nhap').innerHTML = TRANG[trangHienTai].nhap();
          veKetQua();
          luu();
          datTrangThai('Đã thay ' + day.length + ' giá trị SPT');
        } else {
          datTrangThai('Không đọc được số nào trong ô dán SPT');
        }
      }
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

  // ---------------- Xuất thuyết minh ----------------
  function napThuVienDocx() {
    return new Promise(function (ok, loi) {
      if (globalThis.docx) return ok();
      var sc = document.createElement('script');
      sc.src = 'vendor/docx-9.15.3.umd.js';
      sc.onload = function () { ok(); };
      sc.onerror = function () { loi(new Error('Không nạp được thư viện docx (vendor/docx-9.15.3.umd.js).')); };
      document.head.appendChild(sc);
    });
  }

  function xuatThuyetMinh() {
    if (!ketQua || !ketQua.hopLe) {
      datTrangThai('Chưa xuất được: mục A còn lỗi.');
      return;
    }
    datTrangThai('Đang tạo thuyết minh…');
    napThuVienDocx().then(function () {
      var doc = MCT.baoCao.taoThuyetMinh(state, tatCa);
      return globalThis.docx.Packer.toBlob(doc);
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = MCT.baoCao.tenFile(state, tatCa);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      datTrangThai('Đã xuất ' + a.download);
    }).catch(function (e) {
      datTrangThai('Lỗi xuất thuyết minh: ' + e.message);
    });
  }

  MCT.app = { state: function () { return state; }, ketQua: function () { return ketQua; } };
  khoiDong();
})(globalThis.MCT = globalThis.MCT || {});
