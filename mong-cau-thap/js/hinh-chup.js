// Ảnh chụp thật từ ETABS (và ảnh ngoài như catalogue cẩu, hố khoan) cho các vị trí hình của thuyết minh.
// API ETABS không có lệnh chụp màn hình hay đổi chế độ hiển thị: người dùng chỉnh hiển thị trong ETABS theo hướng dẫn từng vị trí,
// app chụp cửa sổ ETABS (chương trình .exe – Electron desktopCapturer) hoặc nhận ảnh dán / chọn file, cắt vùng mô hình, lưu trong
// máy (IndexedDB). Khi xuất thuyết minh: ảnh chụp > hình app vẽ từ kết quả ETABS > ô trống để dán.
(function (MCT) {
  'use strict';

  /**
   * Các vị trí hình. Khoá trùng khoá thuyết minh dùng (hinh[khoa]). nhom: 'ngoai' (ảnh ngoài ETABS), 'mo-hinh', 'noi-luc', 'mong'.
   * Tham số: E = { m, t, kE } (mô hình ETABS, có thể thiếu) – để biết dầm giằng, tổ hợp bất lợi.
   */
  function viTri(E) {
    var m = E && E.m && E.m.hopLe ? E.m : null, kE = E && E.kE, t = E && E.t;
    var TANG = tangTam(m);
    var coMZ = t && t.hopLe && t.mauTai.some(function (p) { return p.ten === 'MZ1'; });
    var cv = kE && kE.chuyenVi, toHopCv = cv && cv.DeltaMax ? cv.DeltaMax.toHop : 'bất lợi';
    var LUC = 'Display → Force/Stress Diagrams → Frame/Pier/Spandrel/Link Forces; Load Case/Load Combination: BAO – ';
    var NHIN_COC = '; View → Set Elevation View qua hàng cọc (hoặc 3D chỉ hiện cọc); tick Show Values on Diagram.';
    var ds = [
      { khoa: 'matBangCau', nhom: 'ngoai', ten: 'Mặt bằng bố trí cẩu tháp (ETABS: Hình 2.3; giải tích: Hình 1.1)', huongDan: 'Ảnh mặt bằng bố trí cẩu trên công trình (bản vẽ) – dán hoặc chọn file.' },
      { khoa: 'hinhCatalogue', nhom: 'ngoai', ten: 'Catalogue tải trọng cẩu tháp (ETABS: Hình 2.1; giải tích: Hình 3.1)', huongDan: 'Ảnh bảng phản lực chân đế, sơ đồ cẩu trong catalogue – dán hoặc chọn file.' },
      { khoa: 'matBangHoKhoan', nhom: 'ngoai', ten: 'Hình 2.2 Mặt bằng hố khoan (thuyết minh ETABS)', huongDan: 'Ảnh mặt bằng vị trí hố khoan trong báo cáo khảo sát – dán hoặc chọn file.' },
      { khoa: 'hinhTruHoKhoan', nhom: 'ngoai', ten: 'Hình 2.4 Hình trụ hố khoan (thuyết minh ETABS)', huongDan: 'Ảnh hình trụ hố khoan trong báo cáo khảo sát – dán hoặc chọn file.' },
      { khoa: 'etabsMoHinh3D', nhom: 'mo-hinh', ten: 'Hình 3.1 Mô hình móng cẩu tháp', huongDan: 'View → Set Default 3D View; Display → Undeformed Shape; nếu muốn thấy lò xo: Display → Show Assigns → Joint → Springs.' },
      { khoa: 'etabsMatBang', nhom: 'mo-hinh', ten: 'Hình 3.2 Mặt bằng đài trong mô hình', huongDan: 'View → Set Plan View, chọn tầng ' + TANG + ' (tấm đài móng). Không chụp thì dùng mặt bằng app vẽ.' },
      { khoa: 'etabsTai1', nhom: 'mo-hinh', ten: 'Hình 3.3 Lực Fx1, Fy1, Fz1 tác dụng lên móng', huongDan: 'Display → Show Load Assigns → Joint; chọn load pattern FX1, FY1, FZ1; hiện giá trị; nhìn 3D.' },
      { khoa: 'etabsTai2', nhom: 'mo-hinh', ten: 'Hình 3.4 Lực Mx1, My1' + (coMZ ? ', Mz1' : '') + ' tác dụng lên móng', huongDan: 'Display → Show Load Assigns → Joint; chọn MX1, MY1' + (coMZ ? ', MZ1' : '') + '.' },
      { khoa: 'etabsTai3', nhom: 'mo-hinh', ten: 'Hình 3.5 Lực Fx2, Fy2, Fz2 tác dụng lên móng', huongDan: 'Display → Show Load Assigns → Joint; chọn FX2, FY2, FZ2.' },
      { khoa: 'etabsTai4', nhom: 'mo-hinh', ten: 'Hình 3.6 Lực Mx2, My2 tác dụng lên móng', huongDan: 'Display → Show Load Assigns → Joint; chọn MX2, MY2.' }
    ];
    var TP = [['P', 'Axial Force', 'Lực dọc P'], ['M2', 'Moment 2-2', 'Moment 2-2'], ['M3', 'Moment 3-3', 'Moment 3-3'],
      ['V2', 'Shear 2-2', 'Shear 2-2'], ['V3', 'Shear 3-3', 'Shear 3-3']];
    [['min', 'Bảng 4.1', 'BAO-MIN', 'Min'], ['max', 'Bảng 4.2', 'BAO-MAX', 'Max']].forEach(function (b) {
      TP.forEach(function (tp) {
        ds.push({ khoa: 'etabsBao_' + b[0] + '_' + tp[0], nhom: 'noi-luc', ten: b[1] + ' (' + b[2] + ') – ' + tp[2],
          huongDan: LUC + b[3] + ', Component: ' + tp[1] + NHIN_COC, oBang: true });
      });
    });
    ds.push({ khoa: 'etabsChuyenVi', nhom: 'mong', ten: 'Hình 6.2 Chuyển vị ngang, góc xoay đầu cọc', huongDan: 'Display → Deformed Shape, tổ hợp ' + toHopCv + '; nhìn 3D hoặc mặt bằng, hiện giá trị chuyển vị tại tâm đài.' });
    [['M11max', 'M11 – BAO Max'], ['M11min', 'M11 – BAO Min'], ['M22max', 'M22 – BAO Max'], ['M22min', 'M22 – BAO Min']].forEach(function (x) {
      ds.push({ khoa: 'etabsMomenDai_' + x[0], nhom: 'mong', ten: 'Hình 6.3 Mômen đài – ' + x[1], nhomHinh: 'etabsMomenDai', nhan: x[1],
        huongDan: 'Display → Force/Stress Diagrams → Shell Stresses/Forces; Type: Forces; Component: ' + x[0].slice(0, 3) + '; BAO ' + (/max/.test(x[0]) ? 'Max' : 'Min') + '; mặt bằng tầng ' + TANG + '.' });
    });
    [['V13', 'V13 – BAO'], ['V23', 'V23 – BAO']].forEach(function (x) {
      ds.push({ khoa: 'etabsCatDai_' + x[0], nhom: 'mong', ten: 'Hình 6.4 Lực cắt đài – ' + x[1], nhomHinh: 'etabsCatDai', nhan: x[1],
        huongDan: 'Display → Force/Stress Diagrams → Shell Stresses/Forces; Type: Forces; Component: ' + x[0] + '; BAO Max (hoặc Min); mặt bằng tầng ' + TANG + '.' });
    });
    ((m && m.dam) || []).forEach(function (d, i) {
      ds.push({ khoa: 'dam_' + d.ten, nhom: 'mong', ten: 'Hình 6.' + (5 + i) + ' Nội lực dầm ' + d.ten, huongDan: LUC + 'Max/Min, Component: Moment 3-3 (và Shear 2-2); ' +
        'View → Set Elevation View qua dầm ' + d.ten + ' (' + d.tuCoc + ' – ' + d.denCoc + ', z = ' + d.z + ' m).' });
    });
    return ds;
  }

  // Tầng ETABS của tấm đài (tầng trên cùng của mô hình app dựng: MAT_DAI; mô hình dựng bằng bản cũ: GIUA_DAI)
  function tangTam(m) {
    var ds = m && m.tang && m.tang.ds;
    return ds && ds.length ? ds[ds.length - 1].ten : 'MAT_DAI';
  }

  // ---------------- Tự chụp: kịch bản thao tác giao diện ETABS v23 (tiếng Anh) cho từng vị trí hình ----------------
  // Cầu nối (lệnh tu-chup) bấm menu / chỉnh hộp thoại theo tên – so tên bỏ "&", "...", hoa thường; tên nào chưa đúng với ETABS
  // trên máy người dùng thì nhật ký ghi lại các tên đang có để sửa ở đây.
  var MENU_3D = { loai: 'menu', duong: ['View', 'Set Default 3D View'] };
  var MENU_KHONG_BD = { loai: 'menu', duong: ['Display', 'Undeformed Shape'] };
  // Mặt bằng tầng tấm đài. Hộp thoại "Select Plan View" của ETABS v23: Plan View Options (Default Plan from Story Level or Reference Plane /
  // At Specified Global Z Coordinate), Filter + danh sách tầng, OK / Close / Apply. ETABS đang ở đúng mặt bằng thì bỏ qua cả hai bước.
  // Phương án: (1) gõ tên tầng vào Filter, chọn mục trong danh sách (bấm chuột; không thấy mục thì phím Home); (2) Filter, Tab tới danh sách,
  // Home; (3) chọn cao độ Z của tấm đài. Bấm OK mà ETABS báo lỗi (vd "Nothing is selected!") thì đóng thông báo, thử phương án sau.
  function matBang(tang, z) {
    var zs = typeof z === 'number' && isFinite(z) ? String(Math.round(z * 1000) / 1000) : null;
    var pa = [
      { dat: [{ radio: ['Default Plan from Story Level or Reference Plane'] }, { nhap: ['Filter'], gt: tang }, { danhSach: [tang], dauTien: true }] },
      { dat: [{ nhap: ['Filter'], gt: tang }, { phim: ['TAB', 'TAB', 'HOME'], tu: ['Filter'] }] }
    ];
    if (zs !== null) pa.push({ dat: [{ radio: ['At Specified Global Z Coordinate'] }, { nhap: ['Global Z Coordinate', 'Z Coordinate', 'Z'], gt: zs }] });
    return [{ loai: 'menu', duong: ['View', 'Set Plan View'], boQuaNeu: 'Plan View - ' + tang + ' ', boQuaTiep: 1 },
      { loai: 'hop-thoai', phuongAn: pa, xong: 'OK' }];
  }
  function chonMaxMin(mm) { return mm === 'min' ? ['Min', 'Envelope Min', 'Minimum'] : ['Max', 'Envelope Max', 'Maximum']; }
  function lucThanh(toHop, mm, tp) {
    return [MENU_3D, { loai: 'menu', duong: ['Display', 'Force/Stress Diagrams', 'Frame/Pier/Spandrel/Link Forces'] },
      { loai: 'hop-thoai', dat: [{ chon: [toHop] }, { radio: chonMaxMin(mm) }, { radio: [tp] },
        { tick: ['Show Values on Diagram', 'Show Values'], gt: true }, { tick: ['Fill Diagram'], gt: true }], xong: 'OK' }];
  }
  function lucVo(tang, z, toHop, tp, mm) {
    return matBang(tang, z).concat([{ loai: 'menu', duong: ['Display', 'Force/Stress Diagrams', 'Shell Stresses/Forces'] },
      { loai: 'hop-thoai', dat: [{ chon: [toHop] }, { radio: ['Resultant Forces', 'Shell Forces', 'Forces'] }, { radio: [tp] }, { radio: chonMaxMin(mm) }],
        xong: 'OK' }]);
  }
  function taiNut(mau) {
    return [MENU_3D, { loai: 'menu', duong: ['Display', 'Load Assigns', 'Joint'] },
      { loai: 'hop-thoai', dat: [{ chon: [mau[0]] }, { danhSach: mau }, { tick: ['Show Load Assign Values', 'Show Load Values', 'Show Values'], gt: true }],
        xong: 'OK' }];
  }
  /** Danh sách thao tác cho vị trí khoa (null: vị trí ảnh ngoài ETABS, không tự chụp). */
  function kichBan(khoa, E) {
    var m = E && E.m && E.m.hopLe ? E.m : null, t = E && E.t, kE = E && E.kE;
    var tang = tangTam(m), cv = kE && kE.chuyenVi, toHopCv = cv && cv.DeltaMax ? cv.DeltaMax.toHop : 'BAO';
    var zTam = m && m.thongSo ? (m.thongSo.zTam !== undefined ? m.thongSo.zTam : m.thongSo.zGiua) : null;
    var coMZ = t && t.hopLe && t.mauTai.some(function (p) { return p.ten === 'MZ1'; });
    var x;
    if (khoa === 'etabsMoHinh3D') return [MENU_3D, MENU_KHONG_BD];
    if (khoa === 'etabsMatBang') return matBang(tang, zTam).concat([MENU_KHONG_BD]);
    if (khoa === 'etabsTai1') return taiNut(['FX1', 'FY1', 'FZ1']);
    if (khoa === 'etabsTai2') return taiNut(['MX1', 'MY1'].concat(coMZ ? ['MZ1'] : []));
    if (khoa === 'etabsTai3') return taiNut(['FX2', 'FY2', 'FZ2']);
    if (khoa === 'etabsTai4') return taiNut(['MX2', 'MY2']);
    if ((x = /^etabsBao_(min|max)_(P|M2|M3|V2|V3)$/.exec(khoa))) {
      return lucThanh('BAO', x[1], { P: 'Axial Force', M2: 'Moment 2-2', M3: 'Moment 3-3', V2: 'Shear 2-2', V3: 'Shear 3-3' }[x[2]]);
    }
    if (khoa === 'etabsChuyenVi') {
      return [MENU_3D, { loai: 'menu', duong: ['Display', 'Deformed Shape'] }, { loai: 'hop-thoai', dat: [{ chon: [toHopCv] }], xong: 'OK' }];
    }
    if ((x = /^etabsMomenDai_(M11|M22)(max|min)$/.exec(khoa))) return lucVo(tang, zTam, 'BAO', x[1], x[2]);
    if ((x = /^etabsCatDai_(V13|V23)$/.exec(khoa))) return lucVo(tang, zTam, 'BAO', x[1], 'max');
    if (/^dam_/.test(khoa)) return lucThanh('BAO', 'max', 'Moment 3-3');
    return null;
  }

  // ---------------- Nền trắng cho ảnh chụp ETABS (ETABS mặc định nền đen) ----------------
  /**
   * Ảnh (HTMLImageElement) → { data: Uint8Array PNG, w, h, doi: bool }. Màu nền lấy theo viền ảnh; nền tối thì: nền → trắng,
   * màu xám (chữ, lưới, đường trắng) → đảo độ sáng, màu rực quá sáng (vàng, xanh nhạt) → sẫm lại để đọc được trên nền trắng.
   */
  function nenTrang(img) {
    var k0 = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));   // ảnh quá lớn thu nhỏ như catAnh
    var w = Math.max(1, Math.round(img.naturalWidth * k0)), h = Math.max(1, Math.round(img.naturalHeight * k0)), cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    var anh = ctx.getImageData(0, 0, w, h), d = anh.data, dem = {};
    function mau(i) { return ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3); }
    for (var x = 0; x < w; x += 2) { [0, h - 1].forEach(function (y) { var k = mau((y * w + x) * 4); dem[k] = (dem[k] || 0) + 1; }); }
    for (var y = 0; y < h; y += 2) { [0, w - 1].forEach(function (x2) { var k = mau((y * w + x2) * 4); dem[k] = (dem[k] || 0) + 1; }); }
    var nen = Number(Object.keys(dem).sort(function (a, b) { return dem[b] - dem[a]; })[0] || 0);
    var nr = ((nen >> 10) & 31) << 3, ng = ((nen >> 5) & 31) << 3, nb = (nen & 31) << 3;
    var sangNen = 0.299 * nr + 0.587 * ng + 0.114 * nb, doi = sangNen < 90;
    if (doi) {
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        var lech = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
        var lon = Math.max(r, g, b), nho = Math.min(r, g, b), sang = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lech < 36) { d[i] = d[i + 1] = d[i + 2] = 255; }
        else if (lon - nho < 40) { var v = Math.max(0, 255 - sang); d[i] = d[i + 1] = d[i + 2] = v; }
        else if (sang > 170) { var k2 = 150 / sang; d[i] = r * k2; d[i + 1] = g * k2; d[i + 2] = b * k2; }
      }
      ctx.putImageData(anh, 0, 0);
    }
    return new Promise(function (ok, loi) {
      cv.toBlob(function (bl) {
        if (!bl) { loi(new Error('Không tạo được ảnh PNG')); return; }
        bl.arrayBuffer().then(function (ab) { ok({ data: new Uint8Array(ab), w: w, h: h, doi: doi }); }, loi);
      }, 'image/png');
    });
  }
  /** Ảnh nhỏ (JPEG data URL, cạnh dài ≤ cạnh) để ghi vào nhật ký tự chụp. */
  function anhNho(img, canh) {
    var k = Math.min(1, (canh || 360) / Math.max(img.naturalWidth, img.naturalHeight));
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    try { return cv.toDataURL('image/jpeg', 0.7); } catch (e) { return ''; }
  }

  var NHOM = { ngoai: 'Mục 2 – ảnh ngoài ETABS (catalogue, hố khoan, mặt bằng)', 'mo-hinh': 'Mục 3 – mô hình và tải trọng',
    'noi-luc': 'Mục 4 – nội lực cọc (Bảng 4.1, 4.2)', mong: 'Mục 6 – chuyển vị, nội lực đài, dầm giằng' };

  // ---------------- Lưu ảnh trong máy (IndexedDB) ----------------
  var TEN_CSDL = 'mong-cau-thap-hinh', KHO = 'hinh', csdl = null;
  function moCsdl() {
    if (csdl) return csdl;
    csdl = new Promise(function (ok, loi) {
      if (!globalThis.indexedDB) { loi(new Error('Trình duyệt không có IndexedDB')); return; }
      var r = indexedDB.open(TEN_CSDL, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(KHO, { keyPath: 'khoa' }); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { loi(r.error); };
    });
    csdl.catch(function () { csdl = null; });
    return csdl;
  }
  function giaoDich(cheDo, lam) {
    return moCsdl().then(function (db) {
      return new Promise(function (ok, loi) {
        var tx = db.transaction(KHO, cheDo), kho = tx.objectStore(KHO), kq;
        var r = lam(kho);
        if (r) r.onsuccess = function () { kq = r.result; };
        tx.oncomplete = function () { ok(kq); };
        tx.onerror = function () { loi(tx.error); };
      });
    });
  }
  /** Lưu ảnh: { khoa, data: Uint8Array PNG, w, h, nguon, thoiGian }. */
  function luuAnh(rec) { return giaoDich('readwrite', function (k) { return k.put(rec); }); }
  function xoaAnh(khoa) { return giaoDich('readwrite', function (k) { return k.delete(khoa); }); }
  function xoaHet() { return giaoDich('readwrite', function (k) { return k.clear(); }); }
  /** Mọi ảnh đã lưu: { khoa: rec }. */
  function tatCaAnh() {
    return giaoDich('readonly', function (k) { return k.getAll(); }).then(function (ds) {
      var kq = {};
      (ds || []).forEach(function (r) { kq[r.khoa] = r; });
      return kq;
    }, function () { return {}; });
  }

  // ---------------- Xử lý ảnh (trình duyệt) ----------------
  /** Blob/ArrayBuffer/Uint8Array ảnh bất kỳ → HTMLImageElement. */
  function taiAnh(nguon) {
    return new Promise(function (ok, loi) {
      var blob = nguon instanceof Blob ? nguon : new Blob([nguon], { type: 'image/png' });
      var url = URL.createObjectURL(blob), img = new Image();
      img.onload = function () { ok(img); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); };
      img.onerror = function () { URL.revokeObjectURL(url); loi(new Error('Không đọc được ảnh')); };
      img.src = url;
    });
  }
  /** Cắt ảnh theo vùng tỉ lệ { x, y, w, h } (0…1) → { data: Uint8Array PNG, w, h }. Ảnh quá lớn thu nhỏ còn cạnh dài ≤ 2400 px. */
  function catAnh(img, vung) {
    var v = vung || { x: 0, y: 0, w: 1, h: 1 };
    var sx = Math.round(v.x * img.naturalWidth), sy = Math.round(v.y * img.naturalHeight);
    var sw = Math.max(1, Math.round(v.w * img.naturalWidth)), sh = Math.max(1, Math.round(v.h * img.naturalHeight));
    var k = Math.min(1, 2400 / Math.max(sw, sh));
    var cv = document.createElement('canvas');
    cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    return new Promise(function (ok, loi) {
      cv.toBlob(function (b) {
        if (!b) { loi(new Error('Không tạo được ảnh PNG')); return; }
        b.arrayBuffer().then(function (ab) { ok({ data: new Uint8Array(ab), w: cv.width, h: cv.height }); }, loi);
      }, 'image/png');
    });
  }
  /** Vùng cắt hợp lệ (tỉ lệ trong 0…1, đủ lớn). */
  function chuanVung(v) {
    if (!v) return null;
    var x = Math.max(0, Math.min(1, Number(v.x))), y = Math.max(0, Math.min(1, Number(v.y)));
    var w = Math.min(1 - x, Number(v.w)), h = Math.min(1 - y, Number(v.h));
    return isFinite(x) && isFinite(y) && w > 0.02 && h > 0.02 ? { x: x, y: y, w: w, h: h } : null;
  }

  /**
   * Hộp thoại cắt ảnh: kéo chuột vẽ vùng cần giữ (mặc định vùng đã nhớ). Trả Promise { vung } hoặc null (huỷ).
   * moTa: dòng chữ đầu hộp thoại.
   */
  function hopThoaiCat(img, vungNho, moTa) {
    return new Promise(function (ok) {
      var nen = document.createElement('div');
      nen.className = 'hop-cat';
      nen.setAttribute('role', 'dialog');
      nen.setAttribute('aria-modal', 'true');
      nen.innerHTML = '<div class="hop-cat-khung"><p class="hop-cat-tieu-de"></p>' +
        '<p class="hint">Kéo chuột trên ảnh để chọn vùng mô hình cần đưa vào thuyết minh (bỏ thanh công cụ, menu của ETABS). ' +
        'Vùng chọn được nhớ cho các lần chụp sau.</p>' +
        '<div class="hop-cat-anh"><canvas></canvas><div class="hop-cat-vung"></div></div>' +
        '<p class="hang-nut"><button type="button" class="btn" data-cat="dung">Dùng vùng đã chọn</button>' +
        '<button type="button" class="btn btn-ghost" data-cat="ca-anh">Dùng cả ảnh</button>' +
        '<button type="button" class="btn btn-ghost" data-cat="huy">Huỷ</button></p></div>';
      nen.querySelector('.hop-cat-tieu-de').textContent = moTa || 'Cắt ảnh';
      document.body.appendChild(nen);
      var cv = nen.querySelector('canvas'), khungAnh = nen.querySelector('.hop-cat-anh'), oVung = nen.querySelector('.hop-cat-vung');
      var k = Math.min(1, (window.innerWidth * 0.86) / img.naturalWidth, (window.innerHeight * 0.66) / img.naturalHeight);
      cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      var vung = chuanVung(vungNho) || { x: 0, y: 0, w: 1, h: 1 };
      function ve() {
        oVung.style.left = (vung.x * cv.width) + 'px'; oVung.style.top = (vung.y * cv.height) + 'px';
        oVung.style.width = (vung.w * cv.width) + 'px'; oVung.style.height = (vung.h * cv.height) + 'px';
      }
      ve();
      var dau = null;
      function viTriChuot(e) {
        var r = cv.getBoundingClientRect();
        return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
      }
      khungAnh.addEventListener('pointerdown', function (e) { dau = viTriChuot(e); khungAnh.setPointerCapture(e.pointerId); e.preventDefault(); });
      khungAnh.addEventListener('pointermove', function (e) {
        if (!dau) return;
        var p = viTriChuot(e);
        vung = { x: Math.min(dau.x, p.x), y: Math.min(dau.y, p.y), w: Math.abs(p.x - dau.x), h: Math.abs(p.y - dau.y) };
        ve();
      });
      khungAnh.addEventListener('pointerup', function () {
        dau = null;
        if (!chuanVung(vung)) { vung = chuanVung(vungNho) || { x: 0, y: 0, w: 1, h: 1 }; ve(); }
      });
      function dong(kq) { nen.remove(); document.removeEventListener('keydown', phim); ok(kq); }
      function phim(e) { if (e.key === 'Escape') dong(null); }
      document.addEventListener('keydown', phim);
      nen.addEventListener('click', function (e) {
        var n = e.target.closest('[data-cat]');
        if (!n) return;
        var hd = n.getAttribute('data-cat');
        dong(hd === 'huy' ? null : { vung: hd === 'ca-anh' ? { x: 0, y: 0, w: 1, h: 1 } : chuanVung(vung) || { x: 0, y: 0, w: 1, h: 1 } });
      });
      nen.querySelector('[data-cat="dung"]').focus();
    });
  }

  MCT.hinhChup = {
    viTri: viTri, NHOM: NHOM, chuanVung: chuanVung, kichBan: kichBan, tangTam: tangTam, nenTrang: nenTrang, anhNho: anhNho,
    luuAnh: luuAnh, xoaAnh: xoaAnh, xoaHet: xoaHet, tatCaAnh: tatCaAnh,
    taiAnh: taiAnh, catAnh: catAnh, hopThoaiCat: hopThoaiCat
  };
})(globalThis.MCT = globalThis.MCT || {});
