// Cửa sổ đăng nhập: chỉ gửi email + mật khẩu cho main process (mật khẩu không lưu ở đâu)
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dangNhap', {
  gui: function (email, matKhau) { return ipcRenderer.invoke('dang-nhap', String(email || ''), String(matKhau || '')); },
  onTrangThai: function (xuLy) { ipcRenderer.on('dang-nhap-trang-thai', function (e, t) { xuLy(t || {}); }); }
});
