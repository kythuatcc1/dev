-- Giấy phép phần mềm Móng cẩu tháp: đơn vị, hồ sơ người dùng, máy đã đăng ký.
-- Dán toàn bộ vào Supabase → SQL Editor → Run (chạy lại nhiều lần vẫn an toàn).
-- Mọi bảng chỉ cho người dùng ĐỌC dòng của mình; ghi / sửa / xoá chỉ qua Edge Function (service_role) hoặc quản trị trong bảng điều khiển.

create table if not exists public.don_vi (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  loai text not null default 'khach' check (loai in ('noi-bo', 'khach', 'dung-thu')),   -- noi-bo: CC1 (không dấu tên); khach: đơn vị ngoài; dung-thu: khách dùng thử
  bat boolean not null default true,                  -- false: khoá toàn bộ người dùng của đơn vị
  het_han date,                                        -- trống: không hết hạn (chính thức); có ngày: dùng thử / hợp đồng có hạn
  so_may_toi_da int not null default 2,                -- số máy mỗi người
  ghi_chu text default '',
  tao_luc timestamptz not null default now()
);
create table if not exists public.ho_so (
  id uuid primary key references auth.users(id) on delete cascade,
  don_vi_id uuid references public.don_vi(id),
  ho_ten text not null default '',
  bat boolean not null default true,                  -- false: khoá riêng người này
  lan_dang_nhap_cuoi timestamptz,
  tao_luc timestamptz not null default now()
);
create table if not exists public.may (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ma_may text not null,                                -- đã băm ở phần mềm, không phải mã thật của máy
  ten_may text default '',
  lan_dau timestamptz not null default now(),
  lan_cuoi timestamptz not null default now(),
  thu_hoi boolean not null default false,
  unique (user_id, ma_may)
);

alter table public.don_vi enable row level security;
alter table public.ho_so enable row level security;
alter table public.may enable row level security;
alter table public.don_vi force row level security;
alter table public.ho_so force row level security;
alter table public.may force row level security;

drop policy if exists "doc_don_vi_cua_minh" on public.don_vi;
create policy "doc_don_vi_cua_minh" on public.don_vi for select to authenticated
  using (id = (select don_vi_id from public.ho_so where id = auth.uid()));
drop policy if exists "doc_ho_so_cua_minh" on public.ho_so;
create policy "doc_ho_so_cua_minh" on public.ho_so for select to authenticated using (id = auth.uid());
drop policy if exists "doc_may_cua_minh" on public.may;
create policy "doc_may_cua_minh" on public.may for select to authenticated using (user_id = auth.uid());

revoke all on public.don_vi, public.ho_so, public.may from anon, authenticated;
grant select on public.don_vi, public.ho_so, public.may to authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ===== Quản trị (chạy trong SQL Editor khi cần) =====
-- Tạo đơn vị:        insert into public.don_vi (ten, loai) values ('Công ty CC1', 'noi-bo');
--                    insert into public.don_vi (ten, loai, het_han) values ('Khách ABC (dùng thử)', 'dung-thu', current_date + 14);
-- Tạo người dùng:    Authentication → Users → Add user (email + mật khẩu, Auto Confirm), rồi gắn đơn vị:
--                    insert into public.ho_so (id, don_vi_id, ho_ten) select u.id, d.id, 'Nguyễn Văn A' from auth.users u, public.don_vi d
--                      where u.email = 'a@cc1.vn' and d.ten = 'Công ty CC1';
-- Khoá một người:    update public.ho_so set bat = false where id = (select id from auth.users where email = 'a@cc1.vn');
-- Khoá cả đơn vị:    update public.don_vi set bat = false where ten = 'Khách ABC (dùng thử)';
-- Chuyển thử → chính thức: update public.don_vi set loai = 'khach', het_han = null where ten = 'Khách ABC (dùng thử)';
-- Thu hồi một máy:   update public.may set thu_hoi = true where id = '…';
-- Xem máy của đơn vị: select u.email, m.ten_may, m.lan_cuoi, m.thu_hoi from public.may m join auth.users u on u.id = m.user_id;
