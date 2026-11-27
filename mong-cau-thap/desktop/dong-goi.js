// Đóng gói app thành chương trình Windows (.exe) bằng Electron.
//   cd desktop
//   npm install          (lần đầu, tải Electron ~100 MB)
//   npm run dong-goi     → dist/MongCauThap-win32-x64/MongCauThap.exe
// Chạy được trên Windows, macOS hoặc Linux; không cần Visual Studio hay Wine.
// Thêm --linux để đóng gói bản Linux (dùng để thử trên máy build).
'use strict';
const fs = require('fs');
const path = require('path');
const { packager } = require('@electron/packager');

const GOC = path.resolve(__dirname, '..');
const TAM = path.join(__dirname, 'build', 'app');
const RA = path.join(__dirname, 'dist');
const pkg = require(path.join(GOC, 'package.json'));

fs.rmSync(path.join(__dirname, 'build'), { recursive: true, force: true });
fs.mkdirSync(TAM, { recursive: true });
for (const f of ['index.html', 'css', 'js', 'vendor']) {
  fs.cpSync(path.join(GOC, f), path.join(TAM, f), { recursive: true });
}
for (const f of ['main.js', 'preload.js', 'preload-huong-dan.js', 'huong-dan.html', 'giay-phep.js', 'dang-nhap.html', 'preload-dang-nhap.js', 'icon.png']) fs.copyFileSync(path.join(__dirname, f), path.join(TAM, f));
fs.writeFileSync(path.join(TAM, 'package.json'), JSON.stringify({
  name: 'mong-cau-thap', productName: 'MongCauThap', version: pkg.version,
  description: pkg.description, main: 'main.js', private: true
}, null, 2));

// Giấy phép Supabase: cần supabase-config.json { url, anonKey } và giay-phep-khoa.json (khoá công khai, từ supabase/tao-khoa.js).
// Không có hai file này thì không đóng gói (tránh phát hành nhầm bản không bảo mật); --khong-bao-mat chỉ để thử trong nội bộ.
const khongBaoMat = process.argv.includes('--khong-bao-mat');
for (const f of ['supabase-config.json', 'giay-phep-khoa.json']) {
  const nguon = path.join(__dirname, f);
  if (fs.existsSync(nguon)) fs.copyFileSync(nguon, path.join(TAM, f));
  else if (!khongBaoMat) {
    console.error('Thiếu desktop/' + f + ' – xem supabase/README.md. (Chỉ thử nội bộ: thêm --khong-bao-mat để đóng gói bản KHÔNG có đăng nhập.)');
    process.exit(1);
  }
}
if (khongBaoMat) console.warn('CẢNH BÁO: bản đóng gói KHÔNG có đăng nhập / giấy phép.');

const CAU_NOI = path.join(__dirname, 'etabs', 'cau-noi-etabs');
if (!fs.existsSync(path.join(CAU_NOI, 'MctEtabs.dll'))) {
  console.error('Chưa biên dịch cầu nối ETABS: chạy "npm run build-cau-noi" (cần .NET SDK 8) rồi đóng gói lại.');
  process.exit(1);
}

const linux = process.argv.includes('--linux');
packager({
  dir: TAM,
  out: RA,
  overwrite: true,
  platform: linux ? 'linux' : 'win32',
  arch: 'x64',
  electronVersion: require('electron/package.json').version,
  asar: true,
  name: 'MongCauThap',
  executableName: 'MongCauThap',
  icon: path.join(__dirname, 'icon.ico'),
  // Cầu nối ETABS (.NET 8) để ngoài gói asar → resources/cau-noi-etabs/
  extraResource: [CAU_NOI],
  appVersion: pkg.version,
  appCopyright: 'CC1',
  win32metadata: {
    CompanyName: 'CC1',
    FileDescription: 'Móng cẩu tháp',
    ProductName: 'Móng cẩu tháp',
    InternalName: 'MongCauThap',
    OriginalFilename: 'MongCauThap.exe'
  }
}).then(function (thuMuc) {
  thuMuc.forEach(function (d) {
    // Chỉ giữ ngôn ngữ giao diện tiếng Việt và tiếng Anh (bớt ~47 MB); thiếu ngôn ngữ khác Electron tự dùng en-US
    const loc = path.join(d, 'locales');
    if (fs.existsSync(loc)) {
      fs.readdirSync(loc).forEach(function (f) {
        if (!/^(en-US|vi)\.pak$/.test(f)) fs.rmSync(path.join(loc, f));
      });
    }
    console.log('Đã đóng gói: ' + path.relative(process.cwd(), d));
  });
}).catch(function (e) {
  console.error('Lỗi đóng gói: ' + e.message);
  process.exit(1);
});
