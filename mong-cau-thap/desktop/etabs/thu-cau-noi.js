// Thử cầu nối MctEtabs với ETABSv1.dll GIẢ LẬP (không cần ETABS): npm run thu-cau-noi (cần .NET SDK 8)
// Mỗi tình huống chạy đúng như chương trình gọi (file JSON vào/ra) và kiểm tra kết quả.
'use strict';
const { execFileSync, spawnSync } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'thu-cau-noi-'));
const thuMucGiaLap = path.join(tam, 'ETABS 23 giả lập');
const thuMucCauNoi = path.join(tam, 'cau-noi');
execFileSync('dotnet', ['build', path.join(__dirname, 'gia-lap', 'ETABSv1.csproj'), '-c', 'Release', '-o', thuMucGiaLap, '--nologo', '-v', 'q'], { stdio: 'inherit' });
execFileSync('dotnet', ['build', path.join(__dirname, 'MctEtabs', 'MctEtabs.csproj'), '-c', 'Release', '-o', thuMucCauNoi, '--nologo', '-v', 'q'], { stdio: 'inherit' });

function chay(tinhHuong, yeuCau) {
  const vao = path.join(tam, 'vao.json');
  const ra = path.join(tam, 'ra.json');
  fs.rmSync(ra, { force: true });
  fs.writeFileSync(vao, JSON.stringify(Object.assign({ lenh: 'kiem-tra', thuNghiem: true, duongDanEtabs: thuMucGiaLap }, yeuCau)), 'utf8');
  const r = spawnSync('dotnet', [path.join(thuMucCauNoi, 'MctEtabs.dll'), '--yeu-cau', vao, '--ket-qua', ra],
    { env: Object.assign({}, process.env, { MCT_GIA_LAP: tinhHuong }), encoding: 'utf8' });
  assert.ok(fs.existsSync(ra), 'không có file kết quả: ' + r.stderr);
  return JSON.parse(fs.readFileSync(ra, 'utf8'));
}

const ca = [
  ['bình thường', '', {}, function (k) {
    assert.strictEqual(k.ok, true);
    assert.match(k.thongTin.cachKetNoi, /^Helper\.GetObject /);
    assert.strictEqual(k.thongTin.fileMoHinh, 'D:\\Dự án\\Móng cẩu tháp CT1.EDB');
    assert.strictEqual(k.thongTin.donVi, 'kN_m_C');
    assert.strictEqual(k.thongTin.etabsPhienBan, '23.0.0 (23)');
    assert.strictEqual(k.thongTin.apiPhienBan, 2.14);
    assert.deepStrictEqual(k.thongTin.loadPatterns, ['Dead', 'Live', 'Tĩnh tải phụ']);
    assert.strictEqual(k.thongTin.soThanh, 99);
    assert.strictEqual(k.thongTin.moHinhKhoa, false);
  }],
  ['lớp bọc rỗng → GetObjectProcess', 'boc-rong', { pidGiaLap: [4321] }, function (k) {
    assert.strictEqual(k.ok, true);
    assert.match(k.thongTin.cachKetNoi, /^Helper\.GetObjectProcess\(4321\)/);
    assert.ok(k.thongTin['lopBoc Helper.GetObject'].some(function (x) { return /= null$/.test(x); }));
    assert.ok(k.thuHam.some(function (h) { return h.ten === 'Helper.GetObject > GetOAPIVersionNumber' && !h.ok && h.hresult === '0x80004003'; }));
  }],
  ['lớp bọc rỗng mọi cách', 'boc-rong-het', { pidGiaLap: [4321] }, function (k) {
    assert.strictEqual(k.ok, false);
    assert.strictEqual(k.buocLoi, 'ket-noi');
    assert.strictEqual(k.goiY, 'ket-noi');
  }],
  ['chưa mở mô hình', 'chua-mo', {}, function (k) {
    assert.strictEqual(k.ok, false);
    assert.strictEqual(k.buocLoi, 'doc-mo-hinh');
    assert.strictEqual(k.goiY, 'mo-mo-hinh');
    assert.strictEqual(k.thongTin.apiPhienBan, 2.14);
  }],
  ['thiếu đăng ký giao diện (E_NOINTERFACE)', 'thieu-giao-dien', {}, function (k) {
    assert.strictEqual(k.ok, false);
    assert.strictEqual(k.buocLoi, 'doc-mo-hinh');
    assert.strictEqual(k.goiY, 'dang-ky-giao-dien');
    assert.ok(k.thuHam.some(function (h) { return h.hresult === '0x80004002'; }));
    assert.ok(k.buoc.some(function (b) { return b.ten === 'ket-noi' && b.ok && /chua lay duoc mo hinh/.test(b.chiTiet); }));
  }],
  ['lệnh đăng ký khi không phải Windows', '', { lenh: 'dang-ky-giao-dien' }, function (k) {
    assert.strictEqual(k.ok, false);
    assert.strictEqual(k.buocLoi, 'he-dieu-hanh');
  }],
  ['sai thư mục ETABS', '', { duongDanEtabs: path.join(tam, 'không có') }, function (k) {
    // không có thư mục → tìm tiếp trong Program Files; trên máy build không có ETABS nên báo không thấy DLL
    if (process.platform !== 'win32') { assert.strictEqual(k.ok, false); assert.strictEqual(k.buocLoi, 'tim-dll'); }
  }],
  ['lệnh chưa hỗ trợ', '', { lenh: 'lenh-la' }, function (k) {
    assert.strictEqual(k.ok, false);
    assert.strictEqual(k.buocLoi, 'doc-yeu-cau');
  }]
];

let loi = 0;
for (const [ten, tinhHuong, yeuCau, kiemTra] of ca) {
  try { kiemTra(chay(tinhHuong, yeuCau)); console.log('✔ ' + ten); }
  catch (e) { loi++; console.log('✘ ' + ten + ': ' + e.message); }
}
fs.rmSync(tam, { recursive: true, force: true });
console.log(loi ? loi + ' tình huống lỗi' : 'Tất cả tình huống đạt');
process.exit(loi ? 1 : 0);
