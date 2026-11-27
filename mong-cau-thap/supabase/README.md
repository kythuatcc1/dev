# Bảo mật phần mềm bằng Supabase (giấy phép ký số)

Thiết kế đã chốt: đăng nhập email + mật khẩu (Supabase Auth); chỉ CC1 tạo tài khoản; đơn vị CC1 (nội bộ) và đơn vị ngoài; dùng thử có hạn;
tối đa 2 máy/người; **bắt buộc kết nối mạng mỗi lần mở**; thuyết minh của khách ngoài / dùng thử có dấu tên ở chân trang;
hết hạn thì chỉ xem dự án, không xuất thuyết minh.

## 1. Việc làm một lần trên Supabase (≈ 20 phút)
1. Tạo project (gói **Pro** nếu dùng thật: gói Free tự tạm dừng khi ít hoạt động).
2. **SQL Editor**: dán `supabase/01-schema.sql` → Run.
3. **Authentication → Sign In / Providers → Email**: **tắt "Allow new users to sign up"** (không cho tự đăng ký).
4. **Tạo cặp khoá ký** (trên máy của anh/chị, KHÔNG chia sẻ): `node supabase/tao-khoa.js k1`
   - khoá công khai tự ghi vào `desktop/giay-phep-khoa.json` (nhúng vào phần mềm);
   - khoá bí mật nằm ở `supabase/KHOA-BI-MAT-k1.txt` (đã .gitignore) – đặt vào Supabase rồi cất / xoá file.
5. Cài [Supabase CLI](https://supabase.com/docs/guides/cli), đăng nhập, liên kết project, rồi:
   ```
   supabase secrets set MCT_KHOA_KY="$(cat supabase/KHOA-BI-MAT-k1.txt)" MCT_KID=k1
   supabase functions deploy cap-giay-phep
   ```
   (hàm `cap-giay-phep` cần JWT đăng nhập; giữ mặc định "Verify JWT").
6. **Project Settings → API**: copy **Project URL** và khoá **anon public**, tạo `desktop/supabase-config.json`:
   ```json
   { "url": "https://xxxx.supabase.co", "anonKey": "eyJ..." }
   ```
   (khoá anon công khai được phép nằm trong phần mềm; **tuyệt đối không** dùng service_role.)

## 2. Quản lý tài khoản (SQL Editor – xem các câu mẫu cuối `01-schema.sql`)
- Tạo đơn vị (`noi-bo` / `khach` / `dung-thu` + `het_han`), tạo user ở Authentication → Users (Auto Confirm), gắn đơn vị bằng `insert into ho_so`.
- Khoá một người: `ho_so.bat = false`. Khoá cả đơn vị: `don_vi.bat = false`. Thu hồi máy: `may.thu_hoi = true`.
- Dùng thử → chính thức: `loai = 'khach'`, `het_han = null`. Hiệu lực khoá: phần mềm đang chạy kiểm tra lại mỗi 15 phút; lần mở sau bị chặn ngay.

## 3. Đóng gói phần mềm
`cd desktop && npm run dong-goi` — **dừng nếu thiếu** `supabase-config.json` hoặc `giay-phep-khoa.json`
(chỉ thử nội bộ: `node dong-goi.js --khong-bao-mat`, bản này KHÔNG có đăng nhập).

## 4. Phần mềm làm gì
| Tình huống | Kết quả |
|---|---|
| Mở lần đầu / hết phiên | Hộp đăng nhập; chưa đăng nhập không có cửa sổ phần mềm |
| Mở lần sau | Tự làm mới trực tuyến (refresh token lưu mã hoá bằng safeStorage); **mất mạng thì không vào được** |
| Token | Ký Ed25519, sống 12 giờ, gắn mã máy (băm), kiểm tra chữ ký / đúng máy / còn hạn / đồng hồ bị lùi |
| Khoá, thu hồi, vượt 2 máy, hết hạn token | Đóng phần mềm, hiện đăng nhập kèm lý do (kiểm tra định kỳ 15 phút) |
| Dùng thử hết hạn | Vào được để xem / lưu dự án; khoá xuất thuyết minh |
| Khách ngoài / dùng thử | Chân trang thuyết minh: "Lập bằng phần mềm Móng cẩu tháp CC1 – tên – đơn vị" (+ "BẢN DÙNG THỬ") |

## 5. Giới hạn hiện tại (nói thẳng)
- Công thức vẫn nằm trong file phần mềm (`app.asar`): người có kỹ năng vẫn bóc ra được. Cổng đăng nhập này chặn người dùng thường và quản lý quyền / thu hồi,
  chưa chặn việc sao chép mã. Giai đoạn sau: cấp mã tính toán qua IPC sau khi có giấy phép + làm rối mã (bytenode); đưa công thức "bí quyết" lên máy chủ.
- Chưa có trang web quản trị (dùng SQL Editor / Table Editor); chưa ký số file .exe (cần chứng chỉ code signing).
- Đã thử bằng máy chủ Supabase **giả** (`desktop/thu-giay-phep.js`) và test đơn vị; **chưa chạy với project Supabase thật** (cần tài khoản của anh/chị).
