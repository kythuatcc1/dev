// Đối chiếu sheet Kiem tra tai ngang với Excel.
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
globalThis.MCT.macDinh.dai.hinh3 = 'chu-nhat';   // test đối chiếu Excel: đài chữ nhật X × Y (đài vát 3 cọc thử ở hinh-dai.test.js)
['dia-chat', 'sct-coc', 'hinh-dai', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca'].forEach((f) => require(`../js/calc/${f}.js`));
const MCT = globalThis.MCT;
const REF = require('./excel-tham-chieu.json').taiNgang;

function gan(a, e, msg) {
  assert.ok(Math.abs(a - e) <= 1e-9 * Math.max(1, Math.abs(e)), `${msg}: app=${a} excel=${e}`);
}

const s = JSON.parse(JSON.stringify(MCT.macDinh));
const kq = MCT.calc.tinhTatCa(s);
const r = MCT.calc.tinhTaiNgang(REF.dauVao, kq);
const k = REF.ketQua;

test('Chuyển vị, góc xoay đầu cọc khớp Excel', () => {
  assert.equal(r.hopLe, true, r.loi.join('; '));
  ['H', 'I', 'E', 'K', 'alphaE', 'dHH', 'dHM', 'dMH', 'dMM', 'H0', 'M0', 'y0', 'psi0', 'Delta', 'psi'].forEach((f) => gan(r[f], k[f], f));
  assert.equal(r.okDelta ? '(OK)' : 'FAIL', k.kiemTraDelta);
  assert.equal(r.okPsi ? '(OK)' : 'FAIL', k.kiemTraPsi);
});

test('Bảng M, Q, σz dọc thân cọc (41 dòng) và giá trị lớn nhất khớp Excel', () => {
  assert.equal(r.bang.length, REF.bang.length);
  REF.bang.forEach((e, i) => {
    gan(r.bang[i].z, e.z, 'z ' + i); gan(r.bang[i].M, e.M, 'M ' + i); gan(r.bang[i].Q, e.Q, 'Q ' + i); gan(r.bang[i].sigma, e.sigma, 'σ ' + i);
  });
  ['Mmax', 'zM', 'Qmax', 'zQ', 'sigmaMax', 'zSigma'].forEach((f) => gan(r[f], k[f], f));
});

test('Khả năng chịu cắt và ổn định đất quanh cọc khớp Excel', () => {
  ['Qmin', 'Rbt', 'Ab0', 'Qsteel', 'Rsw', 'Qgh'].forEach((f) => gan(r[f], k[f], f));
  assert.equal(r.okQ ? '(OK)' : 'FAIL', k.kiemTraQ);
  ['L', 'alphaL', 'zKT', 'MG', 'MQ', 'eta2TaiCho', 'zCaoDo', 'eta2', 'gammaTB', 'cI', 'phiI', 'sigmaGh'].forEach((f) => gan(r[f], k[f], f));
  assert.equal(r.lopZ, String(k.lopZ));
  assert.equal(r.okOnDinh, /^Tho/.test(k.ketLuan));
});

test('Hàm ApLucDat: cao độ trên mực nước ngầm chỉ dùng γ tự nhiên', () => {
  gan(MCT.calc.apLucDat(-0.5, -1, [0, -2.3, -60], [20, 14.5, 0]), 10, 'P');
});

test('Đài cao: l0 theo sức chịu tải cọc, đầu cọc ngàm (ψ tại đáy đài = 0), [Δ] = 3,8 cm', () => {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  const thap = MCT.calc.tinhTatCa(s).TN;
  assert.equal(thap.loaiDai, 'thap'); assert.equal(thap.gioiHanChuyenVi, 1); assert.equal(thap.l0, 0);
  s.taiNgang.loaiDai = 'cao';
  const kq = MCT.calc.tinhTatCa(s), cao = kq.TN;
  assert.equal(cao.loaiDai, 'cao');
  assert.ok(Math.abs(cao.l0 - kq.SCT.coc.l0) < 1e-9, 'l0 = ' + cao.l0);
  assert.equal(cao.gioiHanChuyenVi, 3.8);
  assert.ok(Math.abs(cao.psi) < 1e-6, 'ψ đáy đài = ' + cao.psi);
  assert.ok(cao.M < 0 && Math.abs(cao.Delta - 1.72) < 0.02, 'Δ ' + cao.Delta + ', M ' + cao.M);
  assert.equal(cao.okDelta, true);
  // [Δ] ETABS theo loại đài
  s.taiNgang.gioiHanChuyenViCao = 1.5;
  assert.equal(MCT.calc.tinhTatCa(s).TN.okDelta, false, 'Δ 1,72 > 1,5 cm');
});
