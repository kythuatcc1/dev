// Phần C – xuyên thủng đài do chân cẩu (TCVN 5574:2018, 8.1.6.2.1).
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/data/cau-thap.js');
require('../js/data/vat-lieu.js');
require('../js/calc/phan-a-tai-trong.js');
require('../js/calc/phan-b-tai-coc.js');
require('../js/calc/phan-c-xuyen-thung.js');
const MCT = globalThis.MCT;
const REF = require('./excel-tham-chieu.json');

function gan(actual, expected, msg, tol = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)), `${msg}: ${actual} ≠ ${expected}`);
}

function chay(daiThayDoi = {}, toaDo = REF.sheetCauThap_phanB.dauVao.toaDo, D = 0.8) {
  const A = MCT.calc.tinhPhanA({ ...REF.sheetCauThap_phanA.dauVao, ...daiThayDoi });
  const B = MCT.calc.tinhPhanB(A, { toaDo, Qa: 1e5, QaKeo: 1e5 });
  return { A, B, C: MCT.calc.tinhPhanC(A, B, { D }) };
}

test('Số liệu Excel: tháp xuyên bao trùm cả 3 cọc → F = 0, OK (giống kết luận Excel)', () => {
  const { C } = chay();
  assert.equal(C.hopLe, true, C.loi.join('; '));
  gan(C.h0, 1.45, 'h0 = H − a');
  gan(C.Bxt, 4.9, 'đáy tháp xuyên = Ht + 2h0');
  assert.equal(C.baoTrumTatCa, true);
  assert.equal(C.F, 0);
  gan(C.u, 13.8, 'u = 4(Ht + h0)');
  gan(C.Fbult, 1.3 * 1000 * 13.8 * 1.45, 'Fb,ult = Rbt·u·h0');
  assert.equal(C.ok, true);
});

test('Đài mỏng H = 0,8 m: cọc 3 ra ngoài tháp xuyên → F = Pimax cọc 3', () => {
  const { B, C } = chay({ H: 0.8 });
  gan(C.h0, 0.65, 'h0');
  gan(C.Bxt, 3.3, 'Bxt');
  // cọc 1, 2: |x| + D/2 = 1,6 ≤ 1,65 ; |y| + D/2 = 1,17 → trong
  // cọc 3: |y| + D/2 = 1,71 > 1,65 → ngoài
  assert.deepEqual(C.coc.map((c) => c.trongThap), [true, true, false]);
  gan(C.F, B.coc[2].Pimax, 'F');
  gan(C.Fbult, 1.3 * 1000 * 4 * (2 + 0.65) * 0.65, 'Fb,ult');
  assert.equal(C.ok, C.F <= C.Fbult);
});

test('Cọc chạm đúng mép đáy tháp xuyên được coi là nằm trong', () => {
  // Ht = 2, h0 = 1,45 → nửa đáy tháp = 2,45; cọc D0,8 tại x = 2,05 → mép = 2,45
  const { C } = chay({}, [{ x: 2.05, y: 0 }, { x: -2.05, y: 0 }]);
  assert.equal(C.baoTrumTatCa, true);
});

test('Đài quá mỏng (h0 ≤ 0) báo lỗi', () => {
  const { C } = chay({ H: 0.1 });
  assert.equal(C.hopLe, false);
});
