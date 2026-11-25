// Lệnh "phan-tich" (bước 4): chạy phân tích mô hình app đã dựng rồi lấy nội lực theo từng tổ hợp
//   - cọc   : FrameForce mỗi đoạn cọc → [z, tổ hợp, P, V2, V3, T, M2, M3] (z tính từ toạ độ 2 đầu đoạn)
//   - dầm giằng: FrameForce mỗi dầm → [x, tổ hợp, P, V2, V3, T, M2, M3] (x tính từ đầu dầm dọc theo dầm)
//   - chuyển vị: JointDispl tại tâm đài và đầu cọc → [nút, tổ hợp, U1, U2, U3, R1, R2, R3]
//   - đài   : AreaForceShell mỗi ô vỏ, lấy trung bình tại nút → [nút, tổ hợp, M11, M22, M12, V13, V23]
// Đơn vị kN, m. App (js/calc/etabs-ket-qua.js) tính bao nội lực, mặt cắt đài và kiểm tra.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Text.Json.Nodes;

namespace MctEtabs
{
    internal static class LenhPhanTich
    {
        static double Tron(double v, int so = 3) => double.IsFinite(v) ? Math.Round(v, so) : 0;

        static double[] So(object v) =>
            v is double[] d ? d : v is Array a ? a.Cast<object>().Select(x => Convert.ToDouble(x, CultureInfo.InvariantCulture)).ToArray() : Array.Empty<double>();

        static string[] Chu(object v) =>
            v is string[] s ? s : v is Array a ? a.Cast<object>().Select(x => Convert.ToString(x, CultureInfo.InvariantCulture)).ToArray() : Array.Empty<string>();

        public static void Chay(KetQua kq, YeuCau yc)
        {
            if (yc.DuLieu is not JsonObject d || d["coc"] is not JsonArray dsCoc || d["toHop"] is not JsonArray dsToHop || d["diem"] is not JsonObject dsDiem)
            {
                kq.Dung("doc-yeu-cau", "Thieu du lieu phan tich (duLieu.coc, toHop, diem, vo, nutChuyenVi).");
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
            string buoc = "kiem-tra-mo-hinh";
            try
            {
                var toaDo = new Dictionary<string, double[]>(StringComparer.Ordinal);
                foreach (var kv in dsDiem) toaDo[kv.Key] = ((JsonArray)kv.Value).Select(x => (double)x).ToArray();
                double[] ToaDo(string ten)
                {
                    if (toaDo.TryGetValue(ten, out double[] t)) return t;
                    var a = new object[] { ten, 0.0, 0.0, 0.0 };   // điểm do ETABS tự chia lưới (tên "~…")
                    try { e.Goi("PointElm", "cPointElm", "GetCoordCartesian", a, true); }
                    catch { e.Goi("PointObj", "cPointObj", "GetCoordCartesian", a, true); }
                    return toaDo[ten] = new[] { Convert.ToDouble(a[1]), Convert.ToDouble(a[2]), Convert.ToDouble(a[3]) };
                }
                string[] toHop = dsToHop.Select(x => (string)x).ToArray();
                var chiSo = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < toHop.Length; i++) chiSo[toHop[i]] = i;

                // 1. Mô hình đang mở phải là mô hình app đã dựng
                string thanhDau = (string)((JsonArray)dsCoc[0]["thanh"])[0];
                var kt = new object[] { thanhDau, "", "" };
                try { e.Goi("FrameObj", "cFrameObj", "GetPoints", kt, true); }
                catch (Exception ex)
                {
                    throw new LoiEtabs("Mo hinh dang mo trong ETABS khong phai mo hinh app dung (khong co thanh " + thanhDau +
                                       "). Hay bam Dung mo hinh truoc. (" + Api.GocLoi(ex).Message + ")");
                }
                string file = KetQua.HienThi(e.Lay("", "cSapModel", "GetModelFilename", new object[] { true }));
                kq.Dat("fileMoHinh", file);
                kq.GhiBuoc(buoc, true, file);

                // 2. Chạy phân tích (bỏ trường hợp Modal cho nhanh)
                buoc = "phan-tich";
                e.Goi("", "cSapModel", "SetPresentUnits", new object[] { "kN_m_C" });
                try { e.Goi("Analyze", "cAnalyze", "SetRunCaseFlag", new object[] { "Modal", false, false }); } catch { /* không có Modal */ }
                var dh = Stopwatch.StartNew();
                e.Goi("Analyze", "cAnalyze", "RunAnalysis", null);
                kq.Dat("thoiGianPhanTichGiay", Math.Round(dh.Elapsed.TotalSeconds, 1));
                kq.GhiBuoc(buoc, true, "Chay xong trong " + Math.Round(dh.Elapsed.TotalSeconds, 1) + " giay");

                // 3. Chọn tổ hợp để xuất kết quả
                buoc = "chon-to-hop";
                e.Goi("Results.Setup", "cAnalysisResultsSetup", "DeselectAllCasesAndCombosForOutput", null);
                foreach (string th in toHop) e.Goi("Results.Setup", "cAnalysisResultsSetup", "SetComboSelectedForOutput", new object[] { th, true });
                kq.GhiBuoc(buoc, true, toHop.Length + " to hop");

                // 4. Nội lực cọc theo chiều sâu
                buoc = "noi-luc-coc";
                var cocRa = new JsonArray();
                int soDongCoc = 0;
                foreach (JsonNode c in dsCoc)
                {
                    var dong = new JsonArray();
                    foreach (JsonNode tn in (JsonArray)c["thanh"])
                    {
                        string ten = (string)tn;
                        var p = new object[] { ten, "", "" };
                        e.Goi("FrameObj", "cFrameObj", "GetPoints", p, true);
                        double zI = ToaDo((string)p[1])[2], zJ = ToaDo((string)p[2])[2], L = Math.Abs(zJ - zI);
                        var r = new object[] { ten, "ObjectElm", 0, null, null, null, null, null, null, null, null, null, null, null, null, null };
                        e.Goi("Results", "cAnalysisResults", "FrameForce", r, true);
                        int n = Convert.ToInt32(r[2]);
                        double[] sta = So(r[4]), P = So(r[10]), V2 = So(r[11]), V3 = So(r[12]), T = So(r[13]), M2 = So(r[14]), M3 = So(r[15]);
                        string[] ca = Chu(r[7]);
                        for (int k = 0; k < n; k++)
                        {
                            if (!chiSo.TryGetValue(ca[k], out int ci)) continue;
                            double z = zI + (L > 0 ? (zJ - zI) * sta[k] / L : 0);
                            dong.Add(new JsonArray(Tron(z, 4), ci, Tron(P[k]), Tron(V2[k]), Tron(V3[k]), Tron(T[k]), Tron(M2[k]), Tron(M3[k])));
                            soDongCoc++;
                        }
                    }
                    cocRa.Add(new JsonObject { ["ten"] = (string)c["ten"], ["dong"] = dong });
                }
                kq.GhiBuoc(buoc, soDongCoc > 0, soDongCoc + " dong noi luc cho " + dsCoc.Count + " coc");
                if (soDongCoc == 0) throw new LoiEtabs("FrameForce khong tra ket qua nao cho cac to hop da chon.");

                // 4b. Nội lực dầm giằng (nếu có)
                var damRa = new JsonArray();
                if (d["dam"] is JsonArray dsDam && dsDam.Count > 0)
                {
                    buoc = "noi-luc-dam";
                    int soDongDam = 0;
                    foreach (JsonNode dm in dsDam)
                    {
                        var dong = new JsonArray();
                        double x0 = 0;
                        foreach (JsonNode tn in (JsonArray)dm["thanh"])
                        {
                            string ten = (string)tn;
                            var p = new object[] { ten, "", "" };
                            e.Goi("FrameObj", "cFrameObj", "GetPoints", p, true);
                            double[] a = ToaDo((string)p[1]), b = ToaDo((string)p[2]);
                            double L = Math.Sqrt(Math.Pow(b[0] - a[0], 2) + Math.Pow(b[1] - a[1], 2) + Math.Pow(b[2] - a[2], 2));
                            var r = new object[] { ten, "ObjectElm", 0, null, null, null, null, null, null, null, null, null, null, null, null, null };
                            e.Goi("Results", "cAnalysisResults", "FrameForce", r, true);
                            int n = Convert.ToInt32(r[2]);
                            double[] sta = So(r[4]), P = So(r[10]), V2 = So(r[11]), V3 = So(r[12]), T = So(r[13]), M2 = So(r[14]), M3 = So(r[15]);
                            string[] ca = Chu(r[7]);
                            for (int k = 0; k < n; k++)
                            {
                                if (!chiSo.TryGetValue(ca[k], out int ci)) continue;
                                dong.Add(new JsonArray(Tron(x0 + sta[k], 4), ci, Tron(P[k]), Tron(V2[k]), Tron(V3[k]), Tron(T[k]), Tron(M2[k]), Tron(M3[k])));
                                soDongDam++;
                            }
                            x0 += L;
                        }
                        damRa.Add(new JsonObject { ["ten"] = (string)dm["ten"], ["dong"] = dong });
                    }
                    kq.GhiBuoc(buoc, soDongDam > 0, soDongDam + " dong noi luc cho " + dsDam.Count + " dam giang");
                    if (soDongDam == 0) throw new LoiEtabs("FrameForce khong tra ket qua nao cho dam giang.");
                }

                // 5. Chuyển vị tâm đài và đầu cọc
                buoc = "chuyen-vi";
                string[] nutCv = ((JsonArray)d["nutChuyenVi"]).Select(x => (string)x).ToArray();
                var cvDong = new JsonArray();
                for (int i = 0; i < nutCv.Length; i++)
                {
                    var r = new object[] { nutCv[i], "ObjectElm", 0, null, null, null, null, null, null, null, null, null, null, null };
                    e.Goi("Results", "cAnalysisResults", "JointDispl", r, true);
                    int n = Convert.ToInt32(r[2]);
                    string[] ca = Chu(r[5]);
                    double[] U1 = So(r[8]), U2 = So(r[9]), U3 = So(r[10]), R1 = So(r[11]), R2 = So(r[12]), R3 = So(r[13]);
                    for (int k = 0; k < n; k++)
                        if (chiSo.TryGetValue(ca[k], out int ci))
                            cvDong.Add(new JsonArray(i, ci, Tron(U1[k], 7), Tron(U2[k], 7), Tron(U3[k], 7), Tron(R1[k], 8), Tron(R2[k], 8), Tron(R3[k], 8)));
                }
                kq.GhiBuoc(buoc, cvDong.Count > 0, cvDong.Count + " dong chuyen vi (" + nutCv.Length + " nut)");

                // 6. Nội lực tấm đài, trung bình tại nút
                buoc = "noi-luc-dai";
                string[] vo = ((JsonArray)d["vo"]).Select(x => (string)x).ToArray();
                var tong = new Dictionary<(string, int), double[]>();
                foreach (string ten in vo)
                {
                    var r = new object[26];
                    r[0] = ten; r[1] = "ObjectElm"; r[2] = 0;
                    e.Goi("Results", "cAnalysisResults", "AreaForceShell", r, true);
                    int n = Convert.ToInt32(r[2]);
                    string[] diem = Chu(r[5]), ca = Chu(r[6]);
                    double[] M11 = So(r[16]), M22 = So(r[17]), M12 = So(r[18]), V13 = So(r[22]), V23 = So(r[23]);
                    for (int k = 0; k < n; k++)
                    {
                        if (!chiSo.TryGetValue(ca[k], out int ci)) continue;
                        var khoa = (diem[k], ci);
                        if (!tong.TryGetValue(khoa, out double[] t)) tong[khoa] = t = new double[6];
                        t[0] += M11[k]; t[1] += M22[k]; t[2] += M12[k]; t[3] += V13[k]; t[4] += V23[k]; t[5] += 1;
                    }
                }
                var tenNut = tong.Keys.Select(k => k.Item1).Distinct().ToList();
                var viTri = new Dictionary<string, int>();
                var nutRa = new JsonArray();
                foreach (string ten in tenNut)
                {
                    double[] t = ToaDo(ten);
                    viTri[ten] = nutRa.Count;
                    nutRa.Add(new JsonArray(Tron(t[0], 4), Tron(t[1], 4)));
                }
                var daiDong = new JsonArray();
                foreach (var kv in tong)
                {
                    double[] t = kv.Value; double so = t[5];
                    daiDong.Add(new JsonArray(viTri[kv.Key.Item1], kv.Key.Item2, Tron(t[0] / so), Tron(t[1] / so), Tron(t[2] / so), Tron(t[3] / so), Tron(t[4] / so)));
                }
                kq.GhiBuoc(buoc, daiDong.Count > 0, nutRa.Count + " nut tam dai, " + daiDong.Count + " dong noi luc");

                kq.Goc["ketQua"] = new JsonObject
                {
                    ["toHop"] = new JsonArray(toHop.Select(x => (JsonNode)JsonValue.Create(x)).ToArray()),
                    ["coc"] = cocRa,
                    ["dam"] = damRa,
                    ["chuyenVi"] = new JsonObject { ["nut"] = new JsonArray(nutCv.Select(x => (JsonNode)JsonValue.Create(x)).ToArray()), ["dong"] = cvDong },
                    ["dai"] = new JsonObject { ["nut"] = nutRa, ["dong"] = daiDong }
                };
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
    }
}
