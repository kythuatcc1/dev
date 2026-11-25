// Thuyết minh Word theo phương pháp ETABS: giữ khung form CC1, thay nội dung các đầu mục kiểm tra bằng nội lực ETABS
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');

globalThis.docx = require('../vendor/docx-9.15.3.umd.js');
['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
['dia-chat', 'sct-coc', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca', 'etabs-mo-hinh', 'etabs-tai-trong', 'etabs-ket-qua', 'dam-giang'].forEach((f) => require(`../js/calc/${f}.js`));
require('../js/bao-cao/thuyet-minh.js');
const MCT = globalThis.MCT;

function docTrongZip(buf, ten) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buf.readUInt32LE(eocd + 16);
  const n = buf.readUInt16LE(eocd + 10);
  for (let i = 0; i < n; i++) {
    const nen = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const lenTen = buf.readUInt16LE(p + 28), lenExtra = buf.readUInt16LE(p + 30), lenCmt = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    if (buf.slice(p + 46, p + 46 + lenTen).toString() === ten) {
      const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
      const data = buf.slice(start, start + csize);
      return (nen === 0 ? data : zlib.inflateRawSync(data)).toString('utf8');
    }
    p += 46 + lenTen + lenExtra + lenCmt;
  }
  return null;
}

// Số liệu mặc định + kết quả ETABS giả lập (cùng quy luật với ETABSv1 giả lập của cầu nối)
function soLieuEtabs(dsDam) {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  s.tinhToan.phuongPhap = 'etabs';
  s.damGiang.ds = (dsDam || []).map((d) => Object.assign(JSON.parse(JSON.stringify(s.damGiang.mau)), d));
  const kq = MCT.calc.tinhTatCa(s);
  const m = MCT.calc.taoMoHinhEtabs(s, kq);
  const t = MCT.calc.taiTrongEtabs(s, kq, m);
  const gui = MCT.calc.duLieuPhanTich(m, t);
  const diem = new Map(m.diem.map((d) => [d.ten, d]));
  const raw = {
    toHop: gui.toHop,
    coc: m.coc.map((c, ip) => ({
      ten: c.ten,
      dong: [].concat(...m.thanh.filter((f) => c.thanh.includes(f.ten)).map((f) => {
        const k = Number(f.ten.split('_')[1]), zI = diem.get(f.dau).z, zJ = diem.get(f.cuoi).z, L = Math.abs(zI - zJ);
        return [].concat(...gui.toHop.map((ten, j) => [0, L].map((sta) =>
          [zI + (zJ - zI) * sta / L, j, -(1000 + 100 * (ip + 1) + 10 * j + k) - 0.5 * sta, 10 + j, 0, 0, 100 + 2 * j - k, j])));
      }))
    })),
    chuyenVi: { nut: gui.nutChuyenVi, dong: [].concat(...gui.nutChuyenVi.map((n, i) => gui.toHop.map((ten, j) => [i, j, 0.001 * (j + 1), 0.0005, -0.002, 1e-4, 2e-4, 0]))) },
    dai: (() => {
      const nut = [], dong = [];
      m.xs.forEach((x) => m.ys.forEach((y) => { nut.push([x, y]); }));
      nut.forEach((p, ni) => gui.toHop.forEach((ten, j) => dong.push([ni, j, 10 + j, 5, 0, 2, 1])));
      return { nut, dong };
    })()
  };
  raw.dam = (m.dam || []).map((d) => ({ ten: d.ten, dong: [].concat(...gui.toHop.map((ten, j) => [0, d.L].map((x) =>
    [x, j, 50 + 5 * j, 20 + j, 5, 1, 10 + j, x === 0 ? -(40 + 2 * j) : 30 + j]))) }));
  const kE = MCT.calc.ketQuaEtabs(raw, m, t, s, kq);
  const F = MCT.calc.ketLuanEtabs(kq.F, kE);
  return { s, kq, m, t, kE, F, tatCa: Object.assign({}, kq, { etabs: { m, t, kE, F } }) };
}

const chuCua = (xml) => xml.replace(/<[^>]+>/g, '');
const f0 = (v) => (Math.round(v)).toString();

// Các đoạn tiêu đề (Heading 2, Heading 3) theo thứ tự trong document.xml
function tieuDe(xml, kieu) {
  return xml.split(/<w:p[ >]/).filter((d) => d.includes('<w:pStyle w:val="' + kieu + '"/>')).map(chuCua);
}

test('Thuyết minh ETABS: khung CC1, đầu mục theo báo cáo thẩm tra, ô dán hình ETABS, tính móng theo nội lực ETABS', async () => {
  const L = soLieuEtabs();
  assert.equal(L.kE.hopLe, true, (L.kE.loi || []).join('; '));
  const buf = await globalThis.docx.Packer.toBuffer(MCT.baoCao.taoThuyetMinh(L.s, L.tatCa));
  assert.equal(buf.slice(0, 2).toString(), 'PK');
  const xml = docTrongZip(buf, 'word/document.xml');
  const chu = chuCua(xml);
  // đầu mục cấp 2, 3 đúng thứ tự phụ lục tính toán của báo cáo thẩm tra
  assert.deepEqual(tieuDe(xml, 'Heading2'), ['1. CƠ SỞ TÍNH TOÁN', '2. THÔNG SỐ ĐẦU VÀO', '3. MÔ HÌNH TÍNH TOÁN', '4. KẾT QUẢ NỘI LỰC',
    '5. TÍNH TOÁN SỨC CHỊU TẢI CỌC', '6. TÍNH TOÁN MÓNG CẨU THÁP', '7. KẾT LUẬN, KIẾN NGHỊ']);
  assert.deepEqual(tieuDe(xml, 'Heading3'), ['2.1. Thông số vật liệu', '2.2. Thông số cẩu tháp', '2.3. Tổ hợp tải trọng', '2.4. Số liệu địa chất',
    '3.1. CT1 – LLT5020-10', '4.1. CT1 – LLT5020-10', '5.1. Thông số đầu vào', '5.2. Tính toán sức chịu tải cọc',
    '5.3. Tổng hợp sức chịu tải theo từng phương pháp', '6.1. Kiểm tra cọc', '6.2. Kiểm tra đài móng', '6.3. Kiểm tra bu lông móng cẩu',
    '6.4. Kiểm tra ổn định đất nền và độ lún móng khối quy ước', '7.1. Kết luận', '7.2. Kiến nghị']);
  const ck = L.kE.cocKiemTra;
  [
    // khung CC1
    'THUYẾT MINH TÍNH TOÁN', 'MÓNG CẨU THÁP CT1 LLT5020-10', 'TÍNH TOÁN MÓNG CẨU THÁP CT1 LLT5020-10',
    // ô dán hình như báo cáo thẩm tra
    'Dán hình chụp từ ETABS', 'Hình 2.1 Thông tin tải trọng cần trục tháp LLT5020-10 tự đứng 37.5m', 'Hình 2.2 Mặt bằng hố khoan',
    'Hình 2.3 Mặt bằng bố trí cẩu tháp', 'Hình 2.4 Hình trụ hố khoan', 'Hình 3.1 Mô hình móng cẩu tháp',
    'Hình 3.3 Lực Fx1, Fy1, Fz1 của cẩu tháp tác dụng lên móng (kN)', 'Hình 3.4 Lực Mx1, My1, Mz1', 'Hình 3.5 Lực Fx2, Fy2, Fz2', 'Hình 3.6 Lực Mx2, My2',
    'Bảng 4.1 Nội lực cọc tổ hợp BAO-MIN', 'Bảng 4.2 Nội lực cọc tổ hợp BAO-MAX', 'Moment 2-2', 'Shear 3-3', 'Dán hình',
    'Hình 6.2 Chuyển vị ngang, góc xoay đầu cọc', 'Hình 6.3 Mômen đài móng (kNm)', 'Hình 6.4 Lực cắt đài móng (kN)',
    // nội dung tính
    'Bảng 2.1 Tải trọng chân đế cẩu tháp', 'Bảng 2.3 Tải trọng tác dụng tại tâm đài', 'LV-NEN-000', 'KLV-KEO-000', 'BAO = ENVELOPE',
    'Bảng 3.1 Độ cứng lò xo đất ngang', 'Bảng 4.3 Nội lực cọc từ đáy đài tới mũi cọc', '5.2.1. Sức chịu tải cọc theo vật liệu', '6572', '4561',
    'Kiểm tra sức chịu tải cọc', String(Math.round(ck.Pnen.gt)), 'Cọc đảm bảo sức chịu tải', 'Hình 6.1 Check P-M', 'Bảng 6.3 Check Shear', 'Bảng 6.2 Các điểm nguy hiểm kiểm tra P–M', 'N nén lớn nhất', 'M lớn nhất', 'Tỉ số M/Mgh lớn nhất', 'Số cặp nội lực (N, M) đã kiểm tra', String(L.kE.cocKiemTra.soCapNM),
    'Kiểm tra chuyển vị ngang, góc xoay đầu cọc', 'Bảng 6.4 Kiểm tra đài chịu uốn – phương X', 'Bảng 6.6 Kiểm tra đài chịu cắt',
    'Bảng 6.7 Kiểm tra nứt đài móng', 'Kiểm tra xuyên thủng đài do chân cẩu', '26013', 'a) Thông số bulong',
    'g) Kiểm tra phá hoại cục bộ bê tông', 'h) Kiểm tra bulong chịu kéo + cắt đồng thời', 'Liên kết bu lông móng cẩu đảm bảo chịu lực',
    'a) Kích thước móng khối quy ước', 'Bảng 7.1 Tổng hợp các kiểm tra', 'Bu lông neo móng cẩu đảm bảo khả năng chịu lực',
    'Chiều cao tự đứng của cẩu không được vượt quá chiều cao thiết kế là 37.5m đối với cẩu CT1 – LLT5020-10'
  ].forEach((t) => assert.ok(chu.includes(t), 'thiếu: ' + t));
  // không còn đầu mục kiểu form CC1 cũ
  ['CHƯƠNG I. TỔNG QUAN', 'PHẦN 1. TÍNH TOÁN SỨC CHỊU TẢI CỌC', 'B. KIỂM TRA TẢI TRỌNG TÁC DỤNG LÊN CỌC', 'E. KIỂM TRA BULONG', 'E.1. Thông số bulong',
    'PHẦN 5. KIỂM TRA ỔN ĐỊNH', 'A.1. Thông số địa chất'].forEach((t) => assert.ok(!chu.includes(t), 'còn đầu mục cũ: ' + t));
  assert.equal(MCT.baoCao.tenFile(L.s, L.tatCa), 'Thuyet_minh_mong_cau_thap_CT1_LLT5020-10_ETABS.docx');
  L.t.toHop.filter((c) => c.loai === 0).forEach((c) => assert.ok(chu.includes(c.ten), 'thiếu tổ hợp ' + c.ten));
  assert.equal((xml.match(/<\/w:tbl><w:tbl>/g) || []).length, 0, 'hai bảng liền nhau');
});

test('Thuyết minh ETABS: biểu đồ app vẽ được chèn, các ô dán hình chụp ETABS vẫn giữ', async () => {
  const L = soLieuEtabs();
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64'));
  const h = { data: png, w: 300, h: 400 };
  const hinh = { etabsMatBang: { data: png, w: 560, h: 420 }, etabsP: h, etabsM: h, etabsV: h, etabsTuongTac: { data: png, w: 480, h: 440 }, sigma: h, spt: h };
  const buf = await globalThis.docx.Packer.toBuffer(MCT.baoCao.taoThuyetMinh(L.s, L.tatCa, hinh));
  const chu = chuCua(docTrongZip(buf, 'word/document.xml'));
  assert.ok(!chu.includes('được chèn khi xuất từ app'), 'còn ô chờ biểu đồ app vẽ');
  assert.ok(chu.includes('Dán hình chụp từ ETABS'));
  assert.ok(chu.includes('Hình 4.1 Bao lực dọc nén, mômen, lực cắt cọc'));
  assert.ok(chu.includes('Hình 5.1 Biểu đồ chỉ số SPT'), 'đánh số lại hình SPT trong mục 5');
});

test('Thuyết minh ETABS có dầm giằng: mục 6.4 kiểm tra dầm, ổn định – lún thành 6.5, kết luận có dầm', async () => {
  const L = soLieuEtabs([{ tuCoc: 1, denCoc: 2, tren: { n: 4, d: 22 } }, { tuCoc: 2, denCoc: 3, tren: { n: 2, d: 10 } }]);
  assert.equal(L.kE.damGiang.length, 2);
  const buf = await globalThis.docx.Packer.toBuffer(MCT.baoCao.taoThuyetMinh(L.s, L.tatCa));
  const xml = docTrongZip(buf, 'word/document.xml'), chu = chuCua(xml);
  const h3 = tieuDe(xml, 'Heading3');
  assert.ok(h3.includes('6.4. Kiểm tra dầm giằng cọc'));
  assert.ok(h3.includes('6.5. Kiểm tra ổn định đất nền và độ lún móng khối quy ước'));
  ['Bảng 6.8 Thông số dầm giằng', 'Dầm DG1 (C1 – C2, z = -8.00 m)', 'Dầm DG2', 'Bảng 6.9 Kiểm tra dầm DG1', 'Bảng 6.10 Kiểm tra dầm DG2',
    'Thép dưới (M3 &gt; 0)', 'Kéo dọc trục', 'Cắt ngang', 'dầm DG1 đảm bảo khả năng chịu lực', 'dầm DG2 KHÔNG đảm bảo', 'Dầm giằng DG1',
    'Dầm giằng cọc KHÔNG đảm bảo'].forEach((t) => assert.ok(chu.includes(t), 'thiếu: ' + t));
  assert.equal((xml.match(/<\/w:tbl><w:tbl>/g) || []).length, 0, 'hai bảng liền nhau');
});

test('Chọn ETABS mà chưa có kết quả ETABS: báo lỗi rõ ràng, không xuất nhầm bản giải tích', () => {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  s.tinhToan.phuongPhap = 'etabs';
  const kq = MCT.calc.tinhTatCa(s);
  assert.throws(() => MCT.baoCao.taoThuyetMinh(s, kq), /chưa có kết quả ETABS/);
});

test('Chọn Giải tích: thuyết minh không có mục ETABS dù đang lưu kết quả ETABS', async () => {
  const L = soLieuEtabs();
  L.s.tinhToan.phuongPhap = 'giai-tich';
  const buf = await globalThis.docx.Packer.toBuffer(MCT.baoCao.taoThuyetMinh(L.s, L.tatCa));
  const chu = chuCua(docTrongZip(buf, 'word/document.xml'));
  assert.ok(!chu.includes('A.5. Mô hình tính toán'));
  assert.ok(!chu.includes('ETABS'));
  assert.ok(chu.includes('Móng cẩu tháp đủ khả năng chịu lực'));
  assert.equal(MCT.baoCao.tenFile(L.s, L.tatCa), 'Thuyet_minh_mong_cau_thap_CT1_LLT5020-10.docx');
});
