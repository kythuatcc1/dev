// Xuất thuyết minh Word (.docx) theo mẫu "260917_MD3-1_THUYET_MINH_MCT_VN.pdf".
// Dùng thư viện docx (vendor/docx-9.15.3.umd.js, biến toàn cục `docx`).
//
// Bố cục:
//   Trang bìa → trang tên thuyết minh → trang ký → mục lục
//   CHƯƠNG I. TỔNG QUAN (cơ sở tính toán, tiêu chuẩn, thông số cẩu tháp)
//   CHƯƠNG II. TÍNH TOÁN MÓNG CẨU THÁP
//     PHẦN 1. Sức chịu tải cọc (tạm: giá trị thiết kế nhập tay – GĐ4 bổ sung chi tiết)
//     PHẦN 2. Tính toán móng cẩu tháp: A (GĐ3.1) → B…F (GĐ3.2)
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
  var COT_TS = [0, 1150, 1500, 750, 600];
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
      if (r.dv && String(r.dv).replace(/[_^]\{|\}/g, '').length > 6 && !r.kl) {
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
    var giua = { align: x.AlignmentType.CENTER, spacing: { after: 0, line: 260 }, keepNext: giuChung };
    var hang = [hangBang(tieuDe.map(function (t, i) {
      return o(p(t, Object.assign({ bold: true }, giua)), cot[i], { fill: opt.fillTieuDe });
    }), { header: true })];
    dsHang.forEach(function (r, ri) {
      hang.push(hangBang(r.map(function (t, i) {
        var canh = opt.canhTrai && opt.canhTrai.indexOf(i) >= 0
          ? { align: x.AlignmentType.LEFT, spacing: { after: 0, line: 260 }, keepNext: giuChung } : giua;
        return o(p(t, Object.assign({ bold: opt.dongDam && opt.dongDam(ri) }, canh)), cot[i]);
      })));
    });
    return bang(hang, cot, { align: opt.align || x.AlignmentType.CENTER });
  }

  function chuThich(text) {
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
  function phan(text, moiTrang) {
    return p(text, { heading: D().HeadingLevel.HEADING_2, pageBreakBefore: !!moiTrang, keepNext: true });
  }
  function muc(text) {
    return p(text, { heading: D().HeadingLevel.HEADING_3, keepNext: true });
  }
  function tieuMuc(text) {
    return p(text, { bold: true, keepNext: true, spacing: { before: 120, after: 80 } });
  }
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
    out.push(doan('Thông số phản lực xuống móng cẩu tháp khi lắp ở chiều cao tự đứng ' + g(Number(s.cau.chieuCao)) +
      'm như bên dưới. Mô hình tính toán lấy 2 trường hợp: phản lực lớn nhất lúc cẩu tháp hoạt động và phản lực lớn nhất lúc cẩu tháp không hoạt động.'));

    // Bảng 3.1: tải trọng chân đế theo catalogue (đã đổi sang kN, kNm)
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
    out.push(chuThich('Bảng 3.1 Tải trọng chân đế cẩu tháp ' + cau.ten + ' theo catalogue (LV: làm việc; KLV: không làm việc; dòng in đậm: chiều cao tính toán)'));
    out.push(oHinh('Chèn hình catalogue / sơ đồ cẩu tháp ' + cau.ten, 3000));
    out.push(chuThich('Hình 3.1 Cẩu tháp ' + s.duAn.tenMong + ' – ' + cau.ten));
    out.push(bangDayDu(['STT', 'Thông số', 'Giá trị', 'Đơn vị'], [
      ['1', 'Tải tối đa', g(Number(s.baoCao.taiToiDa)), 'T'],
      ['2', 'Tải đầu cần', g(Number(s.baoCao.taiDauCan)), 'T'],
      ['3', 'Kích thước thân', f(A.Ht, 1), 'm'],
      ['4', 'Chiều cao tự đứng lớn nhất', g(hMax), 'm'],
      ['5', 'Chiều dài cần lớn nhất', g(A.chieuDaiTayCan), 'm']
    ], [1000, 3800, 3000, 1838], { canhTrai: [1] }));
    out.push(chuThich('Bảng 3.2 Thông số cẩu tháp'));
    return out;
  }

  // ---------------- Chương II – Phần 1 (tạm) ----------------
  function phan1SCT(s) {
    var out = [phan('PHẦN 1. TÍNH TOÁN SỨC CHỊU TẢI CỌC', true)];
    out.push(doan('Sức chịu tải thiết kế của cọc khoan nhồi D' + g(Number(s.sct.D) * 1000) +
      'mm lấy theo kết quả tính toán sức chịu tải cọc (TCVN 10304:2025):'));
    out.push(bangThongSo([
      { nhan: 'Sức chịu tải trọng nén thiết kế', ky: 'N_{c,d}=', gt: f(Number(s.coc.Qa), 0), dv: 'kN', nhap: true },
      { nhan: 'Sức chịu tải trọng kéo thiết kế', ky: 'N_{t,d}=', gt: f(Number(s.coc.QaKeo), 0), dv: 'kN', nhap: true }
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

  /**
   * Tạo đối tượng docx.Document.
   * @param {object} s   trạng thái app (số liệu nhập)
   * @param {object} kq  kết quả MCT.calc.tinhTatCa(s)
   */
  function taoThuyetMinh(s, kq) {
    var x = D();
    if (!kq.A || !kq.A.hopLe) throw new Error('Mục A chưa hợp lệ: ' + ((kq.A && kq.A.loi) || []).join('; '));
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
      .concat(chuongI(s, kq, tenTM))
      .concat(chuong('CHƯƠNG II. TÍNH TOÁN MÓNG CẨU THÁP ' + tenTM))
      .concat(phan1SCT(s))
      .concat(phan2MucA(s, kq))
      .concat(phan2MucB(s, kq))
      .concat(phan2MucC(s, kq))
      .concat(phan2MucD(s, kq))
      .concat(phan2MucE(s, kq))
      .concat(phan2MucF(s, kq));

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
    var ten = ['Thuyet_minh_mong_cau_thap', s.duAn.tenMong, kq.A && kq.A.cau ? kq.A.cau.ten : ''].filter(Boolean).join('_');
    return ten.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^A-Za-z0-9._-]+/g, '_') + '.docx';
  }

  MCT.baoCao = {
    taoThuyetMinh: taoThuyetMinh,
    tenFile: tenFile,
    _dinhDang: { f: f, g: g }
  };
})(globalThis.MCT = globalThis.MCT || {});
