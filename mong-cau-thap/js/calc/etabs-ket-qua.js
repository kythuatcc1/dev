// Kết quả ETABS (bước 4): dữ liệu gửi lệnh "phan-tich" và xử lý nội lực cầu nối trả về
//   Cọc   : bao lực dọc P, mômen M = √(M2² + M3²), lực cắt V = √(V2² + V3²) theo chiều sâu; lực dọc lớn nhất và nhỏ nhất
//           trên toàn thân cọc (đáy đài → mũi cọc, mọi tổ hợp) so với Qa, Qa' (như mục B); cặp (N = −P, M) mọi mặt cắt so với biểu đồ tương tác của form CC1;
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
      dam: (m.dam || []).map(function (d) { return { ten: d.ten, thanh: [d.ten] }; }),
      toHop: t.toHop.filter(function (c) { return c.loai === 0; }).map(function (c) { return c.ten; }),
      diem: diem,
      vo: m.vo.map(function (v) { return v.ten; }),
      nutChuyenVi: [m.nutTamDai || m.nutTai].concat(m.coc.map(function (c) { return c.nutDau; }))
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

  // Phiên bản cách tóm tắt kết quả (đổi khi cách lấy nội lực thay đổi; kết quả lưu theo phiên bản khác phải chạy lại phân tích)
  //   2: bỏ đoạn cọc nằm trong đài khỏi nội lực cọc
  //   3: thêm bao từng thành phần nội lực cọc (P, V2, V3, M2, M3), bao nội lực tại nút đài, nội lực dầm giằng (vẽ hình thuyết minh)
  var PHIEN_BAN = 3;

  // Bao [min, max] từng thành phần; cot: tên → chỉ số cột trong dòng kết quả
  function baoThanhPhan(dsDong, khoaTram, cot) {
    var tram = {};
    dsDong.forEach(function (r) {
      var k = khoaTram(r);
      if (k === null) return;
      var t = tram[k.khoa] || (tram[k.khoa] = Object.assign({}, k.gt));
      Object.keys(cot).forEach(function (ten) {
        var v = r[cot[ten]], b = t[ten] || (t[ten] = [Infinity, -Infinity]);
        if (v < b[0]) b[0] = v;
        if (v > b[1]) b[1] = v;
      });
    });
    return Object.keys(tram).map(function (k) {
      var t = tram[k];
      Object.keys(cot).forEach(function (ten) { t[ten] = [tron(t[ten][0], 2), tron(t[ten][1], 2)]; });
      return t;
    });
  }

  function thepCanThiet(M, b, h0, Rb, Rs) {
    var Mabs = Math.abs(M), am = Mabs / (Rb * 1000 * b * h0 * h0);
    var duTietDien = am < 0.5;
    var xi = duTietDien ? 1 - Math.sqrt(1 - 2 * am) : NaN;
    var As = duTietDien ? xi * Rb * b * h0 / Rs * 1e6 : NaN;   // mm²
    return { M: Mabs, b: b, h0: h0, alpha: am, xi: xi, As: As, AsMet: As / b, duTietDien: duTietDien };
  }

  /**
   * Kiểm tra nứt tiết diện chữ nhật chịu uốn (TCVN 5574:2018 mục 8.2.2), đơn vị đầu vào: M kNm; b, H, a m; As mm²; ds mm; MPa.
   *  - Hình thành vết nứt: M_crc = γ·W_red·R_bt,ser, γ = 1,3 (tiết diện chữ nhật); W_red = I_red / y_t, tiết diện quy đổi
   *    (α = E_s/E_b, kể cả thép chịu nén).
   *  - M > M_crc: bề rộng vết nứt ngắn hạn a_crc = φ1·φ2·φ3·ψs·σs/E_s·l_s ≤ [a_crc] = 0,4 mm (không hạn chế thấm);
   *    φ1 = 1,0 (ngắn hạn), φ2 = 0,5 (thép có gờ), φ3 = 1,0 (uốn); σs = M/(z_s·A_s), cho phép z_s = 0,8h0;
   *    ψs = 1 − 0,8·M_crc/M; l_s = 0,5·A_bt/A_s·d_s trong [10d_s; 40d_s] và [100; 400] mm; A_bt = b·y_t, 2a ≤ y_t ≤ 0,5h.
   */
  function kiemTraNut(M, b, H, a, AsKeo, AsNen, ds, bt, Es) {
    var Mabs = Math.abs(M), bm = b * 1000, h = H * 1000, am = a * 1000, h0 = h - am, alpha = Es / bt.Eb;
    var Ared = bm * h + alpha * (AsKeo + AsNen);
    var yt = (bm * h * h / 2 + alpha * (AsKeo * am + AsNen * (h - am))) / Ared;   // từ thớ chịu kéo tới trọng tâm
    var Ired = bm * Math.pow(h, 3) / 12 + bm * h * Math.pow(h / 2 - yt, 2) + alpha * AsKeo * Math.pow(yt - am, 2) +
      alpha * AsNen * Math.pow(h - am - yt, 2);
    var Wred = Ired / yt, gamma = 1.3;
    var Mcrc = gamma * Wred * bt.Rbt_ser / 1e6;
    var kq = {
      M: Mabs, b: b, h0: h0 / 1000, As: AsKeo, AsNen: AsNen, ds: ds, alpha: alpha, gamma: gamma, Rbt_ser: bt.Rbt_ser,
      Ared: Ared / 1e6, Ired: Ired / 1e12, yt: yt, Wred: Wred / 1e9, Mcrc: Mcrc, gioiHan: 0.4
    };
    if (Mabs <= Mcrc) return Object.assign(kq, { nut: false, ok: true });
    var zs = 0.8 * h0, sigma = Mabs * 1e6 / (zs * AsKeo), psi = 1 - 0.8 * Mcrc / Mabs;
    var ytb = Math.min(Math.max(yt, 2 * am), 0.5 * h), Abt = bm * ytb;
    var lsTinh = 0.5 * Abt / AsKeo * ds, lsMin = Math.max(10 * ds, 100), lsMax = Math.min(40 * ds, 400);
    var ls = Math.min(Math.max(lsTinh, lsMin), lsMax);
    var phi1 = 1.0, phi2 = 0.5, phi3 = 1.0;
    var acrc = phi1 * phi2 * phi3 * psi * sigma / Es * ls;
    return Object.assign(kq, {
      nut: true, zs: zs, sigma: sigma, psi: psi, ytb: ytb, Abt: Abt / 1e6, lsTinh: lsTinh, ls: ls,
      phi1: phi1, phi2: phi2, phi3: phi3, Es: Es, acrc: acrc, ok: acrc <= kq.gioiHan
    });
  }

  function thepChon(t) {
    var d = Number(t && t.d), s = Number(t && t.s);
    return d > 0 && s > 0 ? { d: d, s: s, AsMet: Math.PI * d * d / 4 * 1000 / s } : null;
  }

  function tron(v, so) { var k = Math.pow(10, so); return Math.round(v * k) / k; }

  /**
   * Giai đoạn 1 – tóm tắt nội lực (chỉ phụ thuộc mô hình; gọn để lưu lại trên máy).
   * @param {object} raw ketQua cầu nối trả về: { toHop[], coc[{ten, dong[[z, ci, P, V2, V3, T, M2, M3]]}],
   *                     chuyenVi{nut[], dong[[i, ci, U1, U2, U3, R1, R2, R3]]}, dai{nut[[x, y]], dong[[ni, ci, M11, M22, M12, V13, V23]]} }
   */
  function tomTatEtabs(raw, m, t) {
    var loi = [];
    if (!raw || !raw.coc || !raw.toHop) loi.push('Chưa có kết quả phân tích ETABS.');
    if (!m || !m.hopLe) loi.push('Mô hình ETABS chưa hợp lệ.');
    if (!t || !t.hopLe) loi.push('Tải trọng ETABS chưa hợp lệ.');
    if (loi.length) return { hopLe: false, loi: loi };
    function tenTH(ci) { return raw.toHop[ci] !== undefined ? raw.toHop[ci] : String(ci); }
    var zDau = m.thongSo.zDay;

    var coc = raw.coc.map(function (c) {
      var tram = {}, dauNen = null, dauKeo = null, Mmax = null, Vmax = null, capNM = [];
      c.dong.forEach(function (r) {
        // bỏ đoạn cọc nằm trong đài (thanh cứng từ giữa đài tới đáy đài): kiểm tra cọc từ đáy đài trở xuống
        if (r[0] > zDau + 1e-3) return;
        var z = r[0], ci = r[1], P = r[2], V = Math.sqrt(r[3] * r[3] + r[4] * r[4]), M = Math.sqrt(r[6] * r[6] + r[7] * r[7]);
        var kz = z.toFixed(3);
        var b = tram[kz] || (tram[kz] = { z: z, Pmin: Infinity, Pmax: -Infinity, M: 0, V: 0 });
        if (P < b.Pmin) b.Pmin = P;
        if (P > b.Pmax) b.Pmax = P;
        if (M > b.M) b.M = M;
        if (V > b.V) b.V = V;
        capNM.push([tron(-P, 2), tron(M, 2), ci, tron(z, 3)]);
        if (Math.abs(z - zDau) < 1e-3) {
          if (dauNen === null || -P > dauNen.gt) dauNen = { gt: -P, toHop: tenTH(ci) };
          if (dauKeo === null || P > dauKeo.gt) dauKeo = { gt: P, toHop: tenTH(ci) };
        }
        if (Mmax === null || M > Mmax.gt) Mmax = { gt: M, z: z, toHop: tenTH(ci) };
        if (Vmax === null || V > Vmax.gt) Vmax = { gt: V, z: z, toHop: tenTH(ci) };
      });
      var doc = Object.keys(tram).map(function (k) { return tram[k]; }).sort(function (a, b) { return b.z - a.z; });
      // bao từng thành phần theo chiều sâu (quy ước ETABS: P kéo dương) – hình BAO-MIN / BAO-MAX như báo cáo thẩm tra
      var tp = baoThanhPhan(c.dong, function (r) { return r[0] > zDau + 1e-3 ? null : { khoa: r[0].toFixed(3), gt: { z: tron(r[0], 3) } }; },
        { P: 2, V2: 3, V3: 4, M2: 6, M3: 7 }).sort(function (a, b) { return b.z - a.z; });
      return { ten: c.ten, dauNen: dauNen, dauKeo: dauKeo, Mmax: Mmax, Vmax: Vmax, doc: doc, tp: tp, capNM: capNM };
    });

    var cv = (raw.chuyenVi && raw.chuyenVi.nut || []).map(function (ten, i) {
      return { ten: ten, nhan: i === 0 ? 'Tâm đài' : 'Đầu cọc ' + (m.coc[i - 1] ? m.coc[i - 1].ten : i), Delta: null, psi: null };
    });
    (raw.chuyenVi && raw.chuyenVi.dong || []).forEach(function (r) {
      var n = cv[r[0]];
      if (!n) return;
      var D = Math.sqrt(r[2] * r[2] + r[3] * r[3]) * 1000, ps = Math.sqrt(r[5] * r[5] + r[6] * r[6]) * 180 / Math.PI;
      if (n.Delta === null || D > n.Delta.gt) n.Delta = { gt: D, toHop: tenTH(r[1]), U1: r[2] * 1000, U2: r[3] * 1000 };
      if (n.psi === null || ps > n.psi.gt) n.psi = { gt: ps, toHop: tenTH(r[1]) };
    });

    // Đài: mặt cắt suốt bề rộng, bao theo tổ hợp
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
        // chỉ lấy mặt cắt có nút suốt bề rộng đài (lưới ETABS tự chia có thể không thẳng hàng)
        var rongDai = m.thongSo.kieuDai === 'vat' && MCT.calc.hinhDai
          ? MCT.calc.hinhDai.doanCat({ dinh: m.thongSo.dinhDai }, truc === 0 ? 'x' : 'y', Number(k)).dai
          : (truc === 0 ? m.thongSo.Y : m.thongSo.X);
        if (ds[ds.length - 1].t - ds[0].t < 0.9 * rongDai) return;
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
      return cat.sort(function (a, b) { return a.viTri - b.viTri; });
    }
    // Bao nội lực tại từng nút đài (vẽ mômen, lực cắt đài)
    var nutBao = baoThanhPhan((raw.dai && raw.dai.dong) || [], function (r) {
      var p = nut[r[0]];
      return p ? { khoa: String(r[0]), gt: { x: p[0], y: p[1] } } : null;
    }, { M11: 2, M22: 3, V13: 5, V23: 6 });

    // Dầm giằng: bao từng thành phần dọc dầm và giá trị lớn nhất / nhỏ nhất kèm tổ hợp
    var dam = (raw.dam || []).map(function (d) {
      var cot = { P: 2, V2: 3, V3: 4, T: 5, M2: 6, M3: 7 }, bao = {};
      d.dong.forEach(function (r) {
        Object.keys(cot).forEach(function (k) {
          var v = r[cot[k]];
          if (!bao[k + 'max'] || v > bao[k + 'max'].gt) bao[k + 'max'] = { gt: v, x: r[0], toHop: tenTH(r[1]) };
          if (!bao[k + 'min'] || v < bao[k + 'min'].gt) bao[k + 'min'] = { gt: v, x: r[0], toHop: tenTH(r[1]) };
        });
      });
      var tram = baoThanhPhan(d.dong, function (r) { return { khoa: r[0].toFixed(3), gt: { x: tron(r[0], 3) } }; }, cot)
        .sort(function (a, b) { return a.x - b.x; });
      return { ten: d.ten, bao: bao, tram: tram };
    });

    return {
      hopLe: true, loi: [], phienBan: PHIEN_BAN,
      dam: dam,
      toHop: raw.toHop.slice(),
      thongSo: { zDay: zDau, X: m.thongSo.X, Y: m.thongSo.Y, H: m.thongSo.H, soCoc: m.coc.length },
      coc: coc,
      chuyenVi: { nut: cv },
      dai: { X: { cat: catTheo(0, { M: 0, V: 3 }) }, Y: { cat: catTheo(1, { M: 1, V: 4 }) }, nutBao: nutBao }
    };
  }

  /** Giai đoạn 2 – kiểm tra theo thông số hiện tại (Qa, biểu đồ tương tác, giới hạn chuyển vị, thép chọn…). */
  function kiemTraEtabs(tt, s, kq) {
    if (!tt || !tt.hopLe) return { hopLe: false, loi: (tt && tt.loi) || ['Chưa có kết quả phân tích ETABS.'] };
    if (tt.phienBan !== PHIEN_BAN) return { hopLe: false, loi: ['Kết quả ETABS đang lưu được tóm tắt theo cách cũ của app – chạy lại phân tích ở trang Kết quả ETABS.'] };
    var A = kq.A, TT = kq.TT, TN = kq.TN;
    if (!A || !A.hopLe || !kq.B || !kq.B.hopLe) return { hopLe: false, loi: ['Mục A, B chưa hợp lệ.'] };
    var Mgh = TT && TT.hopLe ? taoMgh(TT) : null;

    // ---------------- Cọc ----------------
    // Tương tác N–M (như hình Check P-M của báo cáo thẩm tra): vẽ mọi cặp (N, M) của mọi cọc, mọi mặt cắt, mọi tổ hợp;
    // kiểm tra từng cặp M ≤ M_gh(N); lập bảng điểm nguy hiểm của từng cọc: N nén lớn nhất, N nhỏ nhất (kéo lớn nhất),
    // M lớn nhất, tỉ số M/M_gh lớn nhất (trùng điểm thì gộp).
    // Sức chịu tải: lực dọc N (nén dương, kéo âm) lớn nhất và nhỏ nhất trên TOÀN THÂN CỌC – mọi mặt cắt từ đáy đài tới mũi cọc,
    // mọi tổ hợp (kể cả trọng lượng bản thân cọc trong ETABS), không chỉ tại đầu cọc; ghi cao độ z và tổ hợp.
    var dsCoc = tt.coc.map(function (c) {
      var Nmax = null, Nmin = null;
      c.capNM.forEach(function (p) {
        if (Nmax === null || p[0] > Nmax.gt) Nmax = { gt: p[0], z: p[3], toHop: tt.toHop[p[2]] };
        if (Nmin === null || p[0] < Nmin.gt) Nmin = { gt: p[0], z: p[3], toHop: tt.toHop[p[2]] };
      });
      return Object.assign({}, c, { Nmax: Nmax, Nmin: Nmin });
    });
    var tongNen = null, tongMin = null, MmaxAll = null, VmaxAll = null, tuongTacXau = null, diemTT = [], daCoDiem = {};
    var nguyHiem = [], soCap = 0, soCapVuot = 0;
    dsCoc.forEach(function (c) {
      if (c.Nmax && (tongNen === null || c.Nmax.gt > tongNen.gt)) tongNen = Object.assign({ coc: c.ten }, c.Nmax);
      if (c.Nmin && (tongMin === null || c.Nmin.gt < tongMin.gt)) tongMin = Object.assign({ coc: c.ten }, c.Nmin);
      if (c.Mmax && hon(MmaxAll && MmaxAll.gt, c.Mmax.gt)) MmaxAll = Object.assign({ coc: c.ten }, c.Mmax);
      if (c.Vmax && hon(VmaxAll && VmaxAll.gt, c.Vmax.gt)) VmaxAll = Object.assign({ coc: c.ten }, c.Vmax);
      var nMax = null, nMin = null, mMax = null, xau = null;
      c.capNM.forEach(function (p) {
        var d = { p: p, gh: null, tiSo: null };
        if (Mgh) {
          d.gh = Mgh(p[0]);
          d.tiSo = d.gh > 0 ? p[1] / d.gh : Infinity;
          soCap++;
          if (d.tiSo > 1) soCapVuot++;
          if (tuongTacXau === null || d.tiSo > tuongTacXau.tiSo) {
            tuongTacXau = { tiSo: d.tiSo, N: p[0], M: p[1], Mgh: d.gh, coc: c.ten, z: p[3], toHop: tt.toHop[p[2]] };
          }
          if (!xau || d.tiSo > xau.tiSo) xau = d;
        }
        if (!nMax || p[0] > nMax.p[0] || (p[0] === nMax.p[0] && p[1] > nMax.p[1])) nMax = d;
        if (!nMin || p[0] < nMin.p[0] || (p[0] === nMin.p[0] && p[1] > nMin.p[1])) nMin = d;
        if (!mMax || p[1] > mMax.p[1] || (p[1] === mMax.p[1] && d.tiSo > mMax.tiSo)) mMax = d;
        var khoa = Math.round(p[0] / 10) + '|' + Math.round(p[1] / 2);    // điểm trùng trên hình (10 kN × 2 kNm) chỉ vẽ một lần
        if (!daCoDiem[khoa]) { daCoDiem[khoa] = true; diemTT.push({ N: p[0], M: p[1] }); }
      });
      var dsDiem = [];
      [[nMax, 'N nén lớn nhất'], [nMin, nMin && nMin.p[0] < 0 ? 'Kéo lớn nhất' : 'N nén nhỏ nhất'], [mMax, 'M lớn nhất'], [xau, 'Tỉ số M/Mgh lớn nhất']]
        .forEach(function (h) {
          if (!h[0]) return;
          var cu = dsDiem.filter(function (x) { return x.d === h[0]; })[0];
          if (cu) cu.loai.push(h[1]); else dsDiem.push({ d: h[0], loai: [h[1]] });
        });
      dsDiem.forEach(function (x) {
        var p = x.d.p;
        nguyHiem.push({
          coc: c.ten, loai: x.loai.join('; '), N: p[0], M: p[1], z: p[3], toHop: tt.toHop[p[2]],
          Mgh: x.d.gh, tiSo: x.d.tiSo, ok: x.d.tiSo === null ? null : x.d.tiSo <= 1
        });
      });
    });
    nguyHiem.forEach(function (x, i) { x.stt = i + 1; });
    var Qa = kq.B.Qa, QaKeo = Math.abs(kq.B.QaKeo);   // như mục B (tự tính từ sức chịu tải cọc hoặc nhập tay)
    var Qgh = TN && TN.hopLe ? TN.Qgh : null;
    var cocKiemTra = {
      // Pnen: N nén lớn nhất; Pkeo: lực kéo lớn nhất (khi N nhỏ nhất < 0); PminCC1: N nhỏ nhất (nén dương, kéo âm) – trên toàn thân cọc
      Pnen: tongNen, Pkeo: tongMin && tongMin.gt < 0 ? Object.assign({}, tongMin, { gt: -tongMin.gt }) : null, Qa: Qa, QaKeo: QaKeo,
      Pmin: tongMin, PminCC1: tongMin ? tongMin.gt : null,
      okNen: tongNen ? tongNen.gt <= Qa : null,
      okKeo: tongMin ? -tongMin.gt <= QaKeo : null,
      Mmax: MmaxAll, Vmax: VmaxAll, Qgh: Qgh, okCat: Qgh !== null && VmaxAll ? VmaxAll.gt <= Qgh : null,
      tuongTac: tuongTacXau, okTuongTac: tuongTacXau ? tuongTacXau.tiSo <= 1 : null,
      nguyHiem: nguyHiem, soCapNM: soCap, soCapVuot: soCapVuot
    };

    // ---------------- Chuyển vị ----------------
    var tn = s.taiNgang || {};
    var gDelta = Number(tn.gioiHanChuyenVi) * 10, gPsi = Number(tn.gioiHanGocXoay);   // mm, độ
    var DeltaMax = null, psiMax = null;
    tt.chuyenVi.nut.forEach(function (n) {
      if (n.Delta && hon(DeltaMax && DeltaMax.gt, n.Delta.gt)) DeltaMax = Object.assign({ nut: n.nhan }, n.Delta);
      if (n.psi && hon(psiMax && psiMax.gt, n.psi.gt)) psiMax = Object.assign({ nut: n.nhan }, n.psi);
    });
    var chuyenVi = {
      nut: tt.chuyenVi.nut, DeltaMax: DeltaMax, psiMax: psiMax, gioiHanDelta: gDelta, gioiHanPsi: gPsi,
      okDelta: DeltaMax ? DeltaMax.gt <= gDelta : null, okPsi: psiMax ? psiMax.gt <= gPsi : null
    };

    // ---------------- Đài ----------------
    function cucTri(cat) {
      var duong = null, am = null, vmax = null;
      cat.forEach(function (d) {
        if (d.Mmax.gt > 0 && hon(duong && duong.gt, d.Mmax.gt)) duong = { gt: d.Mmax.gt, viTri: d.viTri, b: d.b, toHop: d.Mmax.toHop };
        if (d.Mmin.gt < 0 && hon(am && -am.gt, -d.Mmin.gt)) am = { gt: d.Mmin.gt, viTri: d.viTri, b: d.b, toHop: d.Mmin.toHop };
        if (hon(vmax && vmax.gt, d.Vmax.gt)) vmax = { gt: d.Vmax.gt, viTri: d.viTri, b: d.b, toHop: d.Vmax.toHop };
      });
      return { cat: cat, Mduong: duong, Mam: am, Vmax: vmax };
    }
    var datX = cucTri(tt.dai.X.cat), datY = cucTri(tt.dai.Y.cat);
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
      h0: h0, a: a, Rb: Rb, Rbt: Rbt, Rs: Rs, nutBao: tt.dai.nutBao || [],
      X: Object.assign(datX, { duoi: lop(datX.Mduong, 'duoiX', 'Lớp dưới theo X'), tren: lop(datX.Mam, 'trenX', 'Lớp trên theo X'), catKT: cat(datX.Vmax) }),
      Y: Object.assign(datY, { duoi: lop(datY.Mduong, 'duoiY', 'Lớp dưới theo Y'), tren: lop(datY.Mam, 'trenY', 'Lớp trên theo Y'), catKT: cat(datY.Vmax) })
    };

    // Nứt đài: mômen ETABS (tổ hợp tính toán – thiên về an toàn), thép đang chọn của lớp chịu kéo và lớp chịu nén
    function nut(ten, l, lopNen) {
      if (!l.can) return { ten: ten, M: 0, nut: false, ok: true, khongCoMomen: true };
      if (!l.chon) return { ten: ten, M: l.M, ok: null, thieuThep: true };
      var b = l.can.b;
      return Object.assign({ ten: ten, viTri: l.viTri, toHop: l.toHop, chon: l.chon },
        kiemTraNut(l.M, b, H, a, l.chon.AsMet * b, lopNen.chon ? lopNen.chon.AsMet * b : 0, l.chon.d, vl.beTong, vl.cotThep.Es));
    }
    var dsNut = [nut('Phương X – thớ dưới chịu kéo', dai.X.duoi, dai.X.tren), nut('Phương X – thớ trên chịu kéo', dai.X.tren, dai.X.duoi),
      nut('Phương Y – thớ dưới chịu kéo', dai.Y.duoi, dai.Y.tren), nut('Phương Y – thớ trên chịu kéo', dai.Y.tren, dai.Y.duoi)];
    var coMomen = dsNut.filter(function (n) { return !n.khongCoMomen && !n.thieuThep; });
    var nutXau = null;
    coMomen.forEach(function (n) {
      var muc = n.nut ? 1 + n.acrc : n.M / n.Mcrc;   // ưu tiên tiết diện đã nứt, bề rộng lớn nhất
      if (nutXau === null || muc > nutXau.muc) nutXau = { muc: muc, n: n };
    });
    dai.nut = {
      ds: dsNut, xauNhat: nutXau ? nutXau.n : null,
      ok: dsNut.some(function (n) { return n.ok === null; }) ? null : dsNut.every(function (n) { return n.ok; })
    };

    // Bulong chịu kéo + cắt đồng thời (như báo cáo thẩm tra): √((N1/[N]tb)² + (Q1/[N]vb)²) ≤ 1
    var E = kq.E, bulong = null;
    if (E && E.hopLe) {
      var tiSoBl = Math.sqrt(Math.pow(E.Pt1 / E.Ntb, 2) + Math.pow(E.Ps1 / E.Nvb, 2));
      bulong = { N1: E.Pt1, Ntb: E.Ntb, Q1: E.Ps1, Nvb: E.Nvb, tiSo: tiSoBl, ok: tiSoBl <= 1 };
    }

    // Dầm giằng (nếu mô hình có): khớp số liệu nhập theo tên DG1, DG2…
    var dsDamNhap = (s.damGiang && s.damGiang.ds) || [];
    var damGiang = (tt.dam || []).map(function (r) {
      var d = dsDamNhap[Number(String(r.ten).replace(/^DG/, '')) - 1];
      if (!d || !MCT.calc.kiemTraDamGiang) return { ten: r.ten, hopLe: false, loi: ['Không còn số liệu dầm ' + r.ten + ' – dựng lại mô hình và chạy lại phân tích.'] };
      return MCT.calc.kiemTraDamGiang(d, r, kq.SCT && kq.SCT.coc ? kq.SCT.coc.D : 0);
    });

    var ketLuan = [
      { ten: 'Cọc chịu nén (N lớn nhất trên thân cọc)', ok: cocKiemTra.okNen },
      { ten: 'Cọc chịu kéo (N nhỏ nhất trên thân cọc)', ok: cocKiemTra.Pkeo ? cocKiemTra.okKeo : true },
      { ten: 'Biểu đồ tương tác N–M', ok: cocKiemTra.okTuongTac },
      { ten: 'Cọc chịu cắt', ok: cocKiemTra.okCat },
      { ten: 'Chuyển vị ngang', ok: chuyenVi.okDelta },
      { ten: 'Góc xoay', ok: chuyenVi.okPsi },
      { ten: 'Thép đài', ok: [dai.X.duoi, dai.X.tren, dai.Y.duoi, dai.Y.tren].every(function (l) { return l.ok; }) },
      { ten: 'Đài chịu cắt', ok: [dai.X.catKT, dai.Y.catKT].every(function (c) { return !c || c.ok; }) },
      { ten: 'Nứt đài móng', ok: dai.nut.ok }
    ];
    if (bulong) ketLuan.push({ ten: 'Bulong chịu kéo + cắt đồng thời', ok: bulong.ok });
    damGiang.forEach(function (d) { ketLuan.push({ ten: 'Dầm giằng ' + d.ten, ok: d.hopLe ? d.ok : null }); });
    return {
      hopLe: true, loi: [],
      toHop: tt.toHop, thongSo: tt.thongSo, coc: dsCoc, cocKiemTra: cocKiemTra, diemTuongTac: diemTT,
      chuyenVi: chuyenVi, dai: dai, bulong: bulong, damGiang: damGiang, ketLuan: ketLuan,
      tatCaOk: ketLuan.every(function (k) { return k.ok !== false; })
    };
  }

  /** Tóm tắt + kiểm tra trong một bước. */
  function ketQuaEtabs(raw, m, t, s, kq) {
    var tt = tomTatEtabs(raw, m, t);
    return tt.hopLe ? kiemTraEtabs(tt, s, kq) : tt;
  }

  /**
   * Kết luận (mục F) theo phương pháp ETABS: các dòng mục B (cọc nén/kéo) và D (thép đài) lấy theo ETABS;
   * thêm cọc chịu cắt, tương tác N–M, chuyển vị, góc xoay, đài chịu cắt từ ETABS; giữ mục C, E.
   */
  function ketLuanEtabs(F, kE) {
    if (!F || !F.hopLe) return F;
    if (!kE || !kE.hopLe) return { hopLe: false, loi: ['Chưa có kết quả ETABS: vào trang Kết quả ETABS, chạy phân tích (hoặc chọn phương pháp Giải tích).'], ds: [] };
    var ck = kE.cocKiemTra, cv = kE.chuyenVi, d = kE.dai;
    function muc(ma, trang, ten, trai, dau, phai, ok) {
      return { ma: ma, trang: trang, ten: ten, trai: trai, dau: dau, phai: phai, ok: !!ok, oExcel: null, etabs: true };
    }
    function thep(l, ten) {
      return muc('D', 'etabs-ket-qua', ten, { v: l.can ? l.can.AsMet : 0, k: 'As,cal', dv: 'mm²/m' }, '≤',
        { v: l.chon ? l.chon.AsMet : 0, k: 'As,design', dv: 'mm²/m' }, l.ok);
    }
    var B = [
      muc('B', 'etabs-ket-qua', 'Tải trọng nén lên cọc', { v: ck.Pnen ? ck.Pnen.gt : 0, k: 'Pmax', dv: 'kN' }, '≤', { v: ck.Qa, k: 'Qa', dv: 'kN' }, ck.okNen),
      muc('B', 'etabs-ket-qua', 'Tải trọng kéo lên cọc', { v: ck.PminCC1, k: 'Pmin', dv: 'kN' }, '≥', { v: -ck.QaKeo, k: "Qa'", dv: 'kN' },
        ck.PminCC1 === null || ck.PminCC1 >= -ck.QaKeo)
    ];
    var D = [thep(d.X.duoi, 'Thép lớp dưới phương X'), thep(d.Y.duoi, 'Thép lớp dưới phương Y'),
      thep(d.X.tren, 'Thép lớp trên phương X'), thep(d.Y.tren, 'Thép lớp trên phương Y')];
    var ngang = [
      muc('ETABS', 'etabs-ket-qua', 'Cọc chịu cắt', { v: ck.Vmax ? ck.Vmax.gt : 0, k: 'Vmax', dv: 'kN' }, '≤', { v: ck.Qgh, k: '[Q]', dv: 'kN' }, ck.okCat),
      muc('ETABS', 'etabs-ket-qua', 'Tương tác N–M cọc', { v: ck.tuongTac ? ck.tuongTac.M : 0, k: 'M', dv: 'kNm' }, '≤',
        { v: ck.tuongTac ? ck.tuongTac.Mgh : 0, k: 'Mgh', dv: 'kNm' }, ck.okTuongTac),
      muc('ETABS', 'etabs-ket-qua', 'Chuyển vị ngang', { v: cv.DeltaMax ? cv.DeltaMax.gt : 0, k: 'Δ', dv: 'mm' }, '≤', { v: cv.gioiHanDelta, k: '[Δ]', dv: 'mm' }, cv.okDelta),
      muc('ETABS', 'etabs-ket-qua', 'Góc xoay', { v: cv.psiMax ? cv.psiMax.gt : 0, k: 'ψ', dv: '°' }, '≤', { v: cv.gioiHanPsi, k: '[ψ]', dv: '°' }, cv.okPsi)
    ];
    [['X', d.X.catKT], ['Y', d.Y.catKT]].forEach(function (x) {
      if (x[1]) ngang.push(muc('ETABS', 'etabs-ket-qua', 'Đài chịu cắt phương ' + x[0], { v: x[1].V, k: 'V', dv: 'kN' }, '≤', { v: x[1].Qb, k: 'Qb', dv: 'kN' }, x[1].ok));
    });
    var nx = d.nut && d.nut.xauNhat;
    if (nx) {
      D.push(nx.nut
        ? muc('D', 'etabs-ket-qua', 'Nứt đài móng (bề rộng vết nứt)', { v: nx.acrc, k: 'acrc', dv: 'mm' }, '≤', { v: nx.gioiHan, k: '[acrc]', dv: 'mm' }, nx.ok)
        : muc('D', 'etabs-ket-qua', 'Nứt đài móng (chưa hình thành vết nứt)', { v: nx.M, k: 'M', dv: 'kNm' }, '≤', { v: nx.Mcrc, k: 'Mcrc', dv: 'kNm' }, true));
    }
    var bl = kE.bulong ? [muc('E', 'etabs-ket-qua', 'Bulong chịu kéo + cắt đồng thời', { v: kE.bulong.tiSo, k: '√((N/Ntb)²+(Q/Nvb)²)', dv: '' }, '≤',
      { v: 1, k: 'giới hạn', dv: '' }, kE.bulong.ok)] : [];
    var dg = (kE.damGiang || []).map(function (x) {
      return muc('DG', 'etabs-ket-qua', 'Dầm giằng ' + x.ten + (x.hopLe ? ' (' + x.b + '×' + x.h + ' m, z = ' + x.z + ' m)' : ''),
        { v: x.hopLe ? x.tiSo : null, k: 'tỉ số', dv: '' }, '≤', { v: 1, k: 'giới hạn', dv: '' }, x.hopLe && x.ok);
    });
    var giu = F.ds.filter(function (m) { return m.ma === 'C' || m.ma === 'E'; });
    var ds = B.concat(giu.filter(function (m) { return m.ma === 'C'; }), D, giu.filter(function (m) { return m.ma === 'E'; }), bl, dg, ngang);
    var ok = ds.every(function (m) { return m.ok; });
    return {
      hopLe: true, loi: [], phuongPhap: 'etabs', ds: ds, ok: ok,
      ketLuan: ok ? 'Móng cẩu tháp đủ khả năng chịu lực' : 'Móng cẩu tháp KHÔNG đủ khả năng chịu lực',
      okExcel: F.okExcel, ketLuanExcel: F.ketLuanExcel, ketLuanGiaiTich: F.ketLuan, okGiaiTich: F.ok,
      soFail: ds.filter(function (m) { return !m.ok; }).length
    };
  }

  MCT.calc.duLieuPhanTich = duLieuPhanTich;
  MCT.calc.tomTatEtabs = tomTatEtabs;
  MCT.calc.kiemTraEtabs = kiemTraEtabs;
  MCT.calc.ketQuaEtabs = ketQuaEtabs;
  MCT.calc.ketLuanEtabs = ketLuanEtabs;
  MCT.calc.kiemTraNut = kiemTraNut;
})(globalThis.MCT = globalThis.MCT || {});
