// Giao diện app Móng cẩu tháp
(function (MCT) {
  'use strict';

  var KHOA_LUU = 'mong-cau-thap.du-lieu.v1';
  var KHOA_CAU = 'mong-cau-thap.cau-tu-them.v1';   // thư viện cẩu tự thêm – dùng chung cho mọi móng trên máy này

  function taiCauTuThem() {
    try {
      var ds = JSON.parse(localStorage.getItem(KHOA_CAU) || '[]');
      return Array.isArray(ds) ? ds.filter(function (c) { return c && c.ten && Array.isArray(c.hang) && c.hang.length; }) : [];
    } catch (e) { return []; }
  }
  MCT.calc.datCauTuThem(taiCauTuThem());

  // Giá trị mặc định: js/mac-dinh.js
  var MAC_DINH = MCT.macDinh;

  // Danh mục theo đúng thứ tự trong file Excel
  var MUC = [
    { nhom: 'Chung' },
    { id: 'du-an', ma: '', ten: 'Thông tin dự án' },
    { id: 'cau-moi', ma: '', ten: 'Thêm cẩu tháp' },
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
    { id: 'tai-ngang', ma: '', ten: 'Cọc chịu tải ngang' },
    { id: 'lun', ma: '', ten: 'Ổn định – lún' },
    { id: 'tuong-tac', ma: '', ten: 'Biểu đồ tương tác' },
    { nhom: 'Tính bằng ETABS' },
    { id: 'etabs', ma: '', ten: 'Kết nối ETABS' },
    { id: 'etabs-mo-hinh', ma: '', ten: 'Mô hình ETABS' },
    { id: 'etabs-tai-trong', ma: '', ten: 'Tải trọng & tổ hợp' },
    { id: 'etabs-ket-qua', ma: '', ten: 'Kết quả ETABS' }
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
    var nhomTruoc = null;
    var opts = luaChon.map(function (o) {
      var val = typeof o === 'object' ? o.v : o;
      var txt = typeof o === 'object' ? o.t : o;
      var dau = '';
      if (typeof o === 'object' && o.nhom && o.nhom !== nhomTruoc) {   // nhóm lựa chọn (optgroup)
        dau = (nhomTruoc ? '</optgroup>' : '') + '<optgroup label="' + esc(o.nhom) + '">';
        nhomTruoc = o.nhom;
      }
      return dau + '<option value="' + esc(val) + '"' + (String(val) === v ? ' selected' : '') + '>' + esc(txt) + '</option>';
    }).join('') + (nhomTruoc ? '</optgroup>' : '');
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
        oDoan('baoCao.gioiThieuTaiNgang', 'Chương II, Phần 3 – Đoạn giới thiệu kiểm tra cọc chịu tải ngang', 3) +
        oDoan('baoCao.kienNghi', 'Thuyết minh ETABS, mục 7.2 – Kiến nghị', 3,
          'Mỗi dòng là một gạch đầu dòng. Để trống: dùng kiến nghị mặc định như báo cáo thẩm tra. {tenMong}, {cau}, {chieuCao} được thay bằng số liệu.') +
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
      var dsCau = MCT.calc.danhSachCau().map(function (c) {
        return { v: c.ten, t: c.ten + ' ' + (c.loaiVI || '') + (c.nguon === 'New data' ? ' – H = ' + so(c.hang[0].h, 2) + ' m' : ''), nhom: nhomCau(c) };
      });
      var cau = MCT.calc.timCau(state.cau.ten);
      var dsCao = cau ? cau.hang.map(function (h) { return { v: h.h, t: so(h.h, 2) }; }) : [];
      return '<section class="card"><h2>Chọn cẩu</h2><div class="params">' +
        oChon('cau.ten', dsCau, 'Loại cẩu tháp') +
        oChon('cau.chieuCao', dsCao, 'Chiều cao tự đứng tính toán', '', 'm') +
        '</div><p class="hang-nut">' +
        (cau && cau.tuThem ? '<button type="button" class="btn btn-ghost" data-action="sua-cau" data-ten="' + esc(cau.ten) + '">Sửa cẩu ' + esc(cau.ten) + '</button>' : '') +
        '<button type="button" class="btn btn-ghost" data-trang="cau-moi">+ Thêm cẩu chưa có trong danh sách</button></p>' +
        ghiChuCau(cau) + '</section>';
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
        '</div><p class="hint">' + (r.cau.tuThem ? 'Cẩu tự thêm: n lấy theo số liệu nhập ở trang Thêm cẩu tháp.'
          : 'Riêng cẩu MC205B lấy n = 1,5; các cẩu khác n = 1,2 (giống ô P15 trong Excel).') + '</p>' +
        quyTacText(r) + bangQuyDoi + '</section>' +
        bangCatalogueDayDu(r);
    }
  };

  // ---------------- Cẩu tự thêm ----------------
  function dsCauTuThem() { return MCT.data.cauTuThem || []; }

  function nhomCau(c) {
    return c.tuThem ? 'Cẩu tự thêm' : c.nguon === 'New data' ? 'Sheet New data (một chiều cao tự đứng)' : 'Catalogue sheet Solieu';
  }

  // Ghi chú nguồn số liệu của cẩu (sheet New data: một chiều cao, số liệu lấy mặc định, tải tối đa / bulong theo catalogue)
  function ghiChuCau(c) {
    if (!c || c.nguon !== 'New data') return '';
    var b = c.bulong || {}, dong = (c.ghiChu || []).slice();
    var them = [];
    if (typeof c.taiToiDa === 'number') them.push('tải tối đa ' + so(c.taiToiDa, 1) + ' T');
    if (typeof c.taiDauCan === 'number') them.push('tải đầu cần ' + so(c.taiDauCan, 2) + ' T');
    if (typeof b.soCay === 'number') them.push('bulong ' + b.soCay + ' cây' + (typeof b.d === 'number' ? ' M' + b.d : '') + ' mỗi chân');
    if (them.length) dong.push('Catalogue: ' + them.join(', ') + ' (nhập tải ở trang Thông tin dự án, bulong ở mục E nếu cần).');
    if (c.ghiChuExcel) dong.push('Ghi chú trong Excel: ' + c.ghiChuExcel + '.');
    return '<div class="alert alert-info">' + dong.map(esc).join('<br>') + '</div>';
  }
  function khoaCau(ten) { return MCT.calc.khoaTenCau(ten); }

  function luuThuVienCau(ds) {
    MCT.calc.datCauTuThem(ds);
    try { localStorage.setItem(KHOA_CAU, JSON.stringify(ds)); return true; } catch (e) { return false; }
  }

  // Móng đang dùng cẩu tự thêm: giữ một bản trong số liệu móng để khôi phục nếu thư viện trên máy bị xoá
  function capNhatBanSao() {
    var c = MCT.calc.timCau(state.cau.ten);
    if (c && c.tuThem) state.cau.banSao = sao(c);
    else delete state.cau.banSao;
  }

  // Đặt cẩu cho móng: giữ chiều cao nếu catalogue mới có, nếu không lấy hàng tra gần đúng hoặc hàng đầu
  // (giống danh sách chọn CapNhatValidationChieuCao trong Excel)
  function chonCau(ten) {
    state.cau.ten = ten;
    var cau = MCT.calc.timCau(ten);
    if (cau) {
      var hang = MCT.calc.traHang(cau, Number(state.cau.chieuCao)) || cau.hang[0];
      state.cau.chieuCao = hang.h;
    }
    capNhatBanSao();
  }

  function nhapCauTrong() { return sao(MAC_DINH.cauNhap); }

  function nhapCauCoNoiDung() {
    var d = state.cauNhap;
    return !!(String(d.ten || '').trim() || (d.hang || []).some(function (h) {
      return String(h.h) !== '' || ['N', 'M', 'H'].some(function (k) { return h.lv && String(h.lv[k] == null ? '' : h.lv[k]) !== ''; });
    }));
  }

  function hienSoTho(v) { return typeof v === 'number' ? String(v).replace('.', ',') : (v == null ? '' : String(v)); }

  // Ô số giữ nguyên chữ gõ vào (cho phép để trống, dấu phẩy / chấm) – đọc bằng MCT.calc.docSoNhap khi kiểm tra
  function oSoTho(path, nhan, rong) {
    var v = layGiaTri(path);
    var sai = v !== '' && v != null && isNaN(MCT.calc.docSoNhap(v));
    return '<input class="in so' + (sai ? ' loi' : '') + '" type="text" inputmode="decimal" autocomplete="off" aria-label="' + esc(nhan) +
      '" id="in-' + path + '" data-bind="' + path + '" data-kieu="so-tho" value="' + esc(hienSoTho(v)) + '"' +
      (rong ? ' style="width:' + rong + 'px"' : '') + '>';
  }

  function dongSoTho(path, nhan, ky, dv) {
    return '<div class="lbl"><label for="in-' + path + '">' + nhan + '</label></div><div class="val"><span class="sym">' + (ky || '') +
      '</span>' + oSoTho(path, nhan.replace(/<[^>]+>/g, '')) + '<span class="unit">' + (dv || '') + '</span></div>';
  }

  var TEN_COT_CAU = { N: 'lực dọc', M: 'mômen', H: 'lực ngang', CR: 'mômen CR', T: 'mômen xoắn' };

  TRANG['cau-moi'] = {
    tieuDe: 'Thêm cẩu tháp',
    moTa: 'Nhập thông số và bảng tải chân đế của cẩu chưa có trong catalogue. Cẩu đã lưu dùng được cho mọi móng trên máy này: ' +
      'chọn ở trang A.1 và tính như cẩu có sẵn (mục A → F, tải ngang, tương tác, ETABS, thuyết minh).',
    nhap: function () {
      var d = state.cauNhap, ds = dsCauTuThem(), cot = MCT.calc.cotBangTai(d);
      // Danh sách cẩu đã thêm
      var dsHtml = ds.length ? '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Tên cẩu</th><th>Loại</th>' +
        '<th>Tay cần (m)</th><th>Chiều cao (m)</th><th>n</th><th></th></tr></thead><tbody>' +
        ds.map(function (c) {
          var dangDung = khoaCau(c.ten) === khoaCau(state.cau.ten);
          return '<tr><td>' + esc(c.ten) + (dangDung ? ' <span class="badge badge-ok">móng đang dùng</span>' : '') + '</td>' +
            '<td>' + esc(String(c.loaiVI || '').replace(/[()]/g, '')) + '</td><td class="r">' + so(c.chieuDaiTayCan, 0) + '</td>' +
            '<td class="r">' + so(c.hang[0].h, 1) + ' – ' + so(c.hang[c.hang.length - 1].h, 1) + ' (' + c.hang.length + ' dòng)</td>' +
            '<td class="r">' + so(c.heSoAnToan, 2) + '</td><td class="nut-dong">' +
            (dangDung ? '' : '<button type="button" class="btn btn-ghost btn-nho" data-action="dung-cau" data-ten="' + esc(c.ten) + '">Dùng cho móng này</button>') +
            '<button type="button" class="btn btn-ghost btn-nho" data-action="sua-cau" data-ten="' + esc(c.ten) + '">Sửa</button>' +
            '<button type="button" class="btn-x" data-action="xoa-cau" data-ten="' + esc(c.ten) + '" aria-label="Xoá cẩu ' + esc(c.ten) + '">✕</button></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<p class="hint">Chưa có cẩu tự thêm trên máy này.</p>';
      var html = '<section class="card"><h2>Cẩu đã thêm</h2>' + dsHtml +
        '<p class="hang-nut"><button type="button" class="btn btn-ghost" data-action="xuat-file-cau"' + (ds.length ? '' : ' disabled') + '>Xuất file cẩu (.json)</button>' +
        '<button type="button" class="btn btn-ghost" data-action="chon-file-cau">Nhập file cẩu…</button>' +
        '<input type="file" id="nhap-file-cau" accept=".json,application/json" hidden></p>' +
        '<p class="hint">Xuất file để chép cẩu sang máy khác hoặc gửi đồng nghiệp; bên nhận bấm "Nhập file cẩu…". ' +
        'Móng dùng cẩu tự thêm cũng tự lưu kèm số liệu cẩu đó.</p></section>';

      // Thông tin chung
      var nhomMau = null;
      var mau = MCT.calc.danhSachCau().map(function (c) {
        var nh = nhomCau(c), dau = nh !== nhomMau ? (nhomMau ? '</optgroup>' : '') + '<optgroup label="' + esc(nh) + '">' : '';
        nhomMau = nh;
        return dau + '<option value="' + esc(c.ten) + '">' + esc(c.ten) + '</option>';
      }).join('') + '</optgroup>';
      html += '<section class="card"><h2>' + (d.tenGoc ? 'Sửa cẩu ' + esc(d.tenGoc) : 'Cẩu mới') + '</h2>' +
        '<p class="hang-nut"><button type="button" class="btn btn-ghost" data-action="nhap-moi-cau">Nhập cẩu mới (trống)</button>' +
        '<span class="nhom-nut"><label for="chon-mau-cau">Sao chép từ cẩu</label> <select class="in" id="chon-mau-cau">' + mau + '</select>' +
        '<button type="button" class="btn btn-ghost" data-action="sao-chep-cau">Sao chép</button></span></p>' +
        '<div class="params">' +
        '<div class="lbl"><label for="in-cauNhap.ten">Tên (mã hiệu) cẩu</label></div><div class="val"><span class="sym"></span>' +
        '<input class="in" type="text" style="width:220px" id="in-cauNhap.ten" data-bind="cauNhap.ten" placeholder="ví dụ Potain MCT 88" value="' +
        esc(d.ten) + '"><span class="unit"></span></div>' +
        oChon('cauNhap.loai', [{ v: 'bang', t: 'Cẩu bằng (Hammerhead)' }, { v: 'dinh-bang', t: 'Cẩu đỉnh bằng (Flat-top)' },
          { v: 'gat-gu', t: 'Cẩu gật gù (Luffing)' }], 'Loại cẩu') +
        dongSoTho('cauNhap.chieuDaiTayCan', 'Chiều dài tay cần lớn nhất', '', 'm') +
        dongSoTho('cauNhap.beRongThan', 'Bề rộng thân cẩu (khoảng cách tim chân cẩu)', '<i>H</i><sub>t</sub> =', 'm') +
        dongSoTho('cauNhap.duongKinhNhomBulong', 'Đường kính cụm bulong 1 chân cẩu (đáy bé tháp chọc thủng)', '<i>D</i><sub>1</sub> =', 'm') +
        dongSoTho('cauNhap.tongChieuDayBanThep', 'Tổng chiều dày các bản thép cùng trượt về một phía (ép mặt bulong)', 'Σ<i>t</i> =', 'mm') +
        dongSoTho('cauNhap.heSoAnToan', 'Hệ số an toàn thiết kế', '<i>n</i> =', '') +
        dongSoTho('cauNhap.pctCoDinh', 'Lực nhổ lớn nhất tại 1 chân cẩu theo catalogue (để trống: app tự tính)', '<i>P</i><sub>ct</sub> =', 'kN') +
        '</div><p class="hint">Excel lấy n = 1,2 (riêng MC205B 1,5). Lực nhổ để trống thì app tính như Excel: ' +
        'max(M/(H<sub>t</sub>·√2) − N/4) ở chiều cao lớn nhất của bảng tải.</p></section>';

      // Quy đổi
      var coCR = d.quyTacM === 'cr';
      var kyHieu = ['N', 'M', 'H'].concat(coCR ? ['CR'] : [], d.kieuT !== 'khong' ? ['T'] : []);
      html += '<section class="card"><h2>Quy đổi tải trọng</h2><div class="params">' +
        oChon('cauNhap.quyTacN', [{ v: 'x_n', t: 'N × n' }, { v: 'cong40_n', t: '(N + 40) × n – như Zoomlion L125' }], 'Lực dọc quy đổi N<sub>qđ</sub>') +
        oChon('cauNhap.quyTacM', [{ v: 'x_n', t: 'M × n' }, { v: 'cr', t: 'Có thêm mômen CR – như MC175B, MC205B' }],
          'Mômen quy đổi M<sub>qđ</sub>', '', '', false, true) +
        oChon('cauNhap.kieuT', [{ v: 'mot', t: 'Một giá trị cho mọi chiều cao' }, { v: 'theo-hang', t: 'Theo từng chiều cao (cột T của bảng tải)' },
          { v: 'khong', t: 'Catalogue không có' }], 'Mômen xoắn T khi làm việc', '', '', false, true) +
        (d.kieuT === 'mot' ? dongSoTho('cauNhap.mXoan', 'Mômen xoắn khi làm việc', '<i>T</i> =', 'kNm') : '') +
        '</div><div class="formula">H<sub>qđ</sub> = H × n' +
        (coCR ? ';  làm việc: M<sub>qđ</sub> = (M + CR) × n;  không làm việc: M<sub>qđ</sub> = (M &lt; 2CR ? CR : M − CR) × n (như sheet Solieu)' : '') +
        '</div><h3>Ký hiệu theo catalogue (in ở bảng tải và thuyết minh)</h3><p class="hang-nut">' +
        kyHieu.map(function (k) {
          return '<label class="ky-hieu">' + esc(TEN_COT_CAU[k]) + ' <input class="in" type="text" style="width:64px" id="in-cauNhap.nhan.' + k +
            '" data-bind="cauNhap.nhan.' + k + '" value="' + esc(d.nhan && d.nhan[k] != null ? d.nhan[k] : k) + '"></label>';
        }).join('') + '</p></section>';

      // Bảng tải
      var tdCot = function (tt) {
        return cot[tt].map(function (k) { return '<th>' + esc((d.nhan && d.nhan[k]) || k) + '<br><span class="muted">' + (k === 'N' || k === 'H' ? 'kN' : 'kNm') + '</span></th>'; }).join('');
      };
      var dongBang = (d.hang || []).map(function (h, i) {
        var pth = 'cauNhap.hang.' + i + '.';
        return '<tr><td class="c">' + (i + 1) + '</td><td>' + oSoTho(pth + 'h', 'H dòng ' + (i + 1), 58) + '</td>' +
          ['lv', 'klv'].map(function (tt) {
            return cot[tt].map(function (k) {
              return '<td>' + oSoTho(pth + tt + '.' + k, (tt === 'lv' ? 'Làm việc ' : 'Không làm việc ') + k + ' dòng ' + (i + 1), 70) + '</td>';
            }).join('');
          }).join('') +
          '<td class="c"><button type="button" class="btn-x" data-action="xoa-dong" data-ds="cauNhap.hang" data-i="' + i +
          '" aria-label="Xoá dòng ' + (i + 1) + '"' + (d.hang.length <= 1 ? ' disabled' : '') + '>✕</button></td></tr>';
      }).join('');
      html += '<section class="card"><h2>Bảng tải chân đế theo chiều cao tự đứng</h2>' +
        '<div class="table-wrap"><table class="tbl tbl-nhap tbl-cau"><thead><tr><th rowspan="2">STT</th><th rowspan="2">H<br><span class="muted">m</span></th>' +
        '<th colspan="' + cot.lv.length + '">Làm việc</th><th colspan="' + cot.klv.length + '">Không làm việc</th><th rowspan="2"></th></tr><tr>' +
        tdCot('lv') + tdCot('klv') + '</tr></thead><tbody>' + dongBang + '</tbody></table></div>' +
        '<p><button type="button" class="btn btn-ghost" data-action="them-hang-cau">+ Thêm dòng</button></p>' +
        '<p class="hint">Đơn vị kN, kNm (catalogue tính bằng tấn thì đổi trước: 1 T = 9,81 kN). Nhập giá trị tuyệt đối; ' +
        'app tự sắp chiều cao tăng dần khi lưu. Móng tra gần đúng: lấy dòng cuối cùng có H ≤ chiều cao tự đứng tính toán.</p>' +
        '<div class="field field-wide"><label for="dan-bang-cau">Dán nhanh cả bảng từ Excel – thứ tự cột: H, làm việc ' + esc(cot.lv.join(', ')) +
        ', không làm việc ' + esc(cot.klv.join(', ')) + ' (dòng tiêu đề tự bỏ qua)</label>' +
        '<textarea class="in wide" id="dan-bang-cau" rows="4" placeholder="' + esc(['H'].concat(cot.lv, cot.klv).join('\t')) + '"></textarea></div>' +
        '<p><button type="button" class="btn" data-action="dan-bang-cau">Thay bảng tải bằng số liệu vừa dán</button></p></section>';
      return html;
    },
    ketQua: function () {
      var d = state.cauNhap;
      var kq = MCT.calc.taoCauTuNhap(d, dsCauTuThem());
      var canhBao = (d.canhBao || []).length ? '<div class="alert alert-info">' + d.canhBao.map(esc).join('<br>') + '</div>' : '';
      var nut = function (ok) {
        return '<p class="hang-nut"><button type="button" class="btn" data-action="luu-cau"' + (ok ? '' : ' disabled') + '>' +
          (d.tenGoc ? 'Lưu thay đổi' : 'Lưu cẩu') + '</button><button type="button" class="btn btn-ghost" data-action="luu-dung-cau"' +
          (ok ? '' : ' disabled') + '>Lưu và dùng cho móng ' + esc(state.duAn.tenMong) + '</button></p>';
      };
      if (!kq.hopLe && !nhapCauCoNoiDung()) {
        return '<section class="card"><h2>Kiểm tra số liệu</h2><div class="alert alert-info">Nhập tên cẩu, thông số và bảng tải ở trên ' +
          '(hoặc bấm "Sao chép" để lấy một cẩu có sẵn làm mẫu). App kiểm tra số liệu và xem trước tải quy đổi tại đây.</div>' + nut(false) + '</section>';
      }
      if (!kq.hopLe) {
        return '<section class="card"><h2>Kiểm tra số liệu</h2>' + canhBao + '<div class="alert alert-fail">' + kq.loi.map(esc).join('<br>') + '</div>' +
          nut(false) + '</section>';
      }
      var c = kq.cau, n = c.heSoAnToan;
      function o(v) { return '<td class="r">' + so(v) + '</td>'; }
      var dongQd = c.hang.map(function (h) {
        var lv = MCT.calc.quyDoi(c, h, 'lv', n), klv = MCT.calc.quyDoi(c, h, 'klv', n);
        return '<tr><td class="r">' + so(h.h) + '</td>' + o(lv.N) + o(lv.M) + o(lv.H) + o(klv.N) + o(klv.M) + o(klv.H) + '</tr>';
      }).join('');
      return '<section class="card"><h2>Kiểm tra số liệu</h2>' + canhBao +
        '<div class="ket-luan-lon ok">Số liệu hợp lệ' + (d.tenGoc ? '' : ' – bấm "Lưu cẩu" để thêm vào danh sách') + '</div>' +
        quyTacText({ cau: c, hang: null, nhan: c.nhan.lv }) +
        '<div class="table-wrap"><table class="tbl compact"><thead><tr><th rowspan="2">H (m)</th><th colspan="3">Làm việc (đã nhân n = ' + so(n, 2) + ')</th>' +
        '<th colspan="3">Không làm việc</th></tr><tr><th>N<sub>qđ</sub> (kN)</th><th>M<sub>qđ</sub> (kNm)</th><th>H<sub>qđ</sub> (kN)</th>' +
        '<th>N<sub>qđ</sub> (kN)</th><th>M<sub>qđ</sub> (kNm)</th><th>H<sub>qđ</sub> (kN)</th></tr></thead><tbody>' + dongQd + '</tbody></table></div>' +
        '<div class="params">' + dong('Lực nhổ lớn nhất tại 1 chân cẩu' + (typeof c.pctCoDinh === 'number' ? ' (theo catalogue)' : ' (app tính)'),
          '<i>P</i><sub>ct</sub> =', so(MCT.calc.lucNhoChanCau(c)), 'kN') +
        dong('Mômen xoắn khi làm việc', '<i>T</i> =', c.mXoan !== null ? so(c.mXoan) : c.nhanXoan ? 'theo từng chiều cao' : 'không có', c.mXoan !== null ? 'kNm' : '') +
        '</div>' + nut(true) + '</section>';
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
    moTa: 'Tổng hợp các kiểm tra của sheet Cau thap (giải tích) hoặc theo nội lực ETABS.',
    nhap: function () {
      return '<section class="card"><h2>Phương pháp tính</h2>' + oPhuongPhap() +
        '<p class="hint">Giải tích: như form CC1 (Excel). ETABS: mục B, D lấy theo nội lực ETABS, thêm kiểm tra cọc chịu cắt, ' +
        'tương tác N–M, chuyển vị, góc xoay, đài chịu cắt từ ETABS; mục C, E giữ theo giải tích.</p></section>';
    },
    ketQua: function () {
      var r = ketLuanHienTai();
      if (!r || !r.hopLe) return loiHtml(r);
      var nhomTruoc = '';
      var rows = r.ds.map(function (m) {
        var dauNhom = m.ma !== nhomTruoc ? '<td class="c o-nhom" rowspan="' +
          r.ds.filter(function (x) { return x.ma === m.ma; }).length + '"><button type="button" class="link" data-trang="' +
          m.trang + '">' + m.ma + '</button></td>' : '';
        nhomTruoc = m.ma;
        return '<tr' + (m.ok ? '' : ' class="dong-fail"') + '>' + dauNhom +
          '<td>' + esc(m.ten) + (m.boSung ? ' <span class="nhan-bo-sung" title="Excel không có kiểm tra này">app bổ sung</span>' : '') +
          (m.etabs ? ' <span class="nhan-bo-sung" title="Lấy theo nội lực ETABS">ETABS</span>' : '') + '</td>' +
          '<td class="r nowrap">' + soCoDonVi(m.trai) + '</td><td class="c">' + m.dau + '</td>' +
          '<td class="r nowrap">' + soCoDonVi(m.phai) + '</td><td class="c">' + nhanKetLuan(m.ok) + '</td>' +
          '<td class="c muted">' + (m.oExcel || '–') + '</td></tr>';
      }).join('');
      var bang = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Mục</th><th>Kiểm tra</th><th>Giá trị</th><th></th>' +
        '<th>Giới hạn</th><th>Kết quả</th><th>Ô Excel</th></tr></thead><tbody>' + rows + '</tbody></table></div>';

      var ghiChu = r.phuongPhap === 'etabs'
        ? ghiChuLech('Kết luận theo phương pháp ETABS',
          '<p>Mục B (tải trọng lên cọc) và D (thép đài) lấy theo nội lực ETABS; thêm cọc chịu cắt, tương tác N–M, chuyển vị, góc xoay và đài chịu cắt từ ETABS. ' +
          'Mục C (xuyên thủng) và E (bulong) giữ theo giải tích.</p><p>Kết luận theo giải tích (form CC1): <strong>' + esc(r.ketLuanGiaiTich) + '</strong>.</p>') + canhBaoEtabsCu()
        : ghiChuLech('Khác với ô D143 của Excel',
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
        '<section class="card"><h2>Biểu đồ SPT</h2><div class="coc-layout"><figure class="so-do-wrap bieu-do-svg">' + MCT.bieuDo.spt(r) +
        '<figcaption>Trục đứng: cao độ (m); nét đứt xanh: mực nước ngầm.</figcaption></figure><div>' + bangSpt + '</div></div></section>';
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

  // ---------------- Cọc chịu tải ngang ----------------
  TRANG['tai-ngang'] = {
    tieuDe: 'Kiểm tra cọc chịu tải ngang',
    moTa: 'TCVN 10304 phụ lục A – sheet Kiem tra tai ngang. Tải trọng ngang lấy từ mục A, đặc trưng cọc và hệ số k, αε lấy từ phần sức chịu tải cọc.',
    nhap: function () {
      return '<section class="card"><h2>A. Thông số đầu vào</h2><div class="grid-2"><div class="params">' +
        oNhapSo('taiNgang.M', 'Mômen tác dụng vào đầu cọc', '<i>M</i> =', 'kNm') +
        oNhapSo('taiNgang.l0', 'Chiều dài cọc từ đáy đài tới cao độ san nền', '<i>l</i><sub>0</sub> =', 'm') +
        oNhapSo('taiNgang.A0', 'Hệ số A<sub>0</sub>', '<i>A</i><sub>0</sub> =', '') +
        oNhapSo('taiNgang.B0', 'Hệ số B<sub>0</sub>', '<i>B</i><sub>0</sub> =', '') +
        oNhapSo('taiNgang.C0', 'Hệ số C<sub>0</sub>', '<i>C</i><sub>0</sub> =', '') +
        oNhapSo('taiNgang.gioiHanChuyenVi', 'Giới hạn chuyển vị đầu cọc', '[Δ] =', 'cm') +
        oNhapSo('taiNgang.gioiHanGocXoay', 'Giới hạn góc xoay đầu cọc', '[ψ] =', 'độ') +
        '</div><div class="params">' +
        oNhapSo('taiNgang.phiB3', 'Hệ số φ<sub>b3</sub> (khả năng chịu cắt bê tông)', 'φ<sub>b3</sub> =', '') +
        oChon('taiNgang.thepDai', MCT.data.vatLieu.cotThep.map(function (c) { return c.nhom; }), 'Nhóm thép đai') +
        oNhapSo('taiNgang.dDai', 'Đường kính thép đai', '<i>d</i> =', 'mm') +
        oNhapSo('taiNgang.aDai', 'Khoảng cách thép đai', '<i>a</i> =', 'mm') +
        oNhapSo('taiNgang.nBar', 'Hệ số n̄ (tính η<sub>2</sub>)', 'n̄ =', '') +
        oNhapSo('taiNgang.eta1', 'Hệ số η<sub>1</sub>', 'η<sub>1</sub> =', '') +
        oNhapSo('taiNgang.xi', 'Hệ số ξ', 'ξ =', '') +
        '</div></div></section>';
    },
    ketQua: function () {
      var r = tatCa && tatCa.TN;
      if (!r || r.hopLe === false && !r.bang) return loiHtml(r);
      var g = r.ghiChu || {};
      var b = '<section class="card"><h2>B. Chuyển vị ngang và góc xoay đầu cọc</h2><div class="grid-2"><div class="params">' +
        dong('Lực cắt tác dụng vào đầu cọc (max H<sub>tt</sub>/n/' + r.nCoc + ' cọc)', '<i>H</i> =', so(r.H, 2), 'kN') +
        dong('Mômen quán tính tiết diện cọc', '<i>I</i> =', so(r.I, 5), 'm⁴') +
        dong('Mô đun đàn hồi bê tông', '<i>E</i> =', so(r.E, 0), 'MPa') +
        dong('Hệ số nền', '<i>K</i> =', so(r.K, 1), 'kN/m⁴') +
        dong('Hệ số biến dạng', 'α<sub>ε</sub> =', so(r.alphaE, 4), '1/m') +
        '</div><div class="params">' +
        dong('δ<sub>HH</sub> = A<sub>0</sub>/(α<sub>ε</sub>³EI)', '', so(r.dHH, 4), '×10⁻⁵ m/kN') +
        dong('δ<sub>HM</sub> = δ<sub>MH</sub> = B<sub>0</sub>/(α<sub>ε</sub>²EI)', '', so(r.dHM, 4), '×10⁻⁵ 1/kN') +
        dong('δ<sub>MM</sub> = C<sub>0</sub>/(α<sub>ε</sub>EI)', '', so(r.dMM, 4), '×10⁻⁵ 1/kNm') +
        dong('Tại cao trình mặt đất: H<sub>0</sub> / M<sub>0</sub>', '', so(r.H0, 2) + ' / ' + so(r.M0, 2), 'kN / kNm') +
        dong('y<sub>0</sub> / ψ<sub>0</sub>', '', so(r.y0, 4) + ' / ' + so(r.psi0, 4), 'cm / độ') +
        '</div></div>' +
        '<div class="table-wrap" style="margin-top:12px"><table class="tbl kiem-tra"><tbody>' +
        '<tr><td>Δ = ' + so(r.Delta, 4) + ' cm</td><td class="c">' + (r.okDelta ? '≤' : '>') + '</td><td>[Δ] = ' + so(r.gioiHanChuyenVi, 2) + ' cm</td><td class="c">' + nhanKetLuan(r.okDelta) + '</td></tr>' +
        '<tr><td>ψ = ' + so(r.psi, 4) + '°</td><td class="c">' + (r.okPsi ? '≤' : '>') + '</td><td>[ψ] = ' + so(r.gioiHanGocXoay, 2) + '°</td><td class="c">' + nhanKetLuan(r.okPsi) + '</td></tr>' +
        '</tbody></table></div></section>';

      var bd = '<section class="card"><h2>C, D, E. Mômen, lực cắt và áp lực ngang dọc thân cọc</h2>' +
        '<div class="ba-bieu-do bieu-do-svg">' + MCT.bieuDo.noiLuc(r.bang, 'M', 'MOMENT DỌC THÂN CỌC', 'Mz (kNm)', '#0a58a8') +
        MCT.bieuDo.noiLuc(r.bang, 'Q', 'LỰC CẮT DỌC THÂN CỌC', 'Qz (kN)', '#b45309') +
        MCT.bieuDo.noiLuc(r.bang, 'sigma', 'ÁP LỰC NGANG', 'σz (kN/m²)', '#18794e') + '</div>' +
        '<div class="params" style="margin-top:10px">' +
        dong('Mômen lớn nhất dọc thân cọc (tại z = ' + so(r.zM, 2) + ' m so với cao độ đáy đài)', '<i>M</i><sub>z</sub> =', so(r.Mmax, 2), 'kNm') +
        dong('Lực cắt lớn nhất (tại z = ' + so(r.zQ, 2) + ' m)', '<i>Q</i><sub>z</sub> =', so(r.Qmax, 2), 'kN') +
        dong('Áp lực ngang lớn nhất (tại z = ' + so(r.zSigma, 2) + ' m)', 'σ<sub>z</sub> =', so(r.sigmaMax, 2), 'kN/m²') +
        '</div><details class="more"><summary>Bảng 41 điểm dọc thân cọc (z̄<sub>e</sub> = 0 … 4)</summary><div class="table-wrap" style="margin-top:8px">' +
        '<table class="tbl compact"><thead><tr><th>z̄<sub>e</sub></th><th>z (m)</th><th>M (kNm)</th><th>Q (kN)</th><th>σ<sub>z</sub> (kN/m²)</th></tr></thead><tbody>' +
        r.bang.map(function (x) {
          return '<tr><td class="r">' + so(x.ze, 1) + '</td><td class="r">' + so(x.z, 3) + '</td><td class="r">' + so(x.M, 2) +
            '</td><td class="r">' + so(x.Q, 2) + '</td><td class="r">' + so(x.sigma, 3) + '</td></tr>';
        }).join('') + '</tbody></table></div></details></section>';

      var cat = '<section class="card"><h2>D. Khả năng chịu cắt của cọc</h2><div class="params">' +
        dong('Bê tông: Q<sub>min</sub> = φ<sub>b3</sub>R<sub>bt</sub>A<sub>b0</sub> (R<sub>bt</sub> = R<sub>bt</sub>×0,85×0,7 = ' + so(r.Rbt, 4) +
          ' MPa; A<sub>b0</sub> = π(D−0,05)²/4 = ' + so(r.Ab0, 4) + ' m²)', '<i>Q</i><sub>min</sub> =', so(r.Qmin, 2), 'kN') +
        dong('Thép đai ' + esc(r.thepDai) + ' Ø' + so(r.dDai, 0) + 'a' + so(r.aDai, 0) + ': Q<sub>steel</sub> = 2·π·d²/4·R<sub>sw</sub>/a (R<sub>sw</sub> = ' + so(r.Rsw, 0) + ' MPa)',
          '<i>Q</i><sub>steel</sub> =', so(r.Qsteel, 2), 'kN') +
        '</div><div class="table-wrap" style="margin-top:8px"><table class="tbl kiem-tra"><tbody><tr><td>[Q] = ' + so(r.Qgh, 2) +
        ' kN</td><td class="c">' + (r.okQ ? '≥' : '<') + '</td><td>Q<sub>z</sub> = ' + so(r.Qmax, 2) + ' kN</td><td class="c">' + nhanKetLuan(r.okQ) +
        '</td></tr></tbody></table></div></section>';

      var f = '<section class="card"><h2>F. Kiểm tra ổn định đất nền quanh cọc</h2><div class="ke-ben"><div>' +
        '<div class="formula">σ<sub>z</sub> ≤ [σ<sub>z</sub>] = 4η<sub>1</sub>η<sub>2</sub>(γ<sub>I</sub>·z·tgφ<sub>I</sub> + ξc<sub>I</sub>)/cosφ<sub>I</sub></div><div class="params">' +
        dong('α<sub>ε</sub>·L (L = ' + so(r.L, 2) + ' m)', '', so(r.alphaL, 3), '') +
        dong('Chiều sâu kiểm tra (αεL ≤ 2,5 → z = L/3; αεL > 2,5 → z = 0,85/αε)', '<i>z</i> =', so(r.zKT, 3), 'm') +
        dong('Cao độ kiểm tra (z + cao độ đáy đài) – lớp ' + esc(r.lopZ || '–'), '', so(r.zCaoDo, 3), 'm') +
        dong('η<sub>1</sub> / η<sub>2</sub> / ξ', '', so(r.eta1, 2) + ' / ' + so(r.eta2, 4) + ' / ' + so(r.xi, 2), '') +
        dong('γ<sub>I</sub> (trung bình, kể đẩy nổi) / c<sub>I</sub> / φ<sub>I</sub>', '', so(r.gammaTB, 3) + ' / ' + so(r.cI, 2) + ' / ' + so(r.phiI, 2), 'kN/m³ · kN/m² · độ') +
        '</div><div class="table-wrap" style="margin-top:8px"><table class="tbl kiem-tra"><tbody><tr><td>σ<sub>z</sub> = ' + so(r.sigmaMax, 3) +
        ' kN/m²</td><td class="c">' + (r.okOnDinh ? '≤' : '>') + '</td><td>[σ<sub>z</sub>] = ' + so(r.sigmaGh, 3) + ' kN/m²</td><td class="c">' +
        nhanKetLuan(r.okOnDinh) + '</td></tr></tbody></table></div>' + loiHtml(r) + '</div>' +
        ghiChuLech('Sai khác trong Excel',
          '<p><strong>σ<sub>z</sub> chia thêm 3:</strong> cột AC dùng K/3/α<sub>ε</sub>·z̄<sub>e</sub>·(…). Không chia 3: σ<sub>z,max</sub> = ' +
          so(g.sigmaKhongChia3, 3) + ' kN/m² (' + (g.okKhongChia3 ? 'vẫn đạt' : '<strong>không đạt</strong>') + ').</p>' +
          '<p><strong>η<sub>2</sub>:</strong> Excel lấy ' + so(r.eta2, 4) + ' từ sheet mô hình (theo M<sub>qđ</sub> của cẩu); η<sub>2</sub> tính tại chỗ (J124) = ' +
          so(g.eta2TaiCho, 4) + ' → [σ<sub>z</sub>] = ' + so(g.sigmaGhTaiCho, 3) + ' kN/m².</p>' +
          '<p><strong>l<sub>0</sub>:</strong> ở đây l<sub>0</sub> = ' + so(r.l0, 2) + ' m, phần sức chịu tải cọc dùng l<sub>0</sub> = ' + so(g.l0SCT, 2) + ' m. A<sub>0</sub>, B<sub>0</sub>, C<sub>0</sub> nhập tay.</p>') +
        '</div></section>';
      return b + bd + cat + f;
    }
  };

  // ---------------- Biểu đồ tương tác ----------------
  TRANG['tuong-tac'] = {
    tieuDe: 'Biểu đồ tương tác cọc',
    moTa: 'Biểu đồ N–M tiết diện cọc tròn (sheet Bieu do tuong tac). Tiết diện, thép, vật liệu lấy từ phần sức chịu tải cọc; ' +
      'M lấy từ tải ngang, N lấy Pmax/Pmin của mục B.',
    nhap: function () {
      return '<section class="card"><h2>A. Thông số cọc</h2><div class="params">' +
        oNhapSo('tuongTac.a', 'Lớp bê tông bảo vệ (tính tới tâm cốt thép)', '<i>a</i> =', 'mm') +
        '</div></section>';
    },
    ketQua: function () {
      var r = tatCa && tatCa.TT;
      if (!r || !r.hopLe) return loiHtml(r);
      var a = '<section class="card"><h2>Thông số cọc và vật liệu</h2><div class="grid-2"><div class="params">' +
        dong('Đường kính tiết diện cọc', '<i>D</i> =', so(r.D, 2), 'm') +
        dong('Bán kính tiết diện cọc', '<i>r</i> =', so(r.r, 2), 'm') +
        dong('Diện tích tiết diện ngang', '<i>A</i><sub>b</sub> =', so(r.Ab, 3), 'm²') +
        dong('Số thanh thép / đường kính', '<i>n</i>, <i>d</i> =', r.n + ' Ø' + so(r.d, 0), '') +
        dong('Diện tích cốt thép', '<i>A</i><sub>s</sub> =', so(r.As, 0), 'mm²') +
        '</div><div class="params">' +
        dong('Bê tông ' + esc(r.beTong) + ': R<sub>b</sub> / R\'<sub>b</sub> = R<sub>b</sub>γ<sub>cb</sub>γ\'<sub>cb</sub>', '', so(r.Rb, 2) + ' / ' + so(r.Rb2, 3), 'MPa') +
        dong('R<sub>bt</sub> / R\'<sub>bt</sub>', '', so(r.Rbt, 2) + ' / ' + so(r.Rbt2, 3), 'MPa') +
        dong('Cốt thép ' + esc(r.cotThep) + ': R<sub>s</sub> / R<sub>sc</sub>', '', so(r.Rs, 0) + ' / ' + so(r.Rsc, 0), 'MPa') +
        dong('β = a/D ; α = R<sub>s</sub>A<sub>s</sub>/(R<sub>b</sub>A<sub>b</sub>) ; δ = 1,5 + 6R<sub>s</sub>·10⁻⁴', '',
          so(r.beta, 3) + ' ; ' + so(r.alpha, 4) + ' ; ' + so(r.delta, 3), '') +
        '</div></div></section>';
      var kt = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Trường hợp</th><th>M (kNm)</th><th>N (kN)</th><th>M giới hạn tại N (kNm)</th><th>Kết quả</th></tr></thead><tbody>' +
        r.diemNoiLuc.map(function (p) {
          return '<tr><td>' + esc(p.ten.replace('_', '')) + '</td><td class="r">' + so(p.M) + '</td><td class="r">' + so(p.N) + '</td><td class="r">' +
            so(p.Mgh) + '</td><td class="c">' + nhanKetLuan(p.ok) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var b = '<section class="card"><h2>C. Ngoại lực và biểu đồ tương tác</h2><div class="coc-layout coc-layout-rong">' +
        '<figure class="so-do-wrap bieu-do-svg">' + MCT.bieuDo.tuongTac(r) +
        '<figcaption>Đường bao: 31 điểm φ = 0…π (bước π/30), lấy đối xứng; điểm đỏ: nội lực (M<sub>z,max</sub>; P<sub>max</sub>) và (M<sub>z,max</sub>; P<sub>min</sub>).</figcaption></figure>' +
        '<div>' + kt + ghiChuLech('App bổ sung', '<p>Sheet Excel chỉ vẽ biểu đồ, <strong>không có ô kiểm tra</strong>. App bổ sung kiểm tra: |M| ≤ M giới hạn ' +
          'nội suy trên đường bao tại cùng lực dọc N.</p><p>Biểu đồ dùng R<sub>b</sub> = ' + so(r.Rb, 1) + ' MPa (không nhân γ<sub>cb</sub>γ\'<sub>cb</sub>) như Excel; ' +
          'điểm đóng biểu đồ phía kéo (M = 0; N = ' + so(r.NTrend, 0) + ' kN) là ngoại suy TREND như ô D80.</p>') +
        '</div></div>' +
        '<details class="more"><summary>Bảng 31 điểm của biểu đồ</summary><div class="table-wrap" style="margin-top:8px"><table class="tbl compact"><thead><tr>' +
        '<th>STT</th><th>φ (rad)</th><th>ξ</th><th>φ<sub>s</sub></th><th>M (kNm)</th><th>N (kN)</th></tr></thead><tbody>' +
        r.diem.map(function (p, i) {
          return '<tr><td class="c">' + i + '</td><td class="r">' + so(p.phi, 4) + '</td><td class="r">' + so(p.xi, 4) + '</td><td class="r">' + so(p.phis, 4) +
            '</td><td class="r">' + so(p.M, 2) + '</td><td class="r">' + so(p.N, 2) + '</td></tr>';
        }).join('') + '</tbody></table></div></details></section>';
      return a + b;
    }
  };

  // ---------------- Ổn định – lún ----------------
  TRANG.lun = {
    tieuDe: 'Kiểm tra ổn định đất nền và lún',
    moTa: 'Móng khối quy ước (TCVN 10304:2025), sức chịu tải nền theo 4.6.9 TCVN 9362:2012, lún theo phụ lục C TCVN 9362:2012 – sheet On dinh - Lun.',
    nhap: function () {
      return '<section class="card"><h2>Số liệu nhập</h2><div class="grid-2"><div class="params">' +
        oChon('lun.viTri', ['Có hầm', 'Không hầm'], 'Vị trí móng') +
        oNhapSo('lun.m1', 'Hệ số điều kiện làm việc của nền', '<i>m</i><sub>1</sub> =', '') +
        oNhapSo('lun.m2', 'Hệ số điều kiện làm việc của công trình', '<i>m</i><sub>2</sub> =', '') +
        oNhapSo('lun.ktc', 'Hệ số tin cậy', '<i>k</i><sub>tc</sub> =', '') +
        '</div><div class="params">' +
        oNhapSo('lun.gammaKc', 'Trọng lượng thể tích kết cấu sàn hầm', 'γ<sub>kc</sub> =', 'kN/m³') +
        oNhapSo('lun.Smax', 'Độ lún giới hạn', '<i>S</i><sub>max</sub> =', 'cm') +
        oNhapSo('lun.soDiem', 'Số điểm tính lún (bước h<sub>i</sub> = 0,2Y<sub>qu</sub>)', '', 'điểm') +
        '</div></div></section>';
    },
    ketQua: function () {
      var r = tatCa && tatCa.LUN;
      if (!r || !r.hopLe) return loiHtml(r);
      function kt(trai, dau, phai, ok) {
        return '<tr><td>' + trai + '</td><td class="c">' + dau + '</td><td>' + phai + '</td><td class="c">' + nhanKetLuan(ok) + '</td></tr>';
      }
      var b = '<section class="card"><h2>B. Kích thước móng khối quy ước</h2><div class="grid-2"><div class="params">' +
        dong('Góc ma sát trung bình các lớp cọc xuyên qua', 'φ<sub>tb</sub> = Σφ<sub>i</sub>l<sub>i</sub>/Σl<sub>i</sub> =', so(r.phiTb, 2), 'độ') +
        dong('Tổng chiều dài đoạn cọc', 'Σl<sub>i</sub> =', so(r.tongL, 2), 'm') +
        dong('Loại đất / chỉ số sệt tại mũi cọc', '', esc(r.loaiMui || '–') + ' / ' + so(r.ILmui, 2), '') +
        '</div><div class="params">' +
        dong('Khoảng mở rộng', '<i>a</i> = Σl<sub>i</sub>·tg(φ<sub>tb</sub>/4) =', so(r.a, 3), 'm') +
        dong('Chiều dài khối quy ước', '<i>X</i><sub>qu</sub> =', so(r.Xqu, 3), 'm') +
        dong('Chiều rộng khối quy ước', '<i>Y</i><sub>qu</sub> =', so(r.Yqu, 3), 'm') +
        '</div></div></section>';
      var c = '<section class="card"><h2>C. Trọng lượng móng khối quy ước</h2><div class="params">' +
        dong('Trọng lượng đài nằm dưới mặt đất tự nhiên', '<i>Q</i><sub>đài</sub> =', so(r.Qdai), 'kN') +
        dong('Trọng lượng cọc nằm dưới mặt đất tự nhiên', '<i>Q</i><sub>cọc</sub> =', so(r.Qcoc), 'kN') +
        dong('Trọng lượng đất đài chiếm chỗ', '<i>Q</i>*<sub>đài</sub> =', so(r.QdaiCho), 'kN') +
        dong('Trọng lượng đất cọc chiếm chỗ', '<i>Q</i>*<sub>cọc</sub> =', so(r.QcocCho), 'kN') +
        dong('Trọng lượng đất trong khối quy ước', '<i>Q</i><sub>đất</sub> =', so(r.Qdat), 'kN') +
        dong('Trọng lượng khối móng quy ước', '<i>Q</i><sub>qu</sub> =', so(r.Qqu), 'kN') +
        '</div></section>';
      var d = '<section class="card"><h2>D. Áp lực tiêu chuẩn tại đáy móng khối quy ước</h2>' +
        '<p class="hint">Tải tiêu chuẩn = tải quy đổi / n (n = ' + so(tatCa.A.n, 1) + '); tay cần đặt theo góc α = ' + so(r.gocAlpha, 1) + '° so với trục X (góc lớn nhất của các cọc).</p>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th></th><th>N<sub>qu</sub> (kN)</th><th>M<sub>x,qu</sub> (kNm)</th><th>M<sub>y,qu</sub> (kNm)</th></tr></thead><tbody>' +
        '<tr><td>Khi cẩu làm việc</td><td class="r">' + so(r.quLv.N) + '</td><td class="r">' + so(r.quLv.Mx) + '</td><td class="r">' + so(r.quLv.My) + '</td></tr>' +
        '<tr><td>Khi cẩu không làm việc</td><td class="r">' + so(r.quKlv.N) + '</td><td class="r">' + so(r.quKlv.Mx) + '</td><td class="r">' + so(r.quKlv.My) + '</td></tr>' +
        '</tbody></table></div><div class="params" style="margin-top:8px">' +
        dong('Mômen chống uốn W<sub>x</sub> / W<sub>y</sub>', '', so(r.Wx, 2) + ' / ' + so(r.Wy, 2), 'm³') +
        dong('p<sub>tc,tb</sub> = N<sub>qu</sub>/A<sub>qu</sub>', '', so(r.ptb), 'kPa') +
        dong('p<sub>tc,max</sub> / p<sub>tc,min</sub> = N/A ± M<sub>x</sub>/W<sub>x</sub> ± M<sub>y</sub>/W<sub>y</sub>', '', so(r.pmax) + ' / ' + so(r.pmin), 'kPa') +
        '</div></section>';
      var e = '<section class="card"><h2>E. Sức chịu tải của đất nền tại mặt phẳng mũi cọc (4.6.9 TCVN 9362:2012)</h2>' +
        '<div class="formula"><i>R</i> = m<sub>1</sub>m<sub>2</sub>/k<sub>tc</sub> × (A·b·γ<sub>II</sub> + B·h·γ\'<sub>II</sub> + D·c<sub>II</sub> − γ<sub>II</sub>·h<sub>0</sub>)</div>' +
        '<div class="grid-2"><div class="params">' +
        dong('b (cạnh bé khối quy ước)', '', so(r.b, 3), 'm') +
        dong('φ<sub>II</sub> → A / B / D', '', so(r.phiII, 1) + '° → ' + so(r.A, 3) + ' / ' + so(r.B, 3) + ' / ' + so(r.Dr, 3), '') +
        dong('c<sub>II</sub>', '', so(r.cII, 2), 'kN/m²') +
        dong('γ<sub>II</sub> / γ\'<sub>II</sub>', '', so(r.gammaII, 2) + ' / ' + so(r.gammaII2, 3), 'kN/m³') +
        '</div><div class="params">' +
        dong('h / h<sub>1</sub> / h<sub>2</sub>', '', so(r.h, 2) + ' / ' + so(r.h1, 2) + ' / ' + so(r.h2, 2), 'm') +
        dong('h<sub>tđ</sub> = h<sub>1</sub> + h<sub>2</sub>γ<sub>kc</sub>/γ\'<sub>II</sub>', '', so(r.htd, 2), 'm') +
        dong('h<sub>0</sub> (chiều sâu đến nền tầng hầm)', '', so(r.h0, 2), 'm') +
        dong('Áp lực cho phép', '<i>R</i> =', so(r.R), 'kPa') +
        '</div></div><div class="table-wrap" style="margin-top:8px"><table class="tbl kiem-tra"><tbody>' +
        kt('p<sub>tc,tb</sub> = ' + so(r.ptb) + ' kPa', '≤', 'R = ' + so(r.R) + ' kPa', r.ok1) +
        kt('p<sub>tc,max</sub> = ' + so(r.pmax) + ' kPa', '≤', '1,2R = ' + so(1.2 * r.R) + ' kPa', r.ok2) +
        kt('p<sub>tc,min</sub> = ' + so(r.pmin) + ' kPa', '≥', '0', r.ok3) +
        '</tbody></table></div></section>';
      var bangE = '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Lớp</th><th>N<sub>SPT</sub></th><th>E Excel (MPa)</th><th>E đúng mã hạt (MPa)</th></tr></thead><tbody>' +
        r.Elop.map(function (x) {
          var lech = Math.abs(x.E - x.Edung) > 1e-9;
          return '<tr><td class="c">' + esc(x.ten) + '</td><td class="r">' + so(x.NSPT, 2) + '</td><td class="r' + (lech ? ' o-lech' : '') + '">' + so(x.E, 2) +
            (lech ? ' <span class="canh-bao">⚠</span>' : '') + '</td><td class="r">' + so(x.Edung, 2) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var bangDiem = '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Điểm</th><th>z (m)</th><th>Cao độ (m)</th><th>Lớp</th><th>E (MPa)</th>' +
        '<th>α</th><th>p<sub>0zi</sub> (kPa)</th><th>p<sub>dzi</sub> (kPa)</th></tr></thead><tbody>' +
        r.diem.map(function (x, i) {
          return '<tr><td class="c">' + i + '</td><td class="r">' + so(x.z, 3) + '</td><td class="r">' + so(x.cao, 3) + '</td><td class="c">' + esc(x.lop) +
            '</td><td class="r">' + so(x.E, 2) + '</td><td class="r">' + so(x.alpha, 4) + '</td><td class="r">' + so(x.p0z, 2) + '</td><td class="r">' + so(x.pdz, 2) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var f = '<section class="card"><h2>F. Kiểm tra độ lún của móng (phụ lục C TCVN 9362:2012)</h2>' +
        '<div class="formula"><i>S</i> = β·Σ(p<sub>i</sub>h<sub>i</sub>/E<sub>i</sub>) ≤ S<sub>max</sub>;   β = 0,8;   E<sub>i</sub> = [a + c(N<sub>SPT</sub> + 6)]/10 (Tassios, Anagnostopoulos)</div>' +
        '<div class="params">' +
        dong('Áp lực bản thân tại mặt phẳng mũi cọc', '<i>p</i><sub>dz(0)</sub> =', so(r.pdz0), 'kPa') +
        dong('Áp lực phụ thêm tại mũi cọc', '<i>p</i><sub>0</sub> = p<sub>tc,tb</sub> − p<sub>dz(0)</sub> =', so(r.p0), 'kPa') +
        dong('Chiều dày lớp phân tố', '<i>h</i><sub>i</sub> = 0,2Y<sub>qu</sub> =', so(r.hi, 3), 'm') +
        '</div><div class="ke-ben" style="margin-top:10px"><div>' + bangE + '</div>' +
        ghiChuLech('Lỗi hàm TinhE trong Excel', '<p>Excel truyền kích thước hạt dạng chữ ("Thô") thay vì mã ("T") vào TinhE, nên với <strong>đất cát</strong> hệ số c = 0. ' +
          'App tính giống Excel (ô ⚠). Nếu dùng đúng mã: <strong>S = ' + so(r.ghiChu.SDung, 2) + ' cm</strong> (' + (r.ghiChu.okSDung ? 'đạt' : 'không đạt') + ').</p>') +
        '</div><details class="more"><summary>Bảng ' + r.diem.length + ' điểm tính lún</summary><div style="margin-top:8px">' + bangDiem + '</div></details>' +
        '<div class="table-wrap" style="margin-top:10px"><table class="tbl kiem-tra"><tbody>' +
        kt('S = ' + so(r.S, 2) + ' cm', '≤', 'S<sub>max</sub> = ' + so(r.Smax, 1) + ' cm', r.okS) + '</tbody></table></div>' +
        '<p class="hint">Điểm đầu tiên thỏa p<sub>0zi</sub> ≤ 0,1p<sub>dzi</sub>: z = ' + (r.diemDungLun === null ? 'chưa đạt trong số điểm đã tính' : so(r.diemDungLun, 2) + ' m') + '.</p></section>';
      return b + c + d + e + f;
    }
  };

  // ---------------- Khung điều hướng ----------------
  // Trạng thái đạt/không đạt của từng mục để hiện ở thanh danh mục
  // ---------------- Tính bằng ETABS (chỉ có trong chương trình Windows MongCauThap.exe) ----------------
  var etabsKq = null;          // kết quả lệnh kiểm tra gần nhất
  var etabsDangKyKq = null;    // kết quả lệnh đăng ký / gỡ đăng ký giao diện gần nhất
  var etabsDangChay = false;
  var etabsDungKq = null;      // kết quả lệnh dựng mô hình gần nhất
  var etabsPhanTichKq = null;  // kết quả lệnh phân tích gần nhất (các bước; nội lực thô chỉ giữ trong bộ nhớ)
  // Tóm tắt nội lực ETABS lưu trên máy: { vanTay, thoiDiem, file, tomTat } – dùng cho kiểm tra, kết luận, thuyết minh
  var KHOA_ETABS = 'mong-cau-thap.etabs.v1';
  var etabsLuu = (function () {
    try { var t = JSON.parse(localStorage.getItem(KHOA_ETABS) || 'null'); return t && t.tomTat ? t : null; } catch (e) { return null; }
  })();
  function luuKetQuaEtabs(gt) {
    etabsLuu = gt;
    try { localStorage.setItem(KHOA_ETABS, JSON.stringify(gt)); return true; } catch (e) { return false; }
  }

  function coChuongTrinh() { return !!(window.mctDesktop && window.mctDesktop.etabs); }

  var TEN_BUOC_ETABS = {
    'doc-yeu-cau': 'Đọc yêu cầu', 'tim-etabs': 'Tìm ETABS đang mở', 'tim-dll': 'Tìm thư viện API (ETABSv1.dll)',
    'nap-dll': 'Nạp thư viện API', 'kiem-tra-com': 'Đăng ký COM của ETABS', 'ket-noi': 'Gắn vào phiên ETABS',
    'doc-mo-hinh': 'Đọc mô hình đang mở', 'he-dieu-hanh': 'Hệ điều hành', 'cau-noi': 'Chạy cầu nối',
    'net8': '.NET 8', 'loi-chung': 'Lỗi khác', 'tim-tlb': 'Tìm type library (.tlb)', 'dang-ky': 'Đăng ký giao diện',
    'go-dang-ky': 'Gỡ đăng ký giao diện', 'kiem-tra-dang-ky': 'Kiểm tra đăng ký',
    'mo-hinh-moi': 'Mô hình mới', 'tang': 'Tầng (cao độ nút)', 'vat-lieu': 'Vật liệu', 'tiet-dien': 'Tiết diện',
    'diem': 'Điểm', 'thanh': 'Thanh cọc', 'vo': 'Vỏ (tấm đài)', 'lo-xo': 'Lò xo đất', 'goi': 'Gối mũi cọc',
    'luu': 'Lưu file .EDB', 'kiem-tra-so-luong': 'Kiểm tra số lượng trong ETABS',
    'tai-trong': 'Load pattern và tải tại tâm đài', 'to-hop': 'Tổ hợp tải trọng',
    'kiem-tra-mo-hinh': 'Mô hình đang mở trong ETABS', 'phan-tich': 'Chạy phân tích', 'chon-to-hop': 'Chọn tổ hợp xuất kết quả',
    'noi-luc-coc': 'Nội lực cọc', 'chuyen-vi': 'Chuyển vị', 'noi-luc-dai': 'Nội lực tấm đài'
  };

  function bangBuocEtabs(r) {
    var dong = (r.buoc || []).map(function (b) {
      return '<tr><td class="c">' + (b.ok ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-fail">Lỗi</span>') +
        '</td><td>' + esc(TEN_BUOC_ETABS[b.ten] || b.ten) + '</td><td>' + esc(b.chiTiet) + '</td></tr>';
    }).join('');
    return dong ? '<div class="table-wrap"><table class="tbl compact"><thead><tr><th></th><th>Bước</th><th>Chi tiết</th></tr></thead><tbody>' +
      dong + '</tbody></table></div>' : '';
  }

  // Lời khuyên theo mã gợi ý cầu nối trả về
  function goiYEtabs(r) {
    var t = r.thongTin || {};
    var dk = t.registerEtabs ? '<code>' + esc(t.registerEtabs) + '</code>' : '<code>RegisterETABS.exe</code> trong thư mục cài ETABS';
    var GOI_Y = {
      'mo-etabs': ['Chưa mở ETABS', 'Mở ETABS v23 (mở mô hình hoặc New Model) rồi bấm Kiểm tra kết nối.'],
      'tim-dll': ['Không thấy thư viện API', 'Nhập thư mục cài ETABS vào ô phía trên, ví dụ <code>C:\\Program Files\\Computers and Structures\\ETABS 23</code>.'],
      'mo-mo-hinh': ['ETABS chưa mở mô hình', 'Đã gắn được vào ETABS nhưng chưa có mô hình. Vào <strong>File → New Model</strong> ' +
        '(mô hình trống, đơn vị kN-m) hoặc mở một file .EDB, đợi mô hình hiện ra rồi bấm Kiểm tra kết nối.'],
      'quyen-admin': ['ETABS đang chạy bằng quyền Administrator', 'ETABS đang chạy bằng <strong>Run as administrator</strong> còn MongCauThap.exe thì không, ' +
        'Windows chặn hai bên trao đổi. Đóng ETABS rồi mở lại <strong>bình thường</strong> (nhấp đúp, không chọn Run as administrator), mở mô hình, rồi bấm Kiểm tra kết nối.'],
      'dang-ky-api': ['ETABS chưa đăng ký API với Windows', 'Đóng ETABS, nhấp chuột phải ' + dk + ' → <strong>Run as administrator</strong>, rồi mở lại ETABS và thử lại.'],
      'rot': ['ETABS chưa đăng ký phiên làm việc', 'Windows không thấy phiên ETABS đang mở. Đóng ETABS, mở lại (không dùng Run as administrator) rồi thử lại. ' +
        'Nếu vẫn lỗi: chạy ' + dk + ' bằng Run as administrator.'],
      'net8': ['Thiếu .NET 8', 'Cầu nối chạy trên .NET 8 (ETABS 22+ thường đã cài sẵn). Cài <strong>.NET Desktop Runtime 8</strong> (x64) từ trang dotnet.microsoft.com rồi thử lại.'],
      'dang-ky-giao-dien': ['Windows thiếu đăng ký giao diện API của ETABS',
        'Chương trình đã gắn được vào ETABS và gọi được hàm đơn giản' + (t.apiPhienBan ? ' (phiên bản API ' + esc(t.apiPhienBan) + ')' : '') +
        ', nhưng Windows không chuyển được đối tượng mô hình (SapModel) giữa ETABS và chương trình – lỗi E_NOINTERFACE, ' +
        'do thiếu đăng ký type library của ETABS.</p><p><strong>Cách 1 (khuyên dùng):</strong> đóng ETABS, nhấp chuột phải ' + dk +
        ' → <strong>Run as administrator</strong>, mở lại ETABS bình thường rồi bấm Kiểm tra kết nối.</p>' +
        (t.nguonTypeLib && t.nguonTypeLib.length
          ? '<p><strong>Cách 2 (không cần quyền Administrator):</strong> bấm nút bên dưới để đăng ký cho riêng tài khoản Windows này, ' +
            'sau đó đóng ETABS, mở lại rồi bấm Kiểm tra kết nối.</p>' +
            '<p><button type="button" class="btn" data-action="etabs-dang-ky">Đăng ký giao diện ETABS cho tài khoản này</button> ' +
            '<button type="button" class="btn btn-ghost" data-action="etabs-go-dang-ky">Gỡ đăng ký</button>'
          : '<p>Không tìm thấy type library trong thư mục ETABS nên chỉ dùng được cách 1.')],
      'chay-register': ['Windows chưa đăng ký giao diện API của ETABS', 'Các giao diện API của ETABS (cOAPI, cSapModel…) chưa được đăng ký với Windows, ' +
        'nên chương trình khác gắn được vào ETABS nhưng không lấy được mô hình. Chỉ cần làm <strong>một lần</strong>:</p><ol>' +
        '<li>Đóng ETABS.</li><li>Nhấp chuột phải ' + dk + ' → <strong>Run as administrator</strong>, đợi chạy xong.</li>' +
        '<li>Mở lại ETABS <strong>bình thường</strong> (không chọn Run as administrator) và mở mô hình.</li>' +
        '<li>Bấm Kiểm tra kết nối.</li></ol><p>Nếu vẫn báo lỗi này sau khi chạy RegisterETABS.exe, mở Chi tiết kỹ thuật và gửi lại nội dung.'],
      'het-gio': ['ETABS không phản hồi', 'Có thể ETABS đang mở một hộp thoại hoặc đang chạy phân tích. Đóng các hộp thoại trong ETABS, đợi ETABS rảnh rồi thử lại.'],
      'ket-noi': ['Không gắn được vào ETABS', 'Thử: đóng hết ETABS rồi mở lại một phiên; mở cả ETABS và MongCauThap.exe cùng quyền (cùng chạy bình thường). ' +
        'Nếu vẫn lỗi, mở Chi tiết kỹ thuật bên dưới và gửi lại nội dung.']
    };
    return [r.goiY].concat(r.goiYThem || []).filter(function (m, i, ds) { return m && GOI_Y[m] && ds.indexOf(m) === i; })
      .map(function (m, i) {
        var g = GOI_Y[m];
        return '<div class="ghi-chu-lech"' + (i ? ' style="margin-top:10px"' : '') + '><h3>' + (i ? 'Thêm: ' : '') + g[0] + '</h3><p>' + g[1] + '</p></div>';
      }).join('');
  }

  TRANG.etabs = {
    tieuDe: 'Kết nối ETABS',
    moTa: 'Bước 1 của chức năng tính bằng phần mềm ETABS: kiểm tra chương trình gắn được vào ETABS v22/v23 đang mở trên máy.',
    nhap: function () {
      if (!coChuongTrinh()) {
        return '<section class="card"><h2>Chỉ có trong chương trình Windows</h2>' +
          '<p>Kết nối ETABS cần chạy app bằng chương trình <strong>MongCauThap.exe</strong> trên máy Windows có cài ETABS v22 hoặc v23. ' +
          'Khi mở <code>index.html</code> bằng trình duyệt, trang này chỉ để xem.</p></section>';
      }
      return '<section class="card"><h2>Cách kiểm tra</h2><ol>' +
        '<li>Mở ETABS v23, mở một mô hình bất kỳ hoặc tạo mô hình mới (File → New Model).</li>' +
        '<li>Bấm <strong>Kiểm tra kết nối</strong>. Lần đầu có thể mất 5–15 giây.</li></ol>' +
        '<p class="hint">Mở ETABS và MongCauThap.exe cùng một kiểu (cùng chạy bình thường, hoặc cùng Run as administrator).</p>' +
        '<div class="field field-wide"><label for="in-etabs.duongDan">Thư mục cài ETABS (để trống để tự tìm)</label>' +
        '<input class="in wide" type="text" id="in-etabs.duongDan" data-bind="etabs.duongDan" ' +
        'placeholder="C:\\Program Files\\Computers and Structures\\ETABS 23" value="' + esc(layGiaTri('etabs.duongDan')) + '"></div>' +
        '<p><button type="button" class="btn" data-action="etabs-kiem-tra"' + (etabsDangChay ? ' disabled' : '') + '>' +
        (etabsDangChay ? 'Đang kết nối…' : 'Kiểm tra kết nối') + '</button></p></section>';
    },
    ketQua: function () {
      return veKetQuaDangKy() + veKetQuaKiemTra();
    }
  };

  function veKetQuaDangKy() {
    var r = etabsDangKyKq;
    if (!r) return '';
    var go = r.lenh === 'go-dang-ky-giao-dien';
    var buoc = (r.buoc || []).map(function (b) {
      return '<tr><td class="c">' + (b.ok ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-fail">Lỗi</span>') +
        '</td><td>' + esc(TEN_BUOC_ETABS[b.ten] || b.ten) + '</td><td>' + esc(b.chiTiet) + '</td></tr>';
    }).join('');
    return '<section class="card"><h2>' + (go ? 'Gỡ đăng ký giao diện ETABS' : 'Đăng ký giao diện ETABS') + '</h2>' +
      '<div class="ket-luan-lon ' + (r.ok ? 'ok' : 'fail') + '">' +
      (r.ok ? (go ? 'Đã gỡ đăng ký cho tài khoản này.' : 'Đã đăng ký. Đóng ETABS, mở lại, rồi bấm Kiểm tra kết nối.')
        : 'Chưa làm được: ' + esc(r.loi || '')) + '</div>' + (r.ok ? '' : goiYEtabs(r)) +
      (buoc ? '<div class="table-wrap"><table class="tbl compact"><tbody>' + buoc + '</tbody></table></div>' : '') + '</section>';
  }

  function veKetQuaKiemTra() {
      if (!etabsKq) return '';
      var r = etabsKq, t = r.thongTin || {};
      function dongTT(nhan, v) {
        if (v === undefined || v === null || v === '') return '';
        var hien = Array.isArray(v) ? (v.length ? v.join(', ') : '(không có)') : String(v);
        return '<tr><td>' + nhan + '</td><td>' + esc(hien) + '</td></tr>';
      }
      var buoc = (r.buoc || []).map(function (b) {
        return '<tr><td class="c">' + (b.ok ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-fail">Lỗi</span>') +
          '</td><td>' + esc(TEN_BUOC_ETABS[b.ten] || b.ten) + '</td><td>' + esc(b.chiTiet) + '</td></tr>';
      }).join('');
      var thu = (r.thuHam || []).map(function (h) {
        return '<tr><td class="c">' + (h.ok ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-fail">Lỗi</span>') +
          '</td><td class="nowrap">' + esc(h.ten) + '</td><td>' + esc(h.ok ? h.ketQua : h.loi + (h.hresult ? ' (' + h.hresult + ')' : '')) + '</td></tr>';
      }).join('');
      var goiY = r.ok ? '' : goiYEtabs(r);
      function coKhong(v) { return v === true ? 'Có' : v === false ? 'Không' : null; }
      function ghep(o) { return o && typeof o === 'object' ? Object.keys(o).map(function (k) { return k + ': ' + o[k]; }).join('; ') : o; }
      var cd = t.chanDoanCom || {}, dongCd = '';
      if (cd.giaoDienTrongRegistry) Object.keys(cd.giaoDienTrongRegistry).forEach(function (k) { dongCd += dongTT('Đăng ký giao diện ' + k, cd.giaoDienTrongRegistry[k]); });
      if (cd.doiTuongEtabs && typeof cd.doiTuongEtabs === 'object') {
        dongCd += dongTT('QueryInterface trên đối tượng ETABS', ghep(cd.doiTuongEtabs.queryInterface));
        dongCd += dongTT('ETABS tự mô tả (IDispatch)', cd.doiTuongEtabs.idispatchMoTa);
      } else dongCd += dongTT('Đối tượng ETABS (COM)', cd.doiTuongEtabs);
      if (cd.thuVienTlb && typeof cd.thuVienTlb === 'object') {
        dongCd += dongTT('Type library', cd.thuVienTlb.libId + ' – ' + cd.thuVienTlb.dangKyWin64);
        dongCd += dongTT('Giao diện trong .tlb', ghep(cd.thuVienTlb.giaoDien));
      } else dongCd += dongTT('Type library', cd.thuVienTlb);
      if (cd.fileTlb) dongCd += dongTT('File .tlb trong thư mục ETABS', cd.fileTlb);
      if (cd.nguonTypeLib) dongCd += dongTT('Type library tìm thấy (kể cả nhúng trong .dll/.exe)', cd.nguonTypeLib);
      return '<section class="card"><h2>Kết quả</h2>' +
        '<div class="ket-luan-lon ' + (r.ok ? 'ok' : 'fail') + '">' +
        (r.ok ? 'Đã kết nối được ETABS' : 'Chưa kết nối được: ' + esc(r.loi || '')) + '</div>' + goiY +
        (buoc ? '<div class="table-wrap"><table class="tbl compact"><thead><tr><th></th><th>Bước</th><th>Chi tiết</th></tr></thead><tbody>' +
          buoc + '</tbody></table></div>' : '') +
        (thu ? '<h3>Thử từng hàm API</h3><div class="table-wrap"><table class="tbl compact"><thead><tr><th></th><th>Hàm</th><th>Kết quả / lỗi</th></tr></thead><tbody>' +
          thu + '</tbody></table></div>' : '') +
        '<div class="table-wrap"><table class="tbl compact"><tbody>' +
        dongTT('Phiên bản ETABS', t.etabsPhienBan) + dongTT('Phiên bản API', t.apiPhienBan) +
        dongTT('File mô hình đang mở', t.fileMoHinh || (r.ok ? '(mô hình chưa lưu)' : null)) +
        dongTT('Đơn vị hiện tại', t.donVi) +
        dongTT('Mô hình đang khóa (đã chạy phân tích)', t.moHinhKhoa === undefined ? null : (t.moHinhKhoa ? 'Có' : 'Không')) +
        dongTT('Số điểm / thanh / vùng', t.soDiem == null ? null : t.soDiem + ' / ' + t.soThanh + ' / ' + t.soVung) +
        dongTT('Load pattern', t.loadPatterns) + dongTT('Thư viện API', t.dll ? t.dll + (t.dllDich ? ' (' + t.dllDich + ')' : '') : null) +
        dongTT('Cách gắn', t.cachKetNoi) +
        dongTT('ProgID đã đăng ký với Windows', coKhong(t.progIdDangKy)) + dongTT('ETABS có trong bảng ROT', coKhong(t.coTrongRot)) +
        dongTT('ETABS chạy bằng quyền Administrator', coKhong(t.etabsAdmin)) + dongTT('Chương trình chạy bằng quyền Administrator', coKhong(t.chuongTrinhAdmin)) +
        dongTT('Cầu nối', r.cauNoi ? r.cauNoi + (r.ghiChuChay ? ' – ' + r.ghiChuChay : '') : null) + dongCd +
        '</tbody></table></div>' +
        '<details class="more"><summary>Chi tiết kỹ thuật (gửi lại khi cần hỗ trợ)</summary>' +
        '<textarea class="in wide" rows="8" readonly>' + esc(JSON.stringify(r, null, 2)) + '</textarea></details></section>';
  }

  function moHinhEtabs() {
    return tatCa && MCT.calc.taoMoHinhEtabs ? MCT.calc.taoMoHinhEtabs(state, tatCa) : { hopLe: false, loi: ['Chưa tính.'] };
  }

  function taiTrongEtabs(m) {
    m = m || moHinhEtabs();
    return m.hopLe && MCT.calc.taiTrongEtabs ? MCT.calc.taiTrongEtabs(state, tatCa, m) : { hopLe: false, loi: (m.loi || []).slice() };
  }

  function tenFileMoHinh() {
    var cau = ketQua && ketQua.cau ? ketQua.cau.ten : '';
    return ['MCT', state.duAn.tenMong, cau].filter(Boolean).join('_').replace(/[\\/:*?"<>|\s]+/g, '_');
  }

  // Mặt bằng đài trong mô hình ETABS: lưới tấm, cọc, điểm đặt tải ở tâm đài
  function svgMatBangEtabs(m) {
    return '<div class="bieu-do-svg">' + svgMatBangEtabsChi(m) + '</div>' +
      '<p class="hint">Lưới tấm đài (xám), cọc (xanh), điểm đặt tải cẩu tại tâm đài trên tấm vỏ (đỏ) – như file PDF.</p>';
  }

  function svgMatBangEtabsChi(m) {
    var t = m.thongSo, W = 560, Hh = 420, le = 46;
    var sc = Math.min((W - 2 * le) / t.X, (Hh - 2 * le) / t.Y);
    function px(x) { return le + (x + t.X / 2) * sc + ((W - 2 * le) - t.X * sc) / 2; }
    function py(y) { return le + (t.Y / 2 - y) * sc + ((Hh - 2 * le) - t.Y * sc) / 2; }
    function f(v) { return Math.round(v * 10) / 10; }
    var g = [];
    m.xs.forEach(function (x) { g.push('<line x1="' + f(px(x)) + '" y1="' + f(py(t.Y / 2)) + '" x2="' + f(px(x)) + '" y2="' + f(py(-t.Y / 2)) + '" stroke="#d6dde6" stroke-width="0.7"/>'); });
    m.ys.forEach(function (y) { g.push('<line x1="' + f(px(-t.X / 2)) + '" y1="' + f(py(y)) + '" x2="' + f(px(t.X / 2)) + '" y2="' + f(py(y)) + '" stroke="#d6dde6" stroke-width="0.7"/>'); });
    g.push('<rect x="' + f(px(-t.X / 2)) + '" y="' + f(py(t.Y / 2)) + '" width="' + f(t.X * sc) + '" height="' + f(t.Y * sc) + '" fill="none" stroke="#1f4e79" stroke-width="2"/>');
    m.coc.forEach(function (c) {
      g.push('<circle cx="' + f(px(c.x)) + '" cy="' + f(py(c.y)) + '" r="' + f(t.D / 2 * sc) + '" fill="#dbe8f5" stroke="#1f4e79" stroke-width="1.4"/>' +
        '<text x="' + f(px(c.x)) + '" y="' + f(py(c.y) + 4) + '" text-anchor="middle" font-size="12" fill="#1f4e79">' + c.ten + '</text>');
    });
    g.push('<circle cx="' + f(px(0)) + '" cy="' + f(py(0)) + '" r="6" fill="#c0504d"/>' +
      '<text x="' + f(px(0) + 10) + '" y="' + f(py(0) - 8) + '" font-size="12" fill="#c0504d">Điểm đặt tải (tâm đài)</text>');
    g.push('<text x="' + f(px(0)) + '" y="' + f(py(t.Y / 2) - 10) + '" text-anchor="middle" font-size="12" fill="#333">X = ' + so(t.X, 3) + ' m</text>');
    g.push('<text x="' + f(px(t.X / 2) + 10) + '" y="' + f(py(0)) + '" font-size="12" fill="#333" transform="rotate(90 ' + f(px(t.X / 2) + 10) + ' ' + f(py(0)) + ')" text-anchor="middle">Y = ' + so(t.Y, 3) + ' m</text>');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + Hh + '" viewBox="0 0 ' + W + ' ' + Hh + '" font-family="Arial, Helvetica, sans-serif" role="img" aria-label="Mặt bằng đài trong mô hình ETABS">' +
      '<rect width="' + W + '" height="' + Hh + '" fill="#fff"/>' + g.join('') + '</svg>';
  }

  function nutDungMoHinh() {
    return coChuongTrinh()
      ? '<p><button type="button" class="btn" data-action="etabs-dung-mo-hinh"' + (etabsDangChay ? ' disabled' : '') + '>' +
        (etabsDangChay ? 'Đang dựng mô hình…' : 'Dựng mô hình trong ETABS') + '</button></p>' +
        '<p class="hint">Dựng mô hình, gán tải trọng và tổ hợp rồi lưu file. ETABS sẽ đóng mô hình đang mở (không lưu) để tạo mô hình mới – ' +
        'lưu mô hình đang mở trước. Thường mất 10–60 giây.</p>'
      : '<p class="hint">Nút dựng mô hình chỉ có trong chương trình MongCauThap.exe (Windows, có ETABS v22/v23).</p>';
  }

  function veKetQuaDung() {
    if (!etabsDungKq) return '';
    var r = etabsDungKq, t = r.thongTin || {};
    return '<section class="card"><h2>Kết quả dựng mô hình</h2><div class="ket-luan-lon ' + (r.ok ? 'ok' : 'fail') + '">' +
      (r.ok ? 'Đã dựng và lưu mô hình: ' + esc(t.fileMoHinh || '') : 'Chưa dựng được: ' + esc(r.loi || '')) + '</div>' +
      (r.ok ? '' : goiYEtabs(r)) + bangBuocEtabs(r) +
      (r.ok ? '<p class="hint">' + esc(t.soDiem) + ' điểm, ' + esc(t.soThanh) + ' thanh, ' + esc(t.soVo) + ' ô vỏ, ' + esc(t.soLoXo) +
        ' lò xo, ' + esc(t.soToHop) + ' tổ hợp; ' + esc(t.soLenhApi) + ' lệnh API trong ' + esc(t.thoiGianGiay) + ' giây. Mở ETABS để xem mô hình.</p>' : '') +
      '<details class="more"><summary>Chi tiết kỹ thuật</summary><textarea class="in wide" rows="8" readonly>' +
      esc(JSON.stringify(r, null, 2)) + '</textarea></details></section>';
  }

  TRANG['etabs-mo-hinh'] = {
    tieuDe: 'Mô hình ETABS',
    moTa: 'Bước 2: app tự dựng mô hình móng cẩu tháp trong ETABS từ thông số đang nhập (đài, cọc, lò xo đất), gán tải trọng và tổ hợp (bước 3), rồi lưu thành file .EDB.',
    nhap: function () {
      var chon = oChon('etabs.batDauLoXo', [
        { v: 'day-dai', t: 'Đáy đài – móng đài thấp (mặc định)' },
        { v: 'day-ho', t: 'Đáy hố đào – đầu cọc tính toán' }], 'Lò xo đất bắt đầu từ', '', '');
      return '<section class="card"><h2>Thông số dựng mô hình</h2><div class="params">' + chon +
        oNhapSo('etabs.luoi', 'Kích thước lưới chia tấm đài', '', 'm') +
        oNhapSo('etabs.buocCoc', 'Bước chia cọc (khoảng cách lò xo đất)', '', 'm') + '</div>' +
        '<div class="field field-wide" style="margin-top:12px"><label for="in-etabs.fileMoHinh">Lưu mô hình vào (để trống: Documents\\MongCauThap\\' +
        esc(tenFileMoHinh()) + '.EDB)</label><input class="in wide" type="text" id="in-etabs.fileMoHinh" data-bind="etabs.fileMoHinh" value="' +
        esc(layGiaTri('etabs.fileMoHinh')) + '"></div>' +
        nutDungMoHinh() + '</section>';
    },
    ketQua: function () {
      var m = moHinhEtabs();
      var kq = veKetQuaDung();
      if (!m.hopLe) return kq + loiHtml(m);
      var t = m.thongSo, tk = m.thongKe;
      var thongSo = '<section class="card"><h2>Mô hình sẽ dựng</h2><div class="grid-2"><div class="params">' +
        dong('Đài (tấm vỏ dày)', '', so(t.X, 3) + ' × ' + so(t.Y, 3) + ' × ' + so(t.H, 2), 'm') +
        dong('Cao độ mặt / giữa / đáy', '', so(t.zMat, 2) + ' / ' + so(t.zGiua, 2) + ' / ' + so(t.zDay, 2), 'm') +
        dong('Tấm vỏ đặt ở', '', 'mặt phẳng giữa đài', '') +
        dong('Lưới chia tấm', '', (t.nx - 1) + ' × ' + (t.ny - 1) + ' ô (≤ ' + so(t.luoi, 2) + ' m)', '') +
        dong('Cọc', '', t.soCoc + ' cọc D' + so(t.D * 1000, 0), '') +
        dong('Mũi cọc', '', so(t.zMui, 2), 'm') +
        dong('Mũi cọc', '', 'gối chặn chuyển vị đứng', '') +
        '</div><div class="params">' +
        dong('Lò xo bắt đầu', '', so(t.zBatDau, 2) + (t.batDauLoXo === 'day-ho' ? ' (đáy hố)' : ' (đáy đài)'), 'm') +
        dong('Bề rộng quy ước', '<i>b</i><sub>p</sub> =', so(t.bp, 2), 'm') +
        dong('Điểm đặt tải (tâm đài)', '', 'nút ' + esc(m.nutTai) + ', ' + so(t.zGiua, 2), 'm') +
        dong('Số tầng ETABS', '', String(tk.soTang), '') +
        dong('Điểm / thanh / ô vỏ', '', tk.soDiem + ' / ' + tk.soThanh + ' / ' + tk.soVo, '') +
        dong('Lò xo đất', '', tk.soLoXo + ' (' + m.bangLoXo.length + ' nút × ' + t.soCoc + ' cọc)', '') +
        '</div></div></section>';
      var matBang = '<section class="card"><h2>Mặt bằng đài trong mô hình</h2>' + svgMatBangEtabs(m) + '</section>';
      var bang = '<section class="card"><h2>Lò xo đất ngang tại nút cọc</h2>' +
        '<p>K = k·z·b<sub>p</sub>·l (TCVN 10304:2025 phụ lục A); k theo lớp đất (bảng A.1), z tính từ cao độ bắt đầu lò xo, ' +
        'l là đoạn cọc nút đảm nhận. Gán cho cả hai phương U1, U2 (trục cục bộ của điểm, trùng X, Y), giống nhau ở mọi cọc.</p>' +
        '<p class="hint">Trong ETABS: mỗi độ cứng là một thuộc tính lò xo điểm (Define → Spring Properties → Point Springs) tên ' +
        '<code>LX_&lt;K&gt;</code>, gán cho điểm bằng Assign → Joint → Springs – xem bằng Display → Show Assigns → Joint → Springs.</p>' +
        '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Cao độ (m)</th><th>z (m)</th><th>Lớp</th>' +
        '<th>k (kN/m⁴)</th><th>l (m)</th><th>K (kN/m)</th><th>Thuộc tính ETABS</th></tr></thead><tbody>' +
        m.bangLoXo.map(function (r) {
          return '<tr><td class="r">' + so(r.caoDo, 2) + '</td><td class="r">' + so(r.doSau, 2) + '</td><td class="c">' + esc(r.lop) +
            '</td><td class="r">' + so(r.k, 0) + '</td><td class="r">' + so(r.l, 2) + '</td><td class="r">' + so(r.K, 0) + '</td><td class="c">' +
            (r.K > 0 ? 'LX_' + Math.round(r.K) : '–') + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
      return kq + thongSo + matBang + bang;
    }
  };

  TRANG['etabs-tai-trong'] = {
    tieuDe: 'Tải trọng và tổ hợp (ETABS)',
    moTa: 'Bước 3: tải cẩu đặt tại một điểm ở tâm đài như file PDF, tách theo thành phần (load pattern); tổ hợp 8 hướng như PDF ' +
      'cộng các hướng bất lợi của từng cọc theo mục B; BAO là envelope mọi tổ hợp.',
    nhap: function () {
      return '<section class="card"><h2>Hệ số tổ hợp</h2><div class="params">' +
        oNhapSo('etabs.heSoTinhTaiNen', 'Tĩnh tải – tổ hợp cọc nén', '', '') +
        oNhapSo('etabs.heSoTinhTaiKeo', 'Tĩnh tải – tổ hợp cọc kéo', '', '') +
        oNhapSo('etabs.heSoFzKeo', 'Lực đứng của cẩu – tổ hợp cọc kéo', '', '') + '</div>' +
        '<p class="hint">Tải cẩu (lực ngang, mômen, xoắn; lực đứng trong tổ hợp nén) nhân hệ số n của mục A. Mặc định như PDF: 1,1 / 0,9 / 0,9.</p>' +
        nutDungMoHinh() + '</section>';
    },
    ketQua: function () {
      var m = moHinhEtabs(), t = taiTrongEtabs(m);
      if (!t.hopLe) return veKetQuaDung() + loiHtml(t);
      var lv = t.thanhPhan.lv, klv = t.thanhPhan.klv;
      var tp = '<section class="card"><h2>Tải cẩu tiêu chuẩn đặt tại tâm đài</h2>' +
        '<p>Bằng tải quy đổi ở mục A chia n = ' + so(t.n, 2) + ' (tổ hợp nhân lại n). Mômen đặt ở tâm đài cộng H·' + so(t.tayDon, 2) +
        ' m vì form CC1 coi tải đặt ở mặt đài còn điểm đặt tải trong mô hình ở mặt phẳng giữa đài (cao độ ' + so(m.thongSo.zGiua, 2) + ' m, nút ' +
        esc(t.diemDatTai) + ').</p><div class="table-wrap"><table class="tbl compact"><thead><tr><th>Trạng thái</th><th>H (kN)</th><th>N (kN)</th>' +
        '<th>M catalogue (kNm)</th><th>M tại tâm đài (kNm)</th><th>T xoắn (kNm)</th></tr></thead><tbody>' +
        '<tr><td>Làm việc</td><td class="r">' + so(lv.H) + '</td><td class="r">' + so(lv.N) + '</td><td class="r">' + so(lv.M) + '</td><td class="r">' +
        so(lv.Mtam) + '</td><td class="r">' + so(lv.T) + '</td></tr>' +
        '<tr><td>Không làm việc</td><td class="r">' + so(klv.H) + '</td><td class="r">' + so(klv.N) + '</td><td class="r">' + so(klv.M) + '</td><td class="r">' +
        so(klv.Mtam) + '</td><td class="r">–</td></tr></tbody></table></div></section>';
      var TEN_TP = ['F1 (X)', 'F2 (Y)', 'F3 (Z)', 'M1 (X)', 'M2 (Y)', 'M3 (Z)'];
      var mau = '<section class="card"><h2>Load pattern (' + t.mauTai.length + ')</h2><div class="table-wrap"><table class="tbl compact">' +
        '<thead><tr><th>Tên</th><th>Nội dung</th><th>Thành phần</th><th>Giá trị (kN, kNm)</th></tr></thead><tbody>' +
        t.mauTai.map(function (p) {
          var k = p.luc ? p.luc.giaTri.map(function (v, i) { return v ? i : -1; }).filter(function (i) { return i >= 0; })[0] : -1;
          return '<tr><td class="nowrap">' + esc(p.ten) + '</td><td>' + esc(p.moTa) + '</td><td class="c">' +
            (p.luc ? TEN_TP[k] : 'bản thân × ' + so(p.banThan, 0)) + '</td><td class="r">' + (p.luc ? so(p.luc.giaTri[k]) : '–') + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
      var TEN_CA = ['DEAD', 'FX1', 'FY1', 'FZ1', 'MX1', 'MY1', 'MZ1', 'FX2', 'FY2', 'FZ2', 'MX2', 'MY2'];
      var coCot = TEN_CA.filter(function (ca) { return t.toHop.some(function (c) { return c.ds.some(function (x) { return x.ca === ca; }); }); });
      var th = '<section class="card"><h2>Tổ hợp (' + t.thongKe.soToHop + ' tổ hợp + BAO)</h2>' +
        '<p>' + t.thongKe.soHuong + ' hướng: 8 hướng mỗi 45° (PDF) và hướng bất lợi của từng cọc theo mục B (“C1 nén”: hướng từ tâm đài tới cọc C1, cọc C1 nén nhiều nhất; ' +
        '“C1 kéo”: hướng ngược lại, cọc C1 kéo nhiều nhất). Mỗi hướng có 4 tổ hợp: làm việc / không làm việc × cọc nén / cọc kéo. ' +
        'Góc θ đo từ trục X ngược chiều kim đồng hồ; lực ngang và mômen lật cùng hướng θ.</p>' +
        '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Tổ hợp</th><th>θ (°)</th><th>Nguồn hướng</th>' +
        coCot.map(function (ca) { return '<th>' + ca + '</th>'; }).join('') + '</tr></thead><tbody>' +
        t.toHop.filter(function (c) { return c.loai === 0; }).map(function (c) {
          return '<tr><td class="nowrap">' + esc(c.ten) + '</td><td class="r">' + so(c.goc, 2) + '</td><td class="nowrap">' + esc(c.nguon) + '</td>' +
            coCot.map(function (ca) {
              var x = c.ds.filter(function (d) { return d.ca === ca; })[0];
              return '<td class="r">' + (x ? so(x.heSo, 3) : '') + '</td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table></div><p class="hint">BAO = envelope của ' + t.thongKe.soToHop + ' tổ hợp trên.</p></section>';
      return veKetQuaDung() + tp + mau + th;
    }
  };

  var etabsVanTayGui = null;
  // Dấu vân tay của mô hình + tải trọng: so với lần dựng mô hình gần nhất để biết ETABS có còn khớp thông số không
  function vanTayMoHinh(m, t) {
    var chuoi = JSON.stringify(MCT.calc.duLieuGuiEtabs(m, t)), h = 0;
    for (var i = 0; i < chuoi.length; i++) h = (h * 31 + chuoi.charCodeAt(i)) | 0;
    return chuoi.length + ':' + (h >>> 0).toString(16);
  }

  var etabsKqDem = { nguon: null, trangThai: null, kq: null };   // bộ nhớ đệm: chỉ tính lại khi kết quả hoặc thông số đổi
  function ketQuaEtabsHienTai() {
    if (!etabsLuu || !etabsLuu.tomTat || !tatCa) return null;
    var tt = JSON.stringify(state);
    if (etabsKqDem.nguon === etabsLuu && etabsKqDem.trangThai === tt) return etabsKqDem.kq;
    etabsKqDem = { nguon: etabsLuu, trangThai: tt, kq: MCT.calc.kiemTraEtabs(etabsLuu.tomTat, state, tatCa) };
    return etabsKqDem.kq;
  }

  // Kết quả ETABS có còn khớp thông số hiện tại không (so dấu vân tay lúc phân tích)
  function etabsConKhop() {
    if (!etabsLuu) return false;
    var m = moHinhEtabs(), t = taiTrongEtabs(m);
    return t.hopLe && etabsLuu.vanTay === vanTayMoHinh(m, t);
  }

  function laEtabs() { return state.tinhToan && state.tinhToan.phuongPhap === 'etabs'; }

  function ketLuanHienTai() {
    return laEtabs() ? MCT.calc.ketLuanEtabs(kqF, ketQuaEtabsHienTai()) : kqF;
  }

  function oPhuongPhap() {
    return '<div class="params">' + oChon('tinhToan.phuongPhap', [
      { v: 'giai-tich', t: 'Giải tích – form CC1 (Excel)' },
      { v: 'etabs', t: 'ETABS – nội lực từ mô hình ETABS' }], 'Phương pháp tính cho kết luận và thuyết minh', '', '', false, true) + '</div>';
  }

  function canhBaoEtabsCu() {
    if (!etabsLuu) return '';
    return etabsConKhop() ? '' : '<div class="ghi-chu-lech"><h3>Kết quả ETABS chưa cập nhật</h3><p>Kết quả ETABS đang lưu được tính lúc ' +
      esc(new Date(etabsLuu.thoiDiem).toLocaleString('vi-VN')) + ' với thông số khác thông số hiện tại. Dựng lại mô hình và chạy phân tích để cập nhật.</p></div>';
  }

  // Khung "phương pháp ETABS" ở đầu các trang B, D, tải ngang, tương tác
  function khungEtabs(trang) {
    if (!laEtabs() || ['coc', 'thep', 'tai-ngang', 'tuong-tac'].indexOf(trang) < 0) return '';
    var r = ketQuaEtabsHienTai();
    var dau = '<section class="card khung-etabs"><h2>Đang dùng phương pháp ETABS</h2>';
    if (!r || !r.hopLe) {
      return dau + '<p>' + (r && r.loi && r.loi.length ? esc(r.loi[0]) : 'Chưa có kết quả ETABS.') +
        ' Vào <button type="button" class="link" data-trang="etabs-ket-qua">Kết quả ETABS</button> để chạy phân tích, ' +
        'hoặc chọn lại phương pháp Giải tích ở trang Kết luận.</p></section>';
    }
    var ck = r.cocKiemTra, cv = r.chuyenVi, d = r.dai, noiDung = '';
    if (trang === 'coc') {
      noiDung = dongKiemTra('<i>P</i><sub>nén</sub> = ' + so(ck.Pnen.gt) + ' kN (' + esc(ck.Pnen.coc) + ', ' + esc(ck.Pnen.toHop) + ')', ck.okNen ? '≤' : '>',
        '<i>Q</i><sub>a</sub> = ' + so(ck.Qa) + ' kN', ck.okNen) +
        dongKiemTra('<i>P</i><sub>min</sub> = ' + so(ck.PminCC1) + ' kN', ck.PminCC1 >= -ck.QaKeo ? '≥' : '<', '−<i>Q</i><sub>a</sub>\' = ' + so(-ck.QaKeo) + ' kN',
          ck.PminCC1 >= -ck.QaKeo);
    } else if (trang === 'thep') {
      noiDung = '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Lớp</th><th>M (kNm)</th><th>A<sub>s</sub> cần (mm²/m)</th><th>A<sub>s</sub> chọn (mm²/m)</th><th></th></tr></thead><tbody>' +
        [d.X.duoi, d.Y.duoi, d.X.tren, d.Y.tren].map(function (l) {
          return '<tr><td>' + esc(l.ten) + '</td><td class="r">' + so(l.M) + '</td><td class="r">' + (l.can ? (l.can.duTietDien ? so(l.can.AsMet, 0) : 'α<sub>m</sub> > 0,5') : '0') +
            '</td><td class="r">' + (l.chon ? so(l.chon.AsMet, 0) : '–') + '</td><td class="c">' + nhanOk(l.ok) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (trang === 'tai-ngang') {
      noiDung = (ck.Qgh !== null ? dongKiemTra('<i>V</i><sub>max</sub> = ' + so(ck.Vmax.gt) + ' kN', ck.okCat ? '≤' : '>', '[<i>Q</i>] = ' + so(ck.Qgh) + ' kN', ck.okCat) : '') +
        dongKiemTra('Δ = ' + so(cv.DeltaMax.gt) + ' mm', cv.okDelta ? '≤' : '>', '[Δ] = ' + so(cv.gioiHanDelta, 1) + ' mm', cv.okDelta) +
        dongKiemTra('ψ = ' + so(cv.psiMax.gt, 4) + '°', cv.okPsi ? '≤' : '>', '[ψ] = ' + so(cv.gioiHanPsi, 2) + '°', cv.okPsi);
    } else if (trang === 'tuong-tac' && ck.tuongTac) {
      noiDung = dongKiemTra('Cặp bất lợi nhất: N = ' + so(ck.tuongTac.N) + ' kN, M = ' + so(ck.tuongTac.M) + ' kNm (' + esc(ck.tuongTac.coc) + ')', ck.okTuongTac ? '≤' : '>',
        '<i>M</i><sub>gh</sub> = ' + so(ck.tuongTac.Mgh) + ' kNm', ck.okTuongTac) + '</div>' + bangNguyHiem(ck) + '<div>';
    }
    return dau + '<p>Kết luận lấy theo nội lực ETABS (chi tiết ở <button type="button" class="link" data-trang="etabs-ket-qua">Kết quả ETABS</button>). ' +
      'Phần tính giải tích bên dưới để tham khảo.</p>' + canhBaoEtabsCu() + '<div class="kiem-tra-dong">' + noiDung + '</div></section>';
  }

  // Bảng điểm nguy hiểm kiểm tra P–M (ETABS)
  function bangNguyHiem(ck) {
    var ds = ck.nguyHiem || [];
    if (!ds.length) return '';
    return '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>STT</th><th>Cọc</th><th>Điểm kiểm tra</th><th>N (kN)</th><th>M (kNm)</th>' +
      '<th>Cao độ (m)</th><th>Tổ hợp</th><th>M<sub>gh</sub> (kNm)</th><th>M/M<sub>gh</sub></th><th></th></tr></thead><tbody>' +
      ds.map(function (d) {
        return '<tr><td class="c">' + d.stt + '</td><td class="c">' + esc(d.coc) + '</td><td>' + esc(d.loai) + '</td><td class="r">' + so(d.N, 1) +
          '</td><td class="r">' + so(d.M, 1) + '</td><td class="r">' + so(d.z, 2) + '</td><td>' + esc(d.toHop) + '</td><td class="r">' +
          (d.Mgh === null ? '–' : so(d.Mgh, 1)) + '</td><td class="r">' + (d.tiSo === null ? '–' : isFinite(d.tiSo) ? so(d.tiSo, 3) : '&gt; 1') +
          '</td><td class="c">' + (d.ok === null ? '–' : nhanOk(d.ok)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="hint">Tỉ số lớn nhất ' + (ck.tuongTac ? so(ck.tuongTac.tiSo, 3) : '–') + '; ' + (ck.soCapVuot || 0) + '/' + ck.soCapNM + ' cặp vượt biểu đồ tương tác.</p>';
  }

  function nhanOk(ok) {
    return ok === true ? '<span class="badge badge-ok">Đạt</span>' : ok === false ? '<span class="badge badge-fail">Không đạt</span>' : '–';
  }

  TRANG['etabs-ket-qua'] = {
    tieuDe: 'Kết quả ETABS',
    moTa: 'Bước 4: chạy phân tích mô hình đã dựng, lấy nội lực cọc, chuyển vị, nội lực đài theo từng tổ hợp rồi kiểm tra theo form CC1.',
    nhap: function () {
      var m = moHinhEtabs(), t = taiTrongEtabs(m);
      var khop = t.hopLe && state.etabs.vanTayDung === vanTayMoHinh(m, t);
      return '<section class="card"><h2>Phương pháp tính</h2>' + oPhuongPhap() +
        '<p class="hint">Chọn ETABS: các mục B (tải trọng lên cọc), D (thép đài), cọc chịu tải ngang, tương tác và kết luận dùng nội lực ETABS.</p></section>' +
        '<section class="card"><h2>Chạy phân tích</h2>' +
        (khop ? '<p>Mô hình trong ETABS khớp thông số hiện tại (đã dựng ' + esc(etabsDungKq && etabsDungKq.thongTin ? etabsDungKq.thongTin.fileMoHinh || '' : 'trước đó') + ').</p>'
          : '<div class="ghi-chu-lech"><h3>Chưa dựng mô hình theo thông số hiện tại</h3><p>Thông số đã thay đổi sau lần dựng mô hình gần nhất (hoặc chưa dựng). ' +
            'Vào trang Mô hình ETABS hoặc Tải trọng &amp; tổ hợp, bấm Dựng mô hình trong ETABS trước khi phân tích.</p></div>') +
        (coChuongTrinh()
          ? '<p><button type="button" class="btn" data-action="etabs-phan-tich"' + (etabsDangChay ? ' disabled' : '') + '>' +
            (etabsDangChay ? 'Đang phân tích…' : 'Chạy phân tích và lấy nội lực') + '</button></p>' +
            '<p class="hint">ETABS chạy phân tích mô hình đang mở (bỏ trường hợp Modal), rồi app đọc nội lực của ' +
            (t.hopLe ? t.thongKe.soToHop : '') + ' tổ hợp. Thường mất 20 giây – vài phút.</p>'
          : '<p class="hint">Chỉ chạy được trong chương trình MongCauThap.exe (Windows, có ETABS v22/v23).</p>') + '</section>';
    },
    ketQua: function () {
      var html = '';
      var p = etabsPhanTichKq;
      if (p) {
        var tt = p.thongTin || {};
        html += '<section class="card"><h2>Lệnh phân tích</h2><div class="ket-luan-lon ' + (p.ok ? 'ok' : 'fail') + '">' +
          (p.ok ? 'Đã lấy nội lực từ ETABS (' + esc(tt.thoiGianGiay) + ' giây)' : 'Chưa phân tích được: ' + esc(p.loi || '')) + '</div>' +
          (p.ok ? '' : goiYEtabs(p)) + (p.ghiChuLuu ? '<p class="hint">' + esc(p.ghiChuLuu) + '</p>' : '') +
          '<details class="more"' + (p.ok ? '' : ' open') + '><summary>Các bước</summary>' + bangBuocEtabs(p) + '</details></section>';
      }
      var r = ketQuaEtabsHienTai();
      if (!r) return html;
      if (!r.hopLe) return html + loiHtml(r);
      html += canhBaoEtabsCu() + '<p class="hint">Kết quả ETABS tính lúc ' + esc(new Date(etabsLuu.thoiDiem).toLocaleString('vi-VN')) +
        (etabsLuu.file ? ' – ' + esc(etabsLuu.file) : '') + '. Đã lưu trên máy; đổi thép chọn, Qa… thì kiểm tra tự tính lại, không cần chạy ETABS.</p>';
      var ck = r.cocKiemTra, cv = r.chuyenVi, d = r.dai;
      function gtTh(o, dv, so_) { return o ? so(o.gt, so_ === undefined ? 2 : so_) + (dv ? ' ' + dv : '') : '–'; }
      function th(o) { return o ? esc(o.toHop) : ''; }
      // Tổng hợp
      html += '<section class="card"><h2>Kết luận theo nội lực ETABS</h2><div class="table-wrap"><table class="tbl compact"><tbody>' +
        r.ketLuan.map(function (k) { return '<tr><td>' + esc(k.ten) + '</td><td class="c">' + nhanOk(k.ok) + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="ket-luan-lon ' + (r.tatCaOk ? 'ok' : 'fail') + '">' +
        (r.tatCaOk ? 'Móng đủ khả năng chịu lực theo nội lực ETABS' : 'Có mục không đạt – xem chi tiết bên dưới') + '</div></section>';
      // Cọc
      html += '<section class="card"><h2>Cọc: lực dọc, mômen, lực cắt</h2>' +
        '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Cọc</th><th>Nén đầu cọc (kN)</th><th>Tổ hợp</th><th>Kéo đầu cọc (kN)</th><th>Tổ hợp</th>' +
        '<th>M lớn nhất (kNm)</th><th>tại z (m)</th><th>V lớn nhất (kN)</th><th>tại z (m)</th></tr></thead><tbody>' +
        r.coc.map(function (c) {
          return '<tr><td class="c">' + esc(c.ten) + '</td><td class="r">' + gtTh(c.dauNen) + '</td><td>' + th(c.dauNen) + '</td><td class="r">' +
            (c.dauKeo && c.dauKeo.gt > 0 ? gtTh(c.dauKeo) : '–') + '</td><td>' + (c.dauKeo && c.dauKeo.gt > 0 ? th(c.dauKeo) : '') + '</td><td class="r">' +
            gtTh(c.Mmax) + '</td><td class="r">' + (c.Mmax ? so(c.Mmax.z, 2) : '') + '</td><td class="r">' + gtTh(c.Vmax) + '</td><td class="r">' +
            (c.Vmax ? so(c.Vmax.z, 2) : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="kiem-tra-dong">' +
        dongKiemTra('<i>P</i><sub>nén</sub> = ' + gtTh(ck.Pnen, 'kN') + ' (' + esc(ck.Pnen ? ck.Pnen.coc : '') + ')', ck.okNen ? '≤' : '>', '<i>Q</i><sub>a</sub> = ' + so(ck.Qa) + ' kN', ck.okNen) +
        (ck.Pkeo ? dongKiemTra('<i>P</i><sub>kéo</sub> = ' + gtTh(ck.Pkeo, 'kN') + ' (' + esc(ck.Pkeo.coc) + ')', ck.okKeo ? '≤' : '>', '<i>Q</i><sub>a</sub>\' = ' + so(ck.QaKeo) + ' kN', ck.okKeo)
          : '<p>Không có cọc chịu kéo trong các tổ hợp.</p>') +
        (ck.Qgh !== null ? dongKiemTra('<i>V</i><sub>max</sub> = ' + gtTh(ck.Vmax, 'kN') + ' (' + esc(ck.Vmax ? ck.Vmax.coc : '') + ')', ck.okCat ? '≤' : '>',
          '[<i>Q</i>] = ' + so(ck.Qgh) + ' kN (phần tải ngang)', ck.okCat) : '') +
        (ck.tuongTac ? dongKiemTra('Cặp N–M bất lợi nhất: N = ' + so(ck.tuongTac.N) + ' kN, M = ' + so(ck.tuongTac.M) + ' kNm (' + esc(ck.tuongTac.coc) + ', z = ' +
          so(ck.tuongTac.z, 2) + ')', ck.okTuongTac ? '≤' : '>', '<i>M</i><sub>gh</sub> = ' + so(ck.tuongTac.Mgh) + ' kNm', ck.okTuongTac) : '') +
        '</div>';
      var cocM = r.coc.filter(function (c) { return ck.Mmax && c.ten === ck.Mmax.coc; })[0] || r.coc[0];
      var bang = cocM.doc.map(function (x) { return { z: x.z, P: -x.Pmin, M: x.M, V: x.V }; });
      html += '<p>Bao nội lực cọc ' + esc(cocM.ten) + ' theo chiều sâu (mọi tổ hợp):</p><div class="ba-bieu-do bieu-do-svg">' +
        MCT.bieuDo.noiLuc(bang, 'P', 'LỰC DỌC NÉN', 'P (kN)', '#1f4e79', { w: 300, h: 380 }) +
        MCT.bieuDo.noiLuc(bang, 'M', 'MÔMEN', 'M (kNm)', '#c0504d', { w: 300, h: 380 }) +
        MCT.bieuDo.noiLuc(bang, 'V', 'LỰC CẮT', 'V (kN)', '#2a9bb8', { w: 300, h: 380 }) + '</div>';
      if (tatCa.TT && tatCa.TT.hopLe) {
        html += '<h3>Kiểm tra P–M (biểu đồ tương tác TCVN 5574:2018)</h3><p>Mọi cặp (N, M) của mọi cọc, mọi mặt cắt, mọi tổ hợp (' + ck.soCapNM +
          ' cặp) so với biểu đồ tương tác của form CC1; điểm nguy hiểm từng cọc đánh số như bảng bên dưới.</p><div class="bieu-do-svg">' +
          MCT.bieuDo.tuongTac(Object.assign({}, tatCa.TT, { diemNoiLuc: r.diemTuongTac, chamNho: true, diemDanhDau: ck.nguyHiem, motPhia: true }), { w: 560, h: 480 }) + '</div>' +
          bangNguyHiem(ck);
      }
      html += '</section>';
      // Chuyển vị
      html += '<section class="card"><h2>Chuyển vị ngang và góc xoay</h2><div class="table-wrap"><table class="tbl compact"><thead><tr><th>Nút</th>' +
        '<th>Δ (mm)</th><th>Tổ hợp</th><th>ψ (độ)</th><th>Tổ hợp</th></tr></thead><tbody>' +
        cv.nut.map(function (n) {
          return '<tr><td>' + esc(n.nhan) + '</td><td class="r">' + gtTh(n.Delta) + '</td><td>' + th(n.Delta) + '</td><td class="r">' + gtTh(n.psi, '', 4) +
            '</td><td>' + th(n.psi) + '</td></tr>';
        }).join('') + '</tbody></table></div><div class="kiem-tra-dong">' +
        dongKiemTra('Δ<sub>max</sub> = ' + gtTh(cv.DeltaMax, 'mm'), cv.okDelta ? '≤' : '>', '[Δ] = ' + so(cv.gioiHanDelta, 1) + ' mm', cv.okDelta) +
        dongKiemTra('ψ<sub>max</sub> = ' + gtTh(cv.psiMax, '°', 4), cv.okPsi ? '≤' : '>', '[ψ] = ' + so(cv.gioiHanPsi, 2) + '°', cv.okPsi) +
        '</div><p class="hint">Chuyển vị lấy từ các tổ hợp tính toán (đã nhân hệ số), giới hạn theo phần tải ngang.</p></section>';
      // Đài
      function dongThep(l) {
        if (!l.can) return '<tr><td>' + esc(l.ten) + '</td><td class="r">0</td><td colspan="6">Không có mômen cùng dấu</td><td class="c">' + nhanOk(true) + '</td></tr>';
        return '<tr><td>' + esc(l.ten) + '</td><td class="r">' + so(l.M) + '</td><td class="r">' + so(l.viTri, 3) + '</td><td class="r">' + so(l.can.b, 3) +
          '</td><td class="r">' + so(l.can.alpha, 4) + '</td><td class="r">' + (l.can.duTietDien ? so(l.can.AsMet, 0) : 'α<sub>m</sub> > 0,5') + '</td><td class="c nowrap">' +
          (l.chon ? 'Ø' + so(l.chon.d, 0) + 'a' + so(l.chon.s, 0) : '–') + '</td><td class="r">' + (l.chon ? so(l.chon.AsMet, 0) : '–') + '</td><td class="c">' + nhanOk(l.ok) + '</td></tr>';
      }
      // Nứt đài (TCVN 5574:2018 mục 8.2.2) – 4 tiết diện
      function bangNutEtabs(nut) {
        if (!nut) return '';
        return '<h3>Kiểm tra nứt đài (TCVN 5574:2018 mục 8.2.2)</h3><p class="hint">M<sub>crc</sub> = 1,3·W<sub>red</sub>·R<sub>bt,ser</sub>; ' +
          'khi M &gt; M<sub>crc</sub>: a<sub>crc</sub> = φ<sub>1</sub>φ<sub>2</sub>φ<sub>3</sub>ψ<sub>s</sub>(σ<sub>s</sub>/E<sub>s</sub>)l<sub>s</sub> ≤ 0,4 mm ' +
          '(ngắn hạn, không hạn chế thấm; σ<sub>s</sub> = M/(0,8h<sub>0</sub>A<sub>s</sub>)). Mômen tính toán ETABS – thiên về an toàn; thép đang chọn ở mục D.</p>' +
          '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Tiết diện</th><th>M (kNm)</th><th>M<sub>crc</sub> (kNm)</th><th>Nứt</th>' +
          '<th>σ<sub>s</sub> (MPa)</th><th>a<sub>crc</sub> (mm)</th><th></th></tr></thead><tbody>' +
          nut.ds.map(function (r) {
            if (r.khongCoMomen) return '<tr><td>' + esc(r.ten) + '</td><td class="r">0</td><td class="c">–</td><td class="c">Không</td><td class="c">–</td><td class="c">–</td><td class="c">' + nhanOk(true) + '</td></tr>';
            if (r.thieuThep) return '<tr><td>' + esc(r.ten) + '</td><td class="r">' + so(r.M) + '</td><td colspan="5">Chưa chọn thép</td></tr>';
            return '<tr><td>' + esc(r.ten) + '</td><td class="r">' + so(r.M) + '</td><td class="r">' + so(r.Mcrc) + '</td><td class="c">' + (r.nut ? 'Có' : 'Không') +
              '</td><td class="r">' + (r.nut ? so(r.sigma, 1) : '–') + '</td><td class="r">' + (r.nut ? so(r.acrc, 3) : '–') + '</td><td class="c">' + nhanOk(r.ok) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      function dongCat(ten, c) {
        if (!c) return '';
        return dongKiemTra(ten + ': V = ' + so(c.V) + ' kN (mặt cắt tại ' + so(c.viTri, 3) + ' m, b = ' + so(c.b, 3) + ' m)', c.ok ? '≤' : '>',
          '<i>Q</i><sub>b</sub> = 0,5·<i>R</i><sub>bt</sub>·b·h<sub>0</sub> = ' + so(c.Qb) + ' kN', c.ok);
      }
      html += '<section class="card"><h2>Đài: mômen, lực cắt trên mặt cắt suốt bề rộng đài</h2>' +
        '<p>Mômen, lực cắt mỗi mặt cắt = tích phân nội lực tấm vỏ (M11, V13 theo X; M22, V23 theo Y) trên suốt bề rộng đài, ' +
        'lấy bao mọi tổ hợp. M &gt; 0: thớ dưới chịu kéo. h<sub>0</sub> = H − a = ' + so(d.h0, 3) + ' m. Thép tính như mục D.</p>' +
        '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Lớp thép</th><th>M (kNm)</th><th>Mặt cắt (m)</th><th>b (m)</th><th>α<sub>m</sub></th>' +
        '<th>A<sub>s</sub> cần (mm²/m)</th><th>Chọn</th><th>A<sub>s</sub> chọn (mm²/m)</th><th></th></tr></thead><tbody>' +
        [d.X.duoi, d.X.tren, d.Y.duoi, d.Y.tren].map(dongThep).join('') + '</tbody></table></div>' +
        '<div class="kiem-tra-dong">' + dongCat('Theo X', d.X.catKT) + dongCat('Theo Y', d.Y.catKT) + '</div>' +
        bangNutEtabs(d.nut) +
        '<details class="more"><summary>Bao mômen từng mặt cắt</summary><div class="grid-2">' +
        [['X', d.X, 'x'], ['Y', d.Y, 'y']].map(function (h) {
          return '<div class="table-wrap"><table class="tbl compact"><thead><tr><th>' + h[2] + ' (m)</th><th>M<sub>max</sub></th><th>M<sub>min</sub></th><th>V<sub>max</sub></th></tr></thead><tbody>' +
            h[1].cat.map(function (c) {
              return '<tr><td class="r">' + so(c.viTri, 3) + '</td><td class="r">' + so(c.Mmax.gt) + '</td><td class="r">' + so(c.Mmin.gt) + '</td><td class="r">' + so(c.Vmax.gt) + '</td></tr>';
            }).join('') + '</tbody></table></div>';
        }).join('') + '</div></details></section>';
      return html;
    }
  };

  function etabsChay(lenh) {
    if (!coChuongTrinh() || etabsDangChay) return;
    if (lenh === 'dang-ky-giao-dien' && !window.confirm('Đăng ký giao diện API (type library) của ETABS cho tài khoản Windows này?\n\n' +
        'Chỉ ghi vào phần registry của tài khoản bạn, không cần quyền Administrator. Gỡ lại được bằng nút "Gỡ đăng ký".')) return;
    if (lenh === 'go-dang-ky-giao-dien' && !window.confirm('Gỡ đăng ký giao diện API của ETABS cho tài khoản Windows này?')) return;
    var duLieu = null;
    if (lenh === 'dung-mo-hinh') {
      var m = moHinhEtabs();
      if (!m.hopLe) { datTrangThai('Mô hình chưa hợp lệ: ' + m.loi.join(' ')); return; }
      var file = String(state.etabs.fileMoHinh || '').trim();
      if (!window.confirm('Dựng mô hình mới trong ETABS?\n\nETABS sẽ đóng mô hình đang mở (KHÔNG lưu) để tạo mô hình mới. ' +
          'Hãy lưu mô hình đang mở trước nếu cần.\n\nMô hình mới được lưu vào: ' +
          (file || 'Documents\\MongCauThap\\' + tenFileMoHinh() + '.EDB'))) return;
      var tt = taiTrongEtabs(m);
      if (!tt.hopLe) { datTrangThai('Tải trọng chưa hợp lệ: ' + tt.loi.join(' ')); return; }
      duLieu = { moHinh: MCT.calc.duLieuGuiEtabs(m, tt), tenFile: tenFileMoHinh(), fileMoHinh: file };
      etabsVanTayGui = vanTayMoHinh(m, tt);
    }
    if (lenh === 'phan-tich') {
      var m2 = moHinhEtabs(), t2 = taiTrongEtabs(m2);
      if (!t2.hopLe) { datTrangThai('Mô hình hoặc tải trọng chưa hợp lệ.'); return; }
      if (state.etabs.vanTayDung !== vanTayMoHinh(m2, t2) && !window.confirm('Thông số hiện tại khác mô hình đã dựng lần trước ' +
          '(hoặc chưa dựng lần nào). Kết quả sẽ lấy từ mô hình đang mở trong ETABS.\n\nNên bấm "Dựng mô hình trong ETABS" trước. Vẫn chạy phân tích?')) return;
      duLieu = MCT.calc.duLieuPhanTich(m2, t2);
    }
    etabsDangChay = true;
    if (/^etabs/.test(trangHienTai)) veTrang();
    datTrangThai(lenh === 'kiem-tra' ? 'Đang kết nối ETABS…' : lenh === 'dung-mo-hinh' ? 'Đang dựng mô hình trong ETABS…'
      : lenh === 'phan-tich' ? 'Đang chạy phân tích và lấy nội lực…' : 'Đang xử lý đăng ký giao diện ETABS…');
    Promise.resolve().then(function () {
      return window.mctDesktop.etabs({ lenh: lenh, duongDanEtabs: String(state.etabs.duongDan || '').trim(),
        thoiGianToiDa: lenh === 'dung-mo-hinh' || lenh === 'phan-tich' ? 15 * 60 * 1000 : 90000, duLieu: duLieu });
    }).then(function (kq) {
      return kq || { ok: false, lenh: lenh, loi: 'Không nhận được kết quả.', buoc: [] };
    }, function (e) {
      return { ok: false, lenh: lenh, loi: e && e.message ? e.message : String(e), buoc: [] };
    }).then(function (kq) {
      kq.lenh = kq.lenh || lenh;
      if (lenh === 'kiem-tra') { etabsKq = kq; etabsDangKyKq = null; }
      else if (lenh === 'dung-mo-hinh') {
        etabsDungKq = kq;
        if (kq.ok && etabsVanTayGui) { state.etabs.vanTayDung = etabsVanTayGui; luu(); }
      }
      else if (lenh === 'phan-tich') {
        if (kq.ok && kq.ketQua) {
          var m3 = moHinhEtabs(), t3 = taiTrongEtabs(m3);
          var tomTat = MCT.calc.tomTatEtabs(kq.ketQua, m3, t3);
          if (tomTat.hopLe) {
            var daLuu = luuKetQuaEtabs({ vanTay: vanTayMoHinh(m3, t3), thoiDiem: new Date().toISOString(),
              file: kq.thongTin && kq.thongTin.fileMoHinh, tomTat: tomTat });
            if (!daLuu) kq.ghiChuLuu = 'Không lưu được kết quả trên máy (bộ nhớ trình duyệt đầy) – kết quả chỉ giữ tới khi đóng chương trình.';
          }
          delete kq.ketQua;   // nội lực thô lớn: chỉ giữ bản tóm tắt
        }
        etabsPhanTichKq = kq;
      }
      else etabsDangKyKq = kq;
      etabsDangChay = false;
      datTrangThai(lenh === 'kiem-tra' ? (kq.ok ? 'Đã kết nối ETABS' : 'Chưa kết nối được ETABS')
        : lenh === 'dung-mo-hinh' ? (kq.ok ? 'Đã dựng mô hình trong ETABS' : 'Chưa dựng được mô hình')
        : lenh === 'phan-tich' ? (kq.ok ? 'Đã lấy nội lực từ ETABS' : 'Chưa phân tích được')
        : (kq.ok ? 'Đã xử lý đăng ký giao diện ETABS' : 'Chưa đăng ký được giao diện ETABS'));
      if (/^etabs/.test(trangHienTai)) veTrang(); else veDanhMuc();
    });
  }

  function trangThaiMuc(id) {
    if (laEtabs() && ['coc', 'thep', 'tai-ngang', 'tuong-tac'].indexOf(id) >= 0) {
      var r = ketQuaEtabsHienTai();
      if (!r || !r.hopLe) return null;
      var ck = r.cocKiemTra, cv = r.chuyenVi, d = r.dai;
      if (id === 'coc') return ck.okNen !== false && ck.PminCC1 >= -ck.QaKeo;
      if (id === 'thep') return [d.X.duoi, d.Y.duoi, d.X.tren, d.Y.tren].every(function (l) { return l.ok; });
      if (id === 'tai-ngang') return ck.okCat !== false && cv.okDelta !== false && cv.okPsi !== false;
      return ck.okTuongTac !== false;
    }
    switch (id) {
      case 'coc': return kqB && kqB.hopLe ? kqB.kiemTraNen.ok && kqB.kiemTraKeo.ok : null;
      case 'xuyen': return kqC && kqC.hopLe ? kqC.ok : null;
      case 'thep': return kqD && kqD.hopLe ? kqD.tatCaOk : null;
      case 'bulong': return kqE && kqE.hopLe ? kqE.tatCaOk : null;
      case 'sct': return tatCa && tatCa.SCT && tatCa.SCT.hopLe ? true : null;
      case 'dia-chat': return tatCa && tatCa.DC && tatCa.DC.hopLe ? true : null;
      case 'tai-ngang': return tatCa && tatCa.TN && tatCa.TN.hopLe ? tatCa.TN.tatCaOk : null;
      case 'lun': return tatCa && tatCa.LUN && tatCa.LUN.hopLe ? tatCa.LUN.tatCaOk : null;
      case 'etabs': return etabsKq ? !!etabsKq.ok : null;
      case 'etabs-mo-hinh': return etabsDungKq ? !!etabsDungKq.ok : null;
      case 'etabs-tai-trong': return etabsDungKq ? !!etabsDungKq.ok : null;
      case 'etabs-ket-qua': {
        var kqE = ketQuaEtabsHienTai();
        return kqE && kqE.hopLe ? kqE.tatCaOk : (etabsPhanTichKq && !etabsPhanTichKq.ok ? false : null);
      }
      case 'ket-luan': { var F2 = ketLuanHienTai(); return F2 && F2.hopLe ? F2.ok : null; }
      case 'tuong-tac': return tatCa && tatCa.TT && tatCa.TT.hopLe && tatCa.TT.diemNoiLuc.length ? tatCa.TT.tatCaOk : null;
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
    if (el) el.innerHTML = khungEtabs(trangHienTai) + TRANG[trangHienTai].ketQua();
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
    } else if (el.getAttribute('data-kieu') === 'so-tho') {
      // giữ nguyên chữ gõ vào (cho phép trống, "548,06"), đánh dấu ô không đọc được số
      el.classList.toggle('loi', String(v).trim() !== '' && isNaN(MCT.calc.docSoNhap(v)));
    } else if (path === 'cau.chieuCao' || el.getAttribute('data-kieu') === 'so-chon') {
      v = Number(v);
    }
    datGiaTri(path, v);

    if (path === 'cau.ten') {
      chonCau(v);
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
    // Móng dùng cẩu tự thêm mà thư viện trên máy không còn (xoá dữ liệu, máy khác): khôi phục từ bản lưu kèm số liệu móng
    var khoiPhuc = '';
    if (!MCT.calc.timCau(state.cau.ten) && state.cau.banSao) {
      var kp = MCT.calc.docFileCau(JSON.stringify([state.cau.banSao]));
      if (kp.ds.length && khoaCau(kp.ds[0].ten) === khoaCau(state.cau.ten)) {
        luuThuVienCau(dsCauTuThem().concat(kp.ds));
        khoiPhuc = 'Đã khôi phục cẩu ' + kp.ds[0].ten + ' (tự thêm) từ số liệu móng';
      }
    }
    capNhatBanSao();
    tinh();
    veDanhMuc();
    veTrang();
    if (khoiPhuc) datTrangThai(khoiPhuc);

    window.addEventListener('hashchange', function () {
      var id = (location.hash || '').replace('#', '');
      if (TRANG[id] && id !== trangHienTai) chuyenTrang(id);
    });
    document.addEventListener('input', khiNhap);
    document.addEventListener('change', khiNhap);
    document.addEventListener('change', function (e) { if (e.target.id === 'nhap-file-cau') nhapFileCau(e.target); });
    document.addEventListener('click', function (e) {
      var nut = e.target.closest('[data-trang]');
      if (nut && !nut.disabled) chuyenTrang(nut.getAttribute('data-trang'));
      if (e.target.closest('[data-action="toggle-nav"]')) document.body.classList.toggle('nav-open');
      if (e.target.closest('[data-action="xuat-tm"]')) xuatThuyetMinh();
      if (e.target.closest('[data-action="etabs-kiem-tra"]')) etabsChay('kiem-tra');
      if (e.target.closest('[data-action="etabs-dang-ky"]')) etabsChay('dang-ky-giao-dien');
      if (e.target.closest('[data-action="etabs-go-dang-ky"]')) etabsChay('go-dang-ky-giao-dien');
      if (e.target.closest('[data-action="etabs-dung-mo-hinh"]')) etabsChay('dung-mo-hinh');
      if (e.target.closest('[data-action="etabs-phan-tich"]')) etabsChay('phan-tich');
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
      var nutCau = e.target.closest('[data-action$="-cau"]');
      if (nutCau && !nutCau.disabled) xuLyCau(nutCau.getAttribute('data-action'), nutCau.getAttribute('data-ten'));
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

  // ---------------- Thao tác cẩu tự thêm ----------------
  function taiXuong(blob, ten) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = ten;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function xuLyCau(hd, ten) {
    var ds = dsCauTuThem().slice();
    var cau = ten ? MCT.calc.timCau(ten) : null;
    var thongBao = '';
    switch (hd) {
      case 'nhap-moi-cau':
        if (nhapCauCoNoiDung() && !window.confirm('Xoá số liệu đang nhập để nhập cẩu mới?')) return;
        state.cauNhap = nhapCauTrong();
        break;
      case 'sao-chep-cau': {
        var mau = MCT.calc.timCau(($('#chon-mau-cau') || {}).value);
        if (!mau) return;
        if (nhapCauCoNoiDung() && !window.confirm('Thay số liệu đang nhập bằng bản sao của cẩu ' + mau.ten + '?')) return;
        state.cauNhap = MCT.calc.cauSangNhap(mau, true);
        thongBao = 'Đã sao chép thông số cẩu ' + mau.ten + ' – đặt tên mới rồi sửa số liệu';
        break;
      }
      case 'sua-cau':
        if (!cau || !cau.tuThem) return;
        if (nhapCauCoNoiDung() && khoaCau(state.cauNhap.tenGoc) !== khoaCau(cau.ten) &&
          !window.confirm('Thay số liệu đang nhập bằng số liệu cẩu ' + cau.ten + ' để sửa?')) return;
        state.cauNhap = MCT.calc.cauSangNhap(cau);
        if (trangHienTai !== 'cau-moi') { luu(); chuyenTrang('cau-moi'); return; }
        break;
      case 'xoa-cau':
        if (!cau || !cau.tuThem) return;
        if (khoaCau(cau.ten) === khoaCau(state.cau.ten)) {
          window.alert('Móng ' + state.duAn.tenMong + ' đang dùng cẩu ' + cau.ten + '. Chọn cẩu khác ở trang A.1 trước khi xoá.');
          return;
        }
        if (!window.confirm('Xoá cẩu ' + cau.ten + ' khỏi danh sách cẩu tự thêm trên máy này?')) return;
        luuThuVienCau(ds.filter(function (c) { return khoaCau(c.ten) !== khoaCau(cau.ten); }));
        if (khoaCau(state.cauNhap.tenGoc) === khoaCau(cau.ten)) state.cauNhap.tenGoc = '';
        thongBao = 'Đã xoá cẩu ' + cau.ten;
        break;
      case 'dung-cau':
        if (!cau) return;
        chonCau(cau.ten);
        tinh();
        luu();
        chuyenTrang('cau');
        datTrangThai('Móng ' + state.duAn.tenMong + ' dùng cẩu ' + cau.ten);
        return;
      case 'luu-cau':
      case 'luu-dung-cau': {
        var kq = MCT.calc.taoCauTuNhap(state.cauNhap, ds);
        if (!kq.hopLe) { datTrangThai('Chưa lưu được: ' + kq.loi[0]); return; }
        var goc = state.cauNhap.tenGoc, viTri = -1;
        ds.forEach(function (c, i) { if (goc && khoaCau(c.ten) === khoaCau(goc)) viTri = i; });
        if (viTri >= 0) ds[viTri] = kq.cau; else ds.push(kq.cau);
        var daGhi = luuThuVienCau(ds);
        if (goc && khoaCau(goc) === khoaCau(state.cau.ten)) state.cau.ten = kq.cau.ten;   // đổi tên cẩu móng đang dùng
        state.cauNhap.tenGoc = kq.cau.ten;
        state.cauNhap.ten = kq.cau.ten;
        if (hd === 'luu-dung-cau') chonCau(kq.cau.ten); else capNhatBanSao();
        thongBao = (viTri >= 0 ? 'Đã cập nhật cẩu ' : 'Đã thêm cẩu ') + kq.cau.ten +
          (hd === 'luu-dung-cau' ? ' và dùng cho móng ' + state.duAn.tenMong : '') +
          (daGhi ? '' : ' (chỉ trong phiên này – máy không cho lưu dữ liệu)');
        if (hd === 'luu-dung-cau') {
          tinh();
          luu();
          chuyenTrang('cau');
          datTrangThai(thongBao);
          return;
        }
        break;
      }
      case 'them-hang-cau':
        state.cauNhap.hang.push(sao(MAC_DINH.cauNhap.hang[0]));
        break;
      case 'dan-bang-cau': {
        var r = MCT.calc.docBangDan(($('#dan-bang-cau') || {}).value, MCT.calc.cotBangTai(state.cauNhap));
        if (r.loi.length) {
          window.alert('Chưa đọc được bảng vừa dán:\n' + r.loi.slice(0, 8).join('\n'));
          datTrangThai('Bảng dán có lỗi – chưa thay bảng tải');
          return;
        }
        var mauDong = MAC_DINH.cauNhap.hang[0];
        state.cauNhap.hang = r.hang.map(function (h) {
          return { h: h.h, lv: Object.assign(sao(mauDong.lv), h.lv), klv: Object.assign(sao(mauDong.klv), h.klv) };
        });
        thongBao = 'Đã thay bảng tải bằng ' + r.hang.length + ' dòng vừa dán';
        break;
      }
      case 'xuat-file-cau':
        if (!ds.length) { datTrangThai('Chưa có cẩu tự thêm để xuất'); return; }
        taiXuong(new Blob([JSON.stringify(MCT.calc.taoFileCau(ds), null, 1)], { type: 'application/json' }), 'Cau_thap_tu_them.json');
        datTrangThai('Đã xuất ' + ds.length + ' cẩu tự thêm');
        return;
      case 'chon-file-cau': {
        var oFile = $('#nhap-file-cau');
        if (oFile) oFile.click();
        return;
      }
      default:
        return;
    }
    tinh();
    luu();
    veTrang();
    if (thongBao) datTrangThai(thongBao);
  }

  function nhapFileCau(oFile) {
    var f = oFile.files && oFile.files[0];
    if (!f) return;
    var docChu = f.text ? f.text() : new Promise(function (ok, loi) {
      var fr = new FileReader();
      fr.onload = function () { ok(fr.result); };
      fr.onerror = function () { loi(fr.error); };
      fr.readAsText(f);
    });
    docChu.then(function (chu) {
      var r = MCT.calc.docFileCau(chu);
      var ds = dsCauTuThem().slice(), them = [], trung = [];
      r.ds.forEach(function (c) {
        if (ds.some(function (x) { return khoaCau(x.ten) === khoaCau(c.ten); })) trung.push(c); else them.push(c);
      });
      if (trung.length && !window.confirm('Máy này đã có cẩu ' + trung.map(function (c) { return c.ten; }).join(', ') +
        '. Thay bằng số liệu trong file?')) trung = [];
      trung.forEach(function (c) { ds = ds.map(function (x) { return khoaCau(x.ten) === khoaCau(c.ten) ? c : x; }); });
      ds = ds.concat(them);
      if (them.length || trung.length) luuThuVienCau(ds);
      capNhatBanSao();
      tinh();
      luu();
      veTrang();
      datTrangThai(them.length || trung.length ? 'Đã nhập ' + (them.length + trung.length) + ' cẩu từ ' + f.name +
        (trung.length ? ' (thay ' + trung.length + ' cẩu cùng tên)' : '') : 'Không nhập thêm cẩu nào từ ' + f.name);
      if (r.loi.length) window.alert('Một số cẩu trong file không nhập được:\n' + r.loi.join('\n'));
    }).catch(function (e) {
      datTrangThai('Không đọc được file: ' + e.message);
    });
    oFile.value = '';
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

  // Chuyển biểu đồ SVG thành ảnh PNG (tỉ lệ 2× cho rõ nét) để chèn vào file Word
  function svgSangPng(svg, w, h) {
    return new Promise(function (ok) {
      var img = new Image();
      img.onload = function () {
        try {
          var tiLe = 2, cv = document.createElement('canvas');
          cv.width = w * tiLe; cv.height = h * tiLe;
          var ctx = cv.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          cv.toBlob(function (b) {
            if (!b) return ok(null);
            b.arrayBuffer().then(function (ab) { ok({ data: new Uint8Array(ab), w: w, h: h }); }, function () { ok(null); });
          }, 'image/png');
        } catch (e) { ok(null); }   // trình duyệt chặn vẽ SVG lên canvas → thuyết minh để ô chèn hình
      };
      img.onerror = function () { ok(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  function taoHinhThuyetMinh(E) {
    var ds = [];
    var BD = MCT.bieuDo;
    if (tatCa.DC && tatCa.DC.hopLe) ds.push(['spt', BD.spt(tatCa.DC, { w: 360, h: 520 }), 360, 520]);
    if (tatCa.TN && tatCa.TN.bang) {
      ds.push(['M', BD.noiLuc(tatCa.TN.bang, 'M', 'BENDING MOMENT ALONG PILE SHAFT', 'Mz (kNm)', '#2f6db5', { w: 340, h: 400 }), 340, 400]);
      ds.push(['Q', BD.noiLuc(tatCa.TN.bang, 'Q', 'SHEAR FORCE ALONG PILE SHAFT', 'Qz (kN)', '#2f6db5', { w: 340, h: 400 }), 340, 400]);
      ds.push(['sigma', BD.noiLuc(tatCa.TN.bang, 'sigma', 'HORIZONTAL PRESSURE ALONG PILE SHAFT', 'σz (kN/m2)', '#2f6db5', { w: 340, h: 400 }), 340, 400]);
    }
    if (tatCa.TT && tatCa.TT.hopLe) ds.push(['tuongTac', BD.tuongTac(tatCa.TT, { w: 480, h: 440 }), 480, 440]);
    if (E) {   // phương pháp ETABS: mặt bằng mô hình, bao nội lực cọc chính, các cặp N–M
      ds.push(['etabsMatBang', svgMatBangEtabsChi(E.m), 560, 420]);
      var ck = E.kE.cocKiemTra;
      var c0 = E.kE.coc.filter(function (c) { return ck.Mmax && c.ten === ck.Mmax.coc; })[0] || E.kE.coc[0];
      var bang = c0.doc.map(function (x) { return { z: x.z, P: -x.Pmin, M: x.M, V: x.V }; });
      ds.push(['etabsP', BD.noiLuc(bang, 'P', 'AXIAL FORCE – ' + c0.ten, 'P (kN)', '#1f4e79', { w: 250, h: 380 }), 250, 380]);
      ds.push(['etabsM', BD.noiLuc(bang, 'M', 'BENDING MOMENT – ' + c0.ten, 'M (kNm)', '#c0504d', { w: 250, h: 380 }), 250, 380]);
      ds.push(['etabsV', BD.noiLuc(bang, 'V', 'SHEAR FORCE – ' + c0.ten, 'V (kN)', '#2a9bb8', { w: 250, h: 380 }), 250, 380]);
      if (tatCa.TT && tatCa.TT.hopLe) {
        ds.push(['etabsTuongTac', BD.tuongTac(Object.assign({}, tatCa.TT, { diemNoiLuc: E.kE.diemTuongTac, chamNho: true,
          diemDanhDau: E.kE.cocKiemTra.nguyHiem, motPhia: true, tieuDe: 'BIỂU ĐỒ TƯƠNG TÁC CỌC CẨU THÁP ' + state.duAn.tenMong }), { w: 560, h: 480 }), 560, 480]);
      }
    }
    return Promise.all(ds.map(function (d) { return svgSangPng(d[1], d[2], d[3]); })).then(function (anh) {
      var hinh = {};
      ds.forEach(function (d, i) { if (anh[i]) hinh[d[0]] = anh[i]; });
      return hinh;
    });
  }

  function xuatThuyetMinh() {
    if (!ketQua || !ketQua.hopLe) {
      datTrangThai('Chưa xuất được: mục A còn lỗi.');
      return;
    }
    // Phương pháp ETABS: gắn mô hình, tải trọng, kết quả kiểm tra, kết luận vào số liệu thuyết minh
    var E = null;
    if (laEtabs()) {
      var kE = ketQuaEtabsHienTai();
      if (!kE || !kE.hopLe) {
        datTrangThai('Chưa xuất được: đang chọn phương pháp ETABS nhưng ' +
          (kE && kE.loi && kE.loi.length ? kE.loi[0].replace(/\.$/, '') : 'chưa có kết quả ETABS – chạy phân tích ở trang Kết quả ETABS') +
          ' (hoặc chọn phương pháp Giải tích).');
        return;
      }
      if (!etabsConKhop() && !window.confirm('Kết quả ETABS đang lưu được tính với thông số khác thông số hiện tại.\n' +
        'Nên dựng lại mô hình và chạy phân tích trước khi xuất. Vẫn xuất thuyết minh với kết quả cũ?')) {
        datTrangThai('Đã huỷ xuất thuyết minh.');
        return;
      }
      var mE = moHinhEtabs();
      E = { m: mE, t: taiTrongEtabs(mE), kE: kE, F: ketLuanHienTai(), thoiDiem: etabsLuu.thoiDiem, file: etabsLuu.file };
    }
    var soLieu = E ? Object.assign({}, tatCa, { etabs: E }) : tatCa;
    datTrangThai('Đang tạo thuyết minh…');
    napThuVienDocx().then(function () {
      return taoHinhThuyetMinh(E);
    }).then(function (hinh) {
      var doc = MCT.baoCao.taoThuyetMinh(state, soLieu, hinh);
      return globalThis.docx.Packer.toBlob(doc);
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = MCT.baoCao.tenFile(state, soLieu);
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
