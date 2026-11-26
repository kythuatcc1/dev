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
require(path.join(goc, 'data/cau-thap-new-data.js'));
const trangThai = JSON.parse(JSON.stringify(globalThis.MCT.macDinh));
const ketQuaTinh = globalThis.MCT.calc.tinhTatCa(trangThai);
const moHinh = globalThis.MCT.calc.taoMoHinhEtabs(trangThai, ketQuaTinh);
const taiTrong = globalThis.MCT.calc.taiTrongEtabs(trangThai, ketQuaTinh, moHinh);
const duLieuMoHinh = globalThis.MCT.calc.duLieuGuiEtabs(moHinh, taiTrong);
// Mô hình có dầm giằng các cặp cọc tại cao độ −8 m
const trangThaiDam = JSON.parse(JSON.stringify(trangThai));
trangThaiDam.damGiang.ds = [[1, 2], [2, 3], [3, 1]].map((c) => Object.assign({}, trangThaiDam.damGiang.mau, { tuCoc: c[0], denCoc: c[1] }));
const moHinhDam = globalThis.MCT.calc.taoMoHinhEtabs(trangThaiDam, ketQuaTinh);
const taiTrongDam = globalThis.MCT.calc.taiTrongEtabs(trangThaiDam, ketQuaTinh, moHinhDam);
// Cập nhật: đổi cẩu (tải khác, không có mômen xoắn) – hình học giữ nguyên; đổi lưới đài – hình học khác
function duLieuTheo(doi) {
  const st = JSON.parse(JSON.stringify(trangThai));
  doi(st);
  const kqx = globalThis.MCT.calc.tinhTatCa(st), mx = globalThis.MCT.calc.taoMoHinhEtabs(st, kqx), tx = globalThis.MCT.calc.taiTrongEtabs(st, kqx, mx);
  return { kq: kqx, m: mx, t: tx, gui: globalThis.MCT.calc.duLieuGuiEtabs(mx, tx) };
}
const capNhatCau = duLieuTheo((st) => { st.cau.ten = 'ZT6016-10 thân 1.6m'; st.cau.chieuCao = 45.6; });
const capNhatLuoi = duLieuTheo((st) => { st.etabs.luoi = 0.5; });
// Cập nhật hình học trong file đang có (không dựng mô hình mới)
const capNhatH = duLieuTheo((st) => { st.dai.H = 2.0; });
const capNhatCoc = duLieuTheo((st) => { st.dai.H = 2.0; st.sct.L = 36; });
const capNhat4Chan = duLieuTheo((st) => { st.dai.H = 2.0; st.sct.L = 36; st.etabs.diemDatLuc = 'chan'; st.etabs.tamCauX = 0.3; st.etabs.tamCauY = 0.2; });
const capNhatVeTam = duLieuTheo((st) => { st.dai.H = 2.0; st.sct.L = 36; });
const capNhatDam = duLieuTheo((st) => {
  st.dai.H = 2.0; st.sct.L = 36;
  st.damGiang.ds = [[1, 2], [2, 3], [3, 1]].map((c) => Object.assign({}, st.damGiang.mau, { tuCoc: c[0], denCoc: c[1] }));
});

// Đọc file .EDB giả lập (văn bản) và so với mô hình app: điểm, thanh, ô vỏ, gối, lò xo, tầng, điểm đặt lực FZ1
function docEdb(file) {
  const r = { P: new Map(), F: new Map(), A: new Map(), R: new Set(), S: new Set(), Q: [], T: [], day: NaN };
  for (const dong of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const x = dong.split('|');
    if (x[0] === 'P') r.P.set(x[1], x.slice(2, 5).map(Number));
    else if (x[0] === 'F') r.F.set(x[1], x.slice(2));
    else if (x[0] === 'A') r.A.set(x[1], x[2].split(','));
    else if (x[0] === 'R' && x[2].includes('1')) r.R.add(x[1]);
    else if (x[0] === 'S') r.S.add(x[1]);
    else if (x[0] === 'Q') r.Q.push({ mau: x[1], diem: x[2], gt: x[3].split(',').map(Number) });
    else if (x[0] === 'T') r.T = x[1] ? x[1].split(',').map(Number) : [];
    else if (x[0] === 'DAY') r.day = Number(x[1]);
  }
  return r;
}
function khopMoHinh(file, x) {
  const f = docEdb(file), m = x.m;
  assert.strictEqual(m.hopLe, true, (m.loi || []).join('; '));
  const sx = (a) => [...a].sort();
  assert.deepStrictEqual(sx(f.P.keys()), sx(m.diem.map((d) => d.ten)), 'tập điểm');
  m.diem.forEach((d) => { const c = f.P.get(d.ten); assert.ok([d.x, d.y, d.z].every((v, i) => Math.abs(c[i] - v) < 1e-6), 'toạ độ ' + d.ten + ': ' + c); });
  assert.deepStrictEqual(sx(f.F.keys()), sx(m.thanh.map((t) => t.ten)), 'tập thanh');
  m.thanh.forEach((t) => {   // ETABS đặt đầu I ở nút dưới của thanh đứng: so hai đầu không phân biệt thứ tự
    const r = f.F.get(t.ten);
    assert.deepStrictEqual([r.slice(0, 2).sort(), r[2]], [[t.dau, t.cuoi].sort(), t.tietDien], 'thanh ' + t.ten);
  });
  assert.deepStrictEqual(sx(f.A.keys()), sx(m.vo.map((v) => v.ten)), 'tập ô vỏ');
  m.vo.forEach((v) => assert.deepStrictEqual(f.A.get(v.ten), v.diem, 'ô vỏ ' + v.ten));
  assert.deepStrictEqual(sx(f.R), sx(m.gioiHan.map((g) => g.diem)), 'gối chỉ ở mũi cọc');
  assert.deepStrictEqual(sx(f.S), sx(new Set(m.loXo.map((l) => l.diem))), 'lò xo đúng nút');
  let z = m.tang.caoDoDay;
  assert.ok(Math.abs(f.day - z) < 1e-6, 'cao độ đáy tầng');
  assert.strictEqual(f.T.length, m.tang.ds.length, 'số tầng');
  m.tang.ds.forEach((t, i) => { z += t.cao; assert.ok(Math.abs(f.T[i] - z) < 1e-6, 'tầng ' + t.ten); });
  const fz = x.t.mauTai.find((p) => p.ten === 'FZ1');
  assert.deepStrictEqual(sx(f.Q.filter((q) => q.mau === 'FZ1').map((q) => q.diem)), sx(fz.diemLuc.map((l) => l.diem)), 'điểm đặt FZ1');
  const tong = f.Q.filter((q) => q.mau === 'FZ1').reduce((a, q) => a + q.gt[2], 0);
  assert.ok(Math.abs(tong - fz.luc.giaTri[2]) < 1e-6, 'tổng FZ1 ' + tong);
  return f;
}
function capNhatKhongTaoMoi(k) {
  assert.strictEqual(k.ok, true, k.loi);
  const g = JSON.parse(fs.readFileSync(fileGhi, 'utf8'));
  assert.strictEqual(g.khoiTaoMoi, false, 'không InitializeNewModel');
  assert.strictEqual(g.file, fileEdb, 'lưu đè file đang có');
  return g;
}
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
    // lò xo: thuộc tính lò xo điểm có tên, gán cho điểm; không gán theo hệ tổng thể (giao diện ETABS không có, làm văng ETABS)
    assert.strictEqual(g.soThuocTinhLoXo, moHinh.thuocTinhLoXo.length);
    assert.strictEqual(g.soLoXoTheoThuocTinh, moHinh.loXo.length);
    assert.strictEqual(g.soLoXoTongThe, 0);
    assert.match(k.thongTin.cachGanLoXo, /PropPointSpring/);
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
  ['dựng mô hình: ETABS không có PropPointSpring → SetSpring theo trục cục bộ', 'lo-xo-cu', { lenh: 'dung-mo-hinh', duLieu: { moHinh: duLieuMoHinh, fileMoHinh: fileEdb } }, function (k) {
    assert.strictEqual(k.ok, true, k.loi);
    const g = JSON.parse(fs.readFileSync(fileGhi, 'utf8'));
    assert.strictEqual(g.soLoXo, moHinh.loXo.length);
    assert.strictEqual(g.soThuocTinhLoXo, 0);
    assert.strictEqual(g.soLoXoTongThe, 0);
    assert.match(k.thongTin.cachGanLoXo, /SetSpring theo truc cuc bo.*PropPointSpring khong co/);
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
    // ETABS (và bản giả lập) đặt đầu I của đoạn cọc ở nút dưới: đầu cọc ở trạm cuối sta = L = 1 m → |P| thêm 0,5·L.
    // App tính cao độ trạm từ toạ độ hai đầu nên vẫn lấy đúng giá trị tại đầu cọc.
    const L1 = Math.abs(moHinh.capDo[1] - moHinh.capDo[2]);
    assert.ok(Math.abs(r.cocKiemTra.Pnen.gt - (1000 + 300 + 10 * (n - 1) + 2 + 0.5 * L1)) < 1e-6, 'Pnén đầu cọc ' + r.cocKiemTra.Pnen.gt);
    assert.ok(Math.abs(r.dai.X.Mduong.gt - (10 + n - 1) * moHinh.thongSo.Y) < 1e-6, 'M đài theo X ' + r.dai.X.Mduong.gt);
    assert.ok(k.buoc.some(function (b) { return b.ten === 'phan-tich' && b.ok; }));
  }, fileEdb],
  ['dựng mô hình có dầm giằng', '', { lenh: 'dung-mo-hinh', duLieu: { moHinh: globalThis.MCT.calc.duLieuGuiEtabs(moHinhDam, taiTrongDam), fileMoHinh: fileEdb + '.dam.EDB' } }, function (k) {
    assert.strictEqual(moHinhDam.hopLe, true, (moHinhDam.loi || []).join('; '));
    assert.strictEqual(k.ok, true, k.loi);
    const g = JSON.parse(fs.readFileSync(fileGhi, 'utf8'));
    assert.strictEqual(g.soThanh, moHinhDam.thanh.length);
    assert.strictEqual(moHinhDam.thanh.length, moHinh.thanh.length + 3 + 3, '3 dầm + mỗi cọc thêm 1 đoạn (nút −8 m)');
    assert.ok(g.tietDienThanh.includes('DAM_DG1'));
  }],
  ['phân tích mô hình có dầm giằng: nội lực dầm', '', { lenh: 'phan-tich', duLieu: globalThis.MCT.calc.duLieuPhanTich(moHinhDam, taiTrongDam) }, function (k) {
    assert.strictEqual(k.ok, true, k.loi);
    const n = taiTrongDam.toHop.length - 1;
    assert.strictEqual(k.ketQua.dam.length, 3);
    assert.strictEqual(k.ketQua.dam[0].dong.length, 2 * n, '2 trạm × mọi tổ hợp');
    const L = moHinhDam.dam[0].L, cuoi = k.ketQua.dam[0].dong.find((r) => r[0] > 0);
    assert.ok(Math.abs(cuoi[0] - L) < 1e-3, 'vị trí cuối dầm = chiều dài dầm ' + cuoi[0] + ' / ' + L);
    assert.ok(k.buoc.some(function (b) { return b.ten === 'noi-luc-dam' && b.ok; }));
  }, fileEdb + '.dam.EDB'],
  ['cập nhật mô hình: đổi cẩu – sửa tải, tổ hợp trong file đang có, xoá MZ1', '', { lenh: 'cap-nhat-mo-hinh', duLieu: { moHinh: capNhatCau.gui, fileMoHinh: fileEdb } }, function (k) {
    assert.strictEqual(capNhatCau.m.hopLe, true);
    assert.strictEqual(k.ok, true, k.loi);
    assert.ok(k.buoc.some((b) => b.ten === 'kiem-tra-hinh-hoc' && b.ok), 'hình học trùng');
    assert.ok(k.buoc.some((b) => b.ten === 'mo-file' && /Dang mo/.test(b.chiTiet)), 'dùng file đang mở');
    const db = k.thongTin.dongBo;   // hình học không đổi: giữ nguyên mọi thanh (kể cả cọc ETABS đã đảo đầu), không xoá / thêm gì
    assert.deepStrictEqual([db.xoaThanh, db.themThanh, db.xoaVo, db.themVo, db.xoaDiem, db.themDiem, db.doiDiem], [0, 0, 0, 0, 0, 0, 0], JSON.stringify(db));
    assert.strictEqual(db.giuThanh, capNhatCau.m.thanh.length);
    assert.deepStrictEqual(k.thongTin.loadPatternDaXoa, ['MZ1']);
    const g = JSON.parse(fs.readFileSync(fileGhi, 'utf8'));
    assert.strictEqual(g.file, fileEdb);
    assert.ok(!g.mau.includes('MZ1'));
    assert.strictEqual(g.soToHop, capNhatCau.t.toHop.length);
    assert.strictEqual(g.soThanhPhanBAO, capNhatCau.t.toHop.length - 1);
    assert.ok(Math.abs(g.tongFZ1 + capNhatCau.kq.A.quyDoi.lv.N / 1.2) < 1e-6, 'FZ1 theo cẩu mới');
    assert.strictEqual(g.soThuocTinhLoXo, capNhatCau.m.thuocTinhLoXo.length);
    assert.strictEqual(g.soLoXoTongThe, 0);
  }, fileEdb],
  ['cập nhật mô hình: ETABS báo file làm việc .$et (có thay đổi chưa lưu) – vẫn là file đã dựng, không mở lại', 'ten-et', { lenh: 'cap-nhat-mo-hinh', duLieu: { moHinh: duLieuMoHinh, fileMoHinh: fileEdb } }, function (k) {
    capNhatKhongTaoMoi(k);
    assert.ok(k.buoc.some((b) => b.ten === 'mo-file' && /^Dang mo /.test(b.chiTiet)), 'không OpenFile lại');
    assert.strictEqual(k.thongTin.dongBo.xoaThanh, 0);
    khopMoHinh(fileEdb, { m: moHinh, t: taiTrong });
  }, fileEdb],
  ['cập nhật mô hình: lưới đài 0,5 m – xoá / dời / thêm điểm, thanh, ô vỏ trong file đang có', '', { lenh: 'cap-nhat-mo-hinh', duLieu: { moHinh: capNhatLuoi.gui, fileMoHinh: fileEdb } }, function (k) {
    const g = capNhatKhongTaoMoi(k);
    const db = k.thongTin.dongBo;
    assert.strictEqual(db.veLai, false, 'đồng bộ từng đối tượng');
    assert.ok(db.xoaVo > 0 && db.xoaDiem > 0 && db.doiDiem > 0, JSON.stringify(db));
    assert.ok(k.buoc.some((b) => b.ten === 'tang' && /Giu nguyen/.test(b.chiTiet)));
    assert.ok(g.thaoTac.doi > 0);
    khopMoHinh(fileEdb, capNhatLuoi);
  }, fileEdb],
  ['cập nhật mô hình: chiều cao đài 1,6 → 2,0 m – ETABS không đổi tầng khi còn đối tượng → vẽ lại trong file đang có', '', { lenh: 'cap-nhat-mo-hinh', duLieu: { moHinh: capNhatH.gui, fileMoHinh: fileEdb } }, function (k) {
    capNhatKhongTaoMoi(k);
    assert.strictEqual(k.thongTin.dongBo.veLai, true);
    assert.ok(k.buoc.some((b) => b.ten === 'tang' && /Xoa doi tuong cua app, dat lai/.test(b.chiTiet)));
    const f = khopMoHinh(fileEdb, capNhatH);
    assert.ok(Math.abs(f.P.get(capNhatH.m.nutTai)[2] - (-2.6 + 1.0)) < 1e-9, 'tấm đài ở giữa đài mới (−1,6 m)');
  }, fileEdb],
  ['cập nhật mô hình: cọc dài thêm 3 m – ETABS đổi được tầng khi có đối tượng → chỉ thêm nút / thanh, chuyển gối mũi cọc', 'tang-mo', { lenh: 'cap-nhat-mo-hinh', duLieu: { moHinh: capNhatCoc.gui, fileMoHinh: fileEdb } }, function (k) {
    const g = capNhatKhongTaoMoi(k);
    const db = k.thongTin.dongBo;
    assert.strictEqual(db.veLai, false);
    assert.ok(db.themDiem >= 3 * 3 && db.themThanh >= 3 * 3 && db.xoaThanh === 0 && db.xoaVo === 0, JSON.stringify(db));
    assert.ok(k.buoc.some((b) => b.ten === 'tang' && /Dat lai/.test(b.chiTiet)));
    assert.strictEqual(g.thaoTac.xoaThanh, 0);
    khopMoHinh(fileEdb, capNhatCoc);
  }, fileEdb],
  ['cập nhật mô hình: chia lực về 4 chân, tâm cẩu lệch (0,3; 0,2) – dời các nút lưới đài', '', { lenh: 'cap-nhat-mo-hinh', duLieu: { moHinh: capNhat4Chan.gui, fileMoHinh: fileEdb } }, function (k) {
    capNhatKhongTaoMoi(k);
    const db = k.thongTin.dongBo;
    assert.strictEqual(db.veLai, false);
    assert.ok(db.doiDiem > 0, JSON.stringify(db));
    assert.deepStrictEqual(k.thongTin.diemDatLuc, capNhat4Chan.m.chan.map((c) => c.nut).sort());
    const f = khopMoHinh(fileEdb, capNhat4Chan);
    // hợp lực MX1 quanh tâm cẩu = MX1 của app
    const mx = capNhat4Chan.t.mauTai.find((p) => p.ten === 'MX1');
    const M = f.Q.filter((q) => q.mau === 'MX1').reduce((a, q) => a + (f.P.get(q.diem)[1] - 0.2) * q.gt[2], 0);
    assert.ok(Math.abs(M - mx.luc.giaTri[3]) < 1e-3, 'MX1 ' + M + ' / ' + mx.luc.giaTri[3]);
  }, fileEdb],
  ['cập nhật mô hình: bản ETABS không dời được điểm → xoá và vẽ lại đối tượng của app trong file đang có', 'khong-di-chuyen', { lenh: 'cap-nhat-mo-hinh', duLieu: { moHinh: capNhatVeTam.gui, fileMoHinh: fileEdb } }, function (k) {
    capNhatKhongTaoMoi(k);
    assert.strictEqual(k.thongTin.dongBo.veLai, true);
    assert.match(k.thongTin.dongBo.lyDoVeLai, /khong doi duoc toa do diem/);
    khopMoHinh(fileEdb, capNhatVeTam);
  }, fileEdb],
  ['cập nhật mô hình: thêm 3 dầm giằng bằng cập nhật (không dựng mới)', '', { lenh: 'cap-nhat-mo-hinh', duLieu: { moHinh: capNhatDam.gui, fileMoHinh: fileEdb } }, function (k) {
    const g = capNhatKhongTaoMoi(k);
    assert.ok(g.tietDienThanh.includes('DAM_DG1'));
    const f = khopMoHinh(fileEdb, capNhatDam);
    assert.deepStrictEqual(f.F.get('DG2').slice(0, 2), ['C2_m8', 'C3_m8']);
  }, fileEdb],
  ['cập nhật mô hình: ETABS đang mở mô hình khác → tự mở đúng file', '', { lenh: 'cap-nhat-mo-hinh', duLieu: { moHinh: duLieuMoHinh, fileMoHinh: fileEdb } }, function (k) {
    assert.strictEqual(k.ok, true, k.loi);
    assert.ok(k.buoc.some((b) => b.ten === 'mo-file' && /Da mo/.test(b.chiTiet)));
    const g = JSON.parse(fs.readFileSync(fileGhi, 'utf8'));
    assert.ok(g.mau.includes('MZ1'), 'thêm lại MZ1 khi cẩu có mômen xoắn');
  }],
  ['cập nhật mô hình: không còn file đã dựng', '', { lenh: 'cap-nhat-mo-hinh', duLieu: { moHinh: duLieuMoHinh, fileMoHinh: path.join(tam, 'khong-co.EDB') } }, function (k) {
    assert.strictEqual(k.ok, false);
    assert.strictEqual(k.goiY, 'dung-lai');
  }],
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
