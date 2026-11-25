// Cầu nối app Móng cẩu tháp ↔ ETABS v22/v23 qua thư viện API ETABSv1.dll.
// Chạy trên .NET 8: ETABS 22+ đã cài sẵn .NET 8 Desktop Runtime, và thư viện API của ETABS 22+
// khi nạp trong .NET Framework (PowerShell 5.1) trả về đối tượng rỗng – gọi hàm nào cũng NullReferenceException.
//
// App (MongCauThap.exe) gọi:  dotnet MctEtabs.dll --yeu-cau <vao.json> --ket-qua <ra.json>
// Chạy tay (in ra màn hình):  dotnet MctEtabs.dll --lenh kiem-tra [--etabs "C:\Program Files\Computers and Structures\ETABS 23"]
// Thử nghiệm không có ETABS:  dotnet MctEtabs.dll --thu-nghiem --etabs <thư mục ETABSv1.dll giả lập> [--pid-gia-lap 1234]
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Linq;
using System.Text.Json.Nodes;

namespace MctEtabs
{
    internal sealed class YeuCau
    {
        public string Lenh = "kiem-tra";
        public string DuongDanEtabs = "";
        public bool ThuNghiem;
        public readonly List<int> PidGiaLap = new List<int>();
        public JsonObject DuLieu;
    }

    internal static class Program
    {
        [STAThread]
        private static int Main(string[] args)
        {
            string fileVao = null, fileRa = null;
            var yc = new YeuCau();
            for (int i = 0; i < args.Length; i++)
            {
                string tiep = i + 1 < args.Length ? args[i + 1] : "";
                switch (args[i])
                {
                    case "--yeu-cau": fileVao = tiep; i++; break;
                    case "--ket-qua": fileRa = tiep; i++; break;
                    case "--lenh": yc.Lenh = tiep; i++; break;
                    case "--etabs": yc.DuongDanEtabs = tiep; i++; break;
                    case "--thu-nghiem": yc.ThuNghiem = true; break;
                    case "--pid-gia-lap": if (int.TryParse(tiep, out int pid)) yc.PidGiaLap.Add(pid); i++; break;
                }
            }

            KetQua kq;
            try
            {
                if (fileVao != null) DocYeuCau(fileVao, yc);
                kq = new KetQua(yc.Lenh);
            }
            catch (Exception ex)
            {
                kq = new KetQua(yc.Lenh);
                kq.Dung("doc-yeu-cau", "Khong doc duoc yeu cau: " + Api.GocLoi(ex).Message);
                return Xuat(kq, fileRa);
            }

            try
            {
                switch (yc.Lenh)
                {
                    case "kiem-tra": LenhKiemTra.Chay(kq, yc); break;
                    case "dang-ky-giao-dien": LenhDangKy.Chay(kq, yc, false); break;
                    case "go-dang-ky-giao-dien": LenhDangKy.Chay(kq, yc, true); break;
                    default: kq.Dung("doc-yeu-cau", "Lenh chua ho tro: " + yc.Lenh); break;
                }
            }
            catch (Exception ex0)
            {
                Exception ex = Api.GocLoi(ex0);
                kq.Dung((string)kq.Goc["buocLoi"] ?? "loi-chung", ex.GetType().Name + ": " + ex.Message);
                kq.Goc["chiTietLoi"] = ex.ToString();
            }
            return Xuat(kq, fileRa);
        }

        static void DocYeuCau(string file, YeuCau yc)
        {
            if (JsonNode.Parse(File.ReadAllText(file, Encoding.UTF8)) is not JsonObject vao) return;
            if (vao["lenh"] is JsonValue lenh) yc.Lenh = lenh.GetValue<string>();
            if (vao["duongDanEtabs"] is JsonValue duong) yc.DuongDanEtabs = duong.GetValue<string>() ?? "";
            if (vao["thuNghiem"] is JsonValue thu && thu.TryGetValue(out bool b)) yc.ThuNghiem = b;
            if (vao["pidGiaLap"] is JsonArray ds) foreach (JsonNode n in ds) if (n is JsonValue v && v.TryGetValue(out int p)) yc.PidGiaLap.Add(p);
            yc.DuLieu = vao["duLieu"] as JsonObject;
        }

        static int Xuat(KetQua kq, string fileRa)
        {
            if (fileRa != null)
            {
                File.WriteAllText(fileRa, kq.ThanhJson(), new UTF8Encoding(false));
            }
            else
            {
                Console.OutputEncoding = new UTF8Encoding(false);
                foreach (JsonNode b in kq.Buoc) Console.WriteLine(((bool)b["ok"] ? "[OK]  " : "[LOI] ") + b["ten"] + ": " + b["chiTiet"]);
                foreach (JsonNode h in kq.ThuHam)
                    Console.WriteLine("   " + ((bool)h["ok"] ? "[OK]  " + h["ten"] + " = " + h["ketQua"] : "[LOI] " + h["ten"] + ": " + h["loi"] + " " + h["hresult"]));
                foreach (var cap in kq.ThongTin) Console.WriteLine("   " + cap.Key + " = " + KetQua.HienThi(cap.Value is JsonArray a ? (object)a.Select(x => x?.ToString()) : cap.Value?.ToString()));
                Console.WriteLine(kq.Ok ? "KET QUA: KET NOI THANH CONG" : "KET QUA: LOI - " + kq.Goc["loi"] + (kq.GoiY != null ? " (goi y: " + kq.GoiY + ")" : ""));
            }
            return kq.Ok ? 0 : 1;
        }
    }
}
