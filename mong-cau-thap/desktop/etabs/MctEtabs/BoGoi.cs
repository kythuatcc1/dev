// Hai cách gọi API ETABS:
//  - GoiQuaGiaoDien: qua các giao diện .NET của ETABSv1.dll (cách chuẩn, dùng với Helper.GetObject)
//  - GoiQuaIDispatch: gọi thẳng đối tượng COM của ETABS (lấy từ bảng ROT) theo tên hàm – dự phòng khi lớp bọc của ETABSv1.dll rỗng
using System;
using System.Reflection;
using System.Runtime.ExceptionServices;

namespace MctEtabs
{
    internal interface IBoGoi
    {
        string Ten { get; }
        object Lay(object doiTuong, string giaoDien, string ten);
        /// <param name="coThamChieu">hàm có tham số ref (ví dụ GetVersion, GetNameList)</param>
        object Goi(object doiTuong, string giaoDien, string ten, object[] thamSo, bool coThamChieu = false);
    }

    internal sealed class GoiQuaGiaoDien : IBoGoi
    {
        private readonly Func<string, Type> _kieu;
        public GoiQuaGiaoDien(Func<string, Type> kieu) { _kieu = kieu; }
        public string Ten => "giao dien ETABSv1";
        public object Lay(object o, string giaoDien, string ten) => Api.Lay(o, _kieu(giaoDien), ten);
        public object Goi(object o, string giaoDien, string ten, object[] a, bool coThamChieu = false) => Api.Goi(o, _kieu(giaoDien), ten, a);
    }

    internal sealed class GoiQuaIDispatch : IBoGoi
    {
        public string Ten => "COM IDispatch";

        public object Lay(object o, string giaoDien, string ten)
        {
            if (o == null) throw new InvalidOperationException("Doi tuong rong khi lay " + giaoDien + "." + ten);
            try { return o.GetType().InvokeMember(ten, BindingFlags.GetProperty, null, o, null); }
            catch (TargetInvocationException ex) { ExceptionDispatchInfo.Capture(Api.GocLoi(ex)).Throw(); throw; }
        }

        public object Goi(object o, string giaoDien, string ten, object[] a, bool coThamChieu = false)
        {
            if (o == null) throw new InvalidOperationException("Doi tuong rong khi goi " + giaoDien + "." + ten);
            a ??= Array.Empty<object>();
            ParameterModifier[] dauRef = null;
            if (coThamChieu && a.Length > 0)
            {
                var m = new ParameterModifier(a.Length);
                for (int i = 0; i < a.Length; i++) m[i] = true;
                dauRef = new[] { m };
            }
            try { return o.GetType().InvokeMember(ten, BindingFlags.InvokeMethod, null, o, a, dauRef, null, null); }
            catch (TargetInvocationException ex) { ExceptionDispatchInfo.Capture(Api.GocLoi(ex)).Throw(); throw; }
        }
    }
}
