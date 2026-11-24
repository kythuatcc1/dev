// Số liệu mặc định của app = số liệu trong file Excel gốc (CT1, LLT5020-10)
// + các thông tin trình bày thuyết minh lấy theo thuyết minh mẫu MD3-1.
(function (MCT) {
  'use strict';

  MCT.macDinh = {
    duAn: {
      ten: 'MD3-1',
      goiThau: 'Gói thầu chính Dự án MD3-1',
      diaDiem: 'Phường Tân Mỹ, Thành Phố Hồ Chí Minh',
      nhaThau: 'Tổng Công Ty Xây Dựng Số 1 - CTCP',
      hangMuc: 'Móng Cọc Cẩu Tháp CT1',
      tenMong: 'CT1',
      trangThai: 'HỒ SƠ THẨM TRA',
      chuDauTu: 'CÔNG TY TNHH PHÁT TRIỂN PHÚ MỸ HƯNG',
      tuVanGiamSat: 'CÔNG TY CỔ PHẦN TƯ VẤN QUẢN LÝ CHẤT LƯỢNG ĐẦU TIÊN',
      donViThamTra: 'CÔNG TY TNHH TƯ VẤN THIẾT KẾ VÀ ĐẦU TƯ XÂY DỰNG NAM PHÁT'
    },
    // Địa chất: hố khoan đầu tiên của sheet SL Dia chat (js/data/mau-dia-chat.js – nạp trước file này)
    diaChat: MCT.data && MCT.data.mauDiaChat ? JSON.parse(JSON.stringify(MCT.data.mauDiaChat)) : null,
    cau: { ten: 'LLT5020-10', chieuCao: 37.5 },
    dai: { beTong: 'B35', cotThep: 'CB500-V', a_cm: 15, X: 4, Y: 3.678, H: 1.6 },
    // Sức chịu tải cọc (sheet SCT Coc nhoi)
    sct: {
      D: 0.8,
      thep: [{ n: 18, d: 22 }, { n: 0, d: 0 }, { n: 0, d: 0 }],
      L: 33, dayDai: -2.6, dayHo: -13, dauCocTinhToan: -13, doanNgam: 0.1,
      beTong: 'B35', cotThep: 'CB500-V', gammaCb: 0.85, gammaCb2: 0.7,
      // Excel đang chọn "Cọc Khoan Thả" (ô H36 sheet SCT Coc nhoi FULL); cọc thực tế là khoan nhồi
      phuongPhapThiCong: 'Cọc Khoan Thả',
      eta: 1, gamma0: 1, capCongTrinh: 'III', phuongPhapGk: 'Kết quả theo chỉ số SPT',
      xetVatLieu: 'Yes', xetSPT: 'Yes'
    },
    // Cọc chịu tải ngang (sheet Kiem tra tai ngang)
    taiNgang: {
      M: 0, l0: 0, A0: 2.441, B0: 1.621, C0: 1.751, gioiHanChuyenVi: 1, gioiHanGocXoay: 1,
      phiB3: 0.6, thepDai: 'CB500-V', dDai: 8, aDai: 200, nBar: 2.5, eta1: 1, xi: 0.3
    },
    // Ổn định – lún móng khối quy ước (sheet On dinh - Lun)
    lun: { viTri: 'Có hầm', m1: 1.1, m2: 1, ktc: 1, gammaKc: 25, Smax: 8, soDiem: 14 },
    // Biểu đồ tương tác (sheet Bieu do tuong tac): lớp bê tông bảo vệ tính tới tâm cốt thép (mm)
    tuongTac: { a: 100 },
    coc: {
      nguonQa: 'tu-dong',   // 'tu-dong': lấy Nc,d, Nt,d từ phần sức chịu tải cọc; 'nhap': nhập tay
      Qa: 4243.15,
      QaKeo: 2534.12,       // độ lớn sức chịu kéo Qa' (app tự mang dấu âm khi kiểm tra)
      toaDo: [{ x: -1.2, y: -0.77 }, { x: 1.2, y: -0.77 }, { x: 0, y: 1.31 }]
    },
    // Thép chọn cho đài (mm): đường kính d, khoảng cách a
    thep: {
      duoiX: { d: 20, s: 150 }, duoiY: { d: 20, s: 150 },
      trenX: { d: 20, s: 150 }, trenY: { d: 20, s: 150 }
    },
    bulong: {
      d: 42, loai: 'Bulong thô/Normal quality', capBen: 8.8, fcb: 395, n: 8,
      L1L2: 1700, L2: 300, L3: 250, eta1: 1.5, eta2: 0.9, alpha1: 1, k0: 1.35, nv: 1
    },
    // Nội dung chữ của thuyết minh (mỗi dòng là một gạch đầu dòng)
    baoCao: {
      moTaThem: 'Cao độ đáy bê tông lót móng -2.600m so với cote MĐTN. ' +
        'Cọc khoan nhồi có cao độ mũi cọc là -34.600m so với cote MĐTN.',
      coSo: [
        'Báo cáo Kết quả khảo sát địa chất công trình do Chủ đầu tư cung cấp.',
        'Bản vẽ thiết kế do Chủ đầu tư cung cấp.',
        'Catalogue/Manual của cẩu tháp.',
        'Yêu cầu từ phía Chủ đầu tư.'
      ].join('\n'),
      tieuChuan: [
        'TCVN 2737:2023 Tải trọng và tác động – Tiêu chuẩn thiết kế.',
        'TCVN 5574:2018 Thiết kế kết cấu bê tông và bê tông cốt thép.',
        'TCVN 5575:2024 Kết cấu thép – Tiêu chuẩn thiết kế.',
        'TCVN 10304:2025 Móng cọc – Tiêu chuẩn thiết kế.'
      ].join('\n'),
      phanMem: 'MS Office (Excel).',
      ghiChuGio: 'Các số liệu phản lực của cẩu tháp theo catalogue đã bao gồm tác động của tải trọng gió. ' +
        'Theo đó, cẩu tháp chỉ hoạt động (làm việc) khi tốc độ gió quy định ≤ 72 km/h, khi tốc độ gió > 72 km/h ' +
        'thì cẩu tháp không hoạt động và tay cần được thả tự do. Phản lực của cẩu tháp theo catalogue được tính ' +
        'đến vận tốc gió tối đa là 151 km/h.',
      gioiThieuTaiNgang: 'Việc kiểm tra cọc chịu tải trọng ngang thực hiện cho trường hợp móng đài thấp, ' +
        'với tải trọng ngang lớn nhất của cẩu tháp chia đều cho các cọc trong đài.',
      taiToiDa: 10,     // T
      taiDauCan: 2      // T
    }
  };
})(globalThis.MCT = globalThis.MCT || {});
