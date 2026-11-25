// Thuyết minh Word theo phương pháp ETABS: giữ khung form CC1, thay nội dung các đầu mục kiểm tra bằng nội lực ETABS
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');

globalThis.docx = require('../vendor/docx-9.15.3.umd.js');
['cau-thap', 'vat-lieu', 'bang-tra', 'mau-dia-chat', 'he-so-tai-ngang'].forEach((f) => require(`../js/data/${f}.js`));
require('../js/mac-dinh.js');
['dia-chat', 'sct-coc', 'phan-a-tai-trong', 'phan-b-tai-coc', 'phan-c-xuyen-thung', 'phan-d-thep-dai', 'phan-e-bulong',
  'phan-f-ket-luan', 'tai-ngang', 'tuong-tac', 'lun', 'tinh-tat-ca', 'etabs-mo-hinh', 'etabs-tai-trong', 'etabs-ket-qua'].forEach((f) => require(`../js/calc/${f}.js`));
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
function soLieuEtabs() {
  const s = JSON.parse(JSON.stringify(MCT.macDinh));
  s.tinhToan.phuongPhap = 'etabs';
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
  const kE = MCT.calc.ketQuaEtabs(raw, m, t, s, kq);
  const F = MCT.calc.ketLuanEtabs(kq.F, kE);
  return { s, kq, m, t, kE, F, tatCa: Object.assign({}, kq, { etabs: { m, t, kE, F } }) };
}

const chuCua = (xml) => xml.replace(/<[^>]+>/g, '');
const f0 = (v) => (Math.round(v)).toString();

test('Thuyết minh ETABS: giữ khung CC1, thêm mô hình – tổ hợp – nội lực, kiểm tra theo nội lực ETABS', async () => {
  const L = soLieuEtabs();
  assert.equal(L.kE.hopLe, true, (L.kE.loi || []).join('; '));
  const buf = await globalThis.docx.Packer.toBuffer(MCT.baoCao.taoThuyetMinh(L.s, L.tatCa));
  assert.equal(buf.slice(0, 2).toString(), 'PK');
  const xml = docTrongZip(buf, 'word/document.xml');
  const chu = chuCua(xml);
  const ck = L.kE.cocKiemTra;
  [
    // khung CC1 giữ nguyên
    'THUYẾT MINH TÍNH TOÁN', 'CHƯƠNG I. TỔNG QUAN', 'PHẦN 1. TÍNH TOÁN SỨC CHỊU TẢI CỌC', 'A. THÔNG SỐ ĐẦU VÀO',
    'B. KIỂM TRA TẢI TRỌNG TÁC DỤNG LÊN CỌC', 'C. KIỂM TRA XUYÊN THỦNG CHO ĐÀI MÓNG', '26013', 'D. TÍNH CỐT THÉP CHO ĐÀI MÓNG',
    'E. KIỂM TRA BULONG', '4162.5', 'F. KẾT LUẬN', 'PHẦN 3. KIỂM TRA CỌC CHỊU TẢI NGANG', 'PHẦN 4. TÍNH TOÁN BIỂU ĐỒ TƯƠNG TÁC CỌC',
    'PHẦN 5. KIỂM TRA ỔN ĐỊNH ĐẤT NỀN VÀ KIỂM TRA LÚN', '20356.50',
    // nội dung ETABS (trình bày như PDF tham khảo)
    'ETABS (Computers and Structures, Inc.)', 'A.5. Mô hình tính toán (phần mềm ETABS)', 'thick shell', 'Bảng A.1 Độ cứng lò xo đất ngang',
    'A.6. Tải trọng và tổ hợp tải trọng', 'Bảng A.2 Tải trọng tác dụng tại tâm đài', 'FX1', 'MY2', 'LV-NEN-000', 'KLV-KEO-000',
    'Trường hợp cẩu tháp làm việc – các tổ hợp tính toán cho cọc chịu nén', 'Trường hợp cẩu tháp không làm việc – các tổ hợp tính toán cho cọc chịu kéo',
    'BAO = ENVELOPE', 'A.7. Kết quả nội lực cọc', 'Bảng A.3 Nội lực cọc',
    'lấy từ kết quả ETABS', f0(ck.Pnen.gt), ck.Pnen.toHop,
    'tích phân nội lực tấm vỏ', 'Thép theo phương X', 'Bảng D.2 Kiểm tra đài chịu uốn phương Y', 'Bảng D.3 Kiểm tra đài chịu cắt',
    'Bảng F.1 Tổng hợp các kiểm tra', 'Phần 3', 'Phần 4',
    'B. CHUYỂN VỊ NGANG VÀ GÓC XOAY ĐẦU CỌC', 'Tâm đài', 'Đầu cọc C1', 'C. MOMENT DỌC THEO THÂN CỌC', 'D. LỰC CẮT DỌC THEO THÂN CỌC',
    'E. ÁP LỰC NGANG DỌC THEO THÂN CỌC', 'Cặp bất lợi nhất', 'Kiểm tra P–M cọc'
  ].forEach((t) => assert.ok(chu.includes(t), 'thiếu: ' + t));
  // phần giải tích của mục B, phần 4 không còn
  assert.ok(!chu.includes('Nén (P_{max})') && !chu.includes('Nén (Pmax)'), 'bảng ngoại lực giải tích phần 4 phải được thay');
  assert.equal(MCT.baoCao.tenFile(L.s, L.tatCa), 'Thuyet_minh_mong_cau_thap_CT1_LLT5020-10_ETABS.docx');
  // đủ 4 bảng tổ hợp, mỗi tổ hợp tuyến tính một dòng
  const soToHop = L.t.toHop.filter((c) => c.loai === 0).length;
  L.t.toHop.filter((c) => c.loai === 0).forEach((c) => assert.ok(chu.includes(c.ten), 'thiếu tổ hợp ' + c.ten));
  assert.equal(soToHop, L.t.thongKe.soToHop);
  assert.equal((xml.match(/<\/w:tbl><w:tbl>/g) || []).length, 0, 'hai bảng liền nhau');
});

test('Thuyết minh ETABS: có ảnh thì chèn ảnh, các ô chờ hình biến mất', async () => {
  const L = soLieuEtabs();
  // PNG 1×1 hợp lệ
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64'));
  const h = { data: png, w: 300, h: 400 };
  const hinh = { etabsMatBang: { data: png, w: 560, h: 420 }, etabsP: h, etabsM: h, etabsV: h, etabsTuongTac: { data: png, w: 480, h: 440 }, sigma: h, spt: h };
  const buf = await globalThis.docx.Packer.toBuffer(MCT.baoCao.taoThuyetMinh(L.s, L.tatCa, hinh));
  const chu = chuCua(docTrongZip(buf, 'word/document.xml'));
  ['Mặt bằng mô hình đài', 'Biểu đồ bao nội lực cọc', 'Biểu đồ bao mômen', 'Biểu đồ bao lực cắt', 'Biểu đồ tương tác (biểu đồ']
    .forEach((t) => assert.ok(!chu.includes(t), 'còn ô chờ: ' + t));
  assert.ok(chu.includes('Hình A.2 Bao lực dọc nén, mômen, lực cắt cọc'));
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
