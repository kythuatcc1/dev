// Phần A – Thông số đầu vào (sheet "Cau thap", mục A.1 → A.4)
//   A.1  Thông số cẩu tra từ catalogue
//   A.2  Tải trọng cẩu quy đổi (nhân hệ số an toàn n)
//   A.3  Vật liệu đài cọc
//   A.4  Kích thước, trọng lượng đài và tổng ngoại lực tại đáy đài
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  // Danh sách cẩu: catalogue sheet Solieu, sheet New data (mỗi cẩu một chiều cao), cẩu tự thêm (js/calc/cau-tu-them.js)
  function danhSachCau() {
    return MCT.data.cauThap.concat(MCT.data.cauThapNewData || [], MCT.data.cauTuThem || []);
  }

  // Tìm theo tên, không phân biệt hoa thường, dấu cách
  function timCau(ten) {
    var ds = danhSachCau();
    var key = String(ten || '').replace(/\s+/g, '').toLowerCase();
    for (var i = 0; i < ds.length; i++) {
      if (ds[i].ten.replace(/\s+/g, '').toLowerCase() === key) return ds[i];
    }
    return null;
  }

  // Ô P15: =IF(I15="MC205B",1.5,1.2); cẩu tự thêm dùng n nhập cho cẩu đó
  function heSoAnToan(tenCau, cau) {
    if (cau && typeof cau.heSoAnToan === 'number') return cau.heSoAnToan;
    return tenCau === 'MC205B' ? 1.5 : 1.2;
  }

  // Giống VLOOKUP tra gần đúng: hàng cuối cùng có chiều cao <= giá trị nhập.
  function traHang(cau, chieuCao) {
    var kq = null;
    for (var i = 0; i < cau.hang.length; i++) {
      if (cau.hang[i].h <= chieuCao) kq = cau.hang[i];
      else break;
    }
    return kq;
  }

  function giaTri(v) {
    return typeof v === 'number' ? v : 0;
  }

  // Công thức quy đổi lấy đúng theo các cột F:H và M:O của sheet Solieu
  var QUY_TAC = {
    x_n: function (raw, k, n) { return giaTri(raw[k]) * n; },
    cong40_n: function (raw, k, n) { return (giaTri(raw.N) + 40) * n; },
    cong_cr_n: function (raw, k, n) { return (giaTri(raw.M) + giaTri(raw.CR)) * n; },
    cr_klv_n: function (raw, k, n) {
      var m = giaTri(raw.M), cr = giaTri(raw.CR);
      return (m < 2 * cr ? cr : m - cr) * n;
    },
    srss: function (raw) { return Math.sqrt(Math.pow(giaTri(raw.M), 2) + Math.pow(giaTri(raw.CR), 2)); }
  };

  function quyDoi(cau, hang, trangThai, n) {
    var qt = (hang.quyTac || cau.quyTac)[trangThai];
    var raw = hang[trangThai];
    return {
      N: QUY_TAC[qt.N](raw, 'N', n),
      M: QUY_TAC[qt.M](raw, 'M', n),
      H: QUY_TAC[qt.H](raw, 'H', n)
    };
  }

  // Lực nhổ lớn nhất tại 1 chân cẩu theo catalogue (Solieu!T25:T33).
  // Cẩu cũ: giá trị nhập sẵn; cẩu mới: MAX(M/d/√2 − Fv/4) ở hàng cuối của khối dữ liệu.
  function lucNhoChanCau(cau) {
    if (typeof cau.pctCoDinh === 'number') return cau.pctCoDinh;
    var h = cau.hang[cau.hang.length - 1];
    var d = cau.beRongThan;
    return Math.max(
      giaTri(h.lv.M) / d / Math.SQRT2 - giaTri(h.lv.N) / 4,
      giaTri(h.klv.M) / d / Math.SQRT2 - giaTri(h.klv.N) / 4
    );
  }

  function timTheo(ds, khoa, giaTriKhoa) {
    for (var i = 0; i < ds.length; i++) if (ds[i][khoa] === giaTriKhoa) return ds[i];
    return null;
  }

  /**
   * Tính phần A.
   * @param {object} v  { cau, chieuCao, beTong, cotThep, a_cm, X, Y, H, hinh } – hinh: kết quả MCT.calc.hinhDai (đài vát: diện tích thật)
   */
  function tinhPhanA(v) {
    var loi = [];
    var cau = timCau(v.cau);
    if (!cau) {
      return { hopLe: false, loi: ['Không tìm thấy loại cẩu "' + v.cau + '" trong catalogue.'] };
    }
    var n = heSoAnToan(cau.ten, cau);
    var hang = traHang(cau, Number(v.chieuCao));
    if (!hang) loi.push('Chiều cao tự đứng ' + v.chieuCao + ' m nằm ngoài catalogue của cẩu ' + cau.ten + '.');

    var nhanLv = cau.nhan.lv;
    var catalogue = null, quyDoiLv = null, quyDoiKlv = null, mXoan = null;
    if (hang) {
      mXoan = typeof cau.mXoan === 'number' ? cau.mXoan : (typeof hang.lv.T === 'number' ? hang.lv.T : null);
      catalogue = {
        lv: { N: hang.lv.N, M: hang.lv.M, H: hang.lv.H, CR: 'CR' in hang.lv ? hang.lv.CR : null, T: mXoan },
        klv: { N: hang.klv.N, M: hang.klv.M, H: hang.klv.H, CR: 'CR' in hang.klv ? hang.klv.CR : null, T: null }
      };
      quyDoiLv = quyDoi(cau, hang, 'lv', n);
      quyDoiKlv = quyDoi(cau, hang, 'klv', n);
    }

    var bt = timTheo(MCT.data.vatLieu.beTong, 'cap', v.beTong);
    var ct = timTheo(MCT.data.vatLieu.cotThep, 'nhom', v.cotThep);
    if (!bt) loi.push('Không có cấp bê tông "' + v.beTong + '".');
    if (!ct) loi.push('Không có nhóm cốt thép "' + v.cotThep + '".');

    var X = Number(v.X), Y = Number(v.Y), H = Number(v.H);
    var hinh = v.hinh && v.hinh.kieu === 'vat' ? v.hinh : null;
    if (hinh && !hinh.hopLe) loi = loi.concat(hinh.loi);
    // Ô L40: =25*X*Y*H*1.1; đài vát (móng 3 cọc): 25 × diện tích đài × H × 1,1
    var dienTich = hinh ? hinh.dienTich : X * Y;
    var P = hinh ? 25 * dienTich * H * 1.1 : 25 * X * Y * H * 1.1;
    if (hinh && hinh.hopLe && cau.beRongThan > 0) hinh.canhBao = hinh.canhBao.concat(MCT.calc.hinhDai.kiemTraChanCau(hinh, cau.beRongThan, 0, 0));

    // Ô H44:J45 – tổng ngoại lực quy về trọng tâm đáy đài
    function ngoaiLuc(q) {
      return q ? { M: q.M + q.H * H, P: q.N + P, H: q.H } : null;
    }

    return {
      hopLe: loi.length === 0,
      loi: loi,
      cau: cau,
      n: n,
      chieuDaiTayCan: cau.chieuDaiTayCan,
      Ht: cau.beRongThan,
      nhan: {
        N: nhanLv.N || '-', M: nhanLv.M || '-', H: nhanLv.H || '-',
        CR: nhanLv.CR || '-', T: cau.nhanXoan || '-'
      },
      hang: hang,
      catalogue: catalogue,
      quyDoi: { lv: quyDoiLv, klv: quyDoiKlv },
      vatLieu: {
        beTong: bt, cotThep: ct,
        Rb: bt && bt.Rb, Rbt: bt && bt.Rbt, Eb: bt && bt.Eb,
        Rs: ct && ct.Rs, Rsc: ct && ct.Rsc,
        a_cm: Number(v.a_cm)
      },
      dai: { X: X, Y: Y, H: H, P: P, dienTich: dienTich, hinh: v.hinh || null },
      ngoaiLuc: { lv: ngoaiLuc(quyDoiLv), klv: ngoaiLuc(quyDoiKlv) },
      Pct: lucNhoChanCau(cau)
    };
  }

  MCT.calc.timCau = timCau;
  MCT.calc.danhSachCau = danhSachCau;
  MCT.calc.heSoAnToan = heSoAnToan;
  MCT.calc.traHang = traHang;
  MCT.calc.quyDoi = quyDoi;
  MCT.calc.lucNhoChanCau = lucNhoChanCau;
  MCT.calc.tinhPhanA = tinhPhanA;
})(globalThis.MCT = globalThis.MCT || {});
