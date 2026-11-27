// Thử giấy phép với bản Electron Linux + máy chủ Supabase giả: node thu-giay-phep.js  (cần xvfb-run; chạy: xvfb-run -a node thu-giay-phep.js)
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { _electron: electron } = require('playwright');
const { maMay } = require('./giay-phep.js');

const PORT = 18765;
const cfg = path.join(__dirname, 'supabase-config.json'), khoaF = path.join(__dirname, 'giay-phep-khoa.json');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const trangThai = { matKhau: 'dung', loai: 'khach', hetHan: false, tuChoi: null, dang: 0, cap: 0, lamMoi: 0 };

const sv = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const j = b ? JSON.parse(b) : {}, tra = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url.includes('grant_type=password')) { trangThai.dang++; return j.password === trangThai.matKhau ? tra(200, { access_token: 'AT', refresh_token: 'RT' + trangThai.dang }) : tra(400, { error: 'invalid_grant' }); }
    if (req.url.includes('grant_type=refresh_token')) { trangThai.lamMoi++; return tra(200, { access_token: 'AT', refresh_token: 'RT-moi' + trangThai.lamMoi }); }
    if (req.url.endsWith('/functions/v1/cap-giay-phep')) {
      trangThai.cap++;
      if (trangThai.tuChoi) return tra(403, trangThai.tuChoi);
      const bay = Math.floor(Date.now() / 1000);
      const dau = b64u(JSON.stringify({ kid: 'k1', sub: 'u1', ten: 'Nguyễn Văn A', email: 'a@x.vn', donVi: 'Công ty ABC', loai: trangThai.loai, did: j.maMay, iat: bay, exp: bay + 3600,
        khoaTinhToan: trangThai.hetHan, dauTen: trangThai.loai !== 'noi-bo', dungThu: trangThai.loai === 'dung-thu' }));
      return tra(200, { token: dau + '.' + b64u(crypto.sign(null, Buffer.from(dau), privateKey)) });
    }
    tra(404, {});
  });
});

async function chay(ten, kiemTra, env, truoc, sau) {
  if (truoc) await truoc();
  const app = await electron.launch({ executablePath: path.join(__dirname, 'dist', 'MongCauThap-linux-x64', 'MongCauThap'), args: ['--no-sandbox', '--user-data-dir=' + userData],
    env: Object.assign({}, process.env, { ELECTRON_DISABLE_SANDBOX: '1' }, env || {}) });
  try { await kiemTra(app); console.log('✔ ' + ten); }
  finally { await app.close().catch(() => {}); if (sau) await sau(); }
}
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
async function cuaSoTheo(app, mau, ms) {
  const dh = Date.now();
  while (Date.now() - dh < (ms || 15000)) {
    for (const w of app.windows()) { const u = w.url(); if (mau.test(u)) return w; }
    await cho(250);
  }
  throw new Error('Không thấy cửa sổ ' + mau + ' – có: ' + app.windows().map((w) => w.url()).join(', '));
}
let userData;
(async () => {
  await new Promise((ok) => sv.listen(PORT, '127.0.0.1', ok));
  fs.writeFileSync(cfg, JSON.stringify({ url: 'http://127.0.0.1:' + PORT, anonKey: 'anon-thu' }));
  fs.writeFileSync(khoaF, JSON.stringify({ khoa: { k1: publicKey.export({ type: 'spki', format: 'der' }).toString('base64') } }));
  try {
    execFileSync('node', ['dong-goi.js', '--linux'], { cwd: __dirname, stdio: 'inherit' });
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'mct-ud-'));

    await chay('Lần đầu: hiện đăng nhập, không có cửa sổ phần mềm; sai mật khẩu báo lỗi; đúng thì vào phần mềm có tên + đơn vị', async (app) => {
      const dn = await cuaSoTheo(app, /dang-nhap\.html/);
      assert.ok(!app.windows().some((w) => /index\.html/.test(w.url())), 'chưa đăng nhập không được có cửa sổ phần mềm');
      await dn.fill('#email', 'a@x.vn'); await dn.fill('#mk', 'sai'); await dn.click('#nut');
      await dn.waitForFunction(() => /Sai email/.test(document.getElementById('tb').textContent));
      await dn.fill('#email', 'a@x.vn'); await dn.fill('#mk', 'dung'); await dn.click('#nut');
      const pm = await cuaSoTheo(app, /index\.html/);
      await pm.waitForFunction(() => /Nguyễn Văn A/.test(document.getElementById('giay-phep').textContent));
      const t = await pm.locator('#giay-phep').innerText();
      assert.match(t, /Công ty ABC/); assert.ok(!/DÙNG THỬ/.test(t));
      assert.strictEqual(await pm.evaluate(() => MCT.giayPhep && MCT.giayPhep.dauTen), true);
    });

    const truocLamMoi = trangThai.lamMoi;
    await chay('Mở lại: tự vào phần mềm (làm mới trực tuyến bằng refresh token), không hỏi mật khẩu', async (app) => {
      const truoc = truocLamMoi;
      const pm = await cuaSoTheo(app, /index\.html/);
      await pm.waitForFunction(() => !!(window.MCT && MCT.giayPhep));
      assert.ok(trangThai.lamMoi > truoc, 'phải gọi máy chủ mỗi lần mở');
      assert.ok(!app.windows().some((w) => /dang-nhap\.html/.test(w.url())));
    });

    await chay('Mất mạng khi mở: không vào được phần mềm, báo cần internet', async (app) => {
      const dn = await cuaSoTheo(app, /dang-nhap\.html/);
      await dn.waitForFunction(() => /internet/.test(document.getElementById('tb').textContent));
      assert.ok(!app.windows().some((w) => /index\.html/.test(w.url())));
    }, null, async () => { sv.closeAllConnections(); await new Promise((ok) => sv.close(ok)); },        // tắt máy chủ TRƯỚC khi mở app
       async () => { await new Promise((ok) => sv.listen(PORT, '127.0.0.1', ok)); });

    await chay('Bị khoá giữa phiên: kiểm tra định kỳ đóng phần mềm và hiện đăng nhập kèm lý do', async (app) => {
      const pm = await cuaSoTheo(app, /index\.html/);
      await pm.waitForFunction(() => !!(window.MCT && MCT.giayPhep));
      trangThai.tuChoi = { loi: 'tai-khoan-khoa', thongBao: 'Tài khoản đã bị khoá. Liên hệ CC1.' };   // khoá SAU khi đã vào
      const dn = await cuaSoTheo(app, /dang-nhap\.html/, 20000);
      await dn.waitForFunction(() => /bị khoá/.test(document.getElementById('tb').textContent));
      assert.ok(!app.windows().some((w) => /index\.html/.test(w.url())), 'cửa sổ phần mềm phải đóng');
    }, { MCT_KIEM_TRA_PHUT: '0.04' });
    trangThai.tuChoi = null;

    await chay('Vượt số máy: máy chủ từ chối → hiện lý do', async (app) => {
      const dn = await cuaSoTheo(app, /dang-nhap\.html/);      // phiên cũ đã bị xoá ở tình huống trước: đăng nhập lại
      await dn.fill('#email', 'a@x.vn'); await dn.fill('#mk', 'dung'); await dn.click('#nut');
      await dn.waitForFunction(() => /đủ 2 máy/.test(document.getElementById('tb').textContent));
      assert.ok(!app.windows().some((w) => /index\.html/.test(w.url())), 'vượt số máy thì không vào phần mềm');
    }, null, async () => { trangThai.tuChoi = { loi: 'vuot-so-may', thongBao: 'Đã đăng ký đủ 2 máy. Liên hệ CC1 để thu hồi máy cũ.' }; });

    await chay('Dùng thử hết hạn: vào được, nhưng khoá xuất thuyết minh; hiện DÙNG THỬ / HẾT HẠN', async (app) => {
      const pm = await cuaSoTheo(app, /index\.html/);
      await pm.waitForFunction(() => /HẾT HẠN/.test(document.getElementById('giay-phep').textContent));
      assert.match(await pm.locator('#giay-phep').innerText(), /DÙNG THỬ/);
      await pm.click('[data-action="xuat-tm"]');
      await pm.waitForFunction(() => /hết hạn/.test(document.getElementById('status').textContent));
    }, null, async () => { trangThai.tuChoi = null; trangThai.loai = 'dung-thu'; trangThai.hetHan = true; });
  } finally {
    fs.rmSync(cfg, { force: true }); fs.rmSync(khoaF, { force: true });
    sv.close();
  }
  console.log('Tất cả tình huống giấy phép đạt');
  process.exit(0);
})().catch((e) => { fs.rmSync(cfg, { force: true }); fs.rmSync(khoaF, { force: true }); console.error('✘', e.message); process.exit(1); });
