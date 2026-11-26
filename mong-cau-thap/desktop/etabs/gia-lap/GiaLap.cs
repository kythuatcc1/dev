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
//   lo-xo-cu         bản ETABS không có SapModel.PropPointSpring (cầu nối phải dùng SetSpring theo trục cục bộ)
//   tang-mo          SetStories_2 được cả khi mô hình đã có đối tượng (mặc định: chỉ được khi chưa có điểm nào – như ETABS khi có đối tượng)
//   khong-di-chuyen  bản ETABS không có SapModel.EditPoint (không dời được điểm – cầu nối phải xoá và vẽ lại)
//   ten-et           GetModelFilename trả file làm việc .$et thay cho .EDB (ETABS 23 khi có thay đổi chưa lưu)
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
        cPropPointSpring PropPointSpring { get; }
        cEditPoint EditPoint { get; }
        int SetPresentUnits(eUnits Units);
        int InitializeNewModel(eUnits Units = eUnits.kip_in_F);
        int GetVersion(ref string Version, ref double MyVersionNumber);
        string GetModelFilename(bool IncludePath = true);
        eUnits GetPresentUnits();
        bool GetModelIsLocked();
        int SetModelIsLocked(bool LockIt);
    }

    public interface cFile
    {
        int NewBlank();
        int NewGridOnly(int NumberStorys, double TypicalStoryHeight, double BottomStoryHeight, int NumberLinesX, int NumberLinesY, double SpacingX, double SpacingY);
        int Save(string FileName = "");
        int OpenFile(string FileName);
    }
    public interface cEditPoint { int ChangeCoordinates_1(string Name, double X, double Y, double Z, bool NoRefresh = false); }
    public interface cStory
    {
        int GetStories_2(ref double BaseElevation, ref int NumberStories, ref string[] StoryNames, ref double[] StoryElevations, ref double[] StoryHeights,
                         ref bool[] IsMasterStory, ref string[] SimilarToStory, ref bool[] SpliceAbove, ref double[] SpliceHeight, ref int[] color);
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
        int SetSpringAssignment(string Name, string SpringProp, eItemType ItemType = eItemType.Objects);
        int SetRestraint(string Name, ref bool[] Value, eItemType ItemType = eItemType.Objects);
        int SetLoadForce(string Name, string LoadPat, ref double[] Value, bool Replace = false, string CSys = "Global", eItemType ItemType = eItemType.Objects);
        int GetCoordCartesian(string Name, ref double X, ref double Y, ref double Z, string CSys = "Global");
        int GetNameList(ref int NumberNames, ref string[] MyName);
        int DeleteSpecialPoint(string Name, eItemType ItemType = eItemType.Objects);
        int ChangeName(string Name, string NewName);
        int DeleteSpring(string Name, eItemType ItemType = eItemType.Objects);
        int DeleteLoadForce(string Name, string LoadPat, eItemType ItemType = eItemType.Objects);
        int SetSpecialPoint(string Name, bool SpecialPoint, eItemType ItemType = eItemType.Objects);
    }
    public interface cPropPointSpring
    {
        int SetPointSpringProp(string Name, int SpringOption, ref double[] k, string CSys = "Local", string SoilProfile = "", string Footing = "",
                               double Period = 0, int Color = -1, string Notes = "", string GUID = "");
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
        int GetNameList(ref int NumberNames, ref string[] MyName);
        int Delete(string Name, eItemType ItemType = eItemType.Objects);
        int SetSection(string Name, string PropName, eItemType ItemType = eItemType.Objects, double SVarRelStartLoc = 0, double SVarTotalLength = 0);
    }
    public interface cAreaObj
    {
        int Count(string MainName = "");
        int AddByPoint(int NumberPoints, ref string[] Point, ref string Name, string PropName = "Default", string UserName = "");
        int GetNameList(ref int NumberNames, ref string[] MyName);
        int Delete(string Name, eItemType ItemType = eItemType.Objects);
        int GetPoints(string Name, ref int NumberPoints, ref string[] Point);
    }
    public interface cLoadPatterns
    {
        int GetNameList(ref int NumberNames, ref string[] MyName);
        int Add(string Name, eLoadPatternType MyType, double SelfWTMultiplier = 0, bool AddAnalysisCase = true);
        int SetLoadType(string Name, eLoadPatternType MyType);
        int SetSelfWTMultiplier(string Name, double Val);
        int Delete(string Name);
    }
    public interface cCombo
    {
        int Add(string Name, int ComboType);
        int SetCaseList(string Name, ref eCNameType CNameType, string CName, double SF);
        int Delete(string Name);
        int GetNameList(ref int NumberNames, ref string[] MyName);
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
        public Dictionary<string, double[]> ThuocTinhLoXo = new Dictionary<string, double[]>();
        public int LoXoTheoThuocTinh, LoXoTongThe;   // số lần gán theo thuộc tính / theo hệ tổng thể (giao diện ETABS không có)
        public Dictionary<string, bool[]> Goi = new Dictionary<string, bool[]>();
        public HashSet<string> DiemRieng = new HashSet<string>();
        public List<string> Mau = new List<string>();                       // load pattern (= load case cùng tên)
        public Dictionary<string, double> BanThan = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, double[]> TongLuc = new Dictionary<string, double[]>();   // tổng lực mỗi pattern (Fx, Fy, Fz, Mx, My, Mz quanh gốc)
        public Dictionary<string, double[]> LucDiem = new Dictionary<string, double[]>();   // "pattern|điểm" → lực tại điểm
        public void TinhTongLuc()
        {
            TongLuc.Clear();
            foreach (var kv in LucDiem)
            {
                string[] k = kv.Key.Split('|');
                if (!Mau.Contains(k[0]) || !Diem.TryGetValue(k[1], out double[] p)) continue;
                if (!TongLuc.TryGetValue(k[0], out double[] t)) TongLuc[k[0]] = t = new double[6];
                double[] f = kv.Value;
                for (int i = 0; i < 6; i++) t[i] += f[i];
                t[3] += p[1] * f[2] - p[2] * f[1]; t[4] += p[2] * f[0] - p[0] * f[2]; t[5] += p[0] * f[1] - p[1] * f[0];
            }
        }
        public Dictionary<string, List<string>> ToHop = new Dictionary<string, List<string>>();
        public bool DaPhanTich, Khoa;
        public Dictionary<string, int> TenVo = new Dictionary<string, int>();
        public List<string> ToHopXuat = new List<string>();
        public List<string> TatCaKhongChay = new List<string>();
        public int SoDiemCu = 12, SoThanhCu = 99, SoVoCu = 1;
        public int SoLanDoi, SoDiemXoa, SoThanhXoa, SoVoXoa, SoDiemThem, SoThanhThem, SoVoThem;   // thống kê thao tác (kiểm tra cập nhật tại chỗ)
        public bool MoiTao, KhoiTaoMoi;   // KhoiTaoMoi: đã gọi InitializeNewModel (dựng mô hình mới) trong lần chạy này

        /// <summary>Ghi/nạp mô hình dạng văn bản (thay cho file .EDB thật).</summary>
        public void Ghi(string file)
        {
            var d = new List<string> { "FILE|" + file, "DAY|" + CaoDoDay.ToString("R", System.Globalization.CultureInfo.InvariantCulture) };
            foreach (var kv in Diem) d.Add("P|" + kv.Key + "|" + string.Join("|", kv.Value.Select(v => v.ToString("R", System.Globalization.CultureInfo.InvariantCulture))));
            foreach (var t in Thanh) d.Add("F|" + string.Join("|", t));
            foreach (var kv in TenVo) d.Add("A|" + kv.Key + "|" + string.Join(",", Vo[kv.Value]));
            foreach (string m in Mau) d.Add("L|" + m);
            d.Add("T|" + string.Join(",", CaoTang.Select(v => v.ToString("R", System.Globalization.CultureInfo.InvariantCulture))));
            foreach (var kv in LoXo) d.Add("S|" + kv.Key);
            foreach (var kv in Goi) d.Add("R|" + kv.Key + "|" + string.Join(",", kv.Value.Select(b => b ? "1" : "0")));
            foreach (var kv in LucDiem) d.Add("Q|" + kv.Key + "|" + string.Join(",", kv.Value.Select(v => v.ToString("R", System.Globalization.CultureInfo.InvariantCulture))));
            foreach (string t in TietDienThanh) d.Add("PF|" + t);
            foreach (string t in TietDienVo) d.Add("PA|" + t);
            foreach (string t in VatLieu) d.Add("M|" + t);
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
                    case "T": m.CaoTang = x[1] == "" ? new List<double>() : x[1].Split(',').Select(so).ToList(); break;
                    case "S": m.LoXo[x[1]] = new double[6]; break;
                    case "R": m.Goi[x[1]] = x[2].Split(',').Select(b => b == "1").ToArray(); break;
                    case "Q": m.LucDiem[x[1] + "|" + x[2]] = x[3].Split(',').Select(so).ToArray(); break;
                    case "PF": m.TietDienThanh.Add(x[1]); break;
                    case "PA": m.TietDienVo.Add(x[1]); break;
                    case "M": m.VatLieu.Add(x[1]); break;
                    case "C": m.ToHop[x[1]] = new List<string>(); break;
                }
            }
            m.TinhTongLuc();
            return m;
        }

        public void XoaVo(string ten)
        {
            var giu = TenVo.Where(kv => kv.Key != ten).OrderBy(kv => kv.Value).Select(kv => (kv.Key, Vo[kv.Value])).ToList();
            TenVo.Clear(); Vo.Clear();
            foreach (var (k, v) in giu) { TenVo[k] = Vo.Count; Vo.Add(v); }
        }
        public bool DiemDangDung(string ten) => Thanh.Any(t => t[1] == ten || t[2] == ten) || Vo.Any(v => v.Contains(ten));
        public bool TrenTang(double z) => Math.Abs(z - CaoDoDay) < 1e-6 || CaoTang.Any(c => Math.Abs(c - z) < 1e-6);
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
                             cAnalyze, cAnalysisResults, cAnalysisResultsSetup, cPointElm, cPropPointSpring, cEditPoint
    {
        private readonly MoHinh _goc;
        internal wSapModel(MoHinh goc) { _goc = goc; }
        MoHinh M => _goc != null && _goc.DaMo ? _goc : throw new NullReferenceException();

        public cFile File { get { _ = M; return this; } }
        public cStory Story { get { _ = M; return this; } }
        public cPropMaterial PropMaterial { get { _ = M; return this; } }
        public cPropFrame PropFrame { get { _ = M; return this; } }
        public cPropArea PropArea { get { _ = M; return this; } }
        public cPropPointSpring PropPointSpring
        {
            get
            {
                _ = M;
                if (Environment.GetEnvironmentVariable("MCT_GIA_LAP") == "lo-xo-cu") throw new NotImplementedException("PropPointSpring khong co trong ban ETABS nay");
                return this;
            }
        }
        public cPointObj PointObj { get { _ = M; return this; } }
        public cEditPoint EditPoint
        {
            get
            {
                _ = M;
                if (Environment.GetEnvironmentVariable("MCT_GIA_LAP") == "khong-di-chuyen") throw new NotImplementedException("EditPoint khong co trong ban ETABS nay");
                return this;
            }
        }
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
        public int RunAnalysis() { if (string.IsNullOrEmpty(M.File) || M.Thanh.Count == 0) return 1; M.DaPhanTich = true; M.Khoa = true; return 0; }
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
            double L = Math.Sqrt(Math.Pow(b[0] - a[0], 2) + Math.Pow(b[1] - a[1], 2) + Math.Pow(b[2] - a[2], 2));
            bool laDam = Name.StartsWith("DG", StringComparison.Ordinal);   // dầm giằng: nội lực riêng, có quy luật
            int p = ChiSo(Name), k = Doan(Name), n = M.ToHopXuat.Count * 2;
            NumberResults = n; Obj = new string[n]; ObjSta = new double[n]; Elm = new string[n]; ElmSta = new double[n]; LoadCase = new string[n];
            StepType = new string[n]; StepNum = new double[n]; P = new double[n]; V2 = new double[n]; V3 = new double[n]; T = new double[n]; M2 = new double[n]; M3 = new double[n];
            for (int j = 0, i = 0; j < M.ToHopXuat.Count; j++)
                foreach (double sta in new[] { 0, L })
                {
                    Obj[i] = Name; ObjSta[i] = sta; Elm[i] = Name; ElmSta[i] = sta; LoadCase[i] = M.ToHopXuat[j]; StepType[i] = "";
                    if (laDam)
                    {   // kéo 50 + 5j; mômen đứng −(40 + 2j) ở đầu, 30 + j ở cuối; mômen ngang 10 + j; cắt 20 + j, 5; xoắn 1
                        P[i] = 50 + 5 * j; V2[i] = 20 + j; V3[i] = 5; T[i] = 1; M2[i] = 10 + j; M3[i] = sta == 0 ? -(40 + 2 * j) : 30 + j;
                    }
                    else { P[i] = -(1000 + 100 * p + 10 * j + k) - 0.5 * sta; V2[i] = 10 + j; V3[i] = 0; T[i] = 0; M2[i] = 100 + 2 * j - k; M3[i] = j; }
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
            var m = new MoHinh { DaMo = true, File = "", DonVi = Units, SoDiemCu = 0, SoThanhCu = 0, SoVoCu = 0, MoiTao = true, KhoiTaoMoi = true };
            CopyTo(m, _goc);
            return 0;
        }
        static void CopyTo(MoHinh nguon, MoHinh dich)
        {
            foreach (var f in typeof(MoHinh).GetFields()) f.SetValue(dich, f.GetValue(nguon));
        }
        public int GetVersion(ref string Version, ref double MyVersionNumber) { _ = M; Version = "23.0.0"; MyVersionNumber = 23.0; return 0; }
        public string GetModelFilename(bool IncludePath = true)
        {   // ten-et: như ETABS 23 khi mô hình có thay đổi chưa lưu – báo file làm việc .$et cùng tên
            string f = Environment.GetEnvironmentVariable("MCT_GIA_LAP") == "ten-et" && M.File.EndsWith(".EDB", StringComparison.OrdinalIgnoreCase)
                ? M.File.Substring(0, M.File.Length - 4) + ".$et" : M.File;
            return IncludePath ? f : Path.GetFileName(f.Replace('\\', '/'));
        }
        public eUnits GetPresentUnits() => M.DonVi;
        public bool GetModelIsLocked() => M.Khoa;
        public int SetModelIsLocked(bool LockIt) { M.Khoa = LockIt; if (!LockIt) M.DaPhanTich = false; return 0; }
        public int OpenFile(string FileName)
        {
            if (string.IsNullOrWhiteSpace(FileName) || !System.IO.File.Exists(FileName)) return 1;
            CopyTo(MoHinh.Nap(FileName), M);
            return 0;
        }

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
                    ",\"soLoXo\":" + M.LoXo.Count + ",\"soThuocTinhLoXo\":" + M.ThuocTinhLoXo.Count + ",\"soLoXoTheoThuocTinh\":" + M.LoXoTheoThuocTinh +
                    ",\"soLoXoTongThe\":" + M.LoXoTongThe + ",\"soGoi\":" + M.Goi.Count + ",\"vatLieu\":" + ds(M.VatLieu) + ",\"tietDienThanh\":" + ds(M.TietDienThanh) +
                    ",\"mau\":" + ds(M.Mau) + ",\"banThanDead\":" + (M.BanThan.TryGetValue("Dead", out double bt) ? bt : -1).ToString(System.Globalization.CultureInfo.InvariantCulture) +
                    ",\"soToHop\":" + M.ToHop.Count + ",\"soThanhPhanBAO\":" + (M.ToHop.TryGetValue("BAO", out var bao) ? bao.Count : -1) +
                    ",\"tongFZ1\":" + (M.TongLuc.TryGetValue("FZ1", out double[] f) ? f[2] : 0).ToString(System.Globalization.CultureInfo.InvariantCulture) +
                    ",\"soMauCoLuc\":" + M.TongLuc.Count +
                    ",\"luc\":{" + string.Join(",", M.TongLuc.Select(kv => "\"" + kv.Key + "\":[" + string.Join(",", kv.Value.Select(v => v.ToString("R", System.Globalization.CultureInfo.InvariantCulture))) + "]")) + "}" +
                    ",\"diemCoLuc\":" + ds(M.LucDiem.Keys.Select(k => k.Split('|')[1]).Distinct().OrderBy(x => x, StringComparer.Ordinal)) +
                    ",\"tang\":[" + string.Join(",", M.CaoTang.Select(v => v.ToString("R", System.Globalization.CultureInfo.InvariantCulture))) + "]" +
                    ",\"goi\":" + ds(M.Goi.Where(kv => kv.Value.Any(b => b)).Select(kv => kv.Key).OrderBy(x => x, StringComparer.Ordinal)) +
                    ",\"loXoDiem\":" + ds(M.LoXo.Keys.OrderBy(x => x, StringComparer.Ordinal)) +
                    ",\"diemRieng\":" + ds(M.DiemRieng.OrderBy(x => x, StringComparer.Ordinal)) + ",\"khoiTaoMoi\":" + (M.KhoiTaoMoi ? "true" : "false") + ",\"thaoTac\":{\"doi\":" + M.SoLanDoi + ",\"xoaDiem\":" + M.SoDiemXoa +
                    ",\"xoaThanh\":" + M.SoThanhXoa + ",\"xoaVo\":" + M.SoVoXoa + ",\"themDiem\":" + M.SoDiemThem + ",\"themThanh\":" + M.SoThanhThem + ",\"themVo\":" + M.SoVoThem + "}" +
                    ",\"tietDienVo\":" + ds(M.TietDienVo) + ",\"loXoTAM\":" + (M.LoXo.ContainsKey("TAM_CAU") ? "true" : "false") + "}");
            }
            return 0;
        }

        // cStory
        public int SetStories_2(double BaseElevation, int NumberStories, ref string[] StoryNames, ref double[] StoryHeights, ref bool[] IsMasterStory,
                                ref string[] SimilarToStory, ref bool[] SpliceAbove, ref double[] SpliceHeight, ref int[] color)
        {
            if (M.Diem.Count > 0 && Environment.GetEnvironmentVariable("MCT_GIA_LAP") != "tang-mo") return 1;   // ETABS: mô hình đã có đối tượng
            if (new object[] { StoryNames, StoryHeights, IsMasterStory, SimilarToStory, SpliceAbove, SpliceHeight, color }.Any(a => ((Array)a).Length != NumberStories)) return 1;
            if (Environment.GetEnvironmentVariable("MCT_GIA_LAP") == "tang-loi" && SimilarToStory.Any(x => x == "")) return 1;
            if (StoryNames.Distinct().Count() != NumberStories || StoryHeights.Any(h => h <= 0)) return 1;
            M.CaoDoDay = BaseElevation;
            M.CaoTang.Clear();
            double z = BaseElevation;
            foreach (double h in StoryHeights) { z += h; M.CaoTang.Add(Math.Round(z, 6)); }
            return 0;
        }

        public int GetStories_2(ref double BaseElevation, ref int NumberStories, ref string[] StoryNames, ref double[] StoryElevations, ref double[] StoryHeights,
                                ref bool[] IsMasterStory, ref string[] SimilarToStory, ref bool[] SpliceAbove, ref double[] SpliceHeight, ref int[] color)
        {
            if (double.IsNaN(M.CaoDoDay)) return 1;
            int n = M.CaoTang.Count;
            BaseElevation = M.CaoDoDay; NumberStories = n;
            StoryElevations = M.CaoTang.ToArray();
            StoryHeights = M.CaoTang.Select((z, i) => Math.Round(z - (i == 0 ? M.CaoDoDay : M.CaoTang[i - 1]), 6)).ToArray();
            StoryNames = Enumerable.Range(1, n).Select(i => "Story" + i).ToArray();
            IsMasterStory = new bool[n]; SimilarToStory = new string[n]; SpliceAbove = new bool[n]; SpliceHeight = new double[n]; color = new int[n];
            return 0;
        }

        // cEditPoint – như ETABS: điểm mới phải nằm trên cao độ tầng (giả lập chặt như AddCartesian)
        public int ChangeCoordinates_1(string Name, double X, double Y, double Z, bool NoRefresh = false)
        {
            if (!M.Diem.ContainsKey(Name) || !M.TrenTang(Z)) return 1;
            M.Diem[Name] = new[] { X, Y, Z }; M.SoLanDoi++;
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
            if (!M.TrenTang(Z)) return 1;                            // giả lập chặt: điểm phải nằm trên cao độ tầng
            if (!MergeOff)
            {   // như ETABS: trùng vị trí điểm có sẵn thì trả tên điểm đó
                var trung = M.Diem.FirstOrDefault(kv => Math.Abs(kv.Value[0] - X) < 1e-6 && Math.Abs(kv.Value[1] - Y) < 1e-6 && Math.Abs(kv.Value[2] - Z) < 1e-6);
                if (trung.Key != null) { Name = trung.Key; return 0; }
            }
            int so = M.Diem.Count + 1;
            while (M.Diem.ContainsKey("P" + so)) so++;
            Name = string.IsNullOrEmpty(UserName) || M.Diem.ContainsKey(UserName) ? "P" + so : UserName;
            M.Diem[Name] = new[] { X, Y, Z }; M.SoDiemThem++;
            return 0;
        }
        public int SetSpring(string Name, ref double[] k, eItemType ItemType = eItemType.Objects, bool IsLocalCSys = false, bool Replace = false)
        {
            if (!M.Diem.ContainsKey(Name) || k == null || k.Length != 6) return 1;
            M.LoXo[Name] = k;
            if (!IsLocalCSys) M.LoXoTongThe++;
            return 0;
        }
        public int SetSpringAssignment(string Name, string SpringProp, eItemType ItemType = eItemType.Objects)
        {
            if (!M.Diem.ContainsKey(Name) || !M.ThuocTinhLoXo.TryGetValue(SpringProp ?? "", out double[] k)) return 1;
            M.LoXo[Name] = k; M.LoXoTheoThuocTinh++;
            return 0;
        }

        // cPropPointSpring
        public int SetPointSpringProp(string Name, int SpringOption, ref double[] k, string CSys = "Local", string SoilProfile = "", string Footing = "",
                                      double Period = 0, int Color = -1, string Notes = "", string GUID = "")
        {
            if (string.IsNullOrEmpty(Name) || SpringOption != 1 || k == null || k.Length != 6 || k.Any(v => v < 0)) return 1;
            M.ThuocTinhLoXo[Name] = (double[])k.Clone();
            return 0;
        }
        public int SetRestraint(string Name, ref bool[] Value, eItemType ItemType = eItemType.Objects)
        { if (!M.Diem.ContainsKey(Name) || Value == null || Value.Length != 6) return 1; M.Goi[Name] = Value; return 0; }
        int cPointObj.GetNameList(ref int NumberNames, ref string[] MyName) { MyName = M.Diem.Keys.ToArray(); NumberNames = MyName.Length; return 0; }
        public int DeleteSpecialPoint(string Name, eItemType ItemType = eItemType.Objects)
        {   // chỉ xoá được điểm không nối thanh / vỏ nào; xoá luôn lò xo, gối, lực tại điểm
            if (!M.Diem.ContainsKey(Name) || M.DiemDangDung(Name)) return 1;
            M.Diem.Remove(Name); M.LoXo.Remove(Name); M.Goi.Remove(Name); M.DiemRieng.Remove(Name);
            foreach (string k in M.LucDiem.Keys.Where(k => k.EndsWith("|" + Name, StringComparison.Ordinal)).ToList()) M.LucDiem.Remove(k);
            M.TinhTongLuc(); M.SoDiemXoa++;
            return 0;
        }
        public int ChangeName(string Name, string NewName)
        {
            if (!M.Diem.ContainsKey(Name) || string.IsNullOrEmpty(NewName) || M.Diem.ContainsKey(NewName)) return 1;
            M.Diem[NewName] = M.Diem[Name]; M.Diem.Remove(Name);
            foreach (var t in M.Thanh) { if (t[1] == Name) t[1] = NewName; if (t[2] == Name) t[2] = NewName; }
            foreach (var v in M.Vo) for (int i = 0; i < v.Length; i++) if (v[i] == Name) v[i] = NewName;
            if (M.LoXo.TryGetValue(Name, out double[] k)) { M.LoXo.Remove(Name); M.LoXo[NewName] = k; }
            if (M.Goi.TryGetValue(Name, out bool[] g)) { M.Goi.Remove(Name); M.Goi[NewName] = g; }
            return 0;
        }
        public int DeleteSpring(string Name, eItemType ItemType = eItemType.Objects) { if (!M.Diem.ContainsKey(Name)) return 1; M.LoXo.Remove(Name); return 0; }
        public int SetSpecialPoint(string Name, bool SpecialPoint, eItemType ItemType = eItemType.Objects)
        { if (!M.Diem.ContainsKey(Name)) return 1; if (SpecialPoint) M.DiemRieng.Add(Name); else M.DiemRieng.Remove(Name); return 0; }
        public int DeleteLoadForce(string Name, string LoadPat, eItemType ItemType = eItemType.Objects)
        {   // nhóm "All": mọi điểm; Objects: một điểm
            if (!M.Mau.Contains(LoadPat)) return 1;
            bool tatCa = ItemType == eItemType.Group;
            if (tatCa && Name != "All") return 1;
            if (!tatCa && !M.Diem.ContainsKey(Name)) return 1;
            foreach (string k in M.LucDiem.Keys.Where(k => k.StartsWith(LoadPat + "|", StringComparison.Ordinal) && (tatCa || k.EndsWith("|" + Name, StringComparison.Ordinal))).ToList())
                M.LucDiem.Remove(k);
            M.TinhTongLuc(); return 0;
        }

        // cFrameObj
        int cFrameObj.Count(string MainName) => M.MoiTao ? M.Thanh.Count : M.SoThanhCu;
        int cFrameObj.AddByPoint(string Point1, string Point2, ref string Name, string PropName, string UserName)
        {
            if (!M.Diem.ContainsKey(Point1) || !M.Diem.ContainsKey(Point2) || Point1 == Point2 || !M.TietDienThanh.Contains(PropName)) return 1;
            Name = string.IsNullOrEmpty(UserName) || M.Thanh.Any(t => t[0] == UserName) ? "F" + (M.Thanh.Count + 1) : UserName;
            // như ETABS thật: thanh đứng (cột, cọc) luôn có đầu I ở nút dưới – vẽ từ trên xuống thì bị đảo đầu
            double[] a1 = M.Diem[Point1], a2 = M.Diem[Point2];
            if (Math.Abs(a1[0] - a2[0]) < 1e-6 && Math.Abs(a1[1] - a2[1]) < 1e-6 && a1[2] > a2[2]) { string tg = Point1; Point1 = Point2; Point2 = tg; }
            M.Thanh.Add(new[] { Name, Point1, Point2, PropName }); M.SoThanhThem++;
            return 0;
        }
        int cFrameObj.GetNameList(ref int NumberNames, ref string[] MyName) { MyName = M.Thanh.Select(t => t[0]).ToArray(); NumberNames = MyName.Length; return 0; }
        int cFrameObj.Delete(string Name, eItemType ItemType)
        {
            int i = M.Thanh.FindIndex(t => t[0] == Name);
            if (i < 0) return 1;
            M.Thanh.RemoveAt(i); M.SoThanhXoa++; return 0;
        }
        int cFrameObj.SetSection(string Name, string PropName, eItemType ItemType, double SVarRelStartLoc, double SVarTotalLength)
        {
            var t = M.Thanh.FirstOrDefault(x => x[0] == Name);
            if (t == null || !M.TietDienThanh.Contains(PropName)) return 1;
            t[3] = PropName; return 0;
        }

        // cAreaObj
        int cAreaObj.Count(string MainName) => M.MoiTao ? M.Vo.Count : M.SoVoCu;
        int cAreaObj.AddByPoint(int NumberPoints, ref string[] Point, ref string Name, string PropName, string UserName)
        {
            if (Point == null || Point.Length != NumberPoints || NumberPoints < 3 || Point.Any(p => !M.Diem.ContainsKey(p)) || !M.TietDienVo.Contains(PropName)) return 1;
            Name = string.IsNullOrEmpty(UserName) || M.TenVo.ContainsKey(UserName) ? "A" + (M.Vo.Count + 1) : UserName;
            M.TenVo[Name] = M.Vo.Count;
            M.Vo.Add(Point); M.SoVoThem++;
            return 0;
        }
        int cAreaObj.GetNameList(ref int NumberNames, ref string[] MyName) { MyName = M.TenVo.Keys.ToArray(); NumberNames = MyName.Length; return 0; }
        int cAreaObj.Delete(string Name, eItemType ItemType) { if (!M.TenVo.ContainsKey(Name)) return 1; M.XoaVo(Name); M.SoVoXoa++; return 0; }
        int cAreaObj.GetPoints(string Name, ref int NumberPoints, ref string[] Point)
        {
            if (!M.TenVo.TryGetValue(Name, out int i)) return 1;
            Point = (string[])M.Vo[i].Clone(); NumberPoints = Point.Length; return 0;
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
        int cLoadPatterns.Delete(string Name)
        {   // như ETABS: không xoá được pattern đang nằm trong tổ hợp
            if (!M.Mau.Contains(Name) || M.ToHop.Values.Any(ds => ds.Contains(Name))) return 1;
            M.Mau.Remove(Name); M.BanThan.Remove(Name);
            foreach (string k in M.LucDiem.Keys.Where(k => k.StartsWith(Name + "|", StringComparison.Ordinal)).ToList()) M.LucDiem.Remove(k);
            M.TinhTongLuc(); return 0;
        }
        int cCombo.Delete(string Name)
        {   // không xoá được tổ hợp đang nằm trong tổ hợp khác
            if (!M.ToHop.ContainsKey(Name) || M.ToHop.Any(kv => kv.Key != Name && kv.Value.Contains(Name))) return 1;
            M.ToHop.Remove(Name); return 0;
        }
        int cCombo.GetNameList(ref int NumberNames, ref string[] MyName) { MyName = M.ToHop.Keys.ToArray(); NumberNames = MyName.Length; return 0; }

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
            string khoa = LoadPat + "|" + Name;   // lực theo từng điểm; Replace thay lực cũ của điểm đó
            if (!M.LucDiem.TryGetValue(khoa, out double[] cu) || Replace) M.LucDiem[khoa] = cu = new double[6];
            for (int i = 0; i < 6; i++) cu[i] += Value[i];
            M.TinhTongLuc();
            return 0;
        }
        // cView
        public int RefreshView(int Window = 0, bool Zoom = true) => 0;
    }
}
