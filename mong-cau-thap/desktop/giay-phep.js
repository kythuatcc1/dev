// Giấy phép phần mềm (chạy ở main process Electron): đăng nhập Supabase → Edge Function cap-giay-phep → token ký Ed25519.
// Bắt buộc kết nối mỗi lần mở; token chỉ để xác nhận (chữ ký, đúng máy, còn hạn) và mang quyền (dấu tên, khoá tính toán).
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const MUOI = 'mong-cau-thap/giay-phep/v1';

/** Mã máy đã băm (không gửi mã thật): MachineGuid (Windows) / machine-id (Linux) + tên máy. */
function maMay(giaTri) {
  let goc = giaTri;
  if (!goc) {
    try {
      if (process.platform === 'win32') {
        const o = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8', windowsHide: true });
        goc = (/MachineGuid\s+REG_SZ\s+(\S+)/i.exec(o) || [])[1];
      } else if (fs.existsSync('/etc/machine-id')) goc = fs.readFileSync('/etc/machine-id', 'utf8').trim();
    } catch (e) { /* dùng tên máy */ }
    goc = (goc || '') + '|' + os.hostname();
  }
  return crypto.createHash('sha256').update(MUOI + '|' + goc).digest('hex');
}

function b64uGiaiMa(s) { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }

/**
 * Kiểm tra token: chữ ký (khoá công khai theo kid), đúng máy, còn hạn, không bị lùi đồng hồ.
 * @returns {{ ok: boolean, loi?: string, du?: object }}
 */
function kiemTraToken(token, khoaCongKhai, maMayHienTai, opt) {
  opt = opt || {};
  try {
    const p = String(token || '').split('.');
    if (p.length !== 2) return { ok: false, loi: 'dinh-dang' };
    const du = JSON.parse(b64uGiaiMa(p[0]).toString('utf8'));
    const pem = khoaCongKhai && khoaCongKhai[du.kid];
    if (!pem) return { ok: false, loi: 'khoa-la' };
    const khoa = crypto.createPublicKey({ key: Buffer.from(pem, 'base64'), format: 'der', type: 'spki' });
    if (!crypto.verify(null, Buffer.from(p[0]), khoa, b64uGiaiMa(p[1]))) return { ok: false, loi: 'chu-ky' };
    if (du.did !== maMayHienTai) return { ok: false, loi: 'khac-may' };
    const bay = Math.floor((opt.bayGio || Date.now()) / 1000);
    if (typeof du.exp !== 'number' || du.exp < bay) return { ok: false, loi: 'het-han-token' };
    if (typeof du.iat !== 'number' || du.iat > bay + 600) return { ok: false, loi: 'dong-ho' };   // token phát hành "trong tương lai": đồng hồ máy bị lùi
    if (opt.mocCuoi && opt.mocCuoi > bay + 600) return { ok: false, loi: 'dong-ho' };
    return { ok: true, du: du };
  } catch (e) {
    return { ok: false, loi: 'khong-doc-duoc' };
  }
}

const THONG_BAO = {
  'chua-dang-nhap': 'Phiên đăng nhập không hợp lệ.',
  'dinh-dang': 'Giấy phép không đọc được.', 'khoa-la': 'Giấy phép do khoá lạ ký.', 'chu-ky': 'Giấy phép không hợp lệ (sai chữ ký).',
  'khac-may': 'Giấy phép không dành cho máy này.', 'het-han-token': 'Giấy phép đã hết hạn – kết nối mạng và đăng nhập lại.',
  'dong-ho': 'Đồng hồ máy bị chỉnh lùi – đặt lại đúng giờ.', 'khong-doc-duoc': 'Giấy phép không đọc được.',
  'mang': 'Không kết nối được máy chủ giấy phép. Phần mềm cần internet mỗi lần mở.'
};

function dauVaoCauHinh(duongDan, env) {
  // Cấu hình do dong-goi.js đóng gói; biến môi trường chỉ có tác dụng ở bản chưa đóng gói (kiểm thử)
  let c = null;
  try { c = JSON.parse(fs.readFileSync(path.join(duongDan, 'supabase-config.json'), 'utf8')); } catch (e) { /* chưa cấu hình */ }
  return c;
}

class GiayPhep {
  /**
   * @param {object} o { url, anonKey, khoaCongKhai: {kid: spkiBase64}, maMay, luu: { doc(): string|null, ghi(s): void }, fetch, bayGio }
   */
  constructor(o) {
    this.url = String(o.url || '').replace(/\/+$/, '');
    this.anonKey = o.anonKey;
    this.khoa = o.khoaCongKhai || {};
    this.maMay = o.maMay || maMay();
    this.luu = o.luu || { doc: function () { return null; }, ghi: function () {} };
    this.f = o.fetch || globalThis.fetch;
    this.bayGio = o.bayGio || function () { return Date.now(); };
    this.du = null;          // nội dung token hiện tại (đã kiểm tra)
    this.refreshToken = null;
    this.lanKiemTraCuoi = 0;
  }

  _doc() { try { return JSON.parse(this.luu.doc() || 'null') || {}; } catch (e) { return {}; } }
  _ghi(x) { this.luu.ghi(JSON.stringify(x)); }

  async _goi(duong, opt) {
    let r;
    try { r = await this.f(this.url + duong, opt); } catch (e) { return { loi: 'mang', trangThai: 0 }; }
    let j = null; try { j = await r.json(); } catch (e) { /* không có JSON */ }
    return { trangThai: r.status, json: j };
  }

  /** Đăng nhập email + mật khẩu → lưu refresh token → xin giấy phép. */
  async dangNhap(email, matKhau) {
    const r = await this._goi('/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: this.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(email || '').trim(), password: String(matKhau || '') })
    });
    if (r.loi) return { ok: false, loi: 'mang', thongBao: THONG_BAO.mang };
    if (r.trangThai !== 200 || !r.json || !r.json.access_token) return { ok: false, loi: 'sai-mat-khau', thongBao: 'Sai email hoặc mật khẩu.' };
    this.refreshToken = r.json.refresh_token;
    const ks = this._doc(); ks.refresh = r.json.refresh_token; this._ghi(ks);
    return this._xinGiayPhep(r.json.access_token);
  }

  /** Mỗi lần mở / kiểm tra định kỳ: dùng refresh token đã lưu để xin lại giấy phép (bắt buộc kết nối mạng). */
  async lamMoi() {
    const ks = this._doc();
    const rf = this.refreshToken || ks.refresh;
    if (!rf) return { ok: false, loi: 'chua-dang-nhap', thongBao: '' };
    const r = await this._goi('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: this.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rf })
    });
    if (r.loi) return { ok: false, loi: 'mang', thongBao: THONG_BAO.mang };
    if (r.trangThai !== 200 || !r.json || !r.json.access_token) { this.dangXuat(); return { ok: false, loi: 'chua-dang-nhap', thongBao: 'Phiên đăng nhập đã hết hạn hoặc tài khoản bị thu hồi – đăng nhập lại.' }; }
    this.refreshToken = r.json.refresh_token;
    ks.refresh = r.json.refresh_token; this._ghi(ks);
    return this._xinGiayPhep(r.json.access_token);
  }

  async _xinGiayPhep(accessToken) {
    const r = await this._goi('/functions/v1/cap-giay-phep', {
      method: 'POST', headers: { apikey: this.anonKey, Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ maMay: this.maMay, tenMay: os.hostname() })
    });
    if (r.loi) return { ok: false, loi: 'mang', thongBao: THONG_BAO.mang };
    if (r.trangThai !== 200 || !r.json || !r.json.token) {
      const loi = (r.json && r.json.loi) || 'tu-choi';
      if (loi === 'chua-dang-nhap') this.dangXuat();
      return { ok: false, loi: loi, thongBao: (r.json && r.json.thongBao) || THONG_BAO[loi] || 'Máy chủ từ chối cấp giấy phép (' + r.trangThai + ').' };
    }
    const ks = this._doc();
    const kt = kiemTraToken(r.json.token, this.khoa, this.maMay, { bayGio: this.bayGio(), mocCuoi: ks.mocCuoi });
    if (!kt.ok) return { ok: false, loi: kt.loi, thongBao: THONG_BAO[kt.loi] || 'Giấy phép không hợp lệ.' };
    ks.mocCuoi = Math.floor(this.bayGio() / 1000);   // mốc thời gian lớn nhất đã thấy: phát hiện lùi đồng hồ ở lần sau
    this._ghi(ks);
    this.du = kt.du; this.lanKiemTraCuoi = this.bayGio();
    return { ok: true, giayPhep: this.thongTin() };
  }

  dangXuat() { this.du = null; this.refreshToken = null; const ks = this._doc(); delete ks.refresh; this._ghi(ks); }

  /** Thông tin cho giao diện (không có chữ ký). */
  thongTin() {
    const d = this.du;
    return d ? { ten: d.ten, email: d.email, donVi: d.donVi, loai: d.loai, dauTen: !!d.dauTen, dungThu: !!d.dungThu, khoaTinhToan: !!d.khoaTinhToan, hetHan: d.hetHanDv || null } : null;
  }
  conHieuLuc() {
    return !!this.du && this.du.exp > Math.floor(this.bayGio() / 1000);   // token còn hạn (khoaTinhToan: chỉ xem dự án, xử lý ở giao diện)
  }
}

module.exports = { GiayPhep, kiemTraToken, maMay, dauVaoCauHinh, THONG_BAO };
