// Vỏ chương trình Windows (Electron): mở app index.html trong một cửa sổ riêng, chạy hoàn toàn offline.
// Số liệu vẫn tự lưu như khi mở bằng trình duyệt (lưu trong %APPDATA%\MongCauThap).
'use strict';
const { app, BrowserWindow, Menu, shell, ipcMain, desktopCapturer, screen, nativeImage, clipboard, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

let cuaSo = null;

function moNgoai(url) {
  if (/^https?:/i.test(url)) shell.openExternal(url);
}

function taoMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Tệp', submenu: [
      { role: 'reload', label: 'Tải lại' },
      { type: 'separator' },
      { role: 'quit', label: 'Thoát' }
    ] },
    { label: 'Sửa', submenu: [
      { role: 'undo', label: 'Hoàn tác' },
      { role: 'redo', label: 'Làm lại' },
      { type: 'separator' },
      { role: 'cut', label: 'Cắt' },
      { role: 'copy', label: 'Sao chép' },
      { role: 'paste', label: 'Dán' },
      { role: 'selectAll', label: 'Chọn tất cả' }
    ] },
    { label: 'Xem', submenu: [
      { role: 'zoomIn', label: 'Phóng to' },
      { role: 'zoomOut', label: 'Thu nhỏ' },
      { role: 'resetZoom', label: 'Cỡ mặc định' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Toàn màn hình' },
      { role: 'toggleDevTools', label: 'Công cụ kiểm tra (DevTools)' }
    ] }
  ]));
}

// ---------- Kết nối ETABS (chỉ Windows) ----------
// Mỗi lệnh chạy cầu nối MctEtabs (C#, .NET 8 – ETABS 22+ đã cài sẵn .NET 8 Desktop Runtime),
// trao đổi qua file JSON tạm (UTF-8). Thư viện API của ETABS 22+ không chạy được trong .NET Framework/PowerShell 5.1.
function thuMucCauNoi() {
  if (process.env.MCT_CAU_NOI_ETABS) return process.env.MCT_CAU_NOI_ETABS;   // chỉ dùng khi thử nghiệm
  return app.isPackaged ? path.join(process.resourcesPath, 'cau-noi-etabs') : path.join(__dirname, '..', '..', 'etabs', 'cau-noi-etabs');
}

function timDotnet() {
  const win = process.platform === 'win32';
  const ung = [];
  if (process.env.DOTNET_ROOT) ung.push(path.join(process.env.DOTNET_ROOT, win ? 'dotnet.exe' : 'dotnet'));
  if (win) {
    for (const goc of [process.env.ProgramW6432, process.env.ProgramFiles, 'C:\\Program Files']) {
      if (goc) ung.push(path.join(goc, 'dotnet', 'dotnet.exe'));
    }
  }
  return ung.find(function (f) { return fs.existsSync(f); }) || (win ? 'dotnet.exe' : 'dotnet');
}

function chayCauNoi(dotnet, thamSo, thuMuc, thoiGian) {
  return new Promise(function (traVe) {
    execFile(dotnet, thamSo, {
      cwd: thuMuc, windowsHide: true, timeout: thoiGian, maxBuffer: 16 * 1024 * 1024,
      env: Object.assign({}, process.env, { DOTNET_NOLOGO: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1' })
    }, function (loi, stdout, stderr) {
      traVe({ loi: loi, stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

async function goiEtabs(yeuCau) {
  // MCT_ETABS_GIA_LAP: thư mục ETABSv1.dll giả lập – chỉ để thử chương trình trên máy không có ETABS
  const giaLap = process.env.MCT_ETABS_GIA_LAP;
  if (process.platform !== 'win32' && !giaLap) {
    return { ok: false, buocLoi: 'he-dieu-hanh', loi: 'Kết nối ETABS chỉ chạy trên Windows.', buoc: [] };
  }
  const thuMuc = thuMucCauNoi();
  const dll = path.join(thuMuc, 'MctEtabs.dll');
  if (!fs.existsSync(dll)) return { ok: false, buocLoi: 'cau-noi', loi: 'Không tìm thấy cầu nối ' + dll, buoc: [] };
  const duLieu = Object.assign({}, yeuCau || {});
  if (giaLap) { duLieu.thuNghiem = true; duLieu.duongDanEtabs = giaLap; }
  const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'mct-etabs-'));
  const vao = path.join(tam, 'yeu-cau.json');
  const ra = path.join(tam, 'ket-qua.json');
  const dotnet = timDotnet();
  const thoiGian = (yeuCau && yeuCau.thoiGianToiDa) || 10 * 60 * 1000;
  try {
    fs.writeFileSync(vao, JSON.stringify(duLieu), 'utf8');
    let r = await chayCauNoi(dotnet, [dll, '--yeu-cau', vao, '--ket-qua', ra], thuMuc, thoiGian);
    let duPhong = false;
    // Máy thiếu .NET Desktop Runtime: chạy lại bằng cấu hình chỉ cần .NET cơ bản
    if (!fs.existsSync(ra) && /Microsoft\.WindowsDesktop\.App/.test(r.stdout + r.stderr)) {
      duPhong = true;
      r = await chayCauNoi(dotnet, ['exec', '--runtimeconfig', path.join(thuMuc, 'MctEtabs.coban.runtimeconfig.json'),
        dll, '--yeu-cau', vao, '--ket-qua', ra], thuMuc, thoiGian);
    }
    if (fs.existsSync(ra)) {
      const kq = JSON.parse(fs.readFileSync(ra, 'utf8').replace(/^\uFEFF/, ''));
      if (duPhong) kq.ghiChuChay = 'Chạy bằng .NET cơ bản (máy chưa có .NET Desktop Runtime)';
      return kq;
    }
    if (r.loi && r.loi.killed) {
      return {
        ok: false, buocLoi: 'cau-noi', goiY: 'het-gio', buoc: [],
        loi: 'ETABS không phản hồi sau ' + Math.round(thoiGian / 1000) + ' giây.',
        stdout: r.stdout.slice(0, 4000), stderr: r.stderr.slice(0, 4000)
      };
    }
    const thieuNet = (r.loi && r.loi.code === 'ENOENT') || /install or update \.NET|framework/i.test(r.stdout + r.stderr);
    return {
      ok: false, buocLoi: thieuNet ? 'net8' : 'cau-noi', goiY: thieuNet ? 'net8' : null, buoc: [],
      loi: thieuNet ? 'Không chạy được .NET 8 trên máy này.'
        : 'Cầu nối không trả kết quả' + (r.loi ? ': ' + r.loi.message : '.'),
      dotnet: dotnet, stdout: r.stdout.slice(0, 4000), stderr: r.stderr.slice(0, 4000)
    };
  } catch (e) {
    return { ok: false, buocLoi: 'cau-noi', loi: e.message, buoc: [] };
  } finally {
    fs.rmSync(tam, { recursive: true, force: true });
  }
}

// ---- Chụp ảnh từ ETABS cho thuyết minh (API ETABS không có lệnh chụp màn hình) ----
//   cach 'cua-so'  : chụp cửa sổ ETABS (desktopCapturer, kể cả khi bị cửa sổ khác che; không chụp được khi đang thu nhỏ)
//   cach 'man-hinh': thu nhỏ app, đợi rồi chụp cả màn hình chính (dự phòng khi ảnh cửa sổ bị đen / trống)
// MCT_CHUP_GIA_LAP=<file .png>: trả ảnh đó (thử tự động, không cần ETABS)
function doi(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
async function chupEtabs(yc) {
  try {
    const cach = yc && yc.cach === 'man-hinh' ? 'man-hinh' : 'cua-so';
    if (process.env.MCT_CHUP_GIA_LAP) {
      const b = fs.readFileSync(process.env.MCT_CHUP_GIA_LAP), kt = nativeImage.createFromBuffer(b).getSize();
      return { ok: true, ten: 'ETABS (giả lập)', cach: cach, png: b, w: kt.width, h: kt.height };
    }
    const man = screen.getPrimaryDisplay();
    const kichThuoc = { width: Math.round(man.size.width * man.scaleFactor), height: Math.round(man.size.height * man.scaleFactor) };
    if (cach === 'man-hinh') {
      if (cuaSo) cuaSo.minimize();
      await doi(Math.max(500, Math.min(10000, Number(yc && yc.doiMs) || 2500)));
      try {
        const ds = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: kichThuoc });
        const chon = ds.find(function (x) { return String(x.display_id) === String(man.id); }) || ds[0];
        if (!chon || chon.thumbnail.isEmpty()) return { ok: false, loi: 'Không chụp được màn hình.' };
        const kt = chon.thumbnail.getSize();
        return { ok: true, ten: 'Màn hình chính', cach: cach, png: chon.thumbnail.toPNG(), w: kt.width, h: kt.height };
      } finally {
        if (cuaSo) { cuaSo.restore(); cuaSo.focus(); }
      }
    }
    const ds = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: kichThuoc, fetchWindowIcons: false });
    const cuaApp = cuaSo ? cuaSo.getMediaSourceId() : '';
    const etabs = ds.filter(function (x) { return /ETABS/i.test(x.name) && x.id !== cuaApp; });
    if (!etabs.length) {
      return { ok: false, loi: 'Không thấy cửa sổ ETABS đang mở. Mở ETABS (không thu nhỏ) rồi chụp lại. Các cửa sổ đang có: ' +
        ds.map(function (x) { return x.name; }).filter(Boolean).slice(0, 8).join('; ') };
    }
    // cửa sổ ETABS lớn nhất có ảnh (bỏ hộp thoại nhỏ, cửa sổ thu nhỏ)
    const chon = etabs.map(function (x) { const kt = x.thumbnail.getSize(); return { x: x, dt: x.thumbnail.isEmpty() ? 0 : kt.width * kt.height }; })
      .sort(function (a, b) { return b.dt - a.dt; })[0];
    if (!chon.dt) return { ok: false, loi: 'Cửa sổ ETABS đang thu nhỏ – mở to cửa sổ ETABS rồi chụp lại (hoặc dùng "Chụp màn hình").' };
    const kt = chon.x.thumbnail.getSize();
    return { ok: true, ten: chon.x.name, cach: cach, png: chon.x.thumbnail.toPNG(), w: kt.width, h: kt.height };
  } catch (e) {
    return { ok: false, loi: e.message };
  }
}

// ---- Tự chụp hình ETABS (lệnh "tu-chup" của cầu nối: UI Automation bấm menu / hộp thoại ETABS rồi chụp khung nhìn mô hình) ----
// yc = { khoa, thaoTac: [...], chuanBi, thamDo, file } → { ok, png, w, h, kq: kết quả cầu nối (nhật ký) }
async function tuChupEtabs(yc) {
  const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'mct-chup-'));
  try {
    const ten = String((yc && yc.khoa) || 'etabs').replace(/[^\w.-]/g, '_');
    const kq = await goiEtabs({
      lenh: 'tu-chup', thoiGianToiDa: 3 * 60 * 1000,
      duLieu: { thaoTac: (yc && yc.thaoTac) || [], chuanBi: !!(yc && yc.chuanBi), thamDo: !!(yc && yc.thamDo), file: (yc && yc.file) || '',
        chup: yc && yc.chup === false ? false : true, thuMucAnh: tam, tenAnh: ten }
    });
    const anh = kq && kq.thongTin && kq.thongTin.anh;
    let png = null;
    if (anh && anh.file && fs.existsSync(anh.file)) png = fs.readFileSync(anh.file);
    return { ok: !!(kq && kq.ok && png), png: png, w: anh ? anh.w : 0, h: anh ? anh.h : 0, kq: kq };
  } catch (e) {
    return { ok: false, loi: e.message };
  } finally {
    fs.rmSync(tam, { recursive: true, force: true });
  }
}

// Thu nhỏ / mở lại cửa sổ app trong lúc tự chụp (để ETABS hiện trên màn hình); lúc thu nhỏ: F10 (toàn hệ thống) = dừng
function cuaSoApp(yc) {
  if (!cuaSo) return false;
  if (yc && yc.thuNho) {
    if (!globalShortcut.isRegistered('F10')) globalShortcut.register('F10', function () { if (cuaSo) cuaSo.webContents.send('f9', 'dung'); });
    cuaSo.minimize();
  } else {
    if (globalShortcut.isRegistered('F10')) globalShortcut.unregister('F10');
    if (cuaSo.isMinimized()) cuaSo.restore();
    cuaSo.show(); cuaSo.focus();
  }
  return true;
}

// ---- Chụp lần lượt bằng phím F9: cửa sổ hướng dẫn nhỏ luôn nổi trên cùng, F9 (toàn hệ thống) báo app chụp hình hiện tại ----
let cuaSoHuongDan = null;
function f9Bat(nd) {
  if (!globalShortcut.isRegistered('F9')) {
    // ẩn cửa sổ hướng dẫn trước khi chụp (cửa sổ luôn nổi có thể nằm trên khung nhìn ETABS); app gọi f9Bat để hiện lại
    globalShortcut.register('F9', function () { anHuongDan(); if (cuaSo) cuaSo.webContents.send('f9', 'chup'); });
  }
  if (!cuaSoHuongDan || cuaSoHuongDan.isDestroyed()) {
    const vung = screen.getPrimaryDisplay().workArea;
    cuaSoHuongDan = new BrowserWindow({
      width: 520, height: 210, x: vung.x + vung.width - 540, y: vung.y + vung.height - 230,
      alwaysOnTop: true, frame: false, resizable: true, skipTaskbar: true, focusable: true, show: false,
      title: 'Hướng dẫn chụp ETABS', backgroundColor: '#ffffff',
      webPreferences: { preload: path.join(__dirname, 'preload-huong-dan.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    cuaSoHuongDan.setAlwaysOnTop(true, 'screen-saver');
    cuaSoHuongDan.loadFile(path.join(__dirname, 'huong-dan.html'));
    cuaSoHuongDan.once('ready-to-show', function () { cuaSoHuongDan.showInactive(); cuaSoHuongDan.webContents.send('noi-dung', nd || {}); });
    cuaSoHuongDan.on('closed', function () { cuaSoHuongDan = null; if (cuaSo) cuaSo.webContents.send('f9', 'dung'); });
  } else {
    cuaSoHuongDan.webContents.send('noi-dung', nd || {});
    if (!cuaSoHuongDan.isVisible()) cuaSoHuongDan.showInactive();
  }
  return true;
}
function anHuongDan() { if (cuaSoHuongDan && !cuaSoHuongDan.isDestroyed()) cuaSoHuongDan.hide(); }
function f9Tat() {
  if (globalShortcut.isRegistered('F9')) globalShortcut.unregister('F9');
  if (cuaSoHuongDan && !cuaSoHuongDan.isDestroyed()) { cuaSoHuongDan.removeAllListeners('closed'); cuaSoHuongDan.close(); }
  cuaSoHuongDan = null;
  return true;
}

// Ảnh trong clipboard: Electron 45 đọc clipboard kiểu W3C (clipboard.read → ClipboardItem); bản cũ có readImage
async function anhClipboard() {
  const KHONG = { ok: false, loi: 'Clipboard không có ảnh. Trong ETABS dùng File → Capture Picture, hoặc Snipping Tool (Win + Shift + S), rồi dán lại.' };
  try {
    let anh = null;
    if (typeof clipboard.read === 'function') {
      const ds = await clipboard.read();
      for (const muc of ds || []) {
        const kieu = (muc.types || []).find(function (t) { return /^image\//.test(t); });
        if (!kieu) continue;
        const blob = await muc.getType(kieu);
        anh = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()));
        if (!anh.isEmpty()) break;
      }
    } else if (typeof clipboard.readImage === 'function') {
      anh = clipboard.readImage();
    }
    if (!anh || anh.isEmpty()) return KHONG;
    const kt = anh.getSize();
    return { ok: true, png: anh.toPNG(), w: kt.width, h: kt.height };
  } catch (e) {
    return { ok: false, loi: 'Không đọc được clipboard: ' + e.message };
  }
}

function taoCuaSo() {
  cuaSo = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600, show: false,
    title: 'Móng cẩu tháp',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false
    }
  });
  cuaSo.once('ready-to-show', function () { cuaSo.maximize(); cuaSo.show(); });
  cuaSo.on('closed', function () { cuaSo = null; f9Tat(); });
  // Liên kết ra ngoài mở bằng trình duyệt mặc định, không mở trong cửa sổ app
  cuaSo.webContents.setWindowOpenHandler(function (d) { moNgoai(d.url); return { action: 'deny' }; });
  cuaSo.webContents.on('will-navigate', function (e, url) {
    if (!url.startsWith('file:')) { e.preventDefault(); moNgoai(url); }
  });
  cuaSo.loadFile(path.join(__dirname, 'index.html'));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (cuaSo) { if (cuaSo.isMinimized()) cuaSo.restore(); cuaSo.focus(); }
  });
  app.whenReady().then(function () {
    taoMenu();
    ipcMain.handle('etabs', function (e, yeuCau) { return goiEtabs(yeuCau); });
    ipcMain.handle('chup-etabs', function (e, yc) { return chupEtabs(yc); });
    ipcMain.handle('tu-chup-etabs', function (e, yc) { return tuChupEtabs(yc); });
    ipcMain.handle('cua-so-app', function (e, yc) { return cuaSoApp(yc); });
    ipcMain.handle('f9-bat', function (e, nd) { return f9Bat(nd); });
    ipcMain.handle('f9-tat', function () { return f9Tat(); });
    // nút trên cửa sổ hướng dẫn F9 → trang app
    ipcMain.on('huong-dan', function (e, lenh) {
      if (lenh !== 'chup' && lenh !== 'bo-qua' && lenh !== 'dung') return;
      if (lenh === 'chup') anHuongDan();
      if (cuaSo) cuaSo.webContents.send('f9', lenh);
    });
    ipcMain.handle('anh-clipboard', function () { return anhClipboard(); });
    // Xuất thuyết minh: hiện hộp thoại "Lưu thành", mặc định vào thư mục Documents
    // File cẩu tự thêm (.json): hộp thoại riêng
    require('electron').session.defaultSession.on('will-download', function (e, item) {
      var ten = item.getFilename(), laDuAn = /\.mct\.json$/i.test(ten), laJson = /\.json$/i.test(ten);
      item.setSaveDialogOptions({
        title: laDuAn ? 'Lưu dự án móng cẩu tháp' : laJson ? 'Lưu file cẩu tháp' : 'Lưu thuyết minh',
        defaultPath: path.join(app.getPath('documents'), ten),
        filters: laDuAn ? [{ name: 'Dự án móng cẩu tháp (.mct.json)', extensions: ['json'] }]
          : laJson ? [{ name: 'Cẩu tháp (JSON)', extensions: ['json'] }] : [{ name: 'Word', extensions: ['docx'] }]
      });
    });
    taoCuaSo();
  });
  app.on('window-all-closed', function () { app.quit(); });
  app.on('will-quit', function () { globalShortcut.unregisterAll(); });
}
