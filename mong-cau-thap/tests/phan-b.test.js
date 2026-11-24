// Đối chiếu phần B (tải trọng lên cọc) với kết quả Excel.
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/data/cau-thap.js');
require('../js/data/vat-lieu.js');
require('../js/calc/phan-a-tai-trong.js');
require('../js/calc/phan-b-tai-coc.js');
const MCT = globalThis.MCT;
const REF = require('./excel-tham-chieu.json');

function gan(actual, expected, msg) {
  const tol = 1e-9 * Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: app=${actual} excel=${expected}`);
}

const phanA = MCT.calc.tinhPhanA(REF.sheetCauThap_phanA.dauVao);

test('Mục B khớp Excel: αi, Pimax, Pimin từng cọc, Pmax, Pmin, kiểm tra', () => {
  const { dauVao, ketQua: k } = REF.sheetCauThap_phanB;
  const r = MCT.calc.tinhPhanB(phanA, { toaDo: dauVao.toaDo, Qa: dauVao.Qa, QaKeo: Math.abs(dauVao.QaKeo) });
  assert.equal(r.hopLe, true, r.loi.join('; '));
  assert.equal(r.n, dauVao.soCoc);
  gan(r.sumY2, k.sumY2, 'Σy²');
  k.coc.forEach((c, i) => {
    gan(r.coc[i].alpha, c.alpha, `α cọc ${i + 1}`);
    gan(r.coc[i].Pimax, c.Pimax, `Pimax cọc ${i + 1}`);
    gan(r.coc[i].Pimin, c.Pimin, `Pimin cọc ${i + 1}`);
  });
  gan(r.Pmax, k.Pmax, 'Pmax');
  gan(r.Pmin, k.Pmin, 'Pmin');
  gan(r.QaKeo, dauVao.QaKeo, "Qa'");
  assert.equal(r.kiemTraNen.ok ? 'OK' : 'FAIL', k.kiemTraNen);
  assert.equal(r.kiemTraKeo.ok ? 'OK' : 'FAIL', k.kiemTraKeo);
});

test('Báo FAIL khi Pmax vượt Qa hoặc Pmin vượt Qa\'', () => {
  const { dauVao } = REF.sheetCauThap_phanB;
  const r = MCT.calc.tinhPhanB(phanA, { toaDo: dauVao.toaDo, Qa: 3000, QaKeo: 2000 });
  assert.equal(r.kiemTraNen.ok, false);
  assert.equal(r.kiemTraKeo.ok, false);
});

test('Cọc nằm trên trục (Σx² = 0) không sinh NaN', () => {
  const r = MCT.calc.tinhPhanB(phanA, { toaDo: [{ x: 0, y: 1 }, { x: 0, y: -1 }], Qa: 1e5, QaKeo: 1e5 });
  assert.ok(r.coc.every((c) => isFinite(c.Pimax) && isFinite(c.Pimin)));
  // 2 cọc đối xứng trên trục y: Pimax = Ptt/2 + M/2 (cosα=0, sinα=1, |y|/Σy² = 1/2)
  gan(r.Pmax, phanA.ngoaiLuc.klv.P / 2 + phanA.ngoaiLuc.klv.M / 2, 'Pmax 2 cọc');
});

test('Cọc số 4 được tính (Excel bỏ sót cột H)', () => {
  const toaDo = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
  const r = MCT.calc.tinhPhanB(phanA, { toaDo, Qa: 1e5, QaKeo: 1e5 });
  assert.equal(r.coc.length, 4);
  gan(r.coc[3].Pimax, r.coc[0].Pimax, 'đối xứng: cọc 4 = cọc 1');
});

test('Thiếu tọa độ cọc thì báo lỗi', () => {
  const r = MCT.calc.tinhPhanB(phanA, { toaDo: [{ x: '', y: '' }], Qa: 1, QaKeo: 1 });
  assert.equal(r.hopLe, false);
});
