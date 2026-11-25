// Mặt cắt móng cẩu tháp và địa chất: cao độ MĐTN, mực nước ngầm, đáy hố đào, các lớp đất (ghi chú tên, loại đất, chiều dày,
// SPT, hệ số nền k), đài (mặt, đáy, H), cọc (đầu, mũi, D, L), dầm giằng, cẩu tháp và điểm đặt lực. Dùng ở trang Mô hình ETABS,
// trang Địa chất và thuyết minh (cả hai phương pháp). Tỉ lệ ngang phóng to so với tỉ lệ đứng để thấy rõ đài và cọc.
(function (MCT) {
  'use strict';

  var FONT = 'font-family="Arial, Helvetica, sans-serif"';
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function so(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '-';
    var s = Number(v).toFixed(d === undefined ? 2 : d);
    return /^-0(\.0*)?$/.test(s) ? s.slice(1) : s;
  }
  function caoDo(v) { return (v > 1e-9 ? '+' : v < -1e-9 ? '' : '±') + so(v, 2); }
  function chu(x, y, text, o) {
    o = o || {};
    return '<text x="' + f1(x) + '" y="' + f1(y) + '" ' + FONT + ' font-size="' + (o.co || 11) + '" fill="' + (o.mau || '#1f2937') + '"' +
      (o.giua ? ' text-anchor="middle"' : o.phai ? ' text-anchor="end"' : '') + (o.dam ? ' font-weight="bold"' : '') + (o.nghieng ? ' font-style="italic"' : '') +
      (o.vien ? ' stroke="#ffffff" stroke-width="3" stroke-linejoin="round" paint-order="stroke"' : '') + '>' + esc(text) + '</text>';
  }
  function duong(x1, y1, x2, y2, mau, rong, net) {
    return '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" stroke="' + mau + '" stroke-width="' + (rong || 1) + '"' +
      (net ? ' stroke-dasharray="' + net + '"' : '') + '/>';
  }

  // Màu và mẫu tô theo loại đất: cát chấm, sét gạch chéo
  var MAU_DAT = { 'Cát': ['#f6e7b4', 'cham'], 'Cát pha': ['#eedcae', 'cham'], 'Sét pha': ['#dccbb0', 'gach'], 'Sét': ['#cdb79a', 'gach'] };
  function mauDat(loai, i) {
    var m = MAU_DAT[loai] || ['#e5e7eb', ''];
    return { nen: i % 2 ? m[0] : toi(m[0], 0.94), mau: m[1] };
  }
  function toi(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = Math.round((n >> 16) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * Số liệu cho hình mặt cắt từ trạng thái app và kết quả tính; m (tuỳ chọn) = mô hình ETABS (dầm giằng, điểm đặt lực).
   * Trả null nếu thiếu số liệu địa chất / cọc / đài.
   */
  function duLieuMatCat(s, kq, m) {
    var DC = kq && kq.DC, S = kq && kq.SCT, A = kq && kq.A, B = kq && kq.B;
    if (!DC || !DC.hopLe || !S || !S.coc || !A || !A.dai) return null;
    var c = S.coc, H = Number(A.dai.H);
    var coc = B && B.hopLe ? B.coc.map(function (p, i) { return { ten: 'C' + (p.stt || i + 1), x: p.x, y: p.y }; }) : [];
    var dam = [];
    if (m && m.hopLe) {
      (m.dam || []).forEach(function (d) {
        var c1 = m.coc.filter(function (p) { return p.ten === d.tuCoc; })[0], c2 = m.coc.filter(function (p) { return p.ten === d.denCoc; })[0];
        if (c1 && c2) dam.push({ ten: d.ten, x1: Math.min(c1.x, c2.x), x2: Math.max(c1.x, c2.x), z: d.z, h: d.h });
      });
    }
    var t = m && m.hopLe ? m.thongSo : null;
    return {
      hoKhoan: DC.hoKhoan, MNN: DC.MNN, dayDiaChat: DC.caoDoDay,
      lop: DC.lop.map(function (l) {
        return { ten: l.ten, loai: l.loai, tinhChat: l.tinhChat, IL: l.IL, dinh: l.dinh, day: l.day, spt: l.spt, k: l.k };
      }),
      dai: { X: Number(A.dai.X), Y: Number(A.dai.Y), H: H, zDay: c.dayDai, zMat: c.dayDai + H },
      cocTs: { D: c.D, L: c.L, dau: c.dauCocThucTe, mui: c.muiCoc, dayHo: c.dayHo, dauTinhToan: c.dauCocTinhToan },
      coc: coc, dam: dam,
      cau: { ten: A.cau && A.cau.ten ? A.cau.ten : (s && s.cau ? s.cau.ten : ''), Ht: Number(A.Ht) || 0 },
      diemDat: t ? { x: t.xc || 0, kieu: t.diemDatLuc, Ht: t.Ht } : null,
      batDauLoXo: t ? t.batDauLoXo : (s && s.etabs ? s.etabs.batDauLoXo : 'day-dai'),
      zLoXo: t ? t.zBatDau : null
    };
  }

  /** Hình mặt cắt (SVG). d = duLieuMatCat(...). */
  function matCat(d, kichThuoc) {
    var W = (kichThuoc && kichThuoc.w) || 780, H = (kichThuoc && kichThuoc.h) || 800;
    if (!d) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' 60" width="' + W + '" height="60"><rect width="100%" height="100%" fill="#fff"/>' +
      chu(W / 2, 34, 'Chưa đủ số liệu địa chất / cọc / đài để vẽ mặt cắt', { giua: true }) + '</svg>';
    var dai = d.dai, ts = d.cocTs;
    var zTren = Math.max(0, dai.zMat) + Math.max(1.2, 0.06 * (dai.zMat - ts.mui)) + 2;   // chừa chỗ cho thân cẩu
    var zDuoi = Math.max(d.dayDiaChat, ts.mui - Math.max(3, 0.12 * ts.L));
    var top = 40, bot = H - 54, ky = (bot - top) / (zTren - zDuoi);
    var Y = function (z) { return top + (zTren - z) * ky; };
    // Mặt cắt theo phương X: đài và cọc ở vùng giữa trái; bên phải ghi chú lớp đất
    var x0 = 96, x1 = W - 12, xMongTrai = x0 + 40, xMongPhai = Math.min(xMongTrai + 230, W * 0.5), xGhi = W - 240;
    var kx = (xMongPhai - xMongTrai) / Math.max(dai.X, 1e-6), xTam = (xMongTrai + xMongPhai) / 2;
    var X = function (x) { return xTam + x * kx; };
    var g = '<defs>' +
      '<pattern id="mc-cham" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.8" fill="#9a7b3c" fill-opacity="0.55"/><circle cx="6" cy="6" r="0.8" fill="#9a7b3c" fill-opacity="0.55"/></pattern>' +
      '<pattern id="mc-gach" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" stroke="#7c5f3d" stroke-opacity="0.35" stroke-width="1"/></pattern>' +
      '<pattern id="mc-bt" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#6b7280" stroke-opacity="0.45" stroke-width="0.8"/></pattern>' +
      '</defs>';

    // ---- Lớp đất ----
    var nhanTrai = [];   // [z, nhãn] cho thước cao độ
    var dsLop = d.lop.filter(function (l) { return l.dinh > zDuoi; });
    dsLop.forEach(function (l, i) {
      var y1 = Y(Math.min(l.dinh, zTren)), y2 = Y(Math.max(l.dinh - l.day, zDuoi)), md = mauDat(l.loai, i);
      g += '<rect x="' + x0 + '" y="' + f1(y1) + '" width="' + f1(x1 - x0) + '" height="' + f1(y2 - y1) + '" fill="' + md.nen + '"/>';
      if (md.mau) g += '<rect x="' + x0 + '" y="' + f1(y1) + '" width="' + f1(x1 - x0) + '" height="' + f1(y2 - y1) + '" fill="url(#mc-' + md.mau + ')"/>';
      g += duong(x0, y1, x1, y1, '#8b6f47', 0.8, '5 3');
      nhanTrai.push([l.dinh, 'đỉnh lớp ' + l.ten]);
    });
    if (dsLop.length) {
      var cuoi = dsLop[dsLop.length - 1];
      if (cuoi.dinh - cuoi.day >= zDuoi) nhanTrai.push([cuoi.dinh - cuoi.day, 'đáy lớp ' + cuoi.ten]);
    }
    // mặt đất tự nhiên
    var yMd = Y(0);
    g += duong(x0, yMd, x1, yMd, '#4b5563', 1.6);
    for (var h = x0; h < x1 - 6; h += 10) g += duong(h, yMd, h + 6, yMd + 6, '#4b5563', 0.8);
    nhanTrai.push([0, 'MĐTN']);
    // mực nước ngầm
    if (isFinite(d.MNN) && d.MNN > zDuoi && d.MNN < zTren) {
      var yN = Y(d.MNN), xN = x0 + 10;   // ký hiệu mực nước ở dải trống bên trái móng
      g += duong(x0, yN, x1, yN, '#2563eb', 1.1, '8 4') +
        '<path d="M' + f1(xN - 6) + ' ' + f1(yN - 10) + ' h12 l-6 9 Z" fill="#ffffff" stroke="#2563eb" stroke-width="1.2"/>' +
        chu(xN + 8, yN - 3, 'MNN', { co: 11, mau: '#2563eb', dam: true, vien: true });
      nhanTrai.push([d.MNN, 'MNN']);
    }
    // đáy hố đào (đầu cọc tính toán) – thấp hơn đáy đài: đoạn cọc phía trên lộ ra khi đào
    if (isFinite(ts.dayHo) && ts.dayHo < dai.zDay - 1e-6 && ts.dayHo > zDuoi) {
      var yH = Y(ts.dayHo);
      g += duong(x0, yH, x1, yH, '#b45309', 1.3, '10 3 2 3') +
        chu(xMongPhai + 8, yH - 4, 'Đáy hố đào ' + caoDo(ts.dayHo), { co: 11, mau: '#b45309', vien: true }) +
        (d.batDauLoXo === 'day-ho' ? chu(xMongPhai + 8, yH + 12, '(lò xo đất bắt đầu)', { co: 11, mau: '#b45309', vien: true }) : '');
      nhanTrai.push([ts.dayHo, 'đáy hố đào']);
    }

    // ---- Cọc (chiếu lên mặt cắt theo X; cọc cùng x vẽ chung) ----
    var theoX = {};
    d.coc.forEach(function (p) { var k = so(p.x, 3); (theoX[k] = theoX[k] || { x: p.x, ten: [] }).ten.push(p.ten); });
    var rongCoc = Math.max(ts.D * kx, 4);
    Object.keys(theoX).forEach(function (k) {
      var c = theoX[k], xc = X(c.x), y1 = Y(ts.dau), y2 = Y(ts.mui);
      g += '<rect x="' + f1(xc - rongCoc / 2) + '" y="' + f1(y1) + '" width="' + f1(rongCoc) + '" height="' + f1(y2 - y1) + '" fill="#9ca3af" stroke="#374151" stroke-width="1"/>' +
        '<rect x="' + f1(xc - rongCoc / 2) + '" y="' + f1(y1) + '" width="' + f1(rongCoc) + '" height="' + f1(y2 - y1) + '" fill="url(#mc-bt)"/>';
      g += chu(xc, y2 + 13, c.ten.join(', '), { giua: true, co: 10, dam: true, mau: '#1d4ed8', vien: true });
    });
    nhanTrai.push([ts.mui, 'mũi cọc']);

    // ---- Dầm giằng ----
    d.dam.forEach(function (dm) {
      var y1 = Y(dm.z + dm.h / 2), y2 = Y(dm.z - dm.h / 2);
      g += '<rect x="' + f1(X(dm.x1)) + '" y="' + f1(y1) + '" width="' + f1(Math.max(X(dm.x2) - X(dm.x1), 2)) + '" height="' + f1(Math.max(y2 - y1, 3)) +
        '" fill="#a16207" fill-opacity="0.75" stroke="#78350f" stroke-width="0.8"/>';
    });
    var zDam = {};
    d.dam.forEach(function (dm) { var k = so(dm.z, 3); (zDam[k] = zDam[k] || { z: dm.z, ten: [] }).ten.push(dm.ten); });
    Object.keys(zDam).forEach(function (k) {
      g += chu(xMongPhai + 8, Y(zDam[k].z) - 2, 'Dầm giằng ' + zDam[k].ten.join(', '), { co: 11, mau: '#78350f', vien: true }) +
        chu(xMongPhai + 8, Y(zDam[k].z) + 11, 'tim dầm ' + caoDo(zDam[k].z), { co: 11, mau: '#78350f', vien: true });
      nhanTrai.push([zDam[k].z, 'dầm giằng']);
    });

    // ---- Đài ----
    var yMat = Y(dai.zMat), yDay = Y(dai.zDay);
    g += '<rect x="' + f1(X(-dai.X / 2)) + '" y="' + f1(yMat) + '" width="' + f1(dai.X * kx) + '" height="' + f1(yDay - yMat) + '" fill="#d1d5db" stroke="#111827" stroke-width="1.4"/>' +
      '<rect x="' + f1(X(-dai.X / 2)) + '" y="' + f1(yMat) + '" width="' + f1(dai.X * kx) + '" height="' + f1(yDay - yMat) + '" fill="url(#mc-bt)"/>';
    g += chu(xTam, (yMat + yDay) / 2 + 4, 'ĐÀI ' + so(dai.X, 2) + ' × ' + so(dai.Y, 2) + ' × ' + so(dai.H, 2) + ' m', { giua: true, co: 12, dam: true, vien: true });
    nhanTrai.push([dai.zMat, 'mặt đài'], [dai.zDay, 'đáy đài']);
    // kích thước chiều cao đài, chiều dài cọc
    var xKt = X(dai.X / 2) + 16;
    g += duong(xKt, yMat, xKt, yDay, '#374151', 0.8) + duong(xKt - 4, yMat, xKt + 4, yMat, '#374151', 0.8) + duong(xKt - 4, yDay, xKt + 4, yDay, '#374151', 0.8) +
      chu(xKt + 6, (yMat + yDay) / 2 + 4, 'H = ' + so(dai.H, 2) + ' m', { co: 11, vien: true });
    var xL = X(dai.X / 2) + 16, yL1 = Y(ts.dau), yL2 = Y(ts.mui);
    g += duong(xL, yL1, xL, yL2, '#1d4ed8', 0.8) + duong(xL - 4, yL1, xL + 4, yL1, '#1d4ed8', 0.8) + duong(xL - 4, yL2, xL + 4, yL2, '#1d4ed8', 0.8) +
      chu(xL + 6, (yL1 + yL2) / 2, 'Cọc D' + so(ts.D * 1000, 0) + ', L = ' + so(ts.L, 2) + ' m', { co: 11, mau: '#1d4ed8', dam: true, vien: true }) +
      chu(xL + 6, (yL1 + yL2) / 2 + 13, 'mũi cọc ' + caoDo(ts.mui), { co: 11, mau: '#1d4ed8', vien: true });

    // ---- Cẩu tháp và điểm đặt lực ----
    var Ht = d.cau.Ht > 0 ? d.cau.Ht : Math.min(1.6, dai.X / 2), xC = d.diemDat ? d.diemDat.x : 0;
    var yThan = top + 4, xThan1 = X(xC - Ht / 2), xThan2 = X(xC + Ht / 2);
    g += '<rect x="' + f1(xThan1) + '" y="' + f1(yThan) + '" width="' + f1(xThan2 - xThan1) + '" height="' + f1(yMat - yThan) + '" fill="none" stroke="#374151" stroke-width="1.4"/>';
    for (var yy = yMat; yy > yThan + 6; yy -= (xThan2 - xThan1)) {
      var y2b = Math.max(yy - (xThan2 - xThan1), yThan);
      g += duong(xThan1, yy, xThan2, y2b, '#6b7280', 0.8) + duong(xThan2, yy, xThan1, y2b, '#6b7280', 0.8);
    }
    g += chu(xThan2 + 8, yThan + 12, 'Cẩu tháp ' + d.cau.ten + (d.cau.Ht > 0 ? ' (Ht = ' + so(d.cau.Ht, 2) + ' m)' : ''), { co: 11, dam: true, vien: true });
    if (d.diemDat) {
      var dsX = d.diemDat.kieu === 'chan' ? [xC - Ht / 2, xC + Ht / 2] : [xC];
      dsX.forEach(function (x) {
        var xa = X(x), ya = Y((dai.zMat + dai.zDay) / 2);
        g += duong(xa, yMat - 26, xa, ya - 6, '#dc2626', 2) + '<path d="M' + f1(xa) + ' ' + f1(ya) + ' l-5 -9 h10 Z" fill="#dc2626"/>';
      });
      g += chu(xThan2 + 8, yThan + 26, d.diemDat.kieu === 'chan' ? 'Lực cẩu chia về 4 chân (mô hình ETABS)' : 'Điểm đặt lực tại tâm cẩu (mô hình ETABS)', { co: 11, mau: '#dc2626', vien: true });
    }

    // ---- Ghi chú lớp đất (bên phải) ----
    var yDaGhi = -Infinity;
    dsLop.forEach(function (l) {
      var dinh = Math.min(l.dinh, zTren), day = Math.max(l.dinh - l.day, zDuoi), y1 = Y(dinh), y2 = Y(day), giua = (y1 + y2) / 2;
      var dong1 = 'Lớp ' + l.ten + ': ' + l.loai + (l.tinhChat ? ' ' + l.tinhChat.toLowerCase() : '') + (l.loai && /Sét/.test(l.loai) && l.IL ? ', IL = ' + so(l.IL, 2) : '');
      var dong2 = 'dày ' + so(l.day, 1) + ' m' + (l.spt !== null && l.spt !== undefined && isFinite(l.spt) ? '; N = ' + so(l.spt, 0) : '') +
        (l.k ? '; k = ' + Math.round(l.k) + ' kN/m⁴' : '');
      var hai = y2 - y1 >= 30;
      var y = Math.max(giua - (hai ? 3 : -4), yDaGhi + (hai ? 30 : 15));
      if (y > Math.min(y2, bot) + 10) return;   // lớp quá mỏng ở cuối hình
      g += chu(xGhi, y, dong1, { co: 12, dam: true, vien: true, mau: '#3f2d14' });
      if (hai) g += chu(xGhi, y + 14, dong2, { co: 11, vien: true, mau: '#3f2d14' });
      yDaGhi = y;
    });

    // ---- Thước cao độ bên trái ----
    var xTh = x0 - 6;
    g += duong(xTh, top, xTh, bot, '#6b7280', 1);
    var gop = {};
    nhanTrai.forEach(function (r) { if (r[0] < zDuoi - 1e-6 || r[0] > zTren + 1e-6) return; var k = so(r[0], 2); (gop[k] = gop[k] || { z: r[0], ten: [] }).ten.push(r[1]); });
    var yTruoc = -Infinity;
    Object.keys(gop).map(function (k) { return gop[k]; }).sort(function (a, b) { return b.z - a.z; }).forEach(function (r) {
      var y = Y(r.z), yc = Math.max(y + 4, yTruoc + 13);
      g += duong(xTh - 5, y, xTh, y, '#6b7280', 1);
      if (yc > y + 5) g += duong(xTh - 5, y, xTh - 8, yc - 4, '#9ca3af', 0.7);
      g += chu(xTh - 9, yc, caoDo(r.z), { phai: true, co: 10, mau: '#374151' });
      yTruoc = yc;
    });
    g += chu(xTh - 2, top - 8, 'Cao độ (m)', { phai: false, co: 10, mau: '#6b7280' });

    // ---- Tiêu đề, chú thích ----
    var tieuDe = 'MẶT CẮT MÓNG VÀ ĐỊA CHẤT' + (d.hoKhoan ? ' – HỐ KHOAN ' + d.hoKhoan : '');
    var ghiChu = 'Tỉ lệ ngang phóng to ×' + so(kx / ky, 1) + ' so với tỉ lệ đứng; cọc chiếu lên mặt cắt theo phương X. Cao độ so với MĐTN.';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>' + g +
      chu(W / 2, 20, tieuDe, { giua: true, dam: true, co: 14 }) +
      chu(12, H - 30, ghiChu, { co: 11, mau: '#6b7280' }) +
      chu(12, H - 15, 'Cát: chấm; sét: gạch chéo. N: chỉ số SPT trung bình; k: hệ số nền tỉ lệ (TCVN 10304:2025 bảng A.1).', { co: 11, mau: '#6b7280' }) +
      '</svg>';
  }

  MCT.bieuDo = MCT.bieuDo || {};
  MCT.bieuDo.matCat = matCat;
  MCT.bieuDo.duLieuMatCat = duLieuMatCat;
})(globalThis.MCT = globalThis.MCT || {});
