// Cọc chịu tải ngang (sheet "Kiem tra tai ngang") – TCVN 10304 phụ lục A
//   B. Chuyển vị ngang, góc xoay đầu cọc (A0, B0, C0)
//   C, D, E. Mômen, lực cắt, áp lực ngang dọc thân cọc (bảng A1…D4 theo ze = αε·z)
//   F. Ổn định đất nền quanh cọc: σz ≤ 4η1η2(γ·z·tgφ + ξc)/cosφ
//
// GIỐNG EXCEL – SAI KHÁC ĐÃ GHI CHÚ (ghiChu.*):
//   - σz (cột AC) có chia thêm 3: K/3/αε·ze·(…)
//   - η2 dùng giá trị của sheet mô hình (theo Mqđ của cẩu), không dùng η2 tính tại chỗ (J124)
//   - l0 = 0 trong khi sức chịu tải cọc dùng l0 = 10,4 m; A0, B0, C0 nhập tay
//   - Khả năng chịu cắt thép đai Qsteel = 2·π·d²/4·Rsw/a (đơn vị như Excel)
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }

  // Hàm VBA ApLucDat(DFL, GWL, CaoDo, TLR) – áp lực đất tại cao độ DFL (γ đẩy nổi = γ − 10 dưới mực nước ngầm)
  function apLucDat(DFL, GWL, caoDo, tlr) {
    var P = 0, n = caoDo.length, i;
    if (DFL < GWL) {
      for (i = 0; i < n - 1; i++) {
        if (caoDo[i] > GWL) {
          if (caoDo[i + 1] > GWL) {
            P += tlr[i] * (caoDo[i] - caoDo[i + 1]);
          } else if (caoDo[i + 1] > DFL) {
            P += tlr[i] * (caoDo[i] - GWL) + (tlr[i] - 10) * (GWL - caoDo[i + 1]);
          } else {
            P += tlr[i] * (caoDo[i] - GWL) + (tlr[i] - 10) * (GWL - DFL);
            break;
          }
        } else if (caoDo[i + 1] > DFL) {
          P += (tlr[i] - 10) * (caoDo[i] - caoDo[i + 1]);
        } else {
          P += (tlr[i] - 10) * (caoDo[i] - DFL);
          break;
        }
      }
    } else {
      for (i = 0; i < n - 1; i++) {
        if (caoDo[i + 1] > DFL) { P += tlr[i] * (caoDo[i] - caoDo[i + 1]); } else { P += tlr[i] * (caoDo[i] - DFL); break; }
      }
    }
    return P;
  }

  /**
   * @param {object} v   số liệu nhập tải ngang (js/mac-dinh.js → taiNgang)
   * @param {object} kq  { DC, SCT, A, B } từ tinhTatCa
   */
  function tinhTaiNgang(v, kq) {
    var DC = kq.DC, S = kq.SCT, A = kq.A, B = kq.B;
    var loi = [];
    if (!DC || !DC.hopLe) loi.push('Số liệu địa chất chưa hợp lệ.');
    if (!S || !S.hopLe) loi.push('Sức chịu tải cọc chưa hợp lệ.');
    if (!A || !A.hopLe || !A.ngoaiLuc.lv) loi.push('Mục A (tải trọng cẩu) chưa hợp lệ.');
    if (!B || !B.hopLe) loi.push('Mục B (số cọc) chưa hợp lệ.');
    if (loi.length) return { hopLe: false, loi: loi };

    var HS = MCT.data.heSoTaiNgang.hang;
    var nCoc = B.n, nHs = A.n;
    var H = Math.max(A.ngoaiLuc.lv.H, A.ngoaiLuc.klv.H) / nHs / nCoc;   // J9
    var M = Number(v.M) || 0, l0 = Number(v.l0) || 0;
    var I = S.coc.I, E = S.vatLieu.E, K = S.vatLieu.k, ae = S.vatLieu.alphaE;
    var EI = E * 1e3 * I;
    var A0 = Number(v.A0), B0 = Number(v.B0), C0 = Number(v.C0);

    // B. Chuyển vị đơn vị (đơn vị ×10⁻⁵ như Excel)
    var dHH = A0 / (Math.pow(ae, 3) * EI) * 1e5;
    var dHM = B0 / (ae * ae * EI) * 1e5;
    var dMH = dHM;
    var dMM = C0 / (ae * EI) * 1e5;
    var H0 = H, M0 = M + H * l0;
    var uy = H0 * dHH * 1e-5 + M0 * dHM * 1e-5;          // m
    var upsi = H0 * dMH * 1e-5 + M0 * dMM * 1e-5;        // rad
    var y0 = uy * 100, psi0 = deg(upsi);
    var Delta = (uy + upsi * l0 + H * Math.pow(l0, 3) / (3 * EI) + M * l0 * l0 / (2 * EI)) * 100;
    var psi = deg(upsi + H * l0 * l0 / (2 * EI) + M * l0 / EI);
    var gDelta = Number(v.gioiHanChuyenVi), gPsi = Number(v.gioiHanGocXoay);

    // C, D, E. Nội lực dọc thân cọc
    var y0m = y0 / 100, psi0r = rad(psi0);
    var bang = HS.map(function (h) {
      var ze = h[0], A1 = h[1], B1 = h[2], C1 = h[3], D1 = h[4], A3 = h[5], B3 = h[6], C3 = h[7], D3 = h[8],
        A4 = h[9], B4 = h[10], C4 = h[11], D4 = h[12];
      return {
        ze: ze, z: -ze / ae,
        M: ae * ae * EI * y0m * A3 - ae * EI * psi0r * B3 + M0 * C3 + H0 / ae * D3,
        Q: Math.pow(ae, 3) * EI * y0m * A4 - ae * ae * EI * psi0r * B4 + ae * M0 * C4 + H0 * D4,
        sigma: K / 3 / ae * ze * (y0m * A1 - psi0r / ae * B1 + M0 / (ae * ae * EI) * C1 + H0 / (Math.pow(ae, 3) * EI) * D1),
        sigmaKhong3: K / ae * ze * (y0m * A1 - psi0r / ae * B1 + M0 / (ae * ae * EI) * C1 + H0 / (Math.pow(ae, 3) * EI) * D1)
      };
    });
    // Như MAX(MAX(x), ABS(MIN(x))) và MATCH(..., 0) – lấy vị trí xuất hiện đầu tiên
    function cucDai(k) {
      var mx = Math.max.apply(null, bang.map(function (r) { return r[k]; }));
      var mn = Math.min.apply(null, bang.map(function (r) { return r[k]; }));
      var gt = Math.max(mx, Math.abs(mn));
      var dong = gt === mx ? bang.find(function (r) { return r[k] === mx; }) : bang.find(function (r) { return r[k] === -gt; });
      return { gt: gt, z: dong ? dong.z : null };
    }
    var Mx = cucDai('M'), Qx = cucDai('Q'), Sx = cucDai('sigma'), Sx3 = cucDai('sigmaKhong3');

    // Khả năng chịu cắt
    // J85: Rbt của bê tông cọc × 0,85 × 0,7 ; J91: Rsw của nhóm thép đai
    var bt = MCT.data.vatLieu.beTong.filter(function (b) { return b.cap === S.vatLieu.beTong; })[0];
    var ct = MCT.data.vatLieu.cotThep.filter(function (c) { return c.nhom === v.thepDai; })[0];
    var phiB3 = Number(v.phiB3);
    var Rbt = (bt ? bt.Rbt : S.vatLieu.Rbt) * 0.85 * 0.7;
    var Ab0 = Math.PI * Math.pow(S.coc.D - 0.05, 2) / 4;
    var Qmin = phiB3 * Rbt * 1e3 * Ab0;
    var Rsw = ct ? ct.Rsw : NaN;
    var dDai = Number(v.dDai), aDai = Number(v.aDai);
    var Qsteel = 2 * Math.PI * dDai * dDai / 4 * Rsw / aDai;
    var Qgh = Qmin + Qsteel;

    // F. Ổn định đất nền quanh cọc
    var c = S.coc;
    var L = Math.abs(c.dauCocThucTe - c.L);                           // J119
    var aL = ae * L;
    var zKT = aL <= 2.5 ? -L / 3 : -0.85 / ae;                        // J120
    var nBar = Number(v.nBar);
    var MG = Mx.gt * (A.ngoaiLuc.klv.H / nHs / nCoc) / H;            // G122
    var MQ = Mx.gt * (A.ngoaiLuc.lv.H / nHs / nCoc) / H;             // G123
    var eta2TaiCho = (MG + MQ) / (nBar * MG + MQ);                    // J124
    var Mklv = A.quyDoi.klv.M, Mlv = A.quyDoi.lv.M;
    var eta2 = (Mklv + Mlv) / (nBar * Mklv + Mlv);                    // 'Kiem tra tai ngang (mo hinh)'!G195
    var zCaoDo = zKT + c.dayDai;                                      // D128
    var lopZ = DC.lopTaiCaoDo(zCaoDo);
    var tops = DC.lop.map(function (l) { return l.dinh; }).concat([DC.caoDoDay]);
    var gammas = DC.lop.map(function (l) { return l.gamma; }).concat([0]);
    var gammaTB = apLucDat(zCaoDo, DC.MNN, tops, gammas) / Math.abs(zCaoDo);
    // c, φ trung bình: đoạn giữa đầu cọc tính toán (DauCoc) và cao độ z – công thức O49:T63
    var dau = c.dauCocTinhToan, tong = 0, tongC = 0, tongPhi = 0, loiDoan = false;
    DC.lop.forEach(function (l, i) {
      var Hi = l.dinh, Hn = i + 1 < DC.lop.length ? DC.lop[i + 1].dinh : DC.caoDoDay;
      var O = dau < Hi ? (dau > Hn ? dau : null) : (zCaoDo > Hi ? null : Hi);
      var P = zCaoDo <= Hi ? (zCaoDo > Hn ? zCaoDo : (dau > Hn ? Hn : null)) : null;
      if (O === null) return;
      if (P === null) { loiDoan = true; return; }
      var q = O - P;
      tong += q; tongC += q * l.c; tongPhi += q * l.phi;
    });
    var cI = tong !== 0 && !loiDoan ? tongC / tong : NaN;
    var phiI = tong !== 0 && !loiDoan ? tongPhi / tong : NaN;
    var eta1 = Number(v.eta1), xi = Number(v.xi);
    var sigmaGh = 4 * eta1 * eta2 * (gammaTB * Math.abs(zCaoDo) * Math.tan(rad(phiI)) + xi * cI) / Math.cos(rad(phiI));
    var sigmaGhTaiCho = 4 * eta1 * eta2TaiCho * (gammaTB * Math.abs(zCaoDo) * Math.tan(rad(phiI)) + xi * cI) / Math.cos(rad(phiI));

    var loi2 = [];
    if (loiDoan || !isFinite(cI)) loi2.push('Không xác định được c, φ trung bình quanh cọc (cao độ kiểm tra và đầu cọc tính toán nằm khác lớp – Excel cũng báo lỗi trường hợp này).');

    return {
      hopLe: loi2.length === 0, loi: loi2,
      H: H, M: M, l0: l0, I: I, E: E, K: K, alphaE: ae, A0: A0, B0: B0, C0: C0, nCoc: nCoc, nHs: nHs,
      dHH: dHH, dHM: dHM, dMH: dMH, dMM: dMM, H0: H0, M0: M0, y0: y0, psi0: psi0, Delta: Delta, psi: psi,
      gioiHanChuyenVi: gDelta, gioiHanGocXoay: gPsi, okDelta: Delta <= gDelta, okPsi: psi <= gPsi,
      bang: bang, Mmax: Mx.gt, zM: Mx.z, Qmax: Qx.gt, zQ: Qx.z,
      phiB3: phiB3, Rbt: Rbt, Ab0: Ab0, Qmin: Qmin, thepDai: v.thepDai, dDai: dDai, aDai: aDai, Rsw: Rsw, Qsteel: Qsteel, Qgh: Qgh,
      okQ: Qgh >= Qx.gt,
      sigmaMax: Sx.gt, zSigma: Sx.z,
      L: L, alphaL: aL, zKT: zKT, MG: MG, MQ: MQ, nBar: nBar, eta2TaiCho: eta2TaiCho,
      zCaoDo: zCaoDo, lopZ: lopZ ? lopZ.ten : null, eta1: eta1, eta2: eta2, xi: xi, gammaTB: gammaTB, cI: cI, phiI: phiI,
      sigmaGh: sigmaGh, okOnDinh: Sx.gt <= sigmaGh,
      tatCaOk: Delta <= gDelta && psi <= gPsi && Qgh >= Qx.gt && Sx.gt <= sigmaGh,
      ghiChu: {
        sigmaKhongChia3: Sx3.gt, okKhongChia3: Sx3.gt <= sigmaGh,
        eta2TaiCho: eta2TaiCho, sigmaGhTaiCho: sigmaGhTaiCho, l0SCT: c.l0
      }
    };
  }

  MCT.calc.apLucDat = apLucDat;
  MCT.calc.tinhTaiNgang = tinhTaiNgang;
})(globalThis.MCT = globalThis.MCT || {});
