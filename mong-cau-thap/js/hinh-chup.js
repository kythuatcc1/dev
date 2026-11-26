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
      { khoa: 'etabsMatBang', nhom: 'mo-hinh', ten: 'Hình 3.2 Mặt bằng đài trong mô hình', huongDan: 'View → Set Plan View, chọn tầng GIUA_DAI (mặt phẳng giữa đài móng). Không chụp thì dùng mặt bằng app vẽ.' },
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
        huongDan: 'Display → Force/Stress Diagrams → Shell Stresses/Forces; Type: Forces; Component: ' + x[0].slice(0, 3) + '; BAO ' + (/max/.test(x[0]) ? 'Max' : 'Min') + '; mặt bằng tầng GIUA_DAI.' });
    });
    [['V13', 'V13 – BAO'], ['V23', 'V23 – BAO']].forEach(function (x) {
      ds.push({ khoa: 'etabsCatDai_' + x[0], nhom: 'mong', ten: 'Hình 6.4 Lực cắt đài – ' + x[1], nhomHinh: 'etabsCatDai', nhan: x[1],
        huongDan: 'Display → Force/Stress Diagrams → Shell Stresses/Forces; Type: Forces; Component: ' + x[0] + '; BAO Max (hoặc Min); mặt bằng tầng GIUA_DAI.' });
    });
    ((m && m.dam) || []).forEach(function (d, i) {
      ds.push({ khoa: 'dam_' + d.ten, nhom: 'mong', ten: 'Hình 6.' + (5 + i) + ' Nội lực dầm ' + d.ten, huongDan: LUC + 'Max/Min, Component: Moment 3-3 (và Shear 2-2); ' +
        'View → Set Elevation View qua dầm ' + d.ten + ' (' + d.tuCoc + ' – ' + d.denCoc + ', z = ' + d.z + ' m).' });
    });
    return ds;
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
    viTri: viTri, NHOM: NHOM, chuanVung: chuanVung,
    luuAnh: luuAnh, xoaAnh: xoaAnh, xoaHet: xoaHet, tatCaAnh: tatCaAnh,
    taiAnh: taiAnh, catAnh: catAnh, hopThoaiCat: hopThoaiCat
  };
})(globalThis.MCT = globalThis.MCT || {});
