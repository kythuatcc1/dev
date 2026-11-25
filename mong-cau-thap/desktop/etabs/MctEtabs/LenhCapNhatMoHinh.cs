// Lệnh "cap-nhat-mo-hinh": sửa mô hình app đã dựng NGAY TRONG FILE ĐANG CÓ thay vì đóng và dựng mô hình mới.
//   1. Gắn ETABS; mô hình đang mở khác file đã dựng thì mở file đó (File.OpenFile).
//   2. Mở khoá mô hình (sau phân tích ETABS khoá mô hình; mở khoá thì kết quả phân tích cũ bị xoá).
//   3. Kiểm tra hình học trùng với số liệu app gửi: toạ độ mọi điểm, hai đầu mọi thanh, số ô vỏ. Khác → dừng, app dựng lại.
//   4. Cập nhật vật liệu, tiết diện, lò xo đất, gối mũi cọc, load pattern + lực tại tâm đài, tổ hợp (xoá tổ hợp cũ của app
//      rồi tạo lại; xoá load pattern tải cẩu không còn dùng, ví dụ MZ1 khi không còn mômen xoắn).
//   5. Lưu đè file.
using System;
using System.Collections.Generic;
using System.Diagnostics;
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
                bool cungFile = !string.IsNullOrEmpty(dangMo) && string.Equals(Path.GetFullPath(dangMo), file, StringComparison.OrdinalIgnoreCase);
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

                // 3. Hình học phải trùng
                buoc = "kiem-tra-hinh-hoc";
                var khac = new List<string>();
                var toaDo = new Dictionary<string, double[]>(StringComparer.Ordinal);
                foreach (JsonNode d in (JsonArray)m["diem"])
                {
                    string ten = (string)d["ten"];
                    double[] mong = { (double)d["x"], (double)d["y"], (double)d["z"] };
                    toaDo[ten] = mong;
                    var a = new object[] { ten, 0.0, 0.0, 0.0 };
                    try { e.Goi("PointObj", "cPointObj", "GetCoordCartesian", a, true); }
                    catch { khac.Add("khong co diem " + ten); if (khac.Count > 5) break; continue; }
                    double[] co = { Convert.ToDouble(a[1]), Convert.ToDouble(a[2]), Convert.ToDouble(a[3]) };
                    if (Enumerable.Range(0, 3).Any(i => Math.Abs(co[i] - mong[i]) > 1e-3))
                        khac.Add("diem " + ten + " o (" + string.Join("; ", co.Select(v => Math.Round(v, 3))) + ") thay vi (" + string.Join("; ", mong) + ")");
                    if (khac.Count > 5) break;
                }
                var dsThanh = (JsonArray)m["thanh"];
                if (khac.Count == 0)
                {
                    foreach (JsonNode t in dsThanh)
                    {
                        var p = new object[] { (string)t["ten"], "", "" };
                        try { e.Goi("FrameObj", "cFrameObj", "GetPoints", p, true); }
                        catch { khac.Add("khong co thanh " + (string)t["ten"]); if (khac.Count > 5) break; continue; }
                        if ((string)p[1] != (string)t["dau"] || (string)p[2] != (string)t["cuoi"]) khac.Add("thanh " + (string)t["ten"] + " noi " + p[1] + "–" + p[2]);
                        if (khac.Count > 5) break;
                    }
                }
                int soThanh = Dem(e, "FrameObj", "cFrameObj"), soVo = Dem(e, "AreaObj", "cAreaObj"), soVoApp = ((JsonArray)m["vo"]).Count;
                if (khac.Count == 0 && soThanh >= 0 && soThanh != dsThanh.Count) khac.Add("ETABS co " + soThanh + " thanh, app " + dsThanh.Count);
                if (khac.Count == 0 && soVo >= 0 && soVo != soVoApp) khac.Add("ETABS co " + soVo + " o vo, app " + soVoApp);
                if (khac.Count > 0)
                {
                    kq.Dat("khacHinhHoc", khac);
                    kq.Dung(buoc, "Hinh hoc mo hinh trong ETABS khac thong so hien tai (" + string.Join("; ", khac.Take(3)) + "). Can dung lai mo hinh.", "dung-lai");
                    return;
                }
                kq.GhiBuoc(buoc, true, toaDo.Count + " diem, " + dsThanh.Count + " thanh, " + soVoApp + " o vo trung khop");
                string Ten(JsonNode n) => (string)n;

                // 4. Thuộc tính, lò xo, gối
                buoc = "vat-lieu";
                kq.GhiBuoc(buoc, true, LenhDungMoHinh.DatVatLieu(e, m));
                buoc = "tiet-dien";
                kq.GhiBuoc(buoc, true, LenhDungMoHinh.DatTietDien(e, m));
                buoc = "lo-xo";
                var dsLoXo = (JsonArray)m["loXo"];
                string cachLoXo = LenhDungMoHinh.GanLoXo(e, m, dsLoXo, Ten);
                kq.Dat("cachGanLoXo", cachLoXo);
                kq.GhiBuoc(buoc, true, dsLoXo.Count + " lo xo – " + cachLoXo);
                buoc = "goi";
                kq.GhiBuoc(buoc, true, LenhDungMoHinh.DatGoi(e, m, Ten));

                // 5. Tổ hợp cũ của app → xoá; load pattern tải cẩu không còn dùng → xoá; đặt lại tải và tổ hợp
                buoc = "xoa-to-hop-cu";
                var thCu = DanhSach(e, "RespCombo", "cCombo").Where(x => ToHopApp.IsMatch(x)).ToList();
                foreach (string th in thCu.OrderBy(x => x.Equals("BAO", StringComparison.OrdinalIgnoreCase) ? 0 : 1))   // BAO tham chiếu các tổ hợp khác → xoá trước
                    e.Goi("RespCombo", "cCombo", "Delete", new object[] { th });
                var mauMoi = new HashSet<string>(((JsonArray)m["mauTai"] ?? new JsonArray()).Select(x => (string)x["ten"]), StringComparer.OrdinalIgnoreCase);
                var mauBo = LenhDungMoHinh.DanhSachMau(e).Where(x => MauApp.IsMatch(x) && !mauMoi.Contains(x)).ToList();
                foreach (string mau in mauBo) e.Goi("LoadPatterns", "cLoadPatterns", "Delete", new object[] { mau });
                kq.Dat("loadPatternDaXoa", mauBo);
                kq.GhiBuoc(buoc, true, thCu.Count + " to hop cu" + (mauBo.Count > 0 ? "; xoa load pattern " + string.Join(", ", mauBo) : ""));
                buoc = "tai-trong";
                var tenMau = LenhDungMoHinh.DatTaiTrong(kq, e, m, Ten);
                buoc = "to-hop";
                LenhDungMoHinh.DatToHop(kq, e, m, tenMau);

                // 6. Lưu đè
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
                kq.Dung(buoc, (ex is LoiEtabs ? "" : ex.GetType().Name + ": ") + ex.Message);
            }
        }

        static List<string> DanhSach(BoGoiEtabs e, string thuocTinh, string giaoDien)
        {
            var a = new object[] { 0, null };
            try { e.Goi(thuocTinh, giaoDien, "GetNameList", a, true); } catch { return new List<string>(); }
            return a[1] is Array ds ? ds.Cast<object>().Select(x => Convert.ToString(x)).ToList() : new List<string>();
        }

        static int Dem(BoGoiEtabs e, string thuocTinh, string giaoDien)
        {
            try { return Convert.ToInt32(e.Lay(thuocTinh, giaoDien, "Count", null)); } catch { return -1; }
        }
    }
}
