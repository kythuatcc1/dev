// Tạo cặp khoá Ed25519 cho giấy phép. Chạy MỘT lần: node tao-khoa.js
//   - khoá BÍ MẬT (PKCS8 base64) → supabase secrets set MCT_KHOA_KY="..." (không bao giờ đưa vào phần mềm / Git)
//   - khoá CÔNG KHAI (SPKI base64) → desktop/giay-phep-khoa.json (nhúng vào phần mềm)
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const kid = process.argv[2] || 'k1';
const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const bi = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const file = path.join(__dirname, '..', 'desktop', 'giay-phep-khoa.json');
const cu = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { khoa: {} };
cu.khoa[kid] = pub;
fs.writeFileSync(file, JSON.stringify(cu, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'KHOA-BI-MAT-' + kid + '.txt'), bi + '\n', { mode: 0o600 });
console.log('Đã ghi khoá công khai vào desktop/giay-phep-khoa.json (kid = ' + kid + ').');
console.log('Khoá BÍ MẬT lưu ở supabase/KHOA-BI-MAT-' + kid + '.txt – đặt vào Supabase rồi XOÁ / cất kỹ file này (đã bị .gitignore):');
console.log('  supabase secrets set MCT_KHOA_KY="$(cat supabase/KHOA-BI-MAT-' + kid + '.txt)" MCT_KID=' + kid);
