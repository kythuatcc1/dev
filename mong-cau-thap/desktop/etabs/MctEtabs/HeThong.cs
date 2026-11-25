// Chẩn đoán phía Windows: đăng ký COM của ETABS, bảng ROT, quyền Administrator của từng tiến trình
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace MctEtabs
{
    internal static class HeThong
    {
        [DllImport("ole32.dll", CharSet = CharSet.Unicode)]
        static extern int CLSIDFromProgID(string progId, out Guid clsid);

        [DllImport("oleaut32.dll")]
        static extern int GetActiveObject(ref Guid clsid, IntPtr reserved, out IntPtr unknown);

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern IntPtr OpenProcess(uint quyen, bool keThua, int pid);

        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool OpenProcessToken(IntPtr tienTrinh, uint quyen, out IntPtr token);

        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool GetTokenInformation(IntPtr token, int loai, out int giaTri, int doDai, out int doDaiTra);

        [DllImport("kernel32.dll")]
        static extern bool CloseHandle(IntPtr h);

        const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
        const uint TOKEN_QUERY = 0x0008;
        const int TokenElevation = 20;

        public static string Hex(int hr) => "0x" + hr.ToString("X8");

        /// <summary>ProgID có đăng ký với Windows không; nếu có thì ETABS có mặt trong bảng ROT không.</summary>
        public static (bool dangKy, string clsid, string hrProgId, bool? coTrongRot, string hrRot) KiemTraCom(string progId)
        {
            int hr = CLSIDFromProgID(progId, out Guid clsid);
            if (hr != 0) return (false, null, Hex(hr), null, null);
            int hr2 = GetActiveObject(ref clsid, IntPtr.Zero, out IntPtr unk);
            if (unk != IntPtr.Zero) Marshal.Release(unk);
            return (true, clsid.ToString("B"), Hex(hr), hr2 == 0, Hex(hr2));
        }

        /// <summary>Đối tượng COM của ETABS đang đăng ký trong bảng ROT (gọi qua IDispatch).</summary>
        public static object LayDoiTuongRot(string progId)
        {
            Marshal.ThrowExceptionForHR(CLSIDFromProgID(progId, out Guid clsid));
            Marshal.ThrowExceptionForHR(GetActiveObject(ref clsid, IntPtr.Zero, out IntPtr unk));
            try { return Marshal.GetObjectForIUnknown(unk); }
            finally { Marshal.Release(unk); }
        }

        /// <summary>Tiến trình có chạy bằng quyền Administrator (elevated) không; null nếu không xác định được.</summary>
        public static bool? LaAdmin(int pid)
        {
            IntPtr hp = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
            if (hp == IntPtr.Zero) return null;
            try
            {
                if (!OpenProcessToken(hp, TOKEN_QUERY, out IntPtr ht))
                    return Marshal.GetLastWin32Error() == 5 ? true : (bool?)null;   // 5 = Access denied: thường do tiến trình kia elevated
                try { return GetTokenInformation(ht, TokenElevation, out int cao, sizeof(int), out _) ? cao != 0 : (bool?)null; }
                finally { CloseHandle(ht); }
            }
            finally { CloseHandle(hp); }
        }

        public static bool? LaAdminHienTai() => LaAdmin(Environment.ProcessId);

        public static string DuongDanTienTrinh(Process p, out string loi)
        {
            loi = null;
            try { return p.MainModule?.FileName; }
            catch (Exception ex) { loi = ex.Message; return null; }
        }
    }
}
