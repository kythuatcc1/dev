// ETABSv1.dll GIẢ LẬP – mô phỏng các giao diện ETABSv1 mà cầu nối dùng, kèm các tình huống lỗi đã gặp trên máy thật.
// Chữ ký hàm theo tài liệu API ETABS (v22/v23); hàm kiểm tra tham số chặt (điểm phải có, mảng đúng độ dài…).
// Biến môi trường MCT_GIA_LAP:
//   (trống)          bình thường
//   boc-rong         Helper.GetObject trả lớp bọc rỗng (gọi gì cũng NullReferenceException), GetObjectProcess thì đúng
//   boc-rong-het     cả hai cách đều trả lớp bọc rỗng
//   chua-mo          gắn được, GetOAPIVersionNumber được, nhưng chưa mở mô hình (SapModel.* lỗi NullReference)
//   treo             GetObject không trả lời (giống ETABS đang mở hộp thoại)
//   thieu-giao-dien  giống máy thật thiếu đăng ký type library: GetOAPIVersionNumber được, lấy SapModel báo E_NOINTERFACE
//   tang-loi         SetStories_2 với SimilarToStory "" trả mã lỗi 1 (chỉ nhận "None")
// MCT_GIA_LAP_GHI: file JSON ghi lại mô hình giả lập sau lệnh Save (để kiểm tra)
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace ETABSv1
{
    public enum eUnits { lb_in_F = 1, lb_ft_F = 2, kip_in_F = 3, kip_ft_F = 4, kN_mm_C = 5, kN_m_C = 6, kgf_mm_C = 7, kgf_m_C = 8, N_mm_C = 9, N_m_C = 10, Ton_mm_C = 11, Ton_m_C = 12 }
    public enum eMatType { Steel = 1, Concrete = 2, NoDesign = 3, Aluminum = 4, ColdFormed = 5, Rebar = 6, Tendon = 7, Masonry = 8 }
    public enum eSlabType { Slab = 0, Drop = 1, Stiff = 2, Ribbed = 3, Waffle = 4, Mat = 5, Footing = 6 }
    public enum eShellType { ShellThin = 1, ShellThick = 2, Membrane = 3, Layered = 6 }
    public enum eItemType { Objects = 0, Group = 1, SelectedObjects = 2 }
    public enum eLoadPatternType { Dead = 1, SuperDead = 2, Live = 3, ReduceLive = 4, Quake = 5, Wind = 6, Snow = 7, Other = 8 }
    public enum eCNameType { LoadCase = 0, LoadCombo = 1 }

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
        cFile File { get; }
        cStory Story { get; }
        cPropMaterial PropMaterial { get; }
        cPropFrame PropFrame { get; }
        cPropArea PropArea { get; }
        cPointObj PointObj { get; }
        cFrameObj FrameObj { get; }
        cAreaObj AreaObj { get; }
        cLoadPatterns LoadPatterns { get; }
        cCombo RespCombo { get; }
        cView View { get; }
        int InitializeNewModel(eUnits Units = eUnits.kip_in_F);
        int GetVersion(ref string Version, ref double MyVersionNumber);
        string GetModelFilename(bool IncludePath = true);
        eUnits GetPresentUnits();
        bool GetModelIsLocked();
    }

    public interface cFile
    {
        int NewBlank();
        int NewGridOnly(int NumberStorys, double TypicalStoryHeight, double BottomStoryHeight, int NumberLinesX, int NumberLinesY, double SpacingX, double SpacingY);
        int Save(string FileName = "");
    }
    public interface cStory
    {
        int SetStories_2(double BaseElevation, int NumberStories, ref string[] StoryNames, ref double[] StoryHeights, ref bool[] IsMasterStory,
                         ref string[] SimilarToStory, ref bool[] SpliceAbove, ref double[] SpliceHeight, ref int[] color);
    }
    public interface cPropMaterial
    {
        int SetMaterial(string Name, eMatType MatType, int Color = -1, string Notes = "", string GUID = "");
        int SetMPIsotropic(string Name, double E, double U, double A, double Temp = 0);
        int SetWeightAndMass(string Name, int MyOption, double Value, double Temp = 0);
    }
    public interface cPropFrame
    {
        int SetCircle(string Name, string MatProp, double T3, int Color = -1, string Notes = "", string GUID = "");
        int SetRectangle(string Name, string MatProp, double T3, double T2, int Color = -1, string Notes = "", string GUID = "");
        int SetModifiers(string Name, ref double[] Value);
    }
    public interface cPropArea
    {
        int SetSlab(string Name, eSlabType SlabType, eShellType ShellType, string MatProp, double Thickness, int color = -1, string notes = "", string GUID = "");
    }
    public interface cPointObj
    {
        int Count();
        int AddCartesian(double X, double Y, double Z, ref string Name, string UserName = "", string CSys = "Global", bool MergeOff = false, int MergeNumber = 0);
        int SetSpring(string Name, ref double[] k, eItemType ItemType = eItemType.Objects, bool IsLocalCSys = false, bool Replace = false);
        int SetRestraint(string Name, ref bool[] Value, eItemType ItemType = eItemType.Objects);
        int SetLoadForce(string Name, string LoadPat, ref double[] Value, bool Replace = false, string CSys = "Global", eItemType ItemType = eItemType.Objects);
    }
    public interface cFrameObj
    {
        int Count(string MainName = "");
        int AddByPoint(string Point1, string Point2, ref string Name, string PropName = "Default", string UserName = "");
    }
    public interface cAreaObj
    {
        int Count(string MainName = "");
        int AddByPoint(int NumberPoints, ref string[] Point, ref string Name, string PropName = "Default", string UserName = "");
    }
    public interface cLoadPatterns
    {
        int GetNameList(ref int NumberNames, ref string[] MyName);
        int Add(string Name, eLoadPatternType MyType, double SelfWTMultiplier = 0, bool AddAnalysisCase = true);
        int SetLoadType(string Name, eLoadPatternType MyType);
        int SetSelfWTMultiplier(string Name, double Val);
    }
    public interface cCombo
    {
        int Add(string Name, int ComboType);
        int SetCaseList(string Name, ref eCNameType CNameType, string CName, double SF);
    }
    public interface cView { int RefreshView(int Window = 0, bool Zoom = true); }

    /// <summary>Trạng thái mô hình giả lập.</summary>
    internal sealed class MoHinh
    {
        public bool DaMo = Environment.GetEnvironmentVariable("MCT_GIA_LAP") != "chua-mo";
        public string File = @"D:\Dự án\Móng cẩu tháp CT1.EDB";
        public eUnits DonVi = eUnits.kN_m_C;
        public double CaoDoDay = double.NaN;
        public List<double> CaoTang = new List<double>();
        public HashSet<string> VatLieu = new HashSet<string>(), TietDienThanh = new HashSet<string>(), TietDienVo = new HashSet<string>();
        public Dictionary<string, double[]> Diem = new Dictionary<string, double[]>();
        public List<string[]> Thanh = new List<string[]>();
        public List<string[]> Vo = new List<string[]>();
        public Dictionary<string, double[]> LoXo = new Dictionary<string, double[]>();
        public Dictionary<string, bool[]> Goi = new Dictionary<string, bool[]>();
        public List<string> Mau = new List<string>();                       // load pattern (= load case cùng tên)
        public Dictionary<string, double> BanThan = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, double[]> TongLuc = new Dictionary<string, double[]>();   // tổng lực mỗi pattern
        public Dictionary<string, List<string>> ToHop = new Dictionary<string, List<string>>();
        public int SoDiemCu = 12, SoThanhCu = 99, SoVoCu = 1;
        public bool MoiTao;
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
        public cSapModel SapModel => Environment.GetEnvironmentVariable("MCT_GIA_LAP") == "thieu-giao-dien"
            ? throw new InvalidCastException("Specified cast is not valid.") : new wSapModel(_goc);
        public double GetOAPIVersionNumber() => _goc == null ? throw new NullReferenceException() : 2.14;
    }

    public class wSapModel : cSapModel, cFile, cStory, cPropMaterial, cPropFrame, cPropArea, cPointObj, cFrameObj, cAreaObj, cLoadPatterns, cCombo, cView
    {
        private readonly MoHinh _goc;
        internal wSapModel(MoHinh goc) { _goc = goc; }
        MoHinh M => _goc != null && _goc.DaMo ? _goc : throw new NullReferenceException();

        public cFile File { get { _ = M; return this; } }
        public cStory Story { get { _ = M; return this; } }
        public cPropMaterial PropMaterial { get { _ = M; return this; } }
        public cPropFrame PropFrame { get { _ = M; return this; } }
        public cPropArea PropArea { get { _ = M; return this; } }
        public cPointObj PointObj { get { _ = M; return this; } }
        public cFrameObj FrameObj { get { _ = M; return this; } }
        public cAreaObj AreaObj { get { _ = M; return this; } }
        public cLoadPatterns LoadPatterns { get { _ = M; return this; } }
        public cCombo RespCombo { get { _ = M; return this; } }
        public cView View { get { _ = M; return this; } }

        public int InitializeNewModel(eUnits Units = eUnits.kip_in_F)
        {
            if (_goc == null) throw new NullReferenceException();
            var m = new MoHinh { DaMo = true, File = "", DonVi = Units, SoDiemCu = 0, SoThanhCu = 0, SoVoCu = 0, MoiTao = true };
            CopyTo(m, _goc);
            return 0;
        }
        static void CopyTo(MoHinh nguon, MoHinh dich)
        {
            foreach (var f in typeof(MoHinh).GetFields()) f.SetValue(dich, f.GetValue(nguon));
        }
        public int GetVersion(ref string Version, ref double MyVersionNumber) { _ = M; Version = "23.0.0"; MyVersionNumber = 23.0; return 0; }
        public string GetModelFilename(bool IncludePath = true) => IncludePath ? M.File : Path.GetFileName(M.File.Replace('\\', '/'));
        public eUnits GetPresentUnits() => M.DonVi;
        public bool GetModelIsLocked() { _ = M; return false; }

        // cFile
        public int NewBlank()
        {
            M.CaoTang.Clear(); M.CaoDoDay = double.NaN;
            M.Mau = new List<string> { "Dead", "Live" }; M.BanThan["Dead"] = 1; M.BanThan["Live"] = 0;   // như mô hình mới của ETABS
            return 0;
        }
        public int NewGridOnly(int NumberStorys, double TypicalStoryHeight, double BottomStoryHeight, int NumberLinesX, int NumberLinesY, double SpacingX, double SpacingY)
        { M.CaoDoDay = 0; M.CaoTang = Enumerable.Range(1, NumberStorys).Select(i => BottomStoryHeight + (i - 1) * TypicalStoryHeight).ToList(); return 0; }
        public int Save(string FileName = "")
        {
            if (string.IsNullOrWhiteSpace(FileName)) return 1;
            M.File = FileName;
            string ghi = Environment.GetEnvironmentVariable("MCT_GIA_LAP_GHI");
            if (!string.IsNullOrEmpty(ghi))
            {
                string ds(IEnumerable<string> x) => "[" + string.Join(",", x.Select(v => "\"" + v.Replace("\\", "\\\\") + "\"")) + "]";
                System.IO.File.WriteAllText(ghi, "{\"file\":\"" + FileName.Replace("\\", "\\\\") + "\",\"donVi\":\"" + M.DonVi + "\",\"caoDoDay\":" + M.CaoDoDay.ToString(System.Globalization.CultureInfo.InvariantCulture) +
                    ",\"soTang\":" + M.CaoTang.Count + ",\"soDiem\":" + M.Diem.Count + ",\"soThanh\":" + M.Thanh.Count + ",\"soVo\":" + M.Vo.Count +
                    ",\"soLoXo\":" + M.LoXo.Count + ",\"soGoi\":" + M.Goi.Count + ",\"vatLieu\":" + ds(M.VatLieu) + ",\"tietDienThanh\":" + ds(M.TietDienThanh) +
                    ",\"mau\":" + ds(M.Mau) + ",\"banThanDead\":" + (M.BanThan.TryGetValue("Dead", out double bt) ? bt : -1).ToString(System.Globalization.CultureInfo.InvariantCulture) +
                    ",\"soToHop\":" + M.ToHop.Count + ",\"soThanhPhanBAO\":" + (M.ToHop.TryGetValue("BAO", out var bao) ? bao.Count : -1) +
                    ",\"tongFZ1\":" + (M.TongLuc.TryGetValue("FZ1", out double[] f) ? f[2] : 0).ToString(System.Globalization.CultureInfo.InvariantCulture) +
                    ",\"soMauCoLuc\":" + M.TongLuc.Count +
                    ",\"tietDienVo\":" + ds(M.TietDienVo) + ",\"loXoTAM\":" + (M.LoXo.ContainsKey("TAM_CAU") ? "true" : "false") + "}");
            }
            return 0;
        }

        // cStory
        public int SetStories_2(double BaseElevation, int NumberStories, ref string[] StoryNames, ref double[] StoryHeights, ref bool[] IsMasterStory,
                                ref string[] SimilarToStory, ref bool[] SpliceAbove, ref double[] SpliceHeight, ref int[] color)
        {
            if (M.Diem.Count > 0) return 1;
            if (new object[] { StoryNames, StoryHeights, IsMasterStory, SimilarToStory, SpliceAbove, SpliceHeight, color }.Any(a => ((Array)a).Length != NumberStories)) return 1;
            if (Environment.GetEnvironmentVariable("MCT_GIA_LAP") == "tang-loi" && SimilarToStory.Any(x => x == "")) return 1;
            if (StoryNames.Distinct().Count() != NumberStories || StoryHeights.Any(h => h <= 0)) return 1;
            M.CaoDoDay = BaseElevation;
            M.CaoTang.Clear();
            double z = BaseElevation;
            foreach (double h in StoryHeights) { z += h; M.CaoTang.Add(Math.Round(z, 6)); }
            return 0;
        }

        // cPropMaterial
        public int SetMaterial(string Name, eMatType MatType, int Color = -1, string Notes = "", string GUID = "") { M.VatLieu.Add(Name); return 0; }
        public int SetMPIsotropic(string Name, double E, double U, double A, double Temp = 0) => M.VatLieu.Contains(Name) && E > 0 && U >= 0 && U < 0.5 ? 0 : 1;
        public int SetWeightAndMass(string Name, int MyOption, double Value, double Temp = 0) => M.VatLieu.Contains(Name) && (MyOption == 1 || MyOption == 2) ? 0 : 1;

        // cPropFrame
        public int SetCircle(string Name, string MatProp, double T3, int Color = -1, string Notes = "", string GUID = "")
        { if (!M.VatLieu.Contains(MatProp) || T3 <= 0) return 1; M.TietDienThanh.Add(Name); return 0; }
        public int SetRectangle(string Name, string MatProp, double T3, double T2, int Color = -1, string Notes = "", string GUID = "")
        { if (!M.VatLieu.Contains(MatProp) || T3 <= 0 || T2 <= 0) return 1; M.TietDienThanh.Add(Name); return 0; }
        public int SetModifiers(string Name, ref double[] Value) => M.TietDienThanh.Contains(Name) && Value != null && Value.Length == 8 ? 0 : 1;

        // cPropArea
        public int SetSlab(string Name, eSlabType SlabType, eShellType ShellType, string MatProp, double Thickness, int color = -1, string notes = "", string GUID = "")
        { if (!M.VatLieu.Contains(MatProp) || Thickness <= 0 || ShellType != eShellType.ShellThick) return 1; M.TietDienVo.Add(Name); return 0; }

        // cPointObj
        int cPointObj.Count() => M.MoiTao ? M.Diem.Count : M.SoDiemCu;
        public int AddCartesian(double X, double Y, double Z, ref string Name, string UserName = "", string CSys = "Global", bool MergeOff = false, int MergeNumber = 0)
        {
            bool tren = Math.Abs(Z - M.CaoDoDay) < 1e-6 || M.CaoTang.Any(z => Math.Abs(z - Z) < 1e-6);
            if (!tren) return 1;                                     // giả lập chặt: điểm phải nằm trên cao độ tầng
            Name = string.IsNullOrEmpty(UserName) || M.Diem.ContainsKey(UserName) ? "P" + (M.Diem.Count + 1) : UserName;
            M.Diem[Name] = new[] { X, Y, Z };
            return 0;
        }
        public int SetSpring(string Name, ref double[] k, eItemType ItemType = eItemType.Objects, bool IsLocalCSys = false, bool Replace = false)
        { if (!M.Diem.ContainsKey(Name) || k == null || k.Length != 6) return 1; M.LoXo[Name] = k; return 0; }
        public int SetRestraint(string Name, ref bool[] Value, eItemType ItemType = eItemType.Objects)
        { if (!M.Diem.ContainsKey(Name) || Value == null || Value.Length != 6) return 1; M.Goi[Name] = Value; return 0; }

        // cFrameObj
        int cFrameObj.Count(string MainName) => M.MoiTao ? M.Thanh.Count : M.SoThanhCu;
        int cFrameObj.AddByPoint(string Point1, string Point2, ref string Name, string PropName, string UserName)
        {
            if (!M.Diem.ContainsKey(Point1) || !M.Diem.ContainsKey(Point2) || Point1 == Point2 || !M.TietDienThanh.Contains(PropName)) return 1;
            Name = string.IsNullOrEmpty(UserName) ? "F" + (M.Thanh.Count + 1) : UserName;
            M.Thanh.Add(new[] { Name, Point1, Point2, PropName });
            return 0;
        }

        // cAreaObj
        int cAreaObj.Count(string MainName) => M.MoiTao ? M.Vo.Count : M.SoVoCu;
        int cAreaObj.AddByPoint(int NumberPoints, ref string[] Point, ref string Name, string PropName, string UserName)
        {
            if (Point == null || Point.Length != NumberPoints || NumberPoints < 3 || Point.Any(p => !M.Diem.ContainsKey(p)) || !M.TietDienVo.Contains(PropName)) return 1;
            Name = string.IsNullOrEmpty(UserName) ? "A" + (M.Vo.Count + 1) : UserName;
            M.Vo.Add(Point);
            return 0;
        }

        // cLoadPatterns
        public int GetNameList(ref int NumberNames, ref string[] MyName)
        {
            MyName = M.MoiTao ? M.Mau.ToArray() : new[] { "Dead", "Live", "Tĩnh tải phụ" };
            NumberNames = MyName.Length; return 0;
        }
        public int Add(string Name, eLoadPatternType MyType, double SelfWTMultiplier = 0, bool AddAnalysisCase = true)
        {
            if (M.Mau.Any(x => string.Equals(x, Name, StringComparison.OrdinalIgnoreCase))) return 1;   // trùng tên (không phân biệt hoa thường)
            M.Mau.Add(Name); M.BanThan[Name] = SelfWTMultiplier; return 0;
        }
        public int SetLoadType(string Name, eLoadPatternType MyType) => M.Mau.Contains(Name) ? 0 : 1;
        public int SetSelfWTMultiplier(string Name, double Val) { if (!M.Mau.Contains(Name)) return 1; M.BanThan[Name] = Val; return 0; }

        // cCombo
        int cCombo.Add(string Name, int ComboType)
        {
            if (M.ToHop.ContainsKey(Name) || M.Mau.Contains(Name) || ComboType < 0 || ComboType > 4) return 1;
            M.ToHop[Name] = new List<string>(); return 0;
        }
        public int SetCaseList(string Name, ref eCNameType CNameType, string CName, double SF)
        {
            if (!M.ToHop.ContainsKey(Name)) return 1;
            bool co = CNameType == eCNameType.LoadCase ? M.Mau.Contains(CName) : M.ToHop.ContainsKey(CName) && CName != Name;
            if (!co) return 1;
            M.ToHop[Name].Add(CName); return 0;
        }

        public int SetLoadForce(string Name, string LoadPat, ref double[] Value, bool Replace = false, string CSys = "Global", eItemType ItemType = eItemType.Objects)
        {
            if (!M.Diem.ContainsKey(Name) || !M.Mau.Contains(LoadPat) || Value == null || Value.Length != 6) return 1;
            if (!M.TongLuc.TryGetValue(LoadPat, out double[] t)) M.TongLuc[LoadPat] = t = new double[6];
            for (int i = 0; i < 6; i++) t[i] += Value[i];
            return 0;
        }
        // cView
        public int RefreshView(int Window = 0, bool Zoom = true) => 0;
    }
}
