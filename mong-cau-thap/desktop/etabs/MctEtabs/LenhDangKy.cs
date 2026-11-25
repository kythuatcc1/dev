// Lệnh "dang-ky-giao-dien" / "go-dang-ky-giao-dien": đăng ký (hoặc gỡ) type library của ETABS cho tài khoản
// Windows hiện tại (HKCU, không cần quyền Administrator) – sửa lỗi E_NOINTERFACE khi lấy SapModel.
// Cách chính thức tương đương: chạy RegisterETABS.exe trong thư mục ETABS bằng quyền Administrator.
using System;
using System.IO;
using System.Reflection;

namespace MctEtabs
{
    internal static class LenhDangKy
    {
        public static void Chay(KetQua kq, YeuCau yc, bool go)
        {
            if (!OperatingSystem.IsWindows() || yc.ThuNghiem)
            {
                kq.Dung("he-dieu-hanh", "Dang ky giao dien API chi lam duoc tren Windows.");
                return;
            }
            string dll = KetNoi.TimDll(yc.DuongDanEtabs, KetNoi.ThuMucTienTrinh());
            if (dll == null)
            {
                kq.Dung("tim-dll", "Khong tim thay thu muc cai ETABS (ETABSv1.dll).", "tim-dll");
                return;
            }
            string thuMuc = Path.GetDirectoryName(dll);
            kq.Dat("dll", dll);
            string tlb = ThuVienKieu.TimTlb(thuMuc, out string[] tatCa);
            kq.Dat("fileTlb", tatCa);
            if (tlb == null)
            {
                kq.Dung("tim-tlb", "Thu muc ETABS khong co file .tlb. Hay chay RegisterETABS.exe bang quyen Administrator.", "chay-register");
                return;
            }
            kq.Dat("tlb", tlb);
            kq.GhiBuoc("tim-tlb", true, tlb);

            string moTa;
            try { moTa = ThuVienKieu.DangKyChoNguoiDung(tlb, go); }
            catch (Exception ex)
            {
                Exception e = Api.GocLoi(ex);
                kq.Dung(go ? "go-dang-ky" : "dang-ky", e.Message + " (" + HeThong.Hex(e.HResult) + ")", "chay-register");
                return;
            }
            kq.GhiBuoc(go ? "go-dang-ky" : "dang-ky", true, moTa);

            // Kiểm tra lại các giao diện chính trong registry
            try
            {
                Assembly asm = Assembly.LoadFrom(dll);
                Type[] gd = { asm.GetType("ETABSv1.cOAPI", true), asm.GetType("ETABSv1.cSapModel", true), asm.GetType("ETABSv1.cFrameObj", true) };
                bool du = true;
                foreach (Type t in gd)
                {
                    kq.Dat("giaoDien " + t.Name, ThuVienKieu.TrangThaiGiaoDien(t));
                    du &= ThuVienKieu.GiaoDienDaDangKy(t);
                }
                if (!go && !du)
                {
                    kq.Dung("kiem-tra-dang-ky", "Da dang ky type library nhung giao dien cOAPI/cSapModel van chua co trong registry " +
                                                "(IID trong .tlb khac ETABSv1.dll?). Hay chay RegisterETABS.exe bang quyen Administrator.", "chay-register");
                    return;
                }
                kq.GhiBuoc("kiem-tra-dang-ky", true, go ? "Da go" : "cOAPI, cSapModel, cFrameObj da co trong registry");
            }
            catch (Exception ex) { kq.GhiBuoc("kiem-tra-dang-ky", false, Api.GocLoi(ex).Message); }
            kq.Ok = true;
        }
    }
}
