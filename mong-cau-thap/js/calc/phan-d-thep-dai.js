// Phần D – Tính cốt thép cho đài móng (sheet "Cau thap", dòng 68 → 83)
//
//   Cánh tay đòn (cột P:Y dòng 57–60): l0 = max(0, |toạ độ cọc| − Ht/2) theo từng phía
//   Mômen trên 1 m bề rộng:
//     lớp dưới:  M = max(Σ Pimax·l0 phía +, Σ Pimax·l0 phía −) / bề rộng đài
//     lớp trên:  M = min(Σ Pimin⁻·l0 phía +, Σ Pimin⁻·l0 phía −) / bề rộng đài,  Pimin⁻ = min(Pimin, 0)
//     (phương X chia cho Y, phương Y chia cho X)
//   αm = |M| / (Rb·b·h0²),  ξ = 1 − √(1 − 2αm),  As = ξ·Rb·b·h0 / Rs,  b = 1000 mm
//   Thép chọn: As,design = 1000/a · π·d²/4 ; kiểm tra As,cal ≤ As,design
//
// GIỐNG EXCEL – SAI KHÁC ĐÃ GHI CHÚ:
//   Lớp trên (ô I82, I83): As dùng h0 = H − 50 mm, trong khi αm (ô G82, G83) dùng
//   h0 = H − a (a = 15 cm). App tính giống Excel và trả thêm giá trị tính thống nhất
//   để so sánh (ghiChu.thongNhat).
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  var B = 1000;              // bề rộng dải tính toán, mm
  var H0_TREN_EXCEL = 50;    // mm – số cứng trong ô I82, I83

  function tinhThep(M, Rb, Rs, h0Alpha, h0As) {
    var alpha = Math.abs(M) * 1e6 / (Rb * B * h0Alpha * h0Alpha);
    var xi = 1 - Math.sqrt(1 - 2 * alpha);   // NaN khi αm > 0,5 (Excel báo #NUM!)
    var As = xi * Rb * B * h0As / Rs;
    return { alpha: alpha, xi: xi, As: As, h0Alpha: h0Alpha, h0As: h0As, duTietDien: isFinite(xi) };
  }

  function thepChon(d, s) {
    return B / s * Math.PI * d * d / 4;
  }

  /**
   * @param {object} phanA  kết quả tinhPhanA
   * @param {object} phanB  kết quả tinhPhanB
   * @param {object} thep   { duoiX: {d, s}, duoiY: {d, s}, trenX: {d, s}, trenY: {d, s} }  (mm)
   */
  function tinhPhanD(phanA, phanB, thep) {
    var loi = [];
    if (!phanA || !phanA.cau || !phanA.vatLieu.Rb || !phanA.vatLieu.Rs) loi.push('Chưa đủ thông số mục A (cẩu, vật liệu).');
    if (!phanB || !phanB.hopLe) loi.push('Chưa có tải trọng lên cọc (mục B).');
    if (loi.length) return { hopLe: false, loi: loi };

    var Ht = phanA.Ht;
    var X = phanA.dai.X, Y = phanA.dai.Y;
    var Hmm = phanA.dai.H * 1000;
    var amm = phanA.vatLieu.a_cm * 10;
    var Rb = phanA.vatLieu.Rb, Rs = phanA.vatLieu.Rs;
    var h0 = Hmm - amm;                 // ô G75: ($L$39*1000-$L$35*10)
    var h0Tren = Hmm - H0_TREN_EXCEL;   // ô I82: ($L$39*1000-50)
    if (!(h0 > 0)) return { hopLe: false, loi: ['Chiều cao làm việc h0 = H − a phải lớn hơn 0.'] };

    var canh = phanB.coc.map(function (c) {
      return {
        stt: c.stt,
        xDuong: c.x > 0 ? Math.max(0, c.x - Ht / 2) : 0,
        xAm: c.x < 0 ? Math.max(0, -c.x - Ht / 2) : 0,
        yDuong: c.y > 0 ? Math.max(0, c.y - Ht / 2) : 0,
        yAm: c.y < 0 ? Math.max(0, -c.y - Ht / 2) : 0,
        Pimax: c.Pimax,
        PiminAm: Math.min(c.Pimin, 0)
      };
    });

    function tong(phia, luc) {
      return canh.reduce(function (s, c) { return s + c[phia] * c[luc]; }, 0);
    }

    var Mduoi = {
      X: Math.max(tong('xDuong', 'Pimax'), tong('xAm', 'Pimax')) / Y,
      Y: Math.max(tong('yDuong', 'Pimax'), tong('yAm', 'Pimax')) / X
    };
    var Mtren = {
      X: Math.min(tong('xDuong', 'PiminAm'), tong('xAm', 'PiminAm')) / Y,
      Y: Math.min(tong('yDuong', 'PiminAm'), tong('yAm', 'PiminAm')) / X
    };

    function lop(M, key, h0Alpha, h0As) {
      var t = tinhThep(M, Rb, Rs, h0Alpha, h0As);
      var chon = thep && thep[key] ? thep[key] : {};
      var d = Number(chon.d), s = Number(chon.s);
      var AsChon = d > 0 && s > 0 ? thepChon(d, s) : NaN;
      t.M = M;
      t.d = d; t.s = s; t.AsChon = AsChon;
      // Ô M75: =IF(I75<=L75,"OK","FAIL")
      t.ok = t.duTietDien && isFinite(AsChon) && t.As <= AsChon;
      return t;
    }

    var ketQua = {
      duoiX: lop(Mduoi.X, 'duoiX', h0, h0),
      duoiY: lop(Mduoi.Y, 'duoiY', h0, h0),
      trenX: lop(Mtren.X, 'trenX', h0, h0Tren),
      trenY: lop(Mtren.Y, 'trenY', h0, h0Tren)
    };

    // Ghi chú sai khác: thép lớp trên tính thống nhất một giá trị h0
    ['trenX', 'trenY'].forEach(function (k) {
      var r = ketQua[k];
      r.ghiChu = {
        h0Alpha: h0, h0As: h0Tren,
        thongNhatH0a: tinhThep(r.M, Rb, Rs, h0, h0).As,             // cả αm và As dùng H − a
        thongNhatH050: tinhThep(r.M, Rb, Rs, h0Tren, h0Tren).As     // cả αm và As dùng H − 50
      };
    });

    ketQua.hopLe = true;
    ketQua.loi = [];
    ketQua.canh = canh;
    ketQua.h0 = h0;
    ketQua.h0Tren = h0Tren;
    ketQua.Rb = Rb;
    ketQua.Rs = Rs;
    ketQua.Ht = Ht;
    ketQua.tatCaOk = ['duoiX', 'duoiY', 'trenX', 'trenY'].every(function (k) { return ketQua[k].ok; });
    return ketQua;
  }

  MCT.calc.tinhPhanD = tinhPhanD;
})(globalThis.MCT = globalThis.MCT || {});
