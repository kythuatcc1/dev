// Cẩu tháp tự thêm (ngoài catalogue sheet Solieu của file Excel)
//  - taoCauTuNhap: số liệu nhập trên trang "Thêm cẩu tháp" → cẩu cùng cấu trúc catalogue (js/data/cau-thap.js) + kiểm tra
//  - cauSangNhap:  cẩu → số liệu nhập (để sửa, hoặc sao chép từ cẩu có sẵn)
//  - datCauTuThem: đăng ký danh sách cẩu tự thêm để MCT.calc.timCau tìm thấy (mọi phần tính dùng như cẩu có sẵn)
//  - docBangDan:   đọc bảng tải dán từ Excel / catalogue
//  - taoFileCau, docFileCau: file .json để chia sẻ cẩu giữa các máy
(function (MCT) {
  'use strict';
  MCT.data = MCT.data || {};
  MCT.calc = MCT.calc || {};
  MCT.data.cauTuThem = MCT.data.cauTuThem || [];

  var LOAI = {
    bang: { vi: '(Cẩu bằng)', en: '(Hammerhead)' },
    'dinh-bang': { vi: '(Cẩu đỉnh bằng)', en: '(Flat-top)' },
    'gat-gu': { vi: '(Cẩu gật gù)', en: '(Luffing)' }
  };
  var KY_TU_CAM = /[\\/:*?"<>|]/;
  var LOAI_FILE = 'mong-cau-thap/cau-thap';

  function khoa(ten) { return String(ten == null ? '' : ten).replace(/\s+/g, '').toLowerCase(); }

  // Số từ ô nhập: nhận "548,06", "548.06", "1.234,5", "1,234.5"; trống → null; không đọc được → NaN
  function docSo(v) {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var t = String(v).trim().replace(/\s+/g, '');
    if (t === '' || t === '-') return null;
    var phay = t.lastIndexOf(','), cham = t.lastIndexOf('.');
    if (phay >= 0 && cham >= 0) t = phay > cham ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    else if (phay >= 0) t = t.replace(',', '.');
    return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
  }

  function g(v) { return String(Math.round(v * 1000) / 1000); }

  /** Các cột của bảng tải theo lựa chọn quy đổi (CR khi mômen có thành phần CR, T khi mômen xoắn theo từng chiều cao). */
  function cotBangTai(d) {
    var coCR = d.quyTacM === 'cr', coT = d.kieuT === 'theo-hang';
    return { lv: ['N', 'M', 'H'].concat(coCR ? ['CR'] : [], coT ? ['T'] : []), klv: ['N', 'M', 'H'].concat(coCR ? ['CR'] : []) };
  }

  /**
   * Số liệu nhập → cẩu (cấu trúc như catalogue) và danh sách lỗi.
   * @param {object} d  { tenGoc, ten, loai, chieuDaiTayCan, beRongThan, duongKinhNhomBulong, tongChieuDayBanThep,
   *                      heSoAnToan, quyTacN ('x_n'|'cong40_n'), quyTacM ('x_n'|'cr'), kieuT ('khong'|'mot'|'theo-hang'),
   *                      mXoan, pctCoDinh, nhan{N, M, H, CR, T}, hang[{h, lv{N, M, H, CR, T}, klv{N, M, H, CR}}] }
   * @param {Array} dsTuThem  cẩu tự thêm hiện có (kiểm tra trùng tên; bỏ qua cẩu đang sửa – d.tenGoc)
   */
  function taoCauTuNhap(d, dsTuThem) {
    var loi = [];
    d = d || {};
    var ten = String(d.ten == null ? '' : d.ten).trim().replace(/\s+/g, ' ');
    if (!ten) loi.push('Nhập tên (mã hiệu) cẩu.');
    else if (KY_TU_CAM.test(ten)) loi.push('Tên cẩu không được chứa các ký tự \\ / : * ? " < > |');
    else if (ten.length > 40) loi.push('Tên cẩu dài quá 40 ký tự.');
    else {
      if ((MCT.data.cauThap || []).some(function (c) { return khoa(c.ten) === khoa(ten); })) {
        loi.push('Tên "' + ten + '" trùng một cẩu có sẵn trong catalogue – đặt tên khác (ví dụ thêm hãng hoặc đời cẩu).');
      }
      if ((dsTuThem || []).some(function (c) { return khoa(c.ten) === khoa(ten) && khoa(c.ten) !== khoa(d.tenGoc); })) {
        loi.push('Đã có cẩu tự thêm tên "' + ten + '".');
      }
    }

    function soDuong(v, nhan, choPhep0) {
      var x = docSo(v);
      if (x === null || isNaN(x)) { loi.push('Nhập ' + nhan + '.'); return null; }
      if (choPhep0 ? x < 0 : x <= 0) { loi.push(nhan.charAt(0).toUpperCase() + nhan.slice(1) + ' phải ' + (choPhep0 ? '≥ 0' : '> 0') + '.'); return null; }
      return x;
    }
    var L = soDuong(d.chieuDaiTayCan, 'chiều dài tay cần');
    var Ht = soDuong(d.beRongThan, 'bề rộng thân cẩu Ht');
    var D1 = soDuong(d.duongKinhNhomBulong, 'đường kính nhóm bulong');
    var tBan = soDuong(d.tongChieuDayBanThep, 'tổng chiều dày bản thép');
    var n = soDuong(d.heSoAnToan, 'hệ số an toàn n');
    var quyTacN = d.quyTacN === 'cong40_n' ? 'cong40_n' : 'x_n';
    var quyTacM = d.quyTacM === 'cr' ? 'cr' : 'x_n';
    var kieuT = d.kieuT === 'mot' || d.kieuT === 'theo-hang' ? d.kieuT : 'khong';
    var mXoan = null;
    if (kieuT === 'mot') mXoan = soDuong(d.mXoan, 'mômen xoắn T', true);
    var pct = docSo(d.pctCoDinh);
    if (pct !== null && (isNaN(pct) || pct <= 0)) { loi.push('Lực nhổ chân cẩu phải là số > 0 (hoặc để trống để app tự tính).'); pct = null; }

    var cot = cotBangTai({ quyTacM: quyTacM, kieuT: kieuT });
    var TEN_COT = { N: 'N', M: 'M', H: 'H', CR: 'CR', T: 'T' };
    var hang = [];
    (d.hang || []).forEach(function (r, i) {
      var h = docSo(r && r.h);
      if (h === null && ['lv', 'klv'].every(function (tt) { return cot[tt].every(function (k) { return docSo(r && r[tt] && r[tt][k]) === null; }); })) return;   // dòng trống
      var dong = { h: h, lv: {}, klv: {} }, ok = true;
      if (h === null || isNaN(h) || h <= 0) { loi.push('Bảng tải, dòng ' + (i + 1) + ': chiều cao H phải là số > 0.'); ok = false; }
      ['lv', 'klv'].forEach(function (tt) {
        cot[tt].forEach(function (k) {
          var x = docSo(r && r[tt] && r[tt][k]);
          if (x === null || isNaN(x)) { loi.push('Bảng tải, dòng ' + (i + 1) + ': nhập ' + (tt === 'lv' ? 'LV ' : 'KLV ') + TEN_COT[k] + '.'); ok = false; return; }
          if (k === 'N' && x <= 0) { loi.push('Bảng tải, dòng ' + (i + 1) + ': lực dọc ' + (tt === 'lv' ? 'LV' : 'KLV') + ' N phải > 0.'); ok = false; return; }
          if (k !== 'N' && x < 0) { loi.push('Bảng tải, dòng ' + (i + 1) + ': ' + (tt === 'lv' ? 'LV ' : 'KLV ') + TEN_COT[k] + ' phải ≥ 0 (nhập giá trị tuyệt đối).'); ok = false; return; }
          dong[tt][k] = x;
        });
      });
      if (ok) hang.push(dong);
    });
    if (!hang.length && !loi.some(function (m) { return /^Bảng tải/.test(m); })) loi.push('Bảng tải theo chiều cao cần ít nhất 1 dòng.');
    hang.sort(function (a, b) { return a.h - b.h; });
    for (var i = 1; i < hang.length; i++) {
      if (hang[i].h === hang[i - 1].h) loi.push('Bảng tải có hai dòng cùng chiều cao H = ' + g(hang[i].h) + ' m.');
    }

    var nh = d.nhan || {};
    function nhan(k) { var v = String(nh[k] == null ? '' : nh[k]).trim(); return v || TEN_COT[k]; }
    var nhanLv = {}, nhanKlv = {};
    cot.lv.forEach(function (k) { nhanLv[k] = nhan(k); });
    cot.klv.forEach(function (k) { nhanKlv[k] = nhan(k); });
    var loai = LOAI[d.loai] ? d.loai : 'bang';

    if (loi.length) return { hopLe: false, loi: loi };
    return {
      hopLe: true, loi: [],
      cau: {
        ten: ten,
        tieuDe: 'Tower crane type ' + g(L) + 'm (' + ten + ')',
        loaiVI: LOAI[loai].vi, loaiEN: LOAI[loai].en,
        chieuDaiTayCan: L, beRongThan: Ht,
        nhanXoan: kieuT === 'khong' ? null : nhan('T'),
        mXoan: mXoan,
        nhan: { lv: nhanLv, klv: nhanKlv },
        quyTac: {
          lv: { N: quyTacN, M: quyTacM === 'cr' ? 'cong_cr_n' : 'x_n', H: 'x_n' },
          klv: { N: quyTacN, M: quyTacM === 'cr' ? 'cr_klv_n' : 'x_n', H: 'x_n' }
        },
        pctCoDinh: pct,
        duongKinhNhomBulong: D1, tongChieuDayBanThep: tBan,
        heSoAnToan: n,
        tuThem: true,
        hang: hang
      }
    };
  }

  /** Cẩu → số liệu nhập. saoChep: lấy từ cẩu có sẵn làm mẫu (để trống tên). */
  function cauSangNhap(cau, saoChep) {
    var qt = cau.quyTac || { lv: {}, klv: {} };
    var coTHang = (cau.hang || []).some(function (h) { return h.lv && typeof h.lv.T === 'number'; });
    var quyTacM = qt.lv.M === 'cong_cr_n' ? 'cr' : 'x_n';
    var kieuT = typeof cau.mXoan === 'number' ? 'mot' : coTHang ? 'theo-hang' : 'khong';
    var nh = (cau.nhan && cau.nhan.lv) || {};
    var en = String(cau.loaiEN || '');
    var canhBao = [];
    if ((cau.hang || []).some(function (h) { return h.quyTac; })) canhBao.push('Cẩu ' + cau.ten + ' có quy tắc quy đổi riêng cho từng chiều cao – bản sao dùng một quy tắc chung, kiểm tra lại tải quy đổi.');
    if (qt.lv.M && ['x_n', 'cong_cr_n'].indexOf(qt.lv.M) < 0) canhBao.push('Quy tắc mômen "' + qt.lv.M + '" không có trong lựa chọn – bản sao dùng M × n.');
    function so(v) { return typeof v === 'number' ? v : ''; }
    return {
      tenGoc: saoChep ? '' : cau.ten,
      ten: saoChep ? '' : cau.ten,
      loai: /luffing/i.test(en) ? 'gat-gu' : /flat/i.test(en) ? 'dinh-bang' : 'bang',
      chieuDaiTayCan: so(cau.chieuDaiTayCan),
      beRongThan: so(cau.beRongThan),
      duongKinhNhomBulong: so(cau.duongKinhNhomBulong),
      tongChieuDayBanThep: so(cau.tongChieuDayBanThep),
      heSoAnToan: typeof cau.heSoAnToan === 'number' ? cau.heSoAnToan : (MCT.calc.heSoAnToan ? MCT.calc.heSoAnToan(cau.ten) : 1.2),
      quyTacN: qt.lv.N === 'cong40_n' ? 'cong40_n' : 'x_n',
      quyTacM: quyTacM,
      kieuT: kieuT,
      mXoan: typeof cau.mXoan === 'number' ? cau.mXoan : '',
      pctCoDinh: typeof cau.pctCoDinh === 'number' ? cau.pctCoDinh : '',
      nhan: { N: nh.N || 'N', M: nh.M || 'M', H: nh.H || 'H', CR: nh.CR || 'CR', T: cau.nhanXoan || 'T' },
      hang: (cau.hang || []).map(function (h) {
        return {
          h: h.h,
          lv: { N: so(h.lv.N), M: so(h.lv.M), H: so(h.lv.H), CR: so(h.lv.CR), T: so(h.lv.T) },
          klv: { N: so(h.klv.N), M: so(h.klv.M), H: so(h.klv.H), CR: so(h.klv.CR) }
        };
      }),
      canhBao: canhBao
    };
  }

  /** Đăng ký danh sách cẩu tự thêm (thay danh sách cũ). */
  function datCauTuThem(ds) {
    MCT.data.cauTuThem = (ds || []).slice();
    return MCT.data.cauTuThem;
  }

  /**
   * Bảng tải dán từ Excel: mỗi dòng một chiều cao, các ô cách nhau bằng Tab (hoặc dấu cách / chấm phẩy).
   * Thứ tự cột: H, các cột làm việc, các cột không làm việc (theo cotBangTai). Dòng tiêu đề (ô đầu không phải số) được bỏ qua.
   */
  function docBangDan(text, cot) {
    var soCot = 1 + cot.lv.length + cot.klv.length;
    var hang = [], loi = [];
    String(text || '').split(/\r?\n/).forEach(function (dong, i) {
      if (!dong.trim()) return;
      var o = dong.indexOf('\t') >= 0 ? dong.split('\t') : dong.trim().split(/[;\s]+/);
      while (o.length > soCot && String(o[o.length - 1]).trim() === '') o.pop();   // ô trống thừa cuối dòng
      var dau = docSo(o[0]);
      if (dau === null || isNaN(dau)) return;   // dòng tiêu đề
      if (o.length !== soCot) {
        loi.push('Dòng ' + (i + 1) + ' có ' + o.length + ' ô, cần ' + soCot + ' ô (H, LV ' + cot.lv.join(', ') + ', KLV ' + cot.klv.join(', ') + ').');
        return;
      }
      var r = { h: dau, lv: {}, klv: {} }, k = 1, ok = true;
      ['lv', 'klv'].forEach(function (tt) {
        cot[tt].forEach(function (c) {
          var x = docSo(o[k++]);
          if (isNaN(x)) { loi.push('Dòng ' + (i + 1) + ': ô ' + (tt === 'lv' ? 'LV ' : 'KLV ') + c + ' không phải số ("' + String(o[k - 1]).trim() + '").'); ok = false; }
          r[tt][c] = x === null ? '' : x;
        });
      });
      if (ok) hang.push(r);
    });
    if (!hang.length && !loi.length) loi.push('Không đọc được dòng số liệu nào.');
    return { hang: hang, loi: loi };
  }

  /** File chia sẻ cẩu tự thêm. */
  function taoFileCau(ds) {
    return { loai: LOAI_FILE, phienBan: 1, thoiDiem: new Date().toISOString(), ds: (ds || []).map(function (c) { return JSON.parse(JSON.stringify(c)); }) };
  }

  /** Đọc file .json: trả về các cẩu hợp lệ (đã chuẩn hoá) và lỗi từng cẩu. Chưa xét trùng tên với cẩu tự thêm hiện có. */
  function docFileCau(text) {
    var goc;
    try { goc = JSON.parse(text); } catch (e) { return { ds: [], loi: ['File không phải JSON hợp lệ.'] }; }
    var ds = Array.isArray(goc) ? goc : goc && Array.isArray(goc.ds) ? goc.ds : goc && goc.hang ? [goc] : null;
    if (!ds) return { ds: [], loi: ['File không có danh sách cẩu tháp (cần file do app xuất ra).'] };
    var ra = [], loi = [];
    ds.forEach(function (c, i) {
      if (!c || !Array.isArray(c.hang)) { loi.push('Cẩu thứ ' + (i + 1) + ': thiếu bảng tải.'); return; }
      var d = cauSangNhap(c);
      d.tenGoc = '';
      var kq = taoCauTuNhap(d, ra);
      if (kq.hopLe) ra.push(kq.cau);
      else loi.push('Cẩu "' + (c.ten || i + 1) + '": ' + kq.loi.join(' '));
    });
    return { ds: ra, loi: loi };
  }

  MCT.calc.khoaTenCau = khoa;
  MCT.calc.docSoNhap = docSo;
  MCT.calc.cotBangTai = cotBangTai;
  MCT.calc.taoCauTuNhap = taoCauTuNhap;
  MCT.calc.cauSangNhap = cauSangNhap;
  MCT.calc.datCauTuThem = datCauTuThem;
  MCT.calc.docBangDan = docBangDan;
  MCT.calc.taoFileCau = taoFileCau;
  MCT.calc.docFileCau = docFileCau;
  MCT.data.loaiCauTuThem = LOAI;
})(globalThis.MCT = globalThis.MCT || {});
