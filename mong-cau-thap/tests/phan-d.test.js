// Đối chiếu phần D (cốt thép đài) với Excel.
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/data/cau-thap.js');
require('../js/data/vat-lieu.js');
require('../js/calc/phan-a-tai-trong.js');
require('../js/calc/phan-b-tai-coc.js');
require('../js/calc/phan-d-thep-dai.js');
const MCT = globalThis.MCT;
const REF = require('./excel-tham-chieu.json');

function gan(actual, expected, msg) {
  const tol = 1e-9 * Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: app=${actual} excel=${expected}`);
}

const A = MCT.calc.tinhPhanA(REF.sheetCauThap_phanA.dauVao);
const bDV = REF.sheetCauThap_phanB.dauVao;
const B = MCT.calc.tinhPhanB(A, { toaDo: bDV.toaDo, Qa: bDV.Qa, QaKeo: Math.abs(bDV.QaKeo) });
const ref = REF.sheetCauThap_phanD;
const thep = {};
['duoiX', 'duoiY', 'trenX', 'trenY'].forEach((k) => { thep[k] = { d: ref[k].d, s: ref[k].s }; });

test('Mục D khớp Excel: cánh tay đòn, M, αm, ξ, As, thép chọn, kiểm tra', () => {
  const D = MCT.calc.tinhPhanD(A, B, thep);
  assert.equal(D.hopLe, true, D.loi.join('; '));
  D.canh.forEach((c, i) => {
    ['xDuong', 'xAm', 'yDuong', 'yAm', 'Pimax', 'PiminAm'].forEach((k) => gan(c[k], ref.canhTayDon[i][k], `cọc ${i + 1} ${k}`));
  });
  ['duoiX', 'duoiY', 'trenX', 'trenY'].forEach((k) => {
    ['M', 'alpha', 'xi', 'As', 'AsChon'].forEach((f) => gan(D[k][f], ref[k][f], `${k}.${f}`));
    assert.equal(D[k].ok ? 'OK' : 'FAIL', ref[k].kiemTra, k);
  });
});

test('Ghi chú sai khác lớp trên: h0 của αm là H − a, của As là H − 50', () => {
  const D = MCT.calc.tinhPhanD(A, B, thep);
  assert.equal(D.trenX.ghiChu.h0Alpha, 1450);
  assert.equal(D.trenX.ghiChu.h0As, 1550);
  // Tính thống nhất h0 = H − a cho ra As nhỏ hơn giá trị Excel (vì Excel lấy h0 lớn hơn ở bước As)
  assert.ok(D.trenX.ghiChu.thongNhatH0a < D.trenX.As);
  // Lớp dưới không có sai khác
  assert.equal(D.duoiX.ghiChu, undefined);
});

test('Thép chọn không đủ → FAIL; αm > 0,5 → không đủ tiết diện', () => {
  const it = { ...thep, duoiY: { d: 6, s: 400 } };
  assert.equal(MCT.calc.tinhPhanD(A, B, it).duoiY.ok, false);
  const Among = MCT.calc.tinhPhanA({ ...REF.sheetCauThap_phanA.dauVao, H: 0.25, a_cm: 15 });
  const Bmong = MCT.calc.tinhPhanB(Among, { toaDo: bDV.toaDo, Qa: 1e5, QaKeo: 1e5 });
  const Dmong = MCT.calc.tinhPhanD(Among, Bmong, thep);
  assert.equal(Dmong.duoiX.duTietDien, false);
  assert.equal(Dmong.duoiX.ok, false);
});
