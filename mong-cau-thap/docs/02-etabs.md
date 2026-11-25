# Tính móng cẩu tháp bằng ETABS

Chức năng thứ hai bên cạnh cách tính giải tích theo Excel CC1: app tự dựng mô hình trong ETABS v22/v23,
gán tải trọng catalogue, chạy phân tích, lấy nội lực về kiểm tra theo đúng form CC1.
File `260917_MD3_1_BCTT_mong_cau_thap_FULL.pdf` (Nam Phát) chỉ dùng để tham khảo cách mô hình hoá và tổ hợp;
thuyết minh vẫn theo form CC1.

## Các quyết định đã chốt với người dùng
| Nội dung | Chốt |
|---|---|
| Mô hình | App tự dựng toàn bộ từ thông số (đài, cọc, lò xo đất, vật liệu); đổi thông số là dựng lại |
| Tổ hợp | 32 tổ hợp như PDF (8 hướng mỗi 45°, làm việc / không làm việc, tĩnh tải 1,1 cọc nén – 0,9 cọc kéo, tải cẩu × n) **cộng** các hướng bất lợi theo góc α của mục B |
| Thuyết minh | Nút chọn phương pháp "Giải tích (Excel)" hoặc "ETABS"; chọn ETABS thì mục B, tải ngang, thép đài dùng nội lực ETABS |
| Lò xo đất | Tự tính từ hệ số k (kN/m⁴) bảng A.1 TCVN 10304 như phần tải ngang, mỗi 1 m: K = k·z·b<sub>p</sub>·Δz |
| Cao độ bắt đầu lò xo | Cho chọn trong app: (a) từ đáy đài – móng đài thấp, chưa đào (**mặc định**, như PDF và phần tải ngang form CC1); (b) từ đáy hố đào (đầu cọc tính toán −13 m), đoạn cọc phía trên không có đất giữ |
| Mũi cọc | Gối chặn chuyển vị đứng; phương ngang do lò xo đất giữ |
| Điểm đặt tải cẩu | **Một điểm ở tâm đài như file PDF** (đổi theo yêu cầu, bỏ phương án 4 chân cẩu + liên kết cứng) |

## Cách kết nối
ETABS chỉ chạy trên Windows và chỉ cho điều khiển qua API, trình duyệt không gọi được.
Vì vậy chức năng này chỉ có trong chương trình `MongCauThap.exe` (Electron):

```
Trang app (js/app.js) ──window.mctDesktop.etabs(yêu cầu)──► desktop/preload.js
   ──IPC──► desktop/main.js ──chạy──► dotnet MctEtabs.dll (cầu nối C#, .NET 8)
   ──nạp ETABSv1.dll của bản ETABS đang cài, gắn vào phiên ETABS đang mở──► ETABS v23
```
- **Vì sao .NET 8:** thư viện API của ETABS 22+ (`ETABSv1.dll`, .NET Standard 2.0) khi nạp trong .NET Framework
  (PowerShell 5.1 – cách làm lần đầu) trả về lớp bọc `ETABSv1.wOAPI` rỗng: gọi hàm nào cũng `NullReferenceException`
  (đã gặp trên máy thật với ETABS 23, API 2.14). ETABS 22+ đã cài sẵn .NET 8 Desktop Runtime nên không cần cài thêm.
- Cầu nối `desktop/etabs/MctEtabs/` (C#) không tham chiếu ETABSv1.dll lúc biên dịch: lúc chạy nạp đúng thư viện của
  bản ETABS đang mở (theo đường dẫn tiến trình, hoặc `C:\Program Files\Computers and Structures\ETABS xx`) và gọi qua reflection.
- `runtimeconfig.json` khai báo cả `Microsoft.NETCore.App` và `Microsoft.WindowsDesktop.App` (giống môi trường của ETABS);
  máy thiếu Desktop Runtime thì chương trình tự chạy lại bằng `MctEtabs.coban.runtimeconfig.json` (chỉ .NET cơ bản).
- Gắn vào phiên ETABS theo thứ tự, **cách nào cũng phải gọi được hàm thật mới nhận**:
  `Helper.GetObject` → `Helper.GetObjectProcess(PID)` → đối tượng COM lấy thẳng từ bảng ROT (gọi theo tên hàm qua IDispatch).
- **Lỗi đã gặp trên máy thật (ETABS 23, API 2.14), cả .NET Framework lẫn .NET 10:** gọi thẳng COM thì `GetOAPIVersionNumber`
  được (2.014), nhưng lấy `SapModel` báo `E_NOINTERFACE (0x80004002)`; lớp bọc của ETABSv1.dll có `m_objInner (cOAPI) = null`.
  Nghĩa là Windows thiếu đăng ký giao diện API (type library) nên không chuyển được đối tượng API giữa ETABS và chương trình khác.
  Cách sửa: chạy `RegisterETABS.exe` bằng quyền Administrator, hoặc nút **Đăng ký giao diện ETABS cho tài khoản này**
  (lệnh `dang-ky-giao-dien`: `RegisterTypeLibForUser` với file .tlb trong thư mục ETABS, ghi vào HKCU, gỡ được bằng `go-dang-ky-giao-dien`).
  Lần thử sau (ETABS chạy bằng Run as administrator): Windows chặn ROT (MK_E_UNAVAILABLE); chẩn đoán cho thấy giao diện
  cOAPI/cSapModel/cFrameObj **chưa đăng ký** trong registry và thư mục ETABS 23 **không có file .tlb** → cần chạy
  `RegisterETABS.exe` bằng quyền Administrator rồi mở ETABS bình thường. Cầu nối tìm thêm type library nhúng trong .dll/.exe.
  Cầu nối ghi chẩn đoán chi tiết (`chanDoanCom`): giao diện cOAPI/cSapModel trong registry, QueryInterface trên đối tượng ETABS,
  ETABS tự mô tả qua IDispatch, LIBID và trạng thái đăng ký của file .tlb, IID trong .tlb có khớp ETABSv1.dll không.
- Khi không gắn được, cầu nối tự chẩn đoán và app hiện lời khuyên: ETABS chưa mở, khác quyền Administrator,
  ProgID chưa đăng ký (chạy `RegisterETABS.exe`), ETABS không có trong bảng ROT, thiếu .NET 8, chưa mở mô hình.
- Trao đổi qua file JSON tạm (UTF-8) nên đường dẫn tiếng Việt giữ nguyên.

### Biên dịch và thử cầu nối (máy build, cần .NET SDK 8)
```
cd desktop
npm run build-cau-noi     # → etabs/cau-noi-etabs/ (đã có sẵn trong kho, chỉ cần chạy lại khi sửa mã C#)
npm run thu-cau-noi       # thử với ETABSv1.dll giả lập (etabs/gia-lap): bình thường, lớp bọc rỗng, chưa mở mô hình…
```
Chạy cầu nối bằng tay trên máy có ETABS (in kết quả ra màn hình), trong thư mục chương trình đã giải nén:
```
"C:\Program Files\dotnet\dotnet.exe" resources\cau-noi-etabs\MctEtabs.dll --lenh kiem-tra
```

## Các bước
| Bước | Nội dung | Trạng thái |
|---|---|---|
| 1 | Kết nối: trang "Kết nối ETABS", lệnh `kiem-tra` (phiên bản, file mô hình, đơn vị, số phần tử, load pattern) | ✔ Đã chạy trên máy thật (ETABS 23.2.0, API 2.014) sau khi chạy RegisterETABS.exe bằng quyền Administrator |
| 2 | Dựng mô hình (lệnh `dung-mo-hinh`, trang "Mô hình ETABS", `js/calc/etabs-mo-hinh.js`) | ✔ Chạy trên máy thật (ETABS 23, MC205B: 51 tầng, 202 điểm, 153 thanh, 36 ô vỏ, 117 lò xo, 4,3 giây) |
| 3 | Tải trọng & tổ hợp (trang "Tải trọng & tổ hợp", gán cùng lệnh `dung-mo-hinh`) | ✔ Chạy trên máy thật (12 load pattern, 49 tổ hợp) |
| 4 | Chạy phân tích, lấy nội lực (lệnh `phan-tich`, trang "Kết quả ETABS", `js/calc/etabs-ket-qua.js`) | Đã làm (thử với ETABS giả lập) – chờ chạy thử trên máy thật |
| 5 | Chọn phương pháp (Giải tích / ETABS) cho kết luận; B, D, tải ngang, tương tác dùng nội lực ETABS | Đã làm |
| 6 | Thuyết minh form CC1 cho phương pháp ETABS (nội dung các mục kiểm tra trình bày như PDF tham khảo) | Đã làm |
| 7 | Tự cập nhật: đổi thông số – **kể cả hình học** (chiều cao đài, chiều dài cọc, lưới, điểm đặt lực, dầm giằng) → **cập nhật mô hình trong file đang có** (lệnh `cap-nhat-mo-hinh`), chạy lại, lấy kết quả | Đã làm (thử với ETABS giả lập) – chờ chạy thử trên máy thật |
| + | Điểm đặt lực cẩu tháp: một điểm tại tâm cẩu hoặc chia về 4 chân; tâm cẩu lệch tâm đài | Đã làm |
| + | Hình mặt cắt móng và địa chất (cao độ đài, cọc, lớp đất có ghi chú) trên app và thuyết minh | Đã làm |
| + | Ảnh chụp thật từ ETABS (chụp cửa sổ / màn hình, dán, chọn file, cắt vùng) đặt vào các vị trí hình của thuyết minh | Đã làm – chờ thử chụp trên Windows có ETABS |
| + | Dầm giằng cọc (số liệu, mô hình, nội lực, kiểm tra TCVN 5574:2018, thuyết minh 6.4) | Đã làm (thử với ETABS giả lập) |
| + | Hình nội lực app tự vẽ từ kết quả ETABS, chèn vào các ô dán hình của thuyết minh | Đã làm |

## Bước 2 – mô hình app tự dựng (`js/calc/etabs-mo-hinh.js`)
- **Gốc toạ độ:** tâm đài = tâm cẩu (như toạ độ cọc mục B); Z = cao độ so với MĐTN; đơn vị kN, m.
- **Đài:** tấm vỏ dày (`ShellThick`, tiết diện `DAI`, dày H) đặt ở mặt phẳng giữa đài; lưới chia ≤ 0,25 m (chỉnh được),
  đường lưới đi qua tâm cọc, 4 chân cẩu, tâm đài và mép đài – cọc và chân cẩu nối đúng nút của tấm.
- **Cọc:** thanh tròn D (`COC`), nút ở đáy đài rồi mỗi 1 m (chỉnh được) tới mũi; đoạn từ giữa đài tới đáy đài là
  thanh cứng `COC_TRONG_DAI` (hệ số độ cứng ×100, khối lượng và trọng lượng = 0 vì đã tính trong đài).
- **Lò xo đất ngang:** K = k·z·b<sub>p</sub>·l tại mỗi nút cọc dưới cao độ bắt đầu, gán cả U1 và U2; k theo lớp (bảng A.1),
  b<sub>p</sub> như phần sức chịu tải; cao độ bắt đầu: đáy đài (mặc định) hoặc đáy hố đào (chèn thêm nút tại cao độ này).
- **Lò xo trong ETABS:** gán bằng thuộc tính lò xo điểm có tên (Define → Spring Properties → Point Springs; xem bằng
  Display → Show Assigns → Joint → Springs). Bản đầu gán bằng `SetSpring` theo hệ tổng thể – kiểu lò xo giao diện ETABS không có
  (chỉ có theo trục cục bộ) và bấm xem lò xo làm ETABS văng; mô hình dựng trước bản sửa cần dựng lại.
- **Mũi cọc:** gối chặn UZ.
- **Điểm đặt lực cẩu tháp** (`etabs.diemDatLuc`, trang Mô hình ETABS): `tam` – một điểm tại tâm cẩu (mặc định, như file PDF) hoặc
  `chan` – 4 chân cẩu cách nhau H<sub>t</sub> (bề rộng thân cẩu) quanh tâm cẩu; tâm cẩu lệch tâm đài `tamCauX`, `tamCauY` (mặc định 0,
  chỉ dùng cho mô hình ETABS – phương pháp giải tích vẫn coi tâm cẩu trùng tâm đài). Lưới tấm đài luôn đi qua tâm cẩu, 4 chân và tâm đài
  (chuyển vị "tâm đài" lấy ở nút (0; 0)). Chia về 4 chân là hệ lực tương đương (x', y' tính từ tâm cẩu): F<sub>X</sub>, F<sub>Y</sub>,
  F<sub>Z</sub> mỗi chân 1/4; M<sub>X</sub> → F<sub>z</sub> = M<sub>X</sub>·y'/Σy'² (= ±M/(2H<sub>t</sub>)); M<sub>Y</sub> → F<sub>z</sub> = −M<sub>Y</sub>·x'/Σx'²;
  M<sub>Z</sub> → F<sub>x</sub> = −T·y'/Σr², F<sub>y</sub> = T·x'/Σr² – tổng lực và mômen quanh tâm cẩu đúng bằng tải pattern (`mauTai[i].luc` là hợp lực,
  `mauTai[i].diemLuc` là các lực điểm gửi ETABS). Hướng bất lợi của từng cọc tính từ tâm cẩu.
- **Tầng ETABS:** mỗi cao độ nút là một tầng, đáy công trình ở mũi cọc; tầng trên cùng `GIUA_DAI`, rồi `DAY_DAI`, `DAY_HO`, `Zm13p6`…
- **Lệnh cầu nối:** `InitializeNewModel(kN_m_C)` → `File.NewBlank` → `Story.SetStories_2` (dự phòng SimilarToStory "None",
  `SetStories`, `NewGridOnly`) → vật liệu, tiết diện → `PointObj.AddCartesian` → `FrameObj.AddByPoint` → `AreaObj.AddByPoint`
  → lò xo: `PropPointSpring.SetPointSpringProp` (mỗi độ cứng một thuộc tính `LX_<K>`, hệ "Local") + `PointObj.SetSpringAssignment`
  (bản ETABS không có hai lệnh này: `SetSpring` theo trục cục bộ) → `SetRestraint` → `File.Save` (mặc định `Documents\MongCauThap\MCT_<tên móng>_<cẩu>.EDB`) → đếm lại.
  Mỗi lệnh kiểm tra mã trả về, lỗi thì dừng và báo đúng lệnh, tham số.

## Bước 3 – tải trọng và tổ hợp (`js/calc/etabs-tai-trong.js`)
- **Load pattern:** `DEAD` (bản thân ×1; dùng lại pattern Dead có sẵn của mô hình mới) và tải cẩu tách thành phần đặt tại nút tâm đài:
  làm việc `FX1 FY1` (= H), `FZ1` (= N, hướng xuống), `MX1 MY1` (= M), `MZ1` (= mômen xoắn T); không làm việc `FX2 FY2 FZ2 MX2 MY2`.
- **Giá trị:** tải quy đổi của mục A (form CC1) chia n → tổ hợp nhân lại n nên tổ hợp đúng bằng tải quy đổi CC1.
  Mômen đặt ở tâm đài = M + H·H<sub>đài</sub>/2 (CC1 coi tải đặt ở mặt đài; điểm đặt tải ở mặt phẳng giữa đài).
- **Tổ hợp theo hướng θ:** cọc nén `1,1·DEAD + n·cosθ·FX + n·sinθ·FY + n·FZ − n·sinθ·MX + n·cosθ·MY (+ n·MZ1)`;
  cọc kéo `0,9·DEAD + … + 0,9·FZ`; hệ số 1,1 / 0,9 / 0,9 chỉnh được (trang "Tải trọng & tổ hợp").
  Kiểm tra với PDF: θ = 0° → Fx 1,2; My 1,2 (Combo1); θ = 90° → Fy 1,2; Mx −1,2 (Combo3); θ = 45° → 0,707×1,2 (Combo5).
- **Hướng:** 8 hướng mỗi 45° (PDF) + hướng bất lợi của từng cọc theo mục B (hướng từ tâm đài tới cọc – cọc nén nhiều nhất,
  và hướng ngược lại – cọc kéo nhiều nhất); trùng thì gộp. Số liệu mặc định: 12 hướng × 4 = 48 tổ hợp + `BAO` (envelope).
- **Lệnh cầu nối:** `LoadPatterns.Add` / `SetSelfWTMultiplier`, `PointObj.SetLoadForce`, `RespCombo.Add` + `SetCaseList`.

## Bước 4 – phân tích và nội lực (`js/calc/etabs-ket-qua.js`, lệnh `phan-tich`)
- **Cầu nối:** kiểm tra mô hình đang mở có các thanh cọc app dựng → `SetPresentUnits(kN_m_C)` → bỏ Modal →
  `Analyze.RunAnalysis` → chọn các tổ hợp tuyến tính (`Results.Setup`) → `Results.FrameForce` từng đoạn cọc
  (cao độ trạm tính từ 2 đầu đoạn `FrameObj.GetPoints`), `Results.JointDispl` tại tâm đài và đầu cọc,
  `Results.AreaForceShell` từng ô vỏ (trung bình tại nút; điểm ETABS tự chia lưới lấy toạ độ bằng `PointElm.GetCoordCartesian`).
- **App:** bao P, M = √(M2² + M3²), V = √(V2² + V3²) theo chiều sâu, từ đáy đài tới mũi cọc (bỏ đoạn cọc nằm trong đài –
  thanh cứng; bản tóm tắt có `phienBan` = 3 – thêm bao từng thành phần P, V2, V3, M2, M3 theo chiều sâu `coc[i].tp`, bao nội lực tại nút đài `dai.nutBao`, nội lực dầm `dam`; kết quả lưu bằng bản cũ phải chạy lại phân tích); lực đầu cọc (đáy đài) so với Qa, Qa' (như mục B);
  mọi cặp (N = −P, M) so với biểu đồ tương tác của form CC1; V lớn nhất so với [Q] của phần tải ngang;
  Δ = √(U1² + U2²), ψ = √(R1² + R2²) so với giới hạn phần tải ngang;
  đài: mômen/lực cắt mặt cắt = ∫M11 dy, ∫V13 dy trên mỗi đường lưới x = const (thép theo X) và ∫M22 dx, ∫V23 dx
  trên y = const (thép theo Y), quy ước CSI M > 0 thớ dưới chịu kéo; thép như mục D với b = bề rộng mặt cắt;
  lực cắt so với Qb = 0,5·Rbt·b·h0 (như PDF).
- App ghi dấu vân tay mô hình + tải trọng khi dựng, cảnh báo nếu thông số đổi mà chưa dựng lại.

## Bước 5 – chọn phương pháp tính
- `state.tinhToan.phuongPhap`: `giai-tich` (mặc định, form CC1) hoặc `etabs`; chọn ở trang Kết luận hoặc Kết quả ETABS.
- Kết quả ETABS lưu gọn trên máy (`localStorage` khoá `mong-cau-thap.etabs.v1`: dấu vân tay, thời điểm, file, `tomTatEtabs`
  – bao nội lực cọc, mọi cặp N–M, chuyển vị lớn nhất, bao mômen/lực cắt từng mặt cắt đài). Kiểm tra (`kiemTraEtabs`) tính lại
  theo thông số hiện tại (Qa, thép chọn, biểu đồ tương tác, giới hạn chuyển vị) mà không cần chạy lại ETABS; nếu mô hình/tải
  trọng đã đổi so với lúc phân tích thì app cảnh báo kết quả chưa cập nhật.
- Phương pháp ETABS (`ketLuanEtabs`): mục B (nén/kéo đầu cọc) và D (4 lớp thép đài) lấy theo ETABS; thêm cọc chịu cắt,
  tương tác N–M, chuyển vị, góc xoay, đài chịu cắt; giữ C (xuyên thủng) và E (bulong). Các trang B, D, tải ngang, tương tác
  hiện khung "Đang dùng phương pháp ETABS", dấu ✓/✗ ở danh mục theo ETABS.

## Bước 6 – thuyết minh Word theo phương pháp ETABS (`js/bao-cao/thuyet-minh.js`)
Chọn phương pháp ETABS rồi bấm "Xuất thuyết minh": giữ trang bìa, khung tiêu đề, trang ký, mục lục của form CC1; phần thân đặt
đầu mục như **phụ lục tính toán của báo cáo thẩm tra** (260917_MD3_1_BCTT mong cau thap FULL). Các vị trí báo cáo thẩm tra dán hình chụp
ETABS được **app tự vẽ hình từ kết quả ETABS và chèn sẵn** (xem mục "Hình tự vẽ" dưới); chỉ còn ô trống cho hình không lấy được từ ETABS
(catalogue cẩu, mặt bằng hố khoan, mặt bằng bố trí cẩu, hình trụ hố khoan):

| Đầu mục | Nội dung |
|---|---|
| 1. Cơ sở tính toán | Cơ sở, tiêu chuẩn, phần mềm (thêm ETABS) |
| 2. Thông số đầu vào | 2.1 vật liệu · 2.2 thông số cẩu (Bảng 2.1 tải chân đế, **ô dán Hình 2.1 catalogue**, Bảng 2.2, tải tính toán ×n) · 2.3 tổ hợp (Bảng 2.3 load pattern, bảng tổ hợp LV/KLV × nén/kéo, BAO, "Trong đó") · 2.4 địa chất (**ô dán Hình 2.2 mặt bằng hố khoan, 2.3 mặt bằng bố trí cẩu, 2.4 hình trụ hố khoan**) |
| 3. Mô hình tính toán | Mô tả mô hình, **ô dán Hình 3.1 mô hình 3D**, Bảng 3.1 lò xo, Hình 3.2 mặt bằng (app vẽ); 3.1 tên cẩu: **ô dán Hình 3.3–3.6 lực Fx1…Mz1, Fx2…My2** (kèm giá trị app gán để đối chiếu) |
| 4. Kết quả nội lực | 4.1 tên cẩu: **Bảng 4.1 BAO-MIN, 4.2 BAO-MAX** – 5 ô dán hình (P, M2-2, M3-3, V2-2, V3-3) và P<sub>min</sub>/P<sub>max</sub> app đọc; Bảng 4.3 nội lực cọc, Hình 4.1 bao P–M–V |
| 5. Tính toán sức chịu tải cọc | Phần sức chịu tải cọc của form CC1, đánh số 5.1–5.3 |
| 6. Tính toán móng cẩu tháp | 6.1 kiểm tra cọc (sức chịu tải P<sub>min</sub>/P<sub>max</sub> vs R<sub>c,d</sub>/R<sub>t,d</sub>, Hình 6.1 Check P-M + Bảng 6.2 điểm nguy hiểm, Bảng 6.3 Check Shear, **ô dán Hình 6.2 chuyển vị**, Δ/ψ, áp lực ngang – ổn định đất) · 6.2 đài (**ô dán Hình 6.3 mômen, 6.4 lực cắt đài**, Bảng 6.4–6.5 uốn, 6.6 cắt, **6.7 nứt**, xuyên thủng) · 6.3 bulong (a–g form CC1, **h kéo + cắt đồng thời**) · 6.4 ổn định – lún móng khối quy ước |
| 7. Kết luận, kiến nghị | Bảng 7.1 tổng hợp, kết luận cọc / đài / bulong; kiến nghị (sửa ở trang Thông tin dự án, mặc định như báo cáo thẩm tra) |

- **Kiểm tra P–M** như hình Check P-M của báo cáo thẩm tra: kiểm tra M ≤ M<sub>gh</sub>(N) cho mọi cặp (N, M) của mọi cọc, mọi mặt cắt,
  mọi tổ hợp (`cocKiemTra.soCapNM`, `soCapVuot`); vẽ toàn bộ lên biểu đồ (gộp điểm trùng 10 kN × 2 kNm khi vẽ, chỉ phía M ≥ 0);
  bảng **điểm nguy hiểm** từng cọc (`cocKiemTra.nguyHiem`): N nén lớn nhất, N nhỏ nhất (kéo lớn nhất), M lớn nhất, tỉ số M/M<sub>gh</sub>
  lớn nhất – kèm cao độ, tổ hợp, M<sub>gh</sub>, tỉ số, đánh số trên hình (thuyết minh: Hình 6.1, Bảng 6.2; trang Kết quả ETABS).
- Kiểm tra mới (`kiemTraEtabs`, có trong kết luận): **nứt đài** TCVN 5574:2018 mục 8.2.2 – M<sub>crc</sub> = 1,3·W<sub>red</sub>·R<sub>bt,ser</sub>
  (tiết diện quy đổi, cả thép nén); M > M<sub>crc</sub> thì a<sub>crc</sub> = φ1φ2φ3ψs(σs/Es)ls ≤ 0,4 mm (ngắn hạn; φ1 = 1, φ2 = 0,5, φ3 = 1;
  σs = M/(0,8h0·As); ψs = 1 − 0,8Mcrc/M; ls theo 0,5Abt/As·ds giới hạn 10…40ds, 100…400 mm); dùng mômen tính toán ETABS (thiên về an toàn).
  **Bulong kéo + cắt đồng thời** √((N1/[N]tb)² + (Q1/[N]vb)²) ≤ 1 như báo cáo thẩm tra.
- Phương pháp giải tích: thuyết minh giữ đúng form CC1 (chương I, chương II phần 1–5).
- Tên file thêm đuôi `_ETABS`. Chưa có kết quả ETABS → báo lỗi; kết quả không khớp thông số → hỏi trước khi xuất.
- Test: `tests/bao-cao-etabs.test.js` (thứ tự đầu mục cấp 2, 3; ô dán hình; nội dung tính), `tests/etabs-ket-qua.test.js` (nứt đài tính tay).

## Dầm giằng cọc (`js/calc/dam-giang.js`, trang "Mô hình ETABS")
- **Số liệu** (`state.damGiang.ds`, mỗi dầm): cọc đầu – cọc cuối, cao độ tim dầm z, b × h, cấp bê tông, nhóm thép dọc / thép đai,
  lớp bảo vệ a (tới tim thép), thép trên / dưới / hông (số thanh × Ø), đai Ø, bước, số nhánh. Nút "Giằng tất cả các cọc kề nhau"
  tạo nhanh dầm theo chu vi nhóm cọc. Kiểm tra: hai cọc khác nhau, z nằm giữa đáy đài và mũi cọc, mặt trên dầm không cao hơn đáy đài,
  không trùng dầm.
- **Mô hình:** cao độ dầm được chèn vào lưới chia cọc (nút cọc đúng tại z); thanh `DGi` nối hai nút cọc, tiết diện chữ nhật `DAM_DGi`,
  vật liệu `BT_<cấp>`. Thêm / bớt / đổi cao độ dầm là đổi hình học → phải **dựng lại** mô hình.
- **Nội lực:** `Results.FrameForce` từng dầm, bao mọi tổ hợp tại các trạm (`dam[i].bao`, `dam[i].tram`).
- **Kiểm tra (TCVN 5574:2018)** – trục cục bộ thanh ngang của ETABS: M3, V2 trong mặt phẳng đứng; M2, V3 trong mặt phẳng ngang;
  P > 0 kéo; M3 > 0 thớ dưới chịu kéo:
  - Uốn: α<sub>m</sub> = M/(R<sub>b</sub>·b·h0²) ≤ α<sub>R</sub>, ξ = 1 − √(1 − 2α<sub>m</sub>), A<sub>s</sub> = ξ·R<sub>b</sub>·b·h0/R<sub>s</sub>,
    cộng N<sub>t</sub>/(2R<sub>s</sub>) cho mỗi lớp (lấy N<sub>t</sub> lớn nhất cùng M lớn nhất dù khác tổ hợp – thiên về an toàn).
  - Uốn ngang M2: thép hông + 2 thanh góc, tiết diện rộng h, cao b.
  - Kéo N<sub>t</sub> ≤ R<sub>s</sub>·A<sub>s,tot</sub>; nén N<sub>c</sub> ≤ φ(R<sub>b</sub>·A + R<sub>sc</sub>·A<sub>s,tot</sub>), φ theo l0/h<sub>min</sub>
    (6 → 0,92; 10 → 0,9; 15 → 0,83; 20 → 0,7), l0 = nhịp thông thủy giữa hai cọc.
  - Cắt (mục 8.1.3.3): Q ≤ 0,3·R<sub>b</sub>·b·h0 và Q ≤ min theo c ∈ [h0; 3h0] của Q<sub>b</sub> + Q<sub>sw</sub>;
    Q<sub>b</sub> = 1,5·R<sub>bt</sub>·b·h0²/c trong [0,5; 2,5]·R<sub>bt</sub>·b·h0; Q<sub>sw</sub> = 0,75·q<sub>sw</sub>·min(c; 2h0),
    chỉ kể đai khi q<sub>sw</sub> ≥ 0,25·R<sub>bt</sub>·b. Cắt ngang V3 kể 2 nhánh nằm ngang của đai kín.
  - Mômen xoắn T chỉ liệt kê, chưa kiểm tra.
- Kết quả hiện ở trang Kết quả ETABS (bảng từng dầm, biểu đồ nội lực), vào Kết luận (dòng "Dầm giằng DGi") và thuyết minh
  mục 6.4 (Bảng 6.8 thông số, Hình 6.5… nội lực, Bảng 6.9… kiểm tra); mục ổn định – lún thành 6.5.

## Cập nhật mô hình trong file đang có (lệnh `cap-nhat-mo-hinh`, `LenhCapNhatMoHinh.cs`)
- App nhớ file đã dựng (`state.etabs.fileDung`) và dấu vân tay hình học (`vanTayHinhHoc`). Đã dựng mô hình thì **mọi thay đổi** – tải,
  cẩu, vật liệu, hệ số nền **và cả hình học** (chiều cao đài, đáy đài, chiều dài cọc, vị trí cọc, lưới đài, bước chia cọc, điểm đặt lực,
  dầm giằng) – đều bấm **Cập nhật mô hình trong ETABS** (hoặc **Cập nhật mô hình và chạy lại phân tích**). Không gọi `InitializeNewModel`,
  `NewBlank`: giữ file, các thiết lập và đối tượng khác của người dùng trong mô hình. **Dựng lại mô hình mới** vẫn còn khi cần.
- Đối tượng của app nhận theo tên: điểm `D<i>_<k>` (đài), `C<n>_…` (cọc); thanh `C<n>_<j>`, `DG<n>`; ô vỏ `V<i>_<k>`.
- Cầu nối: mở đúng file (`File.OpenFile` nếu ETABS đang mở file khác) → mở khoá (`SetModelIsLocked(false)`) → vật liệu, tiết diện →
  **tầng**: khác số liệu app (`Story.GetStories_2`) thì `SetStories_2`; ETABS không cho đổi tầng khi mô hình còn đối tượng → xoá thanh,
  ô vỏ, điểm của app, đặt tầng rồi vẽ lại trong cùng file → **đồng bộ hình học theo tên**: thanh / ô vỏ không còn hoặc đổi nút → xoá
  (`FrameObj.Delete`, `AreaObj.Delete`); điểm không còn → bỏ gối, lò xo rồi `PointObj.DeleteSpecialPoint`; điểm đổi toạ độ → dời bằng
  `EditPoint.ChangeCoordinates_1` (chỗ mới đang có điểm khác thì dời tạm ra xa trước); thiếu → `AddCartesian` / `AddByPoint`
  (ETABS trả điểm cũ cùng chỗ thì `ChangeName`); thanh giữ lại → `SetSection`. Bản ETABS không dời được điểm → xoá đối tượng của app
  và vẽ lại → **kiểm tra lại** toạ độ mọi điểm, nút hai đầu mọi thanh, đỉnh mọi ô vỏ, không thừa thanh / ô vỏ của app; khác → dừng, gợi ý
  `dung-lai` → bỏ lò xo / gối ở nút cọc không còn cần (`DeleteSpring`, `SetRestraint` false) rồi gán lại → xoá tổ hợp cũ của app
  (`BAO` trước), load pattern không còn dùng (ví dụ `MZ1`), lực cũ của các pattern tải cẩu ở mọi điểm (`DeleteLoadForce("All", …, Group)`,
  không được thì xoá ở từng nút đài) → đặt lực mới (một điểm hoặc 4 chân) và tổ hợp → lưu đè.
- Kết quả trả về `thongTin.dongBo`: số điểm dời / thêm / xoá, thanh và ô vỏ giữ / thêm / xoá, có phải vẽ lại không và lý do.
- Thử bằng ETABS giả lập: `npm run thu-cau-noi` – đổi cẩu (xoá MZ1); lưới 0,5 m (xoá / dời / thêm); chiều cao đài 1,6 → 2,0 m (ETABS
  không đổi tầng khi còn đối tượng → vẽ lại trong file); cọc dài thêm 3 m (ETABS đổi được tầng → chỉ thêm nút, chuyển gối mũi cọc);
  4 chân + tâm cẩu lệch (dời nút lưới, kiểm tra hợp lực); bản ETABS không có `EditPoint` (vẽ lại); thêm dầm giằng bằng cập nhật; tự mở file;
  thiếu file. Mỗi tình huống so file lưu với mô hình app: tập điểm và toạ độ, thanh, ô vỏ, gối chỉ ở mũi cọc, lò xo, tầng, điểm đặt lực,
  và không có lần khởi tạo mô hình mới.

## Hình tự vẽ trong thuyết minh (`js/bieu-do-etabs.js`)
API ETABS không có lệnh chụp màn hình hình nội lực, nên app vẽ lại từ kết quả đã đọc (`MCT.bieuDoEtabs.hinhThuyetMinh`), chuyển
SVG → PNG trong trình duyệt và chèn vào đúng chỗ báo cáo thẩm tra dán hình:

| Vị trí | Hình |
|---|---|
| Hình 3.1 | Mô hình 3D trục đo: tấm đài (lưới), cọc, lò xo, gối mũi cọc, dầm giằng, điểm đặt tải, thước cao độ |
| Hình 3.3–3.6 | Lực tại tâm đài theo load pattern (FX1, FY1, FZ1 / MX1, MY1, MZ1 / FX2, FY2, FZ2 / MX2, MY2) kèm giá trị |
| Bảng 4.1, 4.2 | 5 ô mỗi bảng: P, M2-2, M3-3, V2-2, V3-3 tổ hợp BAO-MIN / BAO-MAX theo chiều sâu mọi cọc, ghi giá trị đầu cọc và lớn nhất |
| Hình 6.2 | Chuyển vị ngang tâm đài và đầu cọc (hướng, Δ) |
| Hình 6.3 | Bản đồ màu M11, M22 (bao max / min, kNm/m) trên mặt bằng đài, đánh dấu giá trị lớn nhất / nhỏ nhất |
| Hình 6.4 | Bản đồ màu V13, V23 (bao, kN/m) |
| Hình 6.5… | Nội lực dầm giằng M3, V2, P, M2 dọc dầm (bao max / min) |

Trình duyệt chặn vẽ SVG → PNG thì vị trí đó trở lại ô dán hình chụp ETABS (kèm hướng dẫn chụp trong ETABS).
Test: `tests/bao-cao-etabs.test.js` (SVG hợp lệ, nhãn không tràn ô, mỗi hình chèn đúng một lần, không còn ô "Dán hình chụp từ ETABS").

## Ảnh chụp thật từ ETABS cho thuyết minh (`js/hinh-chup.js`, trang "Hình chụp ETABS")
API ETABS không có lệnh chụp màn hình hay đổi chế độ hiển thị (biểu đồ lực, biến dạng…), nên việc chụp làm như sau:
- Mỗi vị trí hình của thuyết minh có một ô: tên hình, hướng dẫn hiển thị trong ETABS (menu Display / View, tổ hợp, thành phần) và các nút
  **Chụp cửa sổ ETABS**, **Chụp màn hình**, **Dán ảnh**, **Chọn file**, **Cắt lại**, xoá. Vị trí (`MCT.hinhChup.viTri(E)`):
  - ảnh ngoài ETABS: mặt bằng bố trí cẩu (Hình 2.3 / giải tích 1.1), catalogue cẩu (2.1 / giải tích 3.1), mặt bằng hố khoan (2.2), hình trụ hố khoan (2.4);
  - mô hình 3D (3.1), mặt bằng đài (3.2), lực tại tâm đài (3.3–3.6);
  - 10 ô Bảng 4.1 / 4.2 (P, M2-2, M3-3, V2-2, V3-3 – BAO Min / Max);
  - chuyển vị (6.2), mômen đài M11 / M22 max / min (4 ảnh, Hình 6.3), lực cắt đài V13 / V23 (2 ảnh, Hình 6.4), nội lực từng dầm giằng.
- **Chụp cửa sổ ETABS** (chương trình .exe): Electron `desktopCapturer` chụp cửa sổ có tiêu đề chứa "ETABS" (lớn nhất, bỏ cửa sổ app; chụp được
  cả khi bị che, không chụp được khi thu nhỏ). **Chụp màn hình**: thu nhỏ app, đợi (mặc định 3 giây – chỉnh được) rồi chụp màn hình chính –
  dự phòng khi ảnh cửa sổ bị đen. **Dán ảnh**: ảnh trong clipboard (File → Capture Picture của ETABS, Snipping Tool); ở trình duyệt bấm
  Dán ảnh rồi Ctrl+V. **Chọn file**: ảnh có sẵn.
- Sau khi có ảnh: hộp thoại cắt – kéo chuột chọn vùng mô hình (bỏ menu, thanh công cụ ETABS). Vùng cắt khi chụp được nhớ
  (`state.hinhChup.vung`, riêng cho chụp cửa sổ / chụp màn hình), các lần sau chỉ bấm "Dùng vùng đã chọn". Ảnh gốc được giữ để cắt lại.
- Ảnh lưu trong máy (IndexedDB `mong-cau-thap-hinh`: ảnh đã cắt PNG, ảnh gốc, vùng cắt, nguồn, thời điểm), không nằm trong file số liệu.
- Xuất thuyết minh (`ganAnhChup`): ảnh chụp thay hình app vẽ cùng vị trí; vị trí chưa có ảnh: dùng hình app vẽ từ kết quả ETABS (mặc định)
  hoặc để ô trống (`state.hinhChup.khiThieu = 'o-trong'`). Ô Bảng 4.1 / 4.2 dùng ảnh từng ô; Hình 6.3 / 6.4 có ảnh M11, M22, V13, V23 thì
  ghép thành bảng 2 cột có nhãn; ảnh cao được thu cho vừa trang.
- Thử: `tests/bao-cao-etabs.test.js` (mọi vị trí có ảnh → mỗi vị trí đúng một ảnh, không còn ô dán; ảnh cao không vượt trang; giải tích
  dùng ảnh mặt bằng, catalogue). Chụp thật cửa sổ ETABS cần Windows + ETABS – chưa thử trên máy thật; bản Linux thử được chụp màn hình,
  dán clipboard và chụp giả lập (`MCT_CHUP_GIA_LAP=<file .png>`).

## Mặt cắt móng và địa chất (`js/bieu-do-mat-cat.js`)
`MCT.bieuDo.duLieuMatCat(state, kq, m)` + `MCT.bieuDo.matCat(d)`: mặt cắt theo phương X (tỉ lệ ngang phóng to so với tỉ lệ đứng):
MĐTN, mực nước ngầm, đáy hố đào, các lớp đất tô theo loại (cát chấm, sét gạch chéo) có ghi chú tên lớp, loại đất, I<sub>L</sub>, chiều dày,
SPT trung bình, hệ số nền k; đài (kích thước, H), cọc (D, L, mũi cọc, tên cọc), thân cẩu, thước cao độ; khi có mô hình ETABS thêm dầm
giằng và điểm đặt lực (tâm cẩu / 4 chân). Hiện ở trang **Số liệu địa chất** và **Mô hình ETABS**; thuyết minh giải tích: Hình 2.2 (sau biểu đồ
SPT); thuyết minh ETABS: Hình 2.5 (mục 2.4 số liệu địa chất).

## Chạy thử bước 1
1. Mở ETABS v23, mở một mô hình bất kỳ hoặc tạo mô hình mới (đợi mô hình hiện ra).
2. Mở `MongCauThap.exe` → mục **Tính bằng ETABS → Kết nối ETABS** → **Kiểm tra kết nối**.
3. Nếu lỗi: làm theo lời khuyên trên trang; vẫn lỗi thì mở **Chi tiết kỹ thuật**, sao chép nội dung gửi lại.
