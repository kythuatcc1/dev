// Cầu nối an toàn giữa trang app và chương trình (Electron): chỉ mở đúng các lệnh cần dùng
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mctDesktop', {
  laChuongTrinh: true,
  heDieuHanh: process.platform,
  // Gửi một lệnh cho ETABS, ví dụ { lenh: 'kiem-tra', duongDanEtabs: '' } → Promise<kết quả JSON>
  etabs: function (yeuCau) { return ipcRenderer.invoke('etabs', yeuCau); },
  // Chụp cửa sổ ETABS / màn hình → Promise<{ ok, png: Uint8Array, w, h, ten } | { ok: false, loi }>
  chupEtabs: function (yc) { return ipcRenderer.invoke('chup-etabs', yc || {}); },
  // Ảnh đang có trong clipboard (ví dụ File → Capture Picture của ETABS, Snipping Tool)
  anhClipboard: function () { return ipcRenderer.invoke('anh-clipboard'); },
  // Tự chụp: cầu nối bấm menu / hộp thoại ETABS theo thaoTac rồi chụp khung nhìn → { ok, png, w, h, kq (nhật ký) }
  tuChupEtabs: function (yc) { return ipcRenderer.invoke('tu-chup-etabs', yc || {}); },
  cuaSoApp: function (yc) { return ipcRenderer.invoke('cua-so-app', yc || {}); },
  // Giấy phép (Supabase): thông tin người dùng / đơn vị / gói; nút đăng xuất
  giayPhep: function () { return ipcRenderer.invoke('giay-phep'); },
  dangXuat: function () { return ipcRenderer.invoke('dang-xuat'); },
  onGiayPhep: function (xuLy) { ipcRenderer.on('giay-phep-doi', function (e, gp) { xuLy(gp); }); },
  // Chụp lần lượt bằng F9: cửa sổ hướng dẫn nổi; nhận 'chup' | 'bo-qua' | 'dung'
  f9Bat: function (noiDung) { return ipcRenderer.invoke('f9-bat', noiDung || {}); },
  f9Tat: function () { return ipcRenderer.invoke('f9-tat'); },
  onF9: function (xuLy) {
    ipcRenderer.removeAllListeners('f9');
    ipcRenderer.on('f9', function (e, lenh) { xuLy(lenh); });
  }
});
