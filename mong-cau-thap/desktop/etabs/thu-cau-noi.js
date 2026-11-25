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

// Mô hình do app tạo (js/calc/etabs-mo-hinh.js) với số liệu mặc định
globalThis.MCT = {};
const goc = path.join(__dirname, '..', '..', 'js');
['data/cau-thap', 'data/vat-lieu', 'data/bang-tra', 'data/mau-dia-chat', 'data/he-so-tai-ngang', 'mac-dinh', 'calc/dia-chat', 'calc/sct-coc',
  'calc/phan-a-tai-trong', 'calc/phan-b-tai-coc', 'calc/phan-c-xuyen-thung', 'calc/phan-d-thep-dai', 'calc/phan-e-bulong', 'calc/phan-f-ket-luan',
  'calc/tai-ngang', 'calc/tuong-tac', 'calc/lun', 'calc/tinh-tat-ca', 'calc/etabs-mo-hinh', 'calc/etabs-tai-trong', 'calc/etabs-ket-qua'].forEach((f) => require(path.join(goc, f + '.js')));
const trangThai = JSON.parse(JSON.stringify(globalThis.MCT.macDinh));
const ketQuaTinh = globalThis.MCT.calc.tinhTatCa(trangThai);
const moHinh = globalThis.MCT.calc.taoMoHinhEtabs(trangThai, ketQuaTinh);
const taiTrong = globalThis.MCT.calc.taiTrongEtabs(trangThai, ketQuaTinh, moHinh);
const duLieuMoHinh = globalThis.MCT.calc.duLieuGuiEtabs(moHinh, taiTrong);
const fileGhi = path.join(tam, 'mo-hinh-gia-lap.json');
const fileEdb = path.join(tam, 'Mô hình', 'CT1 thử.EDB');

function chay(tinhHuong, yeuCau, moFile) {
  const vao = path.join(tam, 'vao.json');
  const ra = path.join(tam, 'ra.json');
  fs.rmSync(ra, { force: true });
  fs.writeFileSync(vao, JSON.stringify(Object.assign({ lenh: 'kiem-tra', thuNghiem: true, duongDanEtabs: thuMucGiaLap }, yeuCau)), 'utf8');
  const r = spawnSync('dotnet', [path.join(thuMucCauNoi, 'MctEtabs.dll'), '--yeu-cau', vao, '--ket-qua', ra],
    { env: Object.assign({}, process.env, { MCT_GIA_LAP: tinhHuong, MCT_GIA_LAP_GHI: fileGhi, MCT_GIA_LAP_MO: moFile || '' }), encoding: 'utf8' });
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
  ['dựng mô hình (số liệu mặc định)', '', { lenh: 'dung-mo-hinh', duLieu: { moHinh: duLieuMoHinh, fileMoHinh: fileEdb } }, function (k) {
    assert.strictEqual(k.ok, true, k.loi);
    const g = JSON.parse(fs.readFileSync(fileGhi, 'utf8'));
    assert.strictEqual(g.file, fileEdb);
    assert.strictEqual(g.donVi, 'kN_m_C');
    assert.strictEqual(g.caoDoDay, -34.6);
    assert.strictEqual(g.soTang, moHinh.tang.ds.length);
    assert.strictEqual(g.soDiem, moHinh.diem.length);
    assert.strictEqual(g.soThanh, moHinh.thanh.length);
    assert.strictEqual(g.soVo, moHinh.vo.length);
    assert.strictEqual(g.soLoXo, moHinh.loXo.length);
    assert.strictEqual(g.soGoi, 3);
    assert.deepStrictEqual(g.tietDienThanh.sort(), ['COC', 'COC_TRONG_DAI']);
    // tải trọng: dùng lại pattern "Dead" có sẵn (không tạo trùng "DEAD"), 11 pattern tải cẩu có lực tại tâm đài
    assert.deepStrictEqual(g.mau, ['Dead', 'Live', 'FX1', 'FY1', 'FZ1', 'MX1', 'MY1', 'MZ1', 'FX2', 'FY2', 'FZ2', 'MX2', 'MY2']);
    assert.strictEqual(g.banThanDead, 1);
    assert.strictEqual(g.soMauCoLuc, 11);
    assert.ok(Math.abs(g.tongFZ1 + ketQuaTinh.A.quyDoi.lv.N / 1.2) < 1e-6, 'FZ1 = −N/n');
    assert.strictEqual(g.soToHop, taiTrong.toHop.length);
    assert.strictEqual(g.soThanhPhanBAO, taiTrong.toHop.length - 1);
    assert.strictEqual(k.thongTin.fileMoHinh, fileEdb);
    assert.ok(k.buoc.every(function (b) { return b.ok; }));
    assert.ok(fs.existsSync(path.dirname(fileEdb)), 'chưa tạo thư mục lưu');
  }],
  ['dựng mô hình: SetStories_2 chỉ nhận "None"', 'tang-loi', { lenh: 'dung-mo-hinh', duLieu: { moHinh: duLieuMoHinh, fileMoHinh: fileEdb } }, function (k) {
    assert.strictEqual(k.ok, true, k.loi);
    assert.ok(k.buoc.some(function (b) { return b.ten === 'tang' && b.ok; }));
  }],
  ['phân tích mô hình vừa dựng: nội lực cọc, chuyển vị, đài', '', { lenh: 'phan-tich', duLieu: globalThis.MCT.calc.duLieuPhanTich(moHinh, taiTrong) }, function (k) {
    assert.strictEqual(k.ok, true, k.loi);
    const kq = k.ketQua, n = taiTrong.toHop.length - 1;
    assert.strictEqual(kq.toHop.length, n);
    assert.strictEqual(kq.coc.length, 3);
    // mỗi đoạn cọc 2 trạm × mọi tổ hợp
    assert.strictEqual(kq.coc[0].dong.length, moHinh.coc[0].thanh.length * 2 * n);
    assert.strictEqual(kq.chuyenVi.nut.length, 4);
    assert.strictEqual(kq.dai.nut.length, moHinh.xs.length * moHinh.ys.length);
    const r = globalThis.MCT.calc.ketQuaEtabs(kq, moHinh, taiTrong, trangThai, ketQuaTinh);
    assert.strictEqual(r.hopLe, true);
    assert.ok(Math.abs(r.cocKiemTra.Pnen.gt - (1000 + 300 + 10 * (n - 1) + 2)) < 1e-6, 'Pnén đầu cọc ' + r.cocKiemTra.Pnen.gt);
    assert.ok(Math.abs(r.dai.X.Mduong.gt - (10 + n - 1) * moHinh.thongSo.Y) < 1e-6, 'M đài theo X ' + r.dai.X.Mduong.gt);
    assert.ok(k.buoc.some(function (b) { return b.ten === 'phan-tich' && b.ok; }));
  }, fileEdb],
  ['phân tích khi ETABS đang mở mô hình khác', '', { lenh: 'phan-tich', duLieu: globalThis.MCT.calc.duLieuPhanTich(moHinh, taiTrong) }, function (k) {
    assert.strictEqual(k.ok, false);
    assert.strictEqual(k.buocLoi, 'kiem-tra-mo-hinh');
  }],
  ['dựng mô hình: thiếu dữ liệu', '', { lenh: 'dung-mo-hinh' }, function (k) {
    assert.strictEqual(k.ok, false);
    assert.strictEqual(k.buocLoi, 'doc-yeu-cau');
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
for (const [ten, tinhHuong, yeuCau, kiemTra, moFile] of ca) {
  try { kiemTra(chay(tinhHuong, yeuCau, moFile)); console.log('✔ ' + ten); }
  catch (e) { loi++; console.log('✘ ' + ten + ': ' + e.message); }
}
fs.rmSync(tam, { recursive: true, force: true });
console.log(loi ? loi + ' tình huống lỗi' : 'Tất cả tình huống đạt');
process.exit(loi ? 1 : 0);
