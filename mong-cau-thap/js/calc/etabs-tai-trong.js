// Tải trọng và tổ hợp cho mô hình ETABS (bước 3) – theo cách của file PDF tham khảo:
//   Load pattern: DEAD (trọng lượng bản thân đài + cọc) và tải cẩu tách theo thành phần, đặt tại MỘT điểm ở tâm đài:
//     làm việc     : FX1, FY1 (= H), FZ1 (= N, hướng xuống), MX1, MY1 (= M), MZ1 (= mômen xoắn T)
//     không làm việc: FX2, FY2, FZ2, MX2, MY2
//   Giá trị pattern = tải quy đổi của form CC1 chia n (chưa nhân hệ số) → tổ hợp nhân lại n, nên tổ hợp đúng bằng tải
//   quy đổi CC1. Mômen đặt ở tâm đài cộng thêm H·(H_đài/2): CC1 coi tải đặt ở mặt đài, còn điểm đặt tải trong mô hình ở
//   mặt phẳng giữa đài (tấm vỏ).
//   Tổ hợp theo hướng θ (H và M cùng hướng θ, M lật đài về phía θ):
//     cọc nén: 1,1·DEAD + n·cosθ·FX + n·sinθ·FY + n·FZ − n·sinθ·MX + n·cosθ·MY (+ n·MZ1 khi làm việc)
//     cọc kéo: 0,9·DEAD + … (như trên) … với FZ nhân 0,9
//   Các hướng: 8 hướng mỗi 45° (như PDF) + hướng bất lợi của từng cọc theo form CC1 mục B
//   (hướng từ tâm đài tới cọc: cọc đó nén nhiều nhất; hướng ngược lại: kéo nhiều nhất). BAO = envelope mọi tổ hợp.
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  function tron(v, so) { var k = Math.pow(10, so === undefined ? 6 : so); return Math.round(v * k) / k; }
  function chuanGoc(g) { g = tron(g % 360, 2); return g < 0 ? tron(g + 360, 2) : (g >= 360 ? 0 : g); }
  function tenGoc(g) { var t = g.toFixed(2).replace(/\.?0+$/, ''); return ('000' + t.split('.')[0]).slice(-3) + (t.indexOf('.') >= 0 ? '.' + t.split('.')[1] : ''); }

  /**
   * @param {object} s  state (s.etabs.heSoTinhTaiNen, heSoTinhTaiKeo, heSoFzKeo)
   * @param {object} kq kết quả tinhTatCa
   * @param {object} m  kết quả taoMoHinhEtabs (cần nutTai, thongSo)
   */
  function taiTrongEtabs(s, kq, m) {
    var loi = [];
    var A = kq.A, B = kq.B;
    if (!m || !m.hopLe) loi.push('Mô hình ETABS chưa hợp lệ.');
    if (!A || !A.hopLe || !A.quyDoi || !A.quyDoi.lv || !A.quyDoi.klv) loi.push('Tải trọng cẩu (mục A) chưa hợp lệ.');
    if (!B || !B.hopLe) loi.push('Toạ độ cọc (mục B) chưa hợp lệ.');
    var e = s.etabs || {};
    var kNen = Number(e.heSoTinhTaiNen), kKeo = Number(e.heSoTinhTaiKeo), kFzKeo = Number(e.heSoFzKeo);
    [kNen, kKeo, kFzKeo].forEach(function (v) { if (!(v > 0)) loi.push('Hệ số tổ hợp phải lớn hơn 0.'); });
    if (loi.length) return { hopLe: false, loi: loi.filter(function (v, i, d) { return d.indexOf(v) === i; }) };

    var n = A.n, t = m.thongSo;
    var tayDon = tron(t.zMat - t.zGiua, 4);                 // từ mặt đài tới mặt phẳng giữa đài
    function tieuChuan(q, T) {
      var H = q.H / n, N = q.N / n, M = q.M / n;
      return { H: H, N: N, M: M, Mtam: M + H * tayDon, T: T || 0 };
    }
    var lv = tieuChuan(A.quyDoi.lv, A.catalogue && A.catalogue.lv ? A.catalogue.lv.T : 0);
    var klv = tieuChuan(A.quyDoi.klv, 0);

    var diem = m.nutTai;
    function mau(ten, moTa, gt) { return { ten: ten, loai: 'Other', banThan: 0, moTa: moTa, luc: { diem: diem, giaTri: gt.map(function (v) { return tron(v); }) } }; }
    var mauTai = [{ ten: 'DEAD', loai: 'Dead', banThan: 1, moTa: 'Trọng lượng bản thân đài và cọc', luc: null }];
    [['1', lv, 'làm việc'], ['2', klv, 'không làm việc']].forEach(function (x) {
      var k = x[0], v = x[1], ten = x[2];
      mauTai.push(mau('FX' + k, 'Lực ngang H theo X – ' + ten, [v.H, 0, 0, 0, 0, 0]));
      mauTai.push(mau('FY' + k, 'Lực ngang H theo Y – ' + ten, [0, v.H, 0, 0, 0, 0]));
      mauTai.push(mau('FZ' + k, 'Lực đứng N (hướng xuống) – ' + ten, [0, 0, -v.N, 0, 0, 0]));
      mauTai.push(mau('MX' + k, 'Mômen M quanh X – ' + ten, [0, 0, 0, v.Mtam, 0, 0]));
      mauTai.push(mau('MY' + k, 'Mômen M quanh Y – ' + ten, [0, 0, 0, 0, v.Mtam, 0]));
      if (k === '1' && v.T) mauTai.push(mau('MZ1', 'Mômen xoắn T – làm việc', [0, 0, 0, 0, 0, v.T]));
    });

    // Các hướng tổ hợp
    var huong = [];
    function themHuong(goc, nguon) {
      goc = chuanGoc(goc);
      var co = huong.filter(function (h) { return Math.abs(h.goc - goc) < 0.005; })[0];
      if (co) { if (co.nguon.indexOf(nguon) < 0) co.nguon.push(nguon); } else huong.push({ goc: goc, nguon: [nguon] });
    }
    for (var g = 0; g < 360; g += 45) themHuong(g, 'PDF');
    B.coc.forEach(function (c) {
      var goc = Math.atan2(c.y, c.x) * 180 / Math.PI;
      themHuong(goc, 'C' + c.stt + ' nén');
      themHuong(goc + 180, 'C' + c.stt + ' kéo');
    });
    huong.sort(function (a, b) { return a.goc - b.goc; });

    var toHop = [];
    huong.forEach(function (h) {
      var r = h.goc * Math.PI / 180, cs = tron(Math.cos(r), 9), sn = tron(Math.sin(r), 9);
      [['lv', '1', 'LV'], ['klv', '2', 'KLV']].forEach(function (tt) {
        [['nen', kNen, n, 'NEN'], ['keo', kKeo, kFzKeo, 'KEO']].forEach(function (kk) {
          var ds = [{ ca: 'DEAD', heSo: kk[1] }];
          function them(ca, hs) { hs = tron(hs); if (Math.abs(hs) > 1e-9) ds.push({ ca: ca, heSo: hs }); }
          them('FX' + tt[1], n * cs);
          them('FY' + tt[1], n * sn);
          them('FZ' + tt[1], kk[2]);
          them('MX' + tt[1], -n * sn);
          them('MY' + tt[1], n * cs);
          if (tt[0] === 'lv' && lv.T) them('MZ1', n);
          toHop.push({ ten: tt[2] + '-' + kk[3] + '-' + tenGoc(h.goc), loai: 0, trangThai: tt[0], kieu: kk[0], goc: h.goc, nguon: h.nguon.join('; '), ds: ds });
        });
      });
    });
    toHop.push({ ten: 'BAO', loai: 1, moTa: 'Envelope mọi tổ hợp', ds: toHop.map(function (c) { return { toHop: c.ten, heSo: 1 }; }) });

    return {
      hopLe: true, loi: [],
      n: n, tayDon: tayDon, heSo: { tinhTaiNen: kNen, tinhTaiKeo: kKeo, fzKeo: kFzKeo },
      diemDatTai: diem, thanhPhan: { lv: lv, klv: klv },
      mauTai: mauTai, huong: huong, toHop: toHop,
      thongKe: { soMauTai: mauTai.length, soHuong: huong.length, soToHop: toHop.length - 1 }
    };
  }

  MCT.calc.taiTrongEtabs = taiTrongEtabs;
})(globalThis.MCT = globalThis.MCT || {});
