// Cầu nối an toàn giữa trang app và chương trình (Electron): chỉ mở đúng các lệnh cần dùng
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mctDesktop', {
  laChuongTrinh: true,
  heDieuHanh: process.platform,
  // Gửi một lệnh cho ETABS, ví dụ { lenh: 'kiem-tra', duongDanEtabs: '' } → Promise<kết quả JSON>
  etabs: function (yeuCau) { return ipcRenderer.invoke('etabs', yeuCau); }
});
