// Gọi hàm/thuộc tính của các giao diện ETABSv1 (cHelper, cOAPI, cSapModel, …) qua reflection.
// Không tham chiếu ETABSv1.dll lúc biên dịch: nạp đúng thư viện của bản ETABS đang cài lúc chạy.
using System;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Runtime.ExceptionServices;

namespace MctEtabs
{
    internal static class Api
    {
        /// <summary>Lỗi gốc bên trong các lớp bọc của reflection.</summary>
        public static Exception GocLoi(Exception ex)
        {
            while ((ex is TargetInvocationException || ex is AggregateException) && ex.InnerException != null) ex = ex.InnerException;
            return ex;
        }

        public static object Lay(object doiTuong, Type giaoDien, string ten)
        {
            if (doiTuong == null) throw new InvalidOperationException("Doi tuong rong khi lay " + giaoDien.Name + "." + ten);
            PropertyInfo p = giaoDien.GetProperty(ten) ?? giaoDien.GetInterfaces().Select(i => i.GetProperty(ten)).FirstOrDefault(x => x != null);
            if (p == null) throw new MissingMemberException(giaoDien.FullName, ten);
            try { return p.GetValue(doiTuong); }
            catch (TargetInvocationException ex) { ExceptionDispatchInfo.Capture(GocLoi(ex)).Throw(); throw; }
        }

        /// <summary>Gọi hàm; tham số ref/out được ghi lại vào mảng thamSo sau khi gọi.</summary>
        public static object Goi(object doiTuong, Type giaoDien, string ten, object[] thamSo)
        {
            if (doiTuong == null) throw new InvalidOperationException("Doi tuong rong khi goi " + giaoDien.Name + "." + ten);
            thamSo ??= Array.Empty<object>();
            MethodInfo ham = TimHam(giaoDien, ten, thamSo.Length);
            ParameterInfo[] ps = ham.GetParameters();
            object[] b = thamSo;
            if (ps.Length > thamSo.Length)
            {
                b = new object[ps.Length];
                Array.Copy(thamSo, b, thamSo.Length);
                for (int i = thamSo.Length; i < ps.Length; i++)
                {
                    if (!ps[i].IsOptional) throw new ArgumentException("Thieu tham so " + ps[i].Name + " cua ham " + giaoDien.Name + "." + ten);
                    b[i] = ps[i].HasDefaultValue ? ps[i].DefaultValue : Type.Missing;
                }
            }
            for (int i = 0; i < b.Length; i++) b[i] = ChuyenKieu(b[i], ps[i].ParameterType);
            try
            {
                object kq = ham.Invoke(doiTuong, b);
                if (!ReferenceEquals(b, thamSo)) Array.Copy(b, thamSo, thamSo.Length);
                return kq;
            }
            catch (TargetInvocationException ex) { ExceptionDispatchInfo.Capture(GocLoi(ex)).Throw(); throw; }
        }

        static MethodInfo TimHam(Type giaoDien, string ten, int soThamSo)
        {
            var tatCa = giaoDien.GetMethods().Concat(giaoDien.GetInterfaces().SelectMany(i => i.GetMethods()))
                .Where(m => m.Name == ten).ToList();
            if (tatCa.Count == 0) throw new MissingMethodException(giaoDien.FullName, ten);
            return tatCa.FirstOrDefault(m => m.GetParameters().Length == soThamSo)
                ?? tatCa.Where(m => m.GetParameters().Length > soThamSo)
                        .OrderBy(m => m.GetParameters().Length)
                        .FirstOrDefault(m => m.GetParameters().Skip(soThamSo).All(p => p.IsOptional))
                ?? throw new MissingMethodException(giaoDien.FullName + "." + ten + " voi " + soThamSo + " tham so");
        }

        /// <summary>Đưa giá trị về đúng kiểu tham số (ví dụ số nguyên → double, chuỗi → enum).</summary>
        public static object ChuyenKieu(object v, Type kieu)
        {
            if (kieu.IsByRef) kieu = kieu.GetElementType();
            if (v == null || v == Type.Missing || kieu == null || kieu.IsInstanceOfType(v)) return v;
            if (kieu.IsEnum)
            {
                if (v is string s) return Enum.Parse(kieu, s, true);
                return Enum.ToObject(kieu, Convert.ToInt64(v, CultureInfo.InvariantCulture));
            }
            if (kieu.IsArray && v is Array mang)
            {
                Type kieuPhanTu = kieu.GetElementType();
                Array moi = Array.CreateInstance(kieuPhanTu, mang.Length);
                for (int i = 0; i < mang.Length; i++) moi.SetValue(ChuyenKieu(mang.GetValue(i), kieuPhanTu), i);
                return moi;
            }
            if (v is IConvertible && (kieu.IsPrimitive || kieu == typeof(string) || kieu == typeof(decimal)))
                return Convert.ChangeType(v, kieu, CultureInfo.InvariantCulture);
            return v;
        }
    }
}
