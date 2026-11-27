// Cẩu tháp sheet New data: trích đủ, tính như cẩu có sẵn, khớp ô Excel (cột Calculation, lực nhổ 1 chân)
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'cau-thap-new-data', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
globalThis.MCT.macDinh.dai.hinh3 = 'chu-nhat';   // test đối chiếu Excel: đài chữ nhật X × Y (đài vát 3 cọc thử ở hinh-dai.test.js)
['dia-chat', 'sct-coc', 'hinh-dai', 'phan-a-tai-trong', 'cau-tu-them', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca', 'etabs-mo-hinh', 'etabs-tai-trong'].forEach((f) => require(`../js/calc/${f}.js`));
const MCT = globalThis.MCT;
const C = MCT.calc;
const REF = require('./excel-tham-chieu.json').cauThapNewData;

function gan(a, e, msg) { assert.ok(Math.abs(a - e) <= 1e-9 * Math.max(1, Math.abs(e)), `${msg}: ${a} ≠ ${e}`); }

function tinh(ten, chieuCao) {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  s.cau.ten = ten;
  s.cau.chieuCao = chieuCao;
  return { s, kq: C.tinhTatCa(s) };
}

test('Trích đủ 55 cẩu của sheet New data, tên không trùng nhau và không trùng sheet Solieu', () => {
  assert.equal(MCT.data.cauThapNewData.length, 55);
  assert.equal(REF.length, 55);
  const khoa = C.danhSachCau().map((c) => C.khoaTenCau(c.ten));
  assert.equal(new Set(khoa).size, khoa.length);
  assert.equal(C.danhSachCau().length, 9 + 55);
});

test('Mỗi cẩu New data: tải quy đổi = cột Calculation × n, H = ET × n, lực nhổ = max(AM, AN), đúng ô Excel', () => {
  for (const r of REF) {
    const c = C.timCau(r.ten);
    assert.ok(c, 'không tìm thấy ' + r.ten);
    const A = tinh(r.ten, r.S).kq.A;
    assert.equal(A.hopLe, true, r.ten + ': ' + (A.loi || []).join('; '));
    assert.equal(A.n, 1.2, r.ten);
    gan(A.quyDoi.lv.N, r.AG * 1.2, r.ten + ' N LV');
    gan(A.quyDoi.lv.M, r.AH * 1.2, r.ten + ' M LV');
    gan(A.quyDoi.lv.H, r.Z * 1.2, r.ten + ' H LV');
    gan(A.quyDoi.klv.N, r.AJ * 1.2, r.ten + ' N KLV');
    gan(A.quyDoi.klv.M, r.AK * 1.2, r.ten + ' M KLV');
    gan(A.quyDoi.klv.H, r.AE * 1.2, r.ten + ' H KLV');
    assert.equal(A.Ht, r.T, r.ten + ' Ht');
    assert.equal(A.chieuDaiTayCan, r.AU, r.ten + ' tay cần');
    assert.equal(A.catalogue.lv.T, r.AA, r.ten + ' CTM');
    const pct = [r.AM, r.AN].filter((v) => v !== null);
    if (pct.length) gan(A.Pct, Math.max(...pct), r.ten + ' Pct');
    else gan(A.Pct, Math.max(r.AH / r.T / Math.SQRT2 - r.AG / 4, r.AK / r.T / Math.SQRT2 - r.AJ / 4), r.ten + ' Pct tự tính');
    assert.equal(c.duongKinhNhomBulong, r.AQ === null ? 0.4 : r.AQ, r.ten + ' D1');
  }
});

test('Cẩu trùng với sheet Solieu (cùng chiều cao) cho tải quy đổi như nhau', () => {
  for (const [nd, sl, h] of [['Potain MC 175B', 'MC175B', 44], ['Potain MCi 85A', 'MCi85A', 34.5],
    ['Potain MCR 160 (1.6 - L50)', 'MCR.160', 33.9], ['Zoomlion TC6015A-10F', 'ZoomlionTC6015A.10F', 45]]) {
    const a = tinh(nd, h).kq.A, b = tinh(sl, h).kq.A;
    assert.equal(b.hang.h, h, sl + ' có dòng ' + h + ' m');
    for (const tt of ['lv', 'klv']) for (const k of ['N', 'M', 'H']) gan(a.quyDoi[tt][k], b.quyDoi[tt][k], `${nd} ${tt} ${k}`);
    gan(a.Pct, b.Pct, nd + ' Pct');
  }
});

test('Cẩu New data tính trọn mục A → F, tải ngang và dựng mô hình ETABS', () => {
  for (const ten of ['Jarlway JTL150F10 (L68B2 - L30)', 'QTZ 63', 'Lycrane LTP200/10-5032 (L50)', 'Potain MCT 205']) {
    const r = REF.find((x) => x.ten === ten);
    const { s, kq } = tinh(ten, r.S);
    for (const m of ['A', 'B', 'C', 'D', 'E', 'F']) assert.equal(kq[m].hopLe, true, `${ten} mục ${m}: ${(kq[m].loi || []).join('; ')}`);
    const mh = C.taoMoHinhEtabs(s, kq), t = C.taiTrongEtabs(s, kq, mh);
    assert.equal(t.hopLe, true, ten + ' ETABS: ' + (t.loi || []).join('; '));
    assert.equal(t.mauTai.some((p) => p.ten === 'MZ1'), r.AA !== null && r.AA > 0, ten + ' MZ1');
  }
  // chiều cao thấp hơn chiều cao duy nhất của cẩu → báo ngoài catalogue
  assert.match(tinh('QTZ 63', 30).kq.A.loi.join(' '), /nằm ngoài catalogue/);
});

test('Cẩu tự thêm không được trùng tên cẩu New data', () => {
  const d = C.cauSangNhap(C.timCau('Potain MC 235B'), true);
  d.ten = 'potain mc 235b';
  assert.match(C.taoCauTuNhap(d, []).loi.join(' '), /trùng một cẩu có sẵn/);
  d.ten = 'Potain MC 235B (sửa)';
  assert.equal(C.taoCauTuNhap(d, []).hopLe, true);
});
