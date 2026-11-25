// Xuất thuyết minh Word (.docx) theo mẫu "260917_MD3-1_THUYET_MINH_MCT_VN.pdf".
// Dùng thư viện docx (vendor/docx-9.15.3.umd.js, biến toàn cục `docx`).
//
// Bố cục:
//   Trang bìa → trang tên thuyết minh → trang ký → mục lục
//   CHƯƠNG I. TỔNG QUAN (cơ sở tính toán, tiêu chuẩn, thông số cẩu tháp)
//   CHƯƠNG II. TÍNH TOÁN MÓNG CẨU THÁP
//     PHẦN 1. Sức chịu tải cọc (tạm: giá trị thiết kế nhập tay – GĐ4 bổ sung chi tiết)
//     PHẦN 2. Tính toán móng cẩu tháp: A → F;  PHẦN 3 tải ngang; PHẦN 4 tương tác; PHẦN 5 ổn định – lún
//   Phương pháp ETABS (s.tinhToan.phuongPhap = 'etabs', kq.etabs): giữ trang bìa, khung tiêu đề, trang ký, mục lục của CC1;
//   phần thân theo đầu mục phụ lục tính toán của báo cáo thẩm tra (1 → 7), có ô trống dán hình chụp ETABS.
(function (MCT) {
  'use strict';

  var FONT = 'Times New Roman';
  var CO = 26;            // 13 pt (đơn vị nửa point)
  var MAU = { nhap: 'FF0000', ok: '7030A0', fail: 'FF0000', xanh: '1F4E79', xam: '7F7F7F' };
  var TRANG = { rong: 11906, cao: 16838, tren: 2040, duoi: 1134, trai: 1418, phai: 850, header: 454, footer: 567 };
  var RONG = TRANG.rong - TRANG.trai - TRANG.phai;   // bề rộng vùng chữ (twip)

  function D() {
    if (!globalThis.docx) throw new Error('Chưa nạp thư viện docx.');
    return globalThis.docx;
  }

  // ---------------- Định dạng số (dấu chấm thập phân như thuyết minh mẫu) ----------------
  function f(v, d) {
    if (typeof v !== 'number' || !isFinite(v)) return '-';
    var s = v.toFixed(d);
    return s === '-0' || /^-0\.0*$/.test(s) ? s.slice(1) : s;
  }
  // Giống định dạng General của Excel: tối đa 4 chữ số thập phân, bỏ số 0 thừa
  function g(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '-';
    return String(Math.round(v * 1e4) / 1e4);
  }

  // ---------------- Chữ: "N_{qđ}", "x^{2}" → các TextRun có chỉ số dưới/trên ----------------
  function chay(text, o) {
    o = o || {};
    var runs = [];
    var re = /([_^])\{([^}]*)\}/g, m, last = 0;
    function them(t, them2) {
      if (!t) return;
      var cfg = { text: t, font: FONT, size: o.size || CO, bold: o.bold, italics: o.italics, color: o.color, underline: o.underline };
      if (them2 === '_') cfg.subScript = true;
      if (them2 === '^') cfg.superScript = true;
      runs.push(new (D().TextRun)(cfg));
    }
    text = String(text == null ? '' : text);
    while ((m = re.exec(text))) {
      them(text.slice(last, m.index));
      them(m[2], m[1]);
      last = re.lastIndex;
    }
    them(text.slice(last));
    return runs;
  }

  function p(noiDung, o) {
    o = o || {};
    var children = Array.isArray(noiDung) ? noiDung : chay(noiDung, o);
    var cfg = {
      children: children,
      alignment: o.align,
      spacing: Object.assign({ before: 0, after: 80, line: 300 }, o.spacing || {}),
      indent: o.indent,
      keepNext: o.keepNext,
      keepLines: o.keepLines,
      pageBreakBefore: o.pageBreakBefore,
      style: o.style,
      shading: o.shading
    };
    if (o.heading) cfg.heading = o.heading;
    return new (D().Paragraph)(cfg);
  }

  function ngatTrang() { return new (D().Paragraph)({ children: [new (D().PageBreak)()] }); }

  // Dòng trống cao cố định: đẩy nội dung xuống giữa trang (khoảng cách "before" bị bỏ qua ở đầu trang)
  function khoangTrong(twip, moiTrang) {
    return new (D().Paragraph)({
      children: [], pageBreakBefore: !!moiTrang,
      spacing: { before: 0, after: 0, line: twip, lineRule: 'exact' }
    });
  }

  var KHONG_VIEN = { style: 'none', size: 0, color: 'FFFFFF' };
  var VIEN = { style: 'single', size: 4, color: '000000' };
  function vien(co) {
    var b = co ? VIEN : KHONG_VIEN;
    return { top: b, bottom: b, left: b, right: b };
  }

  function o(children, w, opt) {
    opt = opt || {};
    var x = D();
    return new x.TableCell({
      children: Array.isArray(children) ? children : [children],
      width: { size: w, type: x.WidthType.DXA },
      borders: opt.borders || vien(opt.vien !== false),
      verticalAlign: opt.vAlign || x.VerticalAlign.CENTER,
      columnSpan: opt.span,
      rowSpan: opt.rowSpan,
      shading: opt.fill ? { type: x.ShadingType.CLEAR, color: 'auto', fill: opt.fill } : undefined,
      margins: opt.margins || { top: 20, bottom: 20, left: 80, right: 80 }
    });
  }

  function bang(hang, cot, opt) {
    opt = opt || {};
    var x = D();
    var tong = cot.reduce(function (a, b) { return a + b; }, 0);
    return new x.Table({
      rows: hang,
      width: { size: tong, type: x.WidthType.DXA },
      columnWidths: cot,
      layout: x.TableLayoutType.FIXED,
      alignment: opt.align,
      indent: opt.indent ? { size: opt.indent, type: x.WidthType.DXA } : undefined,
      borders: opt.borders
    });
  }

  function hangBang(cells, opt) {
    var x = D();
    opt = opt || {};
    return new x.TableRow({
      children: cells,
      cantSplit: true,
      tableHeader: opt.header,
      height: opt.cao ? { value: opt.cao, rule: x.HeightRule.ATLEAST } : undefined
    });
  }

  // ---------------- Dòng thông số kiểu Excel: nhãn | ký hiệu | giá trị | đơn vị | OK ----------------
  // Bảng không viền. r = { nhan, ky, gt, dv, nhap (tô đỏ), kl ('OK'|'FAIL'), dam (nhãn đậm), thut (thụt lề nhãn) }
  // Không dùng thụt lề cấp bảng (LibreOffice co hẹp bảng có tblInd) – thụt lề nằm trong ô nhãn.
  var COT_TS = [0, 1100, 1300, 1000, 650];
  function bangThongSo(dsDong, opt) {
    opt = opt || {};
    var thut = opt.thut === undefined ? 360 : opt.thut;
    var cot = COT_TS.slice();
    cot[0] = RONG - COT_TS.slice(1).reduce(function (a, b) { return a + b; }, 0);
    var x = D();
    var hang = dsDong.map(function (r) {
      var ok = r.kl ? [p(r.kl, { bold: true, color: r.kl === 'OK' ? MAU.ok : MAU.fail, align: x.AlignmentType.CENTER, spacing: { after: 0 } })] : [p('', { spacing: { after: 0 } })];
      // dòng chỉ có nhãn (đề mục cho bảng phía sau) thì dính với nội dung sau
      var lien = { spacing: { after: 0, line: 276 }, keepNext: r.keepNext || (!r.ky && (r.gt == null || r.gt === '')) };
      var oNhan = o(p(r.nhan || '', Object.assign({ bold: r.dam, italics: r.nghieng, indent: { left: r.thut === undefined ? thut : r.thut } }, lien)), cot[0], { vien: false, vAlign: x.VerticalAlign.TOP });
      if (r.gtRong) {
        // giá trị dài (chữ) chiếm cả 3 cột giá trị – đơn vị – kết luận
        return hangBang([oNhan, o(p(r.ky || '', lien), cot[1], { vien: false, vAlign: x.VerticalAlign.TOP }),
          o(p(r.gt == null ? '' : r.gt, Object.assign({ color: r.nhap ? MAU.nhap : undefined }, lien)), cot[2] + cot[3] + cot[4], { vien: false, span: 3, vAlign: x.VerticalAlign.TOP })]);
      }
      var cells = [
        oNhan,
        o(p(r.ky || '', lien), cot[1], { vien: false, vAlign: x.VerticalAlign.TOP }),
        o(p(r.gt == null ? '' : r.gt, Object.assign({ align: x.AlignmentType.CENTER, color: r.nhap ? MAU.nhap : undefined, bold: r.gtDam }, lien)), cot[2], { vien: false, vAlign: x.VerticalAlign.TOP })
      ];
      if (r.dv && String(r.dv).replace(/[_^]\{|\}/g, '').length > 7 && !r.kl) {
        // ghi chú dài trong cột đơn vị: gộp với cột kết luận cho đỡ bẻ dòng
        cells.push(o(p(r.dv, Object.assign({}, lien, { size: 22 })), cot[3] + cot[4], { vien: false, span: 2, vAlign: x.VerticalAlign.TOP }));
      } else {
        cells.push(o(p(r.dv || '', lien), cot[3], { vien: false, vAlign: x.VerticalAlign.TOP }));
        cells.push(o(ok, cot[4], { vien: false, vAlign: x.VerticalAlign.TOP }));
      }
      return hangBang(cells);
    });
    return bang(hang, cot, { borders: { top: KHONG_VIEN, bottom: KHONG_VIEN, left: KHONG_VIEN, right: KHONG_VIEN, insideHorizontal: KHONG_VIEN, insideVertical: KHONG_VIEN } });
  }

  // ---------------- Bảng số: cột nhãn bên trái không viền + các cột số có viền ----------------
  // cfg = { tieuDe: ['N', ...], donVi: ['kN', ...], hang: [{ nhan, gt: [..] }], rongNhan, rongCot }
  function bangSo(cfg) {
    var x = D();
    var rongNhan = cfg.rongNhan || 3600, rongCot = cfg.rongCot || 1250;
    var soCot = cfg.tieuDe.length;
    var cot = [rongNhan].concat(new Array(soCot).fill(rongCot));
    // giữ cả bảng trên một trang, dính với đoạn ngay sau
    var giua = { align: x.AlignmentType.CENTER, spacing: { after: 0, line: 260 }, keepNext: true };
    var trong = { top: KHONG_VIEN, bottom: KHONG_VIEN, left: KHONG_VIEN, right: VIEN };
    var hang = [];
    hang.push(hangBang([o(p('', { spacing: { after: 0 } }), rongNhan, { borders: trong })].concat(
      cfg.tieuDe.map(function (t) { return o(p(t, Object.assign({ bold: true }, giua)), rongCot); })), { header: true }));
    if (cfg.donVi) {
      hang.push(hangBang([o(p('', { spacing: { after: 0 } }), rongNhan, { borders: trong })].concat(
        cfg.donVi.map(function (t) { return o(p(t, Object.assign({ bold: true }, giua)), rongCot); })), { header: true }));
    }
    cfg.hang.forEach(function (h) {
      hang.push(hangBang([o(p(h.nhan, { spacing: { after: 0, line: 260 }, indent: { left: 360 }, keepNext: true }), rongNhan, { borders: trong })].concat(
        h.gt.map(function (v) { return o(p(v, giua), rongCot); }))));
    });
    return bang(hang, cot);
  }

  // Bảng có viền đầy đủ, hàng đầu là tiêu đề
  function bangDayDu(tieuDe, dsHang, cot, opt) {
    var x = D();
    opt = opt || {};
    var giuChung = opt.giuChung !== undefined ? opt.giuChung : dsHang.length <= 12;
    var giua = { align: x.AlignmentType.CENTER, spacing: { after: 0, line: 260 }, keepNext: giuChung, size: opt.co };   // opt.co: cỡ chữ (nửa pt)
    var hang = [hangBang(tieuDe.map(function (t, i) {
      return o(p(t, Object.assign({ bold: true }, giua)), cot[i], { fill: opt.fillTieuDe });
    }), { header: true })];
    dsHang.forEach(function (r, ri) {
      hang.push(hangBang(r.map(function (t, i) {
        var canh = opt.canhTrai && opt.canhTrai.indexOf(i) >= 0
          ? { align: x.AlignmentType.LEFT, spacing: { after: 0, line: 260 }, keepNext: giuChung, size: opt.co } : giua;
        return o(p(t, Object.assign({ bold: opt.dongDam && opt.dongDam(ri) }, canh)), cot[i]);
      })));
    });
    return bang(hang, cot, { align: opt.align || x.AlignmentType.CENTER });
  }

  function chuThich(text) {
    (DOI_CHU_THICH || []).forEach(function (r) { text = text.replace(r[0], r[1]); });
    return p(text, { bold: true, italics: true, align: D().AlignmentType.CENTER, spacing: { before: 60, after: 160 } });
  }

  // Ô chèn hình (người dùng dán hình vào Word)
  function oHinh(goiY, caoTwip) {
    var x = D();
    return bang([hangBang([o(p(goiY, { italics: true, color: MAU.xam, align: x.AlignmentType.CENTER, spacing: { after: 0 }, keepNext: true }), RONG,
      { borders: { top: { style: 'dashed', size: 4, color: '7F7F7F' }, bottom: { style: 'dashed', size: 4, color: '7F7F7F' },
        left: { style: 'dashed', size: 4, color: '7F7F7F' }, right: { style: 'dashed', size: 4, color: '7F7F7F' } } })], { cao: caoTwip || 3400 })], [RONG]);
  }

  function gachDau(dong) {
    return String(dong || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
      return p('-\t' + s, { indent: { left: 720, hanging: 360 }, spacing: { after: 60, line: 312 } });
    });
  }

  // ---------------- Đầu trang / chân trang ----------------
  function dauTrang(s, tieuDeHangMuc) {
    var x = D();
    var nho = 20;
    var c = { align: x.AlignmentType.CENTER, spacing: { after: 20, line: 260 }, size: nho, bold: true };
    var trai = [
      p('Dự án: ' + s.duAn.ten, c),
      p('Gói thầu: ' + s.duAn.goiThau, c),
      p('Hạng mục: ' + tieuDeHangMuc, Object.assign({}, c, { italics: true }))
    ];
    var w1 = Math.round(RONG * 0.705), w2 = RONG - w1;
    var t = bang([hangBang([
      o(trai, w1, { margins: { top: 80, bottom: 80, left: 80, right: 80 } }),
      o(p(s.duAn.trangThai, c), w2)
    ])], [w1, w2]);
    return new x.Header({ children: [t, p('', { spacing: { after: 0 }, size: 8 })] });
  }

  function chanTrang() {
    var x = D();
    return new x.Footer({
      children: [new x.Paragraph({
        alignment: x.AlignmentType.RIGHT,
        children: [new x.TextRun({ children: [x.PageNumber.CURRENT], font: FONT, size: 24 })]
      })]
    });
  }

  // ---------------- Các trang đầu ----------------
  function trangBia(tenTM) {
    var x = D();
    var mau = { bold: true, color: MAU.xanh, size: 44, align: x.AlignmentType.RIGHT };
    return [
      khoangTrong(6200),
      p('THUYẾT MINH', Object.assign({}, mau, { spacing: { before: 0, after: 120 }, size: 48 })),
      // dải màu xanh chạy từ mép trái trang tới lề phải
      p([new x.TextRun({ text: ' ', size: 2 })], {
        shading: { type: x.ShadingType.CLEAR, color: 'auto', fill: MAU.xanh },
        indent: { left: -TRANG.trai, right: 150 },
        spacing: { before: 0, after: 160, line: 420, lineRule: 'exact' }
      }),
      p('TÍNH TOÁN MÓNG CẨU THÁP', Object.assign({}, mau, { spacing: { after: 60 } })),
      p(tenTM, Object.assign({}, mau, { spacing: { after: 0 } }))
    ];
  }

  function khoiTen(s, tenTM, cachTren) {
    var x = D();
    var lon = { bold: true, size: 40, align: x.AlignmentType.CENTER };
    return [
      khoangTrong(Math.max(cachTren, 20)),
      p('THUYẾT MINH TÍNH TOÁN', Object.assign({}, lon, { spacing: { before: 0, after: 240 } })),
      p('MÓNG CẨU THÁP ' + tenTM, Object.assign({}, lon, { spacing: { after: 360 } })),
      p(chay('Dự án : ', { bold: true }).concat(chay(s.duAn.ten)), { spacing: { after: 200 } }),
      p(chay('Gói thầu: ', { bold: true }).concat(chay(s.duAn.goiThau)), { spacing: { after: 300 } })
    ];
  }

  function oKy(chucDanh, ten, w) {
    var x = D();
    return o([
      p(chucDanh, { underline: {}, spacing: { after: 0 } }),
      p(ten, { bold: true, align: x.AlignmentType.CENTER, spacing: { after: 0 } })
    ], w, { vAlign: x.VerticalAlign.TOP });
  }

  function trangKy(s) {
    var w = Math.round((RONG - 900) / 2);
    var x = D();
    function bangKy(a, b) {
      return bang([hangBang([oKy(a[0], a[1], w), oKy(b[0], b[1], w)], { cao: 4300 })], [w, w], { align: x.AlignmentType.CENTER });
    }
    return [
      bangKy(['CHỦ ĐẦU TƯ:', s.duAn.chuDauTu], ['TƯ VẤN GIÁM SÁT:', s.duAn.tuVanGiamSat]),
      p('', { spacing: { after: 400 } }),
      bangKy(['NHÀ THẦU:', s.duAn.nhaThau], ['ĐƠN VỊ THẨM TRA:', s.duAn.donViThamTra])
    ];
  }

  function mucLuc() {
    var x = D();
    return [
      p('MỤC LỤC', { bold: true, align: x.AlignmentType.CENTER, spacing: { after: 240 } }),
      new x.TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '1-3' }),
      p('(Mục lục tự cập nhật khi mở file trong Word – chọn "Yes" khi được hỏi cập nhật trường dữ liệu.)',
        { italics: true, size: 20, color: MAU.xam, spacing: { before: 200 } })
    ];
  }

  // ---------------- Tiêu đề chương / phần / mục ----------------
  function chuong(text) {
    var x = D();
    return [
      khoangTrong(6000, true),
      p(text, { heading: x.HeadingLevel.HEADING_1, align: x.AlignmentType.CENTER, spacing: { before: 0, after: 0 } })
    ];
  }
  // Thuyết minh theo phương pháp ETABS dùng lại các phần sẵn có (sức chịu tải cọc, xuyên thủng, bulong, ổn định – lún)
  // nhưng đặt đầu mục theo báo cáo thẩm tra: DOI_TEN đổi chữ/cấp của đầu mục (null = bỏ), DOI_CHU_THICH đổi số hình/bảng.
  var DOI_TEN = null, DOI_CHU_THICH = null;
  function voiTen(tenMoi, chuThichMoi, fn) {
    var a = DOI_TEN, b = DOI_CHU_THICH;
    DOI_TEN = tenMoi; DOI_CHU_THICH = chuThichMoi;
    try { return fn(); } finally { DOI_TEN = a; DOI_CHU_THICH = b; }
  }
  function doiTen(text, cap, moiTrang) {
    var v = DOI_TEN && Object.prototype.hasOwnProperty.call(DOI_TEN, text) ? DOI_TEN[text] : text;
    if (v === null) return [];
    if (typeof v === 'string') return tieuDe(v, cap, moiTrang);
    return tieuDe(v.t, v.cap || cap, v.moi !== undefined ? v.moi : moiTrang);
  }
  // cap 2: Heading 2 (có trong mục lục), 3: Heading 3, 'tm': tiểu mục in đậm
  function tieuDe(text, cap, moiTrang) {
    var x = D();
    if (cap === 2) return p(text, { heading: x.HeadingLevel.HEADING_2, pageBreakBefore: !!moiTrang, keepNext: true });
    if (cap === 3) return p(text, { heading: x.HeadingLevel.HEADING_3, pageBreakBefore: !!moiTrang, keepNext: true });
    return p(text, { bold: true, keepNext: true, pageBreakBefore: !!moiTrang, spacing: { before: 120, after: 80 } });
  }
  function phan(text, moiTrang) { return doiTen(text, 2, moiTrang); }
  function muc(text) { return doiTen(text, 3); }
  function tieuMuc(text) { return doiTen(text, 'tm'); }
  function doan(text, o2) {
    return p(text, Object.assign({ align: D().AlignmentType.JUSTIFIED, indent: { firstLine: 567 }, spacing: { after: 100, line: 340 } }, o2 || {}));
  }

  // ---------------- Chương I ----------------
  function chuongI(s, kq, tenTM) {
    var x = D();
    var A = kq.A, cau = A.cau;
    var loaiEN = String(cau.loaiEN || '').replace(/[()]/g, '');
    var hMax = cau.hang[cau.hang.length - 1].h;
    var nCoc = kq.B && kq.B.hopLe ? kq.B.n : s.coc.toaDo.length;
    var out = chuong('CHƯƠNG I. TỔNG QUAN');

    out.push(p('', { pageBreakBefore: true, spacing: { after: 0 } }));
    out.push(doan('Thuyết minh này trình bày các kết quả tính toán cọc khoan nhồi đỡ móng cẩu tháp và móng cẩu tháp cho công trình. ' +
      'Công trình sử dụng cẩu tháp ' + s.duAn.tenMong + ' với các thông số như sau:'));
    out.push(bangDayDu(['TT', 'Tên móng cẩu', 'Mã hiệu cẩu sử dụng', 'Loại cẩu', 'Chiều dài tay cần tối đa'],
      [['01', s.duAn.tenMong, cau.ten, loaiEN, g(A.chieuDaiTayCan) + 'm']], [700, 1700, 2300, 1500, 3438]));
    out.push(p('', { spacing: { after: 120 } }));
    out.push(oHinh('Chèn hình mặt bằng bố trí cẩu tháp'));
    out.push(chuThich('Hình 1.1 Mặt bằng bố trí cẩu tháp'));
    out.push(doan('Móng cẩu tháp được đỡ ' + (nCoc < 10 ? '0' : '') + nCoc + ' cọc khoan nhồi có đường kính D' +
      g(Number(s.sct.D) * 1000) + 'mm. ' + (s.baoCao.moTaThem || ''), { indent: undefined }));

    out.push(phan('PHẦN 1. CƠ SỞ TÍNH TOÁN'));
    out.push(doan('Thuyết minh tính toán này dựa trên các tài liệu và yêu cầu như sau:'));
    out = out.concat(gachDau(s.baoCao.coSo));

    out.push(phan('PHẦN 2. TIÊU CHUẨN, TÀI LIỆU THAM KHẢO, PHẦN MỀM ÁP DỤNG'));
    out.push(doan('Tiêu chuẩn tham khảo:'));
    out = out.concat(gachDau(s.baoCao.tieuChuan));
    out.push(doan('Phần mềm áp dụng:'));
    out = out.concat(gachDau(s.baoCao.phanMem));

    out.push(phan('PHẦN 3. THÔNG SỐ CẨU THÁP'));
    out.push(doan(s.baoCao.ghiChuGio || '', { italics: true }));
    out.push(tieuMuc('CẨU THÁP ' + cau.ten));
    out = out.concat(thongSoCau(s, kq, { bangTai: 'Bảng 3.1', hinh: 'Hình 3.1', bangCau: 'Bảng 3.2' }));
    return out;
  }

  // Phản lực chân đế theo catalogue (bảng tải theo chiều cao), ô chèn hình catalogue, bảng thông số cẩu
  function thongSoCau(s, kq, so, hinhCatalogue) {
    var A = kq.A, cau = A.cau, out = [];
    var hMax = cau.hang[cau.hang.length - 1].h;
    out.push(doan('Thông số phản lực xuống móng cẩu tháp khi lắp ở chiều cao tự đứng ' + g(Number(s.cau.chieuCao)) +
      'm như bên dưới. Mô hình tính toán lấy 2 trường hợp: phản lực lớn nhất lúc cẩu tháp hoạt động và phản lực lớn nhất lúc cẩu tháp không hoạt động.'));

    // Tải trọng chân đế theo catalogue (đã đổi sang kN, kNm)
    var nh = cau.nhan;
    var cotLv = ['N', 'M', 'H', 'CR'].filter(function (k) { return nh.lv[k]; });
    var cotKlv = ['N', 'M', 'H', 'CR'].filter(function (k) { return nh.klv[k]; });
    var dv = { N: 'kN', M: 'kNm', H: 'kN', CR: 'kNm' };
    var coT = cau.hang.some(function (h) { return typeof h.lv.T === 'number'; });
    var tieuDe = ['H (m)'].concat(cotLv.map(function (k) { return 'LV ' + nh.lv[k] + ' (' + dv[k] + ')'; }));
    if (coT) tieuDe.push('LV T (kNm)');
    tieuDe = tieuDe.concat(cotKlv.map(function (k) { return 'KLV ' + nh.klv[k] + ' (' + dv[k] + ')'; }));
    var dong = cau.hang.map(function (h) {
      var r = [g(h.h)].concat(cotLv.map(function (k) { return f(h.lv[k], 2); }));
      if (coT) r.push(f(h.lv.T, 2));
      return r.concat(cotKlv.map(function (k) { return f(h.klv[k], 2); }));
    });
    var w0 = 900, wc = Math.floor((RONG - w0) / (tieuDe.length - 1));
    var cot = [w0].concat(new Array(tieuDe.length - 1).fill(wc));
    var hangChon = cau.hang.indexOf(A.hang);
    out.push(p('', { spacing: { after: 60 } }));
    out.push(bangDayDu(tieuDe, dong, cot, { fillTieuDe: 'F2F2F2', dongDam: function (i) { return i === hangChon; } }));
    out.push(chuThich(so.bangTai + ' Tải trọng chân đế cẩu tháp ' + cau.ten + ' theo catalogue (LV: làm việc; KLV: không làm việc; dòng in đậm: chiều cao tính toán)'));
    out.push(oHinh(hinhCatalogue || 'Chèn hình catalogue / sơ đồ cẩu tháp ' + cau.ten, hinhCatalogue ? 5200 : 3000));
    out.push(chuThich(so.hinh + (hinhCatalogue ? ' Thông tin tải trọng cần trục tháp ' + cau.ten + ' tự đứng ' + g(Number(s.cau.chieuCao)) + 'm'
      : ' Cẩu tháp ' + s.duAn.tenMong + ' – ' + cau.ten)));
    out.push(bangDayDu(['STT', 'Thông số', 'Giá trị', 'Đơn vị'], [
      ['1', 'Tải tối đa', g(Number(s.baoCao.taiToiDa)), 'T'],
      ['2', 'Tải đầu cần', g(Number(s.baoCao.taiDauCan)), 'T'],
      ['3', 'Kích thước thân', f(A.Ht, 1), 'm'],
      ['4', 'Chiều cao tự đứng lớn nhất', g(hMax), 'm'],
      ['5', 'Chiều dài cần lớn nhất', g(A.chieuDaiTayCan), 'm']
    ], [1000, 3800, 3000, 1838], { canhTrai: [1] }));
    out.push(chuThich(so.bangCau + ' Thông số cẩu tháp'));
    return out;
  }

  // ---------------- Chương II – Phần 1 (tạm) ----------------
  // ---------------- Tiện ích chung cho các phần cọc ----------------
  var CAM = 'F4B183';   // ô kết quả nổi bật như bản mẫu

  // Ảnh biểu đồ (PNG do trình duyệt tạo); không có ảnh → ô chèn hình
  function hinhAnh(h, rongPx, goiY, chuThichHinh) {
    var x = D();
    var out = [];
    if (h && h.data) {
      var cao = Math.round(rongPx * h.h / h.w);
      out.push(new x.Paragraph({
        alignment: x.AlignmentType.CENTER, keepNext: true, spacing: { before: 80, after: 40 },
        children: [new x.ImageRun({ type: 'png', data: h.data, transformation: { width: rongPx, height: cao } })]
      }));
    } else {
      out.push(oHinh(goiY + ' (biểu đồ được chèn khi xuất từ app trong trình duyệt)', 2600));
    }
    if (chuThichHinh) out.push(chuThich(chuThichHinh));
    return out;
  }

  // Dòng kết quả nổi bật: "Rc,u/vl = [6572] kN"
  function ketQuaNoiBat(ky, gt, dv) {
    var x = D();
    var giua = { spacing: { after: 0, line: 260 } };
    return bang([hangBang([
      o(p(ky, Object.assign({ bold: true, align: x.AlignmentType.RIGHT }, giua)), 2200, { vien: false }),
      o(p(gt, Object.assign({ bold: true, align: x.AlignmentType.CENTER }, giua)), 1100, { fill: CAM }),
      o(p(dv, Object.assign({ bold: true }, giua)), 700, { vien: false })
    ])], [2200, 1100, 700], { align: x.AlignmentType.CENTER,
      borders: { top: KHONG_VIEN, bottom: KHONG_VIEN, left: KHONG_VIEN, right: KHONG_VIEN, insideHorizontal: KHONG_VIEN, insideVertical: KHONG_VIEN } });
  }

  function congThucDong(text) {
    return p(text, { bold: true, align: D().AlignmentType.CENTER, keepNext: true, spacing: { after: 40 } });
  }
  function nhanNghieng(text) { return p(text, { italics: true, keepNext: true, spacing: { after: 40 } }); }

  // Bảng "Trong đó": ký hiệu | giá trị | đơn vị | : mô tả
  function bangTrongDo(ds) {
    var x = D();
    var cot = [1300, 1200, 1000, RONG - 3500];
    var c = { spacing: { after: 0, line: 276 } };
    return bang(ds.map(function (r) {
      return hangBang([
        o(p(r[0], Object.assign({ indent: { left: 360 } }, c)), cot[0], { vien: false, vAlign: x.VerticalAlign.TOP }),
        o(p(r[1] == null ? '' : r[1], Object.assign({ align: x.AlignmentType.CENTER, color: r[4] ? MAU.nhap : undefined }, c)), cot[1], { vien: false, vAlign: x.VerticalAlign.TOP }),
        o(p(r[2] || '', c), cot[2], { vien: false, vAlign: x.VerticalAlign.TOP }),
        o(p(r[3] ? ': ' + r[3] : '', c), cot[3], { vien: false, vAlign: x.VerticalAlign.TOP })
      ]);
    }), cot, { borders: { top: KHONG_VIEN, bottom: KHONG_VIEN, left: KHONG_VIEN, right: KHONG_VIEN, insideHorizontal: KHONG_VIEN, insideVertical: KHONG_VIEN } });
  }

  function chuaDu(kq, ten) {
    return [doan('Chưa đủ số liệu để trình bày ' + ten + ': ' + ((kq && kq.loi) || []).join('; '))];
  }

  // ---------------- Chương II – Phần 1: sức chịu tải cọc ----------------
  function phan1SCT(s, kq, hinh) {
    var x = D();
    var DC = kq.DC, S = kq.SCT;
    var out = [phan('PHẦN 1. TÍNH TOÁN SỨC CHỊU TẢI CỌC', true)];
    if (!DC || !DC.hopLe || !S || !S.hopLe) return out.concat(chuaDu(S && S.hopLe ? DC : S, 'sức chịu tải cọc'));
    var c = S.coc, vl = S.vatLieu, sp = S.spt;
    out.push(muc('A. THÔNG SỐ ĐẦU VÀO'));
    out.push(tieuMuc('A.1. Thông số địa chất'));
    out.push(bangThongSo([
      { nhan: 'Địa chất được chọn:', gt: DC.hoKhoan, nhap: true, gtDam: true },
      { nhan: 'Cao độ mực nước ngầm:', gt: g(DC.MNN), dv: 'm' }
    ], { thut: 0 }));
    var hangDC = DC.lop.map(function (l) {
      var loai = l.loai + (l.tinhChat ? '-' + l.tinhChat : '') + (l.kichThuoc ? '-' + l.kichThuoc : '');
      return [String(l.stt), l.ten, loai, g(l.dinh), f(l.gamma, 2), f(l.phi, 2), f(l.c, 2), f(l.IL, 2), f(l.e, 2)];
    });
    hangDC.push([String(DC.lop.length + 1), '', '', g(DC.caoDoDay), '', '', '', '', '']);
    out.push(bangDayDu(['STT', 'Tên lớp', 'Loại đất', 'Cao độ đỉnh lớp (m)', 'γ (kN/m3)', 'φ (độ)', 'c (kN/m2)', 'I_{L}', 'e'],
      hangDC, [600, 800, 2038, 1300, 1100, 1000, 1100, 850, 850], { canhTrai: [2] }));
    out = out.concat(hinhAnh(hinh.spt, 330, 'Biểu đồ SPT', 'Hình 2.1 Biểu đồ chỉ số SPT theo độ sâu – hố khoan ' + DC.hoKhoan));

    out.push(tieuMuc('A.2. Thông số cọc'));
    out.push(p('A.2.1 Đặc trưng về tiết diện cọc', { bold: true, italics: true, keepNext: true }));
    out.push(bangDayDu(['Thông số', 'Ký hiệu', 'Giá trị', 'Đơn vị'], [
      ['Kích thước cọc:', 'D=', g(c.D), 'm'], ['Diện tích cọc:', 'A_{b}=', f(c.Ab, 3), 'm2'],
      ['Chu vi cọc:', 'u=', f(c.u, 3), 'm'], ['Moment quán tính:', 'I=', f(c.I, 3), 'm4']
    ], [3600, 1500, 1500, 1200], { canhTrai: [0] }));
    out.push(p('A.2.2 Thép cọc', { bold: true, italics: true, keepNext: true, spacing: { before: 120 } }));
    out.push(bangDayDu(['', 'Thép 1', 'Thép 2', 'Thép 3'], [
      ['n (thanh)'].concat(c.thep.map(function (t) { return t.n ? String(t.n) : ''; })),
      ['d (mm)'].concat(c.thep.map(function (t) { return t.d ? String(t.d) : ''; }))
    ], [2400, 1800, 1800, 1800]));
    out.push(bangThongSo([
      { nhan: 'Diện tích cốt thép trong cọc:', ky: 'A_{s}=', gt: f(c.As, 0), dv: 'mm2' },
      { nhan: 'Hàm lượng thép trong cọc:', ky: 'μ=', gt: f(c.mu, 2), dv: '%' }
    ]));
    out.push(p('A.2.3 Cao độ cọc', { bold: true, italics: true, keepNext: true, spacing: { before: 120 } }));
    out.push(bangDayDu(['Thông số', 'Giá trị', 'Đơn vị'], [
      ['Tổng chiều dài cọc:', f(c.L, 2), 'm'], ['Cao độ mặt đáy đài cọc:', f(c.dayDai, 2), 'm so với MĐTN'],
      ['Cao độ mặt đáy hố đào:', f(c.dayHo, 2), 'm so với MĐTN'], ['Cao độ đầu cọc tính toán:', f(c.dauCocTinhToan, 2), 'm so với MĐTN'],
      ['Đoạn cọc ngàm vào đài:', f(c.doanNgam, 2), 'm'], ['Đoạn đập đầu cọc để ngàm vào đài:', f(c.doanDap, 2), 'm'],
      ['Cao độ đầu cọc thực tế:', f(c.dauCocThucTe, 2), 'm so với MĐTN'], ['Cao độ mũi cọc tính toán dự kiến:', f(c.muiCoc, 2), 'm so với MĐTN']
    ], [4200, 2000, 3438], { canhTrai: [0, 2] }));

    out.push(muc('B. TÍNH TOÁN SỨC CHỊU TẢI CỌC'));
    out.push(tieuMuc('B.1. Sức chịu tải cọc theo vật liệu'));
    out.push(bangDayDu(['Vật liệu', 'Cấp', 'Cường độ', 'Giá trị (MPa)'], [
      ['Bê tông', vl.beTong, 'R_{b} / R_{bt} / E', g(vl.Rb) + ' / ' + g(vl.Rbt) + ' / ' + g(vl.E)],
      ['Cốt thép', vl.cotThep, 'R_{s} / R_{sc}', g(vl.Rs) + ' / ' + g(vl.Rsc)]
    ], [1800, 1800, 2800, 3238]));
    out.push(p('B.1.1 Sức chịu tải trọng nén của cọc theo vật liệu', { bold: true, italics: true, keepNext: true, spacing: { before: 120 } }));
    out.push(nhanNghieng('Công thức xác định:'));
    out.push(congThucDong("R_{c,u/vl} = φ(γ_{cb}γ'_{cb}R_{b}A_{b} + R_{sc}A_{s});   φ = 1,028 − 0,0000288λ^{2} − 0,0016λ (λ > 28)"));
    out.push(ketQuaNoiBat('R_{c,u/vl}=', f(vl.Rcu, 0), 'kN'));
    out.push(nhanNghieng('Trong đó:'));
    out.push(bangTrongDo([
      ['k=', f(vl.k, 0), 'kN/m4', 'Hệ số tỷ lệ trung bình theo bảng A.1 TCVN 10304:2025 (Σk_{i}l_{i}/Σl_{i})'],
      ['b_{p}=', f(vl.bp, 2), 'm', 'Chiều rộng quy ước của cọc'],
      ['α_{ε}=', f(vl.alphaE, 3), '1/m', 'Hệ số biến dạng (k·b_{p}/EI)^{1/5}'],
      ['l_{0}=', f(vl.l0, 2), 'm', 'Đoạn cọc từ đáy đài/điểm giằng tới cao độ san nền'],
      ['l_{1}=', f(vl.l1, 2), 'm', 'Đoạn cọc từ đáy đài/điểm giằng tới điểm ngàm trong đất (l_{0} + 2/α_{ε})'],
      ['λ=', f(vl.lambda, 2), '', 'Độ mảnh của cọc (l_{1}/r, r = ' + f(vl.r, 3) + ' m)'],
      ['φ=', f(vl.phi, 3), '', 'Hệ số uốn dọc'],
      ['γ_{cb}=', f(vl.gammaCb, 2), '', 'Hệ số điều kiện làm việc bê tông (7.1.5.3 TCVN 10304)'],
      ["γ'_{cb}=", f(vl.gammaCb2, 2), '', 'Hệ số do phương pháp thi công (7.1.5.3 TCVN 10304)'],
      ['R_{b}=', g(vl.Rb), 'MPa', 'Cường độ chịu nén tính toán của bê tông'],
      ['A_{b}=', f(c.Ab, 3), 'm2', 'Diện tích mặt cắt ngang cọc'],
      ['R_{sc}=', g(vl.Rsc), 'MPa', 'Cường độ chịu nén tính toán của cốt thép'],
      ['A_{s}=', f(c.As, 0), 'mm2', 'Diện tích cốt thép trong cọc']
    ]));
    out.push(p('B.1.2 Sức chịu tải trọng kéo của cọc theo vật liệu', { bold: true, italics: true, keepNext: true, spacing: { before: 120 } }));
    out.push(nhanNghieng('Công thức xác định:'));
    out.push(congThucDong('R_{t,u/vl} = R_{s}A_{s}'));
    out.push(ketQuaNoiBat('R_{t,u/vl}=', f(vl.Rtu, 0), 'kN'));

    var pp = sp.phuongPhap;
    out.push(tieuMuc('B.2. Sức chịu tải cọc theo chỉ số SPT'));
    out.push(p('B.2.1 Sức chịu tải cực hạn của đất nền', { bold: true, italics: true, keepNext: true }));
    out.push(nhanNghieng('Công thức xác định (Phụ lục D TCVN 10304:2025):'));
    out.push(congThucDong('R_{c,u} = R_{ub} + R_{uf} = q_{b}A_{b} + uΣ(f_{c,i}l_{c,i} + f_{s,i}l_{s,i})'));
    out.push(ketQuaNoiBat('R_{c,u}=', f(sp.Rcu, 0), 'kN'));
    out.push(nhanNghieng('Trong đó (' + pp.ten + '):'));
    out.push(bangTrongDo([
      ['q_{b}=', f(sp.qb, 0), 'kN/m2', 'Cường độ sức kháng của đất dưới mũi cọc'],
      ['A_{b}=', f(c.Ab, 3), 'm2', 'Diện tích tiết diện ngang mũi cọc'],
      ['u=', f(c.u, 3), 'm', 'Chu vi tiết diện ngang thân cọc'],
      ['f_{c,i}', '', '', 'min(' + g(pp.heSoFc) + 'c_{u}; ' + pp.chanFc + ') – sức kháng đơn vị của lớp đất dính, c_{u,i} = 6,25N_{c,i}'],
      ['f_{s,i}', '', '', 'min(' + g(pp.heSoFs) + 'N_{s}; ' + pp.chanFs + ') – sức kháng đơn vị của lớp đất rời'],
      ['l_{i}', '', '', 'Chiều dài đoạn cọc nằm trong lớp đất thứ i (chia lớp phân tố ≤ 1 m)']
    ]));
    out.push(p('B.2.1.1 Xác định cường độ sức kháng của đất dưới mũi cọc (đất tại mũi cọc: ' + sp.loaiMui + ')',
      { italics: true, keepNext: true, spacing: { before: 120 } }));
    out.push(p('- Trường hợp mũi cọc cắm vào lớp đất dính: q_{b} = min(6c_{u}; 9000)', { bold: true, keepNext: true }));
    out.push(bangDayDu(['z (m)', 'N_{c}', 'c_{u} (kN/m2)', 'q_{b} (kN/m2)'], [[f(c.muiCoc, 1), f(sp.Np, 2), f(sp.cuMui, 2), f(sp.qbSet, 0)]],
      [1600, 1600, 1800, 1800], { align: x.AlignmentType.LEFT }));
    out.push(p('- Trường hợp mũi cọc cắm vào lớp đất rời: q_{b} = min(120N_{p}; 9000)', { bold: true, keepNext: true, spacing: { before: 120 } }));
    out.push(bangDayDu(['z (m)', '1d (m)', 'z+1d (m)', 'N_{p,1d}', 'z−1d (m)', 'N_{p,1d}', 'N_{p}', 'q_{b} (kN/m2)'], [[
      f(c.muiCoc, 1), f(c.D, 2), f(c.muiCoc + c.D, 1), f(sp.NpTren, 2), f(c.muiCoc - c.D, 1), f(sp.NpDuoi, 2), f(sp.Np, 2), f(sp.qbCat, 0)]],
      [1100, 1000, 1200, 1200, 1200, 1200, 1100, 1638]));
    out.push(p('B.2.1.2 Xác định cường độ sức kháng của đất trên thân cọc', { italics: true, keepNext: true, spacing: { before: 120 } }));
    out.push(bangDayDu(['Tên lớp', 'Loại đất', 'l_{i} (m)', 'SPT TB', 'c_{u,i} (kN/m2)', 'f_{c,i} (kN/m2)', 'f_{s,i} (kN/m2)'],
      sp.doan.map(function (d) {
        return [d.lop.ten, d.lop.loai, g(d.l), f(d.spt, 2), d.cu === null ? '' : f(d.cu, 2), d.fc === null ? '' : f(d.fc, 2), d.fs === null ? '' : f(d.fs, 2)];
      }), [1100, 1500, 1200, 1300, 1500, 1500, 1538]));
    out.push(p('B.2.2 Sức chịu tải trọng kéo của cọc theo chỉ số SPT', { bold: true, italics: true, keepNext: true, spacing: { before: 120 } }));
    out.push(nhanNghieng('Công thức xác định:'));
    out.push(congThucDong('R_{t,u} = uΣ(f_{c,i}l_{c,i} + f_{s,i}l_{s,i})'));
    out.push(ketQuaNoiBat('R_{t,u}=', f(sp.Rtu, 0), 'kN'));

    out.push(muc('C. TỔNG HỢP VÀ LỰA CHỌN SỨC CHỊU TẢI THIẾT KẾ CỦA CỌC'));
    out.push(nhanNghieng('Công thức xác định (TCVN 10304:2025):'));
    out.push(congThucDong('N_{c,d} ≤ γ_{0}/γ_{n} × R_{c,k}/γ_{k} ;   N_{t,d} ≤ γ_{0}/γ_{n} × R_{t,k}/γ_{k}'));
    out.push(nhanNghieng('Trong đó:'));
    out.push(bangTrongDo([
      ['γ_{0}=', g(S.gamma0), '', 'Hệ số kể đến nhóm cọc', true],
      ['γ_{n}=', g(S.gammaN), '', 'Hệ số tin cậy về tầm quan trọng công trình – cấp ' + S.capCongTrinh],
      ['γ_{k}=', g(S.gammaK), '', 'Hệ số độ tin cậy theo đất: ' + S.phuongPhapGk]
    ]));
    function bangTk(ten, kyVl, Rvl, kySpt, Rspt, kyK, Rk, kyD, Rd) {
      var cot = [5000, 1600, 1600, 1438];
      var c2 = { spacing: { after: 0, line: 260 }, keepNext: true };
      var giua = Object.assign({ align: x.AlignmentType.CENTER }, c2);
      function h(nhan, ky, gt, dam) {
        return hangBang([o(p(nhan, Object.assign({ bold: dam, color: dam ? MAU.ok : undefined }, c2)), cot[0]), o(p(ky, Object.assign({ bold: dam, color: dam ? MAU.ok : undefined }, c2)), cot[1]),
          o(p(gt, Object.assign({ bold: dam }, giua)), cot[2], { fill: dam ? CAM : undefined }), o(p('kN', Object.assign({ bold: dam }, c2)), cot[3])]);
      }
      return [doiTen(ten, 'tm'), bang([
        h('Sức chịu tải ' + (kyVl.indexOf('c') >= 0 ? 'nén' : 'kéo') + ' của cọc theo vật liệu (1)' + (S.xetVatLieu ? '' : ' (không xét)'), kyVl, f(Rvl, 0)),
        h('Sức chịu tải ' + (kyVl.indexOf('c') >= 0 ? 'nén' : 'kéo') + ' của cọc theo chỉ số SPT (2)' + (S.xetSPT ? '' : ' (không xét)'), kySpt, f(Rspt, 0)),
        h('Trị tiêu chuẩn sức chịu tải (theo SPT)', kyK, f(Rk, 0)),
        h(ten.replace(/^C\.\d\. /, ''), kyD, f(Rd, 0), true)
      ], cot)];
    }
    out = out.concat(bangTk('C.1. Sức chịu tải trọng nén thiết kế', 'R_{c,u/vl}=', vl.Rcu, 'R_{c,u/SPT}=', sp.Rcu, 'R_{c,k}=', S.Rck, 'N_{c,d}=', S.Ncd));
    out = out.concat(bangTk('C.2. Sức chịu tải trọng kéo thiết kế', 'R_{t,u/vl}=', vl.Rtu, 'R_{t,u/SPT}=', sp.Rtu, 'R_{t,k}=', S.Rtk, 'N_{t,d}=', S.Ntd));
    return out;
  }

  // ---------------- Chương II – Phần 3: cọc chịu tải ngang ----------------
  function phan3TaiNgang(s, kq, hinh) {
    var x = D();
    var r = kq.TN;
    var out = [phan('PHẦN 3. KIỂM TRA CỌC CHỊU TẢI NGANG', true)];
    if (!r || !r.bang) return out.concat(chuaDu(r, 'tải ngang'));
    if (s.baoCao.gioiThieuTaiNgang) out.push(doan(s.baoCao.gioiThieuTaiNgang));
    out.push(muc('A. THÔNG SỐ ĐẦU VÀO'));
    out.push(bangThongSo([
      { nhan: 'Lực cắt tác dụng vào đầu cọc:', ky: 'H=', gt: f(r.H, 2), dv: 'kN' },
      { nhan: 'Moment tác dụng vào đầu cọc:', ky: 'M=', gt: f(r.M, 2), dv: 'kNm' },
      { nhan: 'Chiều dài cọc từ đáy đài tới cao độ san nền:', ky: 'l_{0}=', gt: f(r.l0, 2), dv: 'm' },
      { nhan: 'Moment quán tính tiết diện ngang cọc:', ky: 'I=', gt: f(r.I, 4), dv: 'm4' },
      { nhan: 'Modulus đàn hồi của bê tông:', ky: 'E=', gt: g(r.E), dv: 'MPa' },
      { nhan: 'Hệ số nền:', ky: 'K=', gt: f(r.K, 0), dv: 'kN/m4' },
      { nhan: 'Hệ số biến dạng:', ky: 'α=', gt: f(r.alphaE, 3), dv: '1/m' },
      { nhan: 'Các hệ số:', ky: 'A_{0}=', gt: g(r.A0) }, { nhan: '', ky: 'B_{0}=', gt: g(r.B0) }, { nhan: '', ky: 'C_{0}=', gt: g(r.C0) },
      { nhan: 'Giới hạn chuyển vị đầu cọc:', ky: '[Δ]=', gt: g(r.gioiHanChuyenVi), dv: 'cm', nhap: true },
      { nhan: 'Giới hạn góc xoay đầu cọc:', ky: '[ψ]=', gt: g(r.gioiHanGocXoay), dv: 'độ', nhap: true }
    ]));
    out.push(muc('B. XÁC ĐỊNH CHUYỂN VỊ NGANG VÀ GÓC XOAY ĐẦU CỌC'));
    out.push(bangThongSo([
      { nhan: 'Chuyển vị ngang của tiết diện cọc bởi lực đơn vị H_{0}=1 gây ra:', ky: 'δ_{HH}=', gt: f(r.dHH, 2), dv: '×10^{-5} m/kN' },
      { nhan: 'Chuyển vị ngang của tiết diện cọc bởi lực đơn vị M_{0}=1 gây ra:', ky: 'δ_{HM}=', gt: f(r.dHM, 2), dv: '×10^{-5} 1/kN' },
      { nhan: 'Góc xoay của tiết diện cọc bởi lực đơn vị H_{0}=1 gây ra:', ky: 'δ_{MH}=', gt: f(r.dMH, 2), dv: '×10^{-5} 1/kN' },
      { nhan: 'Góc xoay của tiết diện cọc bởi lực đơn vị M_{0}=1 gây ra:', ky: 'δ_{MM}=', gt: f(r.dMM, 2), dv: '×10^{-5} 1/kNm' },
      { nhan: 'Lực cắt tác dụng vào đầu cọc tại cao trình mặt đất:', ky: 'H_{0}=', gt: f(r.H0, 2), dv: 'kN' },
      { nhan: 'Moment tác dụng vào đầu cọc tại cao trình mặt đất:', ky: 'M_{0}=', gt: f(r.M0, 2), dv: 'kNm' },
      { nhan: 'Chuyển vị ngang và góc xoay của cọc tại cao trình mặt đất:', ky: 'y_{0}=', gt: f(r.y0, 2), dv: 'cm' },
      { nhan: '', ky: 'ψ_{0}=', gt: f(r.psi0, 3), dv: 'độ' },
      { nhan: 'Chuyển vị ngang và góc xoay của cọc tại cao trình đáy đài:', ky: 'Δ=', gt: f(r.Delta, 2), dv: 'cm', kl: okKl(r.okDelta), gtDam: true },
      { nhan: '', ky: 'ψ=', gt: f(r.psi, 3), dv: 'độ', kl: okKl(r.okPsi), gtDam: true }
    ]));
    out.push(muc('C. MOMENT DỌC THEO THÂN CỌC'));
    out = out.concat(hinhAnh(hinh.M, 300, 'Biểu đồ moment dọc thân cọc'));
    out.push(bangThongSo([
      { nhan: 'Moment lớn nhất dọc theo thân cọc:', ky: 'M_{z}=', gt: f(r.Mmax, 2), dv: 'kNm', gtDam: true },
      { nhan: 'Tại độ sâu so với cao độ đáy đài:', ky: 'z_{1}=', gt: f(r.zM, 2), dv: 'm' }
    ]));
    out.push(muc('D. LỰC CẮT DỌC THEO THÂN CỌC'));
    out = out.concat(hinhAnh(hinh.Q, 300, 'Biểu đồ lực cắt dọc thân cọc'));
    out.push(bangThongSo([
      { nhan: 'Lực cắt lớn nhất dọc theo thân cọc:', ky: 'Q_{z}=', gt: f(r.Qmax, 2), dv: 'kN', gtDam: true },
      { nhan: 'Tại độ sâu so với cao độ đáy đài:', ky: 'z_{1}=', gt: f(r.zQ, 2), dv: 'm' },
      { nhan: 'Khả năng chịu cắt của bê tông:' },
      { nhan: 'Q_{min} = φ_{b3}R_{bt}A_{b0}', thut: 720, ky: 'Q_{min}=', gt: f(r.Qmin, 2), dv: 'kN' },
      { nhan: '', ky: 'φ_{b3}=', gt: g(r.phiB3) }, { nhan: '', ky: 'R_{bt}=', gt: f(r.Rbt, 3), dv: 'MPa' }, { nhan: '', ky: 'A_{b0}=', gt: f(r.Ab0, 3), dv: 'm2' },
      { nhan: 'Khả năng chịu cắt của thép đai:', ky: '', gt: r.thepDai, nhap: true, gtRong: true },
      { nhan: '', ky: 'Q_{steel}=', gt: f(r.Qsteel, 2), dv: 'kN' }, { nhan: '', ky: 'd=', gt: g(r.dDai), dv: 'mm', nhap: true },
      { nhan: '', ky: 'a=', gt: g(r.aDai), dv: 'mm', nhap: true }, { nhan: '', ky: 'R_{sw}=', gt: g(r.Rsw), dv: 'MPa' },
      { nhan: 'Khả năng chịu cắt của bê tông và thép:', ky: '[Q]=', gt: f(r.Qgh, 2), dv: 'kN', kl: okKl(r.okQ) }
    ]));
    return out.concat(phan3OnDinh(r, hinh));
  }

  // Phần 3, mục E – F: áp lực ngang và ổn định đất nền quanh cọc (giải tích, dùng cho cả hai phương pháp)
  function phan3OnDinh(r, hinh) {
    var out = [];
    out.push(muc('E. ÁP LỰC NGANG DỌC THEO THÂN CỌC'));
    out = out.concat(hinhAnh(hinh.sigma, 300, 'Biểu đồ áp lực ngang dọc thân cọc'));
    out.push(bangThongSo([
      { nhan: 'Áp lực ngang lớn nhất dọc theo thân cọc:', ky: 'σ_{z}=', gt: f(r.sigmaMax, 2), dv: 'kN/m2', gtDam: true },
      { nhan: 'Tại độ sâu so với cao độ đáy đài:', ky: 'z_{1}=', gt: f(r.zSigma, 2), dv: 'm' }
    ]));
    out.push(muc('F. KIỂM TRA ỔN ĐỊNH ĐẤT NỀN QUANH CỌC'));
    out.push(p('Điều kiện kiểm tra:', { keepNext: true, indent: { left: 360 } }));
    out.push(congThuc(['σ_{z}  ≤  [σ_{z}]  =', { tu: '4η_{1}η_{2}(γ_{I}z·tgφ_{I} + ξc_{I})', mau: 'cosφ_{I}' }], { giua: true }));
    out.push(p('Chiều sâu kiểm tra z (mục A.8): α_{ε}L ≤ 2,5 → z = L/3 và L ; α_{ε}L > 2,5 → z = 0,85/α_{ε}', { indent: { left: 360 }, keepNext: true }));
    out.push(bangThongSo([
      { nhan: 'α_{ε} / L / α_{ε}·L', gt: f(r.alphaE, 3) + ' / ' + f(r.L, 1) + ' / ' + f(r.alphaL, 1), gtRong: true },
      { nhan: 'Chiều sâu kiểm tra:', ky: 'z=', gt: f(r.zKT, 2), dv: 'm' }
    ]));
    out.push(nhanNghieng('Trong đó:'));
    out.push(bangDayDu(['z', 'Lớp đất', 'η_{1}', 'η_{2}', 'ξ', 'γ', 'c_{I}', 'φ'],
      [[f(r.zCaoDo, 2), String(r.lopZ), g(r.eta1), f(r.eta2, 2), g(r.xi), f(r.gammaTB, 2), f(r.cI, 2), f(r.phiI, 2)]],
      [1300, 1100, 900, 1000, 900, 1300, 1300, 1838]));
    out.push(bangThongSo([
      { nhan: 'Áp lực ngang lớn nhất dọc theo thân cọc:', ky: 'σ_{z}=', gt: f(r.sigmaMax, 2), dv: 'kN/m2' },
      { nhan: 'Giới hạn áp lực ngang:', ky: '[σ_{z}]=', gt: f(r.sigmaGh, 2), dv: 'kN/m2', kl: okKl(r.okOnDinh) }
    ]));
    out.push(p(chay('Kết luận: ', { bold: true }).concat(chay(r.okOnDinh ? 'Thoả mãn điều kiện kiểm tra ổn định đất nền quanh cọc' :
      'KHÔNG thoả mãn điều kiện kiểm tra ổn định đất nền quanh cọc', { bold: true, color: r.okOnDinh ? MAU.ok : MAU.fail })), { indent: { left: 360 } }));
    return out;
  }

  // ---------------- Chương II – Phần 4: biểu đồ tương tác ----------------
  function phan4TuongTac(s, kq, hinh) {
    var x = D();
    var r = kq.TT;
    var out = [phan('PHẦN 4. TÍNH TOÁN BIỂU ĐỒ TƯƠNG TÁC CỌC', true)];
    if (!r || !r.hopLe) return out.concat(chuaDu(r, 'biểu đồ tương tác'));
    out.push(muc('A. THÔNG SỐ CỌC'));
    out.push(bangThongSo([
      { nhan: 'Đường kính tiết diện cọc:', ky: 'D =', gt: g(r.D), dv: 'm' },
      { nhan: 'Bán kính tiết diện cọc:', ky: 'r =', gt: g(r.r), dv: 'm' },
      { nhan: 'Lớp bê tông bảo vệ:', ky: 'a =', gt: g(r.a), dv: 'mm', nhap: true },
      { nhan: 'Diện tích tiết diện ngang cọc:', ky: 'A_{b} =', gt: f(r.Ab, 3), dv: 'm2' },
      { nhan: 'Số thanh thép đặt theo chu vi cọc:', ky: 'n =', gt: g(r.n) },
      { nhan: 'Đường kính cốt thép dọc trong cọc:', ky: 'd =', gt: g(r.d), dv: 'mm' },
      { nhan: 'Diện tích cốt thép trong cọc:', ky: 'A_{s} =', gt: f(r.As, 0), dv: 'mm2' }
    ]));
    out.push(muc('B. VẬT LIỆU LÀM CỌC'));
    out.push(bangDayDu(['Vật liệu', 'Cấp', 'Thông số', 'Giá trị (MPa)'], [
      ['Bê tông', r.beTong, "R_{b} / R'_{b}", g(r.Rb) + ' / ' + f(r.Rb2, 3)],
      ['', '', "R_{bt} / R'_{bt}", g(r.Rbt) + ' / ' + f(r.Rbt2, 3)],
      ['Cốt thép', r.cotThep, 'R_{s} / R_{sc}', g(r.Rs) + ' / ' + g(r.Rsc)]
    ], [1800, 1800, 2800, 3238]));
    out.push(bangThongSo([
      { nhan: 'Hệ số điều kiện làm việc của bê tông:', ky: 'γ_{cb}=', gt: f(r.gammaCb, 2) },
      { nhan: 'Hệ số kể đến phương pháp thi công:', ky: "γ'_{cb}=", gt: f(r.gammaCb2, 2) }
    ]));
    out.push(muc('C. NGOẠI LỰC TÁC DỤNG VÀO CỌC'));
    out.push(bangDayDu(['', 'Đơn vị', 'Nén (P_{max})', 'Kéo (P_{min})'], [
      ['Moment', 'M (kNm)', f(r.diemNoiLuc[0].M, 2), f(r.diemNoiLuc[1].M, 2)],
      ['Lực dọc', 'N (kN)', f(r.diemNoiLuc[0].N, 2), f(r.diemNoiLuc[1].N, 2)]
    ], [2000, 2000, 2000, 2000], { align: x.AlignmentType.LEFT }));
    out = out.concat(hinhAnh(hinh.tuongTac, 430, 'Biểu đồ tương tác', 'Hình 4.1 Biểu đồ tương tác N–M của tiết diện cọc'));
    out.push(p(r.tatCaOk ? 'Các cặp nội lực (M, N) đều nằm trong biểu đồ tương tác: cọc đủ khả năng chịu lực.' :
      'Có cặp nội lực (M, N) nằm ngoài biểu đồ tương tác: cọc KHÔNG đủ khả năng chịu lực.',
      { bold: true, color: r.tatCaOk ? MAU.ok : MAU.fail, indent: { left: 360 } }));
    return out;
  }

  // ---------------- Chương II – Phần 5: ổn định – lún ----------------
  function phan5Lun(s, kq) {
    var x = D();
    var r = kq.LUN;
    var out = [phan('PHẦN 5. KIỂM TRA ỔN ĐỊNH ĐẤT NỀN VÀ KIỂM TRA LÚN', true)];
    if (!r || !r.hopLe) return out.concat(chuaDu(r, 'ổn định – lún'));
    out.push(muc('A. XÁC ĐỊNH KÍCH THƯỚC CỦA MÓNG KHỐI QUY ƯỚC'));
    out.push(p('Tính toán dựa trên TCVN 10304:2025.', { indent: { left: 360 } }));
    out.push(bangDayDu(['Tên lớp', 'l_{i} (m)', 'φ_{i} (độ)', 'φ_{i}l_{i}'], r.doan.map(function (d) {
      return [d.lop.ten, f(d.l, 2), f(d.lop.phi, 2), f(d.l * d.lop.phi, 2)];
    }), [2000, 2000, 2000, 2000], { align: x.AlignmentType.LEFT }));
    out.push(bangThongSo([
      { nhan: 'Góc ma sát trung bình của các lớp đất mà cọc xuyên qua (φ_{tb} = Σφ_{i}l_{i}/Σl_{i}):', ky: 'φ_{tb}=', gt: f(r.phiTb, 2), dv: 'độ' },
      { nhan: 'Đường bao khối móng quy ước cách khối móng công trình (a = Σl_{i}·tg(φ_{tb}/4)):', ky: 'a=', gt: f(r.a, 2), dv: 'm' },
      { nhan: 'Chiều dài khối móng quy ước:', ky: 'X_{qu}=', gt: f(r.Xqu, 2), dv: 'm' },
      { nhan: 'Chiều rộng khối móng quy ước:', ky: 'Y_{qu}=', gt: f(r.Yqu, 2), dv: 'm' }
    ]));
    out.push(muc('B. XÁC ĐỊNH TRỌNG LƯỢNG CỦA MÓNG KHỐI QUY ƯỚC'));
    out.push(bangThongSo([
      { nhan: 'Trọng lượng đài móng nằm dưới mặt đất tự nhiên:', ky: 'Q_{đài}=', gt: f(r.Qdai, 2), dv: 'kN' },
      { nhan: 'Trọng lượng cọc nằm dưới mặt đất tự nhiên:', ky: 'Q_{cọc}=', gt: f(r.Qcoc, 2), dv: 'kN' },
      { nhan: 'Trọng lượng đất đài chiếm chỗ:', ky: 'Q*_{đài}=', gt: f(r.QdaiCho, 2), dv: 'kN' },
      { nhan: 'Trọng lượng đất cọc chiếm chỗ:', ky: 'Q*_{cọc}=', gt: f(r.QcocCho, 2), dv: 'kN' },
      { nhan: 'Trọng lượng đất trong khối móng quy ước:', ky: 'Q_{đất}=', gt: f(r.Qdat, 2), dv: 'kN' },
      { nhan: 'Trọng lượng khối móng quy ước:', ky: 'Q_{qu}=', gt: f(r.Qqu, 2), dv: 'kN' }
    ]));
    out.push(muc('C. ÁP LỰC TIÊU CHUẨN TẠI ĐÁY MÓNG KHỐI QUY ƯỚC'));
    out.push(bangSo({ tieuDe: ['N_{qu}', 'M_{x,qu}', 'M_{y,qu}'], donVi: ['kN', 'kNm', 'kNm'], hang: [
      { nhan: 'Khi cẩu làm việc:', gt: [f(r.quLv.N, 2), f(r.quLv.Mx, 2), f(r.quLv.My, 2)] },
      { nhan: 'Khi cẩu không làm việc:', gt: [f(r.quKlv.N, 2), f(r.quKlv.Mx, 2), f(r.quKlv.My, 2)] }] }));
    out.push(bangThongSo([
      { nhan: 'Moment chống uốn của móng khối quy ước:', ky: 'W_{x}=', gt: f(r.Wx, 2), dv: 'm3' },
      { nhan: '', ky: 'W_{y}=', gt: f(r.Wy, 2), dv: 'm3' },
      { nhan: 'Áp lực tiêu chuẩn trung bình (p_{tc,tb} = N_{qu}/A_{qu}):', ky: 'p_{tc,tb}=', gt: f(r.ptb, 2), dv: 'kPa' },
      { nhan: 'Áp lực tiêu chuẩn lớn nhất:', ky: 'p_{tc,max}=', gt: f(r.pmax, 2), dv: 'kPa' },
      { nhan: 'Áp lực tiêu chuẩn nhỏ nhất:', ky: 'p_{tc,min}=', gt: f(r.pmin, 2), dv: 'kPa' }
    ]));
    out.push(muc('D. SỨC CHỊU TẢI CỦA ĐẤT NỀN TẠI MẶT PHẲNG MŨI CỌC'));
    out.push(p('Theo 4.6.9 TCVN 9362:2012, áp lực cho phép đáy móng được tính theo công thức:', { indent: { left: 360 }, keepNext: true }));
    out.push(congThuc(['R =', { tu: 'm_{1}m_{2}', mau: 'k_{tc}' }, "(A·b·γ_{II} + B·h·γ'_{II} + D·c_{II} − γ_{II}·h_{0})"], { giua: true }));
    out.push(bangThongSo([
      { nhan: 'Hệ số điều kiện làm việc của nền / công trình / hệ số tin cậy:', gt: g(r.m1) + ' / ' + g(r.m2) + ' / ' + g(r.ktc), gtRong: true },
      { nhan: 'Cạnh bé của đáy móng:', ky: 'b=', gt: f(r.b, 2), dv: 'm' },
      { nhan: 'Góc ma sát trong của đất dưới đáy móng:', ky: 'φ_{II}=', gt: g(r.phiII), dv: 'độ' },
      { nhan: 'Các hệ số A / B / D:', gt: f(r.A, 3) + ' / ' + f(r.B, 3) + ' / ' + f(r.Dr, 3), gtRong: true },
      { nhan: 'Lực dính của đất dưới đáy móng:', ky: 'c_{II}=', gt: g(r.cII), dv: 'kN/m2' },
      { nhan: 'Chiều sâu đặt móng:', ky: 'h=', gt: f(r.h, 2), dv: 'm' },
      { nhan: 'Chiều sâu đặt móng tính đổi:', ky: 'h_{tđ}=', gt: f(r.htd, 2), dv: 'm' },
      { nhan: 'Chiều sâu đến nền tầng hầm:', ky: 'h_{0}=', gt: f(r.h0, 2), dv: 'm' },
      { nhan: "Dung trọng đất dưới / trên đáy móng (γ_{II} / γ'_{II}):", gt: f(r.gammaII, 2) + ' / ' + f(r.gammaII2, 2) + ' kN/m3', gtRong: true },
      { nhan: 'Áp lực cho phép tác dụng lên nền ở đáy móng:', ky: 'R=', gt: f(r.R, 2), dv: 'kPa', gtDam: true }
    ]));
    out.push(dongKiemTra([
      { ky: 'p_{tc,tb}', trai: f(r.ptb, 1), dv: 'kPa', dau: '≤', phai: 'R = ' + f(r.R, 1), ok: r.ok1 },
      { ky: 'p_{tc,max}', trai: f(r.pmax, 1), dv: 'kPa', dau: '≤', phai: '1,2R = ' + f(1.2 * r.R, 1), ok: r.ok2 },
      { ky: 'p_{tc,min}', trai: f(r.pmin, 1), dv: 'kPa', dau: '≥', phai: '0', ok: r.ok3 }
    ]));
    out.push(muc('E. KIỂM TRA ĐỘ LÚN CỦA MÓNG'));
    out.push(p('Tính toán dựa trên phụ lục C, TCVN 9362:2012, phương pháp cộng lớp: S = β·Σ(p_{i}h_{i}/E_{i}) ≤ S_{max}, β = 0,8; ' +
      'E_{i} = [a + c(N_{SPT} + 6)]/10 (Tassios, Anagnostopoulos).', { indent: { left: 360 }, align: x.AlignmentType.JUSTIFIED }));
    out.push(bangThongSo([
      { nhan: 'Áp lực do trọng lượng bản thân đất tại mặt phẳng mũi cọc:', ky: 'p_{dz(0)}=', gt: f(r.pdz0, 2), dv: 'kPa' },
      { nhan: 'Áp lực phụ thêm tại mặt phẳng mũi cọc (p_{0} = p_{tc,tb} − p_{dz(0)}):', ky: 'p_{0}=', gt: f(r.p0, 2), dv: 'kPa' },
      { nhan: 'Chiều dày lớp phân tố (h_{i} = 0,2Y_{qu}):', ky: 'h_{i}=', gt: f(r.hi, 2), dv: 'm' }
    ]));
    out.push(bangDayDu(['Điểm', 'z (m)', 'Cao độ (m)', 'Lớp', 'E (MPa)', 'α', 'p_{0zi} (kPa)', 'p_{dzi} (kPa)'], r.diem.map(function (d, i) {
      return [String(i), f(d.z, 2), f(d.cao, 2), String(d.lop), f(d.E, 2), f(d.alpha, 3), f(d.p0z, 2), f(d.pdz, 2)];
    }), [800, 1100, 1300, 900, 1200, 1100, 1600, 1638], { giuChung: false }));
    out.push(bangThongSo([
      { nhan: 'Độ lún cuối cùng (ổn định) của móng:', ky: 'S=', gt: f(r.S, 2), dv: 'cm', kl: okKl(r.okS), gtDam: true },
      { nhan: 'Độ lún giới hạn:', ky: 'S_{max}=', gt: g(r.Smax), dv: 'cm' }
    ]));
    return out;
  }

  // ---------------- Chương II – Phần 2, mục A ----------------
  function phan2MucA(s, kq) {
    var x = D();
    var A = kq.A;
    var out = [phan('PHẦN 2. TÍNH TOÁN MÓNG CẨU THÁP', true), muc('A. THÔNG SỐ ĐẦU VÀO')];

    // A.1 – dòng tiêu đề: tên mục | tên cẩu (đỏ) | loại cẩu
    out.push(new x.Paragraph({
      keepNext: true,
      spacing: { before: 120, after: 80 },
      tabStops: [{ type: x.TabStopType.LEFT, position: 5600 }, { type: x.TabStopType.LEFT, position: 8000 }],
      children: chay('A.1. Thông số cẩu từ catalogue', { bold: true })
        .concat(chay('\t' + A.cau.ten, { color: MAU.nhap }))
        .concat(chay('\t' + (A.cau.loaiVI || '')))
    }));
    out.push(bangThongSo([
      { nhan: 'Chiều dài tay cần lớn nhất:', gt: g(A.chieuDaiTayCan), dv: 'm' },
      { nhan: 'Chiều cao tự đứng tính toán:', gt: g(Number(s.cau.chieuCao)), dv: 'm', nhap: true }
    ]));
    var nh = A.nhan;
    var cot = ['N', 'M', 'H', 'CR', 'T'].filter(function (k) { return nh[k] && nh[k] !== '-'; });
    var dvMap = { N: 'kN', M: 'kNm', H: 'kN', CR: 'kNm', T: 'kNm' };
    function giaTri(v) { return typeof v === 'number' ? f(v, 2) : '-'; }
    out.push(bangSo({
      tieuDe: cot.map(function (k) { return nh[k]; }),
      donVi: cot.map(function (k) { return dvMap[k]; }),
      hang: [
        { nhan: 'Khi cẩu làm việc:', gt: cot.map(function (k) { return giaTri(A.catalogue.lv[k]); }) },
        { nhan: 'Khi cẩu không làm việc:', gt: cot.map(function (k) { return giaTri(A.catalogue.klv[k]); }) }
      ]
    }));

    // A.2
    out.push(tieuMuc('A.2. Thông số cẩu tính toán'));
    out.push(p('n: Hệ số tầm quan trọng lấy bằng ' + g(A.n), { bold: true, italics: true }));
    out.push(p('Trong tính toán móng cẩu tháp để đảm bảo an toàn sau khi nhân các thông số tải trọng với hệ số tầm quan trọng n = ' + g(A.n),
      { bold: true, italics: true, align: x.AlignmentType.JUSTIFIED }));
    var q = A.quyDoi;
    out.push(bangSo({
      tieuDe: ['N_{qđ}', 'M_{qđ}', 'H_{qđ}'], donVi: ['kN', 'kNm', 'kN'],
      hang: [
        { nhan: 'Khi cẩu làm việc:', gt: [f(q.lv.N, 2), f(q.lv.M, 2), f(q.lv.H, 2)] },
        { nhan: 'Khi cẩu không làm việc:', gt: [f(q.klv.N, 2), f(q.klv.M, 2), f(q.klv.H, 2)] }
      ]
    }));

    // A.3
    var vl = A.vatLieu;
    out.push(tieuMuc('A.3. Vật liệu đài cọc'));
    out.push(bangThongSo([
      { nhan: 'Bê tông:', dam: true, gt: s.dai.beTong, nhap: true, thut: 0 },
      { nhan: 'Cường độ chịu nén tính toán:', ky: 'R_{b}=', gt: g(vl.Rb), dv: 'MPa', thut: 360 },
      { nhan: 'Cường độ chịu kéo tính toán:', ky: 'R_{bt}=', gt: g(vl.Rbt), dv: 'MPa', thut: 360 },
      { nhan: 'Modulus đàn hồi:', ky: 'E_{b}=', gt: g(vl.Eb), dv: 'MPa', thut: 360 },
      { nhan: 'Cốt thép:', dam: true, gt: s.dai.cotThep, nhap: true, thut: 0 },
      { nhan: 'Cường độ chịu kéo tính toán:', ky: 'R_{s}=', gt: g(vl.Rs), dv: 'MPa', thut: 360 },
      { nhan: 'Cường độ chịu nén tính toán:', ky: 'R_{sc}=', gt: g(vl.Rsc), dv: 'MPa', thut: 360 },
      { nhan: 'Khoảng bê tông bảo vệ tính tới trọng tâm cốt thép:', ky: 'a=', gt: g(vl.a_cm), dv: 'cm', nhap: true, thut: 360 }
    ], { thut: 0 }));

    // A.4
    var nl = A.ngoaiLuc;
    out.push(tieuMuc('A.4. Kích thước đài cọc'));
    out.push(bangThongSo([
      { nhan: 'Chiều dài đài móng:', ky: 'X=', gt: g(A.dai.X), dv: 'm', nhap: true },
      { nhan: 'Chiều rộng đài móng:', ky: 'Y=', gt: g(A.dai.Y), dv: 'm', nhap: true },
      { nhan: 'Chiều cao đài móng:', ky: 'H=', gt: g(A.dai.H), dv: 'm', nhap: true },
      { nhan: 'Trọng lượng tính toán đài móng (P = 25·X·Y·H·1,1):', ky: 'P=', gt: f(A.dai.P, 2), dv: 'kN' },
      { nhan: 'Tổng ngoại lực tính toán tác dụng lên móng qui tại trọng tâm đáy đài:' }
    ]));
    out.push(bangSo({
      tieuDe: ['M_{tt}', 'P_{tt}', 'H_{tt}'], donVi: ['kNm', 'kN', 'kN'],
      hang: [
        { nhan: 'Khi cẩu làm việc:', gt: [f(nl.lv.M, 2), f(nl.lv.P, 2), f(nl.lv.H, 2)] },
        { nhan: 'Khi cẩu không làm việc:', gt: [f(nl.klv.M, 2), f(nl.klv.P, 2), f(nl.klv.H, 2)] }
      ]
    }));
    out.push(p('M_{tt} = M_{qđ} + H_{qđ}·H ;   P_{tt} = N_{qđ} + P ;   H_{tt} = H_{qđ}', { italics: true, size: 22, indent: { left: 360 }, spacing: { before: 60 } }));
    return out;
  }

  // ---------------- Công thức phân số (bảng không viền, gạch phân số = viền dưới tử số) ----------------
  // items: chuỗi (ô thường, chiếm 2 dòng) hoặc { tu, mau } (phân số)
  function congThuc(items, opt) {
    var x = D();
    opt = opt || {};
    var giua = { align: x.AlignmentType.CENTER, spacing: { after: 0, line: 260 } };
    var cot = items.map(function (it) {
      var dai = typeof it === 'string' ? it.replace(/[_^]\{|\}/g, '').length : Math.max(String(it.tu).length, String(it.mau).length);
      return Math.max(360, dai * 140 + 260);
    });
    var tong = cot.reduce(function (a, b) { return a + b; }, 0);
    var thut = opt.thut || 0;
    if (thut) { cot.unshift(thut); }
    var vienTu = { top: KHONG_VIEN, left: KHONG_VIEN, right: KHONG_VIEN, bottom: VIEN };
    var h1 = [], h2 = [];
    if (thut) {
      h1.push(o(p('', giua), thut, { vien: false, rowSpan: 2 }));
    }
    items.forEach(function (it, i) {
      var w = cot[thut ? i + 1 : i];
      if (typeof it === 'string') {
        h1.push(o(p(it, Object.assign({ bold: opt.dam }, giua)), w, { vien: false, rowSpan: 2 }));
      } else {
        h1.push(o(p(it.tu, Object.assign({ bold: opt.dam }, giua)), w, { borders: vienTu, margins: { top: 0, bottom: 0, left: 40, right: 40 } }));
        h2.push(o(p(it.mau, Object.assign({ bold: opt.dam }, giua)), w, { vien: false, margins: { top: 0, bottom: 0, left: 40, right: 40 } }));
      }
    });
    if (!h2.length) h2.push(o(p('', giua), cot[cot.length - 1], { vien: false }));
    return bang([hangBang(h1), hangBang(h2)], cot, {
      align: opt.giua ? x.AlignmentType.CENTER : undefined,
      borders: { top: KHONG_VIEN, bottom: KHONG_VIEN, left: KHONG_VIEN, right: KHONG_VIEN, insideHorizontal: KHONG_VIEN, insideVertical: KHONG_VIEN }
    });
  }

  // Dòng kiểm tra: "Pmax = 3199 (kN) < 4243 (kN) OK" – bảng không viền
  function dongKiemTra(ds) {
    var x = D();
    var cot = [1300, 500, 1300, 900, 500, 1300, 900, 900];
    var tong = cot.reduce(function (a, b) { return a + b; }, 0);
    cot.unshift(RONG - tong);
    var hang = ds.map(function (r) {
      var c = { spacing: { after: 0, line: 276 } };
      var giua = Object.assign({ align: x.AlignmentType.CENTER }, c);
      return hangBang([
        o(p('', c), cot[0], { vien: false }),
        o(p(r.ky, c), cot[1], { vien: false }),
        o(p('=', giua), cot[2], { vien: false }),
        o(p(r.trai, Object.assign({ bold: true }, giua)), cot[3], { vien: false }),
        o(p('(' + r.dv + ')', c), cot[4], { vien: false }),
        o(p(r.dau, giua), cot[5], { vien: false }),
        o(p(r.phai, giua), cot[6], { vien: false }),
        o(p('(' + r.dv + ')', c), cot[7], { vien: false }),
        o(p(r.ok ? 'OK' : 'FAIL', Object.assign({ bold: true, color: r.ok ? MAU.ok : MAU.fail }, giua)), cot[8], { vien: false })
      ]);
    });
    return bang(hang, cot, { borders: { top: KHONG_VIEN, bottom: KHONG_VIEN, left: KHONG_VIEN, right: KHONG_VIEN, insideHorizontal: KHONG_VIEN, insideVertical: KHONG_VIEN } });
  }

  function okKl(ok) { return ok ? 'OK' : 'FAIL'; }

  // ---------------- Chương II – Phần 2, mục B ----------------
  function phan2MucB(s, kq) {
    var x = D();
    var B = kq.B;
    var out = [muc('B. KIỂM TRA TẢI TRỌNG TÁC DỤNG LÊN CỌC')];
    if (!B || !B.hopLe) { out.push(doan('Chưa đủ số liệu: ' + ((B && B.loi) || []).join('; '))); return out; }
    out.push(bangThongSo([
      { nhan: 'Số lượng cọc trong đài:', ky: 'n=', gt: String(B.n), dv: 'cọc' },
      { nhan: 'Sức chịu tải của cọc khi chịu nén:', ky: 'Q_{a}=', gt: f(B.Qa, 0), dv: 'kN' },
      { nhan: "Sức chịu tải của cọc khi chịu kéo:", ky: "Q_{a}'=", gt: f(B.QaKeo, 0), dv: 'kN' }
    ]));
    out.push(tieuMuc('Tải trọng:'));
    out.push(p('Tải trọng tác dụng lên cọc lớn nhất khi tay cần xoay theo phương đi qua tim cọc.', { indent: { left: 360 }, spacing: { after: 40 } }));
    out.push(p('Ở đây, tải trọng lớn nhất và nhỏ nhất tác dụng lên từng cọc có thể tính theo công thức:', { indent: { left: 360 } }));
    out.push(congThuc(['P_{imax/imin}=', { tu: 'N_{tt}', mau: 'n' }, '±', { tu: 'M×cosα×x_{max}', mau: 'Σx_{i}^{2}' }, '±',
      { tu: 'M×sinα×y_{max}', mau: 'Σy_{i}^{2}' }], { giua: true }));
    out.push(tieuMuc('Tọa độ từng cọc:'));
    var soCot = Math.max(B.n, 9);
    var w0 = 1000, wc = Math.floor((RONG - w0) / soCot);
    var cot = [w0].concat(new Array(soCot).fill(wc));
    var giua = { align: x.AlignmentType.CENTER, spacing: { after: 0, line: 260 }, keepNext: true };
    var nen = 'DCE6F1';
    function dong(nhan, ham, mau, fill) {
      var cells = [o(p(nhan, giua), w0)];
      for (var i = 0; i < soCot; i++) {
        var c = B.coc[i];
        cells.push(o(p(c ? ham(c) : '', Object.assign({ color: mau }, giua)), wc, { fill: fill }));
      }
      return hangBang(cells);
    }
    var hdr = [o(p('Dir', giua), w0)];
    for (var i = 0; i < soCot; i++) hdr.push(o(p(String(i + 1), giua), wc));
    out.push(bang([
      hangBang(hdr),
      dong('x_{i}', function (c) { return f(c.x, 3); }, MAU.nhap),
      dong('y_{i}', function (c) { return f(c.y, 3); }, MAU.nhap),
      dong('α_{i} (^{0})', function (c) { return f(c.alpha, 1); }),
      dong('P_{imax}', function (c) { return f(c.Pimax, 0); }, undefined, nen),
      dong('P_{imin}', function (c) { return f(c.Pimin, 0); }, undefined, nen)
    ], cot));
    out.push(p('Tải trọng lớn nhất và nhỏ nhất tác dụng lên cọc:', { indent: { left: 360 }, spacing: { before: 120, after: 40 }, keepNext: true }));
    out.push(dongKiemTra([
      { ky: 'P_{max}', trai: f(B.Pmax, 0), dv: 'kN', dau: B.Pmax < B.Qa ? '<' : '>', phai: f(B.Qa, 0), ok: B.kiemTraNen.ok },
      { ky: 'P_{min}', trai: f(B.Pmin, 0), dv: 'kN', dau: B.Pmin < B.QaKeo ? '<' : '>', phai: f(B.QaKeo, 0), ok: B.kiemTraKeo.ok }
    ]));
    return out;
  }

  // ---------------- Mục C – xuyên thủng (app tính đầy đủ) ----------------
  function phan2MucC(s, kq) {
    var x = D();
    var C = kq.C;
    var out = [muc('C. KIỂM TRA XUYÊN THỦNG CHO ĐÀI MÓNG')];
    if (!C || !C.hopLe) { out.push(doan('Chưa đủ số liệu: ' + ((C && C.loi) || []).join('; '))); return out; }
    out.push(bangThongSo([
      { nhan: 'Kích thước chân cẩu tháp:', ky: 'H_{t}=', gt: f(C.Ht, 1), dv: 'm' },
      { nhan: 'Chiều cao làm việc của đài (h_{0} = H − a):', ky: 'h_{0}=', gt: f(C.h0, 2), dv: 'm' },
      { nhan: 'Cạnh đáy tháp xuyên 45° tại cao trình cốt thép chịu kéo (B_{xt} = H_{t} + 2h_{0}):', ky: 'B_{xt}=', gt: f(C.Bxt, 2), dv: 'm' }
    ]));
    out.push(p('Cọc không nằm trọn trong đáy tháp xuyên thì phản lực của cọc đó gây xuyên thủng cho đài (lấy toàn bộ phản lực của cọc):',
      { indent: { left: 360 }, align: x.AlignmentType.JUSTIFIED, keepNext: true }));
    out.push(bangDayDu(['Cọc', '|x_{i}|+D/2 (m)', '|y_{i}|+D/2 (m)', 'Vị trí so với tháp xuyên', 'P_{imax} (kN)', 'Tính vào F (kN)'],
      C.coc.map(function (c) {
        return [String(c.stt), f(c.mepX, 2), f(c.mepY, 2), c.trongThap ? 'Nằm trong' : 'Nằm ngoài', f(c.Pimax, 0), f(c.F, 0)];
      }), [800, 1500, 1500, 2638, 1600, 1600]));
    if (C.baoTrumTatCa) {
      out.push(p('Tháp xuyên bao trùm tất cả các đầu cọc nên lực gây xuyên thủng F = 0.', { indent: { left: 360 }, spacing: { before: 100 } }));
    }
    out.push(bangThongSo([
      { nhan: 'Lực gây xuyên thủng (F = ΣP_{imax} các cọc nằm ngoài tháp xuyên):', ky: 'F=', gt: f(C.F, 0), dv: 'kN' },
      { nhan: 'Chu vi đường bao tính toán cách mép chân cẩu h_{0}/2 (u = 4(H_{t} + h_{0})):', ky: 'u=', gt: f(C.u, 2), dv: 'm' },
      { nhan: 'Khả năng chống xuyên thủng của đài (mục 8.1.6.2.1 TCVN 5574:2018):' },
      { nhan: 'F_{b,ult} = R_{bt}·u·h_{0}', thut: 720, ky: 'F_{b,ult}=', gt: f(C.Fbult, 0), dv: 'kN', kl: okKl(C.ok) }
    ]));
    return out;
  }

  // ---------------- Mục D – cốt thép đài ----------------
  function bangThepBC(Dd, keys) {
    var x = D();
    var cot = [1100, 1250, 1050, 1050, 1250, 800, 800, 1300, 1038];
    var g0 = { align: x.AlignmentType.CENTER, spacing: { after: 0, line: 260 }, keepNext: true };
    var b = function (t) { return p(t, Object.assign({ bold: true }, g0)); };
    var hang = [
      hangBang([o(b('Phương'), cot[0], { rowSpan: 3 }), o(b('M_{tt}'), cot[1], { rowSpan: 2 }), o(b('α'), cot[2], { rowSpan: 3 }),
        o(b('ξ'), cot[3], { rowSpan: 3 }), o(b('A_{s,cal}'), cot[4], { rowSpan: 2 }), o(b('Thép chọn'), cot[5] + cot[6], { span: 2 }),
        o(b('A_{s,design}'), cot[7], { rowSpan: 2 }), o(b('Kiểm tra'), cot[8], { rowSpan: 3 })]),
      hangBang([o(b('d'), cot[5]), o(b('a'), cot[6])]),
      hangBang([o(b('kNm/m'), cot[1]), o(b('mm2/m'), cot[4]), o(b('mm'), cot[5]), o(b('mm'), cot[6]), o(b('mm2/m'), cot[7])])
    ];
    keys.forEach(function (k) {
      var t = Dd[k];
      hang.push(hangBang([
        o(p(k.slice(-1), g0), cot[0]), o(p(f(t.M, 1), g0), cot[1]), o(p(f(t.alpha, 3), g0), cot[2]), o(p(f(t.xi, 3), g0), cot[3]),
        o(p(t.duTietDien ? f(t.As, 0) : 'αm>0.5', g0), cot[4]),
        o(p(g(t.d), Object.assign({ color: MAU.nhap }, g0)), cot[5]), o(p(g(t.s), Object.assign({ color: MAU.nhap }, g0)), cot[6]),
        o(p(f(t.AsChon, 0), g0), cot[7]),
        o(p(okKl(t.ok), Object.assign({ bold: true, color: t.ok ? MAU.ok : MAU.fail }, g0)), cot[8])
      ]));
    });
    return bang(hang, cot);
  }

  function phan2MucD(s, kq) {
    var x = D();
    var Dd = kq.D;
    var out = [muc('D. TÍNH CỐT THÉP CHO ĐÀI MÓNG')];
    if (!Dd || !Dd.hopLe) { out.push(doan('Chưa đủ số liệu: ' + ((Dd && Dd.loi) || []).join('; '))); return out; }
    out.push(p('Thiên về an toàn, moment trong đài móng được tính với hàng cọc có phản lực P = P_{imax/imin}', { indent: { left: 360 } }));
    out.push(p('α_{m} = M/(R_{b}·b·h_{0}^{2});   ξ = 1 − √(1 − 2α_{m});   A_{s} = ξ·R_{b}·b·h_{0}/R_{s};   b = 1000 mm',
      { italics: true, size: 22, indent: { left: 360 } }));
    out.push(tieuMuc('Với thép lớp dưới:'));
    out.push(p('M = ΣQ_{tti}×l_{i}  =  ΣP_{imax}×l_{o}', { bold: true, align: x.AlignmentType.CENTER, keepNext: true }));
    out.push(bangThepBC(Dd, ['duoiX', 'duoiY']));
    out.push(tieuMuc('Với thép lớp trên:'));
    out.push(p('M = ΣQ_{tti}×l_{i}  =  ΣP_{imin}×l_{o}', { bold: true, align: x.AlignmentType.CENTER, keepNext: true }));
    out.push(bangThepBC(Dd, ['trenX', 'trenY']));
    return out;
  }

  // ---------------- Mục E – bulong ----------------
  function phan2MucE(s, kq) {
    var x = D();
    var E = kq.E;
    var out = [muc('E. KIỂM TRA BULONG')];
    if (!E || !E.hopLe) { out.push(doan('Chưa đủ số liệu: ' + ((E && E.loi) || []).join('; '))); return out; }
    out.push(tieuMuc('E.1. Thông số bulong'));
    out.push(bangThongSo([
      { nhan: 'Đường kính bulong:', ky: 'd_{bl}=', gt: g(E.d), dv: 'mm', nhap: true },
      { nhan: 'Chất lượng, độ chính xác bulong:', ky: '', gt: E.loai, nhap: true, gtRong: true },
      { nhan: 'Diện tích danh định bulong:', ky: 'A=', gt: f(E.A, 2), dv: 'cm2' },
      { nhan: 'Diện tích giảm yếu bulong:', ky: 'A_{bn}=', gt: f(E.Abn, 2), dv: 'cm2' },
      { nhan: 'Cấp độ bền bulong:', ky: 'Grade =', gt: g(E.capBen), dv: '', nhap: true },
      { nhan: 'Cường độ chịu cắt của bulong:', ky: 'f_{vb}=', gt: g(E.fvb), dv: 'MPa' },
      { nhan: 'Cường độ chịu kéo của bulong:', ky: 'f_{ba}=', gt: g(E.fba), dv: 'MPa' },
      { nhan: 'Cường độ chịu ép mặt của bulong:', ky: 'f_{cb}=', gt: g(E.fcb), dv: 'MPa', nhap: true },
      { nhan: 'Số lượng bulong:', ky: 'n=', gt: g(E.n), dv: 'con', nhap: true }
    ]));

    out.push(tieuMuc('E.2. Kiểm tra chiều dài bulong'));
    out.push(bangThongSo([
      { nhan: 'Tổng chiều dài của bulong (bao gồm cả đoạn bẻ móc):', ky: 'L_{1}+L_{2}=', gt: g(E.L1L2), dv: 'mm', nhap: true },
      { nhan: 'Chiều dài của bulong nằm trong bê tông:', ky: 'L_{1}=', gt: g(E.L1), dv: 'mm' },
      { nhan: 'Chiều dài đoạn bulong bẻ móc:', ky: 'L_{2}=', gt: g(E.L2), dv: 'mm', nhap: true },
      { nhan: 'Chiều dài đoạn bulong trên mặt móng:', ky: 'L_{3}=', gt: g(E.L3), dv: 'mm', nhap: true },
      { nhan: 'Hệ số điều kiện làm việc của bulong:', ky: 'γ_{b}=', gt: g(E.gammaB), dv: '' },
      { nhan: 'Chiều dài neo yêu cầu của bulong' },
      { nhan: 'H_{0}=25d_{bl}.m_{1}.m_{2} ; m_{1}=R_{bt}(B12,5)/R_{bt} ; m_{2}=f_{yb}/235 (Bảng L.1, CT L.10 TCVN 5575:2024)', thut: 720,
        ky: 'H_{0}=', gt: f(E.H0, 0), dv: 'mm', kl: okKl(E.kiemTra.neo) },
      { nhan: 'Trong đó:', thut: 720, nghieng: true, ky: 'η_{1}=', gt: g(E.eta1), dv: '(bulong trơn)', nhap: true },
      { nhan: '', ky: 'η_{2}=', gt: g(E.eta2), dv: '(d_{bl} ≥ 36mm)', nhap: true },
      { nhan: '', ky: 'α_{1}=', gt: g(E.alpha1), dv: '(bulong trơn có móc, chịu kéo)', nhap: true }
    ]));

    out.push(tieuMuc('E.3. Kiểm tra bulong chịu kéo'));
    out.push(bangThongSo([
      { nhan: 'Lực nhổ lớn nhất theo catalogue tại 1 chân cẩu tháp:', ky: 'P_{ct}=', gt: f(E.Pct, 1), dv: 'kN' },
      { nhan: 'Lực nhổ tính toán lớn nhất tại 1 chân cẩu tháp:', ky: 'P_{t}=', gt: f(E.Pt, 1), dv: 'kN' },
      { nhan: 'Lực nhổ tính toán lớn nhất tại 1 bulong:', ky: 'P_{t}/1bl=', gt: f(E.Pt1, 1), dv: 'kN' },
      { nhan: 'Khả năng chịu kéo của 1 bulong neo (mục L.4.2, Phụ lục L TCVN 5575:2024), hệ số tải trọng:', ky: 'k_{0}=', gt: g(E.k0), dv: '(tải trọng động)', nhap: true },
      { nhan: '[N]_{tb}=f_{ba}.A_{bn}/k_{0}', thut: 720, ky: '[N]_{tb}=', gt: f(E.Ntb, 1), dv: 'kN', kl: okKl(E.kiemTra.keo) }
    ]));

    out.push(tieuMuc('E.4. Kiểm tra bulong chịu tuột'));
    out.push(bangThongSo([
      { nhan: 'Cường độ bám dính tính toán của bulong với bê tông (CT 256, mục 10.3.5.4 TCVN 5574:2018):', ky: 'R_{bond}=', gt: f(E.Rbond, 2), dv: 'MPa' },
      { nhan: 'Khả năng chịu tuột của 1 bulong (mục 10.3.5.6 TCVN 5574:2018):' },
      { nhan: '[N]=π.d_{bl}.(L_{1}+L_{2}).R_{bond}', thut: 720, ky: '[N]=', gt: f(E.Ntuot, 1), dv: 'kN', kl: okKl(E.kiemTra.tuot) }
    ]));

    out.push(tieuMuc('E.5. Kiểm tra bulong chịu cắt'));
    out.push(p('Lực cắt lớn nhất tại 1 chân cẩu tháp theo catalogue:', { indent: { left: 360 }, keepNext: true }));
    out.push(congThuc(['-  Khi cẩu làm việc:', 'P_{stc1}=', { tu: E.nhanFh, mau: '2' }, '+', { tu: E.nhanT, mau: 'H_{t}' }, '=', f(E.Pstc1, 1), 'kN'], { thut: 360 }));
    out.push(congThuc(['-  Khi cẩu không làm việc:', 'P_{stc2}=', { tu: E.nhanFh, mau: '2' }, '=', f(E.Pstc2, 1), 'kN'], { thut: 360 }));
    out.push(bangThongSo([
      { nhan: 'Lực cắt tiêu chuẩn lớn nhất tại 1 chân cẩu tháp:', ky: 'P_{stc}=', gt: f(E.Pstc, 1), dv: 'kN' },
      { nhan: 'Lực cắt tính toán lớn nhất tại 1 chân cẩu tháp:', ky: 'P_{s}=', gt: f(E.Ps, 1), dv: 'kN' },
      { nhan: 'Lực cắt tính toán lớn nhất tại 1 bulong:', ky: 'P_{s}/1bl=', gt: f(E.Ps1, 1), dv: 'kN' },
      { nhan: 'Số lượng mặt cắt tính toán:', ky: 'n_{v}=', gt: g(E.nv), dv: '', nhap: true },
      { nhan: 'Khả năng chịu cắt của 1 bulong (CT 186, mục 14.2.9 TCVN 5575:2024):' },
      { nhan: '[N]_{vb}=f_{vb}γ_{b}An_{v}', thut: 720, ky: '[N]_{vb}=', gt: f(E.Nvb, 1), dv: 'kN', kl: okKl(E.kiemTra.cat) }
    ]));

    out.push(tieuMuc('E.6. Kiểm tra bulong chịu ép mặt'));
    out.push(bangThongSo([
      { nhan: 'Lực ép mặt tính toán lớn nhất tại 1 bulong:', ky: 'P_{s}/1bl=', gt: f(E.Ps1, 1), dv: 'kN' },
      { nhan: 'Tổng chiều dày các bản thép cùng trượt về một phía:', ky: 'Σt=', gt: g(E.tongT), dv: 'mm' },
      { nhan: 'Khả năng chịu ép mặt của 1 bulong (CT 187, mục 14.2.9 TCVN 5575:2024):' },
      { nhan: '[N]_{cb}=f_{cb}γ_{b}dΣt', thut: 720, ky: '[N]_{cb}=', gt: f(E.Ncb, 1), dv: 'kN', kl: okKl(E.kiemTra.epMat) }
    ]));

    out.push(tieuMuc('E.7. Kiểm tra chọc thủng của 1 cụm bulong'));
    out.push(bangThongSo([
      { nhan: 'Đường kính đáy bé tháp chọc thủng:', ky: 'D_{1}=', gt: f(E.D1, 2), dv: 'm' },
      { nhan: 'Đường kính đáy lớn tháp chọc thủng:', ky: 'D_{2}=', gt: f(E.D2, 2), dv: 'm' },
      { nhan: 'Lực gây chọc thủng của 1 cụm bu lông:', ky: 'P_{xt}=', gt: f(E.Pxt, 1), dv: 'kN' },
      { nhan: 'Khả năng chống chọc thủng của 1 cụm bu lông (mục 8.1.6.2.1 TCVN 5574:2018):' },
      { nhan: '[P]_{xt}=0.4×R_{bt}.L_{1}.π(D_{1}+D_{2})/2', thut: 720, ky: '[P]_{xt}=', gt: f(E.PxtGh, 1), dv: 'kN', kl: okKl(E.kiemTra.chocThung) }
    ]));
    return out;
  }

  function phan2MucF(s, kq) {
    var F = kq.F;
    var out = [muc('F. KẾT LUẬN')];
    if (!F || !F.hopLe) { out.push(doan('Chưa đủ số liệu để kết luận.')); return out; }
    out.push(p(F.ketLuan, { bold: true, color: F.ok ? MAU.ok : MAU.fail, indent: { left: 360 }, spacing: { before: 60 } }));
    return out;
  }

  // =============== PHƯƠNG PHÁP ETABS ===============
  // Giữ khung CC1 (trang bìa, khung tiêu đề, trang ký, mục lục); phần thân đặt đầu mục như phụ lục tính toán của báo cáo
  // thẩm tra "260917_MD3_1_BCTT mong cau thap FULL": 1 Cơ sở tính toán · 2 Thông số đầu vào · 3 Mô hình tính toán ·
  // 4 Kết quả nội lực · 5 Sức chịu tải cọc · 6 Tính toán móng cẩu tháp (cọc, đài, bulong, ổn định – lún) · 7 Kết luận, kiến nghị.
  // Có các ô trống để dán hình chụp từ ETABS (lực đặt lên móng, nội lực cọc BAO-MIN/MAX, chuyển vị, mômen / lực cắt đài).
  // kq.etabs = { m, t, kE, F } do app gắn khi chọn phương pháp ETABS.
  function etabsCua(s, kq) {
    return s.tinhToan && s.tinhToan.phuongPhap === 'etabs' && kq.etabs && kq.etabs.kE && kq.etabs.kE.hopLe ? kq.etabs : null;
  }

  function gach(text) { return p('-\t' + text, { indent: { left: 720, hanging: 360 }, spacing: { after: 60, line: 312 }, align: D().AlignmentType.JUSTIFIED }); }
  function cham(text) { return p('•\t' + text, { indent: { left: 720, hanging: 360 }, spacing: { after: 60, line: 312 }, align: D().AlignmentType.JUSTIFIED }); }

  // Nhiều ảnh cạnh nhau trên một dòng
  function hinhNgang(ds, rongPx, goiY, chuThichHinh) {
    var x = D();
    var co = ds.filter(function (h) { return h && h.data; });
    var out = [];
    if (!co.length) out.push(oHinh(goiY + ' (biểu đồ được chèn khi xuất từ app trong trình duyệt)', 2600));
    else {
      var runs = [];
      co.forEach(function (h, i) {
        if (i) runs.push(new x.TextRun({ text: '   ' }));
        runs.push(new x.ImageRun({ type: 'png', data: h.data, transformation: { width: rongPx, height: Math.round(rongPx * h.h / h.w) } }));
      });
      out.push(new x.Paragraph({ alignment: x.AlignmentType.CENTER, keepNext: true, spacing: { before: 80, after: 40 }, children: runs }));
    }
    if (chuThichHinh) out.push(chuThich(chuThichHinh));
    return out;
  }

  // Ô trống dán hình chụp ETABS: gợi ý cách chụp + giá trị app tính để đối chiếu
  function oDanHinh(cachChup, giaTri, caoTwip, chuThichHinh) {
    var x = D();
    var noiDung = [p('Dán hình chụp từ ETABS', { bold: true, color: MAU.xam, align: x.AlignmentType.CENTER, spacing: { after: 40 }, keepNext: true }),
      p(cachChup, { italics: true, size: 20, color: MAU.xam, align: x.AlignmentType.CENTER, spacing: { after: 40 }, keepNext: true })];
    if (giaTri) noiDung.push(p(giaTri, { size: 20, color: MAU.xam, align: x.AlignmentType.CENTER, spacing: { after: 0 }, keepNext: true }));
    var net = { style: 'dashed', size: 4, color: '7F7F7F' };
    return [bang([hangBang([o(noiDung, RONG, { borders: { top: net, bottom: net, left: net, right: net } })], { cao: caoTwip || 4200 })], [RONG])]
      .concat(chuThichHinh ? [chuThich(chuThichHinh)] : []);
  }

  // Bảng nội lực cọc như báo cáo thẩm tra: 5 cột (P, M2-2, M3-3, V2-2, V3-3), mỗi cột một ô dán hình chụp ETABS
  function bangDanHinhNoiLuc(tenBang, tieuDeCot, ghiChuDuoi, caoTwip) {
    var x = D(), n = tieuDeCot.length, w = Math.floor(RONG / n);
    var cot = tieuDeCot.map(function (t, i) { return i < n - 1 ? w : RONG - w * (n - 1); });
    var giua = { align: x.AlignmentType.CENTER, spacing: { after: 0, line: 260 }, keepNext: true };
    var hang = [hangBang(tieuDeCot.map(function (t, i) {
      return o(t.split('\n').map(function (d) { return p(d, Object.assign({ bold: true }, giua)); }), cot[i], { fill: 'F2F2F2' });
    }), { header: true })];
    hang.push(hangBang(cot.map(function (wc) {
      return o(p('Dán hình', { italics: true, size: 18, color: MAU.xam, align: x.AlignmentType.CENTER, spacing: { after: 0 } }), wc, { vAlign: x.VerticalAlign.CENTER });
    }), { cao: caoTwip || 9000 }));
    hang.push(hangBang([o(p(ghiChuDuoi, { bold: true, spacing: { after: 0 } }), RONG, { span: n })]));
    return [p(tenBang, { bold: true, italics: true, align: x.AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 } }),
      bang(hang, cot, { align: x.AlignmentType.CENTER })];
  }

  function cocChinh(E) {   // cọc có mômen lớn nhất – dùng cho biểu đồ bao
    var ck = E.kE.cocKiemTra;
    return E.kE.coc.filter(function (c) { return ck.Mmax && c.ten === ck.Mmax.coc; })[0] || E.kE.coc[0];
  }

  function thuyetMinhEtabs(s, kq, hinh, E, tenTM) {
    var tenCau = s.duAn.tenMong + ' – ' + kq.A.cau.ten;
    return chuong('TÍNH TOÁN MÓNG CẨU THÁP ' + tenTM)
      .concat(etabsCoSo(s, kq))
      .concat(etabsDauVao(s, kq, hinh, E, tenCau))
      .concat(etabsMoHinh(s, kq, hinh, E, tenCau))
      .concat(etabsNoiLuc(s, kq, hinh, E, tenCau))
      .concat(etabsSucChiuTai(s, kq, hinh))
      .concat(etabsMong(s, kq, hinh, E, tenCau))
      .concat(etabsKetLuan(s, kq, E, tenCau));
  }

  // 1. CƠ SỞ TÍNH TOÁN
  function etabsCoSo(s) {
    var out = [tieuDe('1. CƠ SỞ TÍNH TOÁN', 2, true)];
    out.push(doan('Thuyết minh tính toán dựa trên các tài liệu, tiêu chuẩn sau:'));
    out = out.concat(gachDau(s.baoCao.coSo)).concat(gachDau(s.baoCao.tieuChuan));
    out.push(doan('Phần mềm áp dụng:'));
    var phanMem = s.baoCao.phanMem || '';
    if (!/etabs/i.test(phanMem)) phanMem += '\nETABS (Computers and Structures, Inc.) – phân tích mô hình móng cọc cẩu tháp.';
    return out.concat(gachDau(phanMem));
  }

  // 2. THÔNG SỐ ĐẦU VÀO
  function etabsDauVao(s, kq, hinh, E, tenCau) {
    var x = D(), A = kq.A, vl = A.vatLieu, S = kq.SCT, t = E.t;
    var out = [tieuDe('2. THÔNG SỐ ĐẦU VÀO', 2, true), tieuDe('2.1. Thông số vật liệu', 3)];
    var cungBt = S && S.hopLe && S.vatLieu.beTong === s.dai.beTong;
    out.push(cham('Bê tông cấp độ bền ' + s.dai.beTong + ' cho đài móng' + (cungBt ? ', cọc cẩu tháp' : '') + ': R_{b} = ' + g(vl.Rb) +
      ' MPa; R_{bt} = ' + g(vl.Rbt) + ' MPa; E_{b} = ' + g(vl.Eb) + ' MPa.'));
    if (S && S.hopLe && !cungBt) {
      out.push(cham('Bê tông cọc cấp độ bền ' + S.vatLieu.beTong + ': R_{b} = ' + g(S.vatLieu.Rb) + ' MPa; R_{bt} = ' + g(S.vatLieu.Rbt) +
        ' MPa; E_{b} = ' + g(S.vatLieu.E) + ' MPa.'));
    }
    out.push(cham('Cốt thép đài móng ' + s.dai.cotThep + ': R_{s} = ' + g(vl.Rs) + ' MPa; R_{sc} = ' + g(vl.Rsc) + ' MPa; E_{s} = ' +
      g(vl.cotThep && vl.cotThep.Es) + ' MPa. Khoảng cách từ mép bê tông tới trọng tâm cốt thép a = ' + g(vl.a_cm) + ' cm.'));
    if (S && S.hopLe) out.push(cham('Cốt thép cọc ' + S.vatLieu.cotThep + ': R_{s} = ' + g(S.vatLieu.Rs) + ' MPa; R_{sc} = ' + g(S.vatLieu.Rsc) + ' MPa.'));
    out.push(cham('Đài móng: X × Y × H = ' + g(A.dai.X) + ' × ' + g(A.dai.Y) + ' × ' + g(A.dai.H) + ' m; ' + E.m.thongSo.soCoc +
      ' cọc khoan nhồi D' + g(E.m.thongSo.D * 1000) + ' mm, mũi cọc cao độ ' + f(E.m.thongSo.zMui, 2) + ' m.'));

    out.push(tieuDe('2.2. Thông số cẩu tháp', 3));
    out.push(tieuMuc(tenCau));
    out = out.concat(thongSoCau(s, kq, { bangTai: 'Bảng 2.1', hinh: 'Hình 2.1', bangCau: 'Bảng 2.2' },
      'Dán hình catalogue tải trọng cẩu tháp ' + A.cau.ten + ' (bảng phản lực chân đế, sơ đồ cẩu) – như Hình 2.1 báo cáo thẩm tra'));
    out.push(tieuMuc('Tải trọng tính toán (nhân hệ số an toàn n = ' + g(A.n) + ')'));
    var q = A.quyDoi;
    out.push(bangSo({
      tieuDe: ['N_{qđ}', 'M_{qđ}', 'H_{qđ}'], donVi: ['kN', 'kNm', 'kN'],
      hang: [
        { nhan: 'Khi cẩu làm việc:', gt: [f(q.lv.N, 2), f(q.lv.M, 2), f(q.lv.H, 2)] },
        { nhan: 'Khi cẩu không làm việc:', gt: [f(q.klv.N, 2), f(q.klv.M, 2), f(q.klv.H, 2)] }
      ]
    }));

    // 2.3 Tổ hợp tải trọng
    out.push(tieuDe('2.3. Tổ hợp tải trọng', 3));
    out.push(doan('Tải trọng cẩu tháp đặt tại tâm đài, tách theo thành phần. Giá trị bằng tải quy đổi ở mục 2.2 chia hệ số n = ' + g(t.n) +
      ' (tổ hợp nhân lại n). Mômen đặt tại tâm đài cộng thêm H × ' + g(t.tayDon) + ' m do tải trọng cẩu tháp đặt tại mặt đài còn điểm đặt tải ở mặt phẳng giữa đài.'));
    var TP = ['F_{X}', 'F_{Y}', 'F_{Z}', 'M_{X}', 'M_{Y}', 'M_{Z}'];
    out.push(bangDayDu(['Load pattern', 'Nội dung', 'Thành phần', 'Giá trị'],
      t.mauTai.map(function (pt) {
        var k = pt.luc ? pt.luc.giaTri.map(function (v, i) { return v ? i : -1; }).filter(function (i) { return i >= 0; })[0] : -1;
        return [pt.ten, pt.moTa, pt.luc ? TP[k] : 'Bản thân', pt.luc ? f(pt.luc.giaTri[k], 2) + (k < 3 ? ' kN' : ' kNm') : '× ' + g(pt.banThan)];
      }), [1500, 4638, 1500, 2000], { canhTrai: [1], fillTieuDe: 'F2F2F2' }));
    out.push(chuThich('Bảng 2.3 Tải trọng tác dụng tại tâm đài (load pattern)'));
    out.push(doan('Tổ hợp theo hướng θ của tải trọng (θ đo từ trục X ngược chiều kim đồng hồ; lực ngang và mômen lật cùng hướng θ): ' +
      g(t.thongKe.soHuong) + ' hướng gồm 8 hướng mỗi 45° và hướng bất lợi của từng cọc (hướng từ tâm đài tới cọc: cọc nén nhiều nhất; ' +
      'hướng ngược lại: cọc kéo nhiều nhất). Hệ số: tĩnh tải ' + g(t.heSo.tinhTaiNen) + ' (cọc nén) / ' + g(t.heSo.tinhTaiKeo) +
      ' (cọc kéo); lực đứng của cẩu ' + g(t.n) + ' (cọc nén) / ' + g(t.heSo.fzKeo) + ' (cọc kéo); lực ngang, mômen nhân n·cosθ, n·sinθ.'));
    var coMZ = t.mauTai.some(function (pt) { return pt.ten === 'MZ1'; });
    [['lv', null, 'Trường hợp cẩu tháp làm việc:'], ['lv', 'nen', 'Các tổ hợp tính toán cho cọc chịu nén/Load combinations for compressed piles', '1'],
      ['lv', 'keo', 'Các tổ hợp tính toán cho cọc chịu kéo/Load combinations for tension piles', '1'], ['klv', null, 'Trường hợp cẩu tháp không làm việc:'],
      ['klv', 'nen', 'Các tổ hợp tính toán cho cọc chịu nén/Load combinations for compressed piles', '2'],
      ['klv', 'keo', 'Các tổ hợp tính toán cho cọc chịu kéo/Load combinations for tension piles', '2']].forEach(function (nh) {
      if (!nh[1]) { out.push(p(nh[2], { bold: true, italics: true, keepNext: true, spacing: { before: 120, after: 40 } })); return; }
      var ca = ['DEAD', 'FX', 'FY', 'FZ', 'MX', 'MY'].map(function (c) { return c === 'DEAD' ? c : c + nh[3]; });
      if (nh[0] === 'lv' && coMZ) ca.push('MZ1');
      var ds = t.toHop.filter(function (c) { return c.trangThai === nh[0] && c.kieu === nh[1]; });
      var wTen = 2150, wGoc = 1000, wc = Math.floor((RONG - wTen - wGoc) / ca.length);
      out.push(p(nh[2], { keepNext: true, spacing: { after: 40 }, size: 22 }));
      out.push(bangDayDu(['Combo', 'θ (°)'].concat(ca), ds.map(function (c) {
        return [c.ten, f(c.goc, 2)].concat(ca.map(function (k) {
          var x2 = c.ds.filter(function (d) { return d.ca === k; })[0];
          return x2 ? f(x2.heSo, 3) : '0';
        }));
      }), [wTen, wGoc].concat(new Array(ca.length).fill(wc)), { fillTieuDe: 'F4B183' }));
    });
    out.push(p('BAO = ENVELOPE (' + t.toHop.filter(function (c) { return c.loai === 0; }).map(function (c) { return c.ten; }).slice(0, 2).join(', ') +
      ', …, ' + t.toHop[t.toHop.length - 2].ten + ')', { bold: true, align: x.AlignmentType.CENTER, spacing: { before: 100 } }));
    out.push(p('Trong đó:', { italics: true, keepNext: true, spacing: { after: 40 } }));
    out.push(cham('DEAD – trọng lượng bản thân của đài móng và cọc;'));
    out.push(cham('FX1, FX2, FY1, FY2 – tải trọng theo phương ngang X và Y, giá trị bằng lực cắt H ở trạng thái làm việc và không làm việc (kN);'));
    out.push(cham('FZ1, FZ2 – tải trọng theo phương đứng, giá trị bằng lực dọc N ở trạng thái làm việc và không làm việc (kN);'));
    out.push(cham('MX1, MY1, MX2, MY2 – mômen theo phương X và Y, giá trị bằng mômen M ở trạng thái làm việc và không làm việc (kNm);'));
    if (coMZ) out.push(cham('MZ1 – mômen xoắn ở trạng thái làm việc (kNm).'));

    // 2.4 Số liệu địa chất
    var hk = kq.DC && kq.DC.hopLe ? kq.DC.hoKhoan : '…';
    out.push(tieuDe('2.4. Số liệu địa chất', 3));
    out = out.concat(oDanHinh('Mặt bằng vị trí các hố khoan (báo cáo khảo sát địa chất)', '', 4200, 'Hình 2.2 Mặt bằng hố khoan'));
    out = out.concat(oDanHinh('Mặt bằng bố trí cẩu tháp trên công trình', '', 4200, 'Hình 2.3 Mặt bằng bố trí cẩu tháp'));
    out.push(doan('Dựa trên điều kiện địa chất và vị trí cẩu, chọn địa chất hố khoan ' + hk + ' để tính toán móng cẩu tháp ' + s.duAn.tenMong +
      '. Số liệu các lớp đất và chỉ số SPT dùng tính toán: xem mục 5.1.'));
    out = out.concat(oDanHinh('Hình trụ hố khoan ' + hk + ' (báo cáo khảo sát địa chất)', '', 9000, 'Hình 2.4 Hình trụ hố khoan ' + hk));
    return out;
  }

  // 3. MÔ HÌNH TÍNH TOÁN
  function etabsMoHinh(s, kq, hinh, E, tenCau) {
    var m = E.m, t = E.t, ts = m.thongSo;
    var out = [tieuDe('3. MÔ HÌNH TÍNH TOÁN', 2, true)];
    out.push(doan('Sử dụng phần mềm ETABS kết hợp với các thông số đầu vào để kiểm tra khả năng chịu lực của móng cẩu tháp. Mô hình gồm:'));
    out.push(gach('Đài móng: phần tử tấm vỏ dày (thick shell) kích thước ' + g(ts.X) + ' × ' + g(ts.Y) + ' m, dày H = ' + g(ts.H) +
      ' m, đặt tại mặt phẳng giữa đài (cao độ ' + f(ts.zGiua, 2) + ' m); lưới chia ' + (ts.nx - 1) + ' × ' + (ts.ny - 1) + ' ô (≤ ' + g(ts.luoi) + ' m).'));
    out.push(gach('Cọc: ' + ts.soCoc + ' cọc, phần tử thanh tiết diện tròn D = ' + g(ts.D * 1000) + ' mm, chia đoạn ' + g(ts.buocCoc) +
      ' m từ đáy đài (cao độ ' + f(ts.zDay, 2) + ' m) tới mũi cọc (cao độ ' + f(ts.zMui, 2) + ' m); đoạn cọc nằm trong đài mô hình bằng thanh cứng.'));
    out.push(gach('Đất nền: lò xo ngang tại các nút cọc, độ cứng K = k·z·b_{p}·l (TCVN 10304:2025, phụ lục A); k là hệ số nền tỉ lệ của lớp đất (bảng A.1), ' +
      'z tính từ ' + (ts.batDauLoXo === 'day-ho' ? 'đáy hố đào' : 'đáy đài') + ' (cao độ ' + f(ts.zBatDau, 2) + ' m), b_{p} = ' + g(ts.bp) +
      ' m, l là đoạn cọc nút lò xo đảm nhận. Mỗi độ cứng là một thuộc tính lò xo điểm LX_<K> (trục cục bộ U1, U2).'));
    out.push(gach('Mũi cọc: gối chặn chuyển vị đứng.'));
    out.push(gach('Tải trọng cẩu tháp đặt tại một điểm ở tâm đài.'));
    out = out.concat(oDanHinh('Mô hình 3D móng cẩu tháp trong ETABS (đài, cọc, lò xo đất)', '', 7600, 'Hình 3.1 Mô hình móng cẩu tháp'));
    out.push(bangDayDu(['Cao độ (m)', 'Độ sâu z (m)', 'Lớp đất', 'Hệ số nền tỉ lệ k (kN/m^{4})', 'Đoạn cọc l (m)', 'Độ cứng lò xo K (kN/m)'],
      m.bangLoXo.map(function (r) { return [f(r.caoDo, 2), f(r.doSau, 2), String(r.lop), f(r.k, 0), f(r.l, 2), f(r.K, 0)]; }),
      [1500, 1500, 1300, 2000, 1500, 1838], { giuChung: false, fillTieuDe: 'F2F2F2' }));
    out.push(chuThich('Bảng 3.1 Độ cứng lò xo đất ngang tại nút cọc (gán cho cả hai phương X, Y)'));
    out = out.concat(hinhAnh(hinh.etabsMatBang, 430, 'Mặt bằng mô hình đài', 'Hình 3.2 Mặt bằng đài trong mô hình ETABS (lưới tấm vỏ, cọc, điểm đặt tải)'));

    out.push(tieuDe('3.1. ' + tenCau, 3));
    function gt(ten) {
      var pt = t.mauTai.filter(function (x) { return x.ten === ten; })[0];
      if (!pt || !pt.luc) return null;
      var k = pt.luc.giaTri.map(function (v, i) { return v ? i : -1; }).filter(function (i) { return i >= 0; })[0];
      return ten + ' = ' + f(pt.luc.giaTri[k], 2) + (k < 3 ? ' kN' : ' kNm');
    }
    var nhom = [['FX1', 'FY1', 'FZ1', 'Lực Fx1, Fy1, Fz1 của cẩu tháp tác dụng lên móng (kN)'],
      ['MX1', 'MY1', 'MZ1', 'Lực Mx1, My1, Mz1 của cẩu tháp tác dụng lên móng (kNm)'],
      ['FX2', 'FY2', 'FZ2', 'Lực Fx2, Fy2, Fz2 của cẩu tháp tác dụng lên móng (kN)'],
      ['MX2', 'MY2', null, 'Lực Mx2, My2 của cẩu tháp tác dụng lên móng (kNm)']];
    nhom.forEach(function (nh, i) {
      var ds = nh.slice(0, 3).filter(Boolean).map(gt).filter(Boolean);
      out = out.concat(oDanHinh('ETABS: Display → Load Assigns → Joint, chọn load pattern ' + nh.slice(0, 3).filter(Boolean).join(', ') +
        ' (xem 3D, chụp nút tâm đài)', 'Giá trị app gán: ' + ds.join('; '), 4600, 'Hình 3.' + (3 + i) + ' ' + nh[3]));
    });
    return out;
  }

  // 4. KẾT QUẢ NỘI LỰC
  function etabsNoiLuc(s, kq, hinh, E, tenCau) {
    var kE = E.kE, ck = kE.cocKiemTra, ts = E.m.thongSo;
    var out = [tieuDe('4. KẾT QUẢ NỘI LỰC', 2, true), tieuDe('4.1. ' + tenCau, 3)];
    var Pmin = ck.Pnen ? -ck.Pnen.gt : null, Pmax = ck.PminCC1 !== null ? -ck.PminCC1 : null;   // quy ước ETABS: nén âm, kéo dương
    var cot = function (loai) {
      return ['Lực dọc\nP_{' + loai + '} (kN)', 'Moment 2-2\nM_{2-2-' + loai + '} (kN.m)', 'Moment 3-3\nM_{3-3-' + loai + '} (kN.m)', 'Shear 2-2\n(kN)', 'Shear 3-3\n(kN)'];
    };
    out.push(doan('Hình chụp nội lực cọc từ ETABS (Display → Force/Stress Diagrams → Frame/Pier/Spandrel/Link Forces, tổ hợp BAO, ' +
      'chọn Min hoặc Max; hiện giá trị trên biểu đồ). Quy ước ETABS: lực dọc nén âm, kéo dương.'));
    out = out.concat(bangDanHinhNoiLuc('Bảng 4.1 Nội lực cọc tổ hợp BAO-MIN', cot('min'),
      'P_{min} = ' + (Pmin !== null ? f(Pmin, 0) : '-') + ' kN' + (ck.Pnen ? ' (cọc ' + ck.Pnen.coc + ', ' + ck.Pnen.toHop + ')' : '')));
    out = out.concat(bangDanHinhNoiLuc('Bảng 4.2 Nội lực cọc tổ hợp BAO-MAX', cot('max'),
      'P_{max} = ' + (Pmax !== null ? f(Pmax, 0) : '-') + ' kN' + (ck.Pkeo ? ' (cọc ' + ck.Pkeo.coc + ', ' + ck.Pkeo.toHop + ')' : '')));
    out.push(tieuMuc('Tổng hợp nội lực cọc (app đọc từ kết quả phân tích ETABS)'));
    out.push(doan('Nội lực cọc bao mọi tổ hợp, từ đáy đài (cao độ ' + f(ts.zDay, 2) + ' m) tới mũi cọc (đoạn cọc nằm trong đài không xét). ' +
      'Lực dọc: nén dương; mômen M = √(M_{2}^{2} + M_{3}^{2}), lực cắt V = √(V_{2}^{2} + V_{3}^{2}).'));
    out.push(bangDayDu(['Cọc', 'Nén đầu cọc (kN)', 'Tổ hợp', 'P đầu cọc nhỏ nhất (kN)', 'M_{max} (kNm)', 'tại z (m)', 'V_{max} (kN)', 'tại z (m)'],
      kE.coc.map(function (c) {
        return [c.ten, f(c.dauNen.gt, 0), c.dauNen.toHop, f(-c.dauKeo.gt, 0), f(c.Mmax.gt, 1), f(c.Mmax.z, 2), f(c.Vmax.gt, 1), f(c.Vmax.z, 2)];
      }), [700, 1150, 2200, 1350, 1100, 900, 1100, 1138], { fillTieuDe: 'F2F2F2' }));
    out.push(chuThich('Bảng 4.3 Nội lực cọc từ đáy đài tới mũi cọc (ETABS, bao mọi tổ hợp)'));
    var c0 = cocChinh(E);
    return out.concat(hinhNgang([hinh.etabsP, hinh.etabsM, hinh.etabsV], 200, 'Biểu đồ bao nội lực cọc',
      'Hình 4.1 Bao lực dọc nén, mômen, lực cắt cọc ' + c0.ten + ' theo chiều sâu (mọi tổ hợp)'));
  }

  // 5. TÍNH TOÁN SỨC CHỊU TẢI CỌC – phần sức chịu tải cọc của form CC1, đầu mục theo báo cáo thẩm tra
  function etabsSucChiuTai(s, kq, hinh) {
    return voiTen({
      'PHẦN 1. TÍNH TOÁN SỨC CHỊU TẢI CỌC': { t: '5. TÍNH TOÁN SỨC CHỊU TẢI CỌC', cap: 2, moi: true },
      'A. THÔNG SỐ ĐẦU VÀO': '5.1. Thông số đầu vào',
      'A.1. Thông số địa chất': '5.1.1. Thông số địa chất',
      'A.2. Thông số cọc': '5.1.2. Thông số cọc',
      'B. TÍNH TOÁN SỨC CHỊU TẢI CỌC': '5.2. Tính toán sức chịu tải cọc',
      'B.1. Sức chịu tải cọc theo vật liệu': '5.2.1. Sức chịu tải cọc theo vật liệu',
      'B.2. Sức chịu tải cọc theo chỉ số SPT': '5.2.2. Sức chịu tải cọc theo chỉ số SPT',
      'C. TỔNG HỢP VÀ LỰA CHỌN SỨC CHỊU TẢI THIẾT KẾ CỦA CỌC': '5.3. Tổng hợp sức chịu tải theo từng phương pháp',
      'C.1. Sức chịu tải trọng nén thiết kế': '5.3.1. Sức chịu tải trọng nén thiết kế',
      'C.2. Sức chịu tải trọng kéo thiết kế': '5.3.2. Sức chịu tải trọng kéo thiết kế'
    }, [[/^Hình 2\.1 /, 'Hình 5.1 ']], function () { return phan1SCT(s, kq, hinh); });
  }

  // 6. TÍNH TOÁN MÓNG CẨU THÁP
  function etabsMong(s, kq, hinh, E, tenCau) {
    var x = D(), kE = E.kE, ck = kE.cocKiemTra, cv = kE.chuyenVi, d = kE.dai, TN = kq.TN, S = kq.SCT;
    var out = [tieuDe('6. TÍNH TOÁN MÓNG CẨU THÁP', 2, true), tieuDe('6.1. Kiểm tra cọc', 3)];

    // Sức chịu tải
    out.push(tieuMuc('Kiểm tra sức chịu tải cọc'));
    var Pmin = ck.Pnen ? ck.Pnen.gt : null, Pkeo = ck.PminCC1 !== null ? -ck.PminCC1 : null;   // Pmin: nén lớn nhất; Pmax: kéo lớn nhất (ETABS)
    var okKeo = ck.PminCC1 === null || ck.PminCC1 >= -ck.QaKeo;
    out.push(bangDayDu(['Cẩu', 'P_{min} (kN)', 'P_{max} (kN)', 'R_{c,d} (kN)', 'Check |P_{min}| < R_{c,d}', 'R_{t,d} (kN)', 'Check P_{max} < R_{t,d}'],
      [[tenCau, f(-Pmin, 0), f(Pkeo, 0), f(ck.Qa, 0), ck.okNen ? 'Đạt' : 'Không đạt', f(ck.QaKeo, 0), okKeo ? 'Đạt' : 'Không đạt']],
      [2300, 1100, 1100, 1100, 1438, 1100, 1500], { fillTieuDe: 'F2F2F2' }));
    out.push(p('P_{min}, P_{max}: lực dọc đầu cọc nhỏ nhất (nén lớn nhất) và lớn nhất (kéo lớn nhất) theo quy ước ETABS (nén âm, kéo dương), bao mọi tổ hợp; ' +
      'R_{c,d}, R_{t,d}: sức chịu tải nén, kéo thiết kế (mục 5.3).', { italics: true, size: 22, align: x.AlignmentType.JUSTIFIED }));
    out.push(bangDayDu(['Cọc', 'Nén lớn nhất (kN)', 'Tổ hợp', 'P nhỏ nhất (kN)', 'Tổ hợp', 'R_{c,d} (kN)', "R_{t,d} (kN)", 'Kiểm tra'],
      kE.coc.map(function (c) {
        var ok = c.dauNen.gt <= ck.Qa && -c.dauKeo.gt >= -ck.QaKeo;
        return [c.ten, f(c.dauNen.gt, 0), c.dauNen.toHop, f(-c.dauKeo.gt, 0), c.dauKeo.toHop, f(ck.Qa, 0), f(-ck.QaKeo, 0), okKl(ok)];
      }), [650, 1000, 2150, 1000, 2150, 950, 950, 788], { fillTieuDe: 'F2F2F2' }));
    out.push(chuThich('Bảng 6.1 Lực dọc đầu cọc từng cọc (nén dương, kéo âm)'));
    var okSct = ck.okNen && okKeo;
    out.push(p('Kết luận: ' + (okSct ? 'Cọc đảm bảo sức chịu tải.' : 'Cọc KHÔNG đảm bảo sức chịu tải.'), { bold: true, color: okSct ? MAU.ok : MAU.fail }));

    // Tải ngang: P–M, cắt, chuyển vị
    out.push(tieuMuc('Kiểm tra cọc chịu tải trọng ngang'));
    out.push(doan('Nội lực, chuyển vị cọc lấy từ mô hình ETABS (mục 3) có lò xo đất ngang tại các nút cọc, bao mọi tổ hợp tải trọng (mục 2.3).'));
    out = out.concat(kiemTraPM(s, kq, hinh, E, tenCau));

    // Bảng Check Shear
    if (TN && TN.hopLe) {
      var thep = (s.sct.thep || []).filter(function (t2) { return Number(t2.n) > 0; }).map(function (t2) { return t2.n + 'd' + t2.d; }).join(' + ');
      out.push(p('Bảng 6.3 Check Shear', { bold: true, italics: true, align: x.AlignmentType.CENTER, keepNext: true, spacing: { before: 160, after: 60 } }));
      out.push(bangThongSo([
        { nhan: '1. Thông số vật liệu', dam: true, thut: 0 },
        { nhan: 'Cấp bền chịu nén bê tông:', gt: S && S.hopLe ? S.vatLieu.beTong : s.sct.beTong, nhap: true, thut: 360 },
        { nhan: 'Cường độ chịu nén dọc trục:', ky: 'R_{b}=', gt: f(S && S.hopLe ? S.vatLieu.Rb : 0, 2), dv: 'MPa', thut: 360 },
        { nhan: 'Cường độ chịu kéo dọc trục (đã nhân γ_{cb}γ\'_{cb}):', ky: 'R_{bt}=', gt: f(TN.Rbt, 3), dv: 'MPa', thut: 360 },
        { nhan: 'Nhóm cốt thép dọc / thép đai:', gt: (S && S.hopLe ? S.vatLieu.cotThep : s.sct.cotThep) + ' / ' + TN.thepDai, nhap: true, gtRong: true, thut: 360 },
        { nhan: 'Cường độ chịu kéo thép ngang:', ky: 'R_{sw}=', gt: g(TN.Rsw), dv: 'MPa', thut: 360 },
        { nhan: '2. Thông số cọc', dam: true, thut: 0 },
        { nhan: 'Đường kính cọc:', ky: 'D=', gt: g(Number(s.sct.D) * 1000), dv: 'mm', thut: 360 },
        { nhan: 'Cốt thép dọc:', gt: thep, nhap: true, thut: 360 },
        { nhan: 'Cốt thép đai:', gt: 'd' + g(TN.dDai) + 'a' + g(TN.aDai), nhap: true, thut: 360 },
        { nhan: '3. Tải trọng tính toán tác dụng (ETABS)', dam: true, thut: 0 },
        { nhan: 'Lực cắt lớn nhất (cọc ' + ck.Vmax.coc + ', cao độ ' + f(ck.Vmax.z, 2) + ' m, ' + ck.Vmax.toHop + '):', ky: 'Q=', gt: f(ck.Vmax.gt, 1), dv: 'kN', thut: 360, gtDam: true },
        { nhan: '4. Khả năng chịu lực', dam: true, thut: 0 },
        { nhan: 'Khả năng chịu cắt của bê tông (φ_{b3}R_{bt}A_{b0}):', ky: '[Q]_{c}=', gt: f(TN.Qmin, 1), dv: 'kN', thut: 360 },
        { nhan: 'Khả năng chịu cắt của thép đai:', ky: '[Q]_{s}=', gt: f(TN.Qsteel, 1), dv: 'kN', thut: 360 },
        { nhan: 'Khả năng chịu cắt của bê tông + đai:', ky: '[Q]=', gt: f(TN.Qgh, 1), dv: 'kN', thut: 360, kl: okKl(ck.okCat), gtDam: true }
      ]));
    }

    // Chuyển vị
    out.push(tieuMuc('Kiểm tra chuyển vị ngang, góc xoay đầu cọc'));
    var nutMax = cv.DeltaMax ? cv.DeltaMax.nut : '';
    out = out.concat(oDanHinh('ETABS: Display → Deformed Shape (tổ hợp ' + (cv.DeltaMax ? cv.DeltaMax.toHop : 'bất lợi') +
      '), bấm phải vào nút đầu cọc để hiện Ux, Uy, Rx, Ry', cv.DeltaMax ? 'App đọc được: Δ = ' + f(cv.DeltaMax.gt, 2) + ' mm tại ' + nutMax : '', 4600,
      'Hình 6.2 Chuyển vị ngang, góc xoay đầu cọc'));
    out.push(bangDayDu(['Vị trí', 'Δ (mm)', 'Tổ hợp', 'ψ (độ)', 'Tổ hợp'],
      cv.nut.map(function (n) {
        return [n.nhan, n.Delta ? f(n.Delta.gt, 2) : '-', n.Delta ? n.Delta.toHop : '', n.psi ? f(n.psi.gt, 4) : '-', n.psi ? n.psi.toHop : ''];
      }), [2000, 1300, 2500, 1300, 2538], { fillTieuDe: 'F2F2F2' }));
    out.push(p('Chuyển vị ngang và góc xoay lớn nhất so với giới hạn [Δ], [ψ] (ψ = ' + f(cv.psiMax.gt * Math.PI / 180, 5) + ' rad):',
      { keepNext: true, spacing: { before: 80, after: 40 } }));
    out.push(dongKiemTra([
      { ky: 'Δ', trai: f(cv.DeltaMax.gt, 2), dv: 'mm', dau: cv.okDelta ? '<' : '>', phai: g(cv.gioiHanDelta), ok: cv.okDelta },
      { ky: 'ψ', trai: f(cv.psiMax.gt, 4), dv: 'độ', dau: cv.okPsi ? '<' : '>', phai: g(cv.gioiHanPsi), ok: cv.okPsi }
    ]));
    if (TN && TN.bang) {
      out.push(tieuMuc('Kiểm tra áp lực ngang và ổn định đất nền quanh cọc'));
      out.push(p('Tính theo phương pháp giải tích (TCVN 10304:2025 phụ lục A) như form CC1:', { italics: true }));
      out = out.concat(voiTen({ 'E. ÁP LỰC NGANG DỌC THEO THÂN CỌC': { t: 'Áp lực ngang dọc theo thân cọc', cap: 'tm' },
        'F. KIỂM TRA ỔN ĐỊNH ĐẤT NỀN QUANH CỌC': { t: 'Ổn định đất nền quanh cọc', cap: 'tm' } }, null, function () { return phan3OnDinh(TN, hinh); }));
    }

    // 6.2 Đài
    out.push(tieuDe('6.2. Kiểm tra đài móng', 3));
    out.push(doan('Mômen, lực cắt trong đài lấy từ kết quả ETABS: tích phân nội lực tấm vỏ (M_{11}, V_{13} theo phương X; M_{22}, V_{23} theo phương Y) ' +
      'trên mặt cắt suốt bề rộng đài tại mỗi đường lưới, lấy bao mọi tổ hợp. Mômen dương: thớ dưới chịu kéo.'));
    out.push(tieuMuc('Kiểm tra đài chịu uốn'));
    out = out.concat(oDanHinh('ETABS: Display → Force/Stress Diagrams → Shell Stresses/Forces → Forces, M11 và M22, tổ hợp BAO (Max/Min)',
      'App đọc được: M_X = ' + f(d.X.duoi.M, 1) + ' / ' + f(-(d.X.tren.M || 0), 1) + ' kNm; M_Y = ' + f(d.Y.duoi.M, 1) + ' / ' + f(-(d.Y.tren.M || 0), 1) +
      ' kNm (thớ dưới / thớ trên, cả bề rộng đài)', 5200, 'Hình 6.3 Mômen đài móng (kNm)'));
    out = out.concat(bangUonDai(s, E, ['Bảng 6.4 Kiểm tra đài chịu uốn – phương X', 'Bảng 6.5 Kiểm tra đài chịu uốn – phương Y']));
    out.push(tieuMuc('Kiểm tra đài chịu cắt'));
    out = out.concat(oDanHinh('ETABS: Display → Force/Stress Diagrams → Shell Stresses/Forces → Forces, V13 và V23, tổ hợp BAO',
      'App đọc được: V_X = ' + (d.X.catKT ? f(d.X.catKT.V, 1) : '-') + ' kN; V_Y = ' + (d.Y.catKT ? f(d.Y.catKT.V, 1) : '-') + ' kN (cả bề rộng đài)', 5200,
      'Hình 6.4 Lực cắt đài móng (kN)'));
    out.push(p('Bê tông không có cốt đai: Q_{b} = 0,5·R_{bt}·b·h_{0} (TCVN 5574:2018).', { italics: true, keepNext: true }));
    out.push(bangDayDu(['Phương', 'V (kN)', 'Mặt cắt tại (m)', 'b (m)', 'h_{0} (m)', 'Q_{b} (kN)', 'Kiểm tra'],
      [['X', d.X.catKT], ['Y', d.Y.catKT]].filter(function (h) { return h[1]; }).map(function (h) {
        var c = h[1];
        return [h[0], f(c.V, 1), f(c.viTri, 3), f(c.b, 3), f(d.h0, 3), f(c.Qb, 1), okKl(c.ok)];
      }), [1100, 1400, 1500, 1300, 1300, 1600, 1438], { fillTieuDe: 'F2F2F2' }));
    out.push(chuThich('Bảng 6.6 Kiểm tra đài chịu cắt'));
    out = out.concat(bangNutDai(s, E, 'Bảng 6.7 Kiểm tra nứt đài móng'));
    out.push(tieuMuc('Kiểm tra xuyên thủng đài do chân cẩu'));
    out = out.concat(voiTen({ 'C. KIỂM TRA XUYÊN THỦNG CHO ĐÀI MÓNG': null }, null, function () { return phan2MucC(s, kq); }));

    // 6.3 Bulong
    out.push(tieuDe('6.3. Kiểm tra bu lông móng cẩu', 3));
    out = out.concat(voiTen({
      'E. KIỂM TRA BULONG': null,
      'E.1. Thông số bulong': 'a) Thông số bulong',
      'E.2. Kiểm tra chiều dài bulong': 'b) Kiểm tra chiều dài bulong',
      'E.3. Kiểm tra bulong chịu kéo': 'c) Kiểm tra bulong chịu kéo',
      'E.4. Kiểm tra bulong chịu tuột': 'd) Kiểm tra bulong chịu tuột',
      'E.5. Kiểm tra bulong chịu cắt': 'e) Kiểm tra bulong chịu cắt',
      'E.6. Kiểm tra bulong chịu ép mặt': 'f) Kiểm tra bulong chịu ép mặt',
      'E.7. Kiểm tra chọc thủng của 1 cụm bulong': 'g) Kiểm tra phá hoại cục bộ bê tông (chọc thủng 1 cụm bulong)'
    }, null, function () { return phan2MucE(s, kq); }));
    var bl = kE.bulong;
    if (bl) {
      out.push(tieuMuc('h) Kiểm tra bulong chịu kéo + cắt đồng thời'));
      out.push(bangThongSo([
        { nhan: 'Lực nhổ tính toán phân vào 1 bulong:', ky: 'N_{1}=', gt: f(bl.N1, 1), dv: 'kN' },
        { nhan: 'Lực cắt tính toán phân vào 1 bulong:', ky: 'Q_{1}=', gt: f(bl.Q1, 1), dv: 'kN' },
        { nhan: 'Khả năng chịu kéo, chịu cắt của 1 bulong (mục c, e):', ky: '[N]_{tb} / [N]_{vb}=', gt: f(bl.Ntb, 1) + ' / ' + f(bl.Nvb, 1), dv: 'kN', gtRong: true },
        { nhan: '√((N_{1}/[N]_{tb})^{2} + (Q_{1}/[N]_{vb})^{2}) ≤ 1', thut: 720, ky: '', gt: f(bl.tiSo, 3) + (bl.ok ? ' < 1' : ' > 1'), kl: okKl(bl.ok), gtRong: true }
      ]));
    }
    var okBl = kq.E && kq.E.hopLe && kq.E.tatCaOk && (!bl || bl.ok);
    out.push(p('Kết luận: ' + (okBl ? 'Liên kết bu lông móng cẩu đảm bảo chịu lực.' : 'Liên kết bu lông móng cẩu KHÔNG đảm bảo chịu lực.'),
      { bold: true, color: okBl ? MAU.ok : MAU.fail }));

    // 6.4 Ổn định – lún (form CC1)
    out = out.concat(voiTen({
      'PHẦN 5. KIỂM TRA ỔN ĐỊNH ĐẤT NỀN VÀ KIỂM TRA LÚN': { t: '6.4. Kiểm tra ổn định đất nền và độ lún móng khối quy ước', cap: 3, moi: false },
      'A. XÁC ĐỊNH KÍCH THƯỚC CỦA MÓNG KHỐI QUY ƯỚC': { t: 'a) Kích thước móng khối quy ước', cap: 'tm' },
      'B. XÁC ĐỊNH TRỌNG LƯỢNG CỦA MÓNG KHỐI QUY ƯỚC': { t: 'b) Trọng lượng móng khối quy ước', cap: 'tm' },
      'C. ÁP LỰC TIÊU CHUẨN TẠI ĐÁY MÓNG KHỐI QUY ƯỚC': { t: 'c) Áp lực tiêu chuẩn tại đáy móng khối quy ước', cap: 'tm' },
      'D. SỨC CHỊU TẢI CỦA ĐẤT NỀN TẠI MẶT PHẲNG MŨI CỌC': { t: 'd) Sức chịu tải của đất nền tại mặt phẳng mũi cọc', cap: 'tm' },
      'E. KIỂM TRA ĐỘ LÚN CỦA MÓNG': { t: 'e) Kiểm tra độ lún của móng', cap: 'tm' }
    }, null, function () { return phan5Lun(s, kq); }));
    return out;
  }

  // Kiểm tra P–M như hình Check P-M của báo cáo thẩm tra: thông số tiết diện (TCVN 5574:2018), mọi cặp (N, M) ETABS
  // trên biểu đồ tương tác, bảng các điểm nguy hiểm của từng cọc (đánh số như trên hình), tỉ số lớn nhất
  function kiemTraPM(s, kq, hinh, E, tenCau) {
    var x = D(), ck = E.kE.cocKiemTra, TT = kq.TT, ds = ck.nguyHiem || [], out = [];
    out.push(p('Kiểm tra khả năng chịu lực cọc theo biểu đồ tương tác (TCVN 5574:2018): mọi cặp nội lực (N, M) tại mọi mặt cắt của các cọc, mọi tổ hợp ' +
      'lấy từ ETABS (M = √(M_{2}^{2} + M_{3}^{2}), N nén dương), kiểm tra M ≤ M_{gh}(N). Các điểm nguy hiểm của từng cọc: N nén lớn nhất, ' +
      'N nhỏ nhất (kéo lớn nhất), M lớn nhất và điểm có tỉ số M/M_{gh} lớn nhất.', { align: x.AlignmentType.JUSTIFIED, keepNext: true }));
    if (TT && TT.hopLe) {
      out.push(bangThongSo([
        { nhan: 'Tiết diện cọc (TCVN 5574:2018):', dam: true, thut: 0 },
        { nhan: 'Đường kính cọc:', ky: 'D=', gt: g(TT.D * 1000), dv: 'mm', thut: 360 },
        { nhan: 'Lớp bê tông bảo vệ (tới trọng tâm thép):', ky: 'a=', gt: g(TT.a), dv: 'mm', nhap: true, thut: 360 },
        { nhan: 'Cốt thép dọc:', ky: 'n×d=', gt: TT.n + 'd' + g(TT.d), nhap: true, thut: 360 },
        { nhan: 'Diện tích cốt thép:', ky: 'A_{s}=', gt: f(TT.As, 0), dv: 'mm2', thut: 360 },
        { nhan: 'Cường độ bê tông (R_{b}·γ_{cb}·γ\'_{cb}):', ky: 'R_{b}=', gt: f(TT.Rb2, 4), dv: 'MPa', thut: 360 },
        { nhan: 'Cường độ cốt thép:', ky: 'R_{s} / R_{sc}=', gt: g(TT.Rs) + ' / ' + g(TT.Rsc), dv: 'MPa', gtRong: true, thut: 360 },
        { nhan: 'Số cặp nội lực (N, M) đã kiểm tra:', ky: 'n_{p}=', gt: String(ck.soCapNM), thut: 360 },
        { nhan: 'Tỉ số M/M_{gh} lớn nhất:', ky: 'Tỷ số=', gt: ck.tuongTac ? f(ck.tuongTac.tiSo, 3) : '-', thut: 360, gtDam: true, kl: okKl(ck.okTuongTac) }
      ]));
    }
    out = out.concat(hinhAnh(hinh.etabsTuongTac, 430, 'Biểu đồ tương tác',
      'Hình 6.1 Check P-M cọc cẩu ' + tenCau + ' (biểu đồ tương tác TCVN 5574:2018, nội lực ETABS, điểm nguy hiểm đánh số như Bảng 6.2)'));
    if (ds.length) {
      out.push(p('Bảng 6.2 Các điểm nguy hiểm kiểm tra P–M', { bold: true, italics: true, align: x.AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 } }));
      out.push(bangDayDu(['TT', 'Cọc', 'Điểm kiểm tra', 'N (kN)', 'M (kNm)', 'Cao độ (m)', 'Tổ hợp', 'M_{gh} (kNm)', 'M/M_{gh}', 'Kết quả'],
        ds.map(function (d) {
          return [String(d.stt), d.coc, d.loai.replace('M/Mgh', 'M/M_{gh}'), f(d.N, 0), f(d.M, 1), f(d.z, 2), d.toHop, d.Mgh === null ? '-' : f(d.Mgh, 0),
            d.tiSo === null ? '-' : isFinite(d.tiSo) ? f(d.tiSo, 3) : '> 1', d.ok === null ? '-' : okKl(d.ok)];
        }), [440, 520, 1700, 720, 720, 820, 1880, 860, 780, 778], { canhTrai: [2], giuChung: false, fillTieuDe: 'F2F2F2', co: 20 }));
    }
    var vuot = ck.soCapVuot || 0;
    out.push(p(ck.okTuongTac
      ? 'Kết luận: ' + ck.soCapNM + ' cặp nội lực (N, M) đều nằm trong biểu đồ tương tác, tỉ số lớn nhất ' + f(ck.tuongTac.tiSo, 3) + ' ≤ 1: cọc đủ khả năng chịu lực.'
      : 'Kết luận: có ' + vuot + '/' + ck.soCapNM + ' cặp nội lực (N, M) nằm ngoài biểu đồ tương tác: cọc KHÔNG đủ khả năng chịu lực.',
      { bold: true, color: ck.okTuongTac ? MAU.ok : MAU.fail, spacing: { before: 80 } }));
    return out;
  }

  // Bảng kiểm tra đài chịu uốn (như Bảng 6.2 báo cáo thẩm tra), mỗi phương một bảng
  function bangUonDai(s, E, tenBang) {
    var x = D(), d = E.kE.dai, out = [];
    out.push(bangThongSo([
      { nhan: 'Bê tông đài móng:', gt: s.dai.beTong, nhap: true },
      { nhan: 'Cường độ chịu nén tính toán:', ky: 'R_{b}=', gt: g(d.Rb), dv: 'MPa' },
      { nhan: 'Cường độ chịu kéo tính toán:', ky: 'R_{bt}=', gt: g(d.Rbt), dv: 'MPa' },
      { nhan: 'Cốt thép đài móng:', gt: s.dai.cotThep, nhap: true },
      { nhan: 'Cường độ chịu kéo tính toán:', ky: 'R_{s}=', gt: g(d.Rs), dv: 'MPa' },
      { nhan: 'Chiều cao làm việc (h_{0} = H − a):', ky: 'h_{0}=', gt: f(d.h0 * 1000, 0), dv: 'mm' }
    ]));
    out.push(p('α_{m} = M/(R_{b}·b·h_{0}^{2});   ξ = 1 − √(1 − 2α_{m});   A_{s} = ξ·R_{b}·b·h_{0}/R_{s};   b: bề rộng mặt cắt (cả bề rộng đài)',
      { italics: true, size: 22, indent: { left: 360 } }));
    function giaTri(l, k) {
      if (!l.can) return k === 'M' ? '0' : k === 'kt' ? 'OK' : '-';
      var c = l.can, ch = l.chon;
      switch (k) {
        case 'M': return f(l.M, 1);
        case 'vt': return f(l.viTri, 3);
        case 'b': return f(c.b * 1000, 0);
        case 'h': return f(E.m.thongSo.H * 1000, 0);
        case 'h0': return f(c.h0 * 1000, 0);
        case 'a': return f(c.alpha, 4);
        case 'xi': return c.duTietDien ? f(c.xi, 4) : '-';
        case 'As': return c.duTietDien ? f(c.AsMet, 1) : 'α_{m}>0.5';
        case 'chon': return ch ? 'd' + g(ch.d) + 'a' + g(ch.s) : '-';
        case 'AsC': return ch ? f(ch.AsMet, 1) : '-';
        case 'mu': return ch ? f(ch.AsMet / (c.h0 * 1e6) * 100, 3) : '-';
        case 'kt': return okKl(l.ok);
      }
      return '';
    }
    var DONG = [['Mômen', 'M', 'kNm'], ['Mặt cắt tại', 'vt', 'm'], ['b', 'b', 'mm'], ['h', 'h', 'mm'], ['h_{0}', 'h0', 'mm'], ['α_{m}', 'a', ''],
      ['ξ', 'xi', ''], ['A_{s,tt}', 'As', 'mm^{2}/m'], ['Chọn', 'chon', ''], ['A_{s} chọn', 'AsC', 'mm^{2}/m'], ['μ', 'mu', '%'], ['Kiểm tra', 'kt', '']];
    [['X', d.X], ['Y', d.Y]].forEach(function (h, i) {
      out.push(p(tenBang[i], { bold: true, italics: true, align: x.AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 } }));
      out.push(bangDayDu(['Thông số', 'Thép lớp dưới', 'Đơn vị', 'Thép lớp trên', 'Đơn vị'],
        DONG.map(function (r) { return [r[0], giaTri(h[1].duoi, r[1]), r[2], giaTri(h[1].tren, r[1]), r[2]]; }),
        [2400, 2100, 1300, 2100, 1300], { fillTieuDe: 'F2F2F2' }));
    });
    return out;
  }

  // Bảng kiểm tra nứt đài (như Bảng 6.4 báo cáo thẩm tra) – trường hợp bất lợi nhất chi tiết, các trường hợp còn lại tóm tắt
  function bangNutDai(s, E, tenBang) {
    var x = D(), nut = E.kE.dai.nut, n = nut && nut.xauNhat, out = [];
    out.push(tieuMuc('Kiểm tra nứt đài móng'));
    if (!n) { out.push(doan('Chưa đủ số liệu (chưa chọn thép đài).')); return out; }
    out.push(p(tenBang, { bold: true, italics: true, align: x.AlignmentType.CENTER, keepNext: true, spacing: { before: 60, after: 60 } }));
    var dong = [
      { nhan: '1. Các thông số đầu vào (TCVN 5574:2018 mục 8.2.2)', dam: true, thut: 0 },
      { nhan: 'Bê tông ' + s.dai.beTong + ':', ky: 'R_{bt,ser}=', gt: g(n.Rbt_ser), dv: 'MPa', thut: 360 },
      { nhan: 'Hệ số quy đổi cốt thép (E_{s}/E_{b}):', ky: 'α=', gt: f(n.alpha, 2), thut: 360 },
      { nhan: 'Tiết diện tính toán: ' + n.ten + (n.viTri !== undefined ? ', mặt cắt tại ' + f(n.viTri, 3) + ' m' : ''), thut: 360 },
      { nhan: 'Bề rộng, chiều cao làm việc:', ky: 'b / h_{0}=', gt: f(n.b * 1000, 0) + ' / ' + f(n.h0 * 1000, 0), dv: 'mm', gtRong: true, thut: 360 },
      { nhan: 'Thép chịu kéo / chịu nén (cả bề rộng):', ky: "A_{s} / A'_{s}=", gt: f(n.As / 100, 2) + ' / ' + f(n.AsNen / 100, 2), dv: 'cm2', gtRong: true, thut: 360 },
      { nhan: 'Mômen tại tiết diện tính toán (ETABS' + (n.toHop ? ', ' + n.toHop : '') + '):', ky: 'M=', gt: f(n.M, 1), dv: 'kNm', thut: 360, gtDam: true },
      { nhan: 'Yêu cầu: không hạn chế thấm', thut: 360 },
      { nhan: '2. Kiểm tra điều kiện hình thành vết nứt', dam: true, thut: 0 },
      { nhan: 'Diện tích tiết diện quy đổi:', ky: 'A_{red}=', gt: f(n.Ared, 4), dv: 'm2', thut: 360 },
      { nhan: 'Khoảng cách từ thớ chịu kéo tới trọng tâm:', ky: 'y_{t}=', gt: f(n.yt, 1), dv: 'mm', thut: 360 },
      { nhan: 'Mômen quán tính tiết diện quy đổi:', ky: 'I_{red}=', gt: f(n.Ired, 4), dv: 'm4', thut: 360 },
      { nhan: 'M_{crc} = γ·W_{red}·R_{bt,ser} = γ·I_{red}·R_{bt,ser}/y_{t};  γ = ' + g(n.gamma), thut: 360, ky: 'M_{crc}=', gt: f(n.Mcrc, 1), dv: 'kNm', gtDam: true }
    ];
    if (!n.nut) {
      dong.push({ nhan: 'M ≤ M_{crc}: tiết diện không hình thành vết nứt', thut: 360, kl: okKl(true) });
    } else {
      dong = dong.concat([
        { nhan: 'M > M_{crc}: tính bề rộng vết nứt ngắn hạn', thut: 360 },
        { nhan: '3. Bề rộng vết nứt a_{crc} = φ_{1}φ_{2}φ_{3}ψ_{s}(σ_{s}/E_{s})l_{s}', dam: true, thut: 0 },
        { nhan: 'Ứng suất thép σ_{s} = M/(z_{s}·A_{s}), z_{s} = 0,8h_{0}:', ky: 'σ_{s}=', gt: f(n.sigma, 1), dv: 'MPa', thut: 360 },
        { nhan: 'ψ_{s} = 1 − 0,8·M_{crc}/M:', ky: 'ψ_{s}=', gt: f(n.psi, 3), thut: 360 },
        { nhan: 'Khoảng cách vết nứt l_{s} = 0,5·A_{bt}/A_{s}·d_{s} (giới hạn 10d_{s}…40d_{s}, 100…400 mm):', ky: 'l_{s}=', gt: f(n.ls, 0), dv: 'mm', thut: 360 },
        { nhan: 'φ_{1} = ' + g(n.phi1) + ' (ngắn hạn);  φ_{2} = ' + g(n.phi2) + ' (thép có gờ);  φ_{3} = ' + g(n.phi3) + ' (uốn)', thut: 360 },
        { nhan: 'Bề rộng vết nứt:', ky: 'a_{crc}=', gt: f(n.acrc, 3), dv: 'mm', thut: 360, gtDam: true },
        { nhan: 'Giới hạn (không hạn chế thấm, ngắn hạn):', ky: '[a_{crc}]=', gt: g(n.gioiHan), dv: 'mm', thut: 360, kl: okKl(n.ok) }
      ]);
    }
    out.push(bangThongSo(dong));
    out.push(bangDayDu(['Tiết diện', 'M (kNm)', 'M_{crc} (kNm)', 'Nứt', 'a_{crc} (mm)', 'Kiểm tra'],
      nut.ds.map(function (r) {
        if (r.khongCoMomen) return [r.ten, '0', '-', 'Không', '-', 'OK'];
        if (r.thieuThep) return [r.ten, f(r.M, 1), '-', '-', '-', 'Chưa chọn thép'];
        return [r.ten, f(r.M, 1), f(r.Mcrc, 1), r.nut ? 'Có' : 'Không', r.nut ? f(r.acrc, 3) : '-', okKl(r.ok)];
      }), [3000, 1300, 1400, 900, 1300, 1738], { canhTrai: [0], fillTieuDe: 'F2F2F2' }));
    out.push(chuThich('Tổng hợp kiểm tra nứt các tiết diện đài (mômen tính toán ETABS – thiên về an toàn)'));
    out.push(p('Kết luận: ' + (nut.ok ? 'Đài móng đảm bảo điều kiện nứt.' : 'Đài móng KHÔNG đảm bảo điều kiện nứt.'), { bold: true, color: nut.ok ? MAU.ok : MAU.fail }));
    return out;
  }

  // 7. KẾT LUẬN, KIẾN NGHỊ
  function etabsKetLuan(s, kq, E, tenCau) {
    var x = D(), F = E.F, out = [tieuDe('7. KẾT LUẬN, KIẾN NGHỊ', 2, true), tieuDe('7.1. Kết luận', 3)];
    if (!F || !F.hopLe) { out.push(doan('Chưa đủ số liệu để kết luận.')); return out; }
    function gt(v) {
      if (!v || v.v === null || v.v === undefined) return '-';
      var so = typeof v.v === 'number' ? f(v.v, Math.abs(v.v) < 10 ? 3 : 1) : String(v.v);
      return (v.k && v.k !== 'giới hạn' ? v.k + ' = ' : '') + so + (v.dv ? ' ' + v.dv : '');
    }
    var MUC = { B: '6.1', C: '6.2', D: '6.2', E: '6.3' };
    function mucCua(m2) {
      if (m2.ma !== 'ETABS') return MUC[m2.ma] || m2.ma;
      return /^Đài/.test(m2.ten) ? '6.2' : '6.1';
    }
    out.push(bangDayDu(['Mục', 'Kiểm tra', 'Giá trị', '', 'Giới hạn', 'Kết quả'],
      F.ds.map(function (m2) { return [mucCua(m2), m2.ten, gt(m2.trai), m2.dau, gt(m2.phai), okKl(m2.ok)]; }),
      [800, 2700, 2400, 400, 2400, 938], { canhTrai: [1], giuChung: false, fillTieuDe: 'F2F2F2' }));
    out.push(chuThich('Bảng 7.1 Tổng hợp các kiểm tra (nội lực ETABS; xuyên thủng, bulong theo form CC1)'));
    function ok(ma, loc) { return F.ds.filter(function (m2) { return (m2.ma === ma || !ma) && (!loc || loc(m2)); }).every(function (m2) { return m2.ok; }); }
    var okCoc = ok('B') && ok('ETABS', function (m2) { return !/^Đài/.test(m2.ten); });
    var okDai = ok('C') && ok('D') && ok('ETABS', function (m2) { return /^Đài/.test(m2.ten); });
    var okBl = ok('E');
    var D_ = g(Number(s.sct.D) * 1000);
    out.push(gach((okCoc ? 'Hệ cọc khoan nhồi D' + D_ + ' đảm bảo đủ sức chịu tải và đủ khả năng chịu lực.' :
      'Hệ cọc khoan nhồi D' + D_ + ' KHÔNG đảm bảo – xem Bảng 7.1.')));
    out.push(gach(okDai ? 'Đài móng cẩu tháp ' + s.duAn.tenMong + ' đảm bảo đủ khả năng chịu lực.' : 'Đài móng cẩu tháp ' + s.duAn.tenMong + ' KHÔNG đảm bảo – xem Bảng 7.1.'));
    out.push(gach(okBl ? 'Bu lông neo móng cẩu đảm bảo khả năng chịu lực.' : 'Bu lông neo móng cẩu KHÔNG đảm bảo – xem Bảng 7.1.'));
    out.push(p(F.ketLuan, { bold: true, color: F.ok ? MAU.ok : MAU.fail, indent: { left: 360 }, spacing: { before: 60 } }));

    out.push(tieuDe('7.2. Kiến nghị', 3));
    var thay = function (t2) {
      return String(t2).replace(/\{tenMong\}/g, s.duAn.tenMong).replace(/\{cau\}/g, kq.A.cau.ten).replace(/\{chieuCao\}/g, g(Number(s.cau.chieuCao)));
    };
    var kn = String(s.baoCao.kienNghi || '').trim() ? s.baoCao.kienNghi : KIEN_NGHI_MAC_DINH;
    String(kn).split(/\r?\n/).map(function (d2) { return d2.trim(); }).filter(Boolean).forEach(function (d2) { out.push(gach(thay(d2))); });
    return out;
  }

  var KIEN_NGHI_MAC_DINH = [
    'Tuân thủ đúng biện pháp, đảm bảo thi công đúng chiều dài cọc, kích thước và thép cọc, móng cẩu. Chiều cao tự đứng của cẩu không được vượt quá chiều cao thiết kế là {chieuCao}m đối với cẩu {tenMong} – {cau}.',
    'Trong giai đoạn thi công hầm, để an toàn nhà thầu có thể lắp chiều cao cẩu tháp thấp hơn chiều cao tự đứng tối đa đã được thiết kế. Sau khi thi công xong phần hầm sẽ nâng lên chiều cao tự đứng theo thiết kế.'
  ].join('\n');

  // ---------------- Tài liệu ----------------
  function kieuChu() {
    var hd = function (id, ten, co, giua) {
      return {
        id: id, name: ten, basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: co, bold: true, color: '000000' },
        paragraph: { spacing: { before: 200, after: 120 }, alignment: giua ? 'center' : undefined }
      };
    };
    return {
      default: { document: { run: { font: FONT, size: CO }, paragraph: { spacing: { after: 80 } } } },
      paragraphStyles: [hd('Heading1', 'Heading 1', 32, true), hd('Heading2', 'Heading 2', 28), hd('Heading3', 'Heading 3', 27)]
    };
  }

  // Phương pháp giải tích: đúng form CC1 (thuyết minh mẫu MD3-1)
  function thuyetMinhGiaiTich(s, kq, hinh, tenTM) {
    return chuongI(s, kq, tenTM)
      .concat(chuong('CHƯƠNG II. TÍNH TOÁN MÓNG CẨU THÁP ' + tenTM))
      .concat(phan1SCT(s, kq, hinh))
      .concat(phan2MucA(s, kq))
      .concat(phan2MucB(s, kq))
      .concat(phan2MucC(s, kq))
      .concat(phan2MucD(s, kq))
      .concat(phan2MucE(s, kq))
      .concat(phan2MucF(s, kq))
      .concat(phan3TaiNgang(s, kq, hinh))
      .concat(phan4TuongTac(s, kq, hinh))
      .concat(phan5Lun(s, kq));
  }

  /**
   * Tạo đối tượng docx.Document.
   * @param {object} s   trạng thái app (số liệu nhập)
   * @param {object} kq  kết quả MCT.calc.tinhTatCa(s)
   */
  function taoThuyetMinh(s, kq, hinh) {
    hinh = hinh || {};
    var x = D();
    if (!kq.A || !kq.A.hopLe) throw new Error('Mục A chưa hợp lệ: ' + ((kq.A && kq.A.loi) || []).join('; '));
    var E = etabsCua(s, kq);
    if (s.tinhToan && s.tinhToan.phuongPhap === 'etabs' && !E) {
      throw new Error('Đang chọn phương pháp ETABS nhưng chưa có kết quả ETABS – chạy phân tích ở trang Kết quả ETABS hoặc chọn phương pháp Giải tích.');
    }
    var tenTM = s.duAn.tenMong + ' ' + kq.A.cau.ten;
    var hangMuc = 'Thuyết minh tính toán móng cẩu tháp ' + tenTM;

    var noiDung = []
      .concat(trangBia(tenTM))
      .concat([ngatTrang()])
      .concat(khoiTen(s, tenTM, 4600))
      .concat([ngatTrang()])
      .concat(khoiTen(s, tenTM, 0))
      .concat(trangKy(s))
      .concat([ngatTrang()])
      .concat(mucLuc())
      .concat(E ? thuyetMinhEtabs(s, kq, hinh, E, tenTM) : thuyetMinhGiaiTich(s, kq, hinh, tenTM));

    // Hai bảng liền nhau (không có đoạn văn ở giữa) sẽ bị Word/LibreOffice gộp thành một bảng
    // và chia lại cột → chèn một đoạn trống rất mỏng giữa chúng.
    var phang = [];
    (function don(ds) { ds.forEach(function (c) { if (Array.isArray(c)) don(c); else phang.push(c); }); })(noiDung);
    var dayDu = [];
    phang.forEach(function (c, i) {
      dayDu.push(c);
      if (c instanceof x.Table && phang[i + 1] instanceof x.Table) {
        dayDu.push(new x.Paragraph({ children: [], spacing: { before: 0, after: 0, line: 100, lineRule: 'exact' } }));
      }
    });

    return new x.Document({
      creator: 'App tính toán móng cẩu tháp',
      title: 'Thuyết minh tính toán móng cẩu tháp ' + tenTM,
      features: { updateFields: true },
      styles: kieuChu(),
      sections: [{
        properties: {
          titlePage: true,
          page: {
            size: { width: TRANG.rong, height: TRANG.cao },
            margin: { top: TRANG.tren, bottom: TRANG.duoi, left: TRANG.trai, right: TRANG.phai, header: TRANG.header, footer: TRANG.footer }
          }
        },
        headers: { default: dauTrang(s, hangMuc), first: new x.Header({ children: [p('', { spacing: { after: 0 } })] }) },
        footers: { default: chanTrang(), first: new x.Footer({ children: [p('', { spacing: { after: 0 } })] }) },
        children: dayDu
      }]
    });
  }

  function tenFile(s, kq) {
    var ten = ['Thuyet_minh_mong_cau_thap', s.duAn.tenMong, kq.A && kq.A.cau ? kq.A.cau.ten : '',
      s.tinhToan && s.tinhToan.phuongPhap === 'etabs' ? 'ETABS' : ''].filter(Boolean).join('_');
    return ten.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^A-Za-z0-9._-]+/g, '_') + '.docx';
  }

  MCT.baoCao = {
    taoThuyetMinh: taoThuyetMinh,
    tenFile: tenFile,
    _dinhDang: { f: f, g: g }
  };
})(globalThis.MCT = globalThis.MCT || {});
