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

## Cách kết nối
ETABS chỉ chạy trên Windows và chỉ cho điều khiển qua API (.NET/COM), trình duyệt không gọi được.
Vì vậy chức năng này chỉ có trong chương trình `MongCauThap.exe` (Electron):

```
Trang app (js/app.js) ──window.mctDesktop.etabs(yêu cầu)──► desktop/preload.js
   ──IPC──► desktop/main.js ──chạy──► powershell.exe desktop/etabs/cau-noi-etabs.ps1
   ──nạp ETABSv1.dll của bản ETABS đang cài, gắn vào phiên ETABS đang mở──► ETABS v23
```
- Không cần cài thêm gì: PowerShell 5.1 và .NET Framework 4.8 có sẵn trên Windows 10/11.
- Script nạp `ETABSv1.dll` ngay trong thư mục cài ETABS (tìm theo tiến trình ETABS đang chạy, hoặc
  `C:\Program Files\Computers and Structures\ETABS xx`), gọi hàm qua reflection nên dùng được cho v22, v23.
- Trao đổi qua file JSON tạm (UTF-8) để giữ đúng tiếng Việt trong đường dẫn.
- Gắn vào phiên đang mở theo thứ tự: `Helper.GetObject` → `Marshal.GetActiveObject` → `Helper.GetObjectProcess(PID)`.

## Các bước
| Bước | Nội dung | Trạng thái |
|---|---|---|
| 1 | Kết nối: trang "Kết nối ETABS", lệnh `kiem-tra` (phiên bản, file mô hình, đơn vị, số phần tử, load pattern) | Đã làm – chờ chạy thử trên máy có ETABS |
| 2 | Dựng mô hình: vật liệu B35, cọc tròn D chia 1 m, đài shell X×Y×H, lò xo ngang, mũi cọc, điểm đặt tải | Chờ |
| 3 | Tải trọng & tổ hợp: Dead, Fx/Fy/Fz/Mx/My/Mz làm việc và không làm việc, 32 tổ hợp + hướng bất lợi, BAO | Chờ |
| 4 | Chạy phân tích, lấy nội lực cọc theo chiều sâu, chuyển vị và góc xoay đài, mô men và lực cắt đài | Chờ |
| 5 | Chọn phương pháp; kiểm tra cọc nén/kéo, tải ngang (cắt, P–M), thép đài, chuyển vị/góc xoay theo form CC1 | Chờ |
| 6 | Thuyết minh form CC1 cho phương pháp ETABS | Chờ |
| 7 | Tự cập nhật: đổi thông số → dựng lại, chạy lại, lấy kết quả | Chờ |

## Chạy thử bước 1
1. Mở ETABS v23, mở một mô hình bất kỳ hoặc tạo mô hình mới.
2. Mở `MongCauThap.exe` → mục **Tính bằng ETABS → Kết nối ETABS** → **Kiểm tra kết nối**.
3. Nếu lỗi: mở **Chi tiết kỹ thuật**, sao chép nội dung gửi lại.

Chạy script trực tiếp (không cần app), trong thư mục chương trình đã giải nén:
```
powershell -NoProfile -ExecutionPolicy Bypass -File resources\etabs\cau-noi-etabs.ps1 -Lenh kiem-tra
```
