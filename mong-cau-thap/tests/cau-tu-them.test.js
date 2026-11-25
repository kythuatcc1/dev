// Cẩu tháp tự thêm: chuẩn hoá, kiểm tra, tính như cẩu có sẵn, dán bảng từ Excel, file chia sẻ
const test = require('node:test');
const assert = require('node:assert/strict');

['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
['dia-chat', 'sct-coc', 'phan-a-tai-trong', 'cau-tu-them', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
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
