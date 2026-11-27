// Lệnh "tu-chup": tự chụp hình ETABS cho thuyết minh.
// API ETABS không có lệnh đổi khung nhìn, bật biểu đồ lực / biến dạng hay chụp ảnh (cView chỉ có RefreshView, RefreshWindow),
// nên cầu nối điều khiển giao diện ETABS bằng Windows UI Automation như người dùng bấm chuột: mở menu, chọn trong hộp thoại,
// bấm OK – rồi chụp vùng khung nhìn mô hình (GDI BitBlt từ màn hình, ghi PNG). Mọi thao tác ghi nhật ký (tên menu, cây điều khiển
// của hộp thoại, vùng chụp) để chỉnh kịch bản theo đúng giao diện ETABS trên máy người dùng.
//
// duLieu = {
//   chuanBi: bool        – đưa ETABS lên trước, phóng to, để một khung nhìn (Options → Windows → One), phóng to khung nhìn
//   thaoTac: [ ... ]     – lần lượt:
//     { loai: "menu", duong: ["Display", "Force/Stress Diagrams", "Frame/Pier/Spandrel/Link Forces"] }
//     { loai: "hop-thoai", tieuDe: "…" (tuỳ chọn), dat: [ … ], xong: "OK" }
//         dat: { chon: "BAO" | ["BAO", …] }            – chọn mục trong ô chọn (ComboBox) có mục này
//              { radio: ["Max", "Envelope Max"] }       – chọn nút radio
//              { tick: ["Show Values on Diagram"], gt: true } – đánh dấu / bỏ ô kiểm
//              { danhSach: ["MAT_DAI"] }                 – chọn mục trong danh sách (chọn nhiều nếu cho phép)
//              { nhap: ["Plan"], gt: "270" }            – ghi vào ô nhập đứng sau nhãn
//     { loai: "phim", phim: "ESC" | "ENTER" | "F6" … }
//     { loai: "doi", ms: 800 }
//   chup: bool, thuMucAnh, tenAnh – chụp vùng khung nhìn mô hình ra <thuMucAnh>/<tenAnh>.png
//   thamDo: bool         – ghi thêm cây menu (File, View, Display, Options) và cây cửa sổ chính
// }
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using Interop.UIAutomationClient;

namespace MctEtabs
{
    internal static class LenhTuChup
    {
        // ---- Mã UI Automation ----
        const int P_Invoke = 10000, P_Selection = 10001, P_Value = 10002, P_ExpandCollapse = 10005, P_Window = 10009,
                  P_SelectionItem = 10010, P_Toggle = 10015, P_Legacy = 10018;
        const int PR_ProcessId = 30002, PR_ControlType = 30003;
        const int CT_Button = 50000, CT_CheckBox = 50002, CT_ComboBox = 50003, CT_Edit = 50004, CT_ListItem = 50007, CT_List = 50008,
                  CT_Menu = 50009, CT_MenuBar = 50010, CT_MenuItem = 50011, CT_RadioButton = 50013, CT_Text = 50020, CT_ToolBar = 50021,
                  CT_Tree = 50023, CT_TreeItem = 50024, CT_Group = 50026, CT_DataItem = 50029, CT_Window = 50032, CT_Pane = 50033, CT_TitleBar = 50037;
        static readonly Dictionary<int, string> TEN_KIEU = new Dictionary<int, string>
        {
            [50000] = "Button", [50001] = "Calendar", [50002] = "CheckBox", [50003] = "ComboBox", [50004] = "Edit", [50005] = "Hyperlink",
            [50006] = "Image", [50007] = "ListItem", [50008] = "List", [50009] = "Menu", [50010] = "MenuBar", [50011] = "MenuItem",
            [50012] = "ProgressBar", [50013] = "RadioButton", [50014] = "ScrollBar", [50015] = "Slider", [50016] = "Spinner",
            [50017] = "StatusBar", [50018] = "Tab", [50019] = "TabItem", [50020] = "Text", [50021] = "ToolBar", [50022] = "ToolTip",
            [50023] = "Tree", [50024] = "TreeItem", [50025] = "Custom", [50026] = "Group", [50027] = "Thumb", [50028] = "DataGrid",
            [50029] = "DataItem", [50030] = "Document", [50031] = "SplitButton", [50032] = "Window", [50033] = "Pane", [50034] = "Header",
            [50035] = "HeaderItem", [50036] = "Table", [50037] = "TitleBar", [50038] = "Separator"
        };

        static IUIAutomation A;
        static KetQua KQ;
        static int Pid;
        static IntPtr HwndChinh;
        static readonly JsonArray HopThoai = new JsonArray();

        public static void Chay(KetQua kq, YeuCau yc)
        {
            KQ = kq;
            if (!OperatingSystem.IsWindows()) { kq.Dung("he-dieu-hanh", "Tu chup ETABS chi chay tren Windows."); return; }
            // UI Automation chạy trong luồng MTA: các lệnh bấm chạy ở luồng phụ (không chờ hộp thoại modal đóng) dùng chung đối tượng UIA
            Exception loi = null;
            var t = new Thread(() => { try { ChayMta(kq, yc); } catch (Exception ex) { loi = ex; } });
            t.SetApartmentState(ApartmentState.MTA);
            t.Start();
            t.Join();
            if (loi != null) throw loi;
        }

        static void ChayMta(KetQua kq, YeuCau yc)
        {
            JsonObject d = yc.DuLieu ?? new JsonObject();
            try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { /* Windows cũ */ }
            A = new CUIAutomation();
            kq.Dat("hopThoai", HopThoai);

            // 1. Cửa sổ ETABS
            if (!TimEtabs(Chu(d["file"]))) return;
            DuaLenTruoc();
            if (GetForegroundWindow() != HwndChinh)
                kq.GhiBuoc("dua-len-truoc", false, "ETABS chua dung truoc man hinh – anh chup co the dinh cua so khac (dong / thu nho cac cua so che ETABS).");

            // 2. Chuẩn bị: phóng to, một khung nhìn
            if (Bool(d["chuanBi"])) ChuanBi();
            if (Bool(d["thamDo"])) ThamDo();

            // 3. Thao tác
            bool ok = true;
            if (d["thaoTac"] is JsonArray ds)
            {
                int i = 0, boQua = 0;
                foreach (JsonNode n in ds)
                {
                    i++;
                    if (n is not JsonObject tt) continue;
                    string loai = Chu(tt["loai"]);
                    string ten = "thao-tac-" + i + "-" + loai;
                    if (boQua > 0) { boQua--; kq.GhiBuoc(ten, true, "bo qua (khung nhin da dung)"); continue; }
                    string boQuaNeu = Chu(tt["boQuaNeu"]);
                    if (!string.IsNullOrEmpty(boQuaNeu) && TieuDeEtabs().IndexOf(boQuaNeu, StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        boQua = So(tt["boQuaTiep"], 0);
                        kq.GhiBuoc(ten, true, "bo qua: ETABS dang o \"" + boQuaNeu + "\" (" + TieuDeEtabs() + ")");
                        continue;
                    }
                    try
                    {
                        string ct = loai switch
                        {
                            "menu" => MoMenu(Mang(tt["duong"])),
                            "hop-thoai" => HopThoaiDat(tt),
                            "phim" => BamPhim(Chu(tt["phim"])),
                            "doi" => Doi(tt),
                            _ => throw new InvalidOperationException("Khong biet thao tac " + loai)
                        };
                        kq.GhiBuoc(ten, true, ct);
                    }
                    catch (Exception ex0)
                    {
                        Exception ex = Api.GocLoi(ex0);
                        kq.GhiBuoc(ten, false, ex.Message);
                        ok = false;
                        DongCuaSoMoThem();
                        break;
                    }
                }
            }

            // 4. Chụp
            if (Bool(d["chup"]))
            {
                Thread.Sleep(Math.Max(200, So(d["doiTruocChup"], 900)));
                try
                {
                    string file = Path.Combine(Chu(d["thuMucAnh"]) is string tm && tm.Length > 0 ? tm : Path.GetTempPath(),
                                               (Chu(d["tenAnh"]) is string ta && ta.Length > 0 ? ta : "etabs") + ".png");
                    var vung = VungKhungNhin();
                    var (w, h) = ChupVung(vung.x, vung.y, vung.w, vung.h, file);
                    kq.Dat("anh", new JsonObject { ["file"] = file, ["w"] = w, ["h"] = h, ["x"] = vung.x, ["y"] = vung.y, ["nguon"] = vung.nguon });
                    kq.GhiBuoc("chup", true, w + "x" + h + " tu " + vung.nguon);
                }
                catch (Exception ex0)
                {
                    kq.GhiBuoc("chup", false, Api.GocLoi(ex0).Message);
                    ok = false;
                }
            }
            kq.Ok = ok;
            if (!ok) { kq.Goc["buocLoi"] = "tu-chup"; kq.Goc["loi"] = "Co thao tac chua lam duoc – xem nhat ky."; }
        }

        // ---------------- Cửa sổ ETABS ----------------
        static bool TimEtabs(string goiYFile)
        {
            var ds = Process.GetProcesses()
                .Where(p => { try { return p.ProcessName.StartsWith("ETABS", StringComparison.OrdinalIgnoreCase) && p.MainWindowHandle != IntPtr.Zero; } catch { return false; } })
                .ToList();
            KQ.Dat("tienTrinhEtabs", ds.Select(p => p.ProcessName + " #" + p.Id + " \"" + p.MainWindowTitle + "\"").ToArray());
            if (ds.Count == 0) { KQ.Dung("tim-etabs", "Khong thay cua so ETABS dang mo. Mo ETABS va mo hinh da phan tich roi chay lai."); return false; }
            Process chon = null;
            if (!string.IsNullOrEmpty(goiYFile))
            {
                string ten = Path.GetFileNameWithoutExtension(goiYFile);
                chon = ds.FirstOrDefault(p => p.MainWindowTitle.IndexOf(ten, StringComparison.OrdinalIgnoreCase) >= 0);
            }
            chon ??= ds.OrderByDescending(p => p.MainWindowTitle.Length).First();
            Pid = chon.Id;
            HwndChinh = chon.MainWindowHandle;
            KQ.GhiBuoc("tim-etabs", true, chon.ProcessName + " #" + Pid + " \"" + chon.MainWindowTitle + "\"");
            return true;
        }

        static IUIAutomationElement CuaSoChinh() => A.ElementFromHandle(HwndChinh);
        static string TieuDeEtabs() => SafeStr(() => CuaSoChinh().CurrentName) ?? "";

        static void DuaLenTruoc()
        {
            if (IsIconic(HwndChinh)) ShowWindow(HwndChinh, 9);   // SW_RESTORE
            keybd_event(0x12, 0, 0, UIntPtr.Zero); keybd_event(0x12, 0, 2, UIntPtr.Zero);   // Alt: cho phép đổi cửa sổ trước
            SetForegroundWindow(HwndChinh);
            Thread.Sleep(300);
        }

        static void ChuanBi()
        {
            ShowWindow(HwndChinh, 3);   // SW_MAXIMIZE
            Thread.Sleep(500);
            var khung = KhungNhinCon();
            KQ.Dat("khungNhinTruoc", new JsonArray(khung.Select(k => (JsonNode)MoTa(k, false)).ToArray()));
            if (khung.Count > 1)
            {
                try { KQ.GhiBuoc("mot-khung-nhin", true, MoMenu(new[] { "Options", "Windows", "One" })); }
                catch (Exception ex) { KQ.GhiBuoc("mot-khung-nhin", false, Api.GocLoi(ex).Message); DongCuaSoMoThem(); }
                Thread.Sleep(500);
                khung = KhungNhinCon();
            }
            // phóng to khung nhìn còn lại trong cửa sổ chính
            foreach (var k in khung)
            {
                try
                {
                    if (k.GetCurrentPattern(P_Window) is IUIAutomationWindowPattern wp && wp.CurrentCanMaximize != 0)
                    {
                        wp.SetWindowVisualState(WindowVisualState.WindowVisualState_Maximized);
                        KQ.GhiBuoc("phong-to-khung-nhin", true, Ten(k));
                        break;
                    }
                }
                catch (Exception ex) { KQ.GhiBuoc("phong-to-khung-nhin", false, Api.GocLoi(ex).Message); }
            }
            Thread.Sleep(300);
        }

        // Các khung nhìn mô hình (cửa sổ con MDI: "3-D View", "Plan View - …")
        static List<IUIAutomationElement> KhungNhinCon()
        {
            var kq = new List<IUIAutomationElement>();
            var mdi = TimMot(CuaSoChinh(), TreeScope.TreeScope_Descendants, e => Lop(e).IndexOf("MDIClient", StringComparison.OrdinalIgnoreCase) >= 0, 3000);
            if (mdi != null)
            {
                foreach (var c in Con(mdi)) if (c.CurrentIsOffscreen == 0 && DienTich(c) > 0) kq.Add(c);
            }
            return kq;
        }

        // Vùng chụp: phần trong (client) của khung nhìn đang hiện – bỏ thanh tiêu đề, menu, thanh công cụ của ETABS
        static (int x, int y, int w, int h, string nguon) VungKhungNhin()
        {
            var ungVien = new JsonArray();
            (int, int, int, int, string)? chon = null;
            foreach (var k in KhungNhinCon())
            {
                ungVien.Add(MoTa(k, false));
                IntPtr h = k.CurrentNativeWindowHandle;
                if (h != IntPtr.Zero && GetClientRect(h, out RECT r) && r.right - r.left > 100 && r.bottom - r.top > 100)
                {
                    var p = new POINT { x = 0, y = 0 };
                    ClientToScreen(h, ref p);
                    var ung = (p.x, p.y, r.right - r.left, r.bottom - r.top, "khung-nhin: " + Ten(k));
                    if (chon == null || ung.Item3 * ung.Item4 > chon.Value.Item3 * chon.Value.Item4) chon = ung;
                }
            }
            if (chon == null)
            {
                // không có MDI: vùng Pane lớn nhất trong cửa sổ chính
                var goc = CuaSoChinh();
                var rc = goc.CurrentBoundingRectangle;
                double dtGoc = Math.Max(1.0, (double)(rc.right - rc.left) * (rc.bottom - rc.top));
                var ds = TatCa(goc, TreeScope.TreeScope_Descendants, e => { int ct = e.CurrentControlType; return (ct == CT_Pane || ct == CT_Window) && DienTich(e) > 0.25 * dtGoc && DienTich(e) < 0.97 * dtGoc; }, 400);
                foreach (var e in ds) ungVien.Add(MoTa(e, false));
                var lon = ds.OrderBy(e => DienTich(e)).FirstOrDefault();   // nhỏ nhất trong các vùng lớn ≈ khung vẽ
                if (lon != null)
                {
                    var b = lon.CurrentBoundingRectangle;
                    chon = (b.left, b.top, b.right - b.left, b.bottom - b.top, "pane: " + Ten(lon));
                }
            }
            KQ.Dat("ungVienVungChup", ungVien);
            if (chon == null)
            {
                GetClientRect(HwndChinh, out RECT r);
                var p = new POINT();
                ClientToScreen(HwndChinh, ref p);
                chon = (p.x, p.y, r.right - r.left, r.bottom - r.top, "cua-so-chinh");
            }
            return chon.Value;
        }

        // ---------------- Menu ----------------
        static string MoMenu(string[] duong)
        {
            if (duong.Length == 0) throw new InvalidOperationException("Duong menu rong");
            DuaLenTruoc();
            var goc = CuaSoChinh();
            // mục menu cấp 1 trên thanh menu
            var thanh = TatCa(goc, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_MenuBar, 200);
            IUIAutomationElement muc = null;
            foreach (var mb in thanh)
            {
                muc = Khop(TatCa(mb, TreeScope.TreeScope_Children, e => e.CurrentControlType == CT_MenuItem, 100), duong[0]);
                if (muc != null) break;
            }
            if (muc == null)
            {
                var ten = thanh.SelectMany(mb => TatCa(mb, TreeScope.TreeScope_Children, e => e.CurrentControlType == CT_MenuItem, 100)).Select(Ten);
                throw new InvalidOperationException("Khong thay menu \"" + duong[0] + "\". Thanh menu co: " + string.Join(" | ", ten));
            }
            var daQua = new List<string> { Ten(muc) };
            for (int i = 1; i < duong.Length; i++)
            {
                MoRong(muc);
                var tiep = ChoMucMenu(muc, duong[i], 3000, out string coGi);
                if (tiep == null) { BamPhim("ESC"); BamPhim("ESC"); BamPhim("ESC"); throw new InvalidOperationException("Khong thay muc \"" + duong[i] + "\" trong menu " + string.Join(" > ", daQua) + ". Co: " + coGi); }
                muc = tiep;
                daQua.Add(Ten(muc));
            }
            string cho = BamKhongCho(muc);
            Thread.Sleep(400);
            return string.Join(" > ", daQua) + cho;
        }

        static IUIAutomationElement ChoMucMenu(IUIAutomationElement cha, string ten, int ms, out string coGi)
        {
            var dh = Stopwatch.StartNew();
            coGi = "";
            while (true)
            {
                var ds = new List<IUIAutomationElement>();
                ds.AddRange(TatCa(cha, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_MenuItem, 300));
                // menu Win32 (#32768) / menu thả xuống là cửa sổ riêng của tiến trình ETABS
                foreach (var w in TatCa(A.GetRootElement(), TreeScope.TreeScope_Children, e => e.CurrentProcessId == Pid && (e.CurrentControlType == CT_Menu || Lop(e) == "#32768" || Lop(e).IndexOf("DropDown", StringComparison.OrdinalIgnoreCase) >= 0), 50))
                    ds.AddRange(TatCa(w, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_MenuItem, 300));
                var hien = ds.Where(e => { try { return e.CurrentIsOffscreen == 0; } catch { return false; } }).ToList();
                var m = Khop(hien, ten) ?? Khop(ds, ten);
                if (m != null) return m;
                coGi = string.Join(" | ", hien.Select(Ten).Distinct().Take(60));
                if (dh.ElapsedMilliseconds > ms) return null;
                Thread.Sleep(150);
            }
        }

        static void MoRong(IUIAutomationElement e)
        {
            ChayKhongCho(() =>
            {
                if (e.GetCurrentPattern(P_ExpandCollapse) is IUIAutomationExpandCollapsePattern ec)
                {
                    if (ec.CurrentExpandCollapseState != ExpandCollapseState.ExpandCollapseState_Expanded) ec.Expand();
                }
                else Bam(e);
            }, 1500);
            Thread.Sleep(250);
        }

        /// <summary>Bấm ở luồng phụ, chờ tối đa choMs: Invoke của nút / mục menu mở hộp thoại modal có thể không trả về tới khi hộp thoại đóng.</summary>
        static string BamKhongCho(IUIAutomationElement e, int choMs = 1500) =>
            ChayKhongCho(() => Bam(e), choMs) ? "" : " (lenh bam chua tra ve – hop thoai dang mo)";

        static bool ChayKhongCho(Action viec, int choMs)
        {
            Exception loi = null;
            var t = new Thread(() => { try { viec(); } catch (Exception ex) { loi = ex; } }) { IsBackground = true };
            t.SetApartmentState(ApartmentState.MTA);
            t.Start();
            bool xong = t.Join(choMs);
            if (xong && loi != null) throw loi;
            return xong;
        }

        // ---------------- Hộp thoại ----------------
        static string HopThoaiDat(JsonObject tt)
        {
            string tieuDe = Chu(tt["tieuDe"]);
            var hop = ChoHopThoai(tieuDe, 8000);
            if (hop == null) throw new InvalidOperationException("Khong thay hop thoai" + (string.IsNullOrEmpty(tieuDe) ? "" : " \"" + tieuDe + "\"") + " sau khi mo menu.");
            var cay = new JsonObject { ["tieuDe"] = Ten(hop), ["lop"] = Lop(hop), ["cay"] = Cay(hop, 0, 9, new int[] { 0 }) };
            HopThoai.Add(cay);
            var ghi = new List<string> { "hop thoai \"" + Ten(hop) + "\"" };
            // các phương án đặt (thử lần lượt tới khi bấm "xong" mà hộp thoại đóng, ETABS không báo lỗi)
            var dsPa = new List<JsonArray>();
            if (tt["phuongAn"] is JsonArray pa) foreach (JsonNode p in pa) if (p is JsonObject po && po["dat"] is JsonArray d1) dsPa.Add(d1);
            if (dsPa.Count == 0) dsPa.Add(tt["dat"] as JsonArray ?? new JsonArray());
            string xong = Chu(tt["xong"]);
            var thongBao = new JsonArray();
            cay["thongBao"] = thongBao;
            for (int k = 0; k < dsPa.Count; k++)
            {
                if (dsPa.Count > 1) ghi.Add("[phuong an " + (k + 1) + "]");
                SetForegroundWindow(Hwnd(hop));
                foreach (JsonNode n in dsPa[k])
                {
                    if (n is not JsonObject dt) continue;
                    try { ghi.Add(DatMot(hop, dt)); }
                    catch (Exception ex) { ghi.Add("LOI " + dt.ToJsonString() + ": " + Api.GocLoi(ex).Message); cay["loi"] = (cay["loi"]?.ToString() ?? "") + Api.GocLoi(ex).Message + "; "; }
                }
                // trạng thái sau khi đặt (để so trong nhật ký)
                cay[k == 0 ? "sauKhiDat" : "sauKhiDat" + (k + 1)] = Cay(hop, 0, 9, new int[] { 0 });
                if (string.IsNullOrEmpty(xong)) return string.Join("; ", ghi);
                var nut = Khop(TatCa(hop, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_Button, 200), xong);
                if (nut == null) { DongHop(hop); throw new InvalidOperationException("Khong thay nut \"" + xong + "\". " + string.Join("; ", ghi)); }
                BamKhongCho(nut, 800);
                // ETABS tính biểu đồ sau khi bấm OK: đợi hộp thoại đóng, hoặc bắt hộp thông báo lỗi (vd "Nothing is selected!")
                string tb = ChoDongHoacThongBao(hop, 20000, out bool dong);
                if (dong) { ghi.Add("bam " + xong + " – hop thoai da dong"); return string.Join("; ", ghi); }
                if (tb != null) { ghi.Add("ETABS bao: \"" + tb + "\" (da dong thong bao)"); thongBao.Add(tb); continue; }
                ghi.Add("hop thoai chua dong sau 20 s");
                break;
            }
            DongHop(hop);
            throw new InvalidOperationException(string.Join("; ", ghi));
        }

        static IntPtr Hwnd(IUIAutomationElement e) { try { return e.CurrentNativeWindowHandle; } catch { return IntPtr.Zero; } }

        /// <summary>Đợi hộp thoại đóng; nếu ETABS hiện hộp thông báo thì đọc chữ, bấm OK đóng thông báo và trả về chữ đó.</summary>
        static string ChoDongHoacThongBao(IUIAutomationElement hop, int ms, out bool dong)
        {
            var dh = Stopwatch.StartNew();
            dong = false;
            while (dh.ElapsedMilliseconds < ms)
            {
                if (!ConMo(hop)) { dong = true; return null; }
                var ds = new List<IUIAutomationElement>();
                ds.AddRange(TatCa(A.GetRootElement(), TreeScope.TreeScope_Children, e => e.CurrentProcessId == Pid && e.CurrentControlType == CT_Window, 50));
                ds.AddRange(TatCa(hop, TreeScope.TreeScope_Children, e => e.CurrentControlType == CT_Window, 20));
                foreach (var w in ds)
                {
                    if (A.CompareElements(w, hop) != 0 || Hwnd(w) == HwndChinh) continue;
                    var nut = TatCa(w, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_Button, 10);
                    var chu = TatCa(w, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_Text, 20).Select(Ten).Where(x => x.Length > 0).ToList();
                    if (nut.Count == 0 || nut.Count > 4 || chu.Count == 0) continue;   // không phải hộp thông báo
                    string tb = string.Join(" ", chu);
                    var ok = Khop(nut, new[] { "OK", "Yes", "Close" }) ?? nut[0];
                    BamKhongCho(ok, 800);
                    Thread.Sleep(300);
                    if (ConMoPhanTu(w)) BamPhim("ENTER");
                    return tb;
                }
                Thread.Sleep(200);
            }
            return null;
        }

        static bool ConMoPhanTu(IUIAutomationElement e)
        {
            try { var r = e.CurrentBoundingRectangle; return r.right > r.left; } catch { return false; }
        }

        static void DongHop(IUIAutomationElement hop)
        {
            if (!ConMo(hop)) return;
            var huy = Khop(TatCa(hop, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_Button, 100), new[] { "Cancel", "Close" });
            if (huy != null) BamKhongCho(huy, 800); else BamPhim("ESC");
            Thread.Sleep(300);
        }

        static bool ConMo(IUIAutomationElement hop)
        {
            try { var r = hop.CurrentBoundingRectangle; return hop.CurrentProcessId == Pid && r.right > r.left; } catch { return false; }
        }

        static IUIAutomationElement ChoHopThoai(string tieuDe, int ms)
        {
            var dh = Stopwatch.StartNew();
            while (dh.ElapsedMilliseconds < ms)
            {
                var ds = new List<IUIAutomationElement>();
                ds.AddRange(TatCa(A.GetRootElement(), TreeScope.TreeScope_Children, e => e.CurrentProcessId == Pid && e.CurrentControlType == CT_Window && e.CurrentNativeWindowHandle != HwndChinh, 50));
                ds.AddRange(TatCa(CuaSoChinh(), TreeScope.TreeScope_Children, e => e.CurrentControlType == CT_Window && Lop(e).IndexOf("MDI", StringComparison.OrdinalIgnoreCase) < 0 && LaHopThoai(e), 50));
                var hop = string.IsNullOrEmpty(tieuDe) ? ds.FirstOrDefault(LaHopThoai) : (Khop(ds, tieuDe) ?? ds.FirstOrDefault(LaHopThoai));
                if (hop != null) return hop;
                Thread.Sleep(200);
            }
            return null;
        }

        static bool LaHopThoai(IUIAutomationElement e)
        {
            try
            {
                if (e.GetCurrentPattern(P_Window) is IUIAutomationWindowPattern w && w.CurrentIsModal != 0) return true;
                return TatCa(e, TreeScope.TreeScope_Descendants, x => x.CurrentControlType == CT_Button && ChuanTen(Ten(x)) is "ok" or "cancel", 3).Count > 0;
            }
            catch { return false; }
        }

        static string DatMot(IUIAutomationElement hop, JsonObject dt)
        {
            IUIAutomationElement vung = hop;
            string trong = Chu(dt["trong"]);
            if (!string.IsNullOrEmpty(trong))
            {
                vung = Khop(TatCa(hop, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_Group || e.CurrentControlType == CT_Pane, 200), trong) ?? hop;
            }
            if (dt["chon"] != null) return ChonTrongCombo(vung, Mang(dt["chon"]));
            if (dt["radio"] != null)
            {
                var r = Khop(TatCa(vung, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_RadioButton, 300), Mang(dt["radio"]));
                if (r == null) throw new InvalidOperationException("Khong thay nut radio " + string.Join("/", Mang(dt["radio"])) + ". Co: " + DanhSachTen(vung, CT_RadioButton));
                if (r.GetCurrentPattern(P_SelectionItem) is IUIAutomationSelectionItemPattern si) si.Select(); else Bam(r);
                Thread.Sleep(150);
                return "radio \"" + Ten(r) + "\"";
            }
            if (dt["tick"] != null)
            {
                bool muon = dt["gt"] == null || Bool(dt["gt"]);
                var c = Khop(TatCa(vung, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_CheckBox, 300), Mang(dt["tick"]));
                if (c == null) throw new InvalidOperationException("Khong thay o kiem " + string.Join("/", Mang(dt["tick"])) + ". Co: " + DanhSachTen(vung, CT_CheckBox));
                if (c.GetCurrentPattern(P_Toggle) is IUIAutomationTogglePattern tg)
                {
                    for (int i = 0; i < 3 && (tg.CurrentToggleState == ToggleState.ToggleState_On) != muon; i++) { tg.Toggle(); Thread.Sleep(100); }
                }
                else Bam(c);
                return "tick \"" + Ten(c) + "\" = " + muon;
            }
            if (dt["danhSach"] != null)
            {
                Thread.Sleep(300);   // danh sách lọc lại sau khi gõ ô Filter
                var muc = Mang(dt["danhSach"]);
                var item = TatCa(vung, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_ListItem || e.CurrentControlType == CT_DataItem || e.CurrentControlType == CT_TreeItem, 2000);
                var daChon = new List<string>();
                foreach (string m in muc)
                {
                    var it = KhopTenGiaTri(item, m);
                    if (it == null) continue;
                    ChonMuc(it, daChon.Count > 0);
                    daChon.Add(TenGiaTri(it));
                }
                if (daChon.Count == 0 && Bool(dt["dauTien"]) && item.Count > 0) { ChonMuc(item[0], false); daChon.Add("muc dau tien: " + TenGiaTri(item[0])); }
                if (daChon.Count == 0 && Bool(dt["dauTien"]))
                {
                    // danh sách không lộ mục qua UI Automation: đặt tiêu điểm vào khung danh sách, phím Home chọn mục đầu
                    var khung = TatCa(vung, TreeScope.TreeScope_Descendants, e => { int ct = e.CurrentControlType; return ct == CT_List || ct == 50028 || ct == 50036 || ct == CT_Tree; }, 10);
                    if (khung.Count > 0)
                    {
                        try { khung[0].SetFocus(); } catch { /* */ }
                        Thread.Sleep(150); BamPhim("HOME");
                        daChon.Add("phim Home tai " + MoTa(khung[0], false).ToJsonString());
                    }
                }
                if (daChon.Count == 0) throw new InvalidOperationException("Khong thay muc " + string.Join("/", muc) + " trong danh sach. Co: " + string.Join(" | ", item.Select(TenGiaTri).Take(40)));
                return "danh sach: " + string.Join(", ", daChon);
            }
            if (dt["phim"] != null)
            {
                // đặt tiêu điểm vào ô sau nhãn "tu" (vd Filter) rồi bấm lần lượt các phím
                string tai = "";
                if (dt["tu"] != null)
                {
                    var o = TimONhap(vung, Mang(dt["tu"]), out _);
                    if (o == null) throw new InvalidOperationException("Khong thay o " + string.Join("/", Mang(dt["tu"])));
                    try { o.SetFocus(); } catch { /* */ }
                    Thread.Sleep(150);
                    tai = " tai " + Ten(o);
                }
                foreach (string ph in Mang(dt["phim"])) BamPhim(ph);
                return "phim " + string.Join(" ", Mang(dt["phim"])) + tai;
            }
            if (dt["nhap"] != null)
            {
                string gt = Chu(dt["gt"]) ?? "";
                var o = TimONhap(vung, Mang(dt["nhap"]), out var nhan);
                if (o == null || o.GetCurrentPattern(P_Value) is not IUIAutomationValuePattern vp)
                    throw new InvalidOperationException("Khong thay o nhap " + string.Join("/", Mang(dt["nhap"])) + ". Co: " + DanhSachTen(vung, CT_Edit) + " / nhan: " + DanhSachTen(vung, CT_Text));
                if (o.CurrentIsEnabled == 0) Thread.Sleep(300);
                vp.SetValue(gt);
                Thread.Sleep(200);
                return "nhap \"" + Ten(nhan ?? o) + "\" = " + gt + " (doc lai: " + GiaTri(o) + ")";
            }
            throw new InvalidOperationException("Khong hieu yeu cau " + dt.ToJsonString());
        }

        // Ô nhập đứng sau nhãn (Text) có tên khớp, hoặc ô nhập có tên khớp
        static IUIAutomationElement TimONhap(IUIAutomationElement vung, string[] nhanTen, out IUIAutomationElement nhan)
        {
            nhan = Khop(TatCa(vung, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_Text, 300), nhanTen);
            IUIAutomationElement o = null;
            if (nhan != null)
            {
                var w = A.ControlViewWalker;
                for (var s = w.GetNextSiblingElement(nhan); s != null && o == null; s = w.GetNextSiblingElement(s))
                    if (s.CurrentControlType == CT_Edit || s.CurrentControlType == CT_ComboBox) o = s;
            }
            return o ?? Khop(TatCa(vung, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_Edit, 100), nhanTen);
        }

        // Chọn một mục danh sách: bấm chuột vào giữa mục (như người dùng – phát sự kiện chọn của ETABS), rồi kiểm tra / chọn bằng UIA
        static void ChonMuc(IUIAutomationElement it, bool them)
        {
            var si = it.GetCurrentPattern(P_SelectionItem) as IUIAutomationSelectionItemPattern;
            if (them) { if (si != null) si.AddToSelection(); else Bam(it); return; }
            bool daBam = false;
            try
            {
                var r = it.CurrentBoundingRectangle;
                if (it.CurrentIsOffscreen == 0 && r.right - r.left > 2 && r.bottom - r.top > 2)
                {
                    SetCursorPos((r.left + r.right) / 2, (r.top + r.bottom) / 2);
                    mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero); mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero);
                    daBam = true;
                    Thread.Sleep(200);
                }
            }
            catch { /* */ }
            try { if (si != null && si.CurrentIsSelected == 0) si.Select(); } catch { /* */ }
            if (!daBam && si == null) Bam(it);
        }

        static string TenGiaTri(IUIAutomationElement e)
        {
            string ten = Ten(e), gt = GiaTri(e);
            return gt.Length > 0 && gt != ten ? ten + " = " + gt : ten;
        }

        static IUIAutomationElement KhopTenGiaTri(List<IUIAutomationElement> ds, string ten) =>
            Khop(ds, ten) ?? ds.FirstOrDefault(e => ChuanTen(GiaTri(e)) == ChuanTen(ten)) ?? ds.FirstOrDefault(e => ChuanTen(GiaTri(e)).Contains(ChuanTen(ten), StringComparison.Ordinal));

        static string ChonTrongCombo(IUIAutomationElement vung, string[] gt)
        {
            var dsCombo = TatCa(vung, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_ComboBox, 50);
            var coGi = new List<string>();
            foreach (var cb in dsCombo)
            {
                if (cb.CurrentIsEnabled == 0) continue;
                // giá trị đang chọn đúng rồi
                string hienTai = GiaTri(cb);
                if (gt.Any(g => ChuanTen(g) == ChuanTen(hienTai))) return "combo \"" + Ten(cb) + "\" da la " + hienTai;
                var ec = cb.GetCurrentPattern(P_ExpandCollapse) as IUIAutomationExpandCollapsePattern;
                try { ec?.Expand(); } catch { /* */ }
                Thread.Sleep(250);
                var muc = TatCa(cb, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_ListItem, 3000);
                if (muc.Count == 0)   // danh sách thả xuống là cửa sổ riêng
                    foreach (var w in TatCa(A.GetRootElement(), TreeScope.TreeScope_Children, e => e.CurrentProcessId == Pid && (Lop(e).IndexOf("ComboLBox", StringComparison.OrdinalIgnoreCase) >= 0 || e.CurrentControlType == CT_List), 20))
                        muc.AddRange(TatCa(w, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_ListItem, 3000));
                var it = Khop(muc, gt, chiDung: true);
                coGi.Add("\"" + Ten(cb) + "\"[" + hienTai + "]: " + string.Join(", ", muc.Select(Ten).Take(15)) + (muc.Count > 15 ? "…" : ""));
                if (it != null)
                {
                    if (it.GetCurrentPattern(P_SelectionItem) is IUIAutomationSelectionItemPattern si) si.Select(); else Bam(it);
                    Thread.Sleep(150);
                    try { if (ec != null && ec.CurrentExpandCollapseState == ExpandCollapseState.ExpandCollapseState_Expanded) ec.Collapse(); } catch { /* */ }
                    Thread.Sleep(150);
                    string sau = GiaTri(cb);
                    if (ChuanTen(sau) != ChuanTen(Ten(it)) && cb.GetCurrentPattern(P_Value) is IUIAutomationValuePattern vp && vp.CurrentIsReadOnly == 0)
                    {
                        vp.SetValue(Ten(it));
                        sau = GiaTri(cb);
                    }
                    return "combo \"" + Ten(cb) + "\" = " + Ten(it) + " (doc lai: " + sau + ")";
                }
                try { if (ec != null && ec.CurrentExpandCollapseState == ExpandCollapseState.ExpandCollapseState_Expanded) ec.Collapse(); } catch { /* */ }
            }
            throw new InvalidOperationException("Khong o chon nao co muc " + string.Join("/", gt) + ". " + string.Join(" || ", coGi));
        }

        static string GiaTri(IUIAutomationElement e)
        {
            try { if (e.GetCurrentPattern(P_Value) is IUIAutomationValuePattern vp) return vp.CurrentValue ?? ""; } catch { /* */ }
            try { if (e.GetCurrentPattern(P_Legacy) is IUIAutomationLegacyIAccessiblePattern lg) return lg.CurrentValue ?? ""; } catch { /* */ }
            return "";
        }

        static void DongCuaSoMoThem()
        {
            for (int i = 0; i < 3; i++)
            {
                var hop = ChoHopThoai(null, 300);
                if (hop == null) break;
                var huy = Khop(TatCa(hop, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_Button, 100), new[] { "Cancel", "Close" });
                if (huy != null) BamKhongCho(huy, 800); else BamPhim("ESC");
                Thread.Sleep(300);
            }
        }

        // ---------------- Thăm dò giao diện (nhật ký) ----------------
        static void ThamDo()
        {
            var goc = CuaSoChinh();
            KQ.Dat("cuaSoChinh", Cay(goc, 0, 4, new int[] { 0 }, boQua: CT_ToolBar));
            var menu = new JsonArray();
            foreach (var ten in new[] { "File", "View", "Display", "Options" })
            {
                var nut = new JsonObject { ["ten"] = ten };
                try
                {
                    DuaLenTruoc();
                    var thanh = TatCa(goc, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_MenuBar, 200);
                    var muc = thanh.Select(mb => Khop(TatCa(mb, TreeScope.TreeScope_Children, e => e.CurrentControlType == CT_MenuItem, 100), ten)).FirstOrDefault(x => x != null);
                    if (muc == null) { nut["loi"] = "khong thay"; menu.Add(nut); continue; }
                    MoRong(muc);
                    Thread.Sleep(300);
                    var con = new JsonArray();
                    ChoMucMenu(muc, "\u0001khong-co", 400, out _);   // chỉ để danh sách hiện ra
                    var dsMuc = MucMenuDangHien(muc);
                    foreach (var m in dsMuc)
                    {
                        var j = new JsonObject { ["ten"] = Ten(m), ["phim"] = SafeStr(() => m.CurrentAcceleratorKey) };
                        if (ten == "Display" || ten == "View" || ten == "Options")
                        {
                            if (m.GetCurrentPattern(P_ExpandCollapse) is IUIAutomationExpandCollapsePattern ec && ec.CurrentExpandCollapseState != ExpandCollapseState.ExpandCollapseState_LeafNode)
                            {
                                try
                                {
                                    ec.Expand(); Thread.Sleep(350);
                                    j["con"] = new JsonArray(MucMenuDangHien(m).Where(x => !dsMuc.Any(y => A.CompareElements(x, y) != 0)).Select(x => (JsonNode)JsonValue.Create(Ten(x))).ToArray());
                                    ec.Collapse(); Thread.Sleep(150);
                                }
                                catch (Exception ex) { j["loi"] = Api.GocLoi(ex).Message; }
                            }
                        }
                        con.Add(j);
                    }
                    nut["muc"] = con;
                }
                catch (Exception ex) { nut["loi"] = Api.GocLoi(ex).Message; }
                BamPhim("ESC"); BamPhim("ESC"); BamPhim("ESC");
                Thread.Sleep(200);
                menu.Add(nut);
            }
            KQ.Dat("menu", menu);
        }

        static List<IUIAutomationElement> MucMenuDangHien(IUIAutomationElement cha)
        {
            var ds = new List<IUIAutomationElement>();
            ds.AddRange(TatCa(cha, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_MenuItem, 300));
            foreach (var w in TatCa(A.GetRootElement(), TreeScope.TreeScope_Children, e => e.CurrentProcessId == Pid && (e.CurrentControlType == CT_Menu || Lop(e) == "#32768"), 50))
                ds.AddRange(TatCa(w, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == CT_MenuItem, 300));
            return ds.Where(e => { try { return e.CurrentIsOffscreen == 0; } catch { return false; } }).ToList();
        }

        static JsonObject Cay(IUIAutomationElement e, int sau, int toiDa, int[] dem, int boQua = -1)
        {
            var j = MoTa(e, true);
            if (sau >= toiDa || dem[0] > 600) return j;
            var con = new JsonArray();
            foreach (var c in Con(e))
            {
                if (++dem[0] > 600) break;
                int ct = SafeInt(() => c.CurrentControlType);
                if (ct == boQua) { con.Add(new JsonObject { ["kieu"] = TEN_KIEU.TryGetValue(ct, out var tk) ? tk : ct.ToString(), ["ten"] = Ten(c), ["boQua"] = true }); continue; }
                con.Add(Cay(c, sau + 1, toiDa, dem, boQua));
            }
            if (con.Count > 0) j["con"] = con;
            return j;
        }

        static JsonObject MoTa(IUIAutomationElement e, bool chiTiet)
        {
            var j = new JsonObject();
            int ct = SafeInt(() => e.CurrentControlType);
            j["kieu"] = TEN_KIEU.TryGetValue(ct, out var tk) ? tk : ct.ToString();
            j["ten"] = Ten(e);
            string id = SafeStr(() => e.CurrentAutomationId); if (!string.IsNullOrEmpty(id)) j["id"] = id;
            string lop = Lop(e); if (!string.IsNullOrEmpty(lop)) j["lop"] = lop;
            try { var r = e.CurrentBoundingRectangle; j["r"] = new JsonArray(r.left, r.top, r.right - r.left, r.bottom - r.top); } catch { /* */ }
            if (chiTiet)
            {
                if (SafeInt(() => e.CurrentIsEnabled) == 0) j["tat"] = true;
                if (ct == CT_ComboBox || ct == CT_Edit) j["gt"] = GiaTri(e);
                if (ct == CT_CheckBox && e.GetCurrentPattern(P_Toggle) is IUIAutomationTogglePattern tg) j["chon"] = tg.CurrentToggleState == ToggleState.ToggleState_On;
                if ((ct == CT_RadioButton || ct == CT_ListItem) && e.GetCurrentPattern(P_SelectionItem) is IUIAutomationSelectionItemPattern si) j["chon"] = si.CurrentIsSelected != 0;
            }
            return j;
        }

        // ---------------- Bấm, phím ----------------
        static void Bam(IUIAutomationElement e)
        {
            try { if (e.GetCurrentPattern(P_Invoke) is IUIAutomationInvokePattern ip) { ip.Invoke(); return; } } catch { /* thử cách khác */ }
            try { if (e.GetCurrentPattern(P_Legacy) is IUIAutomationLegacyIAccessiblePattern lg) { lg.DoDefaultAction(); return; } } catch { /* */ }
            // chuột: bấm vào giữa
            var r = e.CurrentBoundingRectangle;
            SetCursorPos((r.left + r.right) / 2, (r.top + r.bottom) / 2);
            mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero); mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero);
        }

        static string BamPhim(string phim)
        {
            byte vk = (phim ?? "").ToUpperInvariant() switch
            {
                "ESC" => 0x1B, "ENTER" => 0x0D, "TAB" => 0x09, "SPACE" => 0x20, "HOME" => 0x24, "END" => 0x23,
                "LEFT" => 0x25, "UP" => 0x26, "RIGHT" => 0x27, "DOWN" => 0x28,
                "F1" => 0x70, "F2" => 0x71, "F3" => 0x72, "F4" => 0x73, "F5" => 0x74, "F6" => 0x75, "F7" => 0x76, "F8" => 0x77,
                "F9" => 0x78, "F10" => 0x79, "F11" => 0x7A, "F12" => 0x7B,
                _ => throw new InvalidOperationException("Phim chua ho tro: " + phim)
            };
            keybd_event(vk, 0, 0, UIntPtr.Zero); keybd_event(vk, 0, 2, UIntPtr.Zero);
            Thread.Sleep(120);
            return "phim " + phim;
        }

        static string Doi(JsonObject tt) { int ms = Math.Min(30000, So(tt["ms"], 500)); Thread.Sleep(ms); return "doi " + ms + " ms"; }

        // ---------------- Chụp màn hình (GDI) → PNG ----------------
        static (int, int) ChupVung(int x, int y, int w, int h, string file)
        {
            if (w <= 0 || h <= 0) throw new InvalidOperationException("Vung chup rong");
            IntPtr man = GetDC(IntPtr.Zero), dc = CreateCompatibleDC(man), bmp = CreateCompatibleBitmap(man, w, h);
            try
            {
                IntPtr cu = SelectObject(dc, bmp);
                if (!BitBlt(dc, 0, 0, w, h, man, x, y, 0x00CC0020 | 0x40000000)) throw new InvalidOperationException("BitBlt loi " + Marshal.GetLastWin32Error());
                SelectObject(dc, cu);
                var bi = new BITMAPINFOHEADER { biSize = 40, biWidth = w, biHeight = -h, biPlanes = 1, biBitCount = 32, biCompression = 0 };
                var bgra = new byte[w * h * 4];
                if (GetDIBits(dc, bmp, 0, (uint)h, bgra, ref bi, 0) == 0) throw new InvalidOperationException("GetDIBits loi");
                Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(file)));
                File.WriteAllBytes(file, Png(bgra, w, h));
                return (w, h);
            }
            finally { DeleteObject(bmp); DeleteDC(dc); ReleaseDC(IntPtr.Zero, man); }
        }

        internal static byte[] Png(byte[] bgra, int w, int h)
        {
            var tho = new byte[(w * 3 + 1) * h];
            for (int y = 0, k = 0; y < h; y++)
            {
                tho[k++] = 0;
                for (int x = 0; x < w; x++) { int i = (y * w + x) * 4; tho[k++] = bgra[i + 2]; tho[k++] = bgra[i + 1]; tho[k++] = bgra[i]; }
            }
            byte[] nen;
            using (var ms = new MemoryStream())
            {
                using (var z = new ZLibStream(ms, CompressionLevel.Optimal, true)) z.Write(tho, 0, tho.Length);
                nen = ms.ToArray();
            }
            using var ra = new MemoryStream();
            ra.Write(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
            var ihdr = new byte[13];
            GhiBE(ihdr, 0, w); GhiBE(ihdr, 4, h); ihdr[8] = 8; ihdr[9] = 2;   // 8 bit, RGB
            Khoi(ra, "IHDR", ihdr); Khoi(ra, "IDAT", nen); Khoi(ra, "IEND", Array.Empty<byte>());
            return ra.ToArray();
        }
        static void GhiBE(byte[] b, int o, int v) { b[o] = (byte)(v >> 24); b[o + 1] = (byte)(v >> 16); b[o + 2] = (byte)(v >> 8); b[o + 3] = (byte)v; }
        static void Khoi(Stream s, string loai, byte[] dl)
        {
            var dai = new byte[4]; GhiBE(dai, 0, dl.Length); s.Write(dai);
            var t = Encoding.ASCII.GetBytes(loai); s.Write(t); s.Write(dl);
            uint c = Crc(Crc(0xFFFFFFFF, t), dl) ^ 0xFFFFFFFF;
            var cb = new byte[4]; GhiBE(cb, 0, unchecked((int)c)); s.Write(cb);
        }
        static uint[] BANG_CRC;
        static uint Crc(uint c, byte[] b)
        {
            if (BANG_CRC == null)
            {
                BANG_CRC = new uint[256];
                for (uint n = 0; n < 256; n++) { uint v = n; for (int k = 0; k < 8; k++) v = (v & 1) != 0 ? 0xEDB88320 ^ (v >> 1) : v >> 1; BANG_CRC[n] = v; }
            }
            foreach (byte x in b) c = BANG_CRC[(c ^ x) & 0xFF] ^ (c >> 8);
            return c;
        }

        // ---------------- Tiện ích UIA ----------------
        static List<IUIAutomationElement> Con(IUIAutomationElement e)
        {
            var ds = new List<IUIAutomationElement>();
            var w = A.ControlViewWalker;
            try { for (var c = w.GetFirstChildElement(e); c != null; c = w.GetNextSiblingElement(c)) ds.Add(c); } catch { /* */ }
            return ds;
        }

        static List<IUIAutomationElement> TatCa(IUIAutomationElement goc, TreeScope pham, Func<IUIAutomationElement, bool> loc, int toiDa)
        {
            var kq = new List<IUIAutomationElement>();
            if (goc == null) return kq;
            IUIAutomationElementArray ds;
            try { ds = goc.FindAll(pham, A.CreateTrueCondition()); } catch { return kq; }
            int n = ds?.Length ?? 0;
            for (int i = 0; i < n && kq.Count < toiDa; i++)
            {
                var e = ds.GetElement(i);
                try { if (loc(e)) kq.Add(e); } catch { /* phần tử vừa mất */ }
            }
            return kq;
        }

        static IUIAutomationElement TimMot(IUIAutomationElement goc, TreeScope pham, Func<IUIAutomationElement, bool> loc, int toiDa) =>
            TatCa(goc, pham, loc, 1).FirstOrDefault();

        static string Ten(IUIAutomationElement e) => SafeStr(() => e.CurrentName) ?? "";
        static string Lop(IUIAutomationElement e) => SafeStr(() => e.CurrentClassName) ?? "";
        static double DienTich(IUIAutomationElement e)
        {
            try { var r = e.CurrentBoundingRectangle; return Math.Max(0, r.right - r.left) * (double)Math.Max(0, r.bottom - r.top); } catch { return 0; }
        }
        static string DanhSachTen(IUIAutomationElement goc, int kieu) => string.Join(" | ", TatCa(goc, TreeScope.TreeScope_Descendants, e => e.CurrentControlType == kieu, 60).Select(Ten));

        /// <summary>Chuẩn hoá tên để so: bỏ "&", "...", phím tắt sau Tab, khoảng trắng thừa, chữ thường.</summary>
        internal static string ChuanTen(string s)
        {
            if (s == null) return "";
            int tab = s.IndexOf('\t');
            if (tab >= 0) s = s.Substring(0, tab);
            s = s.Replace("&", "").Replace("...", "").Replace("…", "");
            var sb = new StringBuilder();
            bool trang = false;
            foreach (char c in s.Trim().ToLowerInvariant())
            {
                if (char.IsWhiteSpace(c)) { if (!trang) sb.Append(' '); trang = true; }
                else { sb.Append(c); trang = false; }
            }
            return sb.ToString().Trim();
        }

        static IUIAutomationElement Khop(IEnumerable<IUIAutomationElement> ds, string ten) => Khop(ds, new[] { ten });
        static IUIAutomationElement Khop(IEnumerable<IUIAutomationElement> ds, string[] ten, bool chiDung = false)
        {
            var list = ds.ToList();
            var tenDs = list.Select(e => ChuanTen(Ten(e))).ToList();
            foreach (string t0 in ten)
            {
                string t = ChuanTen(t0);
                if (t.Length == 0) continue;
                int i = tenDs.FindIndex(x => x == t);
                if (i >= 0) return list[i];
            }
            if (chiDung) return null;
            foreach (string t0 in ten)
            {
                string t = ChuanTen(t0);
                if (t.Length == 0) continue;
                int i = tenDs.FindIndex(x => x.StartsWith(t, StringComparison.Ordinal));
                if (i < 0) i = tenDs.FindIndex(x => x.Contains(t, StringComparison.Ordinal));
                if (i >= 0) return list[i];
            }
            return null;
        }

        static string SafeStr(Func<string> f) { try { return f(); } catch { return null; } }
        static int SafeInt(Func<int> f) { try { return f(); } catch { return 0; } }
        static string Chu(JsonNode n) { try { return n?.GetValue<string>(); } catch { return n?.ToString(); } }
        static bool Bool(JsonNode n) { try { return n != null && n.GetValue<bool>(); } catch { return false; } }
        static int So(JsonNode n, int macDinh) { try { return n == null ? macDinh : (int)n.GetValue<double>(); } catch { return macDinh; } }
        static string[] Mang(JsonNode n) => n is JsonArray a ? a.Select(Chu).Where(x => x != null).ToArray() : n == null ? Array.Empty<string>() : new[] { Chu(n) };

        // ---------------- Win32 ----------------
        [StructLayout(LayoutKind.Sequential)] struct RECT { public int left, top, right, bottom; }
        [StructLayout(LayoutKind.Sequential)] struct POINT { public int x, y; }
        [StructLayout(LayoutKind.Sequential)]
        struct BITMAPINFOHEADER
        {
            public uint biSize; public int biWidth, biHeight; public ushort biPlanes, biBitCount; public uint biCompression, biSizeImage;
            public int biXPelsPerMeter, biYPelsPerMeter; public uint biClrUsed, biClrImportant, mauDuPhong0, mauDuPhong1, mauDuPhong2;
        }
        [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr v);
        [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
        [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
        [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
        [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
        [DllImport("user32.dll")] static extern void mouse_event(uint flags, int dx, int dy, uint data, UIntPtr extra);
        [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
        [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr h, out RECT r);
        [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr h, ref POINT p);
        [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr h);
        [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr h, IntPtr dc);
        [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleDC(IntPtr dc);
        [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleBitmap(IntPtr dc, int w, int h);
        [DllImport("gdi32.dll")] static extern IntPtr SelectObject(IntPtr dc, IntPtr o);
        [DllImport("gdi32.dll", SetLastError = true)] static extern bool BitBlt(IntPtr dst, int x, int y, int w, int h, IntPtr src, int sx, int sy, uint rop);
        [DllImport("gdi32.dll")] static extern int GetDIBits(IntPtr dc, IntPtr bmp, uint start, uint lines, [Out] byte[] bits, ref BITMAPINFOHEADER bi, uint usage);
        [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr o);
        [DllImport("gdi32.dll")] static extern bool DeleteDC(IntPtr dc);
    }
}
