# Bước 1 — Phân tích file Excel tính móng cẩu tháp

File gốc: `261005_CC1_Tinh_toan_mong_cau_thap_update_TCVN - LLT5020-10_r00.xlsm`
(Dự án MD3-1, móng cọc cẩu tháp CT1, cẩu LLT5020-10).

File gồm 15 sheet, khoảng 2.000 dòng macro VBA, 11 biểu đồ và nhiều ảnh catalogue cẩu.

---

## 1. Các sheet và vai trò

| # | Sheet | Vai trò | In ra thuyết minh |
|---|-------|---------|:---:|
| 1 | `Bang tra` | Bảng tra: hệ số k, cường độ bê tông/thép, chiều dài neo, γk… | – |
| 2 | `SL Dia chat` | **Nhập địa chất**: các lớp đất (γ, φ, c, IL, e), cao độ lớp theo hố khoan, SPT theo độ sâu, MNN | ✔ |
| 3 | `Bieu do SPT` | Biểu đồ SPT theo độ sâu | ✔ |
| 4 | `SCT Coc nhoi FULL` | **Tính sức chịu tải cọc** (vật liệu + SPT) – bản chi tiết | ✔ |
| 5 | `SCT Coc nhoi` | **Nhập thông số cọc** (D, thép, cao độ, bê tông) + bản tóm tắt SCT | ✔ |
| 6 | `Bieu do tuong tac` | Biểu đồ tương tác N–M tiết diện cọc tròn | ✔ |
| 7 | `Cau thap` | **Sheet chính**: tải cẩu → phản lực cọc → thép đài → bulong → kết luận | ✔ |
| 8 | `Kiem tra tai ngang` | Cọc chịu tải ngang (phụ lục A TCVN 10304): chuyển vị, M, Q, áp lực ngang, ổn định đất | ✔ |
| 9 | `On dinh - Lun` | Móng khối quy ước: áp lực đáy, sức chịu tải nền ở mũi cọc, lún | ✔ |
| 10 | `Kiem tra tai ngang (mo hinh)` | Tổ hợp tải đưa vào **mô hình phần mềm ngoài** (ảnh chụp kết quả) + kiểm tra N–M | ✔ |
| 11 | `New data` | Bảng vật liệu phụ | – |
| 12 | `Data_Picture` | Ảnh catalogue cẩu | – |
| 13 | `CSTT_TCVN 10304_2025` | Ẩn, gần như trống | – |
| 14 | `DATA` | Hệ số theo địa phương, bảng fs/fc theo phương pháp thi công cọc | – |
| 15 | `Solieu` | **Catalogue cẩu** (9 loại cẩu), bảng bê tông, cốt thép, bulong | – |

## 2. Luồng tính toán

```
 SL Dia chat ──► SCT Coc nhoi (nhập cọc) ──► SCT Coc nhoi FULL ──► Qa nén / Qa' kéo
                                                   │                      │
 Solieu (catalogue cẩu, vật liệu) ──► Cau thap ◄───┘──────────────────────┘
                                         │  tải cẩu quy đổi, phản lực cọc,
                                         │  thép đài, bulong, KẾT LUẬN
                                         ├──► Kiem tra tai ngang
                                         ├──► Kiem tra tai ngang (mo hinh) + Bieu do tuong tac
                                         └──► On dinh - Lun
```

## 3. Dữ liệu người dùng nhập

| Nhóm | Thông số | Giá trị trong file |
|---|---|---|
| Dự án | Dự án / Địa điểm / Nhà thầu / Hạng mục | MD3-1 / P. Tân Mỹ, TP.HCM / TCT XD Số 1 / Móng cọc cẩu tháp CT1 |
| Cẩu | Loại cẩu; chiều cao tự đứng | LLT5020-10; 37,5 m |
| Hệ số | Hệ số an toàn n | 1,2 (riêng MC205B = 1,5) |
| Đài | X × Y × H; lớp bảo vệ a | 4 × 3,678 × 1,6 m; 15 cm |
| Vật liệu đài | Bê tông; cốt thép | B35; CB500-V |
| Cọc | Số cọc, tọa độ (xi, yi) | 3 cọc: (−1,2; −0,77), (1,2; −0,77), (0; 1,31) |
| Cọc | D; thép dọc; bê tông; thép | D800; 18Ø22; B35; CB500-V |
| Cọc | Chiều dài; cao độ đáy đài; cao độ đáy hố đào | 33 m; −2,6 m; −13 m |
| Cọc | Phương pháp thi công; cấp công trình | "Cọc Khoan Thả"; III |
| Thép đài | Ø/a lớp dưới, lớp trên (X, Y) | Ø20 a150 cả 4 vị trí |
| Bulong | d; cấp bền; số lượng; L1+L2; L2; L3; fcb; k0 | 42 mm; 8.8; 8; 1700; 300; 250 mm; 395 MPa; 1,35 |
| Địa chất | Hố khoan; MNN; 7 lớp đất (γ, φ, c, IL, e, loại, trạng thái, kích thước hạt); cao độ đỉnh lớp | HK7; −1 m |
| Địa chất | SPT theo độ sâu (bước 2 m) | 31 giá trị, đến −60 m |
| Tải ngang | [Δ], [ψ], A0/B0/C0 | 1 cm; 1°; 2,441 / 1,621 / 1,751 |

## 4. Công thức chính

### 4.1. Tải trọng cẩu (sheet `Cau thap`, mục A)
- Tra catalogue theo **loại cẩu** và **chiều cao tự đứng** (tra gần đúng, lấy hàng có chiều cao ≤ giá trị nhập). Kết quả gồm Fv, M, Fh (làm việc / không làm việc) và mômen xoắn T.
- Tải quy đổi = catalogue × n. Mỗi loại cẩu có công thức quy đổi riêng, ví dụ:
  - LLT5020-10: Nqđ = Fv·n, Mqđ = M·n, Hqđ = Fh·n.
  - MC175B: Mqđ = (MT + CR)·n khi làm việc; khi không làm việc lấy CR nếu MT < 2CR, ngược lại lấy MT − CR.
  - Zoomlion L125.10F: Nqđ = (V + 40)·n.
- Trọng lượng đài: P = 25·X·Y·H·1,1.
- Tải tại đáy đài: Mtt = Mqđ + Hqđ·H; Ptt = Nqđ + P; Htt = Hqđ.

### 4.2. Phản lực cọc (mục B)
- Pi = Ptt/n ± M·cosαi·|xi|/Σx² ± M·sinαi·|yi|/Σy², với αi = atan(|yi|/|xi|).
- Lấy giá trị bất lợi nhất giữa 2 trường hợp làm việc và không làm việc.
- Kiểm tra Pmax ≤ Qa (nén) và Pmin ≥ −Qa' (kéo).

### 4.3. Xuyên thủng đài (mục C)
- **Chỉ có câu khẳng định** "Tháp xuyên bao trùm tất cả các đầu cọc nên không cần kiểm tra", không có phép tính (xem mục 6).

### 4.4. Cốt thép đài (mục D)
- Mômen trên 1 m bề rộng: M = Σ Pi·li / bề rộng đài, trong đó li là khoảng cách từ tim cọc đến mép chân cẩu (Ht/2).
  - Lớp dưới dùng Pmax.
  - Lớp trên dùng phần Pmin < 0 (cọc chịu kéo).
- αm = M/(Rb·b·h0²); ξ = 1 − √(1 − 2αm); As = ξ·Rb·b·h0/Rs; so với thép chọn.

### 4.5. Bulong neo (mục E – TCVN 5575:2024, TCVN 5574:2018)
- Chiều dài neo: H0 = 25·d·(0,66/Rbt)·(fyb/235) ≤ L1 + L2.
- Chịu kéo: Pt = Pct·n/nbl ≤ [N]tb = fba·Abn/k0, với fba = 0,8·fyb.
- Chịu tuột: [N] = π·d·(L1 + L2)·Rbond, với Rbond = η1·η2·Rbt.
- Chịu cắt: Ps = max(Fh/2 + T/Ht ; Fh_klv/2)·n/nbl ≤ [N]vb = fvb·γb·A·nv.
- Ép mặt: [N]cb = fcb·γb·d·Σt.
- Chọc thủng cụm bulong: [P]xt = 0,4·Rbt·L1·π(D1 + D2)/2, với D2 = D1 + 2L1.
- Lực nhổ 1 chân cẩu theo catalogue: Pct = max(M/Ht/√2 − Fv/4) của 2 trường hợp.

### 4.6. Sức chịu tải cọc (sheet `SCT Coc nhoi FULL` – TCVN 10304:2025)
- **Theo vật liệu**:
  - Nén: Rc,u = φ·(γcb·γ'cb·Rb·Ab + Rsc·As), với γcb = 0,85, γ'cb = 0,7.
  - φ tính theo độ mảnh λ = l1/r, trong đó l1 = l0 + 2/αε, αε = (k·bp/EI)^(1/5) và k là trung bình có trọng số theo bảng A.1.
  - Kéo: Rt,u = Rs·As.
- **Theo SPT** (phụ lục D):
  - Nén: Rc,u = qb·Ab + u·Σ(fc,i·li + fs,i·li).
  - Mũi cọc: qb = 120·Np (đất rời) hoặc 6·cu (đất dính), tối đa 9000 kPa. Np là SPT trung bình trong khoảng ±1D quanh mũi cọc.
  - Đất rời: fs = min(2,5·N; 125). Đất dính: fc = min(1,0·cu; 125), với cu = 6,25·N.
  - Mỗi lớp được chia thành các lớp phân tố ≤ 1 m; SPT nội suy theo cao độ.
  - Kéo: Rt,u = u·Σ(…), không kể mũi.
- **Thiết kế**: Nc,d = min(γ0/γn·Rc,k/γk ; Rc,u,vl), với γ0 = 1, γn = 1,2 (cấp III), γk = 1,5.

### 4.7. Tải ngang (sheet `Kiem tra tai ngang` – phụ lục A TCVN 10304)
- H trên 1 cọc = max(Htt)/n/số cọc. Tính δHH, δHM, δMM theo A0, B0, C0, rồi y0, ψ0, Δ, ψ.
- Tính biểu đồ M, Q, σz dọc thân cọc (bảng hệ số theo z̄).
- Kiểm tra ổn định đất quanh cọc: σz ≤ 4η1η2(γ·z·tgφ + ξ·c)/cosφ.

### 4.8. Ổn định – lún (sheet `On dinh - Lun`)
- Lập móng khối quy ước → tính áp lực tiêu chuẩn ở đáy khối → so với sức chịu tải nền ở mặt phẳng mũi cọc → tính lún.

### 4.9. Mô hình + biểu đồ tương tác
- Sheet `(mo hinh)` lập tổ hợp tải để đưa vào **phần mềm phân tích ngoài**; kết quả là ảnh chụp.
- Biểu đồ tương tác N–M của tiết diện tròn được tính bằng VBA (`bdttcttcxdvn`), sau đó kiểm tra điểm (M, N) nằm trong biểu đồ.

## 5. Kết quả hiện tại của file (dùng để đối chiếu app)

| Hạng mục | Giá trị | Giới hạn | Kết quả |
|---|---|---|---|
| Tải quy đổi làm việc (N/M/H) | 956,80 / 3596,75 / 44,90 | – | – |
| Tải quy đổi không làm việc | 794,80 / 5238,83 / 164,42 | – | – |
| Mtt / Ptt (không làm việc) | 5501,91 kNm / 1442,12 kN | – | – |
| Pmax | 3198,53 kN | Qa = 4243,15 | OK |
| Pmin | −2237,12 kN | Qa' = −2534,12 | OK |
| As lớp dưới X / Y | 276,3 / 365,3 mm²/m | 2094,4 | OK |
| As lớp trên X / Y | 206,5 / 263,6 mm²/m | 2094,4 | OK |
| Neo bulong H0 | 1497 mm | 1700 | OK |
| Bulong kéo | 206,7 kN | 438,0 | OK |
| Bulong tuột | 206,7 kN | 393,7 | OK |
| Bulong cắt / ép mặt | 15,2 kN | 414,0 / 746,6 | OK |
| Chọc thủng cụm bulong | 1653,5 kN | 4162,5 | OK |
| SCT cọc vật liệu nén / kéo | 6572,5 / 2976,4 kN | – | – |
| SCT cọc SPT nén / kéo | 7637,7 / 4561,4 kN | – | – |
| Chuyển vị / góc xoay đầu cọc | 0,195 cm / 0,032° | 1 cm / 1° | OK |
| Ổn định đất quanh cọc | σz = 3,62 kPa | 31,36 kPa | OK |

## 6. Điểm bất thường phát hiện trong file — cần bạn xác nhận

1. **h0 thép lớp trên**: ô I82/I83 (sheet `Cau thap`) dùng h0 = H − **50 mm**, trong khi αm ở G82/G83 dùng h0 = H − **150 mm**. Lớp dưới dùng 150 mm ở cả hai chỗ. **App tính giống Excel** và hiển thị ghi chú ⚠ cạnh bảng thép lớp trên, kèm As khi tính thống nhất h0 = H − a (193,15 / 246,58 mm²/m) và h0 = H − 50 (180,66 / 230,61 mm²/m). Kết luận không đổi.
2. **Xuyên thủng đài**: chỉ ghi câu khẳng định, không có phép tính. **Đã chọn: app tính đầy đủ** theo TCVN 5574:2018 mục 8.1.6.2.1 (xem `js/calc/phan-c-xuyen-thung.js`). F là tổng Pimax của các cọc không nằm trọn trong đáy tháp xuyên 45° (cạnh Ht + 2h0); Fb,ult = Rbt·u·h0 với u = 4(Ht + h0). Với số liệu Excel, F = 0, kết luận giống Excel.
3. **Chọc thủng cụm bulong**: công thức trong ô có thêm hệ số **0,4**, nhưng dòng công thức in ra thuyết minh không ghi hệ số này.
4. **Loại cọc**: tiêu đề ghi "cọc khoan nhồi", nhưng phương pháp thi công chọn "**Cọc Khoan Thả**", nên fs = min(2,5N; 125). Với cọc khoan nhồi thì fs = min(3,3N; 165) và fc = min(1,0cu; 100).
5. **η2** trong kiểm tra ổn định đất (sheet `Kiem tra tai ngang`, G128) lấy từ sheet mô hình (= 0,529), không lấy giá trị vừa tính ngay trong sheet (J124 = 0,459).
6. **l0**: SCT cọc dùng l0 = 10,4 m (từ đáy đài −2,6 đến đáy hố đào −13), nhưng `Kiem tra tai ngang` lại dùng l0 = 0.
7. **A0, B0, C0** đang nhập tay cố định (ứng với αε·L ≥ 4). App có thể tự tra bảng theo αε·L.
8. **Cẩu MCT.205** (sheet `Solieu`, ô G78:G82 – chiều cao từ hàng 78 trở đi): Mqđ khi làm việc = √(MV² + MR²) và **không nhân hệ số n**. Các hàng phía trên lại dùng (MV + MR)·n.
9. **Cọc số 4** (sheet `Cau thap`, cột H dòng 59–61): Excel **không có công thức** αi, Pimax, Pimin cho cọc số 4. Nếu móng có từ 4 cọc trở lên, cọc này bị bỏ qua khi tìm Pmax/Pmin, nhưng tọa độ của nó vẫn được cộng vào Σx², Σy². Móng 3 cọc hiện tại không bị ảnh hưởng. **App tính đủ mọi cọc.**
10. **Số cọc n** (ô L47) nhập riêng, không gắn với số tọa độ đã nhập. Nếu hai số này lệch nhau, Ntt/n sẽ sai. **App lấy n bằng số dòng tọa độ cọc.**

## 7. Đề xuất phạm vi và thứ tự làm app

Mỗi giai đoạn chia thành nhiều mục nhỏ; làm xong mục nào thì đối chiếu số với Excel ở mục đó.

| Giai đoạn | Nội dung | Ghi chú |
|---|---|---|
| **GĐ1** | Khung app + thông tin dự án + catalogue cẩu + tải quy đổi | Thay sheet `Solieu` / phần A của `Cau thap` |
| **GĐ2** | Đài cọc: phản lực cọc, thép đài, bulong, kết luận | Nhập tay Qa, Qa' |
| **GĐ3** | Xuất thuyết minh Word cho GĐ1–2 | Có thể dùng sớm |
| **GĐ4** | Địa chất + SCT cọc (vật liệu + SPT) → tự tính Qa, Qa' | Thay `SL Dia chat`, `SCT Coc nhoi (FULL)` |
| **GĐ5** | Tải ngang (phụ lục A) | |
| **GĐ6** | Ổn định – lún móng khối quy ước | |
| **GĐ7** | Biểu đồ tương tác N–M + biểu đồ SPT | |

Phần "mô hình phần mềm ngoài" (ảnh chụp kết quả) không tính lại được trong app. App sẽ cho phép nhập kết quả từ mô hình hoặc đính kèm ảnh.
