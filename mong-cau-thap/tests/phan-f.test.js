// Phần F – kết luận chung (ô D143) + mục C do app bổ sung.
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu'].forEach((f) => require(`../js/data/${f}.js`));
['phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong', 'phan-f-ket-luan']
  .forEach((f) => require(`../js/calc/${f}.js`));
const MCT = globalThis.MCT;
const REF = require('./excel-tham-chieu.json');

function chay({ dai = {}, Qa, thep } = {}) {
  const A = MCT.calc.tinhPhanA({ ...REF.sheetCauThap_phanA.dauVao, ...dai });
  const b = REF.sheetCauThap_phanB.dauVao;
  const B = MCT.calc.tinhPhanB(A, { toaDo: b.toaDo, Qa: Qa ?? b.Qa, QaKeo: Math.abs(b.QaKeo) });
  const C = MCT.calc.tinhPhanC(A, B, { D: 0.8 });
  const d = REF.sheetCauThap_phanD;
  const th = thep || Object.fromEntries(['duoiX', 'duoiY', 'trenX', 'trenY'].map((k) => [k, { d: d[k].d, s: d[k].s }]));
  const D = MCT.calc.tinhPhanD(A, B, th);
  const E = MCT.calc.tinhPhanE(A, REF.sheetCauThap_phanE.dauVao);
  return MCT.calc.tinhKetLuan(B, C, D, E);
}

test('Kết luận khớp ô D143 của Excel', () => {
  const F = chay();
  assert.equal(F.hopLe, true);
  assert.equal(F.ketLuanExcel, REF.sheetCauThap_phanE.ketQua.ketLuan);
  assert.equal(F.ketLuan, REF.sheetCauThap_phanE.ketQua.ketLuan);
  assert.equal(F.ds.length, 13);
  assert.equal(F.ds.filter((m) => m.boSung).length, 1, 'chỉ mục C là bổ sung');
  assert.equal(F.ds.filter((m) => m.oExcel).length, 12, '12 ô trong công thức D143');
});

test('Một kiểm tra FAIL → KHÔNG đủ khả năng chịu lực', () => {
  const F = chay({ Qa: 3000 });
  assert.equal(F.ok, false);
  assert.equal(F.okExcel, false);
  assert.match(F.ketLuan, /KHÔNG/);
  assert.equal(F.soFail, 1);
});

test('Thiếu dữ liệu một mục thì không kết luận', () => {
  assert.equal(MCT.calc.tinhKetLuan(null, null, null, null).hopLe, false);
});
