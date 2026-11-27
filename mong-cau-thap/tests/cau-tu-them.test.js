// Cẩu tháp tự thêm: chuẩn hoá, kiểm tra, tính như cẩu có sẵn, dán bảng từ Excel, file chia sẻ
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
globalThis.MCT.macDinh.dai.hinh3 = 'chu-nhat';   // test đối chiếu Excel: đài chữ nhật X × Y (đài vát 3 cọc thử ở hinh-dai.test.js)
['dia-chat', 'sct-coc', 'hinh-dai', 'phan-a-tai-trong', 'cau-tu-them', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca', 'etabs-mo-hinh', 'etabs-tai-trong'].forEach((f) => require(`../js/calc/${f}.js`));
const MCT = globalThis.MCT;
const C = MCT.calc;

function banSao(tenGoc, tenMoi) {
  const d = C.cauSangNhap(C.timCau(tenGoc), true);
  d.ten = tenMoi;
  return d;
}

function tinhVoiCau(ten, chieuCao) {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  s.cau.ten = ten;
  if (chieuCao !== undefined) s.cau.chieuCao = chieuCao;
  return C.tinhTatCa(s);
}

test.afterEach(() => C.datCauTuThem([]));

test('Bản sao LLT5020-10 nhập lại bằng tay cho kết quả giống hệt cẩu có sẵn (A → F)', () => {
  const kq = C.taoCauTuNhap(banSao('LLT5020-10', 'LLT5020-10 bản sao'), []);
  assert.equal(kq.hopLe, true, kq.loi.join('; '));
  C.datCauTuThem([kq.cau]);
  const goc = tinhVoiCau('LLT5020-10'), moi = tinhVoiCau('LLT5020-10 bản sao');
  assert.equal(moi.A.hopLe, true, moi.A.loi.join('; '));
  assert.deepEqual(moi.A.quyDoi, goc.A.quyDoi);
  assert.deepEqual(moi.A.catalogue, goc.A.catalogue);
  assert.equal(moi.A.n, goc.A.n);
  assert.equal(moi.A.Pct, goc.A.Pct);
  assert.deepEqual(moi.A.nhan, goc.A.nhan);
  assert.equal(moi.B.Pmax, goc.B.Pmax);
  assert.equal(moi.B.Pmin, goc.B.Pmin);
  assert.deepEqual(moi.E.kiemTra, goc.E.kiemTra);
  assert.equal(moi.F.ok, goc.F.ok);
  assert.equal(moi.A.cau.tuThem, true);
  assert.equal(moi.A.cau.loaiVI, '(Cẩu gật gù)');
});

test('Cẩu có thành phần CR (MC175B), lực nhổ chân cẩu cố định, n = 1,5 (MC205B) giữ đúng qua bản sao', () => {
  for (const [goc, h] of [['MC175B', 41], ['MC205B', 40], ['ZoomlionL125.10F', 40], ['XGTL120_5016-8', 40]]) {
    const d = banSao(goc, goc + ' tự nhập');
    const kq = C.taoCauTuNhap(d, []);
    assert.equal(kq.hopLe, true, goc + ': ' + kq.loi.join('; '));
    C.datCauTuThem([kq.cau]);
    const a = tinhVoiCau(goc, h).A, b = tinhVoiCau(goc + ' tự nhập', h).A;
    assert.deepEqual(b.quyDoi, a.quyDoi, goc + ' quy đổi');
    assert.equal(b.n, a.n, goc + ' n');
    assert.equal(b.Pct, a.Pct, goc + ' Pct');
    assert.deepEqual(b.catalogue, a.catalogue, goc + ' catalogue');
  }
});

test('Hệ số an toàn n riêng của cẩu tự thêm được dùng để quy đổi', () => {
  const d = banSao('LLT5020-10', 'Cẩu thử');
  d.heSoAnToan = 1.3;
  C.datCauTuThem([C.taoCauTuNhap(d, []).cau]);
  const a = tinhVoiCau('Cẩu thử').A;
  const h = a.hang;
  assert.equal(a.n, 1.3);
  assert.ok(Math.abs(a.quyDoi.lv.N - h.lv.N * 1.3) < 1e-9);
  assert.ok(Math.abs(a.quyDoi.klv.M - h.klv.M * 1.3) < 1e-9);
  // tìm theo tên không phân biệt hoa thường, dấu cách
  assert.equal(C.timCau('cẩuthử').ten, 'Cẩu thử');
});

test('Kiểm tra số liệu nhập: tên, trùng tên, số âm, thiếu CR, chiều cao trùng', () => {
  const d = banSao('MC175B', '');
  let kq = C.taoCauTuNhap(d, []);
  assert.equal(kq.hopLe, false);
  assert.match(kq.loi.join(' '), /Nhập tên/);

  d.ten = 'mc 175b';
  kq = C.taoCauTuNhap(d, []);
  assert.match(kq.loi.join(' '), /trùng một cẩu có sẵn/);

  d.ten = 'Cẩu A';
  const daCo = [{ ten: 'Cẩu A' }];
  assert.match(C.taoCauTuNhap(d, daCo).loi.join(' '), /Đã có cẩu tự thêm/);
  d.tenGoc = 'Cẩu A';   // đang sửa chính cẩu đó → không báo trùng
  assert.equal(C.taoCauTuNhap(d, daCo).hopLe, true);

  const x = JSON.parse(JSON.stringify(d));
  x.ten = 'A/B'; x.beRongThan = -1; x.heSoAnToan = 0;
  x.hang[0].lv.CR = ''; x.hang[1].klv.M = -5; x.hang[2].h = x.hang[3].h;
  const loi = C.taoCauTuNhap(x, []).loi.join(' | ');
  assert.match(loi, /không được chứa/);
  assert.match(loi, /Bề rộng thân cẩu Ht phải > 0/);
  assert.match(loi, /Hệ số an toàn n phải > 0/);
  assert.match(loi, /dòng 1: nhập LV CR/);
  assert.match(loi, /dòng 2: KLV M phải ≥ 0/);
  assert.match(loi, /hai dòng cùng chiều cao/);

  // bảng không theo thứ tự → tự sắp xếp; dòng trống bị bỏ
  const y = banSao('LLT5020-10', 'Cẩu B');
  y.hang.reverse();
  y.hang.push({ h: '', lv: { N: '', M: '', H: '' }, klv: { N: '', M: '', H: '' } });
  const cy = C.taoCauTuNhap(y, []).cau;
  assert.deepEqual(cy.hang.map((h) => h.h), C.timCau('LLT5020-10').hang.map((h) => h.h));
});

test('Dán bảng tải từ Excel: Tab, dấu phẩy thập phân, bỏ dòng tiêu đề, báo sai số cột', () => {
  const cot = C.cotBangTai({ quyTacM: 'cr', kieuT: 'theo-hang' });
  assert.deepEqual(cot, { lv: ['N', 'M', 'H', 'CR', 'T'], klv: ['N', 'M', 'H', 'CR'] });
  const text = 'H\tN\tM\tH\tCR\tT\tN\tM\tH\tCR\n' +
    '8\t548,06\t130,55\t16,44\t563,19\t175\t468,06\t323,87\t44,01\t635,06\r\n' +
    '11\t1.548,5\t130\t16\t563\t175\t468\t323\t44\t635\t\n\n';
  const r = C.docBangDan(text, cot);
  assert.deepEqual(r.loi, []);
  assert.equal(r.hang.length, 2);
  assert.deepEqual(r.hang[0], { h: 8, lv: { N: 548.06, M: 130.55, H: 16.44, CR: 563.19, T: 175 }, klv: { N: 468.06, M: 323.87, H: 44.01, CR: 635.06 } });
  assert.equal(r.hang[1].lv.N, 1548.5);
  const sai = C.docBangDan('8 548 130 16\n11 a 1 2 3 4 5 6 7 8', cot);
  assert.match(sai.loi[0], /Dòng 1 có 4 ô, cần 10 ô/);
  assert.match(sai.loi[1], /không phải số/);
  // dấu cách / chấm phẩy
  const r2 = C.docBangDan('10; 600; 1900; 27; 480; 1280; 90', C.cotBangTai({ quyTacM: 'x_n', kieuT: 'mot' }));
  assert.deepEqual(r2.hang[0], { h: 10, lv: { N: 600, M: 1900, H: 27 }, klv: { N: 480, M: 1280, H: 90 } });
});

test('File chia sẻ: xuất rồi đọc lại được đúng các cẩu; báo lỗi file hỏng', () => {
  const a = C.taoCauTuNhap(banSao('MC175B', 'Cẩu X'), []).cau;
  const b = C.taoCauTuNhap(banSao('LLT5020-10', 'Cẩu Y'), []).cau;
  const file = JSON.stringify(C.taoFileCau([a, b]));
  const doc = C.docFileCau(file);
  assert.deepEqual(doc.loi, []);
  assert.deepEqual(doc.ds, [a, b]);
  assert.match(C.docFileCau('{').loi[0], /không phải JSON/);
  assert.match(C.docFileCau('{"x":1}').loi[0], /không có danh sách/);
  const hong = JSON.parse(file);
  hong.ds[1].hang[0].lv.N = -1;
  const d2 = C.docFileCau(JSON.stringify(hong));
  assert.equal(d2.ds.length, 1);
  assert.match(d2.loi[0], /Cẩu "Cẩu Y"/);
});

test('Cẩu tự thêm không có mômen xoắn, không có lực nhổ cho sẵn: các phần tính vẫn chạy', () => {
  const d = {
    ten: 'Potain MCT 88', loai: 'dinh-bang', chieuDaiTayCan: 52, beRongThan: 1.6, duongKinhNhomBulong: 0.4,
    tongChieuDayBanThep: 40, heSoAnToan: 1.2, quyTacN: 'x_n', quyTacM: 'x_n', kieuT: 'khong',
    hang: [
      { h: 20, lv: { N: '520', M: '1650,5', H: '22' }, klv: { N: 430, M: 1300, H: 70 } },
      { h: 40, lv: { N: 640, M: 1900, H: 28 }, klv: { N: 550, M: 1500, H: 95 } }
    ]
  };
  const kq = C.taoCauTuNhap(d, []);
  assert.equal(kq.hopLe, true, kq.loi.join('; '));
  assert.equal(kq.cau.tieuDe, 'Tower crane type 52m (Potain MCT 88)');
  assert.equal(kq.cau.loaiEN, '(Flat-top)');
  C.datCauTuThem([kq.cau]);
  const t = tinhVoiCau('Potain MCT 88', 37.5);
  assert.equal(t.A.hopLe, true, t.A.loi.join('; '));
  assert.equal(t.A.hang.h, 20);
  assert.ok(Math.abs(t.A.quyDoi.lv.M - 1650.5 * 1.2) < 1e-9);
  assert.ok(Math.abs(t.A.Pct - Math.max(1900 / 1.6 / Math.SQRT2 - 640 / 4, 1500 / 1.6 / Math.SQRT2 - 550 / 4)) < 1e-9);
  assert.equal(t.A.nhan.T, '-');
  assert.equal(t.E.hopLe, true, (t.E.loi || []).join('; '));
  assert.equal(t.E.T, 0);
  assert.equal(t.F.hopLe, true);
  // dựng mô hình, tải trọng và tổ hợp ETABS như cẩu có sẵn (không có mômen xoắn → không có MZ1)
  const s2 = JSON.parse(JSON.stringify(MCT.macDinh));
  s2.cau.ten = 'Potain MCT 88'; s2.cau.chieuCao = 37.5;
  const m = C.taoMoHinhEtabs(s2, t), tt = C.taiTrongEtabs(s2, t, m);
  assert.equal(m.hopLe, true, (m.loi || []).join('; '));
  assert.equal(tt.hopLe, true, (tt.loi || []).join('; '));
  assert.ok(!tt.mauTai.some((p) => p.ten === 'MZ1'));
  const fz1 = tt.mauTai.find((p) => p.ten === 'FZ1');
  assert.ok(Math.abs(-fz1.luc.giaTri[2] * tt.n - t.A.quyDoi.lv.N) < 0.01);
  // chiều cao thấp hơn dòng đầu → báo ngoài catalogue
  assert.match(tinhVoiCau('Potain MCT 88', 10).A.loi.join(' '), /nằm ngoài catalogue/);
});

// Cách 1 của file nhap_so_lieu.xlsx (sheet TSC): catalogue chỉ cho phản lực chân F1 (nhổ), F2 (nén), không có Q
function nhapPhanLuc(ten, hang) {
  return Object.assign(JSON.parse(JSON.stringify(MCT.macDinh.cauNhap)), {
    ten: ten, chieuDaiTayCan: 50, beRongThan: 1.6, heSoAnToan: 1.15, kieuT: 'khong', cachNhap: 'phan-luc', hang: hang
  });
}

test('Catalogue chỉ cho phản lực F1, F2: quy đổi N, M, Q đúng ô Excel (Y48:AD48), lực nhổ 1 chân = F1', () => {
  const kq = C.taoCauTuNhap(nhapPhanLuc('POTAIN MR150 (phản lực)', [
    { h: 34.05, lv: { F1: 970, F2: 1240, H: '' }, klv: { F1: 1210, F2: 1480, H: '' } }]), []);
  assert.equal(kq.hopLe, true, kq.loi.join('; '));
  const h = kq.cau.hang[0];
  const gan = (a, e, m) => assert.ok(Math.abs(a - e) < 1e-9, `${m}: ${a} ≠ ${e}`);
  // giá trị Excel tính sẵn (Y48, Z48, AA48, AB48, AC48, AD48)
  gan(h.lv.N, 540, 'N LV'); gan(h.lv.M, 2500.329578275632, 'M LV'); gan(h.lv.H, 213.03713103588305, 'Q LV = 0,7·Q KLV');
  gan(h.klv.N, 540, 'N KLV'); gan(h.klv.M, 3043.3875862269006, 'M KLV'); gan(h.klv.H, 304.3387586226901, 'Q KLV = 0,1·M KLV');
  assert.deepEqual(h.phanLuc, { lv: { F1: 970, F2: 1240, H: null }, klv: { F1: 1210, F2: 1480, H: null } });
  assert.equal(kq.cau.cachNhap, 'phan-luc');
  // lực nhổ 1 chân app tính = F1 lớn nhất
  gan(C.lucNhoChanCau(kq.cau), 1210, 'Pct');
  // tính trọn với cẩu này
  C.datCauTuThem([kq.cau]);
  const r = tinhVoiCau('POTAIN MR150 (phản lực)', 34.05);
  for (const m of ['A', 'B', 'C', 'D', 'E', 'F']) assert.equal(r[m].hopLe, true, m + ': ' + (r[m].loi || []).join('; '));
  gan(r.A.quyDoi.lv.N, 540 * 1.15, 'N quy đổi LV');
  gan(r.A.quyDoi.klv.M, 3043.3875862269006 * 1.15, 'M quy đổi KLV');
});

test('Phản lực có Q theo catalogue: dùng Q nhập; sửa cẩu trả lại đúng F1, F2, Q; báo lỗi F2 ≤ F1; dán bảng theo cột F1, F2, Q', () => {
  const kq = C.taoCauTuNhap(nhapPhanLuc('Cẩu phản lực có Q', [
    { h: 30, lv: { F1: '725', F2: '1051', H: '31' }, klv: { F1: 910, F2: 1187, H: 105 } },
    { h: 40, lv: { F1: 800, F2: 1100, H: '' }, klv: { F1: 950, F2: 1250, H: 110 } }]), []);
  assert.equal(kq.hopLe, true, kq.loi.join('; '));
  const [h1, h2] = kq.cau.hang;
  assert.equal(h1.lv.H, 31); assert.equal(h1.klv.H, 105);
  assert.ok(Math.abs(h1.lv.N - 652) < 1e-9 && Math.abs(h1.lv.M - 1776 * 1.6 / Math.SQRT2) < 1e-9);
  assert.ok(Math.abs(h2.lv.H - 0.7 * 110) < 1e-9, 'Q LV trống → 0,7·Q KLV nhập');
  // sửa cẩu: số liệu nhập trả lại phản lực
  const d = C.cauSangNhap(kq.cau);
  assert.equal(d.cachNhap, 'phan-luc');
  assert.deepEqual([d.hang[0].lv.F1, d.hang[0].lv.F2, d.hang[0].lv.H, d.hang[1].lv.H], [725, 1051, 31, '']);
  const lai = C.taoCauTuNhap(d, [kq.cau]);
  assert.equal(lai.hopLe, true, lai.loi.join('; '));
  assert.deepEqual(lai.cau.hang, kq.cau.hang);
  // file chia sẻ giữ cách nhập
  const doc = C.docFileCau(JSON.stringify(C.taoFileCau([kq.cau])));
  assert.equal(doc.ds[0].cachNhap, 'phan-luc');
  assert.deepEqual(doc.ds[0].hang, kq.cau.hang);
  // F2 ≤ F1
  const sai = C.taoCauTuNhap(nhapPhanLuc('Sai', [{ h: 30, lv: { F1: 1000, F2: 900, H: '' }, klv: { F1: 900, F2: 1000, H: '' } }]), []);
  assert.match(sai.loi.join(' '), /LV F2 \(nén\) phải lớn hơn F1/);
  // dán bảng theo cột H, LV F1 F2 Q, KLV F1 F2 Q (Q trống được)
  const cot = C.cotBangTai({ cachNhap: 'phan-luc', kieuT: 'khong' });
  assert.deepEqual(cot, { lv: ['F1', 'F2', 'H'], klv: ['F1', 'F2', 'H'] });
  const dan = C.docBangDan('H\tF1\tF2\tQ\tF1\tF2\tQ\n34,05\t970\t1240\t\t1210\t1480\t', cot);
  assert.deepEqual(dan.loi, []);
  assert.deepEqual(dan.hang[0], { h: 34.05, lv: { F1: 970, F2: 1240, H: '' }, klv: { F1: 1210, F2: 1480, H: '' } });
});

test('Thuyết minh với cẩu nhập bằng phản lực: có đoạn quy đổi và bảng F1, F2 → N, M, H của dòng tính toán', async () => {
  globalThis.docx = require('../vendor/docx-9.15.3.umd.js');
  require('../js/bao-cao/thuyet-minh.js');
  const kq = C.taoCauTuNhap(nhapPhanLuc('MR150 phản lực', [{ h: 34.05, lv: { F1: 970, F2: 1240, H: '' }, klv: { F1: 1210, F2: 1480, H: 105 } }]), []);
  assert.equal(kq.hopLe, true, kq.loi.join('; '));
  C.datCauTuThem([kq.cau]);
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  s.cau.ten = 'MR150 phản lực'; s.cau.chieuCao = 34.05;
  const buf = await globalThis.docx.Packer.toBuffer(MCT.baoCao.taoThuyetMinh(s, C.tinhTatCa(s)));
  const zlib = require('node:zlib');
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buf.readUInt32LE(eocd + 16), xml = '';
  for (let i = 0; i < buf.readUInt16LE(eocd + 10); i++) {
    const nen = buf.readUInt16LE(p + 10), cs = buf.readUInt32LE(p + 20), lt = buf.readUInt16LE(p + 28), le = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    if (buf.slice(p + 46, p + 46 + lt).toString() === 'word/document.xml') {
      const st = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
      xml = (nen === 0 ? buf.slice(st, st + cs) : zlib.inflateRawSync(buf.slice(st, st + cs))).toString('utf8');
    }
    p += 46 + lt + le + lc;
  }
  const chu = xml.replace(/<[^>]+>/g, '');
  ['Catalogue cho phản lực chân đế F1 (nhổ) và F2 (nén)', 'N = 2·(F2 − F1)', 'Quy đổi phản lực chân đế sang nội lực – chiều cao 34.05 m', '2500.33', '3043.39', '73.50*', '105.00']
    .forEach((t) => assert.ok(chu.includes(t), 'thiếu: ' + t));
});
