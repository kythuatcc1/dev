// Đối chiếu sheet On dinh - Lun với Excel.
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
['dia-chat', 'sct-coc', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca'].forEach((f) => require(`../js/calc/${f}.js`));
const MCT = globalThis.MCT;
const REF = require('./excel-tham-chieu.json').lun;

function gan(a, e, msg) {
  assert.ok(Math.abs(a - e) <= 1e-9 * Math.max(1, Math.abs(e)), `${msg}: app=${a} excel=${e}`);
}

const s = JSON.parse(JSON.stringify(MCT.macDinh));
const kq = MCT.calc.tinhTatCa(s);
const r = MCT.calc.tinhLun(REF.dauVao, kq);
const k = REF.ketQua;

test('Móng khối quy ước, trọng lượng, áp lực đáy khớp Excel', () => {
  assert.equal(r.hopLe, true, r.loi.join('; '));
  [['tongPhiL'], ['tongL'], ['phiTb'], ['ILmui'], ['a'], ['Xqu'], ['Yqu'], ['Qdai'], ['Qcoc'], ['QdaiCho'], ['QcocCho'], ['Qdat'], ['Qqu'],
    ['gocAlpha'], ['Wx'], ['Wy'], ['ptb'], ['pmax'], ['pmin'], ['mat']].forEach(([f]) => gan(r[f], k[f], f));
  gan(r.quLv.N, k.NquLv, 'Nqu lv'); gan(r.quLv.Mx, k.MxLv, 'Mx lv'); gan(r.quKlv.N, k.NquKlv, 'Nqu klv'); gan(r.quKlv.Mx, k.MxKlv, 'Mx klv');
  gan(r.tcLv.N, k.NtcLv, 'Ntc'); gan(r.tcLv.M, k.MtcLv, 'Mtc'); gan(r.tcLv.H, k.HtcLv, 'Htc');
  assert.equal(r.loaiMui, k.loaiMui);
});

test('Sức chịu tải nền R (TCVN 9362) và 3 kiểm tra khớp Excel', () => {
  [['b'], ['phiII'], ['A'], ['B'], ['cII'], ['h'], ['h1'], ['h2'], ['htd'], ['h0'], ['gammaII'], ['gammaII2'], ['R']].forEach(([f]) => gan(r[f], k[f], f));
  gan(r.Dr, k.D, 'D');
  assert.equal(r.ok1 ? '(OK)' : 'FAIL', k.kt1); assert.equal(r.ok2 ? '(OK)' : 'FAIL', k.kt2); assert.equal(r.ok3 ? '(OK)' : 'FAIL', k.kt3);
});

test('Lún: E từng lớp (giống lỗi TinhE của Excel), điểm tính lún, S khớp Excel', () => {
  REF.E.forEach((e, i) => { assert.equal(r.Elop[i].ten, String(e.ten)); gan(r.Elop[i].E, e.E, 'E lớp ' + e.ten); });
  gan(r.pdz0, k.pdz0, 'pdz0'); gan(r.p0, k.p0, 'p0'); gan(r.hi, k.hi, 'hi');
  assert.equal(r.diem.length, REF.diem.length);
  REF.diem.forEach((e, i) => {
    ['z', 'cao', 'E', 'alpha', 'p0z', 'pdz'].forEach((f) => gan(r.diem[i][f], e[f], `${f} điểm ${i}`));
    assert.equal(r.diem[i].lop, String(e.lop));
  });
  gan(r.S, k.S, 'S'); assert.equal(r.okS ? '(OK)' : 'FAIL', k.ktS);
  // Với mã kích thước hạt đúng, E lớp cát 5 = (40 + 7·(37,83+6))/10 ≈ 34,68 MPa → lún nhỏ hơn
  gan(r.Elop[5].Edung, (40 + 7 * (k.phiTb * 0 + 37.833333333333336 + 6)) / 10, 'E đúng lớp 5');
  assert.ok(r.ghiChu.SDung < r.S);
});
