// Ổn định nền và lún của móng khối quy ước (sheet "On dinh - Lun")
//   B. Kích thước móng khối quy ước: a = Σli·tg(φtb/4) ; Xqu = X − D + 2a ; Yqu = Y − D + 2a
//   C. Trọng lượng móng khối quy ước
//   D. Áp lực tiêu chuẩn tại đáy (tải tiêu chuẩn = tải quy đổi / n)
//   E. Sức chịu tải nền R theo 4.6.9 TCVN 9362:2012 ; kiểm tra ptb ≤ R, pmax ≤ 1,2R, pmin ≥ 0
//   F. Lún theo phương pháp cộng lớp (phụ lục C TCVN 9362:2012), E theo Tassios–Anagnostopoulos
//
// GIỐNG EXCEL – SAI KHÁC ĐÃ GHI CHÚ:
//   Hàm VBA TinhE nhận kích thước hạt dạng chữ ("Thô") thay vì mã ("T") nên với đất cát hệ số c = 0
//   (E lớp cát chỉ còn a/10). App tính giống Excel và trả thêm kết quả khi dùng đúng mã (ghiChu).
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  function rad(d) { return d * Math.PI / 180; }

  // Hàm VBA TinhE(LoaiDat, kthat, NSPT) – E (MPa) = [a + c(N + 6)]/10
  function tinhE(kyLoai, kthat, N) {
    var a = N >= 15 ? 40 : 0, c;
    switch (kyLoai) {
      case 'S': case 'SP': c = 3; break;
      case 'CP': c = 3.5; break;
      default:
        switch (kthat) {
          case 'B': case 'N': c = 3.5; break;
          case 'V': c = 4.5; break;
          case 'T': c = 7; break;
          case 'S': c = 10; break;
          default: c = 0;
        }
    }
    return (a + c * (N + 6)) / 10;
  }

  function tinhLun(v, kq) {
    var DC = kq.DC, S = kq.SCT, A = kq.A, B = kq.B, apLucDat = MCT.calc.apLucDat;
    var loi = [];
    if (!DC || !DC.hopLe) loi.push('Số liệu địa chất chưa hợp lệ.');
    if (!S || !S.hopLe) loi.push('Sức chịu tải cọc chưa hợp lệ.');
    if (!A || !A.hopLe) loi.push('Mục A chưa hợp lệ.');
    if (!B || !B.hopLe) loi.push('Mục B chưa hợp lệ.');
    if (loi.length) return { hopLe: false, loi: loi };

    var c = S.coc, D = c.D, n = B.n, X = A.dai.X, Y = A.dai.Y, Hd = A.dai.H;
    var day = c.dayDai, mat = day + Hd, dau = c.dauCocTinhToan, mui = c.muiCoc;
    var tops = DC.lop.map(function (l) { return l.dinh; }).concat([DC.caoDoDay]);
    var gam = DC.lop.map(function (l) { return l.gamma; }).concat([0]);
    var P = function (z) { return apLucDat(z, DC.MNN, tops, gam); };

    // B. Móng khối quy ước – đoạn cọc trong từng lớp như phần sức chịu tải cọc
    var doan = S.vatLieu.doan;
    var tongPhiL = doan.reduce(function (s2, d) { return s2 + d.l * d.lop.phi; }, 0);
    var tongL = doan.reduce(function (s2, d) { return s2 + d.l; }, 0);
    var phiTb = tongPhiL / tongL;
    var lopMui = doan.length ? doan[doan.length - 1].lop : null;
    var ILmui = lopMui ? lopMui.IL : 0;
    var aTho = tongL * Math.tan(rad(phiTb) / 4);
    var aMr = ILmui <= 0.6 ? aTho : Math.min(aTho, 2 * D);
    var Xqu = X - D + 2 * aMr, Yqu = Y - D + 2 * aMr;

    // C. Trọng lượng
    var Qdai = 25 * X * Y * (Math.min(0, mat) - Math.min(0, day));
    var Qcoc = 25 * Math.PI * D * D / 4 * (Math.min(0, day) - Math.min(0, mui)) * n;
    var QdaiCho = X * Y * (P(Math.min(0, day)) - P(Math.min(0, mat)));
    var QcocCho = Math.PI * D * D / 4 * (P(Math.min(0, mui)) - P(Math.min(0, day))) * n;
    var Qdat = Xqu * Yqu * P(mui);
    var Qqu = Qdat + Qdai + Qcoc - QdaiCho - QcocCho;

    // D. Áp lực tiêu chuẩn tại đáy khối quy ước
    var nHs = A.n;
    var tc = function (q) { return { N: q.N / nHs, M: q.M / nHs, H: q.H / nHs }; };
    var tcLv = tc(A.quyDoi.lv), tcKlv = tc(A.quyDoi.klv);
    var goc = Math.max.apply(null, B.coc.map(function (x) { return x.alpha; }));   // MAX('Cau thap'!E59:N59)
    var tay = mat - mui;
    function quiDoi(t) {
      return { N: t.N + Qqu, Mx: t.M * Math.sin(rad(goc)) + t.H * Math.sin(rad(goc)) * tay, My: t.M * Math.cos(rad(goc)) + t.H * Math.cos(rad(goc)) * tay };
    }
    var quLv = quiDoi(tcLv), quKlv = quiDoi(tcKlv);
    var Aqu = Xqu * Yqu, Wx = Xqu * Yqu * Yqu / 6, Wy = Yqu * Xqu * Xqu / 6;
    var ptb = Math.max(quLv.N, quKlv.N) / Aqu;
    var pmax = Math.max(quLv.N / Aqu + quLv.Mx / Wx + quLv.My / Wy, quKlv.N / Aqu + quKlv.Mx / Wx + quKlv.My / Wy);
    var pmin = Math.min(quLv.N / Aqu - quLv.Mx / Wx - quLv.My / Wy, quKlv.N / Aqu - quKlv.Mx / Wx - quKlv.My / Wy);

    // E. Sức chịu tải nền tại mặt phẳng mũi cọc (TCVN 9362:2012, 4.6.9)
    var m1 = Number(v.m1), m2 = Number(v.m2), ktc = Number(v.ktc), gKc = Number(v.gammaKc);
    var b = Yqu;
    var lMui = DC.lopTaiCaoDo(mui);
    var phiII = lMui.phi, cII = lMui.c;
    var cot = Math.cos(rad(phiII)) / Math.sin(rad(phiII));
    var kA = 0.25 * Math.PI / (cot + rad(phiII) - Math.PI / 2);
    var kB = 1 + Math.PI / (cot + rad(phiII) - Math.PI / 2);
    var kD = Math.PI * cot / (cot + rad(phiII) - Math.PI / 2);
    var khongHam = v.viTri === 'Không hầm';
    var hGoc = tops[0] - mui;
    var h1 = dau - mui;
    var h2 = day !== dau ? 0 : mat - day;
    var gammaII = DC.MNN <= mui ? lMui.gamma : lMui.gamma - 10;
    // h và htđ tham chiếu lẫn nhau khi b ≥ 20 m (vòng lặp trong Excel) – app lấy h = cao độ mặt đất − mũi cọc để tính γ'II
    var h = hGoc;
    var gammaII2 = (P(mui) - P(Math.min(0, mui + h))) / h;
    var htd = Math.min(h1 + h2 * gKc / gammaII2, h);
    if (!khongHam && b >= 20) { h = htd; gammaII2 = (P(mui) - P(Math.min(0, mui + h))) / h; }
    var h0 = khongHam ? 0 : (b >= 20 ? 0 : h - htd);
    var R = m1 * m2 / ktc * (kA * b * gammaII + kB * h * gammaII2 + kD * cII - gammaII * h0);

    // F. Lún
    var BT = MCT.data.bangTra;
    var Elop = DC.lop.map(function (l) {
      // Excel truyền kích thước hạt dạng chữ ('SL Dia chat'!AA) vào TinhE
      return { ten: l.ten, NSPT: l.spt, E: tinhE(l.kyLoai, l.kichThuoc || null, l.spt || 0), Edung: tinhE(l.kyLoai, l.kyKichThuoc, l.spt || 0) };
    });
    var pdz0 = P(mui);
    var p0 = Math.max(0, ptb - pdz0);
    var hi = 0.2 * Yqu;
    var soDiem = Math.max(2, Math.round(Number(v.soDiem) || 14));
    var Smax = Number(v.Smax);
    var diem = [];
    for (var i = 0; i < soDiem; i++) {
      var z = -i * hi, cao = mui + z;
      var l = DC.lopTaiCaoDo(cao);
      var e = Elop.filter(function (x) { return x.ten === (l && l.ten); })[0];
      var al = MCT.calc.nsxy(BT.C1, Xqu / Yqu, 2 * Math.abs(z) / Yqu);
      diem.push({ z: z, cao: cao, lop: l ? l.ten : null, E: e ? e.E : NaN, Edung: e ? e.Edung : NaN, alpha: al,
        p0z: al * p0, pdz: P(cao) });
    }
    function lun(khoa) {
      var tong = 0, minP = Infinity, iMin = 0;
      diem.forEach(function (d, k) { tong += d.p0z / d[khoa]; if (d.p0z < minP) { minP = d.p0z; iMin = k; } });
      return 0.8 * hi * (tong - 0.5 * diem[0].p0z / diem[0][khoa] - 0.5 * minP / diem[iMin][khoa]) / 10;
    }
    var Slun = lun('E');
    var SlunDung = lun('Edung');
    var dungLun = diem.filter(function (d) { return d.p0z <= 0.1 * d.pdz; })[0];

    return {
      hopLe: true, loi: [],
      viTri: v.viTri, D: D, n: n, X: X, Y: Y, H: Hd, mat: mat, day: day, dau: dau, mui: mui,
      doan: doan, tongPhiL: tongPhiL, tongL: tongL, phiTb: phiTb, loaiMui: lopMui ? lopMui.loai : null, ILmui: ILmui,
      a: aMr, Xqu: Xqu, Yqu: Yqu,
      Qdai: Qdai, Qcoc: Qcoc, QdaiCho: QdaiCho, QcocCho: QcocCho, Qdat: Qdat, Qqu: Qqu,
      tcLv: tcLv, tcKlv: tcKlv, gocAlpha: goc, quLv: quLv, quKlv: quKlv, Wx: Wx, Wy: Wy, ptb: ptb, pmax: pmax, pmin: pmin,
      m1: m1, m2: m2, ktc: ktc, b: b, phiII: phiII, A: kA, B: kB, Dr: kD, cII: cII, h: h, h1: h1, h2: h2, htd: htd, h0: h0,
      gammaKc: gKc, gammaII: gammaII, gammaII2: gammaII2, R: R,
      ok1: ptb <= R, ok2: pmax <= 1.2 * R, ok3: pmin >= 0,
      Elop: Elop, pdz0: pdz0, p0: p0, hi: hi, diem: diem, S: Slun, Smax: Smax, okS: Slun <= Smax,
      diemDungLun: dungLun ? dungLun.z : null,
      tatCaOk: ptb <= R && pmax <= 1.2 * R && pmin >= 0 && Slun <= Smax,
      ghiChu: { SDung: SlunDung, okSDung: SlunDung <= Smax }
    };
  }

  MCT.calc.tinhE = tinhE;
  MCT.calc.tinhLun = tinhLun;
})(globalThis.MCT = globalThis.MCT || {});
