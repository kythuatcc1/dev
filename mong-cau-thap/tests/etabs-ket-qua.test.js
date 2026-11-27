// Xử lý kết quả ETABS (bước 4) với số liệu giả lập có quy luật – kiểm tra bao nội lực, mặt cắt đài, chuyển vị
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
globalThis.MCT.macDinh.dai.hinh3 = 'chu-nhat';   // test đối chiếu Excel: đài chữ nhật X × Y (đài vát 3 cọc thử ở hinh-dai.test.js)
['dia-chat', 'sct-coc', 'hinh-dai', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca', 'etabs-mo-hinh', 'etabs-tai-trong', 'etabs-ket-qua'].forEach((f) => require(`../js/calc/${f}.js`));
const MCT = globalThis.MCT;

function gan(a, e, msg) { assert.ok(Math.abs(a - e) <= 1e-6 * Math.max(1, Math.abs(e)), `${msg}: ${a} ≠ ${e}`); }

const s = JSON.parse(JSON.stringify(MCT.macDinh));
const kq = MCT.calc.tinhTatCa(s);
const m = MCT.calc.taoMoHinhEtabs(s, kq);
const t = MCT.calc.taiTrongEtabs(s, kq, m);
const gui = MCT.calc.duLieuPhanTich(m, t);

// Kết quả giả lập (cùng quy luật với ETABSv1 giả lập của cầu nối)
const diem = new Map(m.diem.map((d) => [d.ten, d]));
const raw = {
  toHop: gui.toHop,
  coc: m.coc.map((c, ip) => ({
    ten: c.ten,
    dong: [].concat(...m.thanh.filter((f) => c.thanh.includes(f.ten)).map((f) => {
      const k = Number(f.ten.split('_')[1]), zI = diem.get(f.dau).z, zJ = diem.get(f.cuoi).z, L = Math.abs(zI - zJ);
      return [].concat(...gui.toHop.map((ten, j) => [0, L].map((sta) =>
        [zI + (zJ - zI) * sta / L, j, -(1000 + 100 * (ip + 1) + 10 * j + k) - 0.5 * sta, 10 + j, 0, 0, 100 + 2 * j - k, j])));
    }))
  })),
  chuyenVi: { nut: gui.nutChuyenVi, dong: [].concat(...gui.nutChuyenVi.map((n, i) => gui.toHop.map((ten, j) => [i, j, 0.001 * (j + 1), 0.0005, -0.002, 1e-4, 2e-4, 0]))) },
  dai: (() => {
    const nut = [], dong = [];
    m.xs.forEach((x) => m.ys.forEach((y) => { nut.push([x, y]); }));
    nut.forEach((p, ni) => gui.toHop.forEach((ten, j) => dong.push([ni, j, 10 + j, 5, 0, 2, 1])));
    return { nut, dong };
  })()
};

test('Dữ liệu gửi lệnh phân tích: cọc, tổ hợp tuyến tính (không BAO), nút chuyển vị', () => {
  assert.equal(gui.coc.length, 3);
  assert.equal(gui.coc[0].thanh[0], 'C1_1');
  assert.equal(gui.coc[0].thanh.length, m.capDo.length - 1);
  assert.equal(gui.toHop.length, 48);
  assert.ok(!gui.toHop.includes('BAO'));
  assert.equal(gui.nutChuyenVi[0], m.nutTai);
  assert.equal(gui.nutChuyenVi.length, 4);
  assert.deepEqual(gui.diem[m.nutTai], [0, 0, -1.8]);
});

const r = MCT.calc.ketQuaEtabs(raw, m, t, s, kq);

test('Cọc: lực đầu cọc, bao theo chiều sâu, so với Qa', () => {
  assert.equal(r.hopLe, true, (r.loi || []).join('; '));
  const n = gui.toHop.length - 1;
  // nén lớn nhất tại đầu cọc (−2,6): cọc C3, tổ hợp cuối, đoạn 2 → 1000 + 300 + 10·47 + 2
  gan(r.cocKiemTra.Pnen.gt, 1000 + 300 + 10 * n + 2, 'Pnén đầu cọc');
  assert.equal(r.cocKiemTra.Pnen.coc, 'C3');
  assert.equal(r.cocKiemTra.Pnen.toHop, gui.toHop[n]);
  assert.equal(r.cocKiemTra.Pkeo, null, 'không có cọc kéo');
  assert.equal(r.cocKiemTra.okNen, 1772 <= kq.B.Qa);
  // bao theo chiều sâu cọc C1: bỏ đoạn cọc trong đài – trạm đầu tiên ở đáy đài (−2,6), cuối cùng ở mũi
  const doc = r.coc[0].doc;
  gan(doc[0].z, -2.6); gan(doc[doc.length - 1].z, -34.6);
  assert.ok(r.coc.every((c) => c.doc.every((d) => d.z <= -2.6 + 1e-9)), 'không còn trạm trong đài');
  // M lớn nhất: √(M2² + M3²), M2 = 100 + 2j − k lớn nhất ở k = 1 (đầu dưới thanh trong đài = đáy đài), j = 47
  gan(r.cocKiemTra.Mmax.gt, Math.hypot(100 + 2 * n - 1, n), 'Mmax');
  gan(r.cocKiemTra.Mmax.z, -2.6, 'Mmax tại đáy đài');
  gan(r.cocKiemTra.Vmax.gt, 10 + n, 'Vmax');
  assert.ok(r.diemTuongTac.length > 0);
  assert.ok(r.cocKiemTra.tuongTac && r.cocKiemTra.tuongTac.tiSo > 0);
});

test('Chuyển vị: Δ = √(U1² + U2²), ψ = √(R1² + R2²)', () => {
  const n = gui.toHop.length;
  gan(r.chuyenVi.DeltaMax.gt, Math.hypot(0.001 * n, 0.0005) * 1000, 'Δ (mm)');
  gan(r.chuyenVi.psiMax.gt, Math.hypot(1e-4, 2e-4) * 180 / Math.PI, 'ψ (độ)');
  gan(r.chuyenVi.gioiHanDelta, 10); gan(r.chuyenVi.gioiHanPsi, 1);
  assert.equal(r.chuyenVi.okDelta, false, '48 mm > 10 mm');
  assert.equal(r.chuyenVi.nut[0].nhan, 'Tâm đài');
});

test('Đài: mômen, lực cắt mặt cắt = ∫ trên suốt bề rộng; thép như mục D', () => {
  const n = gui.toHop.length - 1, X = m.thongSo.X, Y = m.thongSo.Y;
  gan(r.dai.X.Mduong.gt, (10 + n) * Y, 'M theo X (∫M11 dy)');
  gan(r.dai.X.Mduong.b, Y);
  assert.equal(r.dai.X.Mam, null, 'không có mômen âm');
  gan(r.dai.Y.Mduong.gt, 5 * X, 'M theo Y (∫M22 dx)');
  gan(r.dai.X.Vmax.gt, 2 * Y, 'V theo X'); gan(r.dai.Y.Vmax.gt, 1 * X, 'V theo Y');
  const h0 = 1.6 - 0.15, M = (10 + n) * Y, am = M / (19.5e3 * Y * h0 * h0), xi = 1 - Math.sqrt(1 - 2 * am);
  gan(r.dai.X.duoi.can.As, xi * 19.5 * Y * h0 / 435 * 1e6, 'As lớp dưới X (mm²)');
  gan(r.dai.X.duoi.chon.AsMet, Math.PI * 400 / 4 * 1000 / 150, 'As chọn Ø20a150 (mm²/m)');
  assert.equal(r.dai.X.duoi.ok, true);
  gan(r.dai.X.catKT.Qb, 0.5 * 1.3e3 * Y * h0, 'Qb = 0,5·Rbt·b·h0');
  assert.equal(r.ketLuan.length, 10, '8 kiểm tra + nứt đài + bulong kéo–cắt');
  // nứt đài: 4 trường hợp, chọn trường hợp bất lợi; bulong kéo + cắt đồng thời theo mục E
  assert.equal(r.dai.nut.ds.length, 4);
  assert.ok(r.dai.nut.xauNhat && r.dai.nut.xauNhat.Mcrc > 0);
  gan(r.bulong.tiSo, Math.hypot(kq.E.Pt1 / kq.E.Ntb, kq.E.Ps1 / kq.E.Nvb), 'bulong kéo + cắt');
});

test('Nứt đài (TCVN 5574:2018 8.2.2): M_crc theo tiết diện quy đổi, bề rộng vết nứt khi M > M_crc', () => {
  const bt = { Rbt_ser: 1.95, Eb: 34500 }, Es = 200000;
  const b = 4, H = 1.6, a = 0.15, As = 2094.4 * 4, Asn = 2094.4 * 4, ds = 20;
  // tính tay (mm, N)
  const bm = 4000, h = 1600, am = 150, al = Es / 34500;
  const Ared = bm * h + al * (As + Asn);
  const yt = (bm * h * h / 2 + al * (As * am + Asn * (h - am))) / Ared;
  const Ired = bm * h ** 3 / 12 + bm * h * (h / 2 - yt) ** 2 + al * As * (yt - am) ** 2 + al * Asn * (h - am - yt) ** 2;
  const Mcrc = 1.3 * Ired / yt * 1.95 / 1e6;
  const r1 = MCT.calc.kiemTraNut(1000, b, H, a, As, Asn, ds, bt, Es);
  gan(r1.Mcrc, Mcrc, 'Mcrc');
  assert.ok(Mcrc > 1.3 * bm * h * h / 6 * 1.95 / 1e6, 'thép làm tăng Mcrc so với tiết diện bê tông');
  assert.equal(r1.nut, false); assert.equal(r1.ok, true);
  const M = 9000, r2 = MCT.calc.kiemTraNut(-M, b, H, a, As, Asn, ds, bt, Es);
  const sigma = M * 1e6 / (0.8 * (h - am) * As), psi = 1 - 0.8 * Mcrc / M;
  const ls = Math.min(Math.max(0.5 * bm * Math.min(Math.max(yt, 2 * am), h / 2) / As * ds, 200), 400);
  assert.equal(r2.nut, true);
  gan(r2.sigma, sigma, 'σs'); gan(r2.psi, psi, 'ψs'); gan(r2.ls, ls, 'ls');
  gan(r2.acrc, 0.5 * psi * sigma / Es * ls, 'acrc');
  assert.equal(r2.ok, r2.acrc <= 0.4);
});

test('Kiểm tra P–M: mọi cặp (N, M), điểm nguy hiểm từng cọc như báo cáo thẩm tra', () => {
  const ck = r.cocKiemTra, tt = MCT.calc.tomTatEtabs(raw, m, t);
  const tong = tt.coc.reduce((a, c) => a + c.capNM.length, 0);
  assert.equal(ck.soCapNM, tong, 'kiểm tra đủ mọi cặp');
  assert.equal(ck.soCapVuot, 0);
  assert.ok(r.diemTuongTac.length > 0 && r.diemTuongTac.length <= tong);
  for (const c of tt.coc) {
    const ds = ck.nguyHiem.filter((d) => d.coc === c.ten);
    assert.ok(ds.length >= 2 && ds.length <= 4, c.ten + ': 2–4 điểm nguy hiểm');
    const Nmax = Math.max(...c.capNM.map((p) => p[0])), Nmin = Math.min(...c.capNM.map((p) => p[0])), Mmax = Math.max(...c.capNM.map((p) => p[1]));
    gan(ds.find((d) => /N nén lớn nhất/.test(d.loai)).N, Nmax, c.ten + ' Nmax');
    gan(ds.find((d) => /N nén nhỏ nhất|Kéo lớn nhất/.test(d.loai)).N, Nmin, c.ten + ' Nmin');
    gan(ds.find((d) => /M lớn nhất/.test(d.loai)).M, Mmax, c.ten + ' Mmax');
    assert.ok(ds.some((d) => /Tỉ số M\/Mgh lớn nhất/.test(d.loai)));
    ds.forEach((d) => { gan(d.tiSo, d.M / d.Mgh, 'tỉ số'); assert.equal(d.ok, d.tiSo <= 1); assert.ok(gui.toHop.includes(d.toHop)); });
  }
  assert.deepEqual(ck.nguyHiem.map((d) => d.stt), ck.nguyHiem.map((d, i) => i + 1));
  gan(Math.max(...ck.nguyHiem.map((d) => d.tiSo)), ck.tuongTac.tiSo, 'tỉ số lớn nhất nằm trong bảng');
});

test('Thiếu kết quả thì báo lỗi', () => {
  assert.equal(MCT.calc.ketQuaEtabs(null, m, t, s, kq).hopLe, false);
});

test('Tóm tắt lưu được (JSON) và kiểm tra lại cho cùng kết quả; kích thước gọn', () => {
  const tt = MCT.calc.tomTatEtabs(raw, m, t);
  const chuoi = JSON.stringify(tt);
  assert.ok(chuoi.length < 1.5e6, 'tóm tắt quá lớn: ' + chuoi.length);
  const lai = MCT.calc.kiemTraEtabs(JSON.parse(chuoi), s, kq);
  gan(lai.cocKiemTra.Pnen.gt, r.cocKiemTra.Pnen.gt, 'Pnén');
  gan(lai.cocKiemTra.tuongTac.tiSo, r.cocKiemTra.tuongTac.tiSo, 'tỉ số N–M');
  gan(lai.dai.X.duoi.can.As, r.dai.X.duoi.can.As, 'As');
  gan(lai.chuyenVi.DeltaMax.gt, r.chuyenVi.DeltaMax.gt, 'Δ');
  // đổi thông số (thép chọn) → kiểm tra tính lại theo thông số mới, không cần chạy ETABS lại
  const s2 = JSON.parse(JSON.stringify(s)); s2.thep.duoiX = { d: 10, s: 300 };
  const lai2 = MCT.calc.kiemTraEtabs(JSON.parse(chuoi), s2, kq);
  gan(lai2.dai.X.duoi.chon.AsMet, Math.PI * 100 / 4 * 1000 / 300, 'As chọn mới');
});

test('Kết luận theo phương pháp ETABS: B, D theo ETABS, thêm kiểm tra ngang, giữ C và E', () => {
  const F = MCT.calc.ketLuanEtabs(kq.F, r);
  assert.equal(F.hopLe, true);
  assert.equal(F.phuongPhap, 'etabs');
  const ten = F.ds.map((x) => x.ten);
  assert.ok(F.ds.some((x) => x.ten === 'Tải trọng nén lên cọc' && x.etabs));
  assert.ok(F.ds.some((x) => x.ten === 'Thép lớp dưới phương X' && x.etabs));
  assert.ok(ten.includes('Xuyên thủng đài do chân cẩu'), 'giữ mục C');
  assert.equal(F.ds.filter((x) => x.ma === 'E').length, 7, 'giữ 6 kiểm tra bulong + kéo–cắt đồng thời');
  assert.ok(ten.includes('Bulong chịu kéo + cắt đồng thời'));
  assert.ok(ten.some((x) => /^Nứt đài móng/.test(x)));
  assert.ok(ten.includes('Chuyển vị ngang') && ten.includes('Góc xoay') && ten.includes('Cọc chịu cắt') && ten.includes('Tương tác N–M cọc'));
  assert.equal(F.ds.filter((x) => x.ma === 'B').length, 2);
  assert.equal(F.ds.filter((x) => x.ma === 'D').length, 5, '4 lớp thép + nứt đài');
  // số liệu giả lập: chuyển vị 48 mm > 10 mm → không đủ
  assert.equal(F.ok, false);
  assert.equal(F.ketLuanGiaiTich, kq.F.ketLuan);
  assert.equal(MCT.calc.ketLuanEtabs(kq.F, null).hopLe, false, 'chưa có kết quả ETABS');
});

test('Kết quả lưu theo cách tóm tắt cũ (chưa bỏ đoạn cọc trong đài): yêu cầu chạy lại phân tích', () => {
  const tt = MCT.calc.tomTatEtabs(raw, m, t);
  const cu = Object.assign({}, tt);
  delete cu.phienBan;
  const kq2 = MCT.calc.kiemTraEtabs(cu, s, kq);
  assert.equal(kq2.hopLe, false);
  assert.match(kq2.loi[0], /chạy lại phân tích/);
  assert.equal(MCT.calc.kiemTraEtabs(tt, s, kq).hopLe, true);
});

test('Đài vát 3 cọc: mặt cắt lấy suốt bề rộng thật của đài tại vị trí cắt (cả chỗ có cạnh vát)', () => {
  const sv = JSON.parse(JSON.stringify(MCT.macDinh));
  sv.dai.hinh3 = 'vat';
  const kqv = MCT.calc.tinhTatCa(sv), mv = MCT.calc.taoMoHinhEtabs(sv, kqv);
  assert.equal(mv.hopLe, true, (mv.loi || []).join('; '));
  const tv = MCT.calc.taiTrongEtabs(sv, kqv, mv), gv = MCT.calc.duLieuPhanTich(mv, tv);
  const dv = new Map(mv.diem.map((d) => [d.ten, d]));
  // cầu nối trả nội lực tại mọi nút của các ô vỏ (kể cả nút trên cạnh vát)
  const nutVo = [...new Set([].concat(...mv.vo.map((v) => v.diem)))].map((ten) => [dv.get(ten).x, dv.get(ten).y]);
  const rawV = {
    toHop: gv.toHop,
    coc: mv.coc.map((c) => ({
      ten: c.ten,
      dong: [].concat(...mv.thanh.filter((f) => c.thanh.includes(f.ten)).map((f) => {
        const zI = dv.get(f.dau).z;
        return gv.toHop.map((ten, j) => [zI, j, -1000, 10, 0, 0, 100, j]);
      }))
    })),
    chuyenVi: { nut: gv.nutChuyenVi, dong: [] },
    dai: { nut: nutVo, dong: [].concat(...nutVo.map((p, ni) => gv.toHop.map((ten, j) => [ni, j, 10, 5, 0, 2, 1]))) }
  };
  const rv = MCT.calc.ketQuaEtabs(rawV, mv, tv, sv, kqv);
  assert.equal(rv.hopLe, true, (rv.loi || []).join('; '));
  const hd = { dinh: mv.thongSo.dinhDai };
  for (const [truc, cs, M] of [['X', 'x', 10], ['Y', 'y', 5]]) {
    const cat = rv.dai[truc].cat;
    assert.ok(cat.length >= 5, truc + ': ít mặt cắt');
    cat.forEach((d) => {
      const b = MCT.calc.hinhDai.doanCat(hd, cs, d.viTri).dai;
      assert.ok(Math.abs(d.b - b) < 1e-3, truc + ' tại ' + d.viTri + ': b = ' + d.b + ' ≠ bề rộng đài ' + b);
      gan(d.Mmax.gt, M * d.b, truc + ' tại ' + d.viTri + ': M = ∫M dt');
    });
  }
  // có mặt cắt đi qua phần vát (bề rộng nhỏ hơn chữ nhật bao) – bản chữ nhật X × Y sẽ bỏ các mặt cắt này
  assert.ok(rv.dai.X.cat.some((d) => d.b < 0.9 * (mv.thongSo.y1 - mv.thongSo.y0)), 'không có mặt cắt X qua phần vát');
  assert.ok(rv.dai.Y.cat.some((d) => d.b < 0.9 * (mv.thongSo.x1 - mv.thongSo.x0)), 'không có mặt cắt Y qua phần vát');
  // mômen lớn nhất ở mặt cắt rộng nhất
  gan(rv.dai.X.Mduong.gt, 10 * Math.max(...rv.dai.X.cat.map((d) => d.b)), 'M lớn nhất theo X');
});
