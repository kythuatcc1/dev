// Biểu đồ SVG dùng chung cho giao diện và thuyết minh (định dạng viết thẳng trong SVG để
// trình duyệt có thể chuyển thành ảnh PNG chèn vào file Word).
(function (MCT) {
  'use strict';

  var CHU = 'font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#4b5563"';
  var LUOI = 'stroke="#e3e7ee" stroke-width="1"';
  var TRUC = 'stroke="#8a93a3" stroke-width="1"';

  function soGon(v) {
    var s = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');   // chỉ bỏ số 0 sau dấu thập phân
    return s === '-0' ? '0' : s;
  }
  // Bước chia "đẹp" cho trục
  function buoc(khoang, soVach) {
    var tho = khoang / (soVach || 6);
    var mu = Math.pow(10, Math.floor(Math.log10(tho)));
    var t = tho / mu;
    return (t <= 1 ? 1 : t <= 2 ? 2 : t <= 2.5 ? 2.5 : t <= 5 ? 5 : 10) * mu;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function khung(W, H, noiDung, tieuDe) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>' +
      (tieuDe ? '<text x="' + W / 2 + '" y="18" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#1f2937">' +
        esc(tieuDe) + '</text>' : '') + noiDung + '</svg>';
  }

  // Nội lực dọc thân cọc: trục đứng z (m, âm xuống), trục ngang giá trị
  function noiLuc(bang, k, tieuDe, nhanTruc, mau, kichThuoc) {
    var W = (kichThuoc && kichThuoc.w) || 300, H = (kichThuoc && kichThuoc.h) || 380;
    var l = 46, r = 14, t = 34, b = 34;
    var zMin = Math.min.apply(null, bang.map(function (x) { return x.z; }));
    var vMin = Math.min(0, Math.min.apply(null, bang.map(function (x) { return x[k]; })));
    var vMax = Math.max(0, Math.max.apply(null, bang.map(function (x) { return x[k]; })));
    var st = buoc(vMax - vMin || 1, 5);
    vMin = Math.floor(vMin / st) * st; vMax = Math.ceil(vMax / st) * st;
    if (vMax === vMin) vMax = vMin + st;
    var zSt = buoc(-zMin || 1, 6);
    var zDay = Math.floor(zMin / zSt) * zSt;
    var X = function (v) { return l + (v - vMin) / (vMax - vMin) * (W - l - r); };
    var Y = function (z) { return t + z / zDay * (H - t - b); };
    var s = '';
    for (var v = vMin; v <= vMax + 1e-9; v += st) {
      s += '<line x1="' + X(v) + '" y1="' + t + '" x2="' + X(v) + '" y2="' + (H - b) + '" ' + LUOI + '/>' +
        '<text x="' + X(v) + '" y="' + (t - 6) + '" text-anchor="middle" ' + CHU + '>' + soGon(v) + '</text>';
    }
    for (var z = 0; z >= zDay - 1e-9; z -= zSt) {
      s += '<line x1="' + l + '" y1="' + Y(z) + '" x2="' + (W - r) + '" y2="' + Y(z) + '" ' + LUOI + '/>' +
        '<text x="' + (l - 5) + '" y="' + (Y(z) + 4) + '" text-anchor="end" ' + CHU + '>' + soGon(z) + '</text>';
    }
    s += '<line x1="' + X(0) + '" y1="' + t + '" x2="' + X(0) + '" y2="' + (H - b) + '" ' + TRUC + '/>';
    var pts = bang.map(function (x) { return X(x[k]).toFixed(1) + ',' + Y(x.z).toFixed(1); });
    s += '<polygon points="' + X(0) + ',' + Y(bang[0].z) + ' ' + pts.join(' ') + ' ' + X(0) + ',' + Y(bang[bang.length - 1].z) +
      '" fill="' + mau + '" fill-opacity="0.15" stroke="none"/>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + mau + '" stroke-width="1.8"/>';
    bang.forEach(function (x) { s += '<circle cx="' + X(x[k]).toFixed(1) + '" cy="' + Y(x.z).toFixed(1) + '" r="2" fill="' + mau + '"/>'; });
    s += '<text x="' + ((l + W - r) / 2) + '" y="' + (H - 10) + '" text-anchor="middle" ' + CHU + '>' + esc(nhanTruc) + '</text>' +
      '<text x="12" y="' + ((t + H - b) / 2) + '" text-anchor="middle" transform="rotate(-90 12 ' + ((t + H - b) / 2) + ')" ' + CHU + '>z (m)</text>';
    return khung(W, H, s, tieuDe);
  }

  // SPT theo độ sâu kèm ranh giới lớp và mực nước ngầm
  function spt(dc, kichThuoc) {
    var ds = dc.sptTheoDoSau;
    var W = (kichThuoc && kichThuoc.w) || 360, H = (kichThuoc && kichThuoc.h) || 520;
    var l = 48, r = 16, t = 40, b = 16;
    var sMax = Math.max(10, Math.ceil(Math.max.apply(null, ds.map(function (x) { return x.spt; })) / 10) * 10);
    var zMin = Math.min(dc.caoDoDay, ds.length ? ds[ds.length - 1].doSau : dc.caoDoDay);
    var X = function (v) { return l + v / sMax * (W - l - r); };
    var Y = function (z) { return t + (0 - z) / (0 - zMin) * (H - t - b); };
    var s = '';
    for (var v = 0; v <= sMax; v += 10) {
      s += '<line x1="' + X(v) + '" y1="' + t + '" x2="' + X(v) + '" y2="' + (H - b) + '" ' + LUOI + '/>' +
        '<text x="' + X(v) + '" y="' + (t - 6) + '" text-anchor="middle" ' + CHU + '>' + v + '</text>';
    }
    dc.lop.forEach(function (lp) {
      s += '<line x1="' + l + '" y1="' + Y(lp.dinh) + '" x2="' + (W - r) + '" y2="' + Y(lp.dinh) + '" ' + TRUC + '/>' +
        '<text x="' + (W - r - 4) + '" y="' + (Y(lp.dinh) + 13) + '" text-anchor="end" ' + CHU + '>Lớp ' + esc(lp.ten) + '</text>' +
        '<text x="' + (l - 6) + '" y="' + (Y(lp.dinh) + 4) + '" text-anchor="end" ' + CHU + '>' + soGon(lp.dinh) + '</text>';
    });
    s += '<line x1="' + l + '" y1="' + Y(dc.caoDoDay) + '" x2="' + (W - r) + '" y2="' + Y(dc.caoDoDay) + '" ' + TRUC + '/>' +
      '<text x="' + (l - 6) + '" y="' + (Y(dc.caoDoDay) + 4) + '" text-anchor="end" ' + CHU + '>' + soGon(dc.caoDoDay) + '</text>';
    if (isFinite(dc.MNN)) {
      s += '<line x1="' + l + '" y1="' + Y(dc.MNN) + '" x2="' + (W - r) + '" y2="' + Y(dc.MNN) + '" stroke="#2b7bd8" stroke-width="1.2" stroke-dasharray="5 4"/>' +
        '<text x="' + (l + 4) + '" y="' + (Y(dc.MNN) - 4) + '" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#2b7bd8">MNN ' + soGon(dc.MNN) + '</text>';
    }
    if (ds.length) {
      s += '<polyline points="' + ds.map(function (x) { return X(x.spt).toFixed(1) + ',' + Y(x.doSau).toFixed(1); }).join(' ') +
        '" fill="none" stroke="#0a58a8" stroke-width="1.8"/>';
      ds.forEach(function (x) { s += '<circle cx="' + X(x.spt).toFixed(1) + '" cy="' + Y(x.doSau).toFixed(1) + '" r="2.6" fill="#0a58a8"/>'; });
    }
    s += '<text x="' + ((l + W - r) / 2) + '" y="16" text-anchor="middle" ' + CHU + '>Chỉ số SPT (N) – hố khoan ' + esc(dc.hoKhoan) + '</text>';
    return khung(W, H, s);
  }

  // Biểu đồ tương tác N–M (đối xứng qua trục N) + điểm nội lực
  function tuongTac(tt, kichThuoc) {
    var W = (kichThuoc && kichThuoc.w) || 460, H = (kichThuoc && kichThuoc.h) || 420;
    var l = 64, r = 16, t = 34, b = 40;
    var bao = [{ M: 0, N: tt.NTrend }].concat(tt.diem);
    var Mm = Math.max.apply(null, bao.map(function (p) { return p.M; }).concat(tt.diemNoiLuc.map(function (p) { return Math.abs(p.M); })));
    var Nmin = Math.min.apply(null, bao.map(function (p) { return p.N; }).concat(tt.diemNoiLuc.map(function (p) { return p.N; })));
    var Nmax = Math.max.apply(null, bao.map(function (p) { return p.N; }).concat(tt.diemNoiLuc.map(function (p) { return p.N; })));
    var sM = buoc(2 * Mm, 6), sN = buoc(Nmax - Nmin, 8);
    var m0 = -Math.ceil(Mm / sM) * sM, m1 = -m0, n0 = Math.floor(Nmin / sN) * sN, n1 = Math.ceil(Nmax / sN) * sN;
    var X = function (m) { return l + (m - m0) / (m1 - m0) * (W - l - r); };
    var Y = function (n) { return t + (n1 - n) / (n1 - n0) * (H - t - b); };
    var s = '', v;
    for (v = m0; v <= m1 + 1e-9; v += sM) {
      s += '<line x1="' + X(v) + '" y1="' + t + '" x2="' + X(v) + '" y2="' + (H - b) + '" ' + LUOI + '/>' +
        '<text x="' + X(v) + '" y="' + (H - b + 14) + '" text-anchor="middle" ' + CHU + '>' + soGon(v) + '</text>';
    }
    for (v = n0; v <= n1 + 1e-9; v += sN) {
      s += '<line x1="' + l + '" y1="' + Y(v) + '" x2="' + (W - r) + '" y2="' + Y(v) + '" ' + LUOI + '/>' +
        '<text x="' + (l - 5) + '" y="' + (Y(v) + 4) + '" text-anchor="end" ' + CHU + '>' + soGon(v) + '</text>';
    }
    s += '<line x1="' + X(0) + '" y1="' + t + '" x2="' + X(0) + '" y2="' + (H - b) + '" ' + TRUC + '/>' +
      '<line x1="' + l + '" y1="' + Y(0) + '" x2="' + (W - r) + '" y2="' + Y(0) + '" ' + TRUC + '/>';
    s += '<polyline points="' + bao.map(function (p) { return X(p.M).toFixed(1) + ',' + Y(p.N).toFixed(1); }).join(' ') +
      '" fill="none" stroke="#2a9bb8" stroke-width="2"/>' +
      '<polyline points="' + bao.map(function (p) { return X(-p.M).toFixed(1) + ',' + Y(p.N).toFixed(1); }).join(' ') +
      '" fill="none" stroke="#e8893a" stroke-width="2"/>';
    tt.diemNoiLuc.forEach(function (p) {
      var x = X(p.M), y = Y(p.N);
      s += '<path d="M' + x + ' ' + (y - 6) + ' L' + (x + 6) + ' ' + y + ' L' + x + ' ' + (y + 6) + ' L' + (x - 6) + ' ' + y + ' Z" fill="#e02424"/>';
    });
    s += '<text x="' + ((l + W - r) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" ' + CHU + '>M (kNm)</text>' +
      '<text x="14" y="' + ((t + H - b) / 2) + '" text-anchor="middle" transform="rotate(-90 14 ' + ((t + H - b) / 2) + ')" ' + CHU + '>N (kN)</text>';
    return khung(W, H, s, 'BIỂU ĐỒ TƯƠNG TÁC');
  }

  MCT.bieuDo = { noiLuc: noiLuc, spt: spt, tuongTac: tuongTac };
})(globalThis.MCT = globalThis.MCT || {});
