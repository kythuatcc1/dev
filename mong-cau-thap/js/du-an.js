// Lưu / mở dự án: một file .mct.json gồm toàn bộ thông số đang nhập (state), kết quả ETABS đã lưu (để xuất thuyết minh không cần
// chạy lại) và (tuỳ chọn) ảnh chụp ETABS / ảnh tải lên. Cẩu tự thêm đi kèm trong state.cau.banSao (khôi phục khi mở trên máy khác).
(function (MCT) {
  'use strict';

  var DINH_DANG = 'mong-cau-thap/du-an', PHIEN_BAN = 1;

  function b64TuBytes(u8) {
    if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
    var s = '', buoc = 0x8000;
    for (var i = 0; i < u8.length; i += buoc) s += String.fromCharCode.apply(null, u8.subarray(i, i + buoc));
    return btoa(s);
  }
  function bytesTuB64(b64) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
    var s = atob(b64), u8 = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }

  /**
   * Nội dung file dự án.
   * @param {object} state    thông số app
   * @param {object} etabs    kết quả ETABS đã lưu ({ vanTay, thoiDiem, file, tomTat }) hoặc null
   * @param {object} anh      ảnh đã lưu { khoa: { data, w, h, goc, vung, nguon, ten, cach, thoiGian } } hoặc null (không kèm ảnh)
   */
  function taoFileDuAn(state, etabs, anh) {
    var dsAnh = anh ? Object.keys(anh).map(function (k) {
      var a = anh[k];
      return { khoa: k, w: a.w, h: a.h, nguon: a.nguon || '', ten: a.ten || '', cach: a.cach || '', thoiGian: a.thoiGian || '', vung: a.vung || null,
        data: b64TuBytes(a.data), goc: a.goc ? b64TuBytes(a.goc) : null };
    }) : null;
    return {
      dinhDang: DINH_DANG, phienBan: PHIEN_BAN, luuLuc: new Date().toISOString(),
      tenMong: state && state.duAn ? state.duAn.tenMong : '', cau: state && state.cau ? state.cau.ten : '',
      state: state, etabs: etabs || null, anh: dsAnh
    };
  }

  /** Tên file gợi ý: DuAn_<tên móng>_<cẩu>_<yyyymmdd>.mct.json */
  function tenFileDuAn(state, ngay) {
    var d = ngay || new Date(), so = function (n) { return (n < 10 ? '0' : '') + n; };
    var ten = ['DuAn', state.duAn && state.duAn.tenMong, state.cau && state.cau.ten].filter(Boolean).join('_').replace(/[\\/:*?"<>|\s]+/g, '_');
    return ten + '_' + d.getFullYear() + so(d.getMonth() + 1) + so(d.getDate()) + '.mct.json';
  }

  /**
   * Đọc file dự án. macDinh: state mặc định của bản app đang chạy – số liệu trong file ghép lên (thông số mới của bản app
   * mới hơn file vẫn có giá trị mặc định). Trả { ok, loi, state, etabs, anh: { khoa: rec } | null, tenMong, luuLuc }.
   */
  function docFileDuAn(chuoi, macDinh) {
    var d;
    try { d = JSON.parse(chuoi); } catch (e) { return { ok: false, loi: 'File không phải JSON: ' + e.message }; }
    if (!d || d.dinhDang !== DINH_DANG || !d.state || typeof d.state !== 'object') {
      return { ok: false, loi: 'File không phải dự án móng cẩu tháp (.mct.json).' };
    }
    if (Number(d.phienBan) > PHIEN_BAN) return { ok: false, loi: 'File dự án tạo bằng bản app mới hơn (phiên bản ' + d.phienBan + ') – cập nhật app.' };
    var s = JSON.parse(JSON.stringify(macDinh));
    Object.keys(s).forEach(function (k) {
      var v = d.state[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) Object.assign(s[k], v);
      else if (v !== undefined && v !== null) s[k] = v;
    });
    var anh = null;
    if (Array.isArray(d.anh)) {
      anh = {};
      d.anh.forEach(function (a) {
        if (!a || !a.khoa || !a.data) return;
        anh[a.khoa] = { khoa: a.khoa, w: a.w, h: a.h, nguon: a.nguon, ten: a.ten, cach: a.cach, thoiGian: a.thoiGian, vung: a.vung,
          data: bytesTuB64(a.data), goc: a.goc ? bytesTuB64(a.goc) : null };
      });
    }
    var etabs = d.etabs && d.etabs.tomTat ? d.etabs : null;
    return { ok: true, loi: '', state: s, etabs: etabs, anh: anh, tenMong: d.tenMong || '', cau: d.cau || '', luuLuc: d.luuLuc || '' };
  }

  MCT.duAn = { taoFileDuAn: taoFileDuAn, docFileDuAn: docFileDuAn, tenFileDuAn: tenFileDuAn, DINH_DANG: DINH_DANG };
})(globalThis.MCT = globalThis.MCT || {});
