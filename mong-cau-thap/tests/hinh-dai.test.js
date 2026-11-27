// Đài móng 3 cọc vát góc (js/calc/hinh-dai.js) và ảnh hưởng tới trọng lượng đài, thép đài, lún
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
['dia-chat', 'sct-coc', 'hinh-dai', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca'].forEach((f) => require(`../js/calc/${f}.js`));
const MCT = globalThis.MCT;
const HD = MCT.calc.hinhDai;
const gan = (a, e, msg, tol = 1e-6) => assert.ok(Math.abs(a - e) <= tol * Math.max(1, Math.abs(e)), `${msg}: ${a} ≠ ${e}`);
const TOA_DO = [{ x: -1.2, y: -0.77 }, { x: 1.2, y: -0.77 }, { x: 0, y: 1.31 }];

function trangThai(sua) {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  s.dai.hinh3 = 'vat';
  if (sua) sua(s);
  return s;
}

test('Mặc định móng 3 cọc là đài vát; chữ nhật vẫn chọn được', () => {
  assert.equal(MCT.macDinh.dai.hinh3, 'vat');
  const r = HD({ dai: { X: 4, Y: 3.678, hinh3: 'chu-nhat' }, toaDo: TOA_DO, D: 0.8 });
  assert.equal(r.kieu, 'chu-nhat');
  assert.deepEqual(r.dinh, [[-2, -1.839], [2, -1.839], [2, 1.839], [-2, 1.839]]);
  gan(r.dienTich, 4 * 3.678, 'diện tích chữ nhật');
  // 4 cọc: luôn chữ nhật
  const r4 = HD({ dai: { X: 3, Y: 3, hinh3: 'vat' }, toaDo: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }], D: 0.6 });
  assert.equal(r4.kieu, 'chu-nhat');
});

test('Vát tự tính: bao cọc + c = D, cạnh vát song song đường nối cọc, mọi cọc cách mép đúng c', () => {
  const r = HD({ dai: { hinh3: 'vat' }, toaDo: TOA_DO, D: 0.8 });
  assert.equal(r.hopLe, true, r.loi.join('; '));
  assert.equal(r.phiaDon, '+y'); assert.equal(r.cocDon, 2); assert.deepEqual(r.hang, [0, 1]);
  gan(r.X, 4, 'X'); gan(r.Y, 3.68, 'Y');
  assert.deepEqual([r.x0, r.x1, r.y0, r.y1], [-2, 2, -1.57, 2.11]);
  assert.equal(r.dinh.length, 6);
  r.mepCoc.forEach((m, i) => gan(m, 0.8, 'cọc ' + (i + 1) + ' cách mép', 1e-3));
  // cạnh vát song song đường nối cọc 1 – cọc 3
  const [, , , , a2, a1] = r.dinh;
  gan((a2[1] - a1[1]) / (a2[0] - a1[0]), (1.31 + 0.77) / 1.2, 'độ dốc cạnh vát', 1e-3);
  gan(r.dienTich, 10.62, 'diện tích', 1e-3);
  assert.ok(r.dienTich < 0.73 * r.X * r.Y, 'ít hơn chữ nhật bao ≈ 28 %');
  gan(r.vat[0].a, 1.5379, 'vát a', 1e-3); gan(r.vat[0].b, 2.6658, 'vát b', 1e-3);
  assert.deepEqual(r.canhBao, []);
  // c nhập tay lớn hơn → đài to hơn
  const r2 = HD({ dai: { hinh3: 'vat', cTheo: 'nhap', c: 1.0 }, toaDo: TOA_DO, D: 0.8 });
  gan(r2.X, 4.4, 'X với c = 1'); r2.mepCoc.forEach((m) => gan(m, 1.0, 'cách mép', 1e-3));
});

test('Vát nhập tay như bản vẽ (1,355 × 1,701); X, Y nhập tay đặt giữa khoảng bao cọc', () => {
  const r = HD({ dai: { hinh3: 'vat', cachVat: 'nhap', vatA: 1.355, vatB: 1.701 }, toaDo: TOA_DO, D: 0.8 });
  assert.deepEqual(r.dinh, [[-2, -1.57], [2, -1.57], [2, 0.409], [0.645, 2.11], [-0.645, 2.11], [-2, 0.409]]);
  gan(r.dienTich, 4 * 3.68 - 1.355 * 1.701, 'diện tích', 1e-9);
  assert.deepEqual(r.vat, [{ a: 1.355, b: 1.701 }, { a: 1.355, b: 1.701 }]);
  const r2 = HD({ dai: { hinh3: 'vat', cachXY: 'nhap', X: 4.4, Y: 4.0 }, toaDo: TOA_DO, D: 0.8 });
  assert.deepEqual([r2.x0, r2.x1, r2.y0, r2.y1], [-2.2, 2.2, -1.73, 2.27]);
  // vát quá lớn → lỗi; vát làm cọc gần mép hơn c → cảnh báo
  assert.match(HD({ dai: { hinh3: 'vat', cachVat: 'nhap', vatA: 2.1, vatB: 1 }, toaDo: TOA_DO, D: 0.8 }).loi.join(' '), /quá lớn/);
  const r3 = HD({ dai: { hinh3: 'vat', cachVat: 'nhap', vatA: 1.9, vatB: 3.2 }, toaDo: TOA_DO, D: 0.8 });
  assert.equal(r3.hopLe, true);
  assert.match(r3.canhBao.join(' '), /nhỏ hơn c/);
  // X, Y nhập quá nhỏ → cọc ra ngoài đài
  assert.match(HD({ dai: { hinh3: 'vat', cachXY: 'nhap', X: 2.6, Y: 3 }, toaDo: TOA_DO, D: 0.8 }).loi.join(' '), /ra ngoài mép đài/);
});

test('Bố trí nhanh 3 cọc tam giác đều: trọng tâm tại tâm cẩu, cọc đơn theo 4 hướng; đài vát đúng phía', () => {
  for (const phia of ['+y', '-y', '+x', '-x']) {
    const c = HD.boTri3Coc(2.4, phia);
    gan(c.reduce((a, p) => a + p.x, 0), 0, 'Σx ' + phia, 1e-2); gan(c.reduce((a, p) => a + p.y, 0), 0, 'Σy ' + phia, 1e-2);
    [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => gan(Math.hypot(c[i].x - c[j].x, c[i].y - c[j].y), 2.4, 'cạnh ' + phia, 1e-3));
    const r = HD({ dai: { hinh3: 'vat' }, toaDo: c, D: 0.8 });
    assert.equal(r.phiaDon, phia);
    gan(r.dienTich, 10.62, 'diện tích ' + phia, 2e-3);
    assert.deepEqual(HD.kiemTraChanCau(r, 2, 0, 0), []);
  }
  const r = HD({ dai: { hinh3: 'vat' }, toaDo: HD.boTri3Coc(2.4, '+y'), D: 0.8 });
  assert.match(HD.kiemTraChanCau(r, 3.2, 0, 0).join(' '), /nằm ngoài đài/);
});

test('Đoạn cắt qua đài vát: bề rộng tại x = const và y = const', () => {
  const r = HD({ dai: { hinh3: 'vat', cachVat: 'nhap', vatA: 1.355, vatB: 1.701 }, toaDo: TOA_DO, D: 0.8 });
  gan(HD.doanCat(r, 'y', 0).dai, 4, 'y = 0 (phần chữ nhật)');
  gan(HD.doanCat(r, 'y', 2.11 - 1.701 / 2).dai, 4 - 1.355, 'y giữa vát', 1e-9);
  gan(HD.doanCat(r, 'x', 1.0).dai, 1.57 + 0.409 + (2.11 - 0.409) * (2 - 1) / (2 - 0.645), 'x = 1', 1e-9);
  gan(HD.doanCat(r, 'x', 3).dai, 0, 'ngoài đài');
});

test('Tính toàn bộ với đài vát: trọng lượng theo diện tích, thép đài chia bề rộng thật, lún theo diện tích', () => {
  const s = trangThai();
  const kq = MCT.calc.tinhTatCa(s);
  const h = kq.A.dai.hinh;
  assert.equal(kq.A.hopLe, true, kq.A.loi.join('; '));
  assert.equal(h.kieu, 'vat');
  gan(kq.A.dai.P, 25 * h.dienTich * 1.6 * 1.1, 'P đài');
  assert.ok(kq.A.dai.P < 25 * 4 * 3.678 * 1.6 * 1.1, 'nhẹ hơn đài chữ nhật');
  // B dùng P mới: Pmax nhỏ hơn bản chữ nhật
  const s0 = trangThai((x) => { x.dai.hinh3 = 'chu-nhat'; });
  const kq0 = MCT.calc.tinhTatCa(s0);
  assert.ok(kq.B.Pmax < kq0.B.Pmax);
  // D: mômen phía X dương = Σ Pimax·(x − Ht/2) / bề rộng tại x = Ht/2
  const Ht = kq.A.Ht, b = kq.D.beRong;
  gan(b.xDuong, MCT.calc.hinhDai.doanCat(h, 'x', Ht / 2).dai, 'bề rộng x+');
  const tongX = kq.D.canh.reduce((a, c) => a + c.xDuong * c.Pimax, 0), tongXam = kq.D.canh.reduce((a, c) => a + c.xAm * c.Pimax, 0);
  gan(kq.D.duoiX.M, Math.max(tongX / b.xDuong, tongXam / b.xAm), 'M dưới X');
  const tongYd = kq.D.canh.reduce((a, c) => a + c.yDuong * c.Pimax, 0), tongYa = kq.D.canh.reduce((a, c) => a + c.yAm * c.Pimax, 0);
  gan(kq.D.duoiY.M, Math.max(tongYd / b.yDuong, tongYa / b.yAm), 'M dưới Y');
  assert.equal(kq0.D.beRong, null);
  // lún: trọng lượng đài theo diện tích thật, khối quy ước theo X, Y bao
  assert.equal(kq.LUN.hopLe, true, (kq.LUN.loi || []).join('; '));
  gan(kq.LUN.Qdai / kq0.LUN.Qdai, h.dienTich / (4 * 3.678), 'Qđài tỉ lệ diện tích', 1e-9);
});

test('Đài vát lỗi (vát quá lớn) làm mục A không hợp lệ, có thông báo', () => {
  const kq = MCT.calc.tinhTatCa(trangThai((s) => { s.dai.cachVat = 'nhap'; s.dai.vatA = 2.5; }));
  assert.equal(kq.A.hopLe, false);
  assert.match(kq.A.loi.join(' '), /Vát a/);
});
