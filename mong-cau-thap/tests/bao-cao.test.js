// Thuyết minh Word: tạo được file .docx hợp lệ và chứa đúng số liệu.
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');

globalThis.docx = require('../vendor/docx-9.15.3.umd.js');
['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
['dia-chat', 'sct-coc', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong', 'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca']
  .forEach((f) => require(`../js/calc/${f}.js`));
require('../js/bao-cao/thuyet-minh.js');
const MCT = globalThis.MCT;

// Đọc một file trong gói zip (đủ dùng cho .docx do thư viện tạo ra)
function docTrongZip(buf, ten) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buf.readUInt32LE(eocd + 16);
  const n = buf.readUInt16LE(eocd + 10);
  for (let i = 0; i < n; i++) {
    const nen = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const lenTen = buf.readUInt16LE(p + 28), lenExtra = buf.readUInt16LE(p + 30), lenCmt = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const tenFile = buf.slice(p + 46, p + 46 + lenTen).toString();
    if (tenFile === ten) {
      const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
      const data = buf.slice(start, start + csize);
      return (nen === 0 ? data : zlib.inflateRawSync(data)).toString('utf8');
    }
    p += 46 + lenTen + lenExtra + lenCmt;
  }
  return null;
}

test('Xuất thuyết minh từ số liệu mặc định: file docx hợp lệ, đủ các phần, số khớp app', async () => {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  const kq = MCT.calc.tinhTatCa(s);
  const buf = await globalThis.docx.Packer.toBuffer(MCT.baoCao.taoThuyetMinh(s, kq));
  assert.equal(buf.slice(0, 2).toString(), 'PK');
  const xml = docTrongZip(buf, 'word/document.xml');
  assert.ok(xml, 'có word/document.xml');
  const chu = xml.replace(/<[^>]+>/g, '');
  [
    'THUYẾT MINH TÍNH TOÁN', 'MÓNG CẨU THÁP CT1 LLT5020-10', 'CHƯƠNG I. TỔNG QUAN', 'PHẦN 3. THÔNG SỐ CẨU THÁP',
    'CHƯƠNG II. TÍNH TOÁN MÓNG CẨU THÁP CT1 LLT5020-10', 'A. THÔNG SỐ ĐẦU VÀO',
    '956.80', '5238.83', '647.33', '3668.59', '5501.91', '1442.12', 'CB500-V', 'TCVN 10304:2025',
    'B. KIỂM TRA TẢI TRỌNG TÁC DỤNG LÊN CỌC', '3199', '-2237', 'C. KIỂM TRA XUYÊN THỦNG CHO ĐÀI MÓNG', '26013',
    'D. TÍNH CỐT THÉP CHO ĐÀI MÓNG', '173.9', '-155.2', 'E. KIỂM TRA BULONG', '1497', '438.0', '393.7', '414.0', '746.5',
    '4162.5', 'F. KẾT LUẬN', 'Móng cẩu tháp đủ khả năng chịu lực'
  ].forEach((t) => assert.ok(chu.includes(t), 'thiếu: ' + t));
  const header = docTrongZip(buf, 'word/header1.xml') || docTrongZip(buf, 'word/header2.xml');
  assert.match(header.replace(/<[^>]+>/g, ''), /HỒ SƠ THẨM TRA/);
  assert.equal(MCT.baoCao.tenFile(s, kq), 'Thuyet_minh_mong_cau_thap_CT1_LLT5020-10.docx');
});

test('Hai bảng liền nhau luôn có đoạn ngăn (tránh Word gộp bảng)', async () => {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  const buf = await globalThis.docx.Packer.toBuffer(MCT.baoCao.taoThuyetMinh(s, MCT.calc.tinhTatCa(s)));
  const xml = docTrongZip(buf, 'word/document.xml');
  assert.equal((xml.match(/<\/w:tbl><w:tbl>/g) || []).length, 0);
});
