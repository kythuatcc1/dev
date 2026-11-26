// Lưu / mở dự án (.mct.json): thông số, kết quả ETABS, ảnh chụp đi và về nguyên vẹn; số liệu cũ ghép lên mặc định mới
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
require('../js/du-an.js');
const MCT = globalThis.MCT;

test('Lưu rồi mở dự án: thông số, kết quả ETABS, ảnh chụp giữ nguyên', () => {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  s.duAn.tenMong = 'CT5'; s.cau.ten = 'QTZ 63'; s.cau.chieuCao = 30;
  s.dai.H = 1.8; s.coc.toaDo.push({ x: 0.5, y: -0.5 });
  s.etabs.chiaDai = 'khong'; s.etabs.diemDatLuc = 'chan'; s.etabs.fileDung = 'C:\\\\MCT_CT5.EDB';
  s.damGiang.ds = [Object.assign({}, s.damGiang.mau, { tuCoc: 1, denCoc: 2 })];
  s.hinhChup.vung['cua-so'] = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
  const etabs = { vanTay: 'abc', thoiDiem: '2026-11-26T00:00:00Z', file: 'C:\\\\MCT_CT5.EDB', tomTat: { phienBan: 3, coc: [{ ten: 'C1' }] } };
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 250]);
  const anh = { etabsMoHinh3D: { data: png, goc: png, w: 10, h: 20, nguon: 'chup', ten: 'ETABS 23', cach: 'cua-so', thoiGian: '2026-11-26', vung: { x: 0, y: 0, w: 1, h: 1 } } };
  const f = MCT.duAn.taoFileDuAn(s, etabs, anh);
  assert.equal(f.dinhDang, 'mong-cau-thap/du-an');
  assert.equal(f.tenMong, 'CT5');
  const r = MCT.duAn.docFileDuAn(JSON.stringify(f), MCT.macDinh);
  assert.equal(r.ok, true, r.loi);
  assert.deepEqual(r.state, s);
  assert.deepEqual(r.etabs, etabs);
  assert.deepEqual(Array.from(r.anh.etabsMoHinh3D.data), Array.from(png));
  assert.deepEqual(Array.from(r.anh.etabsMoHinh3D.goc), Array.from(png));
  assert.equal(r.anh.etabsMoHinh3D.cach, 'cua-so');
  // không kèm ảnh, không có kết quả ETABS
  const r2 = MCT.duAn.docFileDuAn(JSON.stringify(MCT.duAn.taoFileDuAn(s, null, null)), MCT.macDinh);
  assert.equal(r2.ok, true);
  assert.equal(r2.anh, null);
  assert.equal(r2.etabs, null);
  assert.match(MCT.duAn.tenFileDuAn(s, new Date(2026, 10, 26)), /^DuAn_CT5_QTZ_63_20261126\.mct\.json$/);
});

test('File dự án bản cũ thiếu thông số mới: lấy mặc định; file sai định dạng / bản mới hơn: báo lỗi', () => {
  const cu = JSON.parse(JSON.stringify(MCT.macDinh));
  delete cu.etabs.chiaDai; delete cu.etabs.diemDatLuc; delete cu.hinhChup; delete cu.damGiang;
  cu.dai.H = 2.2;
  const r = MCT.duAn.docFileDuAn(JSON.stringify({ dinhDang: 'mong-cau-thap/du-an', phienBan: 1, state: cu }), MCT.macDinh);
  assert.equal(r.ok, true, r.loi);
  assert.equal(r.state.dai.H, 2.2);
  assert.equal(r.state.etabs.chiaDai, 'deu');
  assert.equal(r.state.etabs.diemDatLuc, 'tam');
  assert.deepEqual(r.state.hinhChup, MCT.macDinh.hinhChup);
  assert.deepEqual(r.state.damGiang.ds, []);
  assert.match(MCT.duAn.docFileDuAn('{khong phai json', MCT.macDinh).loi, /không phải JSON/);
  assert.match(MCT.duAn.docFileDuAn(JSON.stringify([{ ten: 'cẩu' }]), MCT.macDinh).loi, /không phải dự án/);
  assert.match(MCT.duAn.docFileDuAn(JSON.stringify({ dinhDang: 'mong-cau-thap/du-an', phienBan: 9, state: cu }), MCT.macDinh).loi, /bản app mới hơn/);
});
