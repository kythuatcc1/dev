// Kết quả ETABS (bước 4): dữ liệu gửi lệnh "phan-tich" và xử lý nội lực cầu nối trả về
//   Cọc   : bao lực dọc P, mômen M = √(M2² + M3²), lực cắt V = √(V2² + V3²) theo chiều sâu; lực tại đầu cọc (đáy đài)
//           so với Qa, Qa' (như mục B); cặp (N = −P, M) mọi mặt cắt so với biểu đồ tương tác của form CC1;
//           lực cắt lớn nhất so với khả năng chịu cắt cọc của phần tải ngang.
//   Đài   : mômen, lực cắt trên mặt cắt suốt bề rộng đài: ∫M11 dy, ∫V13 dy trên mỗi đường lưới x = const (thép theo X)
//           và ∫M22 dx, ∫V23 dx trên mỗi đường y = const (thép theo Y). Quy ước CSI: M > 0 → thớ dưới chịu kéo.
//           Thép tính như mục D: αm = M/(Rb·b·h0²), ξ = 1 − √(1 − 2αm), As = ξ·Rb·b·h0/Rs; b = bề rộng mặt cắt;
//           lực cắt so với Qb = 0,5·Rbt·b·h0 (TCVN 5574:2018, như file PDF tham khảo).
//   Chuyển vị: tâm đài và đầu cọc, Δ = √(U1² + U2²), ψ = √(R1² + R2²) so với giới hạn của phần tải ngang.
// Đơn vị: kN, m (chuyển vị trả mm, góc xoay độ).
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  /** Dữ liệu gửi cầu nối cho lệnh "phan-tich". */
  function duLieuPhanTich(m, t) {
    var diem = {};
    m.diem.forEach(function (d) { diem[d.ten] = [d.x, d.y, d.z]; });
    return {
      coc: m.coc.map(function (c) { return { ten: c.ten, thanh: c.thanh }; }),
      toHop: t.toHop.filter(function (c) { return c.loai === 0; }).map(function (c) { return c.ten; }),
      diem: diem,
      vo: m.vo.map(function (v) { return v.ten; }),
      nutChuyenVi: [m.nutTai].concat(m.coc.map(function (c) { return c.nutDau; }))
    };
  }

  function hon(a, b) { return a === null || b > a; }

  /** M giới hạn tại lực dọc N trên biểu đồ tương tác (giống tuong-tac.js). */
  function taoMgh(TT) {
    var bao = [{ M: 0, N: TT.NTrend }].concat(TT.diem);
    return function (N) {
      if (N < bao[0].N || N > bao[bao.length - 1].N) return 0;
      for (var k = 0; k < bao.length - 1; k++) {
        var A = bao[k], C = bao[k + 1];
        if (N >= Math.min(A.N, C.N) && N <= Math.max(A.N, C.N)) {
          return C.N === A.N ? Math.max(A.M, C.M) : A.M + (N - A.N) * (C.M - A.M) / (C.N - A.N);
        }
      }
      return 0;
    };
  }

  function thepCanThiet(M, b, h0, Rb, Rs) {
    var Mabs = Math.abs(M), am = Mabs / (Rb * 1000 * b * h0 * h0);
    var duTietDien = am < 0.5;
    var xi = duTietDien ? 1 - Math.sqrt(1 - 2 * am) : NaN;
    var As = duTietDien ? xi * Rb * b * h0 / Rs * 1e6 : NaN;   // mm²
    return { M: Mabs, b: b, h0: h0, alpha: am, xi: xi, As: As, AsMet: As / b, duTietDien: duTietDien };
  }

  function thepChon(t) {
    var d = Number(t && t.d), s = Number(t && t.s);
    return d > 0 && s > 0 ? { d: d, s: s, AsMet: Math.PI * d * d / 4 * 1000 / s } : null;
  }

  /**
   * @param {object} raw ketQua cầu nối trả về: { toHop[], coc[{ten, dong[[z, ci, P, V2, V3, T, M2, M3]]}],
   *                     chuyenVi{nut[], dong[[i, ci, U1, U2, U3, R1, R2, R3]]}, dai{nut[[x, y]], dong[[ni, ci, M11, M22, M12, V13, V23]]} }
   */
  function ketQuaEtabs(raw, m, t, s, kq) {
    var loi = [];
    if (!raw || !raw.coc || !raw.toHop) loi.push('Chưa có kết quả phân tích ETABS.');
    if (!m || !m.hopLe) loi.push('Mô hình ETABS chưa hợp lệ.');
    if (!t || !t.hopLe) loi.push('Tải trọng ETABS chưa hợp lệ.');
    if (loi.length) return { hopLe: false, loi: loi };
    var A = kq.A, TT = kq.TT, TN = kq.TN;
    var thongTinToHop = {};
    t.toHop.forEach(function (c) { thongTinToHop[c.ten] = c; });
    var toHop = raw.toHop.map(function (ten) { return thongTinToHop[ten] || { ten: ten }; });
    function tenTH(ci) { return toHop[ci] ? toHop[ci].ten : String(ci); }
    var zDau = m.thongSo.zDay;
    var Mgh = TT && TT.hopLe ? taoMgh(TT) : null;

    // ---------------- Cọc ----------------
    var tongNen = null, tongKeo = null, MmaxAll = null, VmaxAll = null, tuongTacXau = null, diemTT = [];
    var coc = raw.coc.map(function (c) {
      var tram = {};   // z → bao
      var dauNen = null, dauKeo = null, Mmax = null, Vmax = null;
      c.dong.forEach(function (r) {
        var z = r[0], ci = r[1], P = r[2], V = Math.sqrt(r[3] * r[3] + r[4] * r[4]), M = Math.sqrt(r[6] * r[6] + r[7] * r[7]);
        var kz = z.toFixed(3);
        var b = tram[kz] || (tram[kz] = { z: z, Pmin: Infinity, Pmax: -Infinity, M: 0, V: 0, cap: [] });
        if (P < b.Pmin) b.Pmin = P;
        if (P > b.Pmax) b.Pmax = P;
        if (M > b.M) b.M = M;
        if (V > b.V) b.V = V;
        b.cap.push([-P, M, ci]);
        if (Math.abs(z - zDau) < 1e-3) {
          if (dauNen === null || -P > dauNen.gt) dauNen = { gt: -P, toHop: tenTH(ci) };
          if (dauKeo === null || P > dauKeo.gt) dauKeo = { gt: P, toHop: tenTH(ci) };
        }
        if (Mmax === null || M > Mmax.gt) Mmax = { gt: M, z: z, toHop: tenTH(ci) };
        if (Vmax === null || V > Vmax.gt) Vmax = { gt: V, z: z, toHop: tenTH(ci) };
      });
      var doc = Object.keys(tram).map(function (k) { return tram[k]; }).sort(function (a, b) { return b.z - a.z; });
      // tương tác N–M: kiểm tra mọi cặp; giữ cặp đại diện để vẽ
      doc.forEach(function (b) {
        var nMin = null, nMax = null, mMax = null;
        b.cap.forEach(function (p) {
          if (Mgh) {
            var gh = Mgh(p[0]), tiSo = gh > 0 ? p[1] / gh : Infinity;
            if (tuongTacXau === null || tiSo > tuongTacXau.tiSo) tuongTacXau = { tiSo: tiSo, N: p[0], M: p[1], Mgh: gh, coc: c.ten, z: b.z, toHop: tenTH(p[2]) };
          }
          if (nMin === null || p[0] < nMin[0]) nMin = p;
          if (nMax === null || p[0] > nMax[0]) nMax = p;
          if (mMax === null || p[1] > mMax[1]) mMax = p;
        });
        [nMin, nMax, mMax].forEach(function (p) { if (p) diemTT.push({ N: p[0], M: p[1] }); });
        delete b.cap;
      });
      if (dauNen && hon(tongNen && tongNen.gt, dauNen.gt)) tongNen = { gt: dauNen.gt, toHop: dauNen.toHop, coc: c.ten };
      if (dauKeo && hon(tongKeo && tongKeo.gt, dauKeo.gt)) tongKeo = { gt: dauKeo.gt, toHop: dauKeo.toHop, coc: c.ten };
      if (Mmax && hon(MmaxAll && MmaxAll.gt, Mmax.gt)) MmaxAll = Object.assign({ coc: c.ten }, Mmax);
      if (Vmax && hon(VmaxAll && VmaxAll.gt, Vmax.gt)) VmaxAll = Object.assign({ coc: c.ten }, Vmax);
      return { ten: c.ten, dauNen: dauNen, dauKeo: dauKeo, Mmax: Mmax, Vmax: Vmax, doc: doc };
    });
    var Qa = kq.B.Qa, QaKeo = Math.abs(kq.B.QaKeo);   // như mục B (tự tính từ sức chịu tải cọc hoặc nhập tay)
    var Qgh = TN && TN.hopLe ? TN.Qgh : null;
    var cocKiemTra = {
      Pnen: tongNen, Pkeo: tongKeo && tongKeo.gt > 0 ? tongKeo : null, Qa: Qa, QaKeo: QaKeo,
      okNen: tongNen ? tongNen.gt <= Qa : null,
      okKeo: tongKeo ? tongKeo.gt <= QaKeo : null,
      Mmax: MmaxAll, Vmax: VmaxAll, Qgh: Qgh, okCat: Qgh !== null && VmaxAll ? VmaxAll.gt <= Qgh : null,
      tuongTac: tuongTacXau, okTuongTac: tuongTacXau ? tuongTacXau.tiSo <= 1 : null
    };

    // ---------------- Chuyển vị ----------------
    var tn = s.taiNgang || {};
    var gDelta = Number(tn.gioiHanChuyenVi) * 10, gPsi = Number(tn.gioiHanGocXoay);   // mm, độ
    var cv = (raw.chuyenVi && raw.chuyenVi.nut || []).map(function (ten, i) {
      return { ten: ten, nhan: i === 0 ? 'Tâm đài' : 'Đầu cọc ' + m.coc[i - 1].ten, Delta: null, psi: null };
    });
    (raw.chuyenVi && raw.chuyenVi.dong || []).forEach(function (r) {
      var n = cv[r[0]];
      if (!n) return;
      var D = Math.sqrt(r[2] * r[2] + r[3] * r[3]) * 1000, p = Math.sqrt(r[5] * r[5] + r[6] * r[6]) * 180 / Math.PI;
      if (n.Delta === null || D > n.Delta.gt) n.Delta = { gt: D, toHop: tenTH(r[1]), U1: r[2] * 1000, U2: r[3] * 1000 };
      if (n.psi === null || p > n.psi.gt) n.psi = { gt: p, toHop: tenTH(r[1]), rad: p * Math.PI / 180 };
    });
    var DeltaMax = null, psiMax = null;
    cv.forEach(function (n) {
      if (n.Delta && hon(DeltaMax && DeltaMax.gt, n.Delta.gt)) DeltaMax = Object.assign({ nut: n.nhan }, n.Delta);
      if (n.psi && hon(psiMax && psiMax.gt, n.psi.gt)) psiMax = Object.assign({ nut: n.nhan }, n.psi);
    });
    var chuyenVi = {
      nut: cv, DeltaMax: DeltaMax, psiMax: psiMax, gioiHanDelta: gDelta, gioiHanPsi: gPsi,
      okDelta: DeltaMax ? DeltaMax.gt <= gDelta : null, okPsi: psiMax ? psiMax.gt <= gPsi : null
    };

    // ---------------- Đài: mặt cắt suốt bề rộng ----------------
    var nut = (raw.dai && raw.dai.nut) || [];
    var giaTri = {};   // ni → ci → [M11, M22, M12, V13, V23]
    ((raw.dai && raw.dai.dong) || []).forEach(function (r) { (giaTri[r[0]] || (giaTri[r[0]] = {}))[r[1]] = r.slice(2); });
    function catTheo(truc, cs) {   // truc 0: đường x = const (∫ theo y), 1: y = const (∫ theo x)
      var duong = {};
      nut.forEach(function (p, ni) {
        var k = p[truc].toFixed(4);
        (duong[k] || (duong[k] = [])).push({ ni: ni, t: p[1 - truc] });
      });
      var cat = [];
      Object.keys(duong).forEach(function (k) {
        var ds = duong[k].sort(function (a, b) { return a.t - b.t; });
        if (ds.length < 2) return;
        var dong = { viTri: Number(k), b: ds[ds.length - 1].t - ds[0].t, Mmax: null, Mmin: null, Vmax: null };
        raw.toHop.forEach(function (ten, ci) {
          var M = 0, V = 0, du = true;
          for (var i = 0; i < ds.length - 1; i++) {
            var a = giaTri[ds[i].ni] && giaTri[ds[i].ni][ci], c = giaTri[ds[i + 1].ni] && giaTri[ds[i + 1].ni][ci];
            if (!a || !c) { du = false; break; }
            var dt = ds[i + 1].t - ds[i].t;
            M += (a[cs.M] + c[cs.M]) / 2 * dt;
            V += (a[cs.V] + c[cs.V]) / 2 * dt;
          }
          if (!du) return;
          if (dong.Mmax === null || M > dong.Mmax.gt) dong.Mmax = { gt: M, toHop: tenTH(ci) };
          if (dong.Mmin === null || M < dong.Mmin.gt) dong.Mmin = { gt: M, toHop: tenTH(ci) };
          if (dong.Vmax === null || Math.abs(V) > dong.Vmax.gt) dong.Vmax = { gt: Math.abs(V), toHop: tenTH(ci) };
        });
        if (dong.Mmax) cat.push(dong);
      });
      cat.sort(function (a, b) { return a.viTri - b.viTri; });
      var duong_ = null, am = null, vmax = null;
      cat.forEach(function (d) {
        if (d.Mmax.gt > 0 && hon(duong_ && duong_.gt, d.Mmax.gt)) duong_ = { gt: d.Mmax.gt, viTri: d.viTri, b: d.b, toHop: d.Mmax.toHop };
        if (d.Mmin.gt < 0 && hon(am && -am.gt, -d.Mmin.gt)) am = { gt: d.Mmin.gt, viTri: d.viTri, b: d.b, toHop: d.Mmin.toHop };
        if (hon(vmax && vmax.gt, d.Vmax.gt)) vmax = { gt: d.Vmax.gt, viTri: d.viTri, b: d.b, toHop: d.Vmax.toHop };
      });
      return { cat: cat, Mduong: duong_, Mam: am, Vmax: vmax };
    }
    var datX = catTheo(0, { M: 0, V: 3 }), datY = catTheo(1, { M: 1, V: 4 });
    var vl = A.vatLieu, H = A.dai.H, a = vl.a_cm / 100, h0 = H - a;
    var Rb = vl.Rb, Rbt = vl.Rbt, Rs = vl.Rs;
    function lop(dl, khoaChon, ten) {
      var chon = thepChon(s.thep && s.thep[khoaChon]);
      if (!dl) return { ten: ten, M: 0, can: null, chon: chon, ok: true };
      var can = thepCanThiet(dl.gt, dl.b, h0, Rb, Rs);
      return { ten: ten, M: dl.gt, viTri: dl.viTri, toHop: dl.toHop, can: can, chon: chon,
        ok: can.duTietDien && chon ? chon.AsMet >= can.AsMet : false };
    }
    function cat(dl) {
      if (!dl) return null;
      var Qb = 0.5 * Rbt * 1000 * dl.b * h0;
      return { V: dl.gt, viTri: dl.viTri, b: dl.b, toHop: dl.toHop, Qb: Qb, ok: dl.gt <= Qb };
    }
    var dai = {
      h0: h0, a: a, Rb: Rb, Rbt: Rbt, Rs: Rs,
      X: Object.assign(datX, { duoi: lop(datX.Mduong, 'duoiX', 'Lớp dưới theo X'), tren: lop(datX.Mam, 'trenX', 'Lớp trên theo X'), catKT: cat(datX.Vmax) }),
      Y: Object.assign(datY, { duoi: lop(datY.Mduong, 'duoiY', 'Lớp dưới theo Y'), tren: lop(datY.Mam, 'trenY', 'Lớp trên theo Y'), catKT: cat(datY.Vmax) })
    };
    dai.ok = [dai.X.duoi, dai.X.tren, dai.Y.duoi, dai.Y.tren].every(function (l) { return l.ok; }) &&
      [dai.X.catKT, dai.Y.catKT].every(function (c) { return !c || c.ok; });

    var ketLuan = [
      { ten: 'Cọc chịu nén (đầu cọc)', ok: cocKiemTra.okNen },
      { ten: 'Cọc chịu kéo (đầu cọc)', ok: cocKiemTra.Pkeo ? cocKiemTra.okKeo : true },
      { ten: 'Biểu đồ tương tác N–M', ok: cocKiemTra.okTuongTac },
      { ten: 'Cọc chịu cắt', ok: cocKiemTra.okCat },
      { ten: 'Chuyển vị ngang', ok: chuyenVi.okDelta },
      { ten: 'Góc xoay', ok: chuyenVi.okPsi },
      { ten: 'Thép đài', ok: [dai.X.duoi, dai.X.tren, dai.Y.duoi, dai.Y.tren].every(function (l) { return l.ok; }) },
      { ten: 'Đài chịu cắt', ok: [dai.X.catKT, dai.Y.catKT].every(function (c) { return !c || c.ok; }) }
    ];
    return {
      hopLe: true, loi: [],
      toHop: toHop, coc: coc, cocKiemTra: cocKiemTra, diemTuongTac: diemTT,
      chuyenVi: chuyenVi, dai: dai, ketLuan: ketLuan,
      tatCaOk: ketLuan.every(function (k) { return k.ok !== false; })
    };
  }

  MCT.calc.duLieuPhanTich = duLieuPhanTich;
  MCT.calc.ketQuaEtabs = ketQuaEtabs;
})(globalThis.MCT = globalThis.MCT || {});
