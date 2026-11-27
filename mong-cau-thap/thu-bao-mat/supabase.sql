-- BẢN THỬ BẢO MẬT (Supabase). Dán toàn bộ file này vào Supabase → SQL Editor → Run. Chạy lại nhiều lần vẫn an toàn.

-- 1. Hồ sơ người dùng: tài khoản do quản trị tạo (Authentication → Users), chỉ vào được phần mềm khi duoc_duyet = true (và chưa hết hạn)
create table if not exists public.ho_so (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  ho_ten text default '',
  duoc_duyet boolean not null default false,
  het_han date,
  tao_luc timestamptz not null default now()
);
alter table public.ho_so enable row level security;
drop policy if exists "doc_ho_so_cua_minh" on public.ho_so;
create policy "doc_ho_so_cua_minh" on public.ho_so for select to authenticated using (auth.uid() = id);
-- người dùng KHÔNG có quyền sửa / thêm / xoá ho_so: chỉ quản trị (Table Editor hoặc service_role)

-- 2. Tự tạo hồ sơ (chưa duyệt) khi quản trị tạo tài khoản
create or replace function public.tao_ho_so_moi() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.ho_so (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists khi_tao_nguoi_dung on auth.users;
create trigger khi_tao_nguoi_dung after insert on auth.users for each row execute function public.tao_ho_so_moi();
-- hồ sơ cho các tài khoản đã tạo trước khi chạy file này
insert into public.ho_so (id, email) select id, email from auth.users on conflict (id) do nothing;

-- 3. Hàm kiểm tra "đã được duyệt"
create or replace function public.da_duyet() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select duoc_duyet and (het_han is null or het_han >= current_date) from public.ho_so where id = auth.uid()), false);
$$;

-- 4. Dữ liệu mẫu CHỈ người đã duyệt mới đọc được (minh hoạ: số liệu catalogue nằm trên máy chủ, không nằm trong file phần mềm)
create table if not exists public.tai_lieu_mau (
  id serial primary key,
  ten text not null,
  tai_lv_n numeric, tai_lv_h numeric, tai_lv_m numeric
);
alter table public.tai_lieu_mau enable row level security;
drop policy if exists "chi_nguoi_da_duyet_doc" on public.tai_lieu_mau;
create policy "chi_nguoi_da_duyet_doc" on public.tai_lieu_mau for select to authenticated using (public.da_duyet());
insert into public.tai_lieu_mau (ten, tai_lv_n, tai_lv_h, tai_lv_m)
select * from (values ('Cẩu mẫu LLT5020-10 (số thử)', 1424.09::numeric, 44.9::numeric, 3668.59::numeric),
                      ('Cẩu mẫu XGTL120 (số thử)', 1210.0::numeric, 38.5::numeric, 3100.0::numeric)) v
where not exists (select 1 from public.tai_lieu_mau);

-- 5. Một phép tính chạy trên máy chủ (minh hoạ: công thức không nằm trong file phần mềm): trọng lượng đài P = 25·X·Y·H·1,1
create or replace function public.tinh_trong_luong_dai(x numeric, y numeric, h numeric) returns numeric
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.da_duyet() then raise exception 'Tai khoan chua duoc duyet'; end if;
  return round(25 * x * y * h * 1.1, 2);
end $$;
revoke all on function public.tinh_trong_luong_dai(numeric, numeric, numeric) from public, anon;
grant execute on function public.tinh_trong_luong_dai(numeric, numeric, numeric) to authenticated;
revoke all on function public.da_duyet() from public, anon;
grant execute on function public.da_duyet() to authenticated;

-- 6. Duyệt / khoá tài khoản (chạy khi cần, thay email):
--   update public.ho_so set duoc_duyet = true  where email = 'nguoidung@cc1.vn';
--   update public.ho_so set duoc_duyet = false where email = 'nguoidung@cc1.vn';   -- khoá
--   update public.ho_so set het_han = '2027-12-31' where email = 'nguoidung@cc1.vn'; -- đặt ngày hết hạn
