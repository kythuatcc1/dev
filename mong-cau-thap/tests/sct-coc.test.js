// Đối chiếu sức chịu tải cọc (SCT Coc nhoi / SCT Coc nhoi FULL) với Excel.
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/calc/dia-chat.js');
require('../js/calc/sct-coc.js');
const MCT = globalThis.MCT;
const REF = require('./excel-tham-chieu.json').sct;

function gan(a, e, msg) {
  assert.ok(Math.abs(a - e) <= 1e-9 * Math.max(1, Math.abs(e)), `${msg}: app=${a} excel=${e}`);
}

const DC = MCT.calc.tinhDiaChat(MCT.data.mauDiaChat);
const v = Object.assign({}, REF.dauVao, { xetVatLieu: REF.dauVao.xetVatLieu, xetSPT: REF.dauVao.xetSPT });
const k = REF.ketQua;

test('Thông số cọc: tiết diện, thép, cao độ khớp Excel', () => {
  const r = MCT.calc.tinhSCT(v, DC);
  assert.equal(r.hopLe, true, r.loi.join('; '));
  ['Ab', 'u', 'I', 'As', 'mu', 'L', 'dayDai', 'dauCocTinhToan', 'doanNgam', 'doanDap', 'dauCocThucTe', 'muiCoc', 'l0']
    .forEach((f) => gan(r.coc[f], k[f], f));
});

test('Theo vật liệu: đoạn cọc trong lớp, k, αε, l1, λ, φ, Rc,u, Rt,u khớp Excel', () => {
  const r = MCT.calc.tinhSCT(v, DC).vatLieu;
  assert.equal(r.doan.length, k.doanK.length);
  k.doanK.forEach((e, i) => {
    gan(r.doan[i].dinh, e.dinh, 'đỉnh đoạn ' + i); gan(r.doan[i].day, e.day, 'đáy đoạn ' + i);
    gan(r.doan[i].l, e.l, 'l đoạn ' + i); gan(r.doan[i].k, e.k, 'k đoạn ' + i);
  });
  gan(r.tongKL, k.tongKL, 'Σkl'); gan(r.tongL, k.tongL, 'Σl'); gan(r.k, k.k, 'k');
  gan(r.bp, k.bp, 'bp'); gan(r.alphaE, k.alphaE, 'αε'); gan(r.l1, k.l1, 'l1'); gan(r.r, k.r, 'r');
  gan(r.lambda, k.lambda, 'λ'); gan(r.phi, k.phi, 'φ'); gan(r.Rcu, k.RcuVl, 'Rc,u/vl'); gan(r.Rtu, k.RtuVl, 'Rt,u/vl');
});

test('Theo SPT: fs, cu, fc từng đoạn, Np, qb, Rc,u, Rt,u khớp Excel', () => {
  const r = MCT.calc.tinhSCT(v, DC).spt;
  assert.equal(r.doan.length, k.doanSPT.length);
  k.doanSPT.forEach((e, i) => {
    const a = r.doan[i];
    gan(a.l, e.l, 'l ' + i); gan(a.spt, e.spt, 'SPT ' + i);
    if (e.fs === null) assert.equal(a.fs, null); else gan(a.fs, e.fs, 'fs ' + i);
    if (e.cu === null) assert.equal(a.cu, null); else gan(a.cu, e.cu, 'cu ' + i);
    if (e.fc === null) assert.equal(a.fc, null); else gan(a.fc, e.fc, 'fc ' + i);
  });
  assert.equal(r.loaiMui, k.loaiDatMui);
  gan(r.NpTren, k.NpTren, 'Np trên'); gan(r.NpDuoi, k.NpDuoi, 'Np dưới'); gan(r.Np, k.Np, 'Np');
  gan(r.cuMui, k.cuMui, 'cu mũi'); gan(r.qbSet, k.qbSet, 'qb sét'); gan(r.qbCat, k.qbCat, 'qb cát'); gan(r.qb, k.qb, 'qb');
  gan(r.Rcu, k.RcuSPT, 'Rc,u/SPT'); gan(r.Rtu, k.RtuSPT, 'Rt,u/SPT');
});

test('Thiết kế: γ0, γn, γk, Nc,d, Nt,d khớp Excel (= Qa, Qa\' của sheet Cau thap)', () => {
  const r = MCT.calc.tinhSCT(v, DC);
  gan(r.gamma0, k.gamma0, 'γ0'); gan(r.gammaN, k.gammaN, 'γn'); gan(r.gammaK, k.gammaK, 'γk');
  gan(r.Rck, k.Rck, 'Rc,k'); gan(r.Ncd, k.Ncd, 'Nc,d'); gan(r.Rtk, k.Rtk, 'Rt,k'); gan(r.Ntd, k.Ntd, 'Nt,d');
  gan(r.Ncd, require('./excel-tham-chieu.json').sheetCauThap_phanB.dauVao.Qa, 'Qa sheet Cau thap');
});

test('Đổi sang cọc khoan nhồi: fs = min(3,3N; 165), fc = min(1,0cu; 100)', () => {
  const r = MCT.calc.tinhSCT(Object.assign({}, v, { phuongPhapThiCong: 'Cọc Khoan Nhồi' }), DC);
  assert.equal(r.spt.phuongPhap.heSoFs, 3.3);
  assert.ok(r.spt.Rcu > k.RcuSPT, 'ma sát đất rời lớn hơn khoan thả');
});
