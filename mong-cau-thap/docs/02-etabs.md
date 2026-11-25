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
| Điểm đặt tải cẩu | Đặt tại tâm đài, truyền xuống 4 chân cẩu qua liên kết cứng theo vị trí bulong mục E |

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
| 2 | Dựng mô hình (lệnh `dung-mo-hinh`, trang "Mô hình ETABS", `js/calc/etabs-mo-hinh.js`) | Đã làm – chờ chạy thử trên máy thật |
| 3 | Tải trọng & tổ hợp: Dead, Fx/Fy/Fz/Mx/My/Mz làm việc và không làm việc, 32 tổ hợp + hướng bất lợi, BAO | Chờ |
| 4 | Chạy phân tích, lấy nội lực cọc theo chiều sâu, chuyển vị và góc xoay đài, mô men và lực cắt đài | Chờ |
| 5 | Chọn phương pháp; kiểm tra cọc nén/kéo, tải ngang (cắt, P–M), thép đài, chuyển vị/góc xoay theo form CC1 | Chờ |
| 6 | Thuyết minh form CC1 cho phương pháp ETABS | Chờ |
| 7 | Tự cập nhật: đổi thông số → dựng lại, chạy lại, lấy kết quả | Chờ |

## Bước 2 – mô hình app tự dựng (`js/calc/etabs-mo-hinh.js`)
- **Gốc toạ độ:** tâm đài = tâm cẩu (như toạ độ cọc mục B); Z = cao độ so với MĐTN; đơn vị kN, m.
- **Đài:** tấm vỏ dày (`ShellThick`, tiết diện `DAI`, dày H) đặt ở mặt phẳng giữa đài; lưới chia ≤ 0,25 m (chỉnh được),
  đường lưới đi qua tâm cọc, 4 chân cẩu, tâm đài và mép đài – cọc và chân cẩu nối đúng nút của tấm.
- **Cọc:** thanh tròn D (`COC`), nút ở đáy đài rồi mỗi 1 m (chỉnh được) tới mũi; đoạn từ giữa đài tới đáy đài là
  thanh cứng `COC_TRONG_DAI` (hệ số độ cứng ×100, khối lượng và trọng lượng = 0 vì đã tính trong đài).
- **Lò xo đất ngang:** K = k·z·b<sub>p</sub>·l tại mỗi nút cọc dưới cao độ bắt đầu, gán cả U1 và U2; k theo lớp (bảng A.1),
  b<sub>p</sub> như phần sức chịu tải; cao độ bắt đầu: đáy đài (mặc định) hoặc đáy hố đào (chèn thêm nút tại cao độ này).
- **Mũi cọc:** gối chặn UZ.
- **Điểm đặt tải:** `TAM_CAU` ở mặt đài (0; 0; z<sub>mặt</sub>), 4 thanh cứng `LK_CUNG` (1×1 m, ×100, không trọng lượng)
  xuống 4 chân cẩu tại góc thân cẩu (±b/2; ±b/2), b = bề rộng thân cẩu theo catalogue.
- **Tầng ETABS:** mỗi cao độ nút là một tầng, đáy công trình ở mũi cọc; tên `MAT_DAI`, `GIUA_DAI`, `DAY_DAI`, `DAY_HO`, `Zm13p6`…
- **Lệnh cầu nối:** `InitializeNewModel(kN_m_C)` → `File.NewBlank` → `Story.SetStories_2` (dự phòng SimilarToStory "None",
  `SetStories`, `NewGridOnly`) → vật liệu, tiết diện → `PointObj.AddCartesian` → `FrameObj.AddByPoint` → `AreaObj.AddByPoint`
  → `SetSpring`, `SetRestraint` → `File.Save` (mặc định `Documents\MongCauThap\MCT_<tên móng>_<cẩu>.EDB`) → đếm lại.
  Mỗi lệnh kiểm tra mã trả về, lỗi thì dừng và báo đúng lệnh, tham số.

## Chạy thử bước 1
1. Mở ETABS v23, mở một mô hình bất kỳ hoặc tạo mô hình mới (đợi mô hình hiện ra).
2. Mở `MongCauThap.exe` → mục **Tính bằng ETABS → Kết nối ETABS** → **Kiểm tra kết nối**.
3. Nếu lỗi: làm theo lời khuyên trên trang; vẫn lỗi thì mở **Chi tiết kỹ thuật**, sao chép nội dung gửi lại.
