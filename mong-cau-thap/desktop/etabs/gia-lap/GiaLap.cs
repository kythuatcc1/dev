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
// MCT_GIA_LAP_MO : file .EDB giả lập đã lưu – nạp lại khi gắn (giống ETABS thật vẫn mở mô hình giữa các lệnh)
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
    public enum eItemTypeElm { ObjectElm = 0, Element = 1, GroupElm = 2, SelectionElm = 3 }

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
        cAnalyze Analyze { get; }
        cAnalysisResults Results { get; }
        cPointElm PointElm { get; }
        int SetPresentUnits(eUnits Units);
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
        int GetCoordCartesian(string Name, ref double X, ref double Y, ref double Z, string CSys = "Global");
    }
    public interface cPointElm { int GetCoordCartesian(string Name, ref double X, ref double Y, ref double Z, string CSys = "Global"); }
    public interface cAnalyze
    {
        int RunAnalysis();
        int SetRunCaseFlag(string Name, bool Run, bool All = false);
    }
    public interface cAnalysisResultsSetup
    {
        int DeselectAllCasesAndCombosForOutput();
        int SetComboSelectedForOutput(string Name, bool Selected = true);
    }
    public interface cAnalysisResults
    {
        cAnalysisResultsSetup Setup { get; }
        int FrameForce(string Name, eItemTypeElm ItemTypeElm, ref int NumberResults, ref string[] Obj, ref double[] ObjSta, ref string[] Elm, ref double[] ElmSta,
                       ref string[] LoadCase, ref string[] StepType, ref double[] StepNum, ref double[] P, ref double[] V2, ref double[] V3, ref double[] T, ref double[] M2, ref double[] M3);
        int JointDispl(string Name, eItemTypeElm ItemTypeElm, ref int NumberResults, ref string[] Obj, ref string[] Elm, ref string[] LoadCase, ref string[] StepType,
                       ref double[] StepNum, ref double[] U1, ref double[] U2, ref double[] U3, ref double[] R1, ref double[] R2, ref double[] R3);
        int AreaForceShell(string Name, eItemTypeElm ItemTypeElm, ref int NumberResults, ref string[] Obj, ref string[] Elm, ref string[] PointElm, ref string[] LoadCase,
                           ref string[] StepType, ref double[] StepNum, ref double[] F11, ref double[] F22, ref double[] F12, ref double[] FMax, ref double[] FMin, ref double[] FAngle,
                           ref double[] FVM, ref double[] M11, ref double[] M22, ref double[] M12, ref double[] MMax, ref double[] MMin, ref double[] MAngle, ref double[] V13,
                           ref double[] V23, ref double[] VMax, ref double[] VAngle);
    }
    public interface cFrameObj
    {
        int Count(string MainName = "");
        int GetPoints(string Name, ref string Point1, ref string Point2);
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
        public bool DaPhanTich;
        public Dictionary<string, int> TenVo = new Dictionary<string, int>();
        public List<string> ToHopXuat = new List<string>();
        public List<string> TatCaKhongChay = new List<string>();
        public int SoDiemCu = 12, SoThanhCu = 99, SoVoCu = 1;
        public bool MoiTao;

        /// <summary>Ghi/nạp mô hình dạng văn bản (thay cho file .EDB thật).</summary>
        public void Ghi(string file)
        {
            var d = new List<string> { "FILE|" + file, "DAY|" + CaoDoDay.ToString("R", System.Globalization.CultureInfo.InvariantCulture) };
            foreach (var kv in Diem) d.Add("P|" + kv.Key + "|" + string.Join("|", kv.Value.Select(v => v.ToString("R", System.Globalization.CultureInfo.InvariantCulture))));
            foreach (var t in Thanh) d.Add("F|" + string.Join("|", t));
            foreach (var kv in TenVo) d.Add("A|" + kv.Key + "|" + string.Join(",", Vo[kv.Value]));
            foreach (string m in Mau) d.Add("L|" + m);
            foreach (string c in ToHop.Keys) d.Add("C|" + c);
            System.IO.File.WriteAllLines(file, d);
        }
        public static MoHinh Nap(string file)
        {
            var m = new MoHinh { DaMo = true, MoiTao = true, SoDiemCu = 0, SoThanhCu = 0, SoVoCu = 0 };
            foreach (string dong in System.IO.File.ReadAllLines(file))
            {
                string[] x = dong.Split('|');
                double so(string v) => double.Parse(v, System.Globalization.CultureInfo.InvariantCulture);
                switch (x[0])
                {
                    case "FILE": m.File = x[1]; break;
                    case "DAY": m.CaoDoDay = so(x[1]); break;
                    case "P": m.Diem[x[1]] = new[] { so(x[2]), so(x[3]), so(x[4]) }; break;
                    case "F": m.Thanh.Add(new[] { x[1], x[2], x[3], x[4] }); break;
                    case "A": m.TenVo[x[1]] = m.Vo.Count; m.Vo.Add(x[2].Split(',')); break;
                    case "L": m.Mau.Add(x[1]); break;
                    case "C": m.ToHop[x[1]] = new List<string>(); break;
                }
            }
            return m;
        }
    }

    public class Helper : cHelper
    {
        static string TinhHuong => Environment.GetEnvironmentVariable("MCT_GIA_LAP") ?? "";
        public cOAPI GetObject(string typeName)
        {
            if (TinhHuong == "treo") System.Threading.Thread.Sleep(600000);
            if (TinhHuong.StartsWith("boc-rong")) return new wOAPI(null);
            string mo = Environment.GetEnvironmentVariable("MCT_GIA_LAP_MO");
            return new wOAPI(!string.IsNullOrEmpty(mo) && System.IO.File.Exists(mo) ? MoHinh.Nap(mo) : new MoHinh());
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

    public class wSapModel : cSapModel, cFile, cStory, cPropMaterial, cPropFrame, cPropArea, cPointObj, cFrameObj, cAreaObj, cLoadPatterns, cCombo, cView,
                             cAnalyze, cAnalysisResults, cAnalysisResultsSetup, cPointElm
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
        public cAnalyze Analyze { get { _ = M; return this; } }
        public cAnalysisResults Results { get { _ = M; return this; } }
        public cAnalysisResultsSetup Setup { get { _ = M; return this; } }
        public cPointElm PointElm { get { _ = M; return this; } }
        public int SetPresentUnits(eUnits Units) { M.DonVi = Units; return 0; }

        // cAnalyze – cần lưu file trước khi chạy (như ETABS)
        public int RunAnalysis() { if (string.IsNullOrEmpty(M.File) || M.Thanh.Count == 0) return 1; M.DaPhanTich = true; return 0; }
        public int SetRunCaseFlag(string Name, bool Run, bool All = false) { if (Name != "Modal") return 1; M.TatCaKhongChay.Add(Name); return 0; }

        // cAnalysisResultsSetup
        public int DeselectAllCasesAndCombosForOutput() { M.ToHopXuat.Clear(); return 0; }
        public int SetComboSelectedForOutput(string Name, bool Selected = true) { if (!M.ToHop.ContainsKey(Name)) return 1; if (Selected) M.ToHopXuat.Add(Name); return 0; }

        // cAnalysisResults – số liệu giả lập có quy luật để kiểm tra app:
        //   thanh "C{p}_{k}", tổ hợp thứ j: P = −(1000 + 100p + 10j + k) − 0,5·sta ; V2 = 10 + j ; M2 = 100 + 2j − k ; M3 = j
        //   nút: U1 = 0,001(j+1) ; U2 = 0,0005 ; U3 = −0,002 ; R1 = 1e−4 ; R2 = 2e−4
        //   vỏ : M11 = 10 + j ; M22 = 5 ; M12 = 0 ; V13 = 2 ; V23 = 1 (hằng số → mômen mặt cắt = giá trị × bề rộng)
        int ChiSo(string ten) { int i = ten.IndexOf('_'); return i > 1 && int.TryParse(ten.Substring(1, i - 1), out int p) ? p : 0; }
        int Doan(string ten) { int i = ten.IndexOf('_'); return i > 0 && int.TryParse(ten.Substring(i + 1), out int k) ? k : 0; }
        public int FrameForce(string Name, eItemTypeElm ItemTypeElm, ref int NumberResults, ref string[] Obj, ref double[] ObjSta, ref string[] Elm, ref double[] ElmSta,
                              ref string[] LoadCase, ref string[] StepType, ref double[] StepNum, ref double[] P, ref double[] V2, ref double[] V3, ref double[] T, ref double[] M2, ref double[] M3)
        {
            var t = M.Thanh.FirstOrDefault(x => x[0] == Name);
            if (!M.DaPhanTich || t == null || ItemTypeElm != eItemTypeElm.ObjectElm) return 1;
            double[] a = M.Diem[t[1]], b = M.Diem[t[2]];
            double L = Math.Abs(a[2] - b[2]);
            int p = ChiSo(Name), k = Doan(Name), n = M.ToHopXuat.Count * 2;
            NumberResults = n; Obj = new string[n]; ObjSta = new double[n]; Elm = new string[n]; ElmSta = new double[n]; LoadCase = new string[n];
            StepType = new string[n]; StepNum = new double[n]; P = new double[n]; V2 = new double[n]; V3 = new double[n]; T = new double[n]; M2 = new double[n]; M3 = new double[n];
            for (int j = 0, i = 0; j < M.ToHopXuat.Count; j++)
                foreach (double sta in new[] { 0, L })
                {
                    Obj[i] = Name; ObjSta[i] = sta; Elm[i] = Name; ElmSta[i] = sta; LoadCase[i] = M.ToHopXuat[j]; StepType[i] = "";
                    P[i] = -(1000 + 100 * p + 10 * j + k) - 0.5 * sta; V2[i] = 10 + j; V3[i] = 0; T[i] = 0; M2[i] = 100 + 2 * j - k; M3[i] = j;
                    i++;
                }
            return 0;
        }
        public int JointDispl(string Name, eItemTypeElm ItemTypeElm, ref int NumberResults, ref string[] Obj, ref string[] Elm, ref string[] LoadCase, ref string[] StepType,
                              ref double[] StepNum, ref double[] U1, ref double[] U2, ref double[] U3, ref double[] R1, ref double[] R2, ref double[] R3)
        {
            if (!M.DaPhanTich || !M.Diem.ContainsKey(Name)) return 1;
            int n = M.ToHopXuat.Count;
            NumberResults = n; Obj = new string[n]; Elm = new string[n]; LoadCase = M.ToHopXuat.ToArray(); StepType = new string[n]; StepNum = new double[n];
            U1 = new double[n]; U2 = new double[n]; U3 = new double[n]; R1 = new double[n]; R2 = new double[n]; R3 = new double[n];
            for (int j = 0; j < n; j++) { Obj[j] = Name; Elm[j] = Name; U1[j] = 0.001 * (j + 1); U2[j] = 0.0005; U3[j] = -0.002; R1[j] = 1e-4; R2[j] = 2e-4; }
            return 0;
        }
        public int AreaForceShell(string Name, eItemTypeElm ItemTypeElm, ref int NumberResults, ref string[] Obj, ref string[] Elm, ref string[] PointElm, ref string[] LoadCase,
                                  ref string[] StepType, ref double[] StepNum, ref double[] F11, ref double[] F22, ref double[] F12, ref double[] FMax, ref double[] FMin, ref double[] FAngle,
                                  ref double[] FVM, ref double[] M11, ref double[] M22, ref double[] M12, ref double[] MMax, ref double[] MMin, ref double[] MAngle, ref double[] V13,
                                  ref double[] V23, ref double[] VMax, ref double[] VAngle)
        {
            if (!M.DaPhanTich || !TenVo.TryGetValue(Name, out int chiSoVo)) return 1;
            string[] diem = M.Vo[chiSoVo];
            int n = diem.Length * M.ToHopXuat.Count;
            NumberResults = n;
            Obj = new string[n]; Elm = new string[n]; PointElm = new string[n]; LoadCase = new string[n]; StepType = new string[n]; StepNum = new double[n];
            F11 = new double[n]; F22 = new double[n]; F12 = new double[n]; FMax = new double[n]; FMin = new double[n]; FAngle = new double[n]; FVM = new double[n];
            M11 = new double[n]; M22 = new double[n]; M12 = new double[n]; MMax = new double[n]; MMin = new double[n]; MAngle = new double[n];
            V13 = new double[n]; V23 = new double[n]; VMax = new double[n]; VAngle = new double[n];
            for (int j = 0, i = 0; j < M.ToHopXuat.Count; j++)
                foreach (string d in diem)
                {
                    Obj[i] = Name; Elm[i] = Name; PointElm[i] = d; LoadCase[i] = M.ToHopXuat[j]; StepType[i] = "";
                    M11[i] = 10 + j; M22[i] = 5; M12[i] = 0; V13[i] = 2; V23[i] = 1;
                    i++;
                }
            return 0;
        }
        Dictionary<string, int> TenVo => M.TenVo;
        int cFrameObj.GetPoints(string Name, ref string Point1, ref string Point2)
        {
            var t = M.Thanh.FirstOrDefault(x => x[0] == Name);
            if (t == null) return 1;
            Point1 = t[1]; Point2 = t[2]; return 0;
        }
        public int GetCoordCartesian(string Name, ref double X, ref double Y, ref double Z, string CSys = "Global")
        {
            if (!M.Diem.TryGetValue(Name, out double[] t)) return 1;
            X = t[0]; Y = t[1]; Z = t[2]; return 0;
        }
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
            M.Ghi(FileName);
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
            M.TenVo[Name] = M.Vo.Count;
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
