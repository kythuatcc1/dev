// Mô phỏng các giao diện ETABSv1 cần cho lệnh kiểm tra, kèm các tình huống lỗi đã gặp trên máy thật.
// Biến môi trường MCT_GIA_LAP:
//   (trống)       bình thường
//   boc-rong      Helper.GetObject trả lớp bọc rỗng (gọi gì cũng NullReferenceException), GetObjectProcess thì đúng
//   boc-rong-het  cả hai cách đều trả lớp bọc rỗng
//   chua-mo       gắn được, GetOAPIVersionNumber được, nhưng chưa mở mô hình (SapModel.* lỗi NullReference)
//   treo          GetObject không trả lời (giống ETABS đang mở hộp thoại)
using System;

namespace ETABSv1
{
    public enum eUnits { lb_in_F = 1, lb_ft_F = 2, kip_in_F = 3, kip_ft_F = 4, kN_mm_C = 5, kN_m_C = 6, kgf_mm_C = 7, kgf_m_C = 8, N_mm_C = 9, N_m_C = 10, Ton_mm_C = 11, Ton_m_C = 12 }

    public interface cHelper
    {
        cOAPI GetObject(string typeName);
        cOAPI GetObjectProcess(string typeName, int pid);
    }

    public interface cOAPI
    {
        cSapModel SapModel { get; }
        double GetOAPIVersionNumber();
    }

    public interface cSapModel
    {
        cPointObj PointObj { get; }
        cFrameObj FrameObj { get; }
        cAreaObj AreaObj { get; }
        cLoadPatterns LoadPatterns { get; }
        int GetVersion(ref string Version, ref double MyVersionNumber);
        string GetModelFilename(bool IncludePath = true);
        eUnits GetPresentUnits();
        bool GetModelIsLocked();
    }

    public interface cPointObj { int Count(); }
    public interface cFrameObj { int Count(); }
    public interface cAreaObj { int Count(); }
    public interface cLoadPatterns { int GetNameList(ref int NumberNames, ref string[] MyName); }

    internal sealed class MoHinh
    {
        public bool DaMo = Environment.GetEnvironmentVariable("MCT_GIA_LAP") != "chua-mo";
        public string File = @"D:\Dự án\Móng cẩu tháp CT1.EDB";
    }

    public class Helper : cHelper
    {
        static string TinhHuong => Environment.GetEnvironmentVariable("MCT_GIA_LAP") ?? "";
        public cOAPI GetObject(string typeName)
        {
            if (TinhHuong == "treo") System.Threading.Thread.Sleep(600000);
            return new wOAPI(TinhHuong.StartsWith("boc-rong") ? null : new MoHinh());
        }
        public cOAPI GetObjectProcess(string typeName, int pid) => new wOAPI(TinhHuong == "boc-rong-het" ? null : new MoHinh());
    }

    public class wOAPI : cOAPI
    {
        private readonly MoHinh _goc;
        internal wOAPI(MoHinh goc) { _goc = goc; }
        public cSapModel SapModel => new wSapModel(_goc);
        public double GetOAPIVersionNumber() => _goc == null ? throw new NullReferenceException() : 2.14;
    }

    public class wSapModel : cSapModel
    {
        private readonly MoHinh _goc;
        internal wSapModel(MoHinh goc) { _goc = goc; }
        MoHinh M => _goc != null && _goc.DaMo ? _goc : throw new NullReferenceException();
        public cPointObj PointObj => new Dem(M == null ? 0 : 12);
        public cFrameObj FrameObj => new Dem(M == null ? 0 : 99);
        public cAreaObj AreaObj => new Dem(M == null ? 0 : 1);
        public cLoadPatterns LoadPatterns => new Mau(M);
        public int GetVersion(ref string Version, ref double MyVersionNumber) { _ = M; Version = "23.0.0"; MyVersionNumber = 23.0; return 0; }
        public string GetModelFilename(bool IncludePath = true) => IncludePath ? M.File : System.IO.Path.GetFileName(M.File.Replace('\\', '/'));
        public eUnits GetPresentUnits() { _ = M; return eUnits.kN_m_C; }
        public bool GetModelIsLocked() { _ = M; return false; }
    }

    internal sealed class Dem : cPointObj, cFrameObj, cAreaObj
    {
        private readonly int _so;
        public Dem(int so) { _so = so; }
        public int Count() => _so;
    }

    internal sealed class Mau : cLoadPatterns
    {
        public Mau(MoHinh m) { _ = m; }
        public int GetNameList(ref int NumberNames, ref string[] MyName) { MyName = new[] { "Dead", "Live", "Tĩnh tải phụ" }; NumberNames = MyName.Length; return 0; }
    }
}
