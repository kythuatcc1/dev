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
    dai: { beTong: 'B35', cotThep: 'CB500-V', a_cm: 15, X: 4, Y: 3.678, H: 1.6 }
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
    { id: 'coc', ma: 'B', ten: 'Tải trọng lên cọc', sapCo: 'GĐ2' },
    { id: 'xuyen', ma: 'C', ten: 'Xuyên thủng đài', sapCo: 'GĐ2' },
    { id: 'thep', ma: 'D', ten: 'Cốt thép đài', sapCo: 'GĐ2' },
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
  var ketQua = null;

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
      '" data-bind="' + path + '" data-kieu="so" value="' + esc(String(v).replace('.', ',')) + '">' +
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

  function layGiaTri(path) {
    var p = path.split('.');
    return state[p[0]][p[1]];
  }

  function datGiaTri(path, v) {
    var p = path.split('.');
    state[p[0]][p[1]] = v;
  }

  function loiHtml() {
    if (!ketQua || ketQua.hopLe) return '';
    return '<div class="alert alert-fail">' + ketQua.loi.map(esc).join('<br>') + '</div>';
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
    });
  }

  MCT.app = { state: function () { return state; }, ketQua: function () { return ketQua; } };
  khoiDong();
})(globalThis.MCT = globalThis.MCT || {});
