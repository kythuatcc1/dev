// Tự chụp hình ETABS (js/hinh-chup.js): kịch bản thao tác giao diện ETABS cho từng vị trí hình
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
['dia-chat', 'sct-coc', 'hinh-dai', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca', 'etabs-mo-hinh', 'etabs-tai-trong', 'dam-giang'].forEach((f) => require(`../js/calc/${f}.js`));
require('../js/hinh-chup.js');
const MCT = globalThis.MCT, HC = MCT.hinhChup;

function E(sua) {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  if (sua) sua(s);
  const kq = MCT.calc.tinhTatCa(s), m = MCT.calc.taoMoHinhEtabs(s, kq);
  return { m, t: MCT.calc.taiTrongEtabs(s, kq, m), kE: { chuyenVi: { DeltaMax: { toHop: 'KLV-KEO-327.31' } } } };
}
function kiemTraThaoTac(ds, khoa) {
  assert.ok(Array.isArray(ds) && ds.length > 0, khoa);
  ds.forEach((tt) => {
    assert.ok(['menu', 'hop-thoai', 'phim', 'doi'].includes(tt.loai), khoa + ': ' + tt.loai);
    if (tt.loai === 'menu') assert.ok(tt.duong.length >= 2 && tt.duong.every((x) => typeof x === 'string' && x), khoa);
    if (tt.loai === 'hop-thoai') {
      assert.equal(tt.xong, 'OK', khoa);
      tt.dat.forEach((d) => assert.equal(Object.keys(d).filter((k) => ['chon', 'radio', 'tick', 'danhSach', 'nhap'].includes(k)).length, 1, khoa + ' ' + JSON.stringify(d)));
    }
  });
  // mỗi menu mở hộp thoại phải có thao tác hộp thoại theo sau (trừ View → Set Default 3D View, Display → Undeformed Shape)
  ds.forEach((tt, i) => {
    if (tt.loai === 'menu' && !/Set Default 3D View|Undeformed Shape/.test(tt.duong.join('>'))) assert.equal((ds[i + 1] || {}).loai, 'hop-thoai', khoa + ': ' + tt.duong.join(' > '));
  });
}

test('Mọi vị trí hình ETABS có kịch bản tự chụp; ảnh ngoài ETABS thì không', () => {
  const e = E((s) => { s.damGiang.ds = [Object.assign({}, s.damGiang.mau, { tuCoc: 1, denCoc: 2 })]; });
  const ds = HC.viTri(e);
  assert.ok(ds.some((v) => /^dam_/.test(v.khoa)), 'có dầm giằng');
  ds.forEach((v) => {
    const kb = HC.kichBan(v.khoa, e);
    if (v.nhom === 'ngoai') assert.equal(kb, null, v.khoa);
    else kiemTraThaoTac(kb, v.khoa);
  });
});

test('Kịch bản dùng đúng tên trong mô hình: tầng tấm đài, tổ hợp BAO, tổ hợp chuyển vị bất lợi, load pattern', () => {
  const e = E();
  assert.equal(HC.tangTam(e.m), 'MAT_DAI');
  const mb = HC.kichBan('etabsMatBang', e);
  assert.deepEqual(mb[1].dat[0].danhSach, ['MAT_DAI']);
  const p = HC.kichBan('etabsBao_min_P', e), hop = p[p.length - 1];
  assert.deepEqual(p[1].duong, ['Display', 'Force/Stress Diagrams', 'Frame/Pier/Spandrel/Link Forces']);
  assert.deepEqual(hop.dat[0].chon, ['BAO']);
  assert.ok(hop.dat.some((d) => d.radio && d.radio.includes('Min')));
  assert.ok(hop.dat.some((d) => d.radio && d.radio.includes('Axial Force')));
  const m22 = HC.kichBan('etabsMomenDai_M22max', e);
  assert.deepEqual(m22[1].dat[0].danhSach, ['MAT_DAI'], 'mặt bằng tấm đài');
  assert.ok(m22[m22.length - 1].dat.some((d) => d.radio && d.radio.includes('M22')));
  const cv = HC.kichBan('etabsChuyenVi', e);
  assert.deepEqual(cv[cv.length - 1].dat[0].chon, ['KLV-KEO-327.31']);
  assert.deepEqual(HC.kichBan('etabsTai1', e)[2].dat[1].danhSach, ['FX1', 'FY1', 'FZ1']);
  // hướng dẫn chụp tay ghi tầng của mô hình hiện tại
  assert.match(HC.viTri(e).find((v) => v.khoa === 'etabsMatBang').huongDan, /MAT_DAI/);
  assert.ok(!HC.viTri(e).some((v) => /GIUA_DAI/.test(v.huongDan)));
});
