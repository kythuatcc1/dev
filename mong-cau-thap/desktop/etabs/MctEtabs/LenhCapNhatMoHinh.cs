// Lệnh "cap-nhat-mo-hinh": sửa mô hình app đã dựng NGAY TRONG FILE ĐANG CÓ – không InitializeNewModel / NewBlank – kể cả khi
// hình học đổi (chiều cao đài, đáy đài, chiều dài cọc, vị trí cọc, lưới đài, điểm đặt lực cẩu tháp, dầm giằng):
//   1. Gắn ETABS; mô hình đang mở khác file đã dựng thì mở file đó (File.OpenFile).
//   2. Mở khoá mô hình (sau phân tích ETABS khoá mô hình; mở khoá thì kết quả phân tích cũ bị xoá).
//   3. Vật liệu, tiết diện (trước hình học: thanh thêm mới cần tiết diện có sẵn).
//   4. Tầng: khác số liệu app thì đặt lại (Story.SetStories_2). ETABS không cho đổi tầng khi mô hình còn đối tượng → xoá các
//      đối tượng của app (thanh, ô vỏ, điểm), đặt tầng rồi vẽ lại trong cùng file.
//   5. Đồng bộ hình học theo tên: thanh / ô vỏ không còn hoặc đổi nút → xoá; điểm không còn → xoá; điểm đổi toạ độ → dời
//      (EditPoint.ChangeCoordinates_1; nếu chỗ mới đang có điểm khác thì dời tạm ra xa trước); thiếu → thêm; thanh giữ lại → gán
//      lại tiết diện. Bản ETABS không dời được điểm → xoá đối tượng của app rồi vẽ lại.
//   6. Kiểm tra lại toạ độ mọi điểm, nút hai đầu mọi thanh, đỉnh mọi ô vỏ; không còn thanh / ô vỏ thừa của app.
//   7. Lò xo, gối (bỏ ở nút cọc không còn cần), tổ hợp (xoá tổ hợp cũ của app rồi tạo lại), lực cẩu tháp (xoá lực cũ của các load
//      pattern tải cẩu ở mọi điểm – điểm đặt lực có thể đã đổi – rồi đặt lại; xoá pattern không còn dùng, ví dụ MZ1), lưu đè.
// Đối tượng của app nhận theo tên: điểm D<i>_<k> (đài), C<n>_… (cọc); thanh C<n>_<j>, DG<n>; ô vỏ V<i>_<k>. Đối tượng khác giữ nguyên.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace MctEtabs
{
    internal static class LenhCapNhatMoHinh
    {
        static readonly Regex ToHopApp = new Regex("^((LV|KLV)-(NEN|KEO)-.+|BAO)$", RegexOptions.IgnoreCase);
        static readonly Regex MauApp = new Regex("^(F[XYZ][12]|M[XYZ][12])$", RegexOptions.IgnoreCase);
        static readonly Regex DiemApp = new Regex(@"^(D\d+_\d+|C\d+_.+)$");
        static readonly Regex DiemCoc = new Regex(@"^C\d+_.+$");
        static readonly Regex ThanhApp = new Regex(@"^(C\d+_\d+|DG\d+)$");
        static readonly Regex VoApp = new Regex(@"^V\d+_\d+$");
        const double SaiSo = 1e-4;   // 0,1 mm

        sealed class Diem { public string Ten; public double[] Xyz; }
        sealed class Thanh { public string Ten, Dau, Cuoi, TietDien; }
        sealed class Vo { public string Ten, TietDien; public string[] Nut; }

        /// <summary>Hình học app gửi (đọc một lần từ JSON).</summary>
        sealed class HinhHoc
        {
            public readonly List<Diem> DsDiem; public readonly Dictionary<string, Diem> Diem;
            public readonly List<Thanh> DsThanh; public readonly Dictionary<string, Thanh> Thanh;
            public readonly List<Vo> DsVo; public readonly Dictionary<string, Vo> Vo;
            public HinhHoc(JsonObject m)
            {
                DsDiem = ((JsonArray)m["diem"]).Select(d => new Diem { Ten = (string)d["ten"], Xyz = new[] { (double)d["x"], (double)d["y"], (double)d["z"] } }).ToList();
                DsThanh = ((JsonArray)m["thanh"]).Select(t => new Thanh { Ten = (string)t["ten"], Dau = (string)t["dau"], Cuoi = (string)t["cuoi"], TietDien = (string)t["tietDien"] }).ToList();
                DsVo = ((JsonArray)m["vo"]).Select(v => new Vo { Ten = (string)v["ten"], TietDien = (string)v["tietDien"], Nut = ((JsonArray)v["diem"]).Select(x => (string)x).ToArray() }).ToList();
                Diem = DsDiem.ToDictionary(d => d.Ten, StringComparer.Ordinal);
                Thanh = DsThanh.ToDictionary(t => t.Ten, StringComparer.Ordinal);
                Vo = DsVo.ToDictionary(v => v.Ten, StringComparer.Ordinal);
            }
        }

        /// <summary>Thống kê thao tác đồng bộ (báo về app).</summary>
        sealed class ThongKe
        {
            public int DoiDiem, ThemDiem, XoaDiem, DoiTen, GiuThanh, ThemThanh, XoaThanh, GiuVo, ThemVo, XoaVo;
            public bool VeLai; public string LyDoVeLai = "";
            public List<string> DiemThua = new List<string>();
            public string MoTa() =>
                (VeLai ? "Ve lai doi tuong cua app trong file dang co (" + LyDoVeLai + "); " : "") +
                "diem: doi " + DoiDiem + ", them " + ThemDiem + ", xoa " + XoaDiem + (DoiTen > 0 ? ", doi ten " + DoiTen : "") +
                "; thanh: giu " + GiuThanh + ", them " + ThemThanh + ", xoa " + XoaThanh +
                "; vo: giu " + GiuVo + ", them " + ThemVo + ", xoa " + XoaVo +
                (DiemThua.Count > 0 ? "; con " + DiemThua.Count + " diem cu khong xoa duoc (khong noi doi tuong nao)" : "");
            public JsonObject Json() => new JsonObject
            {
                ["veLai"] = VeLai, ["lyDoVeLai"] = LyDoVeLai, ["doiDiem"] = DoiDiem, ["themDiem"] = ThemDiem, ["xoaDiem"] = XoaDiem, ["doiTen"] = DoiTen,
                ["giuThanh"] = GiuThanh, ["themThanh"] = ThemThanh, ["xoaThanh"] = XoaThanh, ["giuVo"] = GiuVo, ["themVo"] = ThemVo, ["xoaVo"] = XoaVo,
                ["diemThua"] = new JsonArray(DiemThua.Select(x => (JsonNode)x).ToArray())
            };
        }

        /// <summary>ETABS không dời được điểm (bản cũ không có EditPoint, hoặc lệnh trả lỗi) → vẽ lại.</summary>
        sealed class LoiDoiDiem : Exception { public LoiDoiDiem(string m) : base(m) { } }

        public static void Chay(KetQua kq, YeuCau yc)
        {
            if (yc.DuLieu?["moHinh"] is not JsonObject m || string.IsNullOrWhiteSpace((string)yc.DuLieu?["fileMoHinh"]))
            {
                kq.Dung("doc-yeu-cau", "Thieu du lieu cap nhat (duLieu.moHinh, duLieu.fileMoHinh – file mo hinh da dung).");
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
            string buoc = "mo-file";
            try
            {
                // 1. Đúng file mô hình đã dựng
                string file = LenhDungMoHinh.DuongDanLuu(yc);
                string dangMo = KetQua.HienThi(e.Lay("", "cSapModel", "GetModelFilename", new object[] { true }));
                bool cungFile = CungFile(dangMo, file);
                if (!cungFile)
                {
                    if (!File.Exists(file))
                    {
                        kq.Dung(buoc, "Khong thay file mo hinh da dung: " + file + ". Hay dung lai mo hinh.", "dung-lai");
                        return;
                    }
                    e.Goi("File", "cFile", "OpenFile", new object[] { file });
                }
                kq.Dat("fileMoHinh", file);
                kq.GhiBuoc(buoc, true, cungFile ? "Dang mo " + file : "Da mo " + file + " (truoc do ETABS mo: " + (dangMo == "" ? "mo hinh chua luu" : dangMo) + ")");

                // 2. Mở khoá, đơn vị kN-m
                buoc = "mo-khoa";
                bool khoa = false;
                try { khoa = Convert.ToBoolean(e.Lay("", "cSapModel", "GetModelIsLocked", null)); } catch { /* bản cũ */ }
                if (khoa) e.Goi("", "cSapModel", "SetModelIsLocked", new object[] { false });
                e.Goi("", "cSapModel", "SetPresentUnits", new object[] { "kN_m_C" });
                kq.GhiBuoc(buoc, true, khoa ? "Da mo khoa (ket qua phan tich cu bi xoa)" : "Mo hinh khong bi khoa");

                // 3. Vật liệu, tiết diện
                buoc = "vat-lieu";
                kq.GhiBuoc(buoc, true, LenhDungMoHinh.DatVatLieu(e, m));
                buoc = "tiet-dien";
                kq.GhiBuoc(buoc, true, LenhDungMoHinh.DatTietDien(e, m));

                // 4. Tầng
                buoc = "tang";
                var hh = new HinhHoc(m);
                var tk = new ThongKe();
                string moTaTang;
                if (TangTrung(e, m["tang"])) moTaTang = "Giu nguyen " + ((JsonArray)m["tang"]["ds"]).Count + " tang";
                else
                {
                    var loiTang = new List<string>();
                    moTaTang = LenhDungMoHinh.ThuDatTang(e, m["tang"], loiTang);
                    if (moTaTang != null) moTaTang = "Dat lai " + moTaTang;
                    else
                    {   // ETABS không đổi tầng khi còn đối tượng → xoá đối tượng của app rồi đặt lại
                        XoaDoiTuongApp(e, tk);
                        tk.VeLai = true; tk.LyDoVeLai = "ETABS khong doi tang khi mo hinh con doi tuong";
                        moTaTang = LenhDungMoHinh.ThuDatTang(e, m["tang"], loiTang);
                        if (moTaTang == null)
                        {
                            kq.Dat("loiTang", loiTang);
                            kq.Dung(buoc, "ETABS khong dat lai duoc tang ke ca khi da xoa doi tuong cua app (mo hinh con doi tuong khac?): " +
                                    string.Join(" | ", loiTang.Take(2)) + ". Can dung lai mo hinh.", "dung-lai");
                            return;
                        }
                        moTaTang = "Xoa doi tuong cua app, dat lai " + moTaTang;
                    }
                }
                kq.GhiBuoc(buoc, true, moTaTang);

                // 5. Đồng bộ hình học
                buoc = "dong-bo-hinh-hoc";
                try { DongBo(e, hh, tk); }
                catch (LoiDoiDiem ex)
                {
                    XoaDoiTuongApp(e, tk);
                    tk.VeLai = true; tk.LyDoVeLai = "khong doi duoc toa do diem: " + ex.Message;
                    DongBo(e, hh, tk);
                }
                kq.Dat("dongBo", tk.Json());
                kq.GhiBuoc(buoc, true, tk.MoTa() + LenhDungMoHinh.DatDiemRieng(e, m, x => x));

                // 6. Kiểm tra lại
                buoc = "kiem-tra-hinh-hoc";
                var khac = KiemTra(e, hh);
                if (khac.Count > 0)
                {
                    kq.Dat("khacHinhHoc", khac);
                    kq.Dung(buoc, "Sau khi cap nhat, hinh hoc trong ETABS van khac so lieu app (" + string.Join("; ", khac.Take(3)) + "). Can dung lai mo hinh.", "dung-lai");
                    return;
                }
                kq.GhiBuoc(buoc, true, hh.DsDiem.Count + " diem, " + hh.DsThanh.Count + " thanh, " + hh.DsVo.Count + " o vo trung khop");
                string Ten(JsonNode n) => (string)n;

                // 7. Lò xo, gối: bỏ ở nút cọc không còn cần rồi gán lại
                buoc = "lo-xo";
                var dsLoXo = (JsonArray)m["loXo"];
                var coLoXo = new HashSet<string>(dsLoXo.Select(l => (string)l["diem"]), StringComparer.Ordinal);
                int boLoXo = 0;
                foreach (Diem d in hh.DsDiem.Where(d => DiemCoc.IsMatch(d.Ten) && !coLoXo.Contains(d.Ten)))
                {
                    try { e.Goi("PointObj", "cPointObj", "DeleteSpring", new object[] { d.Ten, "Objects" }); boLoXo++; } catch { /* điểm không có lò xo */ }
                }
                string cachLoXo = LenhDungMoHinh.GanLoXo(e, m, dsLoXo, Ten);
                kq.Dat("cachGanLoXo", cachLoXo);
                kq.GhiBuoc(buoc, true, dsLoXo.Count + " lo xo – " + cachLoXo);
                buoc = "goi";
                var coGoi = new HashSet<string>(((JsonArray)m["gioiHan"]).Select(g => (string)g["diem"]), StringComparer.Ordinal);
                foreach (Diem d in hh.DsDiem.Where(d => DiemCoc.IsMatch(d.Ten) && !coGoi.Contains(d.Ten)))
                {
                    try { e.Goi("PointObj", "cPointObj", "SetRestraint", new object[] { d.Ten, new bool[6], "Objects" }, true); } catch { /* bỏ qua */ }
                }
                kq.GhiBuoc(buoc, true, LenhDungMoHinh.DatGoi(e, m, Ten) + " (bo goi o cac nut coc khac)");

                // 8. Tổ hợp cũ của app → xoá; lực cẩu tháp cũ ở mọi điểm → xoá; pattern không còn dùng → xoá; đặt lại tải và tổ hợp
                buoc = "xoa-to-hop-cu";
                var thCu = DanhSach(e, "RespCombo", "cCombo").Where(x => ToHopApp.IsMatch(x)).ToList();
                foreach (string th in thCu.OrderBy(x => x.Equals("BAO", StringComparison.OrdinalIgnoreCase) ? 0 : 1))   // BAO tham chiếu các tổ hợp khác → xoá trước
                    e.Goi("RespCombo", "cCombo", "Delete", new object[] { th });
                var mauMoi = new HashSet<string>(((JsonArray)m["mauTai"] ?? new JsonArray()).Select(x => (string)x["ten"]), StringComparer.OrdinalIgnoreCase);
                var mauCu = LenhDungMoHinh.DanhSachMau(e).Where(x => MauApp.IsMatch(x)).ToList();
                var mauBo = mauCu.Where(x => !mauMoi.Contains(x)).ToList();
                foreach (string mau in mauBo) e.Goi("LoadPatterns", "cLoadPatterns", "Delete", new object[] { mau });
                kq.Dat("loadPatternDaXoa", mauBo);
                string xoaLuc = XoaLucCu(e, mauCu.Where(x => mauMoi.Contains(x)).ToList(), hh);
                kq.GhiBuoc(buoc, true, thCu.Count + " to hop cu" + (mauBo.Count > 0 ? "; xoa load pattern " + string.Join(", ", mauBo) : "") + "; " + xoaLuc);
                buoc = "tai-trong";
                var tenMau = LenhDungMoHinh.DatTaiTrong(kq, e, m, Ten);
                buoc = "to-hop";
                LenhDungMoHinh.DatToHop(kq, e, m, tenMau);

                // 9. Lưu đè
                buoc = "luu";
                try { e.Goi("View", "cView", "RefreshView", new object[] { 0, false }); } catch { /* chỉ là hiển thị */ }
                e.Goi("File", "cFile", "Save", new object[] { file });
                kq.GhiBuoc(buoc, true, file);
                kq.Dat("soLoXo", dsLoXo.Count);
                kq.Dat("soLenhApi", e.SoLenh);
                kq.Dat("thoiGianGiay", Math.Round(dongHo.Elapsed.TotalSeconds, 1));
                kq.Ok = true;
            }
            catch (Exception ex0)
            {
                Exception ex = Api.GocLoi(ex0);
                bool hinhHoc = buoc == "tang" || buoc == "dong-bo-hinh-hoc";   // sửa hình học dở dang → gợi ý dựng lại
                kq.Dung(buoc, (ex is LoiEtabs ? "" : ex.GetType().Name + ": ") + ex.Message + (hinhHoc ? " Hay dung lai mo hinh." : ""), hinhHoc ? "dung-lai" : null);
            }
        }

        // ---------- Tầng ----------
        /// <summary>Tầng trong ETABS trùng số liệu app (cao độ đáy, số tầng, chiều cao từng tầng)? Không đọc được thì coi là khác.</summary>
        static bool TangTrung(BoGoiEtabs e, JsonNode t)
        {
            var a = new object[] { 0.0, 0, null, null, null, null, null, null, null, null };
            try { e.Goi("Story", "cStory", "GetStories_2", a, true); } catch { return false; }
            var ds = (JsonArray)t["ds"];
            if (!(a[4] is double[] cao) || Convert.ToInt32(a[1]) != ds.Count || Math.Abs(Convert.ToDouble(a[0]) - (double)t["caoDoDay"]) > SaiSo) return false;
            for (int i = 0; i < ds.Count; i++) if (Math.Abs(cao[i] - (double)ds[i]["cao"]) > SaiSo) return false;
            return true;
        }

        // ---------- Đồng bộ đối tượng ----------
        static void DongBo(BoGoiEtabs e, HinhHoc hh, ThongKe tk)
        {
            // a) Thanh của app: không còn hoặc đổi nút → xoá
            var giuThanh = new HashSet<string>(StringComparer.Ordinal);
            foreach (string f in DanhSach(e, "FrameObj", "cFrameObj").Where(x => ThanhApp.IsMatch(x)))
            {
                if (hh.Thanh.TryGetValue(f, out Thanh t))
                {
                    var p = new object[] { f, "", "" };
                    e.Goi("FrameObj", "cFrameObj", "GetPoints", p, true);
                    if (CungHaiDau((string)p[1], (string)p[2], t)) { giuThanh.Add(f); continue; }
                }
                e.Goi("FrameObj", "cFrameObj", "Delete", new object[] { f, "Objects" });
                tk.XoaThanh++;
            }
            // b) Ô vỏ của app: không còn hoặc đổi nút → xoá
            var giuVo = new HashSet<string>(StringComparer.Ordinal);
            foreach (string a in DanhSach(e, "AreaObj", "cAreaObj").Where(x => VoApp.IsMatch(x)))
            {
                if (hh.Vo.TryGetValue(a, out Vo v) && NutVo(e, a) is string[] nut && CungNut(nut, v.Nut)) { giuVo.Add(a); continue; }
                e.Goi("AreaObj", "cAreaObj", "Delete", new object[] { a, "Objects" });
                tk.XoaVo++;
            }
            // c) Điểm của app không còn trong mô hình mới → xoá (bỏ gối, lò xo trước)
            var truoc = DanhSach(e, "PointObj", "cPointObj");
            var boDi = truoc.Where(x => DiemApp.IsMatch(x) && !hh.Diem.ContainsKey(x)).ToList();
            foreach (string d in boDi) XoaDiem(e, d);
            var conLai = new HashSet<string>(DanhSach(e, "PointObj", "cPointObj"), StringComparer.Ordinal);
            tk.XoaDiem += boDi.Count(d => !conLai.Contains(d));
            var thua = boDi.Where(d => conLai.Contains(d)).ToList();

            // d) Dời điểm đã có tới toạ độ mới (chỗ mới đang có điểm khác → dời tạm ra xa trước để không chồng điểm)
            var toaDo = new Dictionary<string, double[]>(StringComparer.Ordinal);
            foreach (string d in conLai) { double[] c = ToaDo(e, d); if (c != null) toaDo[d] = c; }
            var canDoi = hh.DsDiem.Where(d => toaDo.TryGetValue(d.Ten, out double[] c) && !Gan(c, d.Xyz)).ToList();
            if (canDoi.Count > 0)
            {
                var viTri = toaDo.ToLookup(kv => Khoa(kv.Value), kv => kv.Key);
                bool chong = canDoi.Any(d => viTri[Khoa(d.Xyz)].Any(t => t != d.Ten));
                if (chong) foreach (Diem d in canDoi) { double[] c = toaDo[d.Ten]; DoiDiem(e, d.Ten, c[0] + 1000, c[1], c[2]); }
                foreach (Diem d in canDoi) DoiDiem(e, d.Ten, d.Xyz[0], d.Xyz[1], d.Xyz[2]);
                tk.DoiDiem += canDoi.Count;
            }
            // e) Thêm điểm còn thiếu; ETABS trả điểm cũ cùng chỗ (điểm thừa không xoá được) → đổi tên điểm đó
            foreach (Diem d in hh.DsDiem.Where(d => !toaDo.ContainsKey(d.Ten)))
            {
                var a = new object[] { d.Xyz[0], d.Xyz[1], d.Xyz[2], "", d.Ten, "Global", false, 0 };
                e.Goi("PointObj", "cPointObj", "AddCartesian", a, true);
                string tenEtabs = a[3] as string;
                if (tenEtabs != d.Ten)
                {
                    if (string.IsNullOrEmpty(tenEtabs) || hh.Diem.ContainsKey(tenEtabs))
                        throw new LoiEtabs("AddCartesian diem " + d.Ten + " tra ve " + tenEtabs + " (trung diem khac cua mo hinh)");
                    e.Goi("PointObj", "cPointObj", "ChangeName", new object[] { tenEtabs, d.Ten });
                    thua.Remove(tenEtabs);
                    tk.DoiTen++;
                }
                tk.ThemDiem++;
            }
            tk.DiemThua = thua;
            // f) Thanh: giữ thì gán lại tiết diện (có thể đổi, ví dụ đoạn cọc trong đài), thiếu thì thêm
            foreach (Thanh t in hh.DsThanh)
            {
                if (giuThanh.Contains(t.Ten))
                {
                    e.Goi("FrameObj", "cFrameObj", "SetSection", new object[] { t.Ten, t.TietDien, "Objects" });
                    tk.GiuThanh++;
                    continue;
                }
                var a = new object[] { t.Dau, t.Cuoi, "", t.TietDien, t.Ten };
                e.Goi("FrameObj", "cFrameObj", "AddByPoint", a, true);
                if ((string)a[2] != t.Ten) throw new LoiEtabs("AddByPoint thanh " + t.Ten + " ETABS dat ten " + a[2] + " (trung ten thanh khac?)");
                tk.ThemThanh++;
            }
            // g) Ô vỏ thiếu → thêm
            foreach (Vo v in hh.DsVo)
            {
                if (giuVo.Contains(v.Ten)) { tk.GiuVo++; continue; }
                var a = new object[] { v.Nut.Length, (string[])v.Nut.Clone(), "", v.TietDien, v.Ten };
                e.Goi("AreaObj", "cAreaObj", "AddByPoint", a, true);
                if ((string)a[2] != v.Ten) throw new LoiEtabs("AddByPoint o vo " + v.Ten + " ETABS dat ten " + a[2]);
                tk.ThemVo++;
            }
        }

        /// <summary>Xoá mọi thanh, ô vỏ, điểm của app (để đặt lại tầng / vẽ lại trong cùng file).</summary>
        static void XoaDoiTuongApp(BoGoiEtabs e, ThongKe tk)
        {
            foreach (string f in DanhSach(e, "FrameObj", "cFrameObj").Where(x => ThanhApp.IsMatch(x)))
            { e.Goi("FrameObj", "cFrameObj", "Delete", new object[] { f, "Objects" }); tk.XoaThanh++; }
            foreach (string a in DanhSach(e, "AreaObj", "cAreaObj").Where(x => VoApp.IsMatch(x)))
            { e.Goi("AreaObj", "cAreaObj", "Delete", new object[] { a, "Objects" }); tk.XoaVo++; }
            var ds = DanhSach(e, "PointObj", "cPointObj").Where(x => DiemApp.IsMatch(x)).ToList();
            foreach (string d in ds) XoaDiem(e, d);
            var conLai = new HashSet<string>(DanhSach(e, "PointObj", "cPointObj"), StringComparer.Ordinal);
            tk.XoaDiem += ds.Count(d => !conLai.Contains(d));
        }

        /// <summary>Xoá một điểm không còn nối đối tượng nào: bỏ gối, lò xo rồi DeleteSpecialPoint (ETABS có thể đã tự xoá điểm mồ côi).</summary>
        static void XoaDiem(BoGoiEtabs e, string d)
        {
            try { e.Goi("PointObj", "cPointObj", "SetRestraint", new object[] { d, new bool[6], "Objects" }, true); } catch { /* đã xoá */ }
            try { e.Goi("PointObj", "cPointObj", "DeleteSpring", new object[] { d, "Objects" }); } catch { /* không có lò xo */ }
            try { e.Goi("PointObj", "cPointObj", "DeleteSpecialPoint", new object[] { d, "Objects" }); } catch { /* kiểm tra lại bằng danh sách điểm */ }
        }

        static void DoiDiem(BoGoiEtabs e, string ten, double x, double y, double z)
        {
            try { e.Goi("EditPoint", "cEditPoint", "ChangeCoordinates_1", new object[] { ten, x, y, z, true }); }
            catch (Exception ex) when (!(ex is OutOfMemoryException))
            {
                throw new LoiDoiDiem(Api.GocLoi(ex).GetType().Name + ": " + Api.GocLoi(ex).Message);
            }
        }

        /// <summary>Lực tải cẩu tháp cũ: xoá lực của các pattern ở mọi điểm (nhóm "All"); không được thì xoá ở từng nút đài.</summary>
        static string XoaLucCu(BoGoiEtabs e, List<string> dsMau, HinhHoc hh)
        {
            if (dsMau.Count == 0) return "khong co luc cu";
            var loi = new List<string>();
            foreach (string mau in dsMau)
            {
                try { e.Goi("PointObj", "cPointObj", "DeleteLoadForce", new object[] { "All", mau, "Group" }); continue; }
                catch (Exception ex) { loi.Add(mau + ": " + Api.GocLoi(ex).Message); }
                foreach (Diem d in hh.DsDiem.Where(d => d.Ten.StartsWith("D", StringComparison.Ordinal)))
                {
                    try { e.Goi("PointObj", "cPointObj", "DeleteLoadForce", new object[] { d.Ten, mau, "Objects" }); } catch { /* điểm không có lực */ }
                }
            }
            return "xoa luc cu cua " + dsMau.Count + " load pattern" + (loi.Count > 0 ? " (xoa tung nut dai: " + loi[0] + ")" : " (nhom All)");
        }

        // ---------- Kiểm tra sau đồng bộ ----------
        static List<string> KiemTra(BoGoiEtabs e, HinhHoc hh)
        {
            var khac = new List<string>();
            foreach (Diem d in hh.DsDiem)
            {
                double[] c = ToaDo(e, d.Ten);
                if (c == null) khac.Add("khong co diem " + d.Ten);
                else if (!Gan(c, d.Xyz)) khac.Add("diem " + d.Ten + " o (" + string.Join("; ", c.Select(v => Math.Round(v, 3))) + ") thay vi (" + string.Join("; ", d.Xyz) + ")");
                if (khac.Count > 5) return khac;
            }
            foreach (Thanh t in hh.DsThanh)
            {
                var p = new object[] { t.Ten, "", "" };
                try { e.Goi("FrameObj", "cFrameObj", "GetPoints", p, true); }
                catch { khac.Add("khong co thanh " + t.Ten); continue; }
                if (!CungHaiDau((string)p[1], (string)p[2], t)) khac.Add("thanh " + t.Ten + " noi " + p[1] + "–" + p[2] + " thay vi " + t.Dau + "–" + t.Cuoi);
                if (khac.Count > 5) return khac;
            }
            foreach (Vo v in hh.DsVo)
            {
                string[] nut = NutVo(e, v.Ten);
                if (nut == null) khac.Add("khong co o vo " + v.Ten);
                else if (!CungNut(nut, v.Nut)) khac.Add("o vo " + v.Ten + " noi " + string.Join(",", nut));
                if (khac.Count > 5) return khac;
            }
            foreach (string f in DanhSach(e, "FrameObj", "cFrameObj").Where(x => ThanhApp.IsMatch(x) && !hh.Thanh.ContainsKey(x))) khac.Add("thua thanh " + f);
            foreach (string a in DanhSach(e, "AreaObj", "cAreaObj").Where(x => VoApp.IsMatch(x) && !hh.Vo.ContainsKey(x))) khac.Add("thua o vo " + a);
            return khac;
        }

        // ---------- Tiện ích ----------
        static double[] ToaDo(BoGoiEtabs e, string ten)
        {
            var a = new object[] { ten, 0.0, 0.0, 0.0 };
            try { e.Goi("PointObj", "cPointObj", "GetCoordCartesian", a, true); }
            catch { return null; }
            return new[] { Convert.ToDouble(a[1]), Convert.ToDouble(a[2]), Convert.ToDouble(a[3]) };
        }
        static string[] NutVo(BoGoiEtabs e, string ten)
        {
            var a = new object[] { ten, 0, null };
            try { e.Goi("AreaObj", "cAreaObj", "GetPoints", a, true); } catch { return null; }
            return a[2] is string[] ds ? ds : (a[2] as Array)?.Cast<object>().Select(Convert.ToString).ToArray();
        }
        /// <summary>Cùng các nút theo vòng (ETABS có thể bắt đầu từ nút khác hoặc đảo chiều vòng).</summary>
        static bool CungNut(string[] a, string[] b)
        {
            if (a.Length != b.Length) return false;
            int n = a.Length;
            for (int k = 0; k < n; k++)
            {
                if (Enumerable.Range(0, n).All(i => a[(i + k) % n] == b[i])) return true;
                if (Enumerable.Range(0, n).All(i => a[(k - i + n) % n] == b[i])) return true;
            }
            return false;
        }
        /// <summary>Hai đầu thanh trùng, không phân biệt thứ tự: ETABS tự đặt đầu I ở nút dưới của thanh đứng (cọc dựng từ trên xuống bị đảo).</summary>
        static bool CungHaiDau(string p1, string p2, Thanh t) => (p1 == t.Dau && p2 == t.Cuoi) || (p1 == t.Cuoi && p2 == t.Dau);
        /// <summary>Cùng file mô hình: ETABS có thể báo file làm việc .$et thay cho .EDB cùng tên.</summary>
        static bool CungFile(string dangMo, string file)
        {
            if (string.IsNullOrWhiteSpace(dangMo)) return false;
            try
            {
                string a = Path.GetFullPath(dangMo.Trim()), b = Path.GetFullPath(file);
                return string.Equals(a, b, StringComparison.OrdinalIgnoreCase) ||
                       (Regex.IsMatch(Path.GetExtension(a), @"^\.(\$et|edb|e2k)$", RegexOptions.IgnoreCase) &&
                        string.Equals(Path.ChangeExtension(a, null), Path.ChangeExtension(b, null), StringComparison.OrdinalIgnoreCase));
            }
            catch { return false; }
        }
        static bool Gan(double[] a, double[] b) => Enumerable.Range(0, 3).All(i => Math.Abs(a[i] - b[i]) <= SaiSo);
        static string Khoa(double[] c) => string.Join("|", c.Select(v => Math.Round(v, 4).ToString("F4", CultureInfo.InvariantCulture)));

        static List<string> DanhSach(BoGoiEtabs e, string thuocTinh, string giaoDien)
        {
            var a = new object[] { 0, null };
            try { e.Goi(thuocTinh, giaoDien, "GetNameList", a, true); } catch { return new List<string>(); }
            return a[1] is Array ds ? ds.Cast<object>().Select(x => Convert.ToString(x)).ToList() : new List<string>();
        }
    }
}
