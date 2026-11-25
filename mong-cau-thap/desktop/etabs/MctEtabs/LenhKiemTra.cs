// Lệnh "kiem-tra": gắn vào ETABS rồi đọc thông tin mô hình đang mở (mỗi hàm thử riêng, ghi lỗi chi tiết)
using System;
using System.Linq;

namespace MctEtabs
{
    internal static class LenhKiemTra
    {
        static readonly string[] HamDocMoHinh =
            { "SapModel.GetModelFilename", "SapModel.GetPresentUnits", "SapModel.GetModelIsLocked", "SapModel.GetVersion" };

        /// <summary>
        /// Vì sao gắn được nhưng không lấy được mô hình:
        ///  - có lỗi E_NOINTERFACE (0x80004002) hoặc lớp bọc ETABSv1 rỗng (m_objInner = null) trong khi gọi thẳng COM vẫn được
        ///    → Windows thiếu đăng ký giao diện API (type library) của ETABS
        ///  - còn lại (NullReference khi lớp bọc có đối tượng bên trong) → ETABS chưa mở mô hình
        /// </summary>
        static string NguyenNhan(KetQua kq, PhienEtabs ph)
        {
            if (ph.ThieuDangKyGiaoDien) return ph.CoNguonTypeLib ? "dang-ky-giao-dien" : "chay-register";
            bool noInterface = kq.ThuHam.Any(h => (string)h["hresult"] == "0x80004002");
            bool bocRong = kq.ThongTin.Any(c => c.Key.StartsWith("lopBoc ", StringComparison.Ordinal) &&
                                                c.Value is System.Text.Json.Nodes.JsonArray a &&
                                                a.Any(x => ((string)x ?? "").Contains("m_objInner") && ((string)x ?? "").EndsWith("= null", StringComparison.Ordinal)));
            bool comTrucTiepDuoc = kq.ThuHam.Any(h => (string)h["ten"] == "COM truc tiep (ROT) > GetOAPIVersionNumber" && (bool)h["ok"]);
            if (noInterface || (bocRong && comTrucTiepDuoc)) return "dang-ky-giao-dien";
            return "mo-mo-hinh";
        }

        public static void Chay(KetQua kq, YeuCau yc)
        {
            PhienEtabs ph = KetNoi.Mo(kq, yc);
            if (ph == null) return;

            IBoGoi g = ph.G;
            object sap = ph.SapModel ?? kq.Thu("cOAPI.SapModel", () => g.Lay(ph.OAPI, "cOAPI", "SapModel"));
            if (sap == null || ph.ChiGanMotPhan)
            {
                kq.Dung("doc-mo-hinh", "Gan duoc ETABS (goi duoc ham don gian) nhung khong lay duoc mo hinh.", NguyenNhan(kq, ph));
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
                kq.Dung("doc-mo-hinh", "Gan duoc ETABS nhung khong doc duoc mo hinh (xem bang thu tung ham).", NguyenNhan(kq, ph));
                return;
            }
            kq.GhiBuoc("doc-mo-hinh", true, "ETABS " + KetQua.HienThi(kq.ThongTin["etabsPhienBan"]) +
                                            ", mo hinh: " + KetQua.HienThi(kq.ThongTin["fileMoHinh"]));
            kq.Ok = true;
        }
    }
}
