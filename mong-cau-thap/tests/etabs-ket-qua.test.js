// Xử lý kết quả ETABS (bước 4) với số liệu giả lập có quy luật – kiểm tra bao nội lực, mặt cắt đài, chuyển vị
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
['dia-chat', 'sct-coc', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
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
  // bao theo chiều sâu cọc C1: trạm đầu tiên ở giữa đài, cuối cùng ở mũi
  const doc = r.coc[0].doc;
  gan(doc[0].z, -1.8); gan(doc[doc.length - 1].z, -34.6);
  // M lớn nhất: √(M2² + M3²), M2 = 100 + 2j − k lớn nhất ở k = 1, j = 47
  gan(r.cocKiemTra.Mmax.gt, Math.hypot(100 + 2 * n - 1, n), 'Mmax');
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
  assert.equal(r.ketLuan.length, 8);
});

test('Thiếu kết quả thì báo lỗi', () => {
  assert.equal(MCT.calc.ketQuaEtabs(null, m, t, s, kq).hopLe, false);
});
