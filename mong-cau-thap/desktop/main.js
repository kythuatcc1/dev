// Vỏ chương trình Windows (Electron): mở app index.html trong một cửa sổ riêng, chạy hoàn toàn offline.
// Số liệu vẫn tự lưu như khi mở bằng trình duyệt (lưu trong %APPDATA%\MongCauThap).
'use strict';
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
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
// Mỗi lệnh chạy script PowerShell etabs/cau-noi-etabs.ps1; trao đổi qua file JSON tạm (UTF-8)
function thuMucEtabs() {
  return app.isPackaged ? path.join(process.resourcesPath, 'etabs') : path.join(__dirname, '..', '..', 'etabs');
}

function goiEtabs(yeuCau) {
  return new Promise(function (traVe) {
    if (process.platform !== 'win32') {
      traVe({ ok: false, buocLoi: 'he-dieu-hanh', loi: 'Kết nối ETABS chỉ chạy trên Windows.', buoc: [] });
      return;
    }
    const script = path.join(thuMucEtabs(), 'cau-noi-etabs.ps1');
    if (!fs.existsSync(script)) {
      traVe({ ok: false, buocLoi: 'script', loi: 'Không tìm thấy ' + script, buoc: [] });
      return;
    }
    const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'mct-etabs-'));
    const vao = path.join(tam, 'yeu-cau.json');
    const ra = path.join(tam, 'ket-qua.json');
    fs.writeFileSync(vao, JSON.stringify(yeuCau || {}), 'utf8');
    const lenh = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    execFile(fs.existsSync(lenh) ? lenh : 'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-YeuCau', vao, '-KetQua', ra],
      { windowsHide: true, timeout: (yeuCau && yeuCau.thoiGianToiDa) || 10 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 },
      function (loi, stdout, stderr) {
        let kq;
        try {
          kq = JSON.parse(fs.readFileSync(ra, 'utf8').replace(/^\uFEFF/, ''));
        } catch (e) {
          kq = {
            ok: false, buocLoi: 'powershell', buoc: [],
            loi: 'PowerShell không trả kết quả' + (loi ? ': ' + loi.message : '.'),
            stderr: String(stderr || '').slice(0, 4000), stdout: String(stdout || '').slice(0, 4000)
          };
        }
        fs.rmSync(tam, { recursive: true, force: true });
        traVe(kq);
      });
  });
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
  cuaSo.on('closed', function () { cuaSo = null; });
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
    // Xuất thuyết minh: hiện hộp thoại "Lưu thành", mặc định vào thư mục Documents
    require('electron').session.defaultSession.on('will-download', function (e, item) {
      item.setSaveDialogOptions({
        title: 'Lưu thuyết minh',
        defaultPath: path.join(app.getPath('documents'), item.getFilename()),
        filters: [{ name: 'Word', extensions: ['docx'] }]
      });
    });
    taoCuaSo();
  });
  app.on('window-all-closed', function () { app.quit(); });
}
