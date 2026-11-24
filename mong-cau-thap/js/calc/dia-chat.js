// Số liệu địa chất (sheet "SL Dia chat")
//   - Chiều dày lớp, chỉ số SPT trung bình từng lớp (AVERAGEIF theo tên lớp ở bảng SPT)
//   - Hệ số tỷ lệ k (bảng A.1 TCVN 10304:2025) theo hàm VBA Tinhk + NSXY
//   - Bảng SPT theo độ sâu, gán tên lớp như công thức cột V48:V97
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  // Nội suy song tuyến – chép đúng hàm VBA NSXY(Data_Range, x, y):
  // dòng 1 = giá trị x (từ cột 2), cột 1 = giá trị y (từ dòng 2). Ngoài phạm vi → null.
  function nsxy(bang, x, y) {
    var Nx = bang[0].length, Ny = bang.length;
    var a = function (i, j) { return bang[j - 1][i - 1]; };   // a(i, j) như VBA (i: cột, j: dòng)
    var xMax = a(2, 1), xMin = a(2, 1), yMax = a(1, 2), yMin = a(1, 2), i, j;
    for (i = 2; i <= Nx; i++) { if (xMax < a(i, 1)) xMax = a(i, 1); if (xMin > a(i, 1)) xMin = a(i, 1); }
    for (j = 2; j <= Ny; j++) { if (yMax < a(1, j)) yMax = a(1, j); if (yMin > a(1, j)) yMin = a(1, j); }
    if (x < xMin || x > xMax || y < yMin || y > yMax) return null;
    for (i = 2; i <= Nx - 1; i++) {
      if ((a(i, 1) <= x && x <= a(i + 1, 1)) || (a(i, 1) >= x && x >= a(i + 1, 1))) {
        for (j = 2; j <= Ny - 1; j++) {
          if ((a(1, j) <= y && y <= a(1, j + 1)) || (a(1, j) >= y && y >= a(1, j + 1))) {
            var k1 = a(i, j), k2 = a(i + 1, j), k3 = a(i, j + 1), k4 = a(i + 1, j + 1), k12, k34;
            if (a(i + 1, 1) - a(i, 1) === 0) { k12 = k1; k34 = k3; } else {
              k12 = k1 + (k2 - k1) * (x - a(i, 1)) / (a(i + 1, 1) - a(i, 1));
              k34 = k3 + (k4 - k3) * (x - a(i, 1)) / (a(i + 1, 1) - a(i, 1));
            }
            if (a(1, j + 1) - a(1, j) === 0) return k12;
            return k12 + (k34 - k12) * (y - a(1, j)) / (a(1, j + 1) - a(1, j));
          }
        }
      }
    }
    return null;
  }

  function kyHieu(ds, vi) {
    var t = String(vi || '').trim().toLowerCase();
    for (var i = 0; i < ds.length; i++) if (String(ds[i].vi).toLowerCase() === t) return ds[i].ky;
    return null;
  }

  // Hàm VBA Tinhk(LoaiDat, kthat, IL, e, …)
  function tinhK(kyLoai, kyKichThuoc, IL, e) {
    var K = MCT.data.bangTra.K;
    switch (kyLoai) {
      case 'S': case 'SP': return nsxy(K.SET, 1, IL);
      case 'CP': return nsxy(K.CPHA, 1, IL);
      default:
        switch (kyKichThuoc) {
          case 'B': return nsxy(K.CBUI, 1, e);
          case 'N': return nsxy(K.CNHO, 1, e);
          case 'V': return nsxy(K.CVUA, 1, e);
          case 'T': return nsxy(K.CTO, 1, e);
          default: return nsxy(K.CSAN, 1, e);
        }
    }
  }

  function laSo(v) { return typeof v === 'number' && isFinite(v); }

  /**
   * @param {object} dc { hoKhoan, MNN, lop: [{ ten, caoDoDinh, loai, tinhChat, kichThuoc, gamma, phi, c, IL, e, Sr }],
   *                      caoDoDay, sptBuoc, spt: [giá trị tại 0, −bước, −2·bước, …] }
   */
  function tinhDiaChat(dc) {
    var loi = [];
    var BT = MCT.data.bangTra;
    var dsLop = (dc && dc.lop || []).filter(function (l) { return String(l.ten || '').trim() !== ''; });
    if (!dsLop.length) loi.push('Chưa nhập lớp đất.');
    var tops = dsLop.map(function (l) { return Number(l.caoDoDinh); });
    var day = Number(dc && dc.caoDoDay);
    tops.forEach(function (t, i) { if (!laSo(t)) loi.push('Cao độ đỉnh lớp ' + dsLop[i].ten + ' không hợp lệ.'); });
    if (!laSo(day)) loi.push('Cao độ đáy lớp cuối không hợp lệ.');
    for (var i = 1; i < tops.length; i++) {
      if (tops[i] > tops[i - 1]) loi.push('Cao độ đỉnh lớp phải giảm dần (lớp ' + dsLop[i].ten + ').');
    }
    if (loi.length) return { hopLe: false, loi: loi };

    var mocs = tops.concat([day]);    // cột V30:V45 (đỉnh các lớp + đáy lớp cuối)

    // Lớp ứng với một cao độ: MATCH(d, V30:V44, -1) – giá trị nhỏ nhất ≥ d; trúng dòng đáy thì lùi 1 lớp
    function lopTaiCaoDo(d) {
      var vt = -1;
      for (var k = 0; k < mocs.length; k++) if (mocs[k] >= d) vt = k;
      if (vt < 0) return null;
      if (vt >= dsLop.length) vt = dsLop.length - 1;
      return dsLop[vt];
    }

    var buoc = Number(dc.sptBuoc) || 2;
    var sptTheoDoSau = (dc.spt || []).map(function (v, k) {
      var doSau = -k * buoc;
      var l = lopTaiCaoDo(doSau);
      return { doSau: doSau, spt: Number(v), lop: l ? String(l.ten) : null, loai: l ? l.loai : null };
    }).filter(function (r) { return laSo(r.spt); });

    var lop = dsLop.map(function (l, idx) {
      var ten = String(l.ten);
      var dsSpt = sptTheoDoSau.filter(function (r) { return r.lop === ten; }).map(function (r) { return r.spt; });
      var kyLoai = kyHieu(BT.kyHieuLoaiDat, l.loai);
      var laCatRoi = kyLoai === 'C';   // Excel: tính chất / kích thước hạt chỉ có với đất cát (không phải sét, sét pha, cát pha)
      var kyTinhChat = laCatRoi ? kyHieu(BT.kyHieuTinhChat, l.tinhChat) : null;
      var kyKichThuoc = laCatRoi ? kyHieu(BT.kyHieuKichThuoc, l.kichThuoc) : null;
      var IL = Number(l.IL) || 0, e = Number(l.e) || 0;
      var dinh = mocs[idx], duoi = mocs[idx + 1];
      return {
        stt: idx + 1, ten: ten, loai: l.loai, tinhChat: laCatRoi ? l.tinhChat : '', kichThuoc: laCatRoi ? l.kichThuoc : '',
        gamma: Number(l.gamma) || 0, phi: Number(l.phi) || 0, c: Number(l.c) || 0, IL: IL, e: e, Sr: Number(l.Sr) || 0,
        dinh: dinh, day: Math.max(0, dinh - duoi),
        spt: dsSpt.length ? dsSpt.reduce(function (a, b) { return a + b; }, 0) / dsSpt.length : null,
        kyLoai: kyLoai, kyTinhChat: kyTinhChat, kyKichThuoc: kyKichThuoc,
        k: kyLoai ? tinhK(kyLoai, kyKichThuoc, IL, e) : null
      };
    });

    lop.forEach(function (l) {
      if (!l.kyLoai) loi.push('Loại đất "' + l.loai + '" của lớp ' + l.ten + ' không có trong bảng (Cát, Cát pha, Sét, Sét pha).');
    });

    return {
      hopLe: loi.length === 0, loi: loi,
      hoKhoan: dc.hoKhoan, MNN: Number(dc.MNN), caoDoDay: day,
      lop: lop, sptTheoDoSau: sptTheoDoSau,
      lopTaiCaoDo: lopTaiCaoDo
    };
  }

  MCT.calc.nsxy = nsxy;
  MCT.calc.tinhK = tinhK;
  MCT.calc.tinhDiaChat = tinhDiaChat;
})(globalThis.MCT = globalThis.MCT || {});
