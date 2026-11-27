// Cửa sổ hướng dẫn chụp ETABS bằng F9 (luôn nổi trên cùng): nhận nội dung từ app, gửi lại lệnh chụp / bỏ qua / dừng
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('huongDan', {
  onNoiDung: function (xuLy) { ipcRenderer.on('noi-dung', function (e, nd) { xuLy(nd || {}); }); },
  gui: function (lenh) { ipcRenderer.send('huong-dan', lenh); }
});
