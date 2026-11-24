// Đối chiếu sheet Bieu do tuong tac với Excel.
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
['dia-chat', 'sct-coc', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca'].forEach((f) => require(`../js/calc/${f}.js`));
const MCT = globalThis.MCT;
const REF = require('./excel-tham-chieu.json').tuongTac;

function gan(a, e, msg) {
  assert.ok(Math.abs(a - e) <= 1e-9 * Math.max(1, Math.abs(e)), `${msg}: app=${a} excel=${e}`);
}

const s = JSON.parse(JSON.stringify(MCT.macDinh));
const kq = MCT.calc.tinhTatCa(s);
const r = MCT.calc.tinhTuongTac(REF.dauVao, kq);
const k = REF.ketQua;

test('Thông số và vật liệu khớp Excel', () => {
  ['D', 'r', 'Ab', 'n', 'd', 'As', 'Rb', 'Rb2', 'Rbt', 'Rbt2', 'Rs', 'Rsc', 'beta', 'alpha', 'delta', 'NTrend'].forEach((f) => gan(r[f], k[f], f));
});

test('31 điểm của biểu đồ tương tác khớp Excel', () => {
  assert.equal(r.diem.length, 31);
  REF.diem.forEach((e, i) => {
    ['phi', 'xi', 'phis', 'M', 'N'].forEach((f) => gan(r.diem[i][f], e[f], `${f} điểm ${i}`));
  });
});

test('Ngoại lực = Mz max và Pmax/Pmin như Excel; kiểm tra bổ sung: nằm trong biểu đồ', () => {
  gan(r.diemNoiLuc[0].M, k.M[0], 'M'); gan(r.diemNoiLuc[0].N, k.N[0], 'N nén'); gan(r.diemNoiLuc[1].N, k.N[1], 'N kéo');
  assert.equal(r.tatCaOk, true);
  // Điểm ngoài biểu đồ: N vượt khả năng nén lớn nhất
  const ngoai = MCT.calc.tinhTuongTac(REF.dauVao, Object.assign({}, kq, { B: Object.assign({}, kq.B, { Pmax: 20000 }) }));
  assert.equal(ngoai.diemNoiLuc[0].ok, false);
});
