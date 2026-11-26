# Giao diện theo nhận diện CC1

Bộ màu, font, logo và biểu tượng của phần mềm. Mọi màu của giao diện nằm ở khối `:root` đầu `css/app.css`; đổi màu chỉ cần sửa các biến ở đó.

## Nguyên tắc

- **Màn hình là bảng tính, màu không được tranh chỗ với số liệu.** Nền và chữ trung tính chiếm gần hết diện tích; xanh CC1 chỉ làm chữ tiêu đề, mục đang chọn, nút chính, nền ô nhập và dấu ✓. Không có khối xanh đặc lớn (đo trên 4 màn hình: màu bão hoà chiếm 0,6 % diện tích, bản dùng khối xanh đặc là 8,5 %).
- **Đạt / không đạt không chỉ dựa vào màu.** Xanh logo và cam đỏ gần như trùng nhau với người mù màu đỏ–lục, nên nhãn luôn có ký hiệu và chữ: `✓ OK` (nền xanh nhạt), `✕` (nền đỏ đặc), `▲` (nền vàng nhạt, viền trái vàng).
- **Chữ đều đạt tương phản ≥ 4,5 : 1** (WCAG AA); ranh giới ô nhập ≥ 3 : 1.

## Màu (biến CSS)

| Biến | Mã | Dùng cho |
|---|---|---|
| `--accent`, `--heading`, `--ok` | `#106B3C` (xanh logo CC1) | tiêu đề trang và thẻ, nhãn nhóm thanh bên, nút chính, vạch trên thanh trên, viền khi bấm vào ô, dấu đạt |
| `--accent-hover` | `#0C5730` | nút khi di chuột |
| `--accent-ink` | `#0E5A32` | chữ trên nền xanh nhạt (mục đang chọn, nhãn OK, thẻ kết luận) |
| `--accent-soft`, `--input-bg`, `--ok-soft` | `#E9F3EC` | nền ô nhập và ô chọn, mục đang chọn, nhãn OK |
| `--input-line` | `#4F8F70` | viền ô nhập (3,4 : 1 trên nền ô) |
| `--ink` | `#1F2623` | chữ chính |
| `--muted` | `#5E6A63` | chữ phụ, ghi chú, đơn vị |
| `--bg`, `--surface` | `#F5F6F5`, `#FFFFFF` | nền trang, thẻ |
| `--line`, `--line-tbl`, `--line-strong` | `#E2E6E3`, `#DDE2DE`, `#C9D0CB` | viền thẻ, kẻ bảng, viền nút phụ |
| `--th`, `--th-soft` | `#F0F3F1`, `#F7F9F8` | tiêu đề bảng, hàng đơn vị, khối công thức |
| `--row-hi` | `#FFF6D6` | dòng bất lợi nhất trong bảng kết quả |
| `--fail`, `--fail-ink`, `--fail-soft`, `--fail-line` | `#C4300B`, `#A82A0A`, `#FDEEE9`, `#F2C3B5` | không đạt, lỗi nhập (đỏ cam của logo `#FF3200` làm sẫm lại cho đủ tương phản) |
| `--warn`, `--warn-ink`, `--warn-soft`, `--warn-line` | `#D49A1F`, `#7A5208`, `#FFF8E6`, `#F0DDA8` | ghi chú lệch so với Excel, cảnh báo |

Màu logo đo trên file logo: xanh `#106B3D`, đỏ cam `#FF3200`. Bộ màu giữ xanh `#106B3C` của nhận diện CC1.

## Khác với slide báo cáo CC1

- Không dùng lục nhấn `#71C431`: logo không có màu này và lục trên nền trắng chỉ đạt 2,18 : 1.
- Tiêu đề bảng nền xám nhạt chữ đậm (slide dùng nền xanh đặc chữ trắng); thẻ kết luận nền nhạt viền trái 4 px (slide dùng khối xanh đặc). Lý do: màn hình làm việc lâu, khối xanh đặc gây chói và phân tán.
- Thẻ nội dung nền trắng trên nền trang xám (slide làm ngược lại).
- Tiêu đề trang viết thường, không viết hoa như slide, vì tên mục dài.

## Font, logo, biểu tượng

- **Font** (`css/fonts.css`, `css/fonts/`): Barlow 400 / 500 / 600 / 700 cho nội dung, Montserrat 600 / 700 cho tiêu đề; Latin + tiếng Việt, file woff2 (khoảng 200 KB), đóng gói kèm app nên chạy được offline. Giấy phép SIL OFL 1.1 (`css/fonts/LICENSE-*.txt`). Lỗi nạp font thì rơi về Segoe UI / font hệ thống.
- **Logo** (`css/img/`): `cc1-logo.png` là bản dùng ở thanh trên, đã bỏ dòng khẩu hiệu "TẬN TÂM VÌ GIÁ TRỊ BỀN VỮNG" vì ở cao 41 px chữ chỉ còn khoảng 3 px; `cc1-logo-goc.png` là file logo gốc đầy đủ. Nếu CC1 có bản logo không khẩu hiệu chính thức thì thay `cc1-logo.png` (cao 82 px trở lên cho màn hình độ phân giải cao).
- **Biểu tượng .exe** (`desktop/icon.svg`): nền xanh `#106B3C`, cẩu trắng, đối trọng đỏ cam `#FF3200`. Tạo lại `icon.png`, `icon.ico` sau khi sửa SVG: `node tools/tao-icon.js desktop` (cần Playwright).

## Không đổi

- Hình vẽ kỹ thuật vẽ bằng mã (mặt bằng đài trong trang Mô hình ETABS, mặt cắt địa chất, biểu đồ tương tác, hình ETABS tự vẽ): giữ màu theo ý nghĩa kỹ thuật; dùng chung với file Word thuyết minh nên không đổi ở đây. Chỉ các lớp CSS của sơ đồ cọc và biểu đồ SPT (`.sd-*`, `.bd-*`) đã chuyển theo bộ màu.
- File Word thuyết minh (màu, font) chưa đổi theo nhận diện này.
