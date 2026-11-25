// Vỏ chương trình Windows (Electron): mở app index.html trong một cửa sổ riêng, chạy hoàn toàn offline.
// Số liệu vẫn tự lưu như khi mở bằng trình duyệt (lưu trong %APPDATA%\MongCauThap).
'use strict';
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

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

function taoCuaSo() {
  cuaSo = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600, show: false,
    title: 'Móng cẩu tháp',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
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
