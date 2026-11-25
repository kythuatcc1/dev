// Mô hình ETABS móng cẩu tháp (bước 2 – app tự dựng từ thông số đang nhập)
//   Đài   : tấm vỏ dày (shell thick) X×Y, chiều dày H, đặt ở mặt phẳng giữa đài; lưới chia ≤ luoi (m),
//           đường lưới đi qua tâm cọc và 4 chân cẩu để cọc, chân cẩu nối đúng nút của tấm.
//   Cọc   : thanh tròn D từ mặt phẳng giữa đài tới mũi cọc, chia ≤ buocCoc (m) dưới đáy đài;
//           đoạn nằm trong đài là thanh cứng (độ cứng ×100, không tính trọng lượng – đã có trong đài).
//   Đất   : lò xo ngang tại nút cọc K = k·z·bp·l (TCVN 10304:2025 phụ lục A), k theo lớp đất (bảng A.1),
//           z tính từ cao độ bắt đầu lò xo: đáy đài (móng đài thấp – mặc định) hoặc đáy hố đào (đầu cọc tính toán),
//           l = chiều dài cọc nút đảm nhận (nửa đoạn trên + nửa đoạn dưới, chỉ phần nằm trong đất).
//   Mũi cọc: gối chặn chuyển vị đứng (UZ).
//   Tải   : đặt tại MỘT điểm ở tâm đài (nút tâm của tấm vỏ, như file PDF tham khảo) – xem etabs-tai-trong.js.
// Gốc toạ độ: tâm đài (cũng là tâm cẩu, như toạ độ cọc ở mục B); trục Z: cao độ so với MĐTN (m). Đơn vị kN, m.
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  var SAI_SO = 1e-6;
  function tron(v) { return Math.round(v * 1e4) / 1e4; }   // 0,1 mm – tránh sai số số thực khi so toạ độ

  /** Các mốc chia một đoạn [a, b] sao cho mỗi khoảng ≤ buoc, gồm cả các mốc bắt buộc nằm trong đoạn. */
  function chiaDoan(a, b, buoc, batBuoc) {
    var moc = [a, b].concat((batBuoc || []).filter(function (v) { return v > a + SAI_SO && v < b - SAI_SO; }));
    moc = moc.map(tron).sort(function (p, q) { return p - q; })
      .filter(function (v, i, ds) { return i === 0 || v - ds[i - 1] > 1e-3; });
    var kq = [moc[0]];
    for (var i = 1; i < moc.length; i++) {
      var dau = moc[i - 1], cuoi = moc[i], n = Math.max(1, Math.ceil((cuoi - dau) / buoc - 1e-9));
      for (var j = 1; j <= n; j++) kq.push(tron(dau + (cuoi - dau) * j / n));
    }
    return kq;
  }

  /** Cao độ nút cọc từ trên (hi) xuống dưới (lo): bước đúng 'buoc' tính từ mốc trên của mỗi đoạn,
   *  chèn các mốc bắt buộc; đoạn lẻ cuối ngắn hơn 0,25·buoc thì gộp vào đoạn trước. */
  function chiaCoc(hi, lo, buoc, batBuoc) {
    var moc = [hi, lo].concat((batBuoc || []).filter(function (v) { return v < hi - SAI_SO && v > lo + SAI_SO; }))
      .map(tron).sort(function (p, q) { return q - p; })
      .filter(function (v, i, ds) { return i === 0 || ds[i - 1] - v > 1e-3; });
    var kq = [moc[0]];
    for (var i = 1; i < moc.length; i++) {
      var tren = moc[i - 1], duoi = moc[i];
      for (var j = 1; tren - j * buoc > duoi + 0.25 * buoc + SAI_SO; j++) kq.push(tron(tren - j * buoc));
      kq.push(duoi);
    }
    return kq;
  }

  function tenSo(v) { return String(tron(v)).replace('-', 'm').replace('.', 'p'); }

  /**
   * @param {object} s   state của app (dùng s.etabs: batDauLoXo, luoi, buocCoc)
   * @param {object} kq  kết quả MCT.calc.tinhTatCa(s)
   */
  function taoMoHinhEtabs(s, kq) {
    var loi = [];
    var A = kq.A, S = kq.SCT, DC = kq.DC, B = kq.B;
    if (!A || !A.hopLe) loi.push('Mục A (cẩu tháp, vật liệu, kích thước đài) chưa hợp lệ.');
    if (!S || !S.hopLe) loi.push('Sức chịu tải cọc (thông số cọc) chưa hợp lệ.');
    if (!DC || !DC.hopLe) loi.push('Số liệu địa chất chưa hợp lệ.');
    if (!B || !B.hopLe) loi.push('Toạ độ cọc (mục B) chưa hợp lệ.');
    var e = s.etabs || {};
    var luoi = Number(e.luoi), buocCoc = Number(e.buocCoc);
    var batDau = e.batDauLoXo === 'day-ho' ? 'day-ho' : 'day-dai';
    if (!(luoi > 0.05)) loi.push('Kích thước lưới chia đài phải lớn hơn 0,05 m.');
    if (!(buocCoc > 0.1)) loi.push('Bước chia cọc phải lớn hơn 0,1 m.');
    if (loi.length) return { hopLe: false, loi: loi };

    var X = A.dai.X, Y = A.dai.Y, H = A.dai.H;
    var c = S.coc, D = c.D, bp = S.vatLieu.bp;
    var zDay = c.dayDai, zMat = tron(zDay + H), zGiua = tron(zDay + H / 2), zMui = c.muiCoc;
    var zBatDau = batDau === 'day-ho' ? Math.min(c.dauCocTinhToan, zDay) : zDay;
    var coc = B.coc.map(function (p, i) { return { ten: 'C' + (i + 1), x: tron(p.x), y: tron(p.y) }; });
    coc.forEach(function (p) {
      if (Math.abs(p.x) + D / 2 > X / 2 + SAI_SO || Math.abs(p.y) + D / 2 > Y / 2 + SAI_SO) {
        loi.push('Cọc ' + p.ten + ' (' + p.x + '; ' + p.y + ') nằm ngoài đài ' + X + ' × ' + Y + ' m.');
      }
    });
    if (!(zMui < zDay)) loi.push('Mũi cọc phải thấp hơn đáy đài.');
    if (loi.length) return { hopLe: false, loi: loi };

    // ---- Lưới tấm đài (mặt phẳng giữa đài), đường lưới qua tâm đài (điểm đặt tải) và tâm các cọc ----
    var xs = chiaDoan(-X / 2, X / 2, luoi, [0].concat(coc.map(function (p) { return p.x; })));
    var ys = chiaDoan(-Y / 2, Y / 2, luoi, [0].concat(coc.map(function (p) { return p.y; })));
    function tenNutDai(i, k) { return 'D' + (i + 1) + '_' + (k + 1); }
    function timNutDai(x, y) {
      var i = xs.indexOf(tron(x)), k = ys.indexOf(tron(y));
      return i >= 0 && k >= 0 ? tenNutDai(i, k) : null;
    }
    var diem = [], thanh = [], vo = [];
    xs.forEach(function (x, i) { ys.forEach(function (y, k) { diem.push({ ten: tenNutDai(i, k), x: x, y: y, z: zGiua }); }); });
    for (var i = 0; i < xs.length - 1; i++) {
      for (var k = 0; k < ys.length - 1; k++) {
        vo.push({ ten: 'V' + (i + 1) + '_' + (k + 1), tietDien: 'DAI', diem: [tenNutDai(i, k), tenNutDai(i + 1, k), tenNutDai(i + 1, k + 1), tenNutDai(i, k + 1)] });
      }
    }

    // ---- Các cao độ nút cọc (giống nhau cho mọi cọc) ----
    var duoiDay = chiaCoc(zDay, zMui, buocCoc, [zBatDau]);                  // từ đáy đài xuống mũi
    var capDo = [zGiua].concat(duoiDay);                                     // từ mặt phẳng giữa đài xuống
    // Lò xo: nút i ở dưới cao độ bắt đầu (z > 0); l = phần trong đất của nửa đoạn trên + nửa đoạn dưới
    var bangLoXo = [];
    capDo.forEach(function (z, i) {
      if (z > zBatDau - SAI_SO) return;
      var tren = i > 0 ? Math.max(0, Math.min(capDo[i - 1], zBatDau) - z) / 2 : 0;
      var duoi = i < capDo.length - 1 ? (z - capDo[i + 1]) / 2 : 0;
      var l = tren + duoi, doSau = zBatDau - z;
      var lopNhap = DC.lopTaiCaoDo(z);
      var lop = lopNhap && DC.lop.filter(function (l) { return String(l.ten) === String(lopNhap.ten); })[0];
      var kk = lop && typeof lop.k === 'number' && isFinite(lop.k) ? lop.k : 0;
      bangLoXo.push({ caoDo: z, doSau: tron(doSau), lop: lop ? String(lop.ten) : '–', k: kk, l: tron(l), K: kk * doSau * bp * l });
    });
    var loXoTheoCao = {};
    bangLoXo.forEach(function (r) { loXoTheoCao[r.caoDo] = r.K; });

    // Lò xo gán bằng thuộc tính lò xo điểm có tên (Point Spring Property, hệ trục cục bộ của điểm) như khi gán trong
    // giao diện ETABS – mỗi độ cứng một thuộc tính "LX_<K kN/m>"; điểm mới tạo có trục cục bộ trùng trục tổng thể.
    var loXo = [], gioiHan = [], thuocTinhLoXo = [], daCoThuocTinh = {};
    function thuocTinh(K) {
      var tenTT = 'LX_' + Math.round(K);
      if (!daCoThuocTinh[tenTT]) { daCoThuocTinh[tenTT] = true; thuocTinhLoXo.push({ ten: tenTT, k: [K, K, 0, 0, 0, 0] }); }
      return tenTT;
    }
    coc.forEach(function (p) {
      var ten = capDo.map(function (z, j) { return j === 0 ? timNutDai(p.x, p.y) : p.ten + '_' + tenSo(z); });
      capDo.forEach(function (z, j) {
        if (j > 0) diem.push({ ten: ten[j], x: p.x, y: p.y, z: z });
        var K = loXoTheoCao[z];
        if (K > 0) loXo.push({ diem: ten[j], k: [K, K, 0, 0, 0, 0], thuocTinh: thuocTinh(K) });
        if (j > 0) thanh.push({ ten: p.ten + '_' + j, dau: ten[j - 1], cuoi: ten[j], tietDien: j === 1 ? 'COC_TRONG_DAI' : 'COC' });
      });
      p.thanh = capDo.slice(1).map(function (z, j) { return p.ten + '_' + (j + 1); });   // từ trên xuống
      p.nutDau = ten[1];                                                                   // đầu cọc (đáy đài)
      gioiHan.push({ diem: ten[ten.length - 1], giaTri: [false, false, true, false, false, false] });
      p.nutDinh = ten[0];
      p.nutMui = ten[ten.length - 1];
    });

    // ---- Điểm đặt tải: nút tâm đài trên tấm vỏ ----
    var nutTai = timNutDai(0, 0);

    // ---- Tầng ETABS: mỗi cao độ nút là một tầng; đáy công trình (base) ở mũi cọc ----
    var mocTang = capDo.map(tron).sort(function (p, q) { return p - q; })
      .filter(function (v, j, ds) { return j === 0 || v - ds[j - 1] > 1e-3; });
    var tenDacBiet = {};
    tenDacBiet[zGiua] = 'GIUA_DAI'; tenDacBiet[tron(zDay)] = 'DAY_DAI';
    if (batDau === 'day-ho') tenDacBiet[tron(zBatDau)] = tenDacBiet[tron(zBatDau)] || 'DAY_HO';
    var tang = [];
    for (var t = 1; t < mocTang.length; t++) {
      tang.push({ ten: tenDacBiet[mocTang[t]] || 'Z' + tenSo(mocTang[t]), caoDo: mocTang[t], cao: tron(mocTang[t] - mocTang[t - 1]) });
    }

    var btDai = A.vatLieu.beTong, btCoc = S.vatLieu;
    var tenBtDai = 'BT_' + btDai.cap, tenBtCoc = 'BT_' + btCoc.beTong;
    var vatLieu = [{ ten: tenBtDai, E: btDai.Eb * 1000, nu: 0.2, alpha: 1e-5, gamma: 25 }];
    if (tenBtCoc !== tenBtDai) vatLieu.push({ ten: tenBtCoc, E: btCoc.E * 1000, nu: 0.2, alpha: 1e-5, gamma: 25 });
    var CUNG = [100, 100, 100, 100, 100, 100, 0, 0];   // A, As2, As3, J, I22, I33, khối lượng, trọng lượng

    return {
      hopLe: true, loi: [],
      thongSo: {
        X: X, Y: Y, H: H, zMat: zMat, zGiua: zGiua, zDay: zDay, zMui: zMui, D: D, bp: bp, soCoc: coc.length,
        batDauLoXo: batDau, zBatDau: zBatDau, luoi: luoi, buocCoc: buocCoc, nx: xs.length, ny: ys.length
      },
      tang: { caoDoDay: tron(mocTang[0]), ds: tang },
      vatLieu: vatLieu,
      tietDienThanh: [
        { ten: 'COC', loai: 'tron', vatLieu: tenBtCoc, D: D },
        { ten: 'COC_TRONG_DAI', loai: 'tron', vatLieu: tenBtCoc, D: D, heSo: CUNG }
      ],
      tietDienVo: [{ ten: 'DAI', vatLieu: tenBtDai, day: H }],
      diem: diem, thanh: thanh, vo: vo, loXo: loXo, gioiHan: gioiHan,
      thuocTinhLoXo: thuocTinhLoXo,
      coc: coc, nutTai: nutTai, xs: xs, ys: ys, capDo: capDo, bangLoXo: bangLoXo,
      thongKe: { soTang: tang.length, soDiem: diem.length, soThanh: thanh.length, soVo: vo.length, soLoXo: loXo.length }
    };
  }

  /** Dữ liệu gửi cầu nối ETABS (bỏ các bảng chỉ dùng để hiển thị); t = kết quả taiTrongEtabs (load pattern, tổ hợp). */
  function duLieuGuiEtabs(m, t) {
    return {
      tang: m.tang, vatLieu: m.vatLieu, tietDienThanh: m.tietDienThanh, tietDienVo: m.tietDienVo,
      diem: m.diem, thanh: m.thanh, vo: m.vo, loXo: m.loXo, thuocTinhLoXo: m.thuocTinhLoXo, gioiHan: m.gioiHan,
      mauTai: t && t.hopLe ? t.mauTai : [], toHop: t && t.hopLe ? t.toHop : []
    };
  }

  MCT.calc.taoMoHinhEtabs = taoMoHinhEtabs;
  MCT.calc.duLieuGuiEtabs = duLieuGuiEtabs;
})(globalThis.MCT = globalThis.MCT || {});
