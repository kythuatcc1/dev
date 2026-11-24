// Phần F – Kết luận (sheet "Cau thap", ô D143)
//   Excel: =IF(AND(L63,L64,M75,M76,M82,M83,N105,N114,N118,N130,N135,N141 = "OK"),
//              "Móng cẩu tháp đủ khả năng chịu lực", "Móng cẩu tháp KHÔNG đủ khả năng chịu lực")
//   App bổ sung: kiểm tra xuyên thủng đài (mục C) – Excel không tính nên không có trong D143.
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  var DU = 'Móng cẩu tháp đủ khả năng chịu lực';
  var KHONG_DU = 'Móng cẩu tháp KHÔNG đủ khả năng chịu lực';

  function muc(ma, trang, ten, trai, dau, phai, ok, oExcel, boSung) {
    return { ma: ma, trang: trang, ten: ten, trai: trai, dau: dau, phai: phai, ok: !!ok, oExcel: oExcel, boSung: !!boSung };
  }

  /**
   * Gom các kiểm tra. Trả về danh sách mục, kết luận chung (có mục C) và kết luận theo Excel (không có C).
   * Giá trị trai/phai là số (kN, mm²/m, mm) để giao diện tự định dạng.
   */
  function tinhKetLuan(B, C, D, E) {
    var thieu = [];
    if (!B || !B.hopLe) thieu.push('B');
    if (!C || !C.hopLe) thieu.push('C');
    if (!D || !D.hopLe) thieu.push('D');
    if (!E || !E.hopLe) thieu.push('E');
    if (thieu.length) {
      return { hopLe: false, loi: ['Chưa đủ dữ liệu ở mục ' + thieu.join(', ') + ' để kết luận.'], ds: [] };
    }

    var ds = [
      muc('B', 'coc', 'Tải trọng nén lên cọc', { v: B.Pmax, k: 'Pmax', dv: 'kN' }, '≤', { v: B.Qa, k: 'Qa', dv: 'kN' }, B.kiemTraNen.ok, 'L63'),
      muc('B', 'coc', 'Tải trọng kéo lên cọc', { v: B.Pmin, k: 'Pmin', dv: 'kN' }, '≥', { v: B.QaKeo, k: "Qa'", dv: 'kN' }, B.kiemTraKeo.ok, 'L64'),
      muc('C', 'xuyen', 'Xuyên thủng đài do chân cẩu', { v: C.F, k: 'F', dv: 'kN' }, '≤', { v: C.Fbult, k: 'Fb,ult', dv: 'kN' }, C.ok, null, true),
      muc('D', 'thep', 'Thép lớp dưới phương X', { v: D.duoiX.As, k: 'As,cal', dv: 'mm²/m' }, '≤', { v: D.duoiX.AsChon, k: 'As,design', dv: 'mm²/m' }, D.duoiX.ok, 'M75'),
      muc('D', 'thep', 'Thép lớp dưới phương Y', { v: D.duoiY.As, k: 'As,cal', dv: 'mm²/m' }, '≤', { v: D.duoiY.AsChon, k: 'As,design', dv: 'mm²/m' }, D.duoiY.ok, 'M76'),
      muc('D', 'thep', 'Thép lớp trên phương X', { v: D.trenX.As, k: 'As,cal', dv: 'mm²/m' }, '≤', { v: D.trenX.AsChon, k: 'As,design', dv: 'mm²/m' }, D.trenX.ok, 'M82'),
      muc('D', 'thep', 'Thép lớp trên phương Y', { v: D.trenY.As, k: 'As,cal', dv: 'mm²/m' }, '≤', { v: D.trenY.AsChon, k: 'As,design', dv: 'mm²/m' }, D.trenY.ok, 'M83'),
      muc('E', 'bulong', 'Chiều dài neo bulong', { v: E.H0, k: 'H0', dv: 'mm' }, '≤', { v: E.L1L2, k: 'L1+L2', dv: 'mm' }, E.kiemTra.neo, 'N105'),
      muc('E', 'bulong', 'Bulong chịu kéo', { v: E.Pt1, k: 'Pt/1bl', dv: 'kN' }, '<', { v: E.Ntb, k: '[N]tb', dv: 'kN' }, E.kiemTra.keo, 'N114'),
      muc('E', 'bulong', 'Bulong chịu tuột', { v: E.Pt1, k: 'Pt/1bl', dv: 'kN' }, '<', { v: E.Ntuot, k: '[N]', dv: 'kN' }, E.kiemTra.tuot, 'N118'),
      muc('E', 'bulong', 'Bulong chịu cắt', { v: E.Ps1, k: 'Ps/1bl', dv: 'kN' }, '<', { v: E.Nvb, k: '[N]vb', dv: 'kN' }, E.kiemTra.cat, 'N130'),
      muc('E', 'bulong', 'Bulong chịu ép mặt', { v: E.Ps1, k: 'Ps/1bl', dv: 'kN' }, '<', { v: E.Ncb, k: '[N]cb', dv: 'kN' }, E.kiemTra.epMat, 'N135'),
      muc('E', 'bulong', 'Chọc thủng cụm bulong', { v: E.Pxt, k: 'Pxt', dv: 'kN' }, '<', { v: E.PxtGh, k: '[P]xt', dv: 'kN' }, E.kiemTra.chocThung, 'N141')
    ];

    var okExcel = ds.filter(function (m) { return !m.boSung; }).every(function (m) { return m.ok; });
    var ok = ds.every(function (m) { return m.ok; });
    return {
      hopLe: true, loi: [],
      ds: ds,
      ok: ok,
      ketLuan: ok ? DU : KHONG_DU,
      okExcel: okExcel,
      ketLuanExcel: okExcel ? DU : KHONG_DU,
      soFail: ds.filter(function (m) { return !m.ok; }).length
    };
  }

  MCT.calc.tinhKetLuan = tinhKetLuan;
})(globalThis.MCT = globalThis.MCT || {});
