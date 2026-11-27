// Giấy phép Supabase (desktop/giay-phep.js): kiểm tra token, đăng nhập, làm mới, mất mạng, đổi máy, lùi đồng hồ, thu hồi
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { GiayPhep, kiemTraToken, maMay } = require('../desktop/giay-phep.js');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const KHOA = { k1: publicKey.export({ type: 'spki', format: 'der' }).toString('base64') };
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function ky(du, khoa) {
  const dau = b64u(JSON.stringify(du));
  return dau + '.' + b64u(crypto.sign(null, Buffer.from(dau), khoa || privateKey));
}
const MAY = maMay('may-thu-1');
const bay = () => Math.floor(Date.now() / 1000);
const duMau = (x) => Object.assign({ kid: 'k1', sub: 'u1', ten: 'Nguyễn Văn A', email: 'a@x.vn', donVi: 'ABC', loai: 'khach', did: MAY, iat: bay(), exp: bay() + 3600, khoaTinhToan: false, dauTen: true, dungThu: false }, x);

test('Mã máy: băm 64 hex, khác máy khác, không lộ mã gốc', () => {
  assert.match(MAY, /^[0-9a-f]{64}$/);
  assert.notEqual(MAY, maMay('may-thu-2'));
  assert.ok(!MAY.includes('may-thu-1'));
});

test('Token: hợp lệ; sai chữ ký, sửa nội dung, khoá lạ, khác máy, hết hạn, đồng hồ lùi đều bị từ chối', () => {
  assert.equal(kiemTraToken(ky(duMau()), KHOA, MAY).ok, true);
  const khac = crypto.generateKeyPairSync('ed25519').privateKey;
  assert.equal(kiemTraToken(ky(duMau(), khac), KHOA, MAY).loi, 'chu-ky');
  const t = ky(duMau()), [d, c] = t.split('.');
  const sua = b64u(JSON.stringify(Object.assign(JSON.parse(Buffer.from(d, 'base64')), { khoaTinhToan: false, dungThu: false, exp: bay() + 9e8 })));
  assert.equal(kiemTraToken(sua + '.' + c, KHOA, MAY).loi, 'chu-ky', 'sửa nội dung → hỏng chữ ký');
  assert.equal(kiemTraToken(ky(duMau({ kid: 'k9' })), KHOA, MAY).loi, 'khoa-la');
  assert.equal(kiemTraToken(ky(duMau()), KHOA, maMay('may-khac')).loi, 'khac-may');
  assert.equal(kiemTraToken(ky(duMau({ exp: bay() - 5 })), KHOA, MAY).loi, 'het-han-token');
  assert.equal(kiemTraToken(ky(duMau({ iat: bay() + 5000, exp: bay() + 9000 })), KHOA, MAY).loi, 'dong-ho');
  assert.equal(kiemTraToken(ky(duMau()), KHOA, MAY, { mocCuoi: bay() + 7200 }).loi, 'dong-ho', 'đồng hồ lùi so với mốc đã thấy');
  assert.equal(kiemTraToken('rac', KHOA, MAY).ok, false);
});

// ---- Máy chủ giả: Supabase Auth + Edge Function ----
function mayChuGia(cau) {
  const g = { dangNhap: 0, lamMoi: 0, cap: 0, trangThaiCap: 200, loiCap: null, mat: false, tokenCap: null };
  const f = async (url, opt) => {
    if (g.mat) throw new TypeError('fetch failed');
    const u = String(url), body = opt && opt.body ? JSON.parse(opt.body) : {};
    const tra = (st, j) => ({ status: st, json: async () => j });
    if (u.includes('grant_type=password')) {
      g.dangNhap++;
      return body.password === 'dung' ? tra(200, { access_token: 'AT1', refresh_token: 'RT' + g.dangNhap }) : tra(400, { error: 'invalid_grant' });
    }
    if (u.includes('grant_type=refresh_token')) {
      g.lamMoi++;
      return body.refresh_token && !g.thuHoiPhien ? tra(200, { access_token: 'AT2', refresh_token: 'RT-moi' + g.lamMoi }) : tra(400, { error: 'invalid_grant' });
    }
    if (u.endsWith('/functions/v1/cap-giay-phep')) {
      g.cap++;
      if (g.trangThaiCap !== 200) return tra(g.trangThaiCap, g.loiCap);
      return tra(200, { token: g.tokenCap ? g.tokenCap(body) : ky(duMau({ did: body.maMay })) });
    }
    return tra(404, {});
  };
  g.fetch = f;
  return g;
}
function taoGp(g, opt) {
  let luu = null;
  const gp = new GiayPhep(Object.assign({ url: 'https://x.supabase.co', anonKey: 'anon', khoaCongKhai: KHOA, maMay: MAY, fetch: g.fetch,
    luu: { doc: () => luu, ghi: (s) => { luu = s; } } }, opt || {}));
  gp._luu = () => luu;
  return gp;
}

test('Đăng nhập đúng: nhận giấy phép, lưu refresh token (không lưu mật khẩu)', async () => {
  const g = mayChuGia(), gp = taoGp(g);
  const r = await gp.dangNhap('a@x.vn', 'dung');
  assert.equal(r.ok, true);
  assert.equal(r.giayPhep.dauTen, true); assert.equal(r.giayPhep.donVi, 'ABC');
  assert.ok(gp.conHieuLuc());
  assert.ok(gp._luu().includes('RT1') && !gp._luu().includes('dung'), 'lưu refresh token, không lưu mật khẩu');
  assert.ok(!JSON.stringify(r).includes('RT1'), 'không đưa refresh token ra giao diện');
});

test('Sai mật khẩu, mất mạng: không có giấy phép', async () => {
  const g = mayChuGia(), gp = taoGp(g);
  const sai = await gp.dangNhap('a@x.vn', 'sai');
  assert.equal(sai.ok, false); assert.match(sai.thongBao, /Sai email/); assert.equal(gp.conHieuLuc(), false);
  g.mat = true;
  const mat = await gp.dangNhap('a@x.vn', 'dung');
  assert.equal(mat.loi, 'mang'); assert.match(mat.thongBao, /internet/);
});

test('Mỗi lần mở phải làm mới trực tuyến: mất mạng thì không vào, dù đã đăng nhập hôm trước', async () => {
  const g = mayChuGia(), gp = taoGp(g);
  await gp.dangNhap('a@x.vn', 'dung');
  const gp2 = new GiayPhep({ url: 'https://x.supabase.co', anonKey: 'a', khoaCongKhai: KHOA, maMay: MAY, fetch: g.fetch, luu: { doc: () => gp._luu(), ghi: (s) => gp.luu.ghi(s) } });
  assert.equal(gp2.conHieuLuc(), false, 'chưa làm mới thì chưa có giấy phép');
  g.mat = true;
  assert.equal((await gp2.lamMoi()).loi, 'mang');
  g.mat = false;
  const ok = await gp2.lamMoi();
  assert.equal(ok.ok, true); assert.equal(g.lamMoi, 1);
});

test('Thu hồi: phiên bị thu hồi hoặc máy chủ từ chối (khoá, vượt số máy, thu hồi máy) → mất giấy phép', async () => {
  const g = mayChuGia(), gp = taoGp(g);
  await gp.dangNhap('a@x.vn', 'dung');
  g.thuHoiPhien = true;
  const r = await gp.lamMoi();
  assert.equal(r.ok, false); assert.equal(gp.conHieuLuc(), false);
  assert.ok(!gp._luu().includes('"refresh"'), 'xoá refresh token đã lưu');
  g.thuHoiPhien = false;
  const g2 = mayChuGia(), gp2 = taoGp(g2);
  for (const [loi, tb] of [['vuot-so-may', 'Đã đăng ký đủ 2 máy'], ['tai-khoan-khoa', 'khoá'], ['may-bi-thu-hoi', 'thu hồi']]) {
    g2.trangThaiCap = 403; g2.loiCap = { loi, thongBao: tb };
    const x = await gp2.dangNhap('a@x.vn', 'dung');
    assert.equal(x.ok, false); assert.equal(x.loi, loi); assert.match(x.thongBao, new RegExp(tb));
  }
});

test('Máy chủ giả mạo (token ký bằng khoá khác / cho máy khác / hết hạn) bị từ chối', async () => {
  const g = mayChuGia(), gp = taoGp(g);
  const khac = crypto.generateKeyPairSync('ed25519').privateKey;
  g.tokenCap = () => ky(duMau(), khac);
  assert.equal((await gp.dangNhap('a@x.vn', 'dung')).loi, 'chu-ky');
  g.tokenCap = () => ky(duMau({ did: maMay('khac') }));
  assert.equal((await gp.dangNhap('a@x.vn', 'dung')).loi, 'khac-may');
  g.tokenCap = () => ky(duMau({ exp: bay() - 10 }));
  assert.equal((await gp.dangNhap('a@x.vn', 'dung')).loi, 'het-han-token');
  assert.equal(gp.conHieuLuc(), false);
});

test('Lùi đồng hồ: đã thấy giờ muộn hơn rồi mà đồng hồ máy lùi > 10 phút thì bị từ chối', async () => {
  let luu = null;
  const luuCh = { doc: () => luu, ghi: (s) => { luu = s; } };
  const sau = Date.now() + 3 * 3600 * 1000;
  const g = mayChuGia(); g.tokenCap = (b) => ky(duMau({ did: b.maMay, iat: Math.floor(sau / 1000), exp: Math.floor(sau / 1000) + 3600 }));
  const a = new GiayPhep({ url: 'https://x.supabase.co', anonKey: 'a', khoaCongKhai: KHOA, maMay: MAY, fetch: g.fetch, luu: luuCh, bayGio: () => sau });
  assert.equal((await a.dangNhap('a@x.vn', 'dung')).ok, true);                         // ghi mốc = "giờ muộn"
  const g2 = mayChuGia();
  const b = new GiayPhep({ url: 'https://x.supabase.co', anonKey: 'a', khoaCongKhai: KHOA, maMay: MAY, fetch: g2.fetch, luu: luuCh });   // đồng hồ thật = sớm hơn 3 giờ
  assert.equal((await b.dangNhap('a@x.vn', 'dung')).loi, 'dong-ho');
});

test('Giấy phép hết hạn dùng thử: token mang khoaTinhToan; dấu tên cho khách ngoài, không dấu cho nội bộ', async () => {
  const g = mayChuGia(), gp = taoGp(g);
  g.tokenCap = (b) => ky(duMau({ did: b.maMay, loai: 'dung-thu', dungThu: true, khoaTinhToan: true }));
  const r = await gp.dangNhap('a@x.vn', 'dung');
  assert.equal(r.ok, true); assert.equal(r.giayPhep.khoaTinhToan, true); assert.equal(r.giayPhep.dungThu, true);
  g.tokenCap = (b) => ky(duMau({ did: b.maMay, loai: 'noi-bo', dauTen: false }));
  assert.equal((await gp.dangNhap('a@x.vn', 'dung')).giayPhep.dauTen, false);
});
