# Đài móng 3 cọc vát góc

Móng 3 cọc mặc định dùng đài **vát 2 góc phía cọc đơn** (hình lục giác bao theo cọc) thay cho chữ nhật X × Y. Móng 1–2 cọc và từ 4 cọc trở lên giữ đài chữ nhật X × Y như Excel. Móng 3 cọc vẫn chọn lại được chữ nhật (A.3 → "Hình dạng đài (móng 3 cọc)").

Hình đài tính ở `js/calc/hinh-dai.js` (`MCT.calc.hinhDai`), dùng thật trong mọi phép tính, mô hình ETABS, hình vẽ và thuyết minh.

## Các quyết định đã chốt với người dùng

| Câu hỏi | Chọn |
|---|---|
| Kích thước vát | Tự tính, cho sửa tay a × b |
| Vị trí đài | Đài bao theo cọc (khoảng bao cọc ± c); tâm cẩu có thể lệch tâm đài |
| Hình dùng cho | Mọi phép tính, kể cả mô hình ETABS |
| Thuyết minh | Chỉ sửa các phần liên quan tới hình đài 3 cọc; đài chữ nhật giữ nguyên từng byte |
| X, Y bao | Tự tính, vẫn cho sửa tay |
| Bố trí cọc | Thêm nút "Bố trí 3 cọc tam giác đều" ở mục B |
| 1–2 cọc, ≥ 4 cọc | Giữ như hiện nay (chữ nhật) |

## Hình học

Hệ trục như toạ độ cọc mục B (gốc tại tâm cẩu, x sang phải, y lên trên, m).

- **Hàng 2 cọc và cọc đơn**: cặp cọc có đường nối gần song song trục x hoặc y nhất là hàng 2 cọc; cọc còn lại là cọc đơn, nằm về một phía `+y`, `-y`, `+x` hoặc `-x`.
- **c**: khoảng cách tim cọc tới mép đài, mặc định c = D (`dai.cTheo = 'D'`), hoặc nhập tay (`'nhap'`, `dai.c`).
- **Chữ nhật bao**: X = khoảng bao cọc theo x + 2c, Y = khoảng bao cọc theo y + 2c (`dai.cachXY = 'tu-tinh'`). Nếu nhập tay (`'nhap'`), X × Y được đặt giữa khoảng bao cọc.
- **Vát tự tính** (`dai.cachVat = 'tu-tinh'`): mỗi góc phía cọc đơn được cắt bởi đường song song với đường nối cọc đơn và cọc cùng phía của hàng 2 cọc, cách tim hai cọc đó đúng c. Nhờ vậy mọi cọc cách mép đúng c.
- **Vát nhập tay** (`'nhap'`): a đo dọc cạnh phía cọc đơn, b đo dọc cạnh bên, tính từ góc chữ nhật bao. Hai góc vát bằng nhau.
- **Kiểm tra**:
  - Báo lỗi nếu tim cọc cách mép < D/2 (cọc ra ngoài đài).
  - Báo lỗi nếu 2a ≥ cạnh phía cọc đơn, hoặc b ≥ cạnh bên.
  - Cảnh báo nếu tim cọc cách mép < c.
  - Cảnh báo nếu góc chân cẩu (hình vuông H<sub>t</sub>) nằm ngoài đài.
- Kết quả: đa giác lồi ngược kim đồng hồ `dinh`, diện tích `dienTich` (công thức shoelace), trọng tâm `trongTam`, kích thước vát thực `vat[{a, b}]`, khoảng cách từng cọc tới mép `mepCoc`.
- Tiện ích dùng chung:
  - `hinhDai.doanCat(hd, 'x' | 'y', t)`: bề rộng đài trên đường x = t hoặc y = t.
  - `khoangCachMep(hd, x, y)`: khoảng cách có dấu, dương khi ở trong đài.
  - `catDaGiac(p, k)`: cắt đa giác bằng thuật toán Sutherland–Hodgman.
  - `dienTich(p)`, `kiemTraChanCau`, `boTri3Coc(s, phia)`.

Số liệu mặc định (cọc D800 tam giác đều cạnh 2,4 m, cọc đơn phía +y):

| Tham số | Giá trị |
|---|---|
| Chữ nhật bao | 4,000 × 3,680 m |
| Vát tự tính | 1,538 × 2,666 m |
| Diện tích đài | 10,62 m² (ít hơn chữ nhật bao ≈ 28 %) |
| Khoảng cách mọi cọc tới mép | 0,80 m |

Với vát nhập tay 1,355 × 1,701 m như bản vẽ, diện tích đài là 12,415 m².

**Bố trí nhanh** (`boTri3Coc`): 3 cọc tam giác đều cạnh s, trọng tâm nhóm cọc tại tâm cẩu, cọc đơn theo hướng chọn (`coc.boTri.s`, `coc.boTri.phia`). Nút này ghi đè toạ độ cọc và hỏi xác nhận trước.

## Ảnh hưởng tới tính toán

| Phần | Đài vát | Đài chữ nhật |
|---|---|---|
| A.4 trọng lượng đài | P = 25·A·H·1,1 (A = diện tích đài vát) | P = 25·X·Y·H·1,1 |
| B tải trọng lên cọc | dùng P mới | như cũ |
| D thép đài | mômen mỗi phía = Σ P<sub>i</sub>·khoảng cách / bề rộng đài thật tại mặt cắt mép chân cẩu (x, y = ±H<sub>t</sub>/2), tính riêng 4 phía; lớp dưới lấy lớn nhất, lớp trên lấy nhỏ nhất (`kq.D.beRong`) | chia cho Y (hoặc X) |
| Lún (móng khối quy ước) | trọng lượng đài theo diện tích thật; kích thước khối quy ước vẫn theo X, Y bao | như cũ |
| C xuyên thủng, E bulong | không đổi | không đổi |

## Mô hình ETABS (`js/calc/etabs-mo-hinh.js`)

- **Lưới tấm đài**: đường lưới đi qua mép chữ nhật bao, các đỉnh đa giác, trọng tâm đài, tâm cọc, tâm cẩu và chân cẩu. Mỗi ô lưới được cắt theo đa giác đài:
  - Ô ngoài đài bị bỏ.
  - Ô có cạnh vát đi qua thành tam giác, tứ giác hoặc ngũ giác (`AreaObj.AddByPoint` nhận số điểm bất kỳ).
  - Đỉnh nằm trên cạnh vát mà không trùng nút lưới được đặt tên `D0_<k>` và dùng chung cho các ô kề nhau, nên lưới liền, không có nút treo.
  - Mảnh vụn < 2 % diện tích ô bị bỏ, làm mép đài khuyết khoảng 0,001 m².
  - Chỉ tạo nút lưới nằm trong đài.
- **Không chia tấm đài**: một ô vỏ theo đúng đa giác (6 đỉnh). Đầu cọc, tâm cẩu và tâm đài là điểm riêng trong tấm.
- **Nút "tâm đài"** (lấy chuyển vị) đặt ở trọng tâm hình đài. Với số liệu mặc định đó là (0; −0,097), lệch về phía hàng 2 cọc.
- **Kiểm tra vị trí theo đa giác**: báo lỗi nếu cọc, tâm cẩu hoặc chân cẩu nằm ngoài đa giác, kể cả khi vẫn nằm trong chữ nhật bao.
- **`thongSo` có thêm**: `kieuDai` ('vat' | 'chu-nhat'), `x0, x1, y0, y1` (chữ nhật bao), `tamDai`, `dinhDai`, `dienTichDai`. Đài chữ nhật vẫn dựng như cũ.
- **Mặt cắt đài từ nội lực ETABS** (`etabs-ket-qua.js`): một đường cắt chỉ được dùng khi có nút trải ≥ 90 % bề rộng **thật** của đài tại vị trí cắt (`doanCat`). Nhờ vậy các mặt cắt đi qua phần vát cũng được dùng; b của mặt cắt là bề rộng thật.

## Hình vẽ và thuyết minh

- **App**:
  - Thẻ hình đài ở A.3: bảng số liệu và sơ đồ cọc trên đài vát.
  - Mục B: nút bố trí nhanh.
  - Mục D: ghi chú bề rộng 4 phía.
  - Mặt bằng đài trong trang Mô hình ETABS: ô lưới cắt theo đài; bảng "Mô hình sẽ dựng" ghi kích thước bao và diện tích.
  - Mặt cắt móng ghi "ĐÀI VÁT (bao)".
- **Hình ETABS tự vẽ** (`js/bieu-do-etabs.js`) đều vẽ theo đa giác: mô hình 3D, tải trọng trên đài, mômen và lực cắt đài, chuyển vị.
  - Ô màu nội lực được cắt theo đa giác.
  - Các đường chỉ có 1 nút (nút trên cạnh vát) không dùng làm lưới màu.
- **Thuyết minh Word**:
  - A.4: thêm c, X × Y bao, vát a × b, diện tích A, P = 25·A·H·1,1, và hình "Mặt bằng đài móng 3 cọc vát góc" (`MCT.bieuDo.matBangDaiVat`).
  - D: ghi chú chia mômen cho bề rộng thật.
  - Phần 5 (lún): trọng lượng đài theo diện tích.
  - Phần ETABS: mô tả đài và tấm vỏ.
  - Thuyết minh của đài chữ nhật (≥ 4 cọc, hoặc 3 cọc chọn chữ nhật) giống hệt bản trước từng byte. Đã so cả bản giải tích và bản ETABS.

## Kiểm thử

| File | Nội dung |
|---|---|
| `tests/hinh-dai.test.js` | Hình học, vát tự tính và nhập tay, bố trí nhanh 4 hướng, đoạn cắt, P / B / D / lún theo đài vát |
| `tests/etabs-mo-hinh.test.js` | Lưới cắt theo đa giác (3 cách chia, cọc đơn −x, 4 chân cẩu); Σ diện tích ô vỏ = diện tích đài; không nút treo; báo lỗi ngoài đa giác |
| `tests/etabs-ket-qua.test.js` | Mặt cắt đài vát lấy bề rộng thật |
| `desktop/etabs/thu-cau-noi.js` | ETABS giả lập: cập nhật sang đài vát (ô 3/4/5 điểm, nút `D0_<k>`); dựng đài vát, chia tối thiểu; phân tích |
