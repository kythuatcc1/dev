// Lệnh "dung-mo-hinh": dựng mô hình MỚI trong ETABS từ dữ liệu app gửi (duLieu.moHinh – xem js/calc/etabs-mo-hinh.js)
// rồi lưu thành file .EDB. Mỗi lệnh API được kiểm tra mã trả về (0 = thành công); lỗi thì dừng và báo đúng lệnh.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json.Nodes;

namespace MctEtabs
{
    internal sealed class LoiEtabs : Exception
    {
        public LoiEtabs(string thongBao) : base(thongBao) { }
    }

    /// <summary>Gọi API trên các đối tượng con của SapModel (File, Story, PointObj…), kiểm tra mã trả về.</summary>
    internal sealed class BoGoiEtabs
    {
        private readonly IBoGoi _g;
        private readonly object _sap;
        private readonly Dictionary<string, object> _con = new Dictionary<string, object>();
        public int SoLenh;

        public BoGoiEtabs(IBoGoi g, object sap) { _g = g; _sap = sap; }

        /// <summary>Giao diện của từng thuộc tính con (để đi theo đường dẫn như "Results.Setup").</summary>
        static readonly Dictionary<string, string> GiaoDien = new Dictionary<string, string>
        {
            ["File"] = "cFile", ["Story"] = "cStory", ["PropMaterial"] = "cPropMaterial", ["PropFrame"] = "cPropFrame",
            ["PropArea"] = "cPropArea", ["PointObj"] = "cPointObj", ["FrameObj"] = "cFrameObj", ["AreaObj"] = "cAreaObj",
            ["LoadPatterns"] = "cLoadPatterns", ["RespCombo"] = "cCombo", ["View"] = "cView", ["Analyze"] = "cAnalyze",
            ["Results"] = "cAnalysisResults", ["Setup"] = "cAnalysisResultsSetup", ["PointElm"] = "cPointElm",
            ["PropPointSpring"] = "cPropPointSpring"
        };

        object Con(string duongDan)
        {
            if (duongDan == "") return _sap;
            if (_con.TryGetValue(duongDan, out object o)) return o;
            int i = duongDan.LastIndexOf('.');
            string cha = i < 0 ? "" : duongDan.Substring(0, i), ten = duongDan.Substring(i + 1);
            string giaoDienCha = cha == "" ? "cSapModel" : GiaoDien[cha.Split('.').Last()];
            o = _g.Lay(Con(cha), giaoDienCha, ten) ?? throw new LoiEtabs("SapModel." + duongDan + " rong");
            _con[duongDan] = o;
            return o;
        }

        public object Goi(string thuocTinh, string giaoDien, string ham, object[] a, bool coThamChieu = false)
        {
            SoLenh++;
            object r = _g.Goi(Con(thuocTinh), giaoDien, ham, a, coThamChieu);
            if (r is int ma && ma != 0) throw new LoiEtabs(giaoDien + "." + ham + "(" + MoTa(a) + ") tra ve ma loi " + ma);
            return r;
        }

        /// <summary>Gọi hàm trả về giá trị (ví dụ Count) – không coi kết quả là mã lỗi.</summary>
        public object Lay(string thuocTinh, string giaoDien, string ham, object[] a)
        {
            SoLenh++;
            return _g.Goi(Con(thuocTinh), giaoDien, ham, a, false);
        }

        static string MoTa(object[] a) =>
            a == null ? "" : string.Join(", ", a.Take(5).Select(x => x is Array m ? "[" + m.Length + "]" : KetQua.HienThi(x)));
    }

    internal static class LenhDungMoHinh
    {
        /// <summary>
        /// Lò xo đất: tạo thuộc tính lò xo điểm có tên (Point Spring Property, hệ trục cục bộ) rồi gán cho điểm – giống gán trong
        /// giao diện ETABS (Define → Spring Properties → Point Springs, Assign → Joint → Springs). Lò xo gán bằng SetSpring theo hệ
        /// tổng thể không có trong giao diện ETABS (chỉ có lò xo theo trục cục bộ) – xem lò xo kiểu đó làm ETABS văng.
        /// Bản ETABS không có PropPointSpring / SetSpringAssignment: dùng SetSpring theo trục cục bộ của điểm (trùng trục tổng thể).
        /// </summary>
        static string GanLoXo(BoGoiEtabs e, JsonObject m, JsonArray ds, Func<JsonNode, string> ten)
        {
            string lyDo = null;
            var dsTT = m["thuocTinhLoXo"] as JsonArray;
            if (dsTT != null && dsTT.Count > 0 && ds.All(l => l["thuocTinh"] != null))
            {
                try
                {
                    foreach (JsonNode t in dsTT)
                    {
                        double[] k = ((JsonArray)t["k"]).Select(x => (double)x).ToArray();
                        // SpringOption 1 = độ cứng nhập trực tiếp; CSys "Local" = trục cục bộ của điểm
                        e.Goi("PropPointSpring", "cPropPointSpring", "SetPointSpringProp", new object[] { (string)t["ten"], 1, k, "Local" }, true);
                    }
                    foreach (JsonNode l in ds)
                        e.Goi("PointObj", "cPointObj", "SetSpringAssignment", new object[] { ten(l["diem"]), (string)l["thuocTinh"], "Objects" });
                    return dsTT.Count + " thuoc tinh lo xo diem LX_<K> (PropPointSpring), gan bang SetSpringAssignment";
                }
                catch (Exception ex) when (!(ex is OutOfMemoryException))
                {
                    lyDo = Api.GocLoi(ex).Message;
                }
            }
            foreach (JsonNode l in ds)
            {
                double[] k = ((JsonArray)l["k"]).Select(x => (double)x).ToArray();
                e.Goi("PointObj", "cPointObj", "SetSpring", new object[] { ten(l["diem"]), k, "Objects", true, true }, true);
            }
            return "SetSpring theo truc cuc bo cua diem" + (lyDo != null ? " (khong tao duoc thuoc tinh lo xo: " + lyDo + ")" : "");
        }

        public static void Chay(KetQua kq, YeuCau yc)
        {
            if (yc.DuLieu?["moHinh"] is not JsonObject m)
            {
                kq.Dung("doc-yeu-cau", "Thieu du lieu mo hinh (duLieu.moHinh).");
                return;
            }
            PhienEtabs ph = KetNoi.Mo(kq, yc);
            if (ph == null) return;
            if (ph.ChiGanMotPhan || ph.SapModel == null)
            {
                kq.Dung("ket-noi", "Gan duoc ETABS nhung chua lay duoc mo hinh. Hay chay Kiem tra ket noi de xem nguyen nhan.",
                        ph.ThieuDangKyGiaoDien ? (ph.CoNguonTypeLib ? "dang-ky-giao-dien" : "chay-register") : "ket-noi");
                return;
            }
            var e = new BoGoiEtabs(ph.G, ph.SapModel);
            var dongHo = Stopwatch.StartNew();
            string buoc = "mo-hinh-moi";
            try
            {
                // 1. Mô hình trống, đơn vị kN-m
                e.Goi("", "cSapModel", "InitializeNewModel", new object[] { "kN_m_C" });
                e.Goi("File", "cFile", "NewBlank", null);
                kq.GhiBuoc(buoc, true, "Mo hinh moi, don vi kN-m-C");

                // 2. Tầng: mỗi cao độ nút là một tầng, đáy ở mũi cọc
                buoc = "tang";
                kq.GhiBuoc(buoc, true, DatTang(kq, e, m["tang"]));

                // 3. Vật liệu bê tông
                buoc = "vat-lieu";
                foreach (JsonNode v in (JsonArray)m["vatLieu"])
                {
                    string ten = (string)v["ten"];
                    e.Goi("PropMaterial", "cPropMaterial", "SetMaterial", new object[] { ten, "Concrete" });
                    e.Goi("PropMaterial", "cPropMaterial", "SetMPIsotropic", new object[] { ten, (double)v["E"], (double)v["nu"], (double)v["alpha"] });
                    e.Goi("PropMaterial", "cPropMaterial", "SetWeightAndMass", new object[] { ten, 1, (double)v["gamma"] });
                }
                kq.GhiBuoc(buoc, true, string.Join(", ", ((JsonArray)m["vatLieu"]).Select(v => (string)v["ten"] + " E=" + (double)v["E"] + " kN/m2")));

                // 4. Tiết diện thanh (cọc, đoạn cọc trong đài, liên kết cứng) và tấm đài
                buoc = "tiet-dien";
                foreach (JsonNode t in (JsonArray)m["tietDienThanh"])
                {
                    string ten = (string)t["ten"], vl = (string)t["vatLieu"];
                    if ((string)t["loai"] == "tron") e.Goi("PropFrame", "cPropFrame", "SetCircle", new object[] { ten, vl, (double)t["D"] });
                    else e.Goi("PropFrame", "cPropFrame", "SetRectangle", new object[] { ten, vl, (double)t["cao"], (double)t["rong"] });
                    if (t["heSo"] is JsonArray hs)
                        e.Goi("PropFrame", "cPropFrame", "SetModifiers", new object[] { ten, hs.Select(x => (double)x).ToArray() }, true);
                }
                foreach (JsonNode t in (JsonArray)m["tietDienVo"])
                    e.Goi("PropArea", "cPropArea", "SetSlab", new object[] { (string)t["ten"], "Slab", "ShellThick", (string)t["vatLieu"], (double)t["day"] });
                kq.GhiBuoc(buoc, true, "Thanh: " + string.Join(", ", ((JsonArray)m["tietDienThanh"]).Select(t => (string)t["ten"])) +
                                       "; vo: " + string.Join(", ", ((JsonArray)m["tietDienVo"]).Select(t => (string)t["ten"] + " day " + (double)t["day"] + " m")));

                // 5. Điểm (giữ tên ETABS trả về để nối thanh, vỏ)
                buoc = "diem";
                var tenDiem = new Dictionary<string, string>();
                int khacTen = 0;
                foreach (JsonNode d in (JsonArray)m["diem"])
                {
                    string ma = (string)d["ten"];
                    var a = new object[] { (double)d["x"], (double)d["y"], (double)d["z"], "", ma, "Global", false, 0 };
                    e.Goi("PointObj", "cPointObj", "AddCartesian", a, true);
                    string tenEtabs = a[3] as string;
                    if (string.IsNullOrEmpty(tenEtabs)) throw new LoiEtabs("AddCartesian khong tra ten diem " + ma);
                    if (tenEtabs != ma) khacTen++;
                    tenDiem[ma] = tenEtabs;
                }
                kq.GhiBuoc(buoc, true, tenDiem.Count + " diem" + (khacTen > 0 ? " (" + khacTen + " diem ETABS dat ten khac)" : ""));

                string Ten(JsonNode n)
                {
                    string ma = (string)n;
                    return tenDiem.TryGetValue(ma, out string t) ? t : throw new LoiEtabs("Khong co diem " + ma);
                }

                // 6. Thanh: cọc và liên kết cứng
                buoc = "thanh";
                var dsThanh = (JsonArray)m["thanh"];
                foreach (JsonNode t in dsThanh)
                {
                    var a = new object[] { Ten(t["dau"]), Ten(t["cuoi"]), "", (string)t["tietDien"], (string)t["ten"] };
                    e.Goi("FrameObj", "cFrameObj", "AddByPoint", a, true);
                }
                kq.GhiBuoc(buoc, true, dsThanh.Count + " thanh");

                // 7. Vỏ: các ô lưới của tấm đài
                buoc = "vo";
                var dsVo = (JsonArray)m["vo"];
                foreach (JsonNode v in dsVo)
                {
                    string[] nut = ((JsonArray)v["diem"]).Select(Ten).ToArray();
                    var a = new object[] { nut.Length, nut, "", (string)v["tietDien"], (string)v["ten"] };
                    e.Goi("AreaObj", "cAreaObj", "AddByPoint", a, true);
                }
                kq.GhiBuoc(buoc, true, dsVo.Count + " o vo");

                // 8. Lò xo đất ngang
                buoc = "lo-xo";
                var dsLoXo = (JsonArray)m["loXo"];
                string cachLoXo = GanLoXo(e, m, dsLoXo, Ten);
                kq.Dat("cachGanLoXo", cachLoXo);
                kq.GhiBuoc(buoc, true, dsLoXo.Count + " lo xo – " + cachLoXo);

                // 9. Gối mũi cọc
                buoc = "goi";
                var dsGoi = (JsonArray)m["gioiHan"];
                foreach (JsonNode g in dsGoi)
                {
                    bool[] gt = ((JsonArray)g["giaTri"]).Select(x => (bool)x).ToArray();
                    e.Goi("PointObj", "cPointObj", "SetRestraint", new object[] { Ten(g["diem"]), gt, "Objects" }, true);
                }
                kq.GhiBuoc(buoc, true, dsGoi.Count + " goi");

                // 10. Load pattern và tải đặt tại tâm đài
                buoc = "tai-trong";
                var dsMau = m["mauTai"] as JsonArray ?? new JsonArray();
                var tenMau = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                if (dsMau.Count > 0)
                {
                    var coSan = DanhSachMau(e);
                    int soLuc = 0;
                    foreach (JsonNode p in dsMau)
                    {
                        string ma = (string)p["ten"], loai = (string)p["loai"];
                        double banThan = (double)p["banThan"];
                        string tonTai = coSan.FirstOrDefault(x => string.Equals(x, ma, StringComparison.OrdinalIgnoreCase));
                        if (tonTai != null)
                        {
                            try { e.Goi("LoadPatterns", "cLoadPatterns", "SetLoadType", new object[] { tonTai, loai }); } catch { /* giữ loại cũ */ }
                            e.Goi("LoadPatterns", "cLoadPatterns", "SetSelfWTMultiplier", new object[] { tonTai, banThan });
                            tenMau[ma] = tonTai;
                        }
                        else
                        {
                            e.Goi("LoadPatterns", "cLoadPatterns", "Add", new object[] { ma, loai, banThan, true });
                            tenMau[ma] = ma;
                        }
                        if (p["luc"] is JsonObject luc)
                        {
                            double[] gt = ((JsonArray)luc["giaTri"]).Select(x => (double)x).ToArray();
                            e.Goi("PointObj", "cPointObj", "SetLoadForce", new object[] { Ten(luc["diem"]), tenMau[ma], gt, true, "Global", "Objects" }, true);
                            soLuc++;
                        }
                    }
                    kq.Dat("loadPatterns", tenMau.Values.ToList());
                    kq.GhiBuoc(buoc, true, dsMau.Count + " load pattern (" + string.Join(", ", tenMau.Values) + "); " + soLuc + " luc tai tam dai");
                }

                // 11. Tổ hợp tải trọng (các tổ hợp tuyến tính + BAO envelope)
                buoc = "to-hop";
                var dsToHop = m["toHop"] as JsonArray ?? new JsonArray();
                foreach (JsonNode c in dsToHop)
                {
                    string tenTh = (string)c["ten"];
                    e.Goi("RespCombo", "cCombo", "Add", new object[] { tenTh, (int)c["loai"] });
                    foreach (JsonNode x in (JsonArray)c["ds"])
                    {
                        bool laToHop = x["toHop"] != null;
                        string tenCa = laToHop ? (string)x["toHop"] : (string)x["ca"];
                        if (!laToHop && tenMau.TryGetValue(tenCa, out string thuc)) tenCa = thuc;
                        e.Goi("RespCombo", "cCombo", "SetCaseList", new object[] { tenTh, laToHop ? "LoadCombo" : "LoadCase", tenCa, (double)x["heSo"] }, true);
                    }
                }
                kq.Dat("soToHop", dsToHop.Count);
                if (dsToHop.Count > 0) kq.GhiBuoc(buoc, true, dsToHop.Count + " to hop (" + (string)dsToHop[0]["ten"] + " … " + (string)dsToHop[dsToHop.Count - 1]["ten"] + ")");

                // 12. Hiển thị và lưu file
                buoc = "luu";
                try { e.Goi("View", "cView", "RefreshView", new object[] { 0, true }); } catch { /* chỉ là hiển thị */ }
                string file = DuongDanLuu(yc);
                Directory.CreateDirectory(Path.GetDirectoryName(file));
                e.Goi("File", "cFile", "Save", new object[] { file });
                kq.Dat("fileMoHinh", file);
                kq.GhiBuoc(buoc, true, file);

                // 13. Đếm lại trong ETABS
                buoc = "kiem-tra-so-luong";
                int soDiem = Dem(e, "PointObj", "cPointObj"), soThanh = Dem(e, "FrameObj", "cFrameObj"), soVo = Dem(e, "AreaObj", "cAreaObj");
                kq.Dat("soDiem", soDiem); kq.Dat("soThanh", soThanh); kq.Dat("soVo", soVo);
                kq.Dat("soLoXo", dsLoXo.Count); kq.Dat("soLenhApi", e.SoLenh);
                kq.Dat("thoiGianGiay", Math.Round(dongHo.Elapsed.TotalSeconds, 1));
                bool du = soThanh == dsThanh.Count && soVo == dsVo.Count && soDiem >= tenDiem.Values.Distinct().Count();
                kq.GhiBuoc(buoc, du, "ETABS: " + soDiem + " diem, " + soThanh + " thanh, " + soVo + " vo" +
                                     (du ? "" : " – KHAC so luong app gui (" + tenDiem.Count + " diem, " + dsThanh.Count + " thanh, " + dsVo.Count + " vo)"));
                kq.Ok = du;
                if (!du) kq.Dung(buoc, "So doi tuong trong ETABS khac so luong app gui.");
            }
            catch (Exception ex0)
            {
                Exception ex = Api.GocLoi(ex0);
                kq.Dung(buoc, (ex is LoiEtabs ? "" : ex.GetType().Name + ": ") + ex.Message);
            }
        }

        static List<string> DanhSachMau(BoGoiEtabs e)
        {
            var a = new object[] { 0, null };
            try { e.Goi("LoadPatterns", "cLoadPatterns", "GetNameList", a, true); } catch { return new List<string>(); }
            return a[1] is Array ds ? ds.Cast<object>().Select(x => Convert.ToString(x)).ToList() : new List<string>();
        }

        static int Dem(BoGoiEtabs e, string thuocTinh, string giaoDien)
        {
            try { return Convert.ToInt32(e.Lay(thuocTinh, giaoDien, "Count", null)); } catch { return -1; }
        }

        /// <summary>Đặt tầng: SetStories_2 (SimilarToStory "" rồi "None"), dự phòng SetStories; nếu ETABS chưa cho thì tạo NewGridOnly rồi thử lại.</summary>
        static string DatTang(KetQua kq, BoGoiEtabs e, JsonNode t)
        {
            double day = (double)t["caoDoDay"];
            var ds = (JsonArray)t["ds"];
            int n = ds.Count;
            string[] ten = ds.Select(x => (string)x["ten"]).ToArray();
            double[] cao = ds.Select(x => (double)x["cao"]).ToArray();
            var loi = new List<string>();
            for (int lan = 0; lan < 2; lan++)
            {
                if (lan == 1)
                {
                    try { e.Goi("File", "cFile", "NewGridOnly", new object[] { 1, cao[0], cao[0], 2, 2, 1.0, 1.0 }); }
                    catch (Exception ex) { loi.Add("NewGridOnly: " + Api.GocLoi(ex).Message); break; }
                }
                foreach (string tuongTu in new[] { "", "None" })
                {
                    try
                    {
                        e.Goi("Story", "cStory", "SetStories_2", new object[] {
                            day, n, (string[])ten.Clone(), (double[])cao.Clone(), Enumerable.Repeat(true, n).ToArray(),
                            Enumerable.Repeat(tuongTu, n).ToArray(), new bool[n], new double[n], new int[n] }, true);
                        return n + " tang, day " + day + " m (SetStories_2" + (lan == 1 ? ", sau NewGridOnly" : "") + ")";
                    }
                    catch (Exception ex) { loi.Add("SetStories_2('" + tuongTu + "'): " + Api.GocLoi(ex).Message); }
                    try
                    {
                        e.Goi("Story", "cStory", "SetStories", new object[] {
                            day, n, (string[])ten.Clone(), (double[])cao.Clone(), Enumerable.Repeat(true, n).ToArray(),
                            Enumerable.Repeat(tuongTu, n).ToArray(), new bool[n], new double[n] }, true);
                        return n + " tang, day " + day + " m (SetStories" + (lan == 1 ? ", sau NewGridOnly" : "") + ")";
                    }
                    catch (Exception ex) { loi.Add("SetStories('" + tuongTu + "'): " + Api.GocLoi(ex).Message); }
                }
            }
            kq.Dat("loiTang", loi);
            throw new LoiEtabs("Khong dat duoc tang: " + string.Join(" | ", loi));
        }

        static string DuongDanLuu(YeuCau yc)
        {
            string file = (string)yc.DuLieu?["fileMoHinh"];
            if (string.IsNullOrWhiteSpace(file))
            {
                string tenFile = (string)yc.DuLieu?["tenFile"] ?? "MongCauThap";
                foreach (char c in Path.GetInvalidFileNameChars()) tenFile = tenFile.Replace(c, '_');
                string goc = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                if (string.IsNullOrEmpty(goc)) goc = Path.GetTempPath();
                file = Path.Combine(goc, "MongCauThap", tenFile + ".EDB");
            }
            file = file.Trim().Trim('"');
            if (!file.EndsWith(".EDB", StringComparison.OrdinalIgnoreCase)) file += ".EDB";
            return Path.GetFullPath(file);
        }
    }
}
