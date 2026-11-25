// Kết quả trả về app (JSON): ok, lenh, buoc[], thuHam[], thongTin{}, loi, buocLoi, goiY
using System;
using System.Collections;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MctEtabs
{
    internal sealed class KetQua
    {
        public readonly JsonObject Goc = new JsonObject();
        public readonly JsonArray Buoc = new JsonArray();
        public readonly JsonArray ThuHam = new JsonArray();
        public readonly JsonObject ThongTin = new JsonObject();

        public KetQua(string lenh)
        {
            Goc["ok"] = false;
            Goc["lenh"] = lenh;
            Goc["cauNoi"] = "MctEtabs " + typeof(KetQua).Assembly.GetName().Version + " / .NET " + Environment.Version;
            Goc["buoc"] = Buoc;
            Goc["thuHam"] = ThuHam;
            Goc["thongTin"] = ThongTin;
            Goc["loi"] = null;
            Goc["buocLoi"] = null;
            Goc["goiY"] = null;
        }

        public bool Ok { get => Goc["ok"].GetValue<bool>(); set => Goc["ok"] = value; }
        public string GoiY { get => Goc["goiY"]?.GetValue<string>(); set => Goc["goiY"] = value; }

        public void GhiBuoc(string ten, bool ok, string chiTiet)
        {
            Buoc.Add(new JsonObject { ["ten"] = ten, ["ok"] = ok, ["chiTiet"] = chiTiet });
        }

        /// <summary>Dừng lệnh với lỗi ở bước "buoc" (ghi luôn dòng bước nếu chưa có).</summary>
        public void Dung(string buoc, string loi, string goiY = null)
        {
            if (!Buoc.Any(b => (string)b["ten"] == buoc && !(bool)b["ok"])) GhiBuoc(buoc, false, loi);
            Ok = false;
            Goc["buocLoi"] = buoc;
            Goc["loi"] = loi;
            if (goiY != null && GoiY == null) GoiY = goiY;
        }

        public void Dat(string khoa, object giaTri) => ThongTin[khoa] = ThanhNut(giaTri);

        /// <summary>Thêm một gợi ý phụ (ngoài gợi ý chính) – app hiện tất cả.</summary>
        public void ThemGoiY(string ma)
        {
            if (ma == null || ma == GoiY) return;
            if (Goc["goiYThem"] is not JsonArray ds) { ds = new JsonArray(); Goc["goiYThem"] = ds; }
            if (!ds.Any(x => (string)x == ma)) ds.Add(ma);
        }

        /// <summary>Chạy thử một lệnh API: ghi kết quả hoặc lỗi (loại, thông báo, HRESULT); lỗi thì trả null.</summary>
        public object Thu(string ten, Func<object> viec)
        {
            try
            {
                object gt = viec();
                if (gt == null)
                {
                    ThuHam.Add(new JsonObject { ["ten"] = ten, ["ok"] = false, ["loi"] = "tra ve rong (null)" });
                    return null;
                }
                ThuHam.Add(new JsonObject { ["ten"] = ten, ["ok"] = true, ["ketQua"] = HienThi(gt) });
                return gt;
            }
            catch (Exception ex0)
            {
                Exception ex = Api.GocLoi(ex0);
                ThuHam.Add(new JsonObject
                {
                    ["ten"] = ten, ["ok"] = false,
                    ["loi"] = ex.GetType().FullName + ": " + ex.Message,
                    ["hresult"] = "0x" + ex.HResult.ToString("X8", CultureInfo.InvariantCulture)
                });
                return null;
            }
        }

        public static string HienThi(object v)
        {
            if (v == null) return "";
            if (v is string s) return s;
            if (v is IEnumerable ds) return string.Join(", ", ds.Cast<object>().Select(x => Convert.ToString(x, CultureInfo.InvariantCulture)));
            return Convert.ToString(v, CultureInfo.InvariantCulture);
        }

        public static JsonNode ThanhNut(object v)
        {
            switch (v)
            {
                case null: return null;
                case JsonNode n: return n;
                case string s: return JsonValue.Create(s);
                case bool b: return JsonValue.Create(b);
                case int i: return JsonValue.Create(i);
                case long l: return JsonValue.Create(l);
                case double d: return double.IsFinite(d) ? JsonValue.Create(d) : null;
                case float f: return JsonValue.Create((double)f);
                case Enum e: return JsonValue.Create(e.ToString());
                case IEnumerable ds:
                    var mang = new JsonArray();
                    foreach (object x in ds) mang.Add(ThanhNut(x));
                    return mang;
                default: return JsonValue.Create(Convert.ToString(v, CultureInfo.InvariantCulture));
            }
        }

        public string ThanhJson() => Goc.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = false,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        });
    }
}
