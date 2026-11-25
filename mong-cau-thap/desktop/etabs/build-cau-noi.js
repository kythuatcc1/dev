// Biên dịch cầu nối MctEtabs cho chương trình Windows: desktop/etabs/cau-noi-etabs/
//   npm run build-cau-noi   (cần .NET SDK 8 trên máy build; máy dùng chương trình chỉ cần .NET 8 Desktop Runtime – ETABS 22+ đã cài)
// Sau khi publish, khai báo thêm khung Microsoft.WindowsDesktop.App trong runtimeconfig.json để cầu nối chạy cùng môi trường
// với chính ETABS (thư viện API có thể nạp các thành phần WinForms/WPF đi kèm ETABS).
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const duAn = path.join(__dirname, 'MctEtabs', 'MctEtabs.csproj');
const ra = path.join(__dirname, 'cau-noi-etabs');
fs.rmSync(ra, { recursive: true, force: true });
execFileSync('dotnet', ['publish', duAn, '-c', 'Release', '-o', ra, '--nologo'], { stdio: 'inherit' });

const fileCauHinh = path.join(ra, 'MctEtabs.runtimeconfig.json');
// Giữ bản cấu hình chỉ cần .NET cơ bản để chạy dự phòng khi máy thiếu .NET Desktop Runtime
fs.copyFileSync(fileCauHinh, path.join(ra, 'MctEtabs.coban.runtimeconfig.json'));
const cauHinh = JSON.parse(fs.readFileSync(fileCauHinh, 'utf8'));
const tuyChon = cauHinh.runtimeOptions;
const banNet = (tuyChon.framework && tuyChon.framework.version) || '8.0.0';
delete tuyChon.framework;
tuyChon.frameworks = [
  { name: 'Microsoft.NETCore.App', version: banNet },
  { name: 'Microsoft.WindowsDesktop.App', version: banNet }
];
tuyChon.rollForward = 'LatestMajor';
fs.writeFileSync(fileCauHinh, JSON.stringify(cauHinh, null, 2) + '\n');
for (const f of fs.readdirSync(ra)) if (!/^MctEtabs\.(dll|runtimeconfig\.json|coban\.runtimeconfig\.json|deps\.json)$/.test(f)) fs.rmSync(path.join(ra, f), { recursive: true, force: true });
console.log('Đã biên dịch cầu nối: ' + path.relative(process.cwd(), ra) + ' (' + fs.readdirSync(ra).join(', ') + ')');
