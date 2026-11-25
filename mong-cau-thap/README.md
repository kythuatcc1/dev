# Móng cẩu tháp

App tính toán móng cọc cẩu tháp, chuyển từ file Excel
`excel-goc/261005_CC1_Tinh_toan_mong_cau_thap_update_TCVN-LLT5020-10_r00.xlsm`.
App tính giống hệt Excel trước; các điểm bất thường trong Excel được ghi ở
[docs/01-phan-tich-excel.md](docs/01-phan-tich-excel.md), mục 6.

## Cách dùng
Mở file `index.html` bằng trình duyệt (Chrome, Edge, Safari…), không cần cài đặt hay mạng.
Ô nền vàng là ô nhập liệu. Số liệu tự lưu trên trình duyệt đang dùng.

## Tiến độ
| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| GĐ1 | Catalogue cẩu, tải quy đổi, vật liệu & kích thước đài (mục A sheet `Cau thap`) | ✔ |
| GĐ2 | Phản lực cọc, xuyên thủng, thép đài, bulong, kết luận (mục B → F sheet `Cau thap`) | ✔ |
| GĐ3 | Xuất thuyết minh Word theo mẫu MD3-1: khung, chương I, Phần 2 mục A → F | ✔ |
| GĐ4 | Địa chất + sức chịu tải cọc (vật liệu, SPT, thiết kế → Qa, Qa' tự động) | ✔ |
| GĐ5 | Cọc chịu tải ngang (chuyển vị, M, Q, σz, chịu cắt, ổn định đất) | ✔ |
| GĐ6 | Ổn định – lún (móng khối quy ước, R theo TCVN 9362, lún cộng lớp) | ✔ |
| GĐ7 | Biểu đồ tương tác, biểu đồ SPT | ✔ |
| GĐ8 | Thuyết minh toàn bộ: Phần 1 SCT cọc, Phần 2 A → F, Phần 3 tải ngang, Phần 4 tương tác, Phần 5 ổn định – lún (kèm biểu đồ) | ✔ |
| GĐ9 | Đóng gói chương trình Windows (.exe) bằng Electron | ✔ |
| GĐ10 | Tính bằng ETABS v22/v23 (xem [docs/02-etabs.md](docs/02-etabs.md)): bước 1 kết nối ✔, bước 2 dựng mô hình | đang làm |

## Cấu trúc
```
index.html               giao diện
css/app.css
js/data/                 dữ liệu trích từ Excel (tự sinh, không sửa tay)
js/calc/                 phần tính toán, mỗi file ứng với một mục trong Excel
js/app.js                điều khiển giao diện
tests/                   test đối chiếu với giá trị Excel (excel-tham-chieu.json)
js/bieu-do.js            biểu đồ SVG dùng chung (SPT, M/Q/σz, tương tác) – giao diện và thuyết minh
js/bao-cao/              tạo thuyết minh Word (.docx)
vendor/                  thư viện docx 9.15.3 (MIT) – tạo file Word ngay trong trình duyệt, không cần mạng
tools/                   script trích dữ liệu từ file Excel
desktop/                 đóng gói thành chương trình Windows .exe (Electron)
```

## Chương trình Windows (.exe)
Có thể đóng gói app thành chương trình Windows chạy độc lập (dùng Electron, không cần trình duyệt, không cần mạng):

1. Cài [Node.js](https://nodejs.org) bản 18 trở lên.
2. Mở cửa sổ lệnh tại thư mục `mong-cau-thap` và chạy:
   ```
   npm run dong-goi-exe
   ```
   Lần đầu sẽ tải Electron (khoảng 100 MB).
3. Kết quả: thư mục `desktop/dist/MongCauThap-win32-x64/`. Chạy file `MongCauThap.exe` trong đó.
   Muốn chuyển sang máy khác thì nén cả thư mục này, gửi đi, giải nén rồi chạy `MongCauThap.exe`.

Ghi chú:
- Lệnh đóng gói chạy được trên Windows, macOS hoặc Linux (không cần Wine).
- Chương trình chưa có chữ ký số nên lần đầu chạy Windows có thể hiện cảnh báo SmartScreen:
  bấm **More info → Run anyway** (Thông tin thêm → Vẫn chạy).
- Số liệu nhập lưu tại `%APPDATA%\MongCauThap`, riêng với số liệu khi mở `index.html` bằng trình duyệt.
- Khi sửa code app (`index.html`, `css`, `js`) cần chạy lại lệnh đóng gói để cập nhật file .exe.
- Mã nguồn vỏ chương trình ở `desktop/` (`main.js`: cửa sổ, menu, hộp thoại lưu thuyết minh, kết nối ETABS; `preload.js`: cầu nối trang app; `etabs/MctEtabs/`: cầu nối C# (.NET 8) gọi API ETABS, bản đã biên dịch ở `etabs/cau-noi-etabs/`; `dong-goi.js`: lệnh đóng gói; `icon.svg`: biểu tượng).

## Xuất thuyết minh
Bấm **Xuất thuyết minh** ở góc trên. File .docx trình bày theo thuyết minh mẫu
`260917_MD3-1_THUYET_MINH_MCT_VN.pdf`. Khi mở trong Word, chọn **Yes** khi được hỏi
cập nhật trường dữ liệu để điền mục lục. Hình mặt bằng và catalogue cẩu để ô trống để dán hình.

Nội dung thuyết minh: chương I (giới thiệu, cơ sở, tiêu chuẩn), Phần 1 sức chịu tải cọc
(địa chất + biểu đồ SPT, vật liệu, SPT, Qa/Qa' thiết kế), Phần 2 móng cẩu tháp mục A → F,
Phần 3 cọc chịu tải ngang (bảng và biểu đồ M, Q, σz), Phần 4 biểu đồ tương tác,
Phần 5 ổn định nền và lún. Biểu đồ được chèn dạng ảnh PNG tạo ngay trong trình duyệt.
Các ghi chú sai khác so với Excel chỉ hiện trên app, không in vào thuyết minh.
Phần gông cẩu và kingpost của mẫu MD3-1 dùng kết quả mô hình ETABS, không có trong Excel nên chưa đưa vào.

## Kiểm tra
```
npm test                 # chạy test đối chiếu với Excel (cần Node.js 18+)
npm run trich-du-lieu    # trích lại dữ liệu từ file Excel (cần Python + openpyxl)
```
