// Phần C – Kiểm tra xuyên thủng đài do chân cẩu (sheet "Cau thap", mục C)
//
// Excel chỉ ghi câu khẳng định "Tháp xuyên bao trùm tất cả các đầu cọc nên không cần
// kiểm tra xuyên thủng". App tính đầy đủ theo TCVN 5574:2018, mục 8.1.6.2.1:
//
//   - Diện chịu tải: chân cẩu Ht × Ht; chiều cao làm việc h0 = H − a.
//   - Tháp xuyên 45° từ mép chân cẩu tới cao trình cốt thép chịu kéo: đáy tháp
//     Bxt = Ht + 2·h0. Cọc nào KHÔNG nằm trọn trong đáy tháp thì phản lực của nó
//     gây xuyên thủng (lấy cả cọc – thiên về an toàn).
//   - Lực gây xuyên thủng F = Σ Pimax của các cọc đó (mômen đã kể đến trong Pimax).
//   - Khả năng chống xuyên thủng Fb,ult = Rbt·u·h0, u = 4·(Ht + h0) là chu vi
//     đường bao tính toán cách mép chân cẩu h0/2.
//   - Điều kiện: F ≤ Fb,ult.
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  var SAI_SO = 1e-9;

  /**
   * @param {object} phanA  kết quả tinhPhanA (cần Ht, dai.H, vatLieu.Rbt, vatLieu.a_cm)
   * @param {object} phanB  kết quả tinhPhanB (cần danh sách cọc với Pimax)
   * @param {object} v      { D } đường kính cọc (m)
   */
  function tinhPhanC(phanA, phanB, v) {
    var loi = [];
    if (!phanA || !phanA.cau) loi.push('Chưa có thông số cẩu (mục A).');
    if (!phanB || !phanB.hopLe) loi.push('Chưa có tải trọng lên cọc (mục B).');
    var D = Number(v && v.D);
    if (!(D > 0)) loi.push('Đường kính cọc D phải lớn hơn 0.');
    if (loi.length) return { hopLe: false, loi: loi };

    var Ht = phanA.Ht;
    var H = phanA.dai.H;
    var a = phanA.vatLieu.a_cm / 100;
    var Rbt = phanA.vatLieu.Rbt;
    var h0 = H - a;
    if (!(h0 > 0)) return { hopLe: false, loi: ['Chiều cao làm việc h0 = H − a phải lớn hơn 0.'] };
    if (typeof Rbt !== 'number') return { hopLe: false, loi: ['Chưa có cường độ Rbt của bê tông đài.'] };

    var Bxt = Ht + 2 * h0;              // cạnh đáy tháp xuyên
    var nuaB = Bxt / 2;

    var coc = phanB.coc.map(function (c) {
      // Khoảng cách từ tâm chân cẩu tới mép xa nhất của đầu cọc, theo từng phương
      var mepX = Math.abs(c.x) + D / 2;
      var mepY = Math.abs(c.y) + D / 2;
      var trongThap = mepX <= nuaB + SAI_SO && mepY <= nuaB + SAI_SO;
      return {
        stt: c.stt, x: c.x, y: c.y, mepX: mepX, mepY: mepY,
        trongThap: trongThap, Pimax: c.Pimax,
        F: trongThap ? 0 : Math.max(c.Pimax, 0)
      };
    });

    var F = coc.reduce(function (s, c) { return s + c.F; }, 0);
    var u = 4 * (Ht + h0);
    var Ab = u * h0;
    var Fbult = Rbt * 1000 * Ab;        // MPa → kN/m²
    var soCocNgoai = coc.filter(function (c) { return !c.trongThap; }).length;

    return {
      hopLe: true,
      loi: [],
      Ht: Ht, H: H, a: a, h0: h0, D: D,
      Bxt: Bxt,
      coc: coc,
      soCocNgoai: soCocNgoai,
      baoTrumTatCa: soCocNgoai === 0,
      F: F,
      u: u, Ab: Ab, Rbt: Rbt, Fbult: Fbult,
      ok: F <= Fbult,
      heSo: F > 0 ? Fbult / F : Infinity
    };
  }

  MCT.calc.tinhPhanC = tinhPhanC;
})(globalThis.MCT = globalThis.MCT || {});
