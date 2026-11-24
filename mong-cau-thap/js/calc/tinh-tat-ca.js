// Chạy toàn bộ các mục A → F từ số liệu nhập (dùng chung cho giao diện và thuyết minh)
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  MCT.calc.tinhTatCa = function (s) {
    var DC = s.diaChat ? MCT.calc.tinhDiaChat(s.diaChat) : { hopLe: false, loi: ['Chưa có số liệu địa chất.'] };
    var A = MCT.calc.tinhPhanA({
      cau: s.cau.ten, chieuCao: s.cau.chieuCao,
      beTong: s.dai.beTong, cotThep: s.dai.cotThep, a_cm: s.dai.a_cm,
      X: s.dai.X, Y: s.dai.Y, H: s.dai.H
    });
    var B = MCT.calc.tinhPhanB(A, { toaDo: s.coc.toaDo, Qa: s.coc.Qa, QaKeo: s.coc.QaKeo });
    var C = MCT.calc.tinhPhanC(A, B, { D: s.coc.D });
    var D = MCT.calc.tinhPhanD(A, B, s.thep);
    var E = MCT.calc.tinhPhanE(A, s.bulong);
    var F = MCT.calc.tinhKetLuan(B, C, D, E);
    return { DC: DC, A: A, B: B, C: C, D: D, E: E, F: F };
  };
})(globalThis.MCT = globalThis.MCT || {});
