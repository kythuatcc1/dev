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
| GĐ4 | Địa chất + sức chịu tải cọc | |
| GĐ5 | Cọc chịu tải ngang | |
| GĐ6 | Ổn định – lún | |
| GĐ7 | Biểu đồ tương tác, biểu đồ SPT | |

## Cấu trúc
```
index.html               giao diện
css/app.css
js/data/                 dữ liệu trích từ Excel (tự sinh, không sửa tay)
js/calc/                 phần tính toán, mỗi file ứng với một mục trong Excel
js/app.js                điều khiển giao diện
tests/                   test đối chiếu với giá trị Excel (excel-tham-chieu.json)
js/bao-cao/              tạo thuyết minh Word (.docx)
vendor/                  thư viện docx 9.15.3 (MIT) – tạo file Word ngay trong trình duyệt, không cần mạng
tools/                   script trích dữ liệu từ file Excel
```

## Xuất thuyết minh
Bấm **Xuất thuyết minh** ở góc trên. File .docx trình bày theo thuyết minh mẫu
`260917_MD3-1_THUYET_MINH_MCT_VN.pdf`. Khi mở trong Word, chọn **Yes** khi được hỏi
cập nhật trường dữ liệu để điền mục lục. Hình mặt bằng và catalogue cẩu để ô trống để dán hình.

## Kiểm tra
```
npm test                 # chạy test đối chiếu với Excel (cần Node.js 18+)
npm run trich-du-lieu    # trích lại dữ liệu từ file Excel (cần Python + openpyxl)
```
