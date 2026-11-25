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
    // File cẩu tự thêm (.json): hộp thoại riêng
    require('electron').session.defaultSession.on('will-download', function (e, item) {
      var laJson = /\.json$/i.test(item.getFilename());
      item.setSaveDialogOptions({
        title: laJson ? 'Lưu file cẩu tháp' : 'Lưu thuyết minh',
        defaultPath: path.join(app.getPath('documents'), item.getFilename()),
        filters: laJson ? [{ name: 'Cẩu tháp (JSON)', extensions: ['json'] }] : [{ name: 'Word', extensions: ['docx'] }]
      });
    });
    taoCuaSo();
  });
  app.on('window-all-closed', function () { app.quit(); });
}
