// Mô hình ETABS móng cẩu tháp (bước 2 – app tự dựng từ thông số đang nhập)
//   Đài   : tấm vỏ dày (shell thick) X×Y, chiều dày H, đặt ở mặt phẳng giữa đài; cách chia (s.etabs.chiaDai):
//           'deu' (mặc định) lưới chia ≤ luoi (m), đường lưới đi qua tâm cọc, tâm đài, điểm đặt lực để cọc, lực nối đúng nút;
//           'toi-thieu' chỉ chia tại các đường qua cọc, tâm đài, điểm đặt lực (không chia đều);
//           'khong' không chia: một ô vỏ V1_1 cả đài, đầu cọc và điểm đặt lực là điểm nằm trong tấm (D0_<k>, điểm riêng –
//           special point), ETABS tự chia lưới tấm khi phân tích (Analyze → Automatic Mesh Settings for Floors).
//   Cọc   : thanh tròn D từ mặt phẳng giữa đài tới mũi cọc, chia ≤ buocCoc (m) dưới đáy đài;
//           đoạn nằm trong đài là thanh cứng (độ cứng ×100, không tính trọng lượng – đã có trong đài).
//   Đất   : lò xo ngang tại nút cọc K = k·z·bp·l (TCVN 10304:2025 phụ lục A), k theo lớp đất (bảng A.1),
//           z tính từ cao độ bắt đầu lò xo: đáy đài (móng đài thấp – mặc định) hoặc đáy hố đào (đầu cọc tính toán),
//           l = chiều dài cọc nút đảm nhận (nửa đoạn trên + nửa đoạn dưới, chỉ phần nằm trong đất).
//   Mũi cọc: gối chặn chuyển vị đứng (UZ).
//   Dầm giằng (tuỳ chọn, s.damGiang.ds): thanh chữ nhật b×h nối hai cọc tại cao độ tim dầm z (chèn nút z vào mọi cọc);
//           trọng lượng bản thân tính theo vật liệu (γ = 25 kN/m³) trong DEAD.
//   Tải   : điểm đặt lực cẩu tháp (s.etabs.diemDatLuc): 'tam' – MỘT điểm tại tâm cẩu (như file PDF tham khảo, mặc định)
//           hoặc 'chan' – 4 chân cẩu (cách nhau Ht theo mỗi phương); tâm cẩu lệch tâm đài (tamCauX, tamCauY – mặc định 0)
//           – lưới đài luôn đi qua điểm đặt lực; xem etabs-tai-trong.js.
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
    var chiaDai = e.chiaDai === 'khong' || e.chiaDai === 'toi-thieu' ? e.chiaDai : 'deu';
    var batDau = e.batDauLoXo === 'day-ho' ? 'day-ho' : 'day-dai';
    if (chiaDai === 'deu' && !(luoi > 0.05)) loi.push('Kích thước lưới chia đài phải lớn hơn 0,05 m.');
    if (!(buocCoc > 0.1)) loi.push('Bước chia cọc phải lớn hơn 0,1 m.');
    var kieuDat = e.diemDatLuc === 'chan' ? 'chan' : 'tam';
    var xc = tron(Number(e.tamCauX) || 0), yc = tron(Number(e.tamCauY) || 0);
    if (!isFinite(xc) || !isFinite(yc)) loi.push('Toạ độ tâm cẩu không hợp lệ.');
    if (loi.length) return { hopLe: false, loi: loi };

    var X = A.dai.X, Y = A.dai.Y, H = A.dai.H;
    // Đài vát (móng 3 cọc, js/calc/hinh-dai.js): đa giác bao theo cọc, có thể lệch tâm cẩu; còn lại: chữ nhật X × Y giữa gốc toạ độ
    var hd = A.dai.hinh && A.dai.hinh.kieu === 'vat' && A.dai.hinh.hopLe ? A.dai.hinh : null;
    var bx0 = hd ? hd.x0 : -X / 2, bx1 = hd ? hd.x1 : X / 2, by0 = hd ? hd.y0 : -Y / 2, by1 = hd ? hd.y1 : Y / 2;
    var mepDai = function (x, y) { return MCT.calc.hinhDai.khoangCachMep(hd, x, y); };
    var c = S.coc, D = c.D, bp = S.vatLieu.bp;
    var zDay = c.dayDai, zMat = tron(zDay + H), zGiua = tron(zDay + H / 2), zMui = c.muiCoc;
    var zBatDau = batDau === 'day-ho' ? Math.min(c.dauCocTinhToan, zDay) : zDay;
    var coc = B.coc.map(function (p, i) { return { ten: 'C' + (i + 1), x: tron(p.x), y: tron(p.y) }; });
    coc.forEach(function (p) {
      if (hd ? mepDai(p.x, p.y) < D / 2 - SAI_SO : (Math.abs(p.x) + D / 2 > X / 2 + SAI_SO || Math.abs(p.y) + D / 2 > Y / 2 + SAI_SO)) {
        loi.push('Cọc ' + p.ten + ' (' + p.x + '; ' + p.y + ') nằm ngoài đài ' + (hd ? 'vát' : X + ' × ' + Y + ' m') + '.');
      }
    });
    if (!(zMui < zDay)) loi.push('Mũi cọc phải thấp hơn đáy đài.');
    // Điểm đặt lực: tâm cẩu (xc, yc) và 4 chân cẩu (xc ± Ht/2, yc ± Ht/2) phải nằm trong đài
    var Ht = Number(A.Ht) || 0, chan = [];
    if (hd ? mepDai(xc, yc) < SAI_SO : (Math.abs(xc) > X / 2 - SAI_SO || Math.abs(yc) > Y / 2 - SAI_SO)) {
      loi.push('Tâm cẩu (' + xc + '; ' + yc + ') nằm ngoài đài ' + (hd ? 'vát' : X + ' × ' + Y + ' m') + '.');
    }
    if (kieuDat === 'chan') {
      if (!(Ht > 0)) loi.push('Cẩu chưa có khoảng cách chân (bề rộng thân Ht) để chia lực về 4 chân.');
      else {
        chan = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(function (d, i) { return { ten: 'CH' + (i + 1), x: tron(xc + d[0] * Ht / 2), y: tron(yc + d[1] * Ht / 2) }; });
        if (chan.some(function (c) { return hd ? mepDai(c.x, c.y) < -SAI_SO : Math.abs(c.x) > X / 2 + SAI_SO || Math.abs(c.y) > Y / 2 + SAI_SO; })) {
          loi.push('Chân cẩu (cách nhau ' + Ht + ' m quanh tâm cẩu ' + xc + '; ' + yc + ') nằm ngoài đài ' + (hd ? 'vát' : X + ' × ' + Y + ' m') + '.');
        }
      }
    }
    if (loi.length) return { hopLe: false, loi: loi };

    // ---- Dầm giằng các cọc ----
    var dam = [], capDam = {};
    ((s.damGiang && s.damGiang.ds) || []).forEach(function (d, i) {
      var ten = 'DG' + (i + 1), tu = Number(d.tuCoc), den = Number(d.denCoc);
      var z = tron(Number(d.z)), b = Number(d.b), h = Number(d.h);
      var c1 = coc[tu - 1], c2 = coc[den - 1];
      var bt = (MCT.data.vatLieu.beTong || []).filter(function (x) { return x.cap === d.beTong; })[0];
      if (!c1 || !c2 || tu === den) { loi.push('Dầm giằng ' + ten + ': chọn hai cọc khác nhau trong ' + coc.length + ' cọc.'); return; }
      if (!(b > 0 && h > 0)) loi.push('Dầm giằng ' + ten + ': b, h phải lớn hơn 0.');
      if (!(z < zDay - SAI_SO && z > zMui + SAI_SO)) loi.push('Dầm giằng ' + ten + ': cao độ tim dầm ' + d.z + ' m phải nằm giữa đáy đài (' + zDay + ' m) và mũi cọc (' + zMui + ' m).');
      else if (z + h / 2 > zDay + SAI_SO) loi.push('Dầm giằng ' + ten + ': mặt trên dầm (' + tron(z + h / 2) + ' m) cao hơn đáy đài (' + zDay + ' m) – hạ cao độ tim dầm.');
      if (!bt) loi.push('Dầm giằng ' + ten + ': không có cấp bê tông "' + d.beTong + '".');
      var khoa = [Math.min(tu, den), Math.max(tu, den), z].join('|');
      if (capDam[khoa]) loi.push('Dầm giằng ' + ten + ' trùng dầm ' + capDam[khoa] + ' (cùng hai cọc, cùng cao độ).');
      capDam[khoa] = ten;
      dam.push({ ten: ten, chiSo: i, tuCoc: c1.ten, denCoc: c2.ten, c1: c1, c2: c2, z: z, b: b, h: h, beTong: d.beTong, Eb: bt ? bt.Eb : 0,
        L: tron(Math.hypot(c2.x - c1.x, c2.y - c1.y)), tietDien: 'DAM_' + ten });
    });
    if (loi.length) return { hopLe: false, loi: loi };

    // ---- Lưới tấm đài (mặt phẳng giữa đài), đường lưới qua tâm đài (điểm đặt tải) và tâm các cọc ----
    var buocLuoi = chiaDai === 'deu' ? luoi : Infinity;   // tối thiểu: mỗi đoạn giữa hai đường bắt buộc là một ô
    // đài vát: thêm đường lưới qua các đỉnh đa giác và trọng tâm đài (nút "tâm đài" lấy chuyển vị)
    var tamDai = hd ? [tron(hd.trongTam[0]), tron(hd.trongTam[1])] : [0, 0];
    var themX = hd ? hd.dinh.map(function (q) { return q[0]; }).concat([tamDai[0]]) : [];
    var themY = hd ? hd.dinh.map(function (q) { return q[1]; }).concat([tamDai[1]]) : [];
    var xs = chiaDai === 'khong' ? [tron(bx0), tron(bx1)]
      : chiaDoan(bx0, bx1, buocLuoi, [0, xc].concat(coc.map(function (p) { return p.x; }), chan.map(function (c) { return c.x; }), themX));
    var ys = chiaDai === 'khong' ? [tron(by0), tron(by1)]
      : chiaDoan(by0, by1, buocLuoi, [0, yc].concat(coc.map(function (p) { return p.y; }), chan.map(function (c) { return c.y; }), themY));
    function tenNutDai(i, k) { return 'D' + (i + 1) + '_' + (k + 1); }
    var diem = [], thanh = [], vo = [], diemRieng = [], nutTrong = {}, soD0 = 0, daCoNut = {};
    // đài vát: chỉ tạo nút lưới nằm trong đài (khi ô vỏ hoặc cọc / điểm đặt lực dùng tới)
    function nutLuoi(i, k) {
      var ten = tenNutDai(i, k);
      if (hd && !daCoNut[ten]) { daCoNut[ten] = true; diem.push({ ten: ten, x: xs[i], y: ys[k], z: zGiua }); }
      return ten;
    }
    // Nút của tấm tại (x, y); không chia: điểm nằm trong tấm (tạo khi cần, tên D0_<k>, đánh dấu điểm riêng để ETABS giữ và chia lưới qua)
    function timNutDai(x, y) {
      var i = xs.indexOf(tron(x)), k = ys.indexOf(tron(y));
      if (i >= 0 && k >= 0) return nutLuoi(i, k);
      if (chiaDai !== 'khong') return null;
      var khoa = tron(x) + '|' + tron(y);
      if (!nutTrong[khoa]) {
        nutTrong[khoa] = 'D0_' + (++soD0);
        diem.push({ ten: nutTrong[khoa], x: tron(x), y: tron(y), z: zGiua });
        diemRieng.push(nutTrong[khoa]);
      }
      return nutTrong[khoa];
    }
    if (!hd) {
      xs.forEach(function (x, i) { ys.forEach(function (y, k) { diem.push({ ten: tenNutDai(i, k), x: x, y: y, z: zGiua }); }); });
      for (var i = 0; i < xs.length - 1; i++) {
        for (var k = 0; k < ys.length - 1; k++) {
          vo.push({ ten: 'V' + (i + 1) + '_' + (k + 1), tietDien: 'DAI', diem: [tenNutDai(i, k), tenNutDai(i + 1, k), tenNutDai(i + 1, k + 1), tenNutDai(i, k + 1)] });
        }
      }
    } else {
      // Đài vát: mỗi ô lưới cắt theo đa giác đài (ô ngoài đài bỏ, ô có cạnh vát thành tam giác / ngũ giác); đỉnh nằm trên
      // cạnh vát không trùng nút lưới đặt tên D0_<k> (dùng chung giữa các ô kề nhau); mảnh vụn < 2 % ô bỏ qua
      var chiSoX = {}, chiSoY = {}, nutCat = {};
      xs.forEach(function (x, i) { chiSoX[tron(x)] = i; }); ys.forEach(function (y, k) { chiSoY[tron(y)] = k; });
      var tenDinh = function (x, y) {
        x = tron(x); y = tron(y);
        if (chiSoX[x] !== undefined && chiSoY[y] !== undefined) return nutLuoi(chiSoX[x], chiSoY[y]);
        var khoa = x + '|' + y;
        if (!nutCat[khoa]) { nutCat[khoa] = 'D0_' + (++soD0); diem.push({ ten: nutCat[khoa], x: x, y: y, z: zGiua }); }
        return nutCat[khoa];
      };
      for (var i2 = 0; i2 < xs.length - 1; i2++) {
        for (var k2 = 0; k2 < ys.length - 1; k2++) {
          var o = [[xs[i2], ys[k2]], [xs[i2 + 1], ys[k2]], [xs[i2 + 1], ys[k2 + 1]], [xs[i2], ys[k2 + 1]]];
          var manh = MCT.calc.hinhDai.catDaGiac(o, hd.dinh);
          if (manh.length < 3 || MCT.calc.hinhDai.dienTich(manh) < 0.02 * (xs[i2 + 1] - xs[i2]) * (ys[k2 + 1] - ys[k2])) continue;
          var ten = manh.map(function (q) { return tenDinh(q[0], q[1]); }).filter(function (t, j, ds) { return t !== ds[(j + ds.length - 1) % ds.length]; });
          if (ten.length >= 3) vo.push({ ten: 'V' + (i2 + 1) + '_' + (k2 + 1), tietDien: 'DAI', diem: ten });
        }
      }
    }

    // ---- Các cao độ nút cọc (giống nhau cho mọi cọc) ----
    var duoiDay = chiaCoc(zDay, zMui, buocCoc, [zBatDau].concat(dam.map(function (d) { return d.z; })));   // từ đáy đài xuống mũi
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

    // ---- Dầm giằng: thanh nối nút hai cọc tại cao độ tim dầm ----
    dam.forEach(function (d) {
      d.dau = d.c1.ten + '_' + tenSo(d.z);
      d.cuoi = d.c2.ten + '_' + tenSo(d.z);
      thanh.push({ ten: d.ten, dau: d.dau, cuoi: d.cuoi, tietDien: d.tietDien, loai: 'dam' });
      delete d.c1; delete d.c2;
    });

    // ---- Điểm đặt tải: nút tâm cẩu trên tấm vỏ (4 chân cẩu khi chia lực về chân); tâm đài để lấy chuyển vị ----
    var nutTai = timNutDai(xc, yc), nutTamDai = timNutDai(tamDai[0], tamDai[1]);
    chan.forEach(function (c) { c.nut = timNutDai(c.x, c.y); });

    // ---- Tầng ETABS: mỗi cao độ nút là một tầng; đáy công trình (base) ở mũi cọc ----
    var mocTang = capDo.map(tron).sort(function (p, q) { return p - q; })
      .filter(function (v, j, ds) { return j === 0 || v - ds[j - 1] > 1e-3; });
    var tenDacBiet = {};
    tenDacBiet[zGiua] = 'GIUA_DAI'; tenDacBiet[tron(zDay)] = 'DAY_DAI';
    if (batDau === 'day-ho') tenDacBiet[tron(zBatDau)] = tenDacBiet[tron(zBatDau)] || 'DAY_HO';
    dam.forEach(function (d) { tenDacBiet[d.z] = tenDacBiet[d.z] || 'DAM_' + tenSo(d.z); });
    var tang = [];
    for (var t = 1; t < mocTang.length; t++) {
      tang.push({ ten: tenDacBiet[mocTang[t]] || 'Z' + tenSo(mocTang[t]), caoDo: mocTang[t], cao: tron(mocTang[t] - mocTang[t - 1]) });
    }

    var btDai = A.vatLieu.beTong, btCoc = S.vatLieu;
    var tenBtDai = 'BT_' + btDai.cap, tenBtCoc = 'BT_' + btCoc.beTong;
    var vatLieu = [{ ten: tenBtDai, E: btDai.Eb * 1000, nu: 0.2, alpha: 1e-5, gamma: 25 }];
    if (tenBtCoc !== tenBtDai) vatLieu.push({ ten: tenBtCoc, E: btCoc.E * 1000, nu: 0.2, alpha: 1e-5, gamma: 25 });
    dam.forEach(function (d) {
      var tenBt = 'BT_' + d.beTong;
      if (!vatLieu.some(function (v) { return v.ten === tenBt; })) vatLieu.push({ ten: tenBt, E: d.Eb * 1000, nu: 0.2, alpha: 1e-5, gamma: 25 });
    });
    var CUNG = [100, 100, 100, 100, 100, 100, 0, 0];   // A, As2, As3, J, I22, I33, khối lượng, trọng lượng

    return {
      hopLe: true, loi: [],
      thongSo: {
        X: X, Y: Y, H: H, zMat: zMat, zGiua: zGiua, zDay: zDay, zMui: zMui, D: D, bp: bp, soCoc: coc.length,
        batDauLoXo: batDau, zBatDau: zBatDau, luoi: luoi, chiaDai: chiaDai, buocCoc: buocCoc, nx: xs.length, ny: ys.length,
        diemDatLuc: kieuDat, xc: xc, yc: yc, Ht: Ht,
        // hình đài trên mặt bằng: chữ nhật giữa gốc toạ độ hoặc đa giác vát (móng 3 cọc)
        kieuDai: hd ? 'vat' : 'chu-nhat', x0: tron(bx0), x1: tron(bx1), y0: tron(by0), y1: tron(by1), tamDai: tamDai,
        dinhDai: hd ? hd.dinh : [[tron(bx0), tron(by0)], [tron(bx1), tron(by0)], [tron(bx1), tron(by1)], [tron(bx0), tron(by1)]],
        dienTichDai: hd ? hd.dienTich : X * Y
      },
      tang: { caoDoDay: tron(mocTang[0]), ds: tang },
      vatLieu: vatLieu,
      tietDienThanh: [
        { ten: 'COC', loai: 'tron', vatLieu: tenBtCoc, D: D },
        { ten: 'COC_TRONG_DAI', loai: 'tron', vatLieu: tenBtCoc, D: D, heSo: CUNG }
      ].concat(dam.map(function (d) { return { ten: d.tietDien, loai: 'chu-nhat', vatLieu: 'BT_' + d.beTong, cao: d.h, rong: d.b }; })),
      tietDienVo: [{ ten: 'DAI', vatLieu: tenBtDai, day: H }],
      diem: diem, thanh: thanh, vo: vo, loXo: loXo, gioiHan: gioiHan,
      thuocTinhLoXo: thuocTinhLoXo, diemRieng: diemRieng,
      coc: coc, dam: dam, nutTai: nutTai, nutTamDai: nutTamDai, chan: chan, xs: xs, ys: ys, capDo: capDo, bangLoXo: bangLoXo,
      thongKe: { soTang: tang.length, soDiem: diem.length, soThanh: thanh.length, soVo: vo.length, soLoXo: loXo.length, soDam: dam.length }
    };
  }

  /** Dữ liệu gửi cầu nối ETABS (bỏ các bảng chỉ dùng để hiển thị); t = kết quả taiTrongEtabs (load pattern, tổ hợp). */
  function duLieuGuiEtabs(m, t) {
    return {
      tang: m.tang, vatLieu: m.vatLieu, tietDienThanh: m.tietDienThanh, tietDienVo: m.tietDienVo,
      diem: m.diem, thanh: m.thanh, vo: m.vo, loXo: m.loXo, thuocTinhLoXo: m.thuocTinhLoXo, gioiHan: m.gioiHan, diemRieng: m.diemRieng || [],
      mauTai: t && t.hopLe ? t.mauTai : [], toHop: t && t.hopLe ? t.toHop : []
    };
  }

  MCT.calc.taoMoHinhEtabs = taoMoHinhEtabs;
  MCT.calc.duLieuGuiEtabs = duLieuGuiEtabs;
})(globalThis.MCT = globalThis.MCT || {});
