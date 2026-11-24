// Đối chiếu phần E (bulong neo) với Excel.
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/data/cau-thap.js');
require('../js/data/vat-lieu.js');
require('../js/calc/phan-a-tai-trong.js');
require('../js/calc/phan-e-bulong.js');
const MCT = globalThis.MCT;
const REF = require('./excel-tham-chieu.json');

function gan(actual, expected, msg) {
  const tol = 1e-9 * Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: app=${actual} excel=${expected}`);
}

const A = MCT.calc.tinhPhanA(REF.sheetCauThap_phanA.dauVao);
const { dauVao, ketQua: k } = REF.sheetCauThap_phanE;

test('Mục E khớp Excel: mọi giá trị và 6 kết luận', () => {
  const E = MCT.calc.tinhPhanE(A, dauVao);
  assert.equal(E.hopLe, true, E.loi.join('; '));
  const so = ['A', 'Abn', 'fvb', 'fba', 'L1', 'gammaB', 'H0', 'Pct', 'Pt', 'Pt1', 'Ntb', 'Rbond', 'Ntuot',
    'Pstc1', 'Pstc2', 'Pstc', 'Ps', 'Ps1', 'Nvb', 'tongT', 'Ncb', 'D1', 'D2', 'Pxt', 'PxtGh'];
  so.forEach((f) => gan(E[f], k[f], f));
  gan(E.ghiChu.neoP102.l0an, k.l0anP102, 'P102');
  const map = { neo: 'kiemTraNeo', keo: 'kiemTraKeo', tuot: 'kiemTraTuot', cat: 'kiemTraCat', epMat: 'kiemTraEpMat', chocThung: 'kiemTraChocThung' };
  Object.entries(map).forEach(([a, b]) => assert.equal(E.kiemTra[a] ? 'OK' : 'FAIL', k[b], a));
});

test('Ghi chú: hệ số 0,4 chọc thủng, chiều dài neo P102, mômen xoắn cố định E111', () => {
  const E = MCT.calc.tinhPhanE(A, dauVao);
  gan(E.ghiChu.chocThung.PxtKhong04 * 0.4, E.PxtGh, 'PxtGh = 0,4 × không hệ số');
  assert.equal(E.ghiChu.neoP102.ok, false, '2553,7 mm > 1700 mm');
  assert.equal(E.ghiChu.momenXoan.lech, false, 'LLT5020-10: T = E111, không lệch');
  // Cẩu khác: app dùng T của cẩu đó, Excel vẫn dùng 165,53
  const A2 = MCT.calc.tinhPhanA({ ...REF.sheetCauThap_phanA.dauVao, cau: 'MC175B', chieuCao: 30 });
  const E2 = MCT.calc.tinhPhanE(A2, dauVao);
  assert.equal(E2.T, 174.96);
  assert.equal(E2.ghiChu.momenXoan.lech, true);
  gan(E2.ghiChu.momenXoan.Pstc1Excel, E2.FhLv / 2 + 165.53 / 1.6, 'Pstc1 theo Excel');
});

test('Bulong tinh → γb = 1; đường kính không có trong bảng → lỗi', () => {
  assert.equal(MCT.calc.tinhPhanE(A, { ...dauVao, loai: 'Bulong tinh/High quality' }).gammaB, 1);
  assert.equal(MCT.calc.tinhPhanE(A, { ...dauVao, d: 41 }).hopLe, false);
});
