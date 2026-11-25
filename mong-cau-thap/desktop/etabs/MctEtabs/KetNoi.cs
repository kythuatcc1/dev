// Tìm ETABS đang mở, nạp ETABSv1.dll của chính bản đó và gắn vào phiên làm việc.
// Mỗi cách gắn đều được kiểm chứng bằng một lệnh gọi thật: lớp bọc nhận về có thể "rỗng"
// (gọi hàm nào cũng NullReferenceException) – khi đó thử cách khác và ghi lại để chẩn đoán.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;

namespace MctEtabs
{
    /// <summary>Kết nối đã kiểm chứng, dùng cho các lệnh.</summary>
    internal sealed class PhienEtabs
    {
        public Assembly Asm;
        public object OAPI;
        public object SapModel;
        public string Cach;
        public IBoGoi G;
        public string ThuMucEtabs;
        /// <summary>Gắn được (gọi được hàm đơn giản) nhưng chưa lấy được mô hình qua cách này.</summary>
        public bool ChiGanMotPhan;
        public Type T(string ten) => Asm.GetType("ETABSv1." + ten, true);
    }

    internal static class KetNoi
    {
        public const string ProgId = "CSI.ETABS.API.ETABSObject";

        /// <summary>Thư mục của tiến trình ETABS đang chạy (nếu có).</summary>
        internal static string ThuMucTienTrinh()
        {
            foreach (Process p in Process.GetProcessesByName("ETABS"))
            {
                string duong = HeThong.DuongDanTienTrinh(p, out _);
                if (duong != null) return Path.GetDirectoryName(duong);
            }
            return null;
        }

        public static PhienEtabs Mo(KetQua kq, YeuCau yc)
        {
            bool win = OperatingSystem.IsWindows() && !yc.ThuNghiem;
            bool? chuongTrinhAdmin = win ? HeThong.LaAdminHienTai() : null;
            kq.Dat("heDieuHanh", Environment.OSVersion.VersionString);
            kq.Dat("may64bit", Environment.Is64BitProcess);
            kq.Dat("chuongTrinhAdmin", chuongTrinhAdmin);

            // 1. Tiến trình ETABS đang chạy
            var pids = new List<int>();
            string thuMucTienTrinh = null;
            bool? etabsAdmin = null;
            if (!yc.ThuNghiem)
            {
                Process[] ds = Process.GetProcessesByName("ETABS");
                if (ds.Length == 0)
                {
                    kq.Dung("tim-etabs", "ETABS chua mo. Hay mo ETABS roi thu lai.", "mo-etabs");
                    return null;
                }
                var moTa = new List<string>();
                foreach (Process p in ds)
                {
                    pids.Add(p.Id);
                    string duong = HeThong.DuongDanTienTrinh(p, out string loiDuong);
                    bool? admin = win ? HeThong.LaAdmin(p.Id) : null;
                    if (admin == true) etabsAdmin = true; else if (admin == false && etabsAdmin == null) etabsAdmin = false;
                    if (duong != null && thuMucTienTrinh == null) thuMucTienTrinh = Path.GetDirectoryName(duong);
                    moTa.Add("PID " + p.Id + (duong != null ? " " + duong : " (khong doc duoc duong dan: " + loiDuong + ")") +
                             (admin == true ? " [Administrator]" : ""));
                }
                kq.Dat("tienTrinhEtabs", moTa);
                kq.Dat("etabsAdmin", etabsAdmin);
                kq.GhiBuoc("tim-etabs", true, "Dang chay " + ds.Length + " phien ETABS: " + string.Join("; ", moTa));
            }
            else
            {
                pids.AddRange(yc.PidGiaLap);
                kq.GhiBuoc("tim-etabs", true, "Che do thu nghiem: bo qua tien trinh ETABS");
            }

            // 2. Thư viện API của đúng bản ETABS đang chạy
            string dll = TimDll(yc.DuongDanEtabs, thuMucTienTrinh);
            if (dll == null)
            {
                kq.Dung("tim-dll", "Khong tim thay ETABSv1.dll. Nhap thu muc cai ETABS (vi du C:\\Program Files\\Computers and Structures\\ETABS 23).", "tim-dll");
                return null;
            }
            string thuMucEtabs = Path.GetDirectoryName(dll);
            kq.Dat("dll", dll);
            try { kq.Dat("dllPhienBan", FileVersionInfo.GetVersionInfo(dll).FileVersion); } catch { /* không quan trọng */ }
            string dangKy = Path.Combine(thuMucEtabs, "RegisterETABS.exe");
            if (File.Exists(dangKy)) kq.Dat("registerEtabs", dangKy);
            kq.GhiBuoc("tim-dll", true, dll);

            // 3. Nạp thư viện (thư mục ETABS làm thư mục làm việc để thư viện tìm được các file đi kèm)
            var ph = new PhienEtabs();
            try
            {
                Environment.CurrentDirectory = thuMucEtabs;
                Environment.SetEnvironmentVariable("PATH", thuMucEtabs + Path.PathSeparator + Environment.GetEnvironmentVariable("PATH"));
                ph.Asm = Assembly.LoadFrom(dll);
                string dich = null;
                try { dich = ph.Asm.GetCustomAttribute<System.Runtime.Versioning.TargetFrameworkAttribute>()?.FrameworkName; } catch { }
                kq.Dat("dllDich", dich);
                kq.GhiBuoc("nap-dll", true, ph.Asm.GetName().Name + " " + ph.Asm.GetName().Version + (dich != null ? " (" + dich + ")" : "") +
                                            " tren .NET " + Environment.Version);
            }
            catch (Exception ex)
            {
                kq.Dung("nap-dll", "Khong nap duoc ETABSv1.dll: " + Api.GocLoi(ex).Message);
                return null;
            }
            Type tHelper, tOAPI, tSap;
            try { tHelper = ph.T("cHelper"); tOAPI = ph.T("cOAPI"); tSap = ph.T("cSapModel"); }
            catch (Exception ex)
            {
                kq.Dung("nap-dll", "Thu vien khong co cac giao dien ETABSv1 can dung: " + Api.GocLoi(ex).Message);
                return null;
            }

            // 4. Đăng ký COM của ETABS và bảng ROT (chỉ để chẩn đoán khi không gắn được)
            (bool dangKy, string clsid, string hrProgId, bool? coTrongRot, string hrRot) com = (true, null, null, null, null);
            if (win)
            {
                try
                {
                    com = HeThong.KiemTraCom(ProgId);
                    kq.Dat("progIdDangKy", com.dangKy);
                    kq.Dat("clsid", com.clsid);
                    kq.Dat("hrProgId", com.hrProgId);
                    kq.Dat("coTrongRot", com.coTrongRot);
                    kq.Dat("hrRot", com.hrRot);
                    kq.GhiBuoc("kiem-tra-com", com.dangKy && com.coTrongRot == true,
                        !com.dangKy ? "ProgID " + ProgId + " chua dang ky voi Windows (" + com.hrProgId + ")"
                        : com.coTrongRot == true ? "ProgID da dang ky " + com.clsid + "; ETABS co trong bang ROT"
                        : "ProgID da dang ky " + com.clsid + "; ETABS KHONG co trong bang ROT (" + com.hrRot + ")");
                }
                catch (Exception ex) { kq.GhiBuoc("kiem-tra-com", false, "Khong kiem tra duoc: " + ex.Message); }
            }

            // 5. Gắn vào phiên ETABS – cách nào cũng phải gọi được hàm thật mới nhận
            object helper;
            try { helper = Activator.CreateInstance(ph.T("Helper")); }
            catch (Exception ex)
            {
                kq.Dung("ket-noi", "Khong tao duoc ETABSv1.Helper: " + Api.GocLoi(ex).Message);
                return null;
            }
            var quaGiaoDien = new GoiQuaGiaoDien(ph.T);
            var cach = new List<(string ten, Func<object> lay, IBoGoi g)>
            {
                ("Helper.GetObject", () => Api.Goi(helper, tHelper, "GetObject", new object[] { ProgId }), quaGiaoDien)
            };
            foreach (int pid in pids)
            {
                int p = pid;
                cach.Add(("Helper.GetObjectProcess(" + p + ")",
                          () => Api.Goi(helper, tHelper, "GetObjectProcess", new object[] { ProgId, p }), quaGiaoDien));
            }
            // Dự phòng: lấy thẳng đối tượng COM của ETABS từ bảng ROT, gọi theo tên hàm (không qua lớp bọc của ETABSv1.dll)
            if (win && com.dangKy && com.coTrongRot == true)
                cach.Add(("COM truc tiep (ROT)", () => HeThong.LayDoiTuongRot(ProgId), new GoiQuaIDispatch()));

            var moTaLoi = new List<string>();
            (object o, object sap, string ten, IBoGoi g)? motPhan = null;
            foreach (var (ten, lay, g) in cach)
            {
                object o = kq.Thu(ten, lay);
                if (o == null) { moTaLoi.Add(ten + ": loi hoac tra ve rong"); continue; }
                object ver = kq.Thu(ten + " > GetOAPIVersionNumber", () => g.Goi(o, "cOAPI", "GetOAPIVersionNumber", null));
                object sap = kq.Thu(ten + " > SapModel", () => g.Lay(o, "cOAPI", "SapModel"));
                object file = sap == null ? null
                    : kq.Thu(ten + " > SapModel.GetModelFilename", () => g.Goi(sap, "cSapModel", "GetModelFilename", new object[] { true }));
                if (ver != null) kq.Dat("apiPhienBan", ver);
                if (file != null)
                {
                    ph.OAPI = o; ph.SapModel = sap; ph.Cach = ten; ph.G = g;
                    break;
                }
                if (ver != null && motPhan == null) motPhan = (o, sap, ten, g);
                if (!System.Runtime.InteropServices.Marshal.IsComObject(o)) kq.Dat("lopBoc " + ten, MoTaTruong(o));
                moTaLoi.Add(ten + ": nhan " + o.GetType().FullName + " nhung khong doc duoc mo hinh");
            }
            ph.ThuMucEtabs = thuMucEtabs;
            if (ph.OAPI == null && win)
            {
                // Không cách nào đọc được mô hình: chẩn đoán giao diện API (type library) với Windows
                try
                {
                    kq.ThongTin["chanDoanCom"] = ThuVienKieu.ChanDoan(ProgId, new[] { tOAPI, tSap, ph.T("cFrameObj") }, thuMucEtabs);
                    kq.Dat("tlb", ThuVienKieu.TimTlb(thuMucEtabs, out _));
                }
                catch (Exception ex) { kq.Dat("chanDoanCom", "loi: " + Api.GocLoi(ex).Message); }
            }
            if (ph.OAPI == null && motPhan != null)
            {
                // Gắn được một phần (hàm đơn giản chạy) – để lệnh xác định nguyên nhân không lấy được mô hình
                ph.OAPI = motPhan.Value.o; ph.SapModel = null; ph.Cach = motPhan.Value.ten; ph.G = motPhan.Value.g;
                ph.ChiGanMotPhan = true;
            }
            if (ph.OAPI == null)
            {
                string goiY = "ket-noi";
                if (etabsAdmin == true && chuongTrinhAdmin != true) goiY = "quyen-admin";
                else if (win && !com.dangKy) goiY = "dang-ky-api";
                else if (win && com.coTrongRot == false) goiY = "rot";
                kq.Dung("ket-noi", "Khong gan duoc vao ETABS. " + string.Join(" | ", moTaLoi), goiY);
                return null;
            }
            kq.Dat("cachKetNoi", ph.Cach + " – " + ph.G.Ten);
            kq.Dat("kieuEtabs", ph.OAPI.GetType().FullName);
            kq.GhiBuoc("ket-noi", true, ph.Cach + " (" + ph.OAPI.GetType().FullName + ")" +
                       (ph.ChiGanMotPhan ? " – chi goi duoc ham don gian, chua lay duoc mo hinh" : ""));
            return ph;
        }

        internal static string TimDll(string goiY, string thuMucTienTrinh)
        {
            var ung = new List<string>();
            if (!string.IsNullOrWhiteSpace(goiY)) ung.Add(goiY.Trim().Trim('"'));
            if (thuMucTienTrinh != null) ung.Add(thuMucTienTrinh);
            foreach (string goc in new[] { Environment.GetEnvironmentVariable("ProgramW6432"),
                                           Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"C:\Program Files" })
            {
                if (string.IsNullOrEmpty(goc)) continue;
                string csi = Path.Combine(goc, "Computers and Structures");
                if (!Directory.Exists(csi)) continue;
                ung.AddRange(Directory.GetDirectories(csi, "ETABS*").OrderByDescending(SoPhienBan));
            }
            foreach (string d in ung)
            {
                string f = d.EndsWith(".dll", StringComparison.OrdinalIgnoreCase) ? d : Path.Combine(d, "ETABSv1.dll");
                if (File.Exists(f)) return Path.GetFullPath(f);
            }
            return null;
        }

        static int SoPhienBan(string thuMuc)
        {
            Match m = Regex.Match(Path.GetFileName(thuMuc) ?? "", @"\d+");
            return m.Success && int.TryParse(m.Value, out int so) ? so : 0;
        }

        /// <summary>Liệt kê các trường bên trong một lớp bọc (rỗng hay có giá trị) – để chẩn đoán.</summary>
        static List<string> MoTaTruong(object o)
        {
            var ds = new List<string>();
            for (Type t = o.GetType(); t != null && t != typeof(object) && ds.Count < 40; t = t.BaseType)
            {
                foreach (FieldInfo f in t.GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly))
                {
                    string gt;
                    try
                    {
                        object v = f.GetValue(o);
                        gt = v == null ? "null" : System.Runtime.InteropServices.Marshal.IsComObject(v) ? "COM " + v.GetType().FullName : v.GetType().FullName;
                    }
                    catch (Exception ex) { gt = "loi: " + Api.GocLoi(ex).Message; }
                    ds.Add(t.Name + "." + f.Name + " (" + f.FieldType.Name + ") = " + gt);
                }
            }
            return ds;
        }
    }
}
