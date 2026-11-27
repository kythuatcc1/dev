// Chạy toàn bộ các mục A → F từ số liệu nhập (dùng chung cho giao diện và thuyết minh)
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  MCT.calc.tinhTatCa = function (s) {
    var DC = s.diaChat ? MCT.calc.tinhDiaChat(s.diaChat) : { hopLe: false, loi: ['Chưa có số liệu địa chất.'] };
    // Hình đài trên mặt bằng: chữ nhật X × Y (như Excel) hoặc móng 3 cọc vát góc bao theo cọc
    var HD = MCT.calc.hinhDai ? MCT.calc.hinhDai({ dai: s.dai, toaDo: s.coc.toaDo, D: s.sct.D }) : null;
    var A = MCT.calc.tinhPhanA({
      cau: s.cau.ten, chieuCao: s.cau.chieuCao,
      beTong: s.dai.beTong, cotThep: s.dai.cotThep, a_cm: s.dai.a_cm,
      X: HD && HD.kieu === 'vat' ? HD.X : s.dai.X, Y: HD && HD.kieu === 'vat' ? HD.Y : s.dai.Y, H: s.dai.H, hinh: HD
    });
    var SCT = MCT.calc.tinhSCT(s.sct, DC);
    // Qa, Qa' của mục B: tự lấy từ sức chịu tải cọc (giống ô L48, L49 sheet Cau thap) hoặc nhập tay
    var tuDong = s.coc.nguonQa !== 'nhap' && SCT.hopLe;
    var Qa = tuDong ? SCT.Ncd : s.coc.Qa;
    var QaKeo = tuDong ? SCT.Ntd : s.coc.QaKeo;
    var B = MCT.calc.tinhPhanB(A, { toaDo: s.coc.toaDo, Qa: Qa, QaKeo: QaKeo });
    B.nguonQa = tuDong ? 'tu-dong' : 'nhap';
    var C = MCT.calc.tinhPhanC(A, B, { D: s.sct.D });
    var D = MCT.calc.tinhPhanD(A, B, s.thep);
    var E = MCT.calc.tinhPhanE(A, s.bulong);
    var F = MCT.calc.tinhKetLuan(B, C, D, E);
    var TN = MCT.calc.tinhTaiNgang(s.taiNgang, { DC: DC, SCT: SCT, A: A, B: B });
    var TT = MCT.calc.tinhTuongTac(s.tuongTac || { a: 100 }, { SCT: SCT, B: B, TN: TN });
    var LUN = MCT.calc.tinhLun(s.lun || MCT.macDinh.lun, { DC: DC, SCT: SCT, A: A, B: B });
    return { DC: DC, SCT: SCT, A: A, B: B, C: C, D: D, E: E, F: F, TN: TN, TT: TT, LUN: LUN };
  };
})(globalThis.MCT = globalThis.MCT || {});
