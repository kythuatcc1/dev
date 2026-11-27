# Bản thử đăng nhập bằng Supabase (chưa phải phần mềm thật)

Mục đích: anh/chị thử cách bảo mật trước khi áp dụng cho toàn bộ phần mềm.

## Làm một lần (khoảng 10 phút)
1. Vào https://supabase.com → đăng ký / đăng nhập → **New project** (đặt tên, mật khẩu database, chọn vùng gần Việt Nam, ví dụ Singapore). Gói Free đủ để thử.
2. Vào **SQL Editor** → New query → dán toàn bộ file `supabase.sql` → **Run**.
3. Vào **Authentication → Providers → Email**: tắt **Allow new users to sign up** (không cho tự đăng ký) – nếu chọn "tự đăng ký" thì bỏ qua bước này.
   Vào **Authentication → Sign In / Providers** (hoặc Settings): tắt **Confirm email** nếu muốn tạo tài khoản dùng ngay.
4. **Authentication → Users → Add user → Create new user**: nhập email + mật khẩu, đánh dấu *Auto Confirm User*.
5. **Table Editor → ho_so**: dòng của người vừa tạo có `duoc_duyet = false`. Đổi thành **true** để cho vào.
6. **Project Settings → API**: copy **Project URL** và **anon public key**.

## Thử
Mở `index.html` bằng Chrome / Edge → dán URL + anon key → Lưu → đăng nhập.
- Tài khoản chưa duyệt: báo "Chưa được duyệt", dữ liệu bị khoá.
- Đã duyệt: thấy bảng dữ liệu mẫu và nút tính P chạy trên máy chủ.
- Đổi `duoc_duyet` về false (hoặc đặt `het_han` quá khứ) rồi bấm F5: bị khoá ngay.
- Mở bằng cửa sổ ẩn danh / thiết bị khác: phải đăng nhập lại. Tắt mạng: không đăng nhập được.

## Vì sao an toàn
- Dữ liệu và công thức nằm trên máy chủ, được khoá bằng Row Level Security; file phần mềm không chứa chúng.
- Khoá `anon` công khai không đọc được gì nếu chưa đăng nhập và được duyệt. **Không bao giờ** đưa khoá `service_role` vào phần mềm.
- Quản trị duyệt / khoá / đặt hạn từng tài khoản bằng một ô trong bảng `ho_so`.

## Nếu thấy "anon vẫn sửa được bảng"
Khoá anon **chỉ an toàn khi bảng bật RLS và không có quyền ghi**. Các nguyên nhân thường gặp:
1. Bảng tạo bằng Table Editor mà **chưa bật RLS** (Table Editor có nhãn "RLS disabled") → bảng mở hoàn toàn. Bản `supabase.sql` mới đã bật `ENABLE` + `FORCE` RLS và thu hồi mọi quyền ghi của anon / authenticated.
2. Đã dùng nhầm khoá **service_role** (khoá này bỏ qua mọi RLS) – trang sẽ từ chối khoá này.
3. Có policy cũ dạng `using (true)` tạo từ lần thử trước: vào Authentication → Policies, xoá policy lạ, rồi chạy lại `supabase.sql`.
4. Chạy bằng SQL Editor / Table Editor trong bảng điều khiển thì luôn là quyền quản trị (vai trò postgres) – đó là quyền của chủ dự án, không phải của khoá anon.

Chạy lại `supabase.sql` (bản mới) rồi bấm **Chạy kiểm tra** ở mục 3 của trang: mọi dòng phải là CHẶN. Nếu có dòng THỦNG, chụp màn hình gửi lại.
