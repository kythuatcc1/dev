// Hình vẽ từ kết quả ETABS cho thuyết minh (thay các ô dán hình chụp): mô hình 3D, lực đặt lên móng, nội lực cọc BAO-MIN/MAX,
// mômen / lực cắt đài, chuyển vị đầu cọc, nội lực dầm giằng. SVG viết thẳng thuộc tính để trình duyệt chuyển thành PNG.
(function (MCT) {
  'use strict';

  var FONT = 'font-family="Arial, Helvetica, sans-serif"';
  function chu(x, y, text, o) {
    o = o || {};
    return '<text x="' + f1(x) + '" y="' + f1(y) + '" ' + FONT + ' font-size="' + (o.co || 11) + '" fill="' + (o.mau || '#374151') + '"' +
      (o.giua ? ' text-anchor="middle"' : o.phai ? ' text-anchor="end"' : '') + (o.dam ? ' font-weight="bold"' : '') +
      (o.xoay ? ' transform="rotate(' + o.xoay + ' ' + f1(x) + ' ' + f1(y) + ')"' : '') + '>' + esc(text) + '</text>';
  }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function so(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '-';
    var a = Math.abs(v), dd = d !== undefined ? d : a >= 100 ? 0 : a >= 10 ? 1 : 2;
    var s = v.toFixed(dd);
    return s === '-0' || /^-0\.0*$/.test(s) ? s.replace('-', '') : s;
  }
  function khung(W, H, noiDung, tieuDe) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>' +
      (tieuDe ? chu(W / 2, 18, tieuDe, { giua: true, dam: true, co: 13, mau: '#1f2937' }) : '') + noiDung + '</svg>';
  }
  function muiTen(x1, y1, x2, y2, mau, rong, doi) {   // doi: mũi tên đôi (véc tơ mômen)
    var a = Math.atan2(y2 - y1, x2 - x1), L = 9, w = 4.5;
    function dau(x, y) {
      return '<path d="M' + f1(x) + ' ' + f1(y) + ' L' + f1(x - L * Math.cos(a) + w * Math.sin(a)) + ' ' + f1(y - L * Math.sin(a) - w * Math.cos(a)) +
        ' L' + f1(x - L * Math.cos(a) - w * Math.sin(a)) + ' ' + f1(y - L * Math.sin(a) + w * Math.cos(a)) + ' Z" fill="' + mau + '"/>';
    }
    return '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" stroke="' + mau + '" stroke-width="' + (rong || 2) + '"/>' +
      dau(x2, y2) + (doi ? dau(x2 - 8 * Math.cos(a), y2 - 8 * Math.sin(a)) : '');
  }

  // ---- Phép chiếu trục đo (isometric): x sang phải-xuống, y sang phải-lên, z lên; hệ số đứng kz ----
  function truc(s, kz, ox, oy) {
    var c = Math.cos(Math.PI / 6), sn = Math.sin(Math.PI / 6);
    return function (x, y, z) { return [ox + (x + y) * c * s, oy + (x - y) * sn * s - z * kz]; };
  }

  /** Mô hình 3D: tấm đài (lưới), cọc, lò xo đất, gối mũi cọc, dầm giằng, điểm đặt tải. m = taoMoHinhEtabs(...). */
  function moHinh3D(m, kichThuoc) {
    var W = (kichThuoc && kichThuoc.w) || 560, H = (kichThuoc && kichThuoc.h) || 560, t = m.thongSo;
    var cao = t.zGiua - t.zMui, rong = (t.X + t.Y) * Math.cos(Math.PI / 6);
    var s = Math.min((W - 160) / rong, 70), kz = Math.min((H - 130 - (t.X + t.Y) * 0.5 * s) / cao, s);
    var P = truc(s, kz, W / 2 - 20, 92 + (t.Y / 2) * 0.5 * s + t.zGiua * kz);
    var g = '', i;
    function L(a, b, mau, w, net) { var p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]); return '<line x1="' + f1(p[0]) + '" y1="' + f1(p[1]) + '" x2="' + f1(q[0]) + '" y2="' + f1(q[1]) + '" stroke="' + mau + '" stroke-width="' + (w || 1) + '"' + (net ? ' stroke-dasharray="' + net + '"' : '') + '/>'; }
    // đài: mặt tấm + lưới
    var z = t.zGiua, X = t.X / 2, Y = t.Y / 2;
    var goc = [[-X, -Y], [X, -Y], [X, Y], [-X, Y]].map(function (p) { return P(p[0], p[1], z); });
    g += '<polygon points="' + goc.map(function (p) { return f1(p[0]) + ',' + f1(p[1]); }).join(' ') + '" fill="#9ae6a8" fill-opacity="0.55" stroke="#2f855a" stroke-width="1.5"/>';
    for (i = 0; i < m.xs.length; i++) g += L([m.xs[i], -Y, z], [m.xs[i], Y, z], '#2f855a', 0.4);
    for (i = 0; i < m.ys.length; i++) g += L([-X, m.ys[i], z], [X, m.ys[i], z], '#2f855a', 0.4);
    // cọc, lò xo, gối
    var loXoCao = {};
    (m.bangLoXo || []).forEach(function (r) { if (r.K > 0) loXoCao[r.caoDo] = true; });
    m.coc.forEach(function (c) {
      g += L([c.x, c.y, t.zGiua], [c.x, c.y, t.zMui], '#1d4ed8', 2.2);
      m.capDo.forEach(function (zz) {
        if (!loXoCao[zz]) return;
        g += L([c.x - 0.35, c.y, zz], [c.x + 0.35, c.y, zz], '#6b7280', 0.8) + L([c.x, c.y - 0.35, zz], [c.x, c.y + 0.35, zz], '#6b7280', 0.8);
      });
      var p = P(c.x, c.y, t.zMui);
      g += '<path d="M' + f1(p[0]) + ' ' + f1(p[1]) + ' l-6 9 h12 Z" fill="#111827"/>';
      var dau = P(c.x, c.y, t.zDay);
      g += chu(dau[0] + 6, dau[1] + 14, c.ten, { mau: '#1d4ed8', dam: true });
    });
    (m.dam || []).forEach(function (d) {
      var c1 = m.coc.filter(function (c) { return c.ten === d.tuCoc; })[0], c2 = m.coc.filter(function (c) { return c.ten === d.denCoc; })[0];
      if (!c1 || !c2) return;
      g += L([c1.x, c1.y, d.z], [c2.x, c2.y, d.z], '#8b5a2b', 4);
      var p = P((c1.x + c2.x) / 2, (c1.y + c2.y) / 2, d.z);
      g += chu(p[0] + 4, p[1] - 4, d.ten, { mau: '#8b5a2b', co: 10 });
    });
    var tam = P(0, 0, t.zGiua);
    g += '<circle cx="' + f1(tam[0]) + '" cy="' + f1(tam[1]) + '" r="4.5" fill="#dc2626"/>';
    // thước cao độ
    var x0 = 34, yTop = P(-X, Y, t.zGiua)[1], yDay = P(-X, Y, t.zMui)[1], yChu = -Infinity;
    var dsZ = [[t.zGiua, 'giữa đài'], [t.zDay, 'đáy đài']].concat(t.zBatDau !== t.zDay ? [[t.zBatDau, 'đầu cọc']] : []), theoZ = {};
    (m.dam || []).forEach(function (d) {   // các dầm cùng cao độ ghi chung một nhãn
      var k = Number(d.z).toFixed(3);
      if (theoZ[k]) theoZ[k][1] += ', ' + d.ten; else dsZ.push(theoZ[k] = [Number(d.z), d.ten]);
    });
    dsZ.push([t.zMui, 'mũi cọc']);
    dsZ.sort(function (a, b) { return b[0] - a[0]; }).forEach(function (r) {
      var y = yTop + (t.zGiua - r[0]) * kz, yc = Math.max(y + 4, yChu + 13);   // nhãn gần nhau → dời xuống, có đường dẫn
      g += '<line x1="' + x0 + '" y1="' + f1(y) + '" x2="' + (x0 + 8) + '" y2="' + f1(y) + '" stroke="#6b7280"/>';
      if (yc > y + 5) g += '<line x1="' + (x0 + 8) + '" y1="' + f1(y) + '" x2="' + (x0 + 11) + '" y2="' + f1(yc - 4) + '" stroke="#9ca3af" stroke-width="0.7"/>';
      g += chu(x0 + 12, yc, so(r[0], 2) + ' m (' + r[1] + ')', { co: 10 });
      yChu = yc;
    });
    g += '<line x1="' + x0 + '" y1="' + f1(yTop) + '" x2="' + x0 + '" y2="' + f1(yDay) + '" stroke="#6b7280"/>';
    g += chu(W - 12, H - 30, 'Xanh lá: tấm đài (shell); xanh dương: cọc (frame); xám: lò xo đất', { phai: true, co: 10, mau: '#6b7280' }) +
      chu(W - 12, H - 16, 'Tam giác: gối mũi cọc; đỏ: điểm đặt tải' + ((m.dam || []).length ? '; nâu: dầm giằng' : ''), { phai: true, co: 10, mau: '#6b7280' });
    return khung(W, H, g, 'MÔ HÌNH MÓNG CẨU THÁP (ETABS)');
  }

  /** Lực cẩu tháp đặt tại tâm đài theo nhóm pattern, ví dụ ['FX1', 'FY1', 'FZ1'] (mũi tên lực) hoặc ['MX1', 'MY1', 'MZ1'] (mũi tên đôi). */
  function taiTrongDai(m, mauTai, nhom, kichThuoc) {
    var W = (kichThuoc && kichThuoc.w) || 480, H = (kichThuoc && kichThuoc.h) || 320, t = m.thongSo;
    var s = Math.min((W - 220) / ((t.X + t.Y) * Math.cos(Math.PI / 6)), 60);
    var P = truc(s, s, W / 2 - 40, H / 2 + 40);
    var X = t.X / 2, Y = t.Y / 2, z = 0, g = '';
    var goc = [[-X, -Y], [X, -Y], [X, Y], [-X, Y]].map(function (p) { return P(p[0], p[1], z); });
    g += '<polygon points="' + goc.map(function (p) { return f1(p[0]) + ',' + f1(p[1]); }).join(' ') + '" fill="#9ae6a8" fill-opacity="0.6" stroke="#2f855a" stroke-width="1.5"/>';
    var O = P(0, 0, 0), dai = 70;
    var huong = { X: P(1, 0, 0), Y: P(0, 1, 0), Z: P(0, 0, 1) };
    function don(v) { var dx = v[0] - O[0], dy = v[1] - O[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; }
    // trục toạ độ nhỏ
    ['X', 'Y', 'Z'].forEach(function (k) {
      var u = don(huong[k]);
      g += '<line x1="' + f1(O[0]) + '" y1="' + f1(O[1]) + '" x2="' + f1(O[0] + u[0] * 26) + '" y2="' + f1(O[1] + u[1] * 26) + '" stroke="#9ca3af" stroke-dasharray="3 2"/>';
    });
    g += '<circle cx="' + f1(O[0]) + '" cy="' + f1(O[1]) + '" r="4" fill="#dc2626"/>';
    var mau = ['#dc2626', '#2563eb', '#7c3aed'], dong = 0;
    nhom.forEach(function (ten, i) {
      var pt = mauTai.filter(function (p) { return p.ten === ten; })[0];
      if (!pt || !pt.luc) return;
      var k = pt.luc.giaTri.map(function (v, j) { return v ? j : -1; }).filter(function (j) { return j >= 0; })[0];
      if (k === undefined) return;
      var v = pt.luc.giaTri[k], truc0 = ['X', 'Y', 'Z'][k % 3], u = don(huong[truc0]), dau = v >= 0 ? 1 : -1;
      var x2 = O[0] + u[0] * dai * dau, y2 = O[1] + u[1] * dai * dau;
      g += muiTen(O[0], O[1], x2, y2, mau[i], 2.4, k >= 3);
      g += chu(x2 + (u[0] * dau >= 0 ? 6 : -6), y2 + (u[1] * dau >= 0 ? 14 : -6), ten + ' = ' + so(v, 2) + (k < 3 ? ' kN' : ' kNm'),
        { mau: mau[i], dam: true, phai: u[0] * dau < 0 });
      g += chu(12, H - 14 - 14 * (nhom.length - 1 - dong), ten + ': ' + pt.moTa, { co: 10, mau: '#6b7280' });
      dong++;
    });
    return khung(W, H, g, 'TẢI TRỌNG TẠI TÂM ĐÀI – ' + nhom.filter(Boolean).join(', '));
  }

  /**
   * Nội lực cọc tổ hợp BAO-MIN hoặc BAO-MAX, một thành phần (P, M2, M3, V2, V3) cho mọi cọc – như ô bảng 4.1/4.2 báo cáo thẩm tra.
   * dsCoc: [{ ten, tp: [{ z, P: [min, max], … }] }]; loai: 'min' | 'max'.
   */
  function noiLucCocBao(dsCoc, thanhPhan, loai, kichThuoc) {
    var W = (kichThuoc && kichThuoc.w) || 120, H = (kichThuoc && kichThuoc.h) || 456;
    var chiSo = loai === 'min' ? 0 : 1, mau = loai === 'min' ? '#ef4444' : '#22c55e', vien = loai === 'min' ? '#b91c1c' : '#15803d';
    var tatCa = [];
    dsCoc.forEach(function (c) { (c.tp || []).forEach(function (r) { tatCa.push(r.z); }); });
    if (!tatCa.length) return khung(W, H, chu(W / 2, H / 2, 'Chưa có số liệu', { giua: true }));
    var zMax = Math.max.apply(null, tatCa), zMin = Math.min.apply(null, tatCa);
    var vMax = 0;
    dsCoc.forEach(function (c) { c.tp.forEach(function (r) { vMax = Math.max(vMax, Math.abs(r[thanhPhan][chiSo])); }); });
    // Cỡ chữ theo bề rộng mỗi cọc để nhãn không tràn sang cọc bên cạnh (hình được thu nhỏ vào một ô bảng ~3 cm)
    var n = dsCoc.length, o = W / n, nua = o * 0.4, co = Math.max(7, Math.min(10.5, o / 3.6)), t0 = 2 * co + 12, b0 = 2 * co + 6;
    var Y = function (z) { return t0 + (zMax - z) / (zMax - zMin || 1) * (H - t0 - b0); };
    function rongChu(text, c) { return String(text).length * c * 0.56; }
    // nhãn nằm trong cột của cọc (xT…xP), viền trắng để đọc được trên nền biểu đồ
    function nhan(xMong, y, text, c, ben, xT, xP, mauChu) {
      var w = rongChu(text, c), x = ben < 0 ? xMong - w : xMong;
      x = Math.max(xT, Math.min(xP - w, x));
      return '<text x="' + f1(x) + '" y="' + f1(y) + '" ' + FONT + ' font-size="' + f1(c) + '" fill="' + mauChu +
        '" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke">' + esc(text) + '</text>';
    }
    var g = '';
    dsCoc.forEach(function (c, i) {
      var x0 = o * (i + 0.5), xT = o * i + 1, xP = o * (i + 1) - 1, ds = c.tp.slice().sort(function (a, b) { return b.z - a.z; });
      var X = function (v) { return x0 + (vMax ? v / vMax : 0) * nua; };
      var pts = ds.map(function (r) { return f1(X(r[thanhPhan][chiSo])) + ',' + f1(Y(r.z)); });
      g += '<polygon points="' + f1(x0) + ',' + f1(Y(ds[0].z)) + ' ' + pts.join(' ') + ' ' + f1(x0) + ',' + f1(Y(ds[ds.length - 1].z)) +
        '" fill="' + mau + '" fill-opacity="0.75" stroke="' + vien + '" stroke-width="0.6"/>';
      g += '<line x1="' + f1(x0) + '" y1="' + f1(Y(zMax)) + '" x2="' + f1(x0) + '" y2="' + f1(Y(zMin)) + '" stroke="#111827" stroke-width="1"/>';
      g += chu(x0, co + 2, c.ten, { giua: true, dam: true, co: f1(co + 0.5) });
      // giá trị đầu cọc (dưới tên cọc) và giá trị lớn nhất (cạnh đỉnh biểu đồ)
      var dauCoc = ds[0][thanhPhan][chiSo], lon = ds[0];
      ds.forEach(function (r) { if (Math.abs(r[thanhPhan][chiSo]) > Math.abs(lon[thanhPhan][chiSo])) lon = r; });
      g += chu(x0, 2 * co + 6, so(dauCoc), { giua: true, co: f1(co), mau: vien });
      var daGhi = [Y(ds[0].z)];
      function trongCho(y) { return daGhi.every(function (y0) { return Math.abs(y - y0) >= co * 1.6; }); }
      if (lon !== ds[0] && Math.abs(lon[thanhPhan][chiSo]) > 0) {
        var vL = lon[thanhPhan][chiSo], yL = Y(lon.z);
        g += '<circle cx="' + f1(X(vL)) + '" cy="' + f1(yL) + '" r="1.6" fill="' + vien + '"/>' +
          nhan(X(vL) + (vL >= 0 ? 2 : -2), yL + co * 0.35, so(vL), co, vL >= 0 ? 1 : -1, xT, xP, vien);
        daGhi.push(yL);
      }
      // vài giá trị dọc thân cọc, cách đều, không chồng nhãn
      var buoc = Math.max(1, Math.round(ds.length / 6));
      ds.forEach(function (r, k) {
        if (k === 0 || k % buoc || r === lon) return;
        var v = r[thanhPhan][chiSo], y = Y(r.z);
        if (Math.abs(v) < vMax * 0.08 || !trongCho(y)) return;
        g += nhan(X(v) + (v >= 0 ? 2 : -2), y + co * 0.35, so(v), co * 0.9, v >= 0 ? 1 : -1, xT, xP, '#4b5563');
        daGhi.push(y);
      });
    });
    g += chu(3, H - 4, 'z ' + so(zMax, 1) + ' → ' + so(zMin, 1) + ' m', { co: f1(Math.max(7, co * 0.85)), mau: '#6b7280' });
    return khung(W, H, g);
  }

  // Màu theo giá trị: âm xanh dương – 0 trắng – dương đỏ
  function mauGiaTri(v, lon) {
    var t = lon ? Math.max(-1, Math.min(1, v / lon)) : 0, a = Math.abs(t);
    var tu = [255, 255, 255], den = t >= 0 ? [215, 48, 39] : [49, 54, 149];
    var c = tu.map(function (x, i) { return Math.round(x + (den[i] - x) * a); });
    return 'rgb(' + c.join(',') + ')';
  }

  /** Bản đồ một thành phần nội lực tấm đài (giá trị bao tại nút) trên mặt bằng, kèm cọc, giá trị lớn nhất / nhỏ nhất. */
  function panelDai(m, nutBao, thanhPhan, chiSo, ox, oy, w, h, tieuDe) {
    var t = m.thongSo, s = Math.min((w - 8) / t.X, (h - 46) / t.Y), g = '';
    var x0 = ox + (w - t.X * s) / 2, y0 = oy + 18;
    var X = function (x) { return x0 + (x + t.X / 2) * s; }, Y = function (y) { return y0 + (t.Y / 2 - y) * s; };
    var tim = {};
    nutBao.forEach(function (n) { tim[n.x.toFixed(4) + '|' + n.y.toFixed(4)] = n; });
    function gt(x, y) { var n = tim[x.toFixed(4) + '|' + y.toFixed(4)]; return n ? (chiSo === 'abs' ? (Math.abs(n[thanhPhan][0]) > Math.abs(n[thanhPhan][1]) ? n[thanhPhan][0] : n[thanhPhan][1]) : n[thanhPhan][chiSo]) : null; }
    var lon = 0, vMax = null, vMin = null;
    nutBao.forEach(function (n) {
      var v = chiSo === 'abs' ? (Math.abs(n[thanhPhan][0]) > Math.abs(n[thanhPhan][1]) ? n[thanhPhan][0] : n[thanhPhan][1]) : n[thanhPhan][chiSo];
      lon = Math.max(lon, Math.abs(v));
      if (!vMax || v > vMax.v) vMax = { v: v, x: n.x, y: n.y };
      if (!vMin || v < vMin.v) vMin = { v: v, x: n.x, y: n.y };
    });
    for (var i = 0; i < m.xs.length - 1; i++) {
      for (var k = 0; k < m.ys.length - 1; k++) {
        var v = [gt(m.xs[i], m.ys[k]), gt(m.xs[i + 1], m.ys[k]), gt(m.xs[i + 1], m.ys[k + 1]), gt(m.xs[i], m.ys[k + 1])].filter(function (a) { return a !== null; });
        if (!v.length) continue;
        var tb = v.reduce(function (a, b) { return a + b; }, 0) / v.length;
        g += '<rect x="' + f1(X(m.xs[i])) + '" y="' + f1(Y(m.ys[k + 1])) + '" width="' + f1((m.xs[i + 1] - m.xs[i]) * s + 0.3) + '" height="' + f1((m.ys[k + 1] - m.ys[k]) * s + 0.3) +
          '" fill="' + mauGiaTri(tb, lon) + '"/>';
      }
    }
    g += '<rect x="' + f1(X(-t.X / 2)) + '" y="' + f1(Y(t.Y / 2)) + '" width="' + f1(t.X * s) + '" height="' + f1(t.Y * s) + '" fill="none" stroke="#111827" stroke-width="1.2"/>';
    m.coc.forEach(function (c) { g += '<circle cx="' + f1(X(c.x)) + '" cy="' + f1(Y(c.y)) + '" r="' + f1(t.D / 2 * s) + '" fill="none" stroke="#111827" stroke-dasharray="3 2"/>'; });
    [vMax, vMin].forEach(function (p, j) {
      if (!p) return;
      // nhãn nằm trong tấm: điểm ở nửa phải → chữ bên trái, điểm ở nửa dưới → chữ phía trên
      var xp = X(p.x), yp = Y(p.y), phai = p.x > 1e-9, tren = p.y < -1e-9 || (Math.abs(p.y) <= 1e-9 && j === 1);
      g += '<circle cx="' + f1(xp) + '" cy="' + f1(yp) + '" r="2.5" fill="#111827"/>' +
        '<text x="' + f1(xp + (phai ? -4 : 4)) + '" y="' + f1(yp + (tren ? -5 : 13)) + '" ' + FONT + ' font-size="10.5" font-weight="bold" fill="#111827"' +
        (phai ? ' text-anchor="end"' : '') + ' stroke="#ffffff" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke">' + esc(so(p.v, 1)) + '</text>';
    });
    g += chu(ox + w / 2, oy + 12, tieuDe, { giua: true, dam: true, co: 11, mau: '#1f2937' });
    g += chu(ox + w / 2, Y(-t.Y / 2) + 13, 'lớn nhất ' + so(vMax.v, 1) + '; nhỏ nhất ' + so(vMin.v, 1), { giua: true, co: 10, mau: '#4b5563' });
    return g;
  }

  /** Mômen (M11, M22 – bao max/min) hoặc lực cắt (V13, V23) tấm đài, đơn vị trên 1 m bề rộng. */
  function noiLucDai(m, nutBao, loai, kichThuoc) {
    var W = (kichThuoc && kichThuoc.w) || 560;
    if (loai === 'cat') {
      var H1 = (kichThuoc && kichThuoc.h) || 290;
      return khung(W, H1, panelDai(m, nutBao, 'V13', 'abs', 10, 26, W / 2 - 20, H1 - 40, 'V13 (kN/m) – bao') +
        panelDai(m, nutBao, 'V23', 'abs', W / 2 + 10, 26, W / 2 - 20, H1 - 40, 'V23 (kN/m) – bao'), 'LỰC CẮT TẤM ĐÀI (ETABS)');
    }
    var H = (kichThuoc && kichThuoc.h) || 560, h = (H - 40) / 2;
    return khung(W, H, panelDai(m, nutBao, 'M11', 1, 10, 26, W / 2 - 20, h, 'M11 max (kNm/m)') +
      panelDai(m, nutBao, 'M11', 0, W / 2 + 10, 26, W / 2 - 20, h, 'M11 min (kNm/m)') +
      panelDai(m, nutBao, 'M22', 1, 10, 26 + h, W / 2 - 20, h, 'M22 max (kNm/m)') +
      panelDai(m, nutBao, 'M22', 0, W / 2 + 10, 26 + h, W / 2 - 20, h, 'M22 min (kNm/m)'), 'MÔMEN TẤM ĐÀI (ETABS, M > 0: thớ dưới kéo)');
  }

  /** Chuyển vị ngang (tổ hợp bất lợi của từng nút) tại tâm đài và đầu cọc – mặt bằng, mũi tên Ux, Uy. */
  function chuyenViDai(m, cv, kichThuoc) {
    var W = (kichThuoc && kichThuoc.w) || 480, H = (kichThuoc && kichThuoc.h) || 400, t = m.thongSo;
    var s = Math.min((W - 120) / t.X, (H - 120) / t.Y), g = '';
    var X = function (x) { return W / 2 + x * s; }, Y = function (y) { return H / 2 + 10 - y * s; };
    g += '<rect x="' + f1(X(-t.X / 2)) + '" y="' + f1(Y(t.Y / 2)) + '" width="' + f1(t.X * s) + '" height="' + f1(t.Y * s) + '" fill="#ecfdf5" stroke="#2f855a" stroke-width="1.5"/>';
    m.coc.forEach(function (c) { g += '<circle cx="' + f1(X(c.x)) + '" cy="' + f1(Y(c.y)) + '" r="' + f1(t.D / 2 * s) + '" fill="#dbeafe" stroke="#1d4ed8"/>' + chu(X(c.x), Y(c.y) + 4, c.ten, { giua: true, co: 10, mau: '#1d4ed8' }); });
    var lon = 0;
    cv.nut.forEach(function (n) { if (n.Delta) lon = Math.max(lon, n.Delta.gt); });
    cv.nut.forEach(function (n, i) {
      if (!n.Delta) return;
      var vt = i === 0 ? { x: 0, y: 0 } : m.coc[i - 1], ux = n.Delta.U1 || 0, uy = n.Delta.U2 || 0, d = Math.hypot(ux, uy) || 1;
      var l = 30 + 40 * (lon ? n.Delta.gt / lon : 0);
      var x1 = X(vt.x), y1 = Y(vt.y), x2 = x1 + ux / d * l, y2 = y1 - uy / d * l;
      g += muiTen(x1, y1, x2, y2, '#dc2626', 2);
      g += chu(x2 + (ux >= 0 ? 4 : -4), y2 + (uy >= 0 ? -4 : 12), 'Δ = ' + so(n.Delta.gt, 2) + ' mm', { co: 10, dam: true, mau: '#b91c1c', phai: ux < 0 });
    });
    g += chu(12, H - 26, 'Mũi tên: hướng chuyển vị ngang (Ux, Uy) ở tổ hợp bất lợi của từng nút', { co: 10, mau: '#6b7280' }) +
      chu(12, H - 12, 'Δmax = ' + so(cv.DeltaMax ? cv.DeltaMax.gt : null, 2) + ' mm; ψmax = ' + so(cv.psiMax ? cv.psiMax.gt : null, 4) + '°', { co: 10, mau: '#6b7280' });
    return khung(W, H, g, 'CHUYỂN VỊ NGANG TÂM ĐÀI VÀ ĐẦU CỌC (ETABS)');
  }

  /** Nội lực dầm giằng dọc dầm: M3, V2, P, M2 (bao max – xanh, min – đỏ). */
  function noiLucDam(d, kichThuoc) {
    var W = (kichThuoc && kichThuoc.w) || 560, H = (kichThuoc && kichThuoc.h) || 380;
    var ds = d.tram || [], g = '';
    if (!ds.length) return khung(W, H, chu(W / 2, H / 2, 'Chưa có số liệu', { giua: true }));
    var L = ds[ds.length - 1].x || 1;
    function panel(tp, dv, ox, oy, w, h) {
      var lon = 0;
      ds.forEach(function (r) { lon = Math.max(lon, Math.abs(r[tp][0]), Math.abs(r[tp][1])); });
      var X = function (x) { return ox + 24 + x / L * (w - 48); }, Y = function (v) { return oy + 32 + (h - 52) / 2 - (lon ? v / lon : 0) * (h - 52) / 2; };
      var out = '<line x1="' + f1(X(0)) + '" y1="' + f1(Y(0)) + '" x2="' + f1(X(L)) + '" y2="' + f1(Y(0)) + '" stroke="#111827" stroke-width="1.4"/>';
      [[1, '#22c55e', '#15803d'], [0, '#ef4444', '#b91c1c']].forEach(function (k) {
        var pts = ds.map(function (r) { return f1(X(r.x)) + ',' + f1(Y(r[tp][k[0]])); });
        out += '<polygon points="' + f1(X(0)) + ',' + f1(Y(0)) + ' ' + pts.join(' ') + ' ' + f1(X(L)) + ',' + f1(Y(0)) + '" fill="' + k[1] + '" fill-opacity="0.45" stroke="' + k[2] + '" stroke-width="0.8"/>';
        ds.forEach(function (r, i) {
          if (i && i !== ds.length - 1 && i !== Math.floor(ds.length / 2)) return;
          var v = r[tp][k[0]];
          if (Math.abs(v) < lon * 0.03) return;
          out += '<text x="' + f1(X(r.x) + (i === ds.length - 1 ? -2 : 2)) + '" y="' + f1(Y(v) + (v >= 0 ? -3 : 11)) + '" ' + FONT + ' font-size="10" fill="' + k[2] + '"' +
            (i === ds.length - 1 ? ' text-anchor="end"' : i ? ' text-anchor="middle"' : '') + ' stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke">' + esc(so(v, 1)) + '</text>';
        });
      });
      out += chu(ox + w / 2, oy + 12, tp + ' (' + dv + ')', { giua: true, dam: true, co: 11, mau: '#1f2937' });
      return out;
    }
    var w = W / 2, h = (H - 40) / 2;
    g += panel('M3', 'kNm', 0, 24, w, h) + panel('V2', 'kN', w, 24, w, h) + panel('P', 'kN', 0, 24 + h, w, h) + panel('M2', 'kNm', w, 24 + h, w, h);
    g += chu(10, H - 6, 'Xanh: bao lớn nhất; đỏ: bao nhỏ nhất; trục ngang: dọc dầm (L = ' + so(L, 2) + ' m)', { co: 10, mau: '#6b7280' });
    return khung(W, H, g, 'NỘI LỰC DẦM ' + d.ten + ' (ETABS)');
  }

  /**
   * Mọi hình ETABS của thuyết minh: [[khoá, svg, rộng, cao]]. Khoá trùng tên thuyết minh dùng (hinh.etabsMoHinh3D, hinh.etabsBao_min_P, …).
   * E = { m: mô hình, t: tải trọng, kE: kết quả kiểm tra ETABS }.
   */
  function hinhThuyetMinh(E) {
    var ds = [];
    ds.push(['etabsMoHinh3D', moHinh3D(E.m, { w: 560, h: 600 }), 560, 600]);
    [['FX1', 'FY1', 'FZ1'], ['MX1', 'MY1', 'MZ1'], ['FX2', 'FY2', 'FZ2'], ['MX2', 'MY2']].forEach(function (nh, i) {
      ds.push(['etabsTai' + (i + 1), taiTrongDai(E.m, E.t.mauTai, nh, { w: 480, h: 320 }), 480, 320]);
    });
    ['min', 'max'].forEach(function (loai) {
      ['P', 'M2', 'M3', 'V2', 'V3'].forEach(function (tp) {
        ds.push(['etabsBao_' + loai + '_' + tp, noiLucCocBao(E.kE.coc, tp, loai, { w: 120, h: 456 }), 120, 456]);
      });
    });
    if (E.kE.dai && E.kE.dai.nutBao && E.kE.dai.nutBao.length) {
      ds.push(['etabsMomenDai', noiLucDai(E.m, E.kE.dai.nutBao, 'momen', { w: 560, h: 560 }), 560, 560]);
      ds.push(['etabsCatDai', noiLucDai(E.m, E.kE.dai.nutBao, 'cat', { w: 560, h: 290 }), 560, 290]);
    }
    if (E.kE.chuyenVi) ds.push(['etabsChuyenVi', chuyenViDai(E.m, E.kE.chuyenVi, { w: 480, h: 400 }), 480, 400]);
    (E.kE.damGiang || []).forEach(function (d) {
      if (d.hopLe && d.tram) ds.push(['dam_' + d.ten, noiLucDam(d, { w: 560, h: 380 }), 560, 380]);
    });
    return ds;
  }

  MCT.bieuDoEtabs = { hinhThuyetMinh: hinhThuyetMinh, moHinh3D: moHinh3D, taiTrongDai: taiTrongDai, noiLucCocBao: noiLucCocBao, noiLucDai: noiLucDai, chuyenViDai: chuyenViDai, noiLucDam: noiLucDam };
})(globalThis.MCT = globalThis.MCT || {});
