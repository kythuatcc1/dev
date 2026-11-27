// Dầm giằng cọc: dựng vào mô hình ETABS, đọc nội lực, kiểm tra theo TCVN 5574:2018
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'cau-thap-new-data', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
globalThis.MCT.macDinh.dai.hinh3 = 'chu-nhat';   // test đối chiếu Excel: đài chữ nhật X × Y (đài vát 3 cọc thử ở hinh-dai.test.js)
['dia-chat', 'sct-coc', 'hinh-dai', 'phan-a-tai-trong', 'cau-tu-them', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca', 'etabs-mo-hinh', 'etabs-tai-trong', 'etabs-ket-qua', 'dam-giang']
  .forEach((f) => require(`../js/calc/${f}.js`));
const MCT = globalThis.MCT;
const C = MCT.calc;

function gan(a, e, msg, tol) { assert.ok(Math.abs(a - e) <= (tol || 1e-6) * Math.max(1, Math.abs(e)), `${msg}: ${a} ≠ ${e}`); }

function trangThaiCoDam(ds) {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  s.damGiang.ds = ds.map((d) => Object.assign(JSON.parse(JSON.stringify(s.damGiang.mau)), d));
  return s;
}
const s = trangThaiCoDam([{ tuCoc: 1, denCoc: 2, tren: { n: 4, d: 22 } }, { tuCoc: 2, denCoc: 3 }, { tuCoc: 3, denCoc: 1, z: -10, b: 0.3, h: 0.5 }]);
const kq = C.tinhTatCa(s);
const m = C.taoMoHinhEtabs(s, kq);
const t = C.taiTrongEtabs(s, kq, m);

test('Mô hình: dầm nối nút hai cọc tại cao độ tim dầm, tiết diện chữ nhật, vật liệu dầm', () => {
  assert.equal(m.hopLe, true, (m.loi || []).join('; '));
  assert.equal(m.dam.length, 3);
  assert.deepEqual(m.dam.map((d) => d.ten), ['DG1', 'DG2', 'DG3']);
  const diem = new Map(m.diem.map((d) => [d.ten, d]));
  for (const d of m.dam) {
    const f = m.thanh.find((x) => x.ten === d.ten);
    assert.ok(f, 'có thanh ' + d.ten);
    const a = diem.get(f.dau), b = diem.get(f.cuoi);
    assert.equal(a.z, d.z); assert.equal(b.z, d.z);
    gan(Math.hypot(b.x - a.x, b.y - a.y), d.L, 'chiều dài dầm', 1e-4);
    const td = m.tietDienThanh.find((x) => x.ten === d.tietDien);
    assert.deepEqual([td.loai, td.cao, td.rong, td.vatLieu], ['chu-nhat', d.h, d.b, 'BT_B30']);
  }
  assert.ok(m.capDo.includes(-8) && m.capDo.includes(-10), 'chèn nút cao độ dầm vào cọc');
  assert.ok(m.vatLieu.some((v) => v.ten === 'BT_B30' && v.E === 32500e3));
  assert.ok(m.tang.ds.some((x) => x.ten.startsWith('DAM_')));
  // dữ liệu gửi phân tích có danh sách dầm
  assert.deepEqual(C.duLieuPhanTich(m, t).dam, [{ ten: 'DG1', thanh: ['DG1'] }, { ten: 'DG2', thanh: ['DG2'] }, { ten: 'DG3', thanh: ['DG3'] }]);
  // không có dầm: mô hình như cũ
  const m0 = C.taoMoHinhEtabs(JSON.parse(JSON.stringify(MCT.macDinh)), kq);
  assert.equal(m0.dam.length, 0);
  assert.equal(m.thanh.filter((x) => x.loai === 'dam').length, 3);
  assert.ok(m0.thanh.length < m.thanh.length - 3, 'cọc có thêm nút tại cao độ dầm');
  assert.ok(!m0.capDo.includes(-8));
});

test('Mô hình: báo lỗi số liệu dầm sai', () => {
  const loi = (ds) => C.taoMoHinhEtabs(trangThaiCoDam(ds), kq).loi.join(' | ');
  assert.match(loi([{ tuCoc: 1, denCoc: 1 }]), /hai cọc khác nhau/);
  assert.match(loi([{ tuCoc: 1, denCoc: 5 }]), /hai cọc khác nhau/);
  assert.match(loi([{ tuCoc: 1, denCoc: 2, z: -40 }]), /giữa đáy đài/);
  assert.match(loi([{ tuCoc: 1, denCoc: 2, z: -2.8, h: 0.6 }]), /cao hơn đáy đài/);
  assert.match(loi([{ tuCoc: 1, denCoc: 2, beTong: 'B99' }]), /không có cấp bê tông/);
  assert.match(loi([{ tuCoc: 1, denCoc: 2 }, { tuCoc: 2, denCoc: 1 }]), /trùng dầm DG1/);
  assert.match(loi([{ tuCoc: 1, denCoc: 2, b: 0 }]), /b, h phải lớn hơn 0/);
});

test('Công thức TCVN 5574:2018: thép uốn, chịu cắt, hệ số uốn dọc', () => {
  // uốn: α_m, ξ, A_s
  const u = C.thepUonChuNhat(100, 0.4, 0.55, 17, 350, 200000);
  const am = 100e6 / (17 * 400 * 550 * 550), xi = 1 - Math.sqrt(1 - 2 * am);
  gan(u.am, am, 'α_m'); gan(u.As, xi * 17 * 400 * 550 / 350, 'A_s');
  const xiR = 0.8 / (1 + 350 / 200000 / 0.0035);
  gan(u.aR, xiR * (1 - xiR / 2), 'α_R');
  assert.equal(C.thepUonChuNhat(5000, 0.4, 0.55, 17, 350, 200000).duTietDien, false);
  // cắt không có đai: Q_b nhỏ nhất = 0,5·R_bt·b·h0
  gan(C.chiuCatTCVN(10, 0.4, 0.55, 17, 1.15, 280, 0, 0).Qgh, 0.5 * 1.15 * 400 * 550 / 1000, 'Qb min', 1e-9);
  // có đai d10a150 hai nhánh: min(f(c*), f(3h0)), f(c) = 1,5·Rbt·b·h0²/c + 0,75·qsw·min(c, 2h0)
  const Asw = 2 * Math.PI * 25, qsw = 280 * Asw / 150, b = 400, h0 = 550, Rbt = 1.15;
  const f = (c) => Math.min(Math.max(1.5 * Rbt * b * h0 * h0 / c, 0.5 * Rbt * b * h0), 2.5 * Rbt * b * h0) + 0.75 * qsw * Math.min(c, 2 * h0);
  const cs = Math.min(Math.max(h0 * Math.sqrt(2 * Rbt * b / qsw), h0), 2 * h0);
  const k = C.chiuCatTCVN(100, 0.4, 0.55, 17, 1.15, 280, Asw, 150);
  gan(k.Qgh, Math.min(f(cs), f(3 * h0)) / 1000, 'Qb + Qsw', 0.01);
  gan(k.Qmax, 0.3 * 17 * 400 * 550 / 1000, '0,3·Rb·b·h0');
  assert.equal(k.coDai, true);
  // hệ số uốn dọc
  assert.equal(C.heSoUonDoc(4), 0.92);
  gan(C.heSoUonDoc(12.5), (0.9 + 0.83) / 2, 'φ(12,5)');
  assert.equal(C.heSoUonDoc(25), 0.7);
});

// Kết quả ETABS giả lập (như ETABS giả lập của cầu nối): cọc, chuyển vị, đài, dầm
const gui = C.duLieuPhanTich(m, t);
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
  dam: m.dam.map((d) => ({ ten: d.ten, dong: [].concat(...gui.toHop.map((ten, j) => [0, d.L].map((x) =>
    [x, j, 50 + 5 * j, 20 + j, 5, 1, 10 + j, x === 0 ? -(40 + 2 * j) : 30 + j]))) })),
  chuyenVi: { nut: gui.nutChuyenVi, dong: [].concat(...gui.nutChuyenVi.map((n, i) => gui.toHop.map((ten, j) => [i, j, 0.0001 * (j + 1), 0.0005, -0.002, 1e-4, 2e-4, 0]))) },
  dai: (() => {
    const nut = [], dong = [];
    m.xs.forEach((x) => m.ys.forEach((y) => { nut.push([x, y]); }));
    nut.forEach((p, ni) => gui.toHop.forEach((ten, j) => dong.push([ni, j, 10 + j, 5, 0, 2, 1])));
    return { nut, dong };
  })()
};
const kE = C.ketQuaEtabs(raw, m, t, s, kq);

test('Tóm tắt: bao nội lực dầm, bao thành phần cọc, bao tại nút đài', () => {
  assert.equal(kE.hopLe, true, (kE.loi || []).join('; '));
  const tt = C.tomTatEtabs(raw, m, t);
  const n = gui.toHop.length - 1;
  const d1 = tt.dam[0];
  gan(d1.bao.Pmax.gt, 50 + 5 * n, 'P kéo lớn nhất'); gan(d1.bao.M3min.gt, -(40 + 2 * n), 'M3 âm'); gan(d1.bao.M3max.gt, 30 + n, 'M3 dương');
  assert.equal(d1.tram.length, 2);
  gan(d1.tram[1].x, m.dam[0].L, 'trạm cuối');
  assert.deepEqual(d1.tram[0].M3, [-(40 + 2 * n), -40]);
  const tp = tt.coc[0].tp;
  assert.ok(tp.every((r) => r.z <= m.thongSo.zDay + 1e-9), 'bỏ đoạn trong đài');
  assert.ok(tp[0].P[0] <= tp[0].P[1] && tp[0].M2.length === 2);
  assert.equal(tt.dai.nutBao.length, m.xs.length * m.ys.length);
  assert.deepEqual(tt.dai.nutBao[0].M11, [10, 10 + n]);
});

test('Kiểm tra dầm giằng: uốn có kể lực kéo, kéo, nén, cắt hai phương, kết luận', () => {
  const n = gui.toHop.length - 1;
  assert.equal(kE.damGiang.length, 3);
  const d = kE.damGiang[0];
  assert.equal(d.hopLe, true, (d.loi || []).join('; '));
  const h0 = 0.6 - 0.05, Nt = 50 + 5 * n, them = Nt * 1000 / 700;
  const u = C.thepUonChuNhat(40 + 2 * n, 0.4, h0, 17, 350, 200000);
  gan(d.uon.tren.AsCan, u.As + them, 'thép trên = uốn + N/(2Rs)');
  gan(d.uon.duoi.M, 30 + n, 'M3 dương');
  gan(d.keo.Ngh, 350 * d.thep.AsTot / 1000, 'Rs·As,tot');
  gan(d.thep.AsTot, 4 * Math.PI * 121 + 3 * Math.PI * 100 + 2 * Math.PI * 49, 'As,tot = 4Ø22 + 3Ø20 + 2×1Ø14');
  gan(d.uon.tren.AsChon, 4 * Math.PI * 121, 'thép trên 4Ø22');
  gan(d.nen.l0, m.dam[0].L - 0.8, 'nhịp thông thủy');
  gan(d.cat.dung.Q, 20 + n, 'V2'); gan(d.cat.ngang.Q, 5, 'V3');
  assert.equal(d.ok, true);
  assert.ok(d.tiSo > 0 && d.tiSo <= 1);
  assert.ok(kE.ketLuan.some((k) => k.ten === 'Dầm giằng DG1' && k.ok === true));
  const F = C.ketLuanEtabs(kq.F, kE);
  assert.equal(F.ds.filter((x) => x.ma === 'DG').length, 3);
  // thép quá ít → không đạt, tỉ số > 1
  const s2 = trangThaiCoDam([{ tuCoc: 1, denCoc: 2, tren: { n: 2, d: 10 } }, { tuCoc: 2, denCoc: 3 }, { tuCoc: 3, denCoc: 1, z: -10, b: 0.3, h: 0.5 }]);
  const kE2 = C.ketQuaEtabs(raw, m, t, s2, kq);
  assert.equal(kE2.damGiang[0].uon.tren.ok, false);
  assert.ok(kE2.damGiang[0].tiSo > 1);
  assert.equal(C.ketLuanEtabs(kq.F, kE2).ds.find((x) => x.ten.startsWith('Dầm giằng DG1')).ok, false);
});
