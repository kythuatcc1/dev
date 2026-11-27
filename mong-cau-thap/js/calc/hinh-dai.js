// Hình dạng đài cọc trên mặt bằng (hệ trục tại tâm chân cẩu như toạ độ cọc mục B, x sang phải, y lên trên; đơn vị m).
//   Chữ nhật (mặc định với 1–2 cọc và từ 4 cọc; móng 3 cọc khi chọn "chữ nhật"): X × Y đặt giữa tâm cẩu – như Excel.
//   Vát góc (móng 3 cọc, s.dai.hinh3 = 'vat'):
//     - chữ nhật bao: khoảng bao các cọc + c mỗi phía (c = khoảng cách tim cọc tới mép đài, mặc định = D),
//       hoặc X, Y nhập tay đặt giữa khoảng bao các cọc;
//     - hai góc phía cọc đơn vát bởi đường song song với đường nối cọc đơn – cọc của hàng 2 cọc, cách tim cọc c
//       (tự tính), hoặc vát nhập tay a × b (a dọc cạnh phía cọc đơn, b dọc cạnh bên, tính từ góc).
//   Đa giác lồi, đỉnh theo chiều ngược kim đồng hồ.
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  var SAI_SO = 1e-6;
  function tron(v) { return Math.round(v * 1e4) / 1e4; }   // 0,1 mm
  function laSo(v) { return typeof v === 'number' && isFinite(v); }

  // ---------- Hình học đa giác lồi ----------
  function dienTich(p) {
    var s = 0;
    for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return s / 2;
  }
  function trongTam(p) {
    var A = dienTich(p), cx = 0, cy = 0;
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length], k = a[0] * b[1] - b[0] * a[1];
      cx += (a[0] + b[0]) * k; cy += (a[1] + b[1]) * k;
    }
    return [cx / (6 * A), cy / (6 * A)];
  }
  function nguocKim(p) { return dienTich(p) < 0 ? p.slice().reverse() : p; }
  // Cắt đa giác p bởi nửa mặt phẳng { q : n·q ≤ d } (Sutherland–Hodgman)
  function catNuaMP(p, n, d) {
    var ra = [];
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length];
      var fa = n[0] * a[0] + n[1] * a[1] - d, fb = n[0] * b[0] + n[1] * b[1] - d;
      if (fa <= SAI_SO) ra.push(a);
      if ((fa < -SAI_SO && fb > SAI_SO) || (fa > SAI_SO && fb < -SAI_SO)) {
        var t = fa / (fa - fb);
        ra.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    return lamGon(ra);
  }
  // bỏ đỉnh trùng và đỉnh thẳng hàng
  function lamGon(p) {
    var q = [];
    p.forEach(function (v) {
      var t = q[q.length - 1];
      if (!t || Math.abs(t[0] - v[0]) > 1e-7 || Math.abs(t[1] - v[1]) > 1e-7) q.push(v);
    });
    if (q.length > 1 && Math.abs(q[0][0] - q[q.length - 1][0]) < 1e-7 && Math.abs(q[0][1] - q[q.length - 1][1]) < 1e-7) q.pop();
    var r = [];
    for (var i = 0; i < q.length; i++) {
      var a = q[(i + q.length - 1) % q.length], b = q[i], c = q[(i + 1) % q.length];
      if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 1e-9) r.push(b);
    }
    return r;
  }
  // Cắt đa giác p bởi đa giác lồi k (ngược kim đồng hồ)
  function catDaGiac(p, k) {
    var r = p;
    for (var i = 0; i < k.length && r.length; i++) {
      var a = k[i], b = k[(i + 1) % k.length];
      // trong: bên trái cạnh a→b  ⇔  n·q ≤ d với n = (by − ay, −(bx − ax))
      var n = [b[1] - a[1], -(b[0] - a[0])];
      r = catNuaMP(r, n, n[0] * a[0] + n[1] * a[1]);
    }
    return r;
  }
  // Khoảng cách có dấu từ điểm tới các cạnh (dương: bên trong); nhỏ nhất
  function khoangCachMep(p, x, y) {
    var m = Infinity;
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      m = Math.min(m, ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])) / L);
    }
    return m;
  }
  // Chiều dài đoạn cắt của đường x = t (truc 'x', đo theo y) hoặc y = t (truc 'y', đo theo x)
  function doanCat(p, truc, t) {
    var k = truc === 'x' ? 0 : 1, lo = Infinity, hi = -Infinity;
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length];
      if ((a[k] - t) * (b[k] - t) > 0 || Math.abs(a[k] - b[k]) < 1e-12) {
        if (Math.abs(a[k] - t) < 1e-9) { lo = Math.min(lo, a[1 - k]); hi = Math.max(hi, a[1 - k]); }
        continue;
      }
      var s = (t - a[k]) / (b[k] - a[k]), v = a[1 - k] + s * (b[1 - k] - a[1 - k]);
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    return hi > lo ? { tu: lo, den: hi, dai: hi - lo } : { tu: 0, den: 0, dai: 0 };
  }

  function chuNhat(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }

  // Hàng 2 cọc: cặp có đường nối gần song song trục nhất (bằng nhau thì cặp dài hơn); còn lại là cọc đơn
  function timCocDon(c) {
    var cap = [[0, 1, 2], [0, 2, 1], [1, 2, 0]].map(function (t) {
      var dx = c[t[1]].x - c[t[0]].x, dy = c[t[1]].y - c[t[0]].y, L = Math.hypot(dx, dy);
      return { i: t[0], j: t[1], don: t[2], lech: L > 0 ? Math.min(Math.abs(dx), Math.abs(dy)) / L : 1, L: L, ngang: Math.abs(dx) >= Math.abs(dy) };
    }).sort(function (a, b) { return Math.abs(a.lech - b.lech) > 1e-9 ? a.lech - b.lech : b.L - a.L; });
    var h = cap[0], d = c[h.don];
    var phia = h.ngang ? (d.y > (c[h.i].y + c[h.j].y) / 2 ? '+y' : '-y') : (d.x > (c[h.i].x + c[h.j].x) / 2 ? '+x' : '-x');
    return { hang: [h.i, h.j], don: h.don, phia: phia };
  }

  /**
   * @param {object} v { dai: s.dai, toaDo: [{x, y}], D }
   */
  function hinhDai(v) {
    var dai = v.dai || {}, D = Number(v.D) || 0;
    var toaDo = (v.toaDo || []).map(function (c) { return { x: Number(c.x), y: Number(c.y) }; });
    var loi = [], canhBao = [];
    var X = Number(dai.X), Y = Number(dai.Y);
    var vat = toaDo.length === 3 && dai.hinh3 !== 'chu-nhat' && toaDo.every(function (c) { return laSo(c.x) && laSo(c.y); });
    if (!vat) {
      var p0 = chuNhat(-X / 2, -Y / 2, X / 2, Y / 2);
      return { kieu: 'chu-nhat', hopLe: X > 0 && Y > 0, loi: X > 0 && Y > 0 ? [] : ['Kích thước đài X, Y phải lớn hơn 0.'], canhBao: [],
        X: X, Y: Y, x0: -X / 2, x1: X / 2, y0: -Y / 2, y1: Y / 2, dinh: p0, dienTich: X * Y, trongTam: [0, 0] };
    }
    var c = dai.cTheo === 'nhap' ? Number(dai.c) : D;
    if (!(c > 0)) loi.push('Khoảng cách tim cọc tới mép đài c phải lớn hơn 0.');
    var xs = toaDo.map(function (p) { return p.x; }), ys = toaDo.map(function (p) { return p.y; });
    var bx0 = Math.min.apply(null, xs), bx1 = Math.max.apply(null, xs), by0 = Math.min.apply(null, ys), by1 = Math.max.apply(null, ys);
    var tuTinhXY = dai.cachXY !== 'nhap';
    if (tuTinhXY) { X = bx1 - bx0 + 2 * c; Y = by1 - by0 + 2 * c; }
    else if (!(X > 0 && Y > 0)) loi.push('Kích thước đài X, Y phải lớn hơn 0.');
    if (loi.length) return { kieu: 'vat', hopLe: false, loi: loi, canhBao: [] };
    var cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
    var x0 = tron(cx - X / 2), x1 = tron(cx + X / 2), y0 = tron(cy - Y / 2), y1 = tron(cy + Y / 2);
    X = tron(x1 - x0); Y = tron(y1 - y0);
    var hc = chuNhat(x0, y0, x1, y1);
    var nhan = timCocDon(toaDo), don = toaDo[nhan.don];

    // Hai góc phía cọc đơn: đỉnh góc, hướng dọc cạnh phía cọc đơn (về góc kia) và dọc cạnh bên (rời xa phía cọc đơn)
    var goc = {
      '+y': [{ C: [x0, y1], e1: [1, 0], e2: [0, -1] }, { C: [x1, y1], e1: [-1, 0], e2: [0, -1] }],
      '-y': [{ C: [x0, y0], e1: [1, 0], e2: [0, 1] }, { C: [x1, y0], e1: [-1, 0], e2: [0, 1] }],
      '+x': [{ C: [x1, y0], e1: [0, 1], e2: [-1, 0] }, { C: [x1, y1], e1: [0, -1], e2: [-1, 0] }],
      '-x': [{ C: [x0, y0], e1: [0, 1], e2: [1, 0] }, { C: [x0, y1], e1: [0, -1], e2: [1, 0] }]
    }[nhan.phia];
    var tuTinhVat = dai.cachVat !== 'nhap', p = hc;
    function catDuong(P, Q) {   // giữ nửa mặt phẳng chứa tâm chữ nhật bao
      var n = [Q[1] - P[1], -(Q[0] - P[0])], d = n[0] * P[0] + n[1] * P[1];
      if (n[0] * cx + n[1] * cy > d) { n = [-n[0], -n[1]]; d = -d; }
      p = catNuaMP(p, n, d);
    }
    if (tuTinhVat) {
      nhan.hang.forEach(function (k) {
        var R = toaDo[k], R2 = toaDo[nhan.hang[0] === k ? nhan.hang[1] : nhan.hang[0]];
        var dx = don.x - R.x, dy = don.y - R.y, L = Math.hypot(dx, dy);
        if (!(L > 0)) return;
        var n = [dy / L, -dx / L];                                   // pháp tuyến của đường nối R – cọc đơn
        if (n[0] * (R2.x - R.x) + n[1] * (R2.y - R.y) > 0) n = [-n[0], -n[1]];   // hướng ra ngoài (xa cọc còn lại)
        var P = [R.x + n[0] * c, R.y + n[1] * c];
        catDuong(P, [P[0] + dx, P[1] + dy]);
      });
    } else {
      var a = Number(dai.vatA), b = Number(dai.vatB);
      var canhDon = nhan.phia === '+y' || nhan.phia === '-y' ? X : Y, canhBen = nhan.phia === '+y' || nhan.phia === '-y' ? Y : X;
      if (!(a >= 0 && b >= 0)) loi.push('Kích thước vát a, b phải ≥ 0.');
      else if (2 * a >= canhDon - SAI_SO) loi.push('Vát a = ' + a + ' m quá lớn: hai vát chạm nhau trên cạnh phía cọc đơn (dài ' + tron(canhDon) + ' m).');
      else if (b >= canhBen - SAI_SO) loi.push('Vát b = ' + b + ' m phải nhỏ hơn cạnh bên ' + tron(canhBen) + ' m.');
      if (loi.length) return { kieu: 'vat', hopLe: false, loi: loi, canhBao: [] };
      if (a > 0 && b > 0) goc.forEach(function (g) { catDuong([g.C[0] + g.e1[0] * a, g.C[1] + g.e1[1] * a], [g.C[0] + g.e2[0] * b, g.C[1] + g.e2[1] * b]); });
    }
    p = nguocKim(p.map(function (q) { return [tron(q[0]), tron(q[1])]; }));
    p = lamGon(p);
    // kích thước vát thực (đo từ góc chữ nhật bao tới đỉnh gần nhất trên hai cạnh kề) – hiển thị, thuyết minh
    var vatGoc = goc.map(function (g) {
      function doc(e) {
        var m = Infinity;
        p.forEach(function (q) {
          var rx = q[0] - g.C[0], ry = q[1] - g.C[1], t = rx * e[0] + ry * e[1];
          if (Math.abs(rx * e[1] - ry * e[0]) < 1e-6 && t >= -1e-6) m = Math.min(m, t);
        });
        return isFinite(m) ? tron(m) : 0;
      }
      return { a: doc(g.e1), b: doc(g.e2) };
    });
    // Kiểm tra cọc nằm trong đài, cách mép ≥ c (cảnh báo) và ≥ D/2 (lỗi)
    var mep = toaDo.map(function (q) { return khoangCachMep(p, q.x, q.y); });
    mep.forEach(function (m, i) {
      if (m < D / 2 - 1e-4) loi.push('Cọc ' + (i + 1) + ' nằm ra ngoài mép đài (tim cọc cách mép ' + tron(m) + ' m < D/2).');
      else if (m < c - 1e-4) canhBao.push('Cọc ' + (i + 1) + ' cách mép đài ' + tron(m) + ' m, nhỏ hơn c = ' + tron(c) + ' m.');
    });
    var A = dienTich(p);
    return {
      kieu: 'vat', hopLe: loi.length === 0, loi: loi, canhBao: canhBao,
      X: X, Y: Y, x0: x0, x1: x1, y0: y0, y1: y1, dinh: p, dienTich: A, trongTam: trongTam(p),
      c: c, cNhap: dai.cTheo === 'nhap', tuTinhXY: tuTinhXY, tuTinhVat: tuTinhVat, phiaDon: nhan.phia, cocDon: nhan.don, hang: nhan.hang,
      vat: vatGoc, mepCoc: mep
    };
  }

  /** Cảnh báo khi chân cẩu (hình vuông Ht quanh tâm cẩu xc, yc) không nằm trọn trong đài. */
  function kiemTraChanCau(hd, Ht, xc, yc) {
    if (!hd || !hd.dinh || !(Ht > 0)) return [];
    xc = xc || 0; yc = yc || 0;
    var ra = [[-1, -1], [1, -1], [1, 1], [-1, 1]].filter(function (d) {
      return khoangCachMep(hd.dinh, xc + d[0] * Ht / 2, yc + d[1] * Ht / 2) < -1e-4;
    });
    return ra.length ? ['Chân cẩu (H_t = ' + Ht + ' m) có ' + ra.length + ' góc nằm ngoài đài.'] : [];
  }

  /** Bố trí 3 cọc tam giác đều cạnh s, trọng tâm tại tâm cẩu; phia: hướng cọc đơn '+y' | '-y' | '+x' | '-x'. */
  function boTri3Coc(s, phia) {
    var h = s * Math.sqrt(3) / 2, d = 2 * h / 3, r = h / 3;
    var q = [[-s / 2, -r], [s / 2, -r], [0, d]];
    var bien = { '+y': function (x, y) { return [x, y]; }, '-y': function (x, y) { return [x, -y]; },
      '+x': function (x, y) { return [y, x]; }, '-x': function (x, y) { return [-y, x]; } }[phia || '+y'];
    return q.map(function (t) { var u = bien(t[0], t[1]); return { x: Math.round(u[0] * 1000) / 1000, y: Math.round(u[1] * 1000) / 1000 }; });
  }

  hinhDai.doanCat = function (hd, truc, t) { return doanCat(hd.dinh, truc, t); };
  hinhDai.khoangCachMep = function (hd, x, y) { return khoangCachMep(hd.dinh, x, y); };
  hinhDai.catDaGiac = catDaGiac;
  hinhDai.dienTich = function (p) { return Math.abs(dienTich(p)); };
  hinhDai.kiemTraChanCau = kiemTraChanCau;
  hinhDai.boTri3Coc = boTri3Coc;
  MCT.calc.hinhDai = hinhDai;
})(globalThis.MCT = globalThis.MCT || {});
