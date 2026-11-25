// Type library (giao diện API) của ETABS: chẩn đoán đăng ký với Windows và đăng ký cho tài khoản hiện tại.
// Lỗi gặp trên máy thật (ETABS 23): gọi thẳng COM thì GetOAPIVersionNumber được, nhưng lấy SapModel báo
// E_NOINTERFACE (0x80004002) và lớp bọc của ETABSv1.dll có m_objInner = null – Windows thiếu thông tin
// giao diện (type library) để chuyển đối tượng API giữa ETABS và chương trình khác.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text.Json.Nodes;
using Microsoft.Win32;

namespace MctEtabs
{
    [ComImport, Guid("00020400-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IDispatchThuan
    {
        [PreserveSig] int GetTypeInfoCount(out uint soLuong);
        [PreserveSig] int GetTypeInfo(uint chiSo, int lcid, out ITypeInfo kieu);
    }

    internal static class ThuVienKieu
    {
        [DllImport("oleaut32.dll", CharSet = CharSet.Unicode)]
        static extern int LoadTypeLibEx(string file, int cachDangKy, out ITypeLib thuVien);

        [DllImport("oleaut32.dll", CharSet = CharSet.Unicode)]
        static extern int RegisterTypeLibForUser(ITypeLib thuVien, string duongDan, string thuMucTroGiup);

        [DllImport("oleaut32.dll")]
        static extern int UnRegisterTypeLibForUser(ref Guid libId, ushort banChinh, ushort banPhu, int lcid, SYSKIND he);

        [DllImport("ole32.dll", CharSet = CharSet.Unicode)]
        static extern int CLSIDFromProgID(string progId, out Guid clsid);

        [DllImport("oleaut32.dll")]
        static extern int GetActiveObject(ref Guid clsid, IntPtr reserved, out IntPtr unknown);

        const int REGKIND_NONE = 2;

        /// <summary>File .tlb của ETABS trong thư mục cài (ưu tiên ETABSv1.tlb).</summary>
        public static string TimTlb(string thuMucEtabs, out string[] tatCa)
        {
            tatCa = Directory.Exists(thuMucEtabs) ? Directory.GetFiles(thuMucEtabs, "*.tlb") : Array.Empty<string>();
            return tatCa.FirstOrDefault(f => Path.GetFileName(f).Equals("ETABSv1.tlb", StringComparison.OrdinalIgnoreCase))
                ?? tatCa.FirstOrDefault(f => Path.GetFileName(f).StartsWith("ETABS", StringComparison.OrdinalIgnoreCase))
                ?? tatCa.FirstOrDefault();
        }

        static string DocKhoa(string khoa)
        {
            using RegistryKey k = Registry.ClassesRoot.OpenSubKey(khoa);
            return k?.GetValue("") as string;
        }

        public static string TrangThaiGiaoDien(Type t)
        {
            string iid = t.GUID.ToString("B");
            using RegistryKey k = Registry.ClassesRoot.OpenSubKey(@"Interface\" + iid);
            if (k == null) return iid + ": CHUA dang ky";
            return iid + ": da dang ky (ProxyStub " + (DocKhoa(@"Interface\" + iid + @"\ProxyStubClsid32") ?? "-") +
                   ", TypeLib " + (DocKhoa(@"Interface\" + iid + @"\TypeLib") ?? "-") + ")";
        }

        public static bool GiaoDienDaDangKy(Type t)
        {
            using RegistryKey k = Registry.ClassesRoot.OpenSubKey(@"Interface\" + t.GUID.ToString("B") + @"\ProxyStubClsid32");
            return k != null;
        }

        static (Guid libId, ushort chinh, ushort phu, int lcid, SYSKIND he) ThuocTinh(ITypeLib tl)
        {
            tl.GetLibAttr(out IntPtr p);
            try
            {
                TYPELIBATTR a = Marshal.PtrToStructure<TYPELIBATTR>(p);
                return (a.guid, (ushort)a.wMajorVerNum, (ushort)a.wMinorVerNum, a.lcid, a.syskind);
            }
            finally { tl.ReleaseTLibAttr(p); }
        }

        static Dictionary<string, Guid> CacKieu(ITypeLib tl)
        {
            var ds = new Dictionary<string, Guid>(StringComparer.Ordinal);
            int n = tl.GetTypeInfoCount();
            for (int i = 0; i < n; i++)
            {
                tl.GetDocumentation(i, out string ten, out _, out _, out _);
                tl.GetTypeInfo(i, out ITypeInfo ti);
                ti.GetTypeAttr(out IntPtr pa);
                try { ds[ten] = Marshal.PtrToStructure<TYPEATTR>(pa).guid; }
                finally { ti.ReleaseTypeAttr(pa); }
            }
            return ds;
        }

        /// <summary>Chẩn đoán đầy đủ: giao diện trong registry, QueryInterface trên đối tượng ETABS, IDispatch tự mô tả, file .tlb.</summary>
        public static JsonObject ChanDoan(string progId, Type[] giaoDien, string thuMucEtabs)
        {
            var cd = new JsonObject();
            var dk = new JsonObject();
            foreach (Type t in giaoDien) dk[t.Name] = Thu(() => TrangThaiGiaoDien(t));
            cd["giaoDienTrongRegistry"] = dk;

            cd["doiTuongEtabs"] = Thu(() =>
            {
                Marshal.ThrowExceptionForHR(CLSIDFromProgID(progId, out Guid clsid));
                Marshal.ThrowExceptionForHR(GetActiveObject(ref clsid, IntPtr.Zero, out IntPtr unk));
                var r = new JsonObject();
                try
                {
                    var qi = new JsonObject();
                    foreach (Type t in giaoDien)
                    {
                        Guid iid = t.GUID;
                        int h = Marshal.QueryInterface(unk, ref iid, out IntPtr p);
                        if (p != IntPtr.Zero) Marshal.Release(p);
                        qi[t.Name] = h == 0 ? "OK" : HeThong.Hex(h);
                    }
                    r["queryInterface"] = qi;
                    object o = Marshal.GetObjectForIUnknown(unk);
                    if (o is IDispatchThuan d && d.GetTypeInfo(0, 0, out ITypeInfo ti) == 0 && ti != null)
                    {
                        ti.GetDocumentation(-1, out string ten, out _, out _, out _);
                        ti.GetTypeAttr(out IntPtr pa);
                        TYPEATTR ta;
                        try { ta = Marshal.PtrToStructure<TYPEATTR>(pa); } finally { ti.ReleaseTypeAttr(pa); }
                        r["idispatchMoTa"] = ten + " " + ta.guid.ToString("B") + " (" + ta.typekind + ")";
                        r["idispatchThuVien"] = Thu(() =>
                        {
                            ti.GetContainingTypeLib(out ITypeLib tl, out _);
                            var a = ThuocTinh(tl);
                            return a.libId.ToString("B") + " v" + a.chinh.ToString("x") + "." + a.phu.ToString("x");
                        });
                    }
                }
                finally { Marshal.Release(unk); }
                return r;
            });

            string tlb = TimTlb(thuMucEtabs, out string[] tatCa);
            cd["fileTlb"] = KetQua.ThanhNut(tatCa);
            if (tlb != null)
            {
                cd["thuVienTlb"] = Thu(() =>
                {
                    Marshal.ThrowExceptionForHR(LoadTypeLibEx(tlb, REGKIND_NONE, out ITypeLib tl));
                    var a = ThuocTinh(tl);
                    string khoa = @"TypeLib\" + a.libId.ToString("B") + @"\" + a.chinh.ToString("x") + "." + a.phu.ToString("x");
                    var r = new JsonObject
                    {
                        ["libId"] = a.libId.ToString("B") + " v" + a.chinh.ToString("x") + "." + a.phu.ToString("x"),
                        ["dangKyWin64"] = DocKhoa(khoa + @"\0\win64") ?? DocKhoa(khoa + @"\" + a.lcid.ToString("x") + @"\win64") ?? "CHUA dang ky"
                    };
                    Dictionary<string, Guid> kieu = CacKieu(tl);
                    var khop = new JsonObject();
                    foreach (Type t in giaoDien)
                        khop[t.Name] = kieu.TryGetValue(t.Name, out Guid g)
                            ? g.ToString("B") + (g == t.GUID ? " (khop ETABSv1.dll)" : " (KHAC ETABSv1.dll " + t.GUID.ToString("B") + ")")
                            : "khong co trong tlb";
                    r["giaoDien"] = khop;
                    return r;
                });
            }
            return cd;
        }

        /// <summary>Đăng ký (hoặc gỡ) type library của ETABS cho tài khoản Windows hiện tại – không cần quyền Administrator.</summary>
        public static string DangKyChoNguoiDung(string tlb, bool go)
        {
            Marshal.ThrowExceptionForHR(LoadTypeLibEx(tlb, REGKIND_NONE, out ITypeLib tl));
            var a = ThuocTinh(tl);
            string moTa = a.libId.ToString("B") + " v" + a.chinh.ToString("x") + "." + a.phu.ToString("x");
            if (go)
            {
                Guid id = a.libId;
                int h = UnRegisterTypeLibForUser(ref id, a.chinh, a.phu, a.lcid, a.he);
                if (h != 0 && h != unchecked((int)0x8002801C)) Marshal.ThrowExceptionForHR(h);   // TYPE_E_REGISTRYACCESS: chưa từng đăng ký
                return "Da go dang ky " + moTa;
            }
            Marshal.ThrowExceptionForHR(RegisterTypeLibForUser(tl, tlb, Path.GetDirectoryName(tlb)));
            return "Da dang ky " + moTa + " tu " + tlb;
        }

        static JsonNode Thu(Func<object> viec)
        {
            try { return KetQua.ThanhNut(viec()); }
            catch (Exception ex) { Exception e = Api.GocLoi(ex); return JsonValue.Create("loi: " + e.GetType().Name + ": " + e.Message + " (" + HeThong.Hex(e.HResult) + ")"); }
        }
    }
}
