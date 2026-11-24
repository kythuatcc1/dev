// Phần B – Kiểm tra tải trọng tác dụng lên cọc (sheet "Cau thap", dòng 46 → 64)
//
//   Pimax/imin = Ntt/n ± M·cosαi·|xi|/Σx² ± M·sinαi·|yi|/Σy²      (hàm VBA Pimax, Pimin)
//   αi = atan(|yi|/|xi|), xi = 0 → αi = 90°
//   Lấy giá trị bất lợi giữa 2 trường hợp cẩu làm việc / không làm việc.
//   Kiểm tra: Pmax ≤ Qa ;  Pmin ≥ Qa' (Qa' mang dấu âm – sức chịu kéo).
//
// Khác Excel: Excel thiếu công thức ở cột cọc số 4 (cột H) nên bỏ sót cọc này khi
// tìm Pmax/Pmin. App tính đủ mọi cọc (với móng ≤ 3 cọc kết quả giống hệt Excel).
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  var SO_COC_TOI_DA = 10; // Excel có 10 cột tọa độ E:N

  function rad(deg) { return deg * Math.PI / 180; }

  // Ô E59: =IF(ISERROR(DEGREES(ATAN(ABS(y)/ABS(x)))),90,DEGREES(ATAN(ABS(y)/ABS(x))))
  function gocAlpha(x, y) {
    if (x === 0) return 90;
    return Math.atan(Math.abs(y) / Math.abs(x)) * 180 / Math.PI;
  }

  // a/b nhưng 0/0 = 0 (khi mọi cọc nằm trên một trục, thành phần mômen theo trục kia bằng 0)
  function chia(a, b) { return a === 0 ? 0 : a / b; }

  function thanhPhan(ngoaiLuc, n, x, y, alpha, sumX2, sumY2) {
    var M = ngoaiLuc.M;
    return {
      Pn: ngoaiLuc.P / n,
      Mx: chia(M * Math.cos(rad(alpha)) * Math.abs(x), sumX2),
      My: chia(M * Math.sin(rad(alpha)) * Math.abs(y), sumY2)
    };
  }

  /**
   * @param {object} phanA  kết quả MCT.calc.tinhPhanA
   * @param {object} v      { toaDo: [{x, y}], Qa, QaKeo }  (QaKeo: độ lớn sức chịu kéo, số dương)
   */
  function tinhPhanB(phanA, v) {
    var loi = [];
    function laSo(t) { return t !== '' && t !== null && t !== undefined && isFinite(t); }
    var toaDo = (v.toaDo || []).filter(function (c) {
      return laSo(c.x) && laSo(c.y);
    }).map(function (c) { return { x: Number(c.x), y: Number(c.y) }; });

    var n = toaDo.length;
    if (n === 0) loi.push('Chưa nhập tọa độ cọc.');
    if (n > SO_COC_TOI_DA) loi.push('Tối đa ' + SO_COC_TOI_DA + ' cọc (giống Excel).');
    var nl = phanA && phanA.ngoaiLuc;
    if (!nl || !nl.lv) loi.push('Chưa có tải trọng tại đáy đài (kiểm tra mục A).');
    var Qa = Number(v.Qa);
    var QaKeo = -Math.abs(Number(v.QaKeo));
    if (!isFinite(Qa)) loi.push('Sức chịu tải nén Qa không hợp lệ.');
    if (!isFinite(QaKeo)) loi.push('Sức chịu tải kéo Qa\' không hợp lệ.');
    if (loi.length) return { hopLe: false, loi: loi, n: n, coc: [] };

    var sumX2 = 0, sumY2 = 0;
    toaDo.forEach(function (c) { sumX2 += c.x * c.x; sumY2 += c.y * c.y; });

    var coc = toaDo.map(function (c, i) {
      var alpha = gocAlpha(c.x, c.y);
      var lv = thanhPhan(nl.lv, n, c.x, c.y, alpha, sumX2, sumY2);
      var klv = thanhPhan(nl.klv, n, c.x, c.y, alpha, sumX2, sumY2);
      return {
        stt: i + 1, x: c.x, y: c.y, alpha: alpha,
        lv: lv, klv: klv,
        Pimax: Math.max(lv.Pn + lv.Mx + lv.My, klv.Pn + klv.Mx + klv.My),
        Pimin: Math.min(lv.Pn - lv.Mx - lv.My, klv.Pn - klv.Mx - klv.My)
      };
    });

    var Pmax = Math.max.apply(null, coc.map(function (c) { return c.Pimax; }));
    var Pmin = Math.min.apply(null, coc.map(function (c) { return c.Pimin; }));

    return {
      hopLe: true,
      loi: [],
      n: n,
      sumX2: sumX2,
      sumY2: sumY2,
      coc: coc,
      Pmax: Pmax,
      Pmin: Pmin,
      Qa: Qa,
      QaKeo: QaKeo,
      // Ô L63: =IF(G63<=J63,"OK","FAIL") ; L64: =IF(G64>=J64,"OK","FAIL")
      kiemTraNen: { ok: Pmax <= Qa, heSo: Qa / Pmax },
      kiemTraKeo: { ok: Pmin >= QaKeo, heSo: Pmin < 0 ? QaKeo / Pmin : Infinity }
    };
  }

  MCT.calc.SO_COC_TOI_DA = SO_COC_TOI_DA;
  MCT.calc.gocAlpha = gocAlpha;
  MCT.calc.tinhPhanB = tinhPhanB;
})(globalThis.MCT = globalThis.MCT || {});
