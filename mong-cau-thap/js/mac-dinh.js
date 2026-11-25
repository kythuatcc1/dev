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
    // Bản nháp trang "Thêm cẩu tháp" (js/calc/cau-tu-them.js – taoCauTuNhap); cẩu đã lưu nằm trong thư viện cẩu tự thêm
    cauNhap: {
      tenGoc: '', ten: '', loai: 'bang', chieuDaiTayCan: '', beRongThan: '', duongKinhNhomBulong: 0.4, tongChieuDayBanThep: 40,
      heSoAnToan: 1.2, quyTacN: 'x_n', quyTacM: 'x_n', kieuT: 'mot', mXoan: '', pctCoDinh: '',
      nhan: { N: 'N', M: 'M', H: 'H', CR: 'CR', T: 'T' },
      hang: [{ h: '', lv: { N: '', M: '', H: '', CR: '', T: '' }, klv: { N: '', M: '', H: '', CR: '' } }],
      canhBao: []
    },
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
    // Phương pháp tính dùng cho kết luận và thuyết minh: 'giai-tich' (form CC1 / Excel) | 'etabs' (nội lực ETABS)
    tinhToan: {
      phuongPhap: 'giai-tich'
    },
    // Kết nối ETABS (chỉ dùng trong chương trình Windows)
    etabs: {
      duongDan: '',         // thư mục cài ETABS; để trống thì tự tìm
      batDauLoXo: 'day-dai',// lò xo đất bắt đầu từ: 'day-dai' (móng đài thấp) | 'day-ho' (đáy hố đào – đầu cọc tính toán)
      luoi: 0.25,           // m – kích thước lưới chia tấm đài
      buocCoc: 1,           // m – bước chia cọc (vị trí lò xo đất)
      diemDatLuc: 'tam',    // điểm đặt lực cẩu tháp: 'tam' – một điểm tại tâm cẩu (như báo cáo thẩm tra) | 'chan' – chia về 4 chân cẩu
      tamCauX: 0, tamCauY: 0, // m – tâm cẩu so với tâm đài (chỉ dùng cho mô hình ETABS)
      fileMoHinh: '',       // đường dẫn lưu mô hình .EDB; để trống: Documents\MongCauThap\<tên móng>.EDB
      heSoTinhTaiNen: 1.1,  // hệ số tĩnh tải trong tổ hợp cọc nén (PDF)
      heSoTinhTaiKeo: 0.9,  // hệ số tĩnh tải trong tổ hợp cọc kéo (PDF)
      heSoFzKeo: 0.9,       // hệ số lực đứng của cẩu trong tổ hợp cọc kéo (PDF)
      vanTayDung: '',       // dấu vân tay mô hình + tải trọng của lần dựng / cập nhật gần nhất (app tự ghi)
      vanTayHinhHoc: '',    // dấu vân tay hình học (tầng, điểm, thanh, vỏ) của lần dựng gần nhất – trùng thì cập nhật được
      fileDung: ''          // file .EDB của lần dựng gần nhất (app tự ghi)
    },
    // Dầm giằng các cọc (chỉ dùng trong mô hình ETABS). ds: danh sách dầm; mau: thông số mặc định khi thêm dầm.
    //   tuCoc, denCoc: số thứ tự cọc (1, 2…); z: cao độ tim dầm (m, so với MĐTN); b, h: bề rộng, chiều cao (m);
    //   a: khoảng cách từ mép tới trọng tâm thép dọc (cm); thép trên / dưới / hông (mỗi mặt bên): n thanh, đường kính d (mm);
    //   đai: đường kính d (mm), bước s (mm), số nhánh đứng.
    damGiang: {
      ds: [],
      mau: {
        z: -8, b: 0.4, h: 0.6, beTong: 'B30', cotThep: 'CB400-V', cotThepDai: 'CB400-V', a: 5,
        tren: { n: 3, d: 20 }, duoi: { n: 3, d: 20 }, hong: { n: 1, d: 14 }, dai: { d: 10, s: 150, nhanh: 2 }
      }
    },
    baoCao: {
      // Kiến nghị (mục 7.2 thuyết minh ETABS) – để trống: dùng mặc định; {tenMong}, {cau}, {chieuCao} được thay số liệu
      kienNghi: '',
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
