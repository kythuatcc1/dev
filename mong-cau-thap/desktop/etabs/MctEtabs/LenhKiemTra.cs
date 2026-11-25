// Lệnh "kiem-tra": gắn vào ETABS rồi đọc thông tin mô hình đang mở (mỗi hàm thử riêng, ghi lỗi chi tiết)
using System;
using System.Linq;

namespace MctEtabs
{
    internal static class LenhKiemTra
    {
        static readonly string[] HamDocMoHinh =
            { "SapModel.GetModelFilename", "SapModel.GetPresentUnits", "SapModel.GetModelIsLocked", "SapModel.GetVersion" };

        public static void Chay(KetQua kq, YeuCau yc)
        {
            PhienEtabs ph = KetNoi.Mo(kq, yc);
            if (ph == null) return;

            IBoGoi g = ph.G;
            object sap = ph.SapModel ?? kq.Thu("cOAPI.SapModel", () => g.Lay(ph.OAPI, "cOAPI", "SapModel"));
            if (sap == null)
            {
                kq.Dung("doc-mo-hinh", "Khong lay duoc SapModel tu ETABS.", "mo-mo-hinh");
                return;
            }
            kq.Dat("kieuSapModel", sap.GetType().FullName);
            kq.Dat("fileMoHinh", kq.Thu("SapModel.GetModelFilename", () => g.Goi(sap, "cSapModel", "GetModelFilename", new object[] { true })));
            kq.Dat("donVi", kq.Thu("SapModel.GetPresentUnits", () => g.Goi(sap, "cSapModel", "GetPresentUnits", null)));
            kq.Dat("moHinhKhoa", kq.Thu("SapModel.GetModelIsLocked", () => g.Goi(sap, "cSapModel", "GetModelIsLocked", null)));
            kq.Dat("etabsPhienBan", kq.Thu("SapModel.GetVersion", () =>
            {
                var a = new object[] { "", 0.0 };
                g.Goi(sap, "cSapModel", "GetVersion", a, true);
                return a[0] + " (" + KetQua.HienThi(a[1]) + ")";
            }));
            foreach (var (khoa, thuocTinh, giaoDien) in new[] { ("soDiem", "PointObj", "cPointObj"), ("soThanh", "FrameObj", "cFrameObj"), ("soVung", "AreaObj", "cAreaObj") })
            {
                kq.Dat(khoa, kq.Thu(thuocTinh + ".Count", () => g.Goi(g.Lay(sap, "cSapModel", thuocTinh), giaoDien, "Count", null)));
            }
            kq.Dat("loadPatterns", kq.Thu("LoadPatterns.GetNameList", () =>
            {
                var a = new object[] { 0, null };
                g.Goi(g.Lay(sap, "cSapModel", "LoadPatterns"), "cLoadPatterns", "GetNameList", a, true);
                return a[1] is Array ds ? ds.Cast<object>().Select(x => Convert.ToString(x)).ToArray() : Array.Empty<string>();
            }));

            bool DocDuoc(System.Text.Json.Nodes.JsonNode h) => HamDocMoHinh.Contains((string)h["ten"]) && (bool)h["ok"];
            if (!kq.ThuHam.Any(DocDuoc))
            {
                bool nre = kq.ThuHam.Any(h => HamDocMoHinh.Contains((string)h["ten"]) &&
                                              ((string)h["loi"] ?? "").StartsWith("System.NullReferenceException", StringComparison.Ordinal));
                kq.Dung("doc-mo-hinh", "Gan duoc ETABS nhung khong doc duoc mo hinh (xem bang thu tung ham).", nre ? "mo-mo-hinh" : null);
                return;
            }
            kq.GhiBuoc("doc-mo-hinh", true, "ETABS " + KetQua.HienThi(kq.ThongTin["etabsPhienBan"]) +
                                            ", mo hinh: " + KetQua.HienThi(kq.ThongTin["fileMoHinh"]));
            kq.Ok = true;
        }
    }
}
