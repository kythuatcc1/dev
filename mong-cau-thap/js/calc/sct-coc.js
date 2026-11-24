// Sức chịu tải cọc khoan nhồi (sheet "SCT Coc nhoi" nhập + "SCT Coc nhoi FULL" tính) – TCVN 10304:2025
//   1. Thông số cọc: tiết diện, thép, cao độ (đoạn đập đầu cọc = CEILING(40d, 50) mm như bảng NEO CỌC)
//   2. Theo vật liệu: φ(γcb·γ'cb·Rb·Ab + Rsc·As), φ theo độ mảnh λ = l1/r, l1 = l0 + 2/αε,
//      αε = (k·bp/EI)^(1/5), k = Σki·li / Σli (bảng A.1); kéo: Rs·As
//   3. Theo SPT (Phụ lục D): Rc,u = qb·Ab + u·Σ(fc,i·li + fs,i·li); lớp phân tố ≤ 1 m, SPT nội suy theo cao độ
//   4. Thiết kế: Nc,d = min(γ0/γn·Rc,k/γk ; Rc,u/vl), tương tự với kéo
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  // Bảng DATA!H39:L42 – hệ số và cận trên của fc,i (đất dính) và fs,i (đất rời) theo phương pháp thi công
  var PHUONG_PHAP = [
    { ten: 'Cọc Khoan Nhồi', heSoFc: 1.0, chanFc: 100, heSoFs: 3.3, chanFs: 165 },
    { ten: 'Cọc Khoan Thả', heSoFc: 1.0, chanFc: 125, heSoFs: 2.5, chanFs: 125 },
    { ten: 'Cọc-Ống Hạ bằng rung', heSoFc: 0.4, chanFc: 50, heSoFs: 1.5, chanFs: 75 },
    { ten: 'Cọc Đóng/ép', heSoFc: 0.8, chanFc: 100, heSoFs: 2.0, chanFs: 100 }
  ];
  // Ô 'SCT Coc nhoi FULL'!N259: =IF(Cấp="III",1.2,IF(Cấp="II",1.15,1))
  function gammaN(cap) { return cap === 'III' ? 1.2 : cap === 'II' ? 1.15 : 1; }

  function timTheo(ds, k, v) { for (var i = 0; i < ds.length; i++) if (ds[i][k] === v) return ds[i]; return null; }

  // ---------- 1. Thông số cọc ----------
  function thongSoCoc(v) {
    var D = Number(v.D);
    var Ab = Math.PI * D * D / 4, u = Math.PI * D, I = Math.PI * Math.pow(D, 4) / 64;
    var thep = (v.thep || []).map(function (t) { return { n: Number(t.n) || 0, d: Number(t.d) || 0 }; });
    var As = Math.PI / 4 * thep.reduce(function (s, t) { return s + t.n * t.d * t.d; }, 0);   // mm²
    var dMax = Math.max.apply(null, thep.map(function (t) { return t.d; }).concat([0]));
    var doanDap = Math.ceil(40 * dMax / 50) * 50 / 1000;     // 'Bang tra'!J51:J61 = CEILING(40d, 50) mm
    var dayDai = v.dayDai === '' || v.dayDai == null ? null : Number(v.dayDai);
    var doanNgam = Number(v.doanNgam);
    var dauCocThucTe = dayDai + doanNgam + doanDap;          // H53 = H48 + H51 + H52
    var L = Number(v.L);
    var muiCoc = dauCocThucTe - L;                            // H54
    var dayHo = Number(v.dayHo);
    var l0 = (dayDai === null ? dauCocThucTe : dayDai) - dayHo;   // E69
    return {
      D: D, Ab: Ab, u: u, I: I, thep: thep, As: As, mu: As / (Ab * 1e6) * 100,
      L: L, dayDai: dayDai, dayHo: dayHo, dauCocTinhToan: Number(v.dauCocTinhToan), doanNgam: doanNgam,
      doanDap: doanDap, dMax: dMax, dauCocThucTe: dauCocThucTe, muiCoc: muiCoc, l0: l0
    };
  }

  // Đoạn cọc nằm trong từng lớp (công thức I125:K139)
  function doanCocTrongLop(DC, dauCoc, muiCoc) {
    var lop = DC.lop;
    return lop.map(function (l, i) {
      var H = l.dinh, Hn = i + 1 < lop.length ? lop[i + 1].dinh : DC.caoDoDay;
      var dinh = dauCoc < H ? (dauCoc > Hn ? dauCoc : null) : (muiCoc > H ? null : H);
      var day = muiCoc <= H ? (muiCoc > Hn ? muiCoc : (dauCoc > Hn ? Hn : null)) : null;
      if (dinh === null || day === null) return null;
      return { lop: l, dinh: dinh, day: day, l: dinh - day };
    }).filter(Boolean);
  }

  // ---------- 2. Theo vật liệu ----------
  function sctVatLieu(c, DC, v) {
    var bt = timTheo(MCT.data.vatLieu.beTong, 'cap', v.beTong);
    var ct = timTheo(MCT.data.vatLieu.cotThep, 'nhom', v.cotThep);
    if (!bt || !ct) return { hopLe: false, loi: ['Không có vật liệu cọc ' + v.beTong + ' / ' + v.cotThep + '.'] };
    var doan = doanCocTrongLop(DC, c.dauCocTinhToan, c.muiCoc).map(function (d) {
      return Object.assign(d, { k: d.lop.k, kl: d.l * d.lop.k });
    });
    var tongKL = doan.reduce(function (s, d) { return s + d.kl; }, 0);
    var tongL = doan.reduce(function (s, d) { return s + d.l; }, 0);
    var k = tongL > 0 ? tongKL / tongL : NaN;
    var bp = c.D >= 0.8 ? c.D + 1 : 1.5 * c.D + 0.5;
    var E = bt.Eb * 1000;                                   // kPa
    var alphaE = Math.pow(k * bp / (E * c.I), 1 / 5);
    var l1 = c.l0 + 2 / alphaE;
    var r = Math.sqrt(c.I / c.Ab);
    var lambda = l1 / r;
    var phi = lambda <= 28 ? 1 : 1.028 - 0.0000288 * lambda * lambda - 0.0016 * lambda;
    var gCb = Number(v.gammaCb), gCb2 = Number(v.gammaCb2);
    var Rcu = phi * (gCb * gCb2 * bt.Rb * 1e3 * c.Ab + ct.Rsc * c.As / 1e3);
    var Rtu = ct.Rs * c.As / 1e3;
    return {
      hopLe: isFinite(Rcu), loi: isFinite(Rcu) ? [] : ['Không tính được hệ số uốn dọc (kiểm tra đoạn cọc trong đất).'],
      Rb: bt.Rb, Rbt: bt.Rbt, E: bt.Eb, Rs: ct.Rs, Rsc: ct.Rsc, gammaCb: gCb, gammaCb2: gCb2,
      doan: doan, tongKL: tongKL, tongL: tongL, k: k, bp: bp, Ekpa: E,
      alphaE: alphaE, l0: c.l0, l1: l1, r: r, lambda: lambda, phi: phi, Rcu: Rcu, Rtu: Rtu
    };
  }

  // ---------- 3. Theo SPT ----------
  // Hàm VBA NoiSuySPT: ngoài phạm vi lấy giá trị biên
  function noiSuySPT(ds, z) {
    if (!ds.length) return 0;
    if (z >= ds[0].doSau) return ds[0].spt;
    if (z <= ds[ds.length - 1].doSau) return ds[ds.length - 1].spt;
    for (var i = 0; i < ds.length - 1; i++) {
      if (z <= ds[i].doSau && z >= ds[i + 1].doSau) {
        return ds[i].spt + (z - ds[i].doSau) * (ds[i + 1].spt - ds[i].spt) / (ds[i + 1].doSau - ds[i].doSau);
      }
    }
    return ds[ds.length - 1].spt;
  }
  // Như NSXY(Tra_SPT, 100, z): ngoài phạm vi số liệu → null
  function nsxySPT(ds, z) {
    if (!ds.length || z > ds[0].doSau || z < ds[ds.length - 1].doSau) return null;
    return noiSuySPT(ds, z);
  }
  // Hàm VBA TinhSPTfi
  function tinhSPTfi(ds, dinhLop, soLop, day1Lop, heSo, chan) {
    var tong = 0;
    for (var i = 1; i <= soLop; i++) tong += Math.min(heSo * noiSuySPT(ds, dinhLop - (i - 0.5) * day1Lop), chan);
    return tong / soLop;
  }

  function sctSPT(c, DC, v) {
    var pp = timTheo(PHUONG_PHAP, 'ten', v.phuongPhapThiCong) || PHUONG_PHAP[1];
    // Bảng SPT dùng để nội suy: 'SCT Coc nhoi FULL'!D156:E188 (33 dòng đầu của bảng SPT)
    var ds = DC.sptTheoDoSau.slice(0, 33);
    var doan = doanCocTrongLop(DC, c.dauCocTinhToan, c.muiCoc).map(function (d) {
      var laRoi = String(d.lop.loai || '').charAt(0) === 'C';      // LEFT(loại đất,1) = "C": đất rời
      var soLop = Math.ceil(d.l / 1);
      var day1 = d.l / soLop;
      var fs = laRoi ? tinhSPTfi(ds, d.dinh, soLop, day1, pp.heSoFs, pp.chanFs) : null;
      var fc = !laRoi ? tinhSPTfi(ds, d.dinh, soLop, day1, pp.heSoFc * 6.25, pp.chanFc) : null;
      return Object.assign(d, {
        spt: d.lop.spt, laRoi: laRoi, soLopPhanTo: soLop, day1: day1,
        fs: fs, cu: !laRoi ? 6.25 * d.lop.spt : null, fc: fc
      });
    });
    var tongF = doan.reduce(function (s, d) { return s + d.l * ((d.fs || 0) + (d.fc || 0)); }, 0);
    // Đất tại mũi cọc: lớp của đoạn cọc sâu nhất
    var cuoi = doan.length ? doan[doan.length - 1] : null;
    var loaiMui = cuoi ? cuoi.lop.loai : null;
    var NpTren = nsxySPT(DC.sptTheoDoSau, c.muiCoc + c.D);
    var NpDuoi = nsxySPT(DC.sptTheoDoSau, c.muiCoc - c.D);
    var loi = [];
    if (NpTren === null || NpDuoi === null) loi.push('Mũi cọc (±1D) nằm ngoài phạm vi số liệu SPT.');
    var Np = Math.trunc(((NpTren || 0) + (NpDuoi || 0)) / 2);     // INT(AVERAGE(...)) – giá trị dương
    var eta = Number(v.eta) || 1;
    var cuMui = 6.25 * Np;
    var qbSet = String(loaiMui).charAt(0) === 'S' ? Math.min(6 * cuMui * eta, 9000) : 0;
    var qbCat = String(loaiMui).charAt(0) === 'C' ? Math.min(120 * Np * eta, 9000) : 0;
    var qb = Math.max(qbSet, qbCat);
    return {
      hopLe: loi.length === 0, loi: loi, phuongPhap: pp,
      doan: doan, tongF: tongF, loaiMui: loaiMui, NpTren: NpTren, NpDuoi: NpDuoi, Np: Np, eta: eta,
      cuMui: cuMui, qbSet: qbSet, qbCat: qbCat, qb: qb,
      Rcu: qb * c.Ab + c.u * tongF, Rtu: c.u * tongF
    };
  }

  // ---------- 4. Tổng hợp & thiết kế ----------
  /**
   * @param {object} v   số liệu nhập phần cọc (xem js/mac-dinh.js → sct)
   * @param {object} DC  kết quả MCT.calc.tinhDiaChat
   */
  function tinhSCT(v, DC) {
    if (!DC || !DC.hopLe) return { hopLe: false, loi: ['Số liệu địa chất chưa hợp lệ.'] };
    var c = thongSoCoc(v);
    var loi = [];
    if (!(c.D > 0)) loi.push('Đường kính cọc phải lớn hơn 0.');
    if (!(c.L > 0)) loi.push('Chiều dài cọc phải lớn hơn 0.');
    if (!(c.As > 0)) loi.push('Chưa nhập cốt thép cọc.');
    if (c.muiCoc < DC.caoDoDay) loi.push('Mũi cọc sâu hơn đáy lớp đất cuối cùng.');
    if (loi.length) return { hopLe: false, loi: loi, coc: c };

    var VL = sctVatLieu(c, DC, v);
    var SPT = sctSPT(c, DC, v);
    var gk = timTheo(MCT.data.bangTra.gammaK, 'ten', v.phuongPhapGk);
    var g0 = Number(v.gamma0), gn = gammaN(v.capCongTrinh), gK = gk ? gk.gk : 1.5;
    var xetVL = v.xetVatLieu !== false && v.xetVatLieu !== 'No';
    var xetSPT = v.xetSPT !== false && v.xetSPT !== 'No';
    var RcuVl = xetVL ? VL.Rcu : null, RtuVl = xetVL ? VL.Rtu : null;
    var Rck = xetSPT ? SPT.Rcu : null, Rtk = xetSPT ? SPT.Rtu : null;
    function thietKe(Rk, Rvl) {
      var a = Rk !== null ? g0 / gn * Rk / gK : null;
      if (a === null) return Rvl;
      return Rvl === null ? a : Math.min(a, Rvl);
    }
    return {
      hopLe: VL.hopLe && SPT.hopLe, loi: (VL.loi || []).concat(SPT.loi || []),
      coc: c, vatLieu: VL, spt: SPT,
      gamma0: g0, gammaN: gn, capCongTrinh: v.capCongTrinh, gammaK: gK, phuongPhapGk: v.phuongPhapGk,
      xetVatLieu: xetVL, xetSPT: xetSPT,
      RcuVl: RcuVl, Rck: Rck, Ncd: thietKe(Rck, RcuVl),
      RtuVl: RtuVl, Rtk: Rtk, Ntd: thietKe(Rtk, RtuVl)
    };
  }

  MCT.calc.PHUONG_PHAP_THI_CONG = PHUONG_PHAP;
  MCT.calc.thongSoCoc = thongSoCoc;
  MCT.calc.noiSuySPT = noiSuySPT;
  MCT.calc.tinhSCT = tinhSCT;
})(globalThis.MCT = globalThis.MCT || {});
