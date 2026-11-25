// Mô hình ETABS do app tự dựng (bước 2): hình học, lò xo đất, liên kết, tầng
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
['dia-chat', 'sct-coc', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca', 'etabs-mo-hinh', 'etabs-tai-trong'].forEach((f) => require(`../js/calc/${f}.js`));
const MCT = globalThis.MCT;

function tao(sua) {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  if (sua) sua(s);
  return MCT.calc.taoMoHinhEtabs(s, MCT.calc.tinhTatCa(s));
}
function gan(a, e, msg) { assert.ok(Math.abs(a - e) <= 1e-6 * Math.max(1, Math.abs(e)), `${msg}: ${a} ≠ ${e}`); }

test('Hình học mặc định: đài 4 × 3,678 × 1,6, tấm ở giữa đài, cọc tới mũi −34,6', () => {
  const m = tao();
  assert.equal(m.hopLe, true, m.loi.join('; '));
  const t = m.thongSo;
  gan(t.zMat, -1); gan(t.zGiua, -1.8); gan(t.zDay, -2.6); gan(t.zMui, -34.6); gan(t.bp, 1.8);
  assert.equal(t.soCoc, 3);
  // lưới qua mép đài, tâm đài (điểm đặt tải), tâm cọc; khoảng chia ≤ 0,25 m
  [-2, 2, 0, -1.2, 1.2].forEach((x) => assert.ok(m.xs.includes(x), 'thiếu đường lưới x = ' + x));
  [-1.839, 1.839, 0, -0.77, 1.31].forEach((y) => assert.ok(m.ys.includes(y), 'thiếu đường lưới y = ' + y));
  for (let i = 1; i < m.xs.length; i++) assert.ok(m.xs[i] - m.xs[i - 1] <= 0.25 + 1e-9);
  for (let i = 1; i < m.ys.length; i++) assert.ok(m.ys[i] - m.ys[i - 1] <= 0.25 + 1e-9);
  assert.equal(m.vo.length, (m.xs.length - 1) * (m.ys.length - 1));
  // nút cọc từ giữa đài, đáy đài rồi mỗi 1 m tới mũi
  assert.deepEqual(m.capDo.slice(0, 4), [-1.8, -2.6, -3.6, -4.6]);
  assert.equal(m.capDo[m.capDo.length - 1], -34.6);
});

test('Cọc nối đúng nút của tấm đài; đoạn trong đài là thanh cứng; tải đặt tại nút tâm đài', () => {
  const m = tao();
  const ten = new Set(m.diem.map((d) => d.ten));
  assert.equal(ten.size, m.diem.length, 'tên điểm trùng');
  const nutDai = new Map(m.diem.filter((d) => d.z === -1.8).map((d) => [d.ten, d]));
  m.coc.forEach((c) => {
    const n = nutDai.get(c.nutDinh);
    assert.ok(n && n.x === c.x && n.y === c.y, 'đỉnh cọc ' + c.ten + ' không trùng nút tấm');
  });
  const tai = nutDai.get(m.nutTai);
  assert.ok(tai && tai.x === 0 && tai.y === 0, 'điểm đặt tải không ở tâm đài');
  m.thanh.forEach((t) => assert.ok(ten.has(t.dau) && ten.has(t.cuoi), 'thanh ' + t.ten + ' nối điểm không có'));
  m.vo.forEach((v) => v.diem.forEach((d) => assert.ok(ten.has(d), 'vỏ ' + v.ten + ' nối điểm không có')));
  const coc1 = m.thanh.filter((t) => t.ten.startsWith('C1_'));
  assert.equal(coc1.length, m.capDo.length - 1);
  assert.equal(coc1[0].tietDien, 'COC_TRONG_DAI');
  assert.ok(coc1.slice(1).every((t) => t.tietDien === 'COC'));
  assert.equal(m.thanh.length, 3 * (m.capDo.length - 1), 'chỉ có thanh cọc');
  // mũi cọc chặn chuyển vị đứng
  assert.equal(m.gioiHan.length, 3);
  m.gioiHan.forEach((g) => assert.deepEqual(g.giaTri, [false, false, true, false, false, false]));
});

test('Lò xo đất từ đáy đài: K = k·z·bp·l, k theo lớp', () => {
  const m = tao();
  const r = (z) => m.bangLoXo.find((x) => x.caoDo === z);
  assert.equal(r(-2.6), undefined, 'tại đáy đài z = 0, không có lò xo');
  gan(r(-3.6).K, 1112 * 1 * 1.8 * 1, 'K tại −3,6 (lớp 1)');
  gan(r(-13.6).K, 5360 * 11 * 1.8 * 1, 'K tại −13,6 (lớp 2)');
  gan(r(-29.6).K, 10000 * 27 * 1.8 * 1, 'K tại −29,6 (lớp 5)');
  gan(r(-34.6).l, 0.5, 'mũi cọc nhận nửa đoạn');
  gan(r(-34.6).K, 10000 * 32 * 1.8 * 0.5, 'K tại mũi');
  assert.equal(m.loXo.length, 3 * m.bangLoXo.length);
  m.loXo.forEach((l) => { assert.equal(l.k[0], l.k[1]); assert.deepEqual(l.k.slice(2), [0, 0, 0, 0]); });
});

test('Lò xo từ đáy hố đào: có nút tại −13, z tính từ −13', () => {
  const m = tao((s) => { s.etabs.batDauLoXo = 'day-ho'; });
  assert.ok(m.capDo.includes(-13));
  assert.ok(m.capDo.includes(-12.6) && m.capDo.includes(-14));
  const r = (z) => m.bangLoXo.find((x) => x.caoDo === z);
  assert.equal(r(-12.6), undefined);
  assert.equal(r(-13), undefined);
  gan(r(-14).K, 5360 * 1 * 1.8 * 1, 'K tại −14');
  assert.ok(m.tang.ds.some((t) => t.ten === 'DAY_HO'));
});

test('Tầng ETABS: đáy ở mũi cọc, mỗi cao độ nút là một tầng', () => {
  const m = tao();
  assert.equal(m.tang.caoDoDay, -34.6);
  const top = m.tang.ds[m.tang.ds.length - 1];
  assert.equal(top.ten, 'GIUA_DAI'); gan(top.caoDo, -1.8);
  gan(m.tang.ds.reduce((s, t) => s + t.cao, m.tang.caoDoDay), -1.8, 'tổng chiều cao tầng');
  assert.deepEqual(m.tang.ds.slice(-2).map((t) => t.ten), ['DAY_DAI', 'GIUA_DAI']);
  assert.equal(new Set(m.tang.ds.map((t) => t.ten)).size, m.tang.ds.length);
  const caoTang = new Set([m.tang.caoDoDay].concat(m.tang.ds.map((t) => t.caoDo)));
  m.diem.forEach((d) => assert.ok(caoTang.has(d.z), 'điểm ' + d.ten + ' không nằm trên cao độ tầng'));
});

test('Báo lỗi khi cọc nằm ngoài đài', () => {
  const m = tao((s) => { s.coc.toaDo[0].x = -1.9; });
  assert.equal(m.hopLe, false);
  assert.match(m.loi.join(' '), /C1.*ngoài đài/);
});

// ---------------- Bước 3: tải trọng và tổ hợp ----------------
function taiMacDinh(sua) {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  if (sua) sua(s);
  const kq = MCT.calc.tinhTatCa(s);
  const m = MCT.calc.taoMoHinhEtabs(s, kq);
  return { kq, m, t: MCT.calc.taiTrongEtabs(s, kq, m) };
}

test('Load pattern: giá trị = tải quy đổi CC1 / n, mômen cộng H·H_đài/2, đặt tại tâm đài', () => {
  const { kq, m, t } = taiMacDinh();
  assert.equal(t.hopLe, true, (t.loi || []).join('; '));
  gan(t.n, 1.2); gan(t.tayDon, 0.8);
  const q = kq.A.quyDoi;
  gan(t.thanhPhan.lv.H, q.lv.H / 1.2); gan(t.thanhPhan.lv.N, q.lv.N / 1.2);
  gan(t.thanhPhan.lv.Mtam, q.lv.M / 1.2 + q.lv.H / 1.2 * 0.8);
  gan(t.thanhPhan.klv.Mtam, q.klv.M / 1.2 + q.klv.H / 1.2 * 0.8);
  gan(t.thanhPhan.lv.T, 165.53);
  assert.deepEqual(t.mauTai.map((p) => p.ten), ['DEAD', 'FX1', 'FY1', 'FZ1', 'MX1', 'MY1', 'MZ1', 'FX2', 'FY2', 'FZ2', 'MX2', 'MY2']);
  assert.equal(t.mauTai[0].banThan, 1);
  t.mauTai.slice(1).forEach((p) => assert.equal(p.luc.diem, m.nutTai));
  const fz1 = t.mauTai.find((p) => p.ten === 'FZ1').luc.giaTri;
  gan(fz1[2], -q.lv.N / 1.2, 'FZ1 hướng xuống');
});

test('Tổ hợp: 8 hướng PDF + hướng bất lợi từng cọc, hệ số đúng như PDF', () => {
  const { t } = taiMacDinh();
  const goc = t.huong.map((h) => h.goc);
  [0, 45, 90, 135, 180, 225, 270, 315, 212.69, 32.69, 327.31, 147.31].forEach((g) => assert.ok(goc.includes(g), 'thiếu hướng ' + g));
  assert.equal(t.huong.length, 12, 'C3 trùng hướng 90/270');
  assert.equal(t.toHop.length - 1, 12 * 4);
  const th = (ten) => t.toHop.find((c) => c.ten === ten);
  const hs = (c, ca) => (c.ds.find((x) => x.ca === ca) || { heSo: 0 }).heSo;
  // PDF Combo1: Dead 1,1; Fx 1,2; Fz 1,2; My 1,2; Mz 1,2
  const c1 = th('LV-NEN-000');
  gan(hs(c1, 'DEAD'), 1.1); gan(hs(c1, 'FX1'), 1.2); gan(hs(c1, 'FY1'), 0); gan(hs(c1, 'FZ1'), 1.2); gan(hs(c1, 'MX1'), 0); gan(hs(c1, 'MY1'), 1.2); gan(hs(c1, 'MZ1'), 1.2);
  // PDF Combo3 (90°): Fy 1,2; Mx −1,2
  const c3 = th('LV-NEN-090');
  gan(hs(c3, 'FY1'), 1.2); gan(hs(c3, 'MX1'), -1.2); gan(hs(c3, 'FX1'), 0);
  // PDF Combo5 (45°): 0,707×1,2
  const c5 = th('LV-NEN-045');
  gan(hs(c5, 'FX1'), 1.2 * Math.SQRT1_2); gan(hs(c5, 'MX1'), -1.2 * Math.SQRT1_2);
  // PDF Combo9 (kéo): Dead 0,9; Fz 0,9
  const c9 = th('LV-KEO-000');
  gan(hs(c9, 'DEAD'), 0.9); gan(hs(c9, 'FZ1'), 0.9); gan(hs(c9, 'MY1'), 1.2);
  // không làm việc: không có MZ
  const c17 = th('KLV-NEN-000');
  gan(hs(c17, 'MZ1'), 0); gan(hs(c17, 'FX2'), 1.2);
  const bao = th('BAO');
  assert.equal(bao.loai, 1);
  assert.equal(bao.ds.length, 48);
  // hướng bất lợi cọc C1 (−1,2; −0,77): nén ở 212,69°
  assert.ok(th('LV-NEN-212.69').nguon.includes('C1 nén'));
});

test('Tổ hợp: hệ số tĩnh tải chỉnh được', () => {
  const { t } = taiMacDinh((s) => { s.etabs.heSoTinhTaiNen = 1.15; });
  gan(t.toHop.find((c) => c.ten === 'KLV-NEN-045').ds.find((x) => x.ca === 'DEAD').heSo, 1.15);
});
