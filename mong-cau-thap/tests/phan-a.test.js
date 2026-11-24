// Đối chiếu phần A (tải trọng cẩu) với kết quả Excel đã tính sẵn.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('../js/data/cau-thap.js');
require('../js/data/vat-lieu.js');
require('../js/calc/phan-a-tai-trong.js');
const MCT = globalThis.MCT;
const REF = require(path.join(__dirname, 'excel-tham-chieu.json'));

function gan(actual, expected, msg) {
  const tol = 1e-9 * Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: app=${actual} excel=${expected}`);
}

test('Quy đổi tải trọng của mọi cẩu, mọi chiều cao khớp cột F:H, M:O sheet Solieu', () => {
  let dem = 0;
  for (const [ten, ref] of Object.entries(REF.cauThapCatalogue)) {
    const cau = MCT.calc.timCau(ten);
    assert.ok(cau, ten);
    // Trong Excel, mọi khối catalogue dùng chung n của cẩu ĐANG CHỌN ('Cau thap'!P15),
    // nên số Excel lưu sẵn đều ứng với n của LLT5020-10 (= 1.2).
    const n = REF.sheetCauThap_phanA.ketQua.n;
    for (const r of ref.quyDoi) {
      const hang = MCT.calc.traHang(cau, r.h);
      const lv = MCT.calc.quyDoi(cau, hang, 'lv', n);
      const klv = MCT.calc.quyDoi(cau, hang, 'klv', n);
      ['N', 'M', 'H'].forEach((k, i) => {
        gan(lv[k], r.lv[i], `${ten} h=${r.h} lv ${k}`);
        gan(klv[k], r.klv[i], `${ten} h=${r.h} klv ${k}`);
      });
      dem++;
    }
    gan(MCT.calc.lucNhoChanCau(cau), ref.pct, `${ten} Pct`);
  }
  assert.ok(dem >= 60, 'số hàng catalogue đã kiểm tra: ' + dem);
});

test('Sheet Cau thap – mục A khớp Excel (LLT5020-10, 37.5 m)', () => {
  const { dauVao, ketQua: k } = REF.sheetCauThap_phanA;
  const r = MCT.calc.tinhPhanA(dauVao);
  assert.equal(r.hopLe, true, r.loi.join('; '));
  assert.equal(r.n, k.n);
  assert.equal(r.cau.loaiVI, k.loai);
  assert.equal(r.chieuDaiTayCan, k.chieuDaiTayCan);
  assert.deepEqual([r.nhan.N, r.nhan.M, r.nhan.H, r.nhan.CR, r.nhan.T], k.nhan);
  const c = r.catalogue;
  const hien = (v) => (v === null ? '-' : v);
  assert.deepEqual([c.lv.N, c.lv.M, c.lv.H, hien(c.lv.CR), c.lv.T], k.catalogueLv);
  assert.deepEqual([c.klv.N, c.klv.M, c.klv.H, hien(c.klv.CR), hien(c.klv.T)], k.catalogueKlv);
  ['N', 'M', 'H'].forEach((key, i) => {
    gan(r.quyDoi.lv[key], k.quyDoiLv[i], 'quy đổi lv ' + key);
    gan(r.quyDoi.klv[key], k.quyDoiKlv[i], 'quy đổi klv ' + key);
  });
  assert.equal(r.vatLieu.Rb, k.Rb);
  assert.equal(r.vatLieu.Rbt, k.Rbt);
  assert.equal(r.vatLieu.Eb, k.Eb);
  assert.equal(r.vatLieu.Rs, k.Rs);
  assert.equal(r.vatLieu.Rsc, k.Rsc);
  gan(r.dai.P, k.P, 'trọng lượng đài');
  ['M', 'P', 'H'].forEach((key, i) => {
    gan(r.ngoaiLuc.lv[key], k.ngoaiLucLv[i], 'ngoại lực lv ' + key);
    gan(r.ngoaiLuc.klv[key], k.ngoaiLucKlv[i], 'ngoại lực klv ' + key);
  });
  assert.equal(r.Ht, k.Ht);
});

test('Chiều cao ngoài catalogue báo lỗi thay vì ra số sai', () => {
  const r = MCT.calc.tinhPhanA({ cau: 'LLT5020-10', chieuCao: 5, beTong: 'B35', cotThep: 'CB500-V', a_cm: 15, X: 4, Y: 4, H: 1.6 });
  assert.equal(r.hopLe, false);
  assert.match(r.loi[0], /ngoài catalogue/);
});
