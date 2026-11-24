// Đối chiếu sheet SL Dia chat: chiều dày lớp, SPT trung bình, hệ số k, bảng SPT theo độ sâu.
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/data/bang-tra.js');
require('../js/data/mau-dia-chat.js');
require('../js/calc/dia-chat.js');
const MCT = globalThis.MCT;
const REF = require('./excel-tham-chieu.json').diaChat;

function gan(a, e, msg) {
  assert.ok(Math.abs(a - e) <= 1e-9 * Math.max(1, Math.abs(e)), `${msg}: app=${a} excel=${e}`);
}

test('Lớp đất: đỉnh, chiều dày, SPT trung bình, ký hiệu, hệ số k khớp Excel', () => {
  const r = MCT.calc.tinhDiaChat(MCT.data.mauDiaChat);
  assert.equal(r.hopLe, true, r.loi.join('; '));
  assert.equal(r.lop.length, REF.lop.length);
  REF.lop.forEach((e, i) => {
    const a = r.lop[i];
    assert.equal(a.ten, String(e.ten));
    gan(a.dinh, e.dinh, `đỉnh lớp ${e.ten}`);
    gan(a.day, e.day, `dày lớp ${e.ten}`);
    gan(a.spt, e.spt, `SPT lớp ${e.ten}`);
    gan(a.k, e.k, `k lớp ${e.ten}`);
    assert.equal(a.kyLoai, e.kyLoai);
    assert.equal(a.kyTinhChat, e.kyTinhChat);
    assert.equal(a.kyKichThuoc, e.kyKichThuoc);
  });
  gan(r.MNN, REF.MNN, 'MNN');
});

test('Bảng SPT theo độ sâu: gán đúng lớp như cột V48:V97', () => {
  const r = MCT.calc.tinhDiaChat(MCT.data.mauDiaChat);
  assert.equal(r.sptTheoDoSau.length, REF.sptTheoDoSau.length);
  REF.sptTheoDoSau.forEach((e, i) => {
    const a = r.sptTheoDoSau[i];
    gan(a.doSau, e.doSau, 'độ sâu');
    gan(a.spt, e.spt, 'SPT');
    assert.equal(a.lop, String(e.lop), `lớp tại ${e.doSau}`);
  });
});

test('NSXY: ngoài phạm vi trả null; nội suy sét IL = 1,14 → 1112', () => {
  const K = MCT.data.bangTra.K;
  assert.equal(MCT.calc.nsxy(K.SET, 1, 20), null);
  gan(MCT.calc.nsxy(K.SET, 1, 1.14), 1112, 'k sét');
});
