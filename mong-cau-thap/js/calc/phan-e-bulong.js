// Phần E – Kiểm tra bulong neo chân cẩu (sheet "Cau thap", dòng 84 → 141)
//   E.1 Thông số bulong          E.4 Chịu tuột (TCVN 5574:2018, 10.3.5.4 – 10.3.5.6)
//   E.2 Chiều dài neo (L.10)     E.5 Chịu cắt  (TCVN 5575:2024, CT 186)
//   E.3 Chịu kéo (L.4.2)         E.6 Ép mặt    (TCVN 5575:2024, CT 187)
//                                E.7 Chọc thủng cụm bulong (TCVN 5574:2018, 8.1.6.2.1)
//
// GIỐNG EXCEL – SAI KHÁC ĐÃ GHI CHÚ (ghiChu.*):
//   - E.7: ô L141 nhân thêm 0,4 nhưng dòng công thức in ra không có hệ số này.
//   - E.2: ô P102 (ngoài vùng in) tính chiều dài neo cơ sở fba·Abn/(π·d·η1·η2·Rbt) nhưng không dùng.
//   - E.5: ô L20 lấy mômen xoắn T từ ô cố định Solieu!E111 (cẩu LLT5020-10) với mọi loại cẩu.
//          App lấy T của đúng cẩu đang chọn; với LLT5020-10 kết quả giống hệt Excel.
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  var LOAI_TINH = 'Bulong tinh/High quality';
  var LOAI_THO = 'Bulong thô/Normal quality';
  var T_EXCEL_E111 = 165.53;   // giá trị ô Solieu!E111 mà Excel dùng cho mọi cẩu
  var HE_SO_CHOC_THUNG = 0.4;  // ô L141

  function timSo(ds, khoa, v) {
    for (var i = 0; i < ds.length; i++) if (Math.abs(ds[i][khoa] - Number(v)) < 1e-9) return ds[i];
    return null;
  }

  /**
   * @param {object} phanA kết quả tinhPhanA
   * @param {object} v     { d, loai, capBen, fcb, n, L1L2, L2, L3, eta1, eta2, alpha1, k0, nv }
   */
  function tinhPhanE(phanA, v) {
    var loi = [];
    if (!phanA || !phanA.cau || !phanA.catalogue) return { hopLe: false, loi: ['Chưa có thông số cẩu (mục A).'] };
    var VL = MCT.data.vatLieu;
    var dk = timSo(VL.bulongDuongKinh, 'd', v.d);
    var cb = timSo(VL.bulongCapBen, 'cap', v.capBen);
    if (!dk) loi.push('Không có đường kính bulong ' + v.d + ' mm trong bảng.');
    if (!cb || typeof cb.fvb !== 'number' || typeof cb.fyb !== 'number') loi.push('Không có cấp độ bền bulong ' + v.capBen + ' trong bảng.');
    var so = ['n', 'L1L2', 'L2', 'fcb', 'eta1', 'eta2', 'k0', 'nv'];
    so.forEach(function (k) { if (!(Number(v[k]) > 0)) loi.push('Giá trị ' + k + ' phải lớn hơn 0.'); });
    if (Number(v.L2) >= Number(v.L1L2)) loi.push('Đoạn bẻ móc L2 phải nhỏ hơn tổng chiều dài L1 + L2.');
    if (typeof phanA.vatLieu.Rbt !== 'number') loi.push('Chưa có Rbt của bê tông đài.');
    if (loi.length) return { hopLe: false, loi: loi };

    var d = Number(v.d), n = Number(v.n), nHs = phanA.n;
    var Rbt = phanA.vatLieu.Rbt;
    var cau = phanA.cau;

    // E.1
    var A = dk.A, Abn = dk.Abn;                 // cm²
    var fvb = cb.fvb;                            // ô L91: VLOOKUP(...,4)
    var fba = cb.fyb * 0.8;                      // ô L92: VLOOKUP(...,3)*0.8
    var fcb = Number(v.fcb);
    var gammaB = v.loai === LOAI_TINH ? 1 : 0.9; // ô L100

    // E.2 Chiều dài neo
    var L1L2 = Number(v.L1L2), L2 = Number(v.L2), L1 = L1L2 - L2;
    var eta1 = Number(v.eta1), eta2 = Number(v.eta2);
    var H0 = 25 * d * (0.66 / Rbt) * ((fba / 0.8) / 235);   // ô L105
    var l0anP102 = fba * Abn * 100 / (Math.PI * d * eta1 * eta2 * Rbt);

    // E.3 Chịu kéo
    var Pct = phanA.Pct;
    var Pt = Pct * nHs;
    var Pt1 = Pt / n;
    var k0 = Number(v.k0);
    var Ntb = fba / 10 * Abn / k0;

    // E.4 Chịu tuột
    var Rbond = eta1 * eta2 * Rbt;
    var Ntuot = Math.PI * d / 1000 * L1L2 / 1000 * Rbond * 1e3;

    // E.5 Chịu cắt – Pstc1 = Fh/2 + T/Ht (catalogue khi làm việc), Pstc2 = Fh/2 (không làm việc)
    var Ht = phanA.Ht;
    var FhLv = phanA.catalogue.lv.H, FhKlv = phanA.catalogue.klv.H;
    var T = typeof phanA.catalogue.lv.T === 'number' ? phanA.catalogue.lv.T : 0;
    var Pstc1 = FhLv / 2 + T / Ht;
    var Pstc2 = FhKlv / 2;
    var Pstc = Math.max(Pstc1, Pstc2);
    var Ps = Pstc * nHs;
    var Ps1 = Ps / n;
    var nv = Number(v.nv);
    var Nvb = fvb / 10 * gammaB * A * nv;

    // E.6 Ép mặt
    var tongT = cau.tongChieuDayBanThep;
    var Ncb = fcb * 1000 * gammaB * d / 1000 * tongT / 1000;

    // E.7 Chọc thủng cụm bulong
    var D1 = cau.duongKinhNhomBulong;
    var D2 = D1 + 2 * L1 / 1000;
    var Pxt = Pt;
    var PxtKhong04 = Rbt * 1e3 * L1 / 1000 * Math.PI * (D1 + D2) / 2;
    var PxtGh = PxtKhong04 * HE_SO_CHOC_THUNG;

    var kiemTra = {
      neo: L1L2 >= H0,         // N105: >=
      keo: Pt1 < Ntb,          // N114: <
      tuot: Pt1 < Ntuot,       // N118
      cat: Ps1 < Nvb,          // N130
      epMat: Ps1 < Ncb,        // N135
      chocThung: Pxt < PxtGh   // N141
    };

    // Giá trị Excel sẽ ra nếu dùng T cố định của ô Solieu!E111
    var Pstc1Excel = FhLv / 2 + T_EXCEL_E111 / Ht;
    var lechT = Math.abs(T - T_EXCEL_E111) > 1e-9;

    return {
      hopLe: true, loi: [],
      d: d, loai: v.loai, gammaB: gammaB, capBen: Number(v.capBen), n: n, nHs: nHs,
      A: A, Abn: Abn, fvb: fvb, fba: fba, fcb: fcb,
      L1L2: L1L2, L1: L1, L2: L2, L3: Number(v.L3), eta1: eta1, eta2: eta2, alpha1: Number(v.alpha1), Rbt: Rbt,
      H0: H0,
      Pct: Pct, Pt: Pt, Pt1: Pt1, k0: k0, Ntb: Ntb,
      Rbond: Rbond, Ntuot: Ntuot,
      nhanFh: phanA.nhan.H, nhanT: phanA.nhan.T, FhLv: FhLv, FhKlv: FhKlv, T: T, Ht: Ht,
      Pstc1: Pstc1, Pstc2: Pstc2, Pstc: Pstc, Ps: Ps, Ps1: Ps1, nv: nv, Nvb: Nvb,
      tongT: tongT, Ncb: Ncb,
      D1: D1, D2: D2, Pxt: Pxt, PxtGh: PxtGh,
      kiemTra: kiemTra,
      tatCaOk: Object.keys(kiemTra).every(function (k) { return kiemTra[k]; }),
      ghiChu: {
        chocThung: { heSo: HE_SO_CHOC_THUNG, PxtKhong04: PxtKhong04 },
        neoP102: { l0an: l0anP102, ok: L1L2 >= l0anP102 },
        momenXoan: {
          TExcel: T_EXCEL_E111, TApp: T, lech: lechT,
          Pstc1Excel: Pstc1Excel, PsExcel: Math.max(Pstc1Excel, Pstc2) * nHs / n
        }
      }
    };
  }

  MCT.calc.LOAI_BULONG = [LOAI_TINH, LOAI_THO];
  MCT.calc.tinhPhanE = tinhPhanE;
})(globalThis.MCT = globalThis.MCT || {});
