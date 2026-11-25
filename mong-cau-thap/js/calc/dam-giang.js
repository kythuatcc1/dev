// Kiểm tra dầm giằng cọc theo TCVN 5574:2018 với nội lực ETABS (bao mọi tổ hợp).
// Trục cục bộ thanh ngang của ETABS: 1 dọc dầm, 2 thẳng đứng, 3 nằm ngang → M3, V2: uốn và cắt trong mặt phẳng đứng (tiết diện b×h);
// M2, V3: uốn và cắt trong mặt phẳng ngang (tiết diện h×b). P > 0: kéo. M3 > 0: thớ dưới chịu kéo (quy ước CSI cho dầm).
//   - Uốn: A_s = ξ·R_b·b·h0/R_s, ξ = 1 − √(1 − 2α_m), α_m = M/(R_b·b·h0²) ≤ α_R; lực kéo dọc chia đều cho thép trên và dưới
//     (+N_t/2R_s mỗi lớp – thiên về an toàn, lấy N_t lớn nhất cùng M lớn nhất dù khác tổ hợp).
//   - Uốn ngang M2: thép mặt bên (thép hông + 2 thanh góc), tiết diện rộng h, cao b.
//   - Kéo đúng tâm: N_t ≤ R_s·A_s,tot.   Nén: N_c ≤ φ(R_b·A + R_sc·A_s,tot), φ theo l0/h_min (l0 = nhịp thông thủy).
//   - Cắt (mục 8.1.3.3): Q ≤ 0,3·R_b·b·h0 và Q ≤ min_c(Q_b + Q_sw), Q_b = 1,5·R_bt·b·h0²/c trong [0,5; 2,5]·R_bt·b·h0,
//     Q_sw = 0,75·q_sw·c0 (c0 = min(c, 2h0)), q_sw = R_sw·A_sw/s_w, chỉ kể đai khi q_sw ≥ 0,25·R_bt·b; c chạy từ h0 tới 3h0.
//   - Mômen xoắn T chỉ liệt kê (dầm giằng thường nhỏ), chưa kiểm tra.
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  function thep(t) {
    var n = Number(t && t.n), d = Number(t && t.d);
    return n > 0 && d > 0 ? { n: n, d: d, As: n * Math.PI * d * d / 4 } : { n: 0, d: 0, As: 0 };
  }

  /** Thép chịu uốn cần thiết. M kNm; b, h0 m; R MPa → As mm², α_m, ξ; duTietDien = α_m ≤ α_R. */
  function thepUon(M, b, h0, Rb, Rs, Es) {
    var am = Math.abs(M) * 1e6 / (Rb * b * 1000 * Math.pow(h0 * 1000, 2));
    var xiR = 0.8 / (1 + Rs / Es / 0.0035), aR = xiR * (1 - xiR / 2);
    var du = am <= aR;
    var xi = du ? 1 - Math.sqrt(1 - 2 * am) : NaN;
    return { M: Math.abs(M), am: am, aR: aR, xi: xi, As: du ? xi * Rb * b * h0 * 1e6 / Rs : NaN, duTietDien: du };
  }

  /** Khả năng chịu cắt (kN). Q kN; b, h0 m; Asw mm² (mọi nhánh); sw mm. */
  function chiuCat(Q, b, h0, Rb, Rbt, Rsw, Asw, sw) {
    var bm = b * 1000, hm = h0 * 1000;
    var Qmax = 0.3 * Rb * bm * hm / 1000;
    var qsw = sw > 0 ? Rsw * Asw / sw : 0, coDai = qsw >= 0.25 * Rbt * bm;
    var tot = null;
    for (var i = 0; i <= 40; i++) {
      var c = hm * (1 + 2 * i / 40);
      var Qb = Math.min(Math.max(1.5 * Rbt * bm * hm * hm / c, 0.5 * Rbt * bm * hm), 2.5 * Rbt * bm * hm) / 1000;
      var Qsw = coDai ? 0.75 * qsw * Math.min(c, 2 * hm) / 1000 : 0;
      if (!tot || Qb + Qsw < tot.Qgh) tot = { c: c / 1000, Qb: Qb, Qsw: Qsw, Qgh: Qb + Qsw };
    }
    var Qa = Math.abs(Q);
    return Object.assign(tot, { Q: Qa, Qmax: Qmax, qsw: qsw, coDai: coDai, ok: Qa <= tot.Qgh && Qa <= Qmax, tiSo: Math.max(Qa / tot.Qgh, Qa / Qmax) });
  }

  /** Hệ số uốn dọc φ theo l0/h (TCVN 5574:2018, cấu kiện bê tông nặng): 6 → 0,92; 10 → 0,9; 15 → 0,83; 20 → 0,7. */
  function heSoUonDoc(lamda) {
    var bang = [[6, 0.92], [10, 0.9], [15, 0.83], [20, 0.7]];
    if (lamda <= 6) return 0.92;
    for (var i = 1; i < bang.length; i++) {
      if (lamda <= bang[i][0]) return bang[i - 1][1] + (lamda - bang[i - 1][0]) * (bang[i][1] - bang[i - 1][1]) / (bang[i][0] - bang[i - 1][0]);
    }
    return 0.7;
  }

  /**
   * @param {object} d    số liệu dầm (s.damGiang.ds[i])
   * @param {object} r    nội lực ETABS của dầm (tomTatEtabs → dam[i]: { ten, bao, tram })
   * @param {number} Dcoc đường kính cọc (m) – nhịp thông thủy = L − D
   */
  function kiemTraDamGiang(d, r, Dcoc) {
    var VL = MCT.data.vatLieu;
    var bt = VL.beTong.filter(function (x) { return x.cap === d.beTong; })[0];
    var ct = VL.cotThep.filter(function (x) { return x.nhom === d.cotThep; })[0];
    var ctDai = VL.cotThep.filter(function (x) { return x.nhom === (d.cotThepDai || d.cotThep); })[0];
    if (!bt || !ct || !ctDai) return { ten: r.ten, hopLe: false, loi: ['Dầm ' + r.ten + ': thiếu cấp bê tông hoặc nhóm cốt thép.'] };
    var b = Number(d.b), h = Number(d.h), a = Number(d.a) / 100;
    var h0 = h - a, h0n = b - a;
    var tren = thep(d.tren), duoi = thep(d.duoi), hong = thep(d.hong);
    var goc = (tren.n >= 2 ? Math.PI * tren.d * tren.d / 4 : 0) + (duoi.n >= 2 ? Math.PI * duoi.d * duoi.d / 4 : 0);
    var AsNgang = hong.As + goc;                          // thép một mặt bên khi uốn ngang
    var AsTot = tren.As + duoi.As + 2 * hong.As;
    var B = r.bao, L = r.tram.length ? r.tram[r.tram.length - 1].x : 0, l0 = Math.max(L - Dcoc, 0);
    var Nt = Math.max(B.Pmax ? B.Pmax.gt : 0, 0), Nc = Math.max(B.Pmin ? -B.Pmin.gt : 0, 0);
    var Rb = bt.Rb, Rbt = bt.Rbt, Rs = ct.Rs, Rsc = ct.Rsc, Es = ct.Es, Rsw = ctDai.Rsw;
    var them = Nt * 1000 / (2 * Rs);                      // mm² mỗi lớp do lực kéo dọc

    function lop(M, coChon, h0x, bx, tenLop) {
      var u = thepUon(M, bx, h0x, Rb, Rs, Es);
      var can = u.duTietDien ? u.As + them : NaN;
      return Object.assign(u, { ten: tenLop, AsKeo: them, AsCan: can, AsChon: coChon, ok: u.duTietDien && coChon >= can - 1e-9,
        tiSo: u.duTietDien ? (coChon > 0 ? can / coChon : Infinity) : Infinity });
    }
    var M3duong = Math.max(B.M3max ? B.M3max.gt : 0, 0), M3am = Math.max(B.M3min ? -B.M3min.gt : 0, 0);
    var M2 = Math.max(Math.abs(B.M2max ? B.M2max.gt : 0), Math.abs(B.M2min ? B.M2min.gt : 0));
    var uon = {
      duoi: lop(M3duong, duoi.As, h0, b, 'Thép dưới (M3 dương)'),
      tren: lop(M3am, tren.As, h0, b, 'Thép trên (M3 âm)'),
      ngang: (function () {     // uốn ngang: không cộng thêm phần lực kéo (đã chia cho thép trên/dưới)
        var u = thepUon(M2, h, h0n, Rb, Rs, Es);
        return Object.assign(u, { ten: 'Thép mặt bên (M2)', AsKeo: 0, AsCan: u.As, AsChon: AsNgang, ok: u.duTietDien && AsNgang >= u.As - 1e-9,
          tiSo: u.duTietDien ? (AsNgang > 0 ? u.As / AsNgang : Infinity) : Infinity });
      })()
    };
    var Nkeo = Rs * AsTot / 1000;
    var lamda = l0 / Math.min(b, h), phi = heSoUonDoc(lamda);
    var Nnen = phi * (Rb * b * h * 1e6 + Rsc * AsTot) / 1000;
    var keo = { N: Nt, Ngh: Nkeo, ok: Nt <= Nkeo, tiSo: Nkeo > 0 ? Nt / Nkeo : Infinity };
    var nen = { N: Nc, lamda: lamda, phi: phi, l0: l0, Ngh: Nnen, ok: Nc <= Nnen, tiSo: Nc / Nnen, manhLon: lamda > 20 };
    var dai = thep({ n: Number(d.dai && d.dai.nhanh) || 2, d: d.dai && d.dai.d });
    var dai2 = thep({ n: 2, d: d.dai && d.dai.d });       // nhánh nằm ngang của đai kín khi cắt ngang
    var sw = Number(d.dai && d.dai.s);
    var V2 = Math.max(Math.abs(B.V2max ? B.V2max.gt : 0), Math.abs(B.V2min ? B.V2min.gt : 0));
    var V3 = Math.max(Math.abs(B.V3max ? B.V3max.gt : 0), Math.abs(B.V3min ? B.V3min.gt : 0));
    var cat = { dung: chiuCat(V2, b, h0, Rb, Rbt, Rsw, dai.As, sw), ngang: chiuCat(V3, h, h0n, Rb, Rbt, Rsw, dai2.As, sw) };
    var T = Math.max(Math.abs(B.Tmax ? B.Tmax.gt : 0), Math.abs(B.Tmin ? B.Tmin.gt : 0));
    var dsKT = [uon.duoi, uon.tren, uon.ngang, keo, nen, cat.dung, cat.ngang];
    var tiSo = Math.max.apply(null, dsKT.map(function (k) { return k.tiSo; }));
    return {
      ten: r.ten, hopLe: true, loi: [],
      tuCoc: d.tuCoc, denCoc: d.denCoc, z: Number(d.z), b: b, h: h, a: a, h0: h0, h0n: h0n, L: L, l0: l0,
      beTong: d.beTong, cotThep: d.cotThep, cotThepDai: d.cotThepDai || d.cotThep,
      Rb: Rb, Rbt: Rbt, Rs: Rs, Rsc: Rsc, Rsw: Rsw, Es: Es,
      thep: { tren: tren, duoi: duoi, hong: hong, AsNgang: AsNgang, AsTot: AsTot, muy: AsTot / (b * h * 1e6) * 100, dai: { d: dai.d, s: sw, nhanh: dai.n } },
      bao: B, M3duong: M3duong, M3am: M3am, M2: M2, V2: V2, V3: V3, T: T,
      uon: uon, keo: keo, nen: nen, cat: cat,
      tiSo: tiSo, ok: dsKT.every(function (k) { return k.ok; })
    };
  }

  MCT.calc.kiemTraDamGiang = kiemTraDamGiang;
  MCT.calc.thepUonChuNhat = thepUon;
  MCT.calc.chiuCatTCVN = chiuCat;
  MCT.calc.heSoUonDoc = heSoUonDoc;
})(globalThis.MCT = globalThis.MCT || {});
