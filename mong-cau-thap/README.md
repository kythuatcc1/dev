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
| GĐ11 | Thêm cẩu tháp ngoài catalogue (trang "Thêm cẩu tháp") – xem mục dưới | ✔ |
| GĐ10 | Tính bằng ETABS v22/v23 (xem [docs/02-etabs.md](docs/02-etabs.md)): bước 1 kết nối ✔, bước 2 dựng mô hình ✔, bước 3 tải trọng & tổ hợp ✔, bước 4 phân tích & nội lực, bước 5 chọn phương pháp, bước 6 thuyết minh ETABS (hình nội lực app tự vẽ), bước 7 cập nhật mô hình trong file đang có – cả khi đổi hình học (chiều cao đài, chiều dài cọc, điểm đặt lực, dầm) | đang làm (chờ chạy thử bước 4, 7 trên ETABS thật) |
| GĐ16 | Giao diện theo nhận diện CC1: bộ màu dịu (xanh logo làm chữ tiêu đề, nút chính, ô nhập), giữ font ban đầu, logo ở thanh trên, biểu tượng .exe mới – xem [docs/03-giao-dien-cc1.md](docs/03-giao-dien-cc1.md) | ✔ |
| GĐ15 | Lưu / mở dự án (.mct.json); chia tấm đài đều / tối thiểu / không chia | ✔ |
| GĐ14 | Ảnh chụp thật từ ETABS cho thuyết minh (trang "Hình chụp ETABS": chụp cửa sổ ETABS, cắt vùng mô hình, dán / chọn file) | ✔ (chờ thử chụp trên Windows có ETABS) |
| GĐ13 | Điểm đặt lực cẩu tháp (tâm cẩu / 4 chân, lệch tâm); hình mặt cắt móng và địa chất trên app và thuyết minh | ✔ |
| GĐ12 | Dầm giằng cọc: kích thước, cao độ, thép tuỳ chỉnh; mô hình ETABS; kiểm tra uốn, kéo, nén, cắt, thép theo TCVN 5574:2018 | ✔ (thử với ETABS giả lập) |

## Danh sách cẩu tháp
Ô chọn cẩu ở trang A.1 chia ba nhóm:
- **Catalogue sheet `Solieu`** (9 cẩu, bảng tải theo nhiều chiều cao) – `js/data/cau-thap.js`.
- **Sheet `New data`** (55 cẩu, mỗi cẩu MỘT chiều cao tự đứng) – `js/data/cau-thap-new-data.js`. N, M lấy theo nhóm cột
  "Calculation" (AG, AH làm việc; AJ, AK không làm việc – đã gộp CR, MT theo quy tắc từng cẩu), H = ET (Z, AE), mômen xoắn CTM (AA),
  lực nhổ 1 chân = max(AM, AN), đường kính cụm bulong AQ (thiếu thì lấy 0,4 m), tay cần AU; Σt bản thép chưa có trong sheet – lấy 40 mm.
  Hệ số n như ô P15 của Excel (1,5 chỉ cho cẩu tên đúng "MC205B" của sheet Solieu, còn lại 1,2).
- **Cẩu tự thêm** (xem mục dưới).

Hai nhóm đầu sinh từ file Excel bằng `python3 -I tools/trich-du-lieu-excel.py excel-goc/<file>.xlsm`; test `tests/phan-a.test.js`,
`tests/cau-new-data.test.js` đối chiếu với ô Excel (`tests/excel-tham-chieu.json`).

## Thêm cẩu tháp chưa có trong catalogue
Cẩu chưa có trong hai sheet trên thì thêm ngay trong app,
trang **Thêm cẩu tháp** (hoặc nút "+ Thêm cẩu chưa có trong danh sách" ở trang A.1):

1. Nhập tên cẩu, loại cẩu, chiều dài tay cần, bề rộng thân H<sub>t</sub>, đường kính cụm bulong D<sub>1</sub>, tổng chiều dày bản thép Σt,
   hệ số an toàn n, lực nhổ 1 chân cẩu (để trống: tự tính như Excel). Có thể bấm "Sao chép" để lấy một cẩu có sẵn làm mẫu.
2. Chọn **lực cẩu trong catalogue** (như file `nhap_so_lieu.xlsx`, sheet TSC):
   - *Catalogue cho đủ nội lực N, M, H (Q)* (Cách 2) – nhập thẳng;
   - *Catalogue chỉ cho phản lực chân F1 (nhổ), F2 (nén) và Q* (Cách 1) – app quy đổi theo bề rộng thân H<sub>t</sub>:
     N = 2·(F2 − F1), M = (F1 + F2)·H<sub>t</sub>/√2; Q để trống thì Q<sub>KLV</sub> = 10 %·M<sub>KLV</sub>, Q<sub>LV</sub> = 70 %·Q<sub>KLV</sub>
     (khớp ô Y48:AD48 của file Excel). Phản lực gốc lưu kèm cẩu (sửa lại được); thuyết minh in bảng quy đổi của dòng tính toán.
   Chọn cách quy đổi: N × n hoặc (N + 40) × n; M × n hoặc có thêm mômen CR (như MC175B – chỉ khi nhập nội lực); mômen xoắn T một giá trị /
   theo từng chiều cao / không có.
3. Nhập bảng tải chân đế theo chiều cao tự đứng (kN, kNm) – gõ từng ô hoặc dán cả bảng từ Excel (thứ tự cột hiện ngay trên ô dán:
   H, LV N M H …; hoặc H, LV F1 F2 Q, KLV F1 F2 Q khi nhập phản lực).
4. Xem phần "Kiểm tra số liệu" (lỗi nhập, tải quy đổi từng chiều cao) rồi bấm **Lưu cẩu** hoặc **Lưu và dùng cho móng này**.

Cẩu tự thêm lưu trên máy (dùng chung mọi móng), hiện trong ô chọn cẩu ở trang A.1 với chữ "tự thêm" và được tính, xuất thuyết minh,
dựng mô hình ETABS như cẩu có sẵn. **Xuất file cẩu (.json)** / **Nhập file cẩu…** để chép sang máy khác. Móng đang dùng cẩu tự thêm
lưu kèm số liệu cẩu đó, nên nếu thư viện trên máy bị xoá app tự khôi phục. Mã: `js/calc/cau-tu-them.js`, test `tests/cau-tu-them.test.js`.

## Cấu trúc
```
index.html               giao diện
css/app.css              màu, bố cục (bộ màu CC1 ở khối :root); css/img/ logo CC1
js/data/                 dữ liệu trích từ Excel (tự sinh, không sửa tay)
js/calc/                 phần tính toán, mỗi file ứng với một mục trong Excel
js/app.js                điều khiển giao diện
tests/                   test đối chiếu với giá trị Excel (excel-tham-chieu.json)
js/bieu-do.js            biểu đồ SVG dùng chung (SPT, M/Q/σz, tương tác) – giao diện và thuyết minh
js/bieu-do-etabs.js      hình vẽ từ kết quả ETABS cho thuyết minh (mô hình 3D, tải, nội lực cọc / đài / dầm, chuyển vị)
js/bieu-do-mat-cat.js    mặt cắt móng và địa chất (cao độ đài, cọc, lớp đất có ghi chú)
js/hinh-chup.js          ảnh chụp ETABS / ảnh tải lên cho thuyết minh: danh mục vị trí hình, lưu IndexedDB, cắt ảnh
js/du-an.js              lưu / mở dự án (.mct.json): thông số, kết quả ETABS, ảnh chụp
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

## Lưu / mở dự án
Nút **Lưu dự án** (thanh trên, hoặc Ctrl+S) lưu toàn bộ thông số đang nhập, kết quả ETABS đã lấy và (tuỳ chọn) ảnh chụp ETABS ra một file
`.mct.json`; **Mở dự án** mở lại file đó (trên máy này hoặc máy khác), **Dự án mới** (trang Thông tin dự án) trở về số liệu mặc định.
Cẩu tự thêm dùng cho móng được lưu kèm và tự khôi phục khi mở. File dự án bản cũ thiếu thông số mới thì thông số đó lấy mặc định
(`js/du-an.js`, test `tests/du-an.test.js`).

## Xuất thuyết minh
Bấm **Xuất thuyết minh** ở góc trên. File .docx trình bày theo thuyết minh mẫu
`260917_MD3-1_THUYET_MINH_MCT_VN.pdf`. Khi mở trong Word, chọn **Yes** khi được hỏi
cập nhật trường dữ liệu để điền mục lục. Hình mặt bằng và catalogue cẩu để ô trống để dán hình.
Phương pháp ETABS: các hình nội lực (mô hình 3D, tải tại tâm đài, Bảng 4.1/4.2, chuyển vị, mômen / lực cắt đài, dầm giằng)
dùng ảnh chụp thật từ ETABS ở trang **Hình chụp ETABS** (chụp cửa sổ ETABS, cắt vùng mô hình, hoặc dán / chọn file); vị trí chưa
có ảnh dùng hình app vẽ từ kết quả ETABS (hoặc để ô trống). Ảnh catalogue, hố khoan, mặt bằng cũng thêm ở trang này.

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
