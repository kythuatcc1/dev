// Biểu đồ tương tác N–M của tiết diện cọc tròn (sheet "Bieu do tuong tac")
//   31 điểm φ = 0 … π (bước π/30):
//     ξ = φ/π ;  φs = max(1 − δξ, 0) ;  δ = 1,5 + 6·Rs·10⁻⁴ ;  α = Rs·As/(Rb·Ab) ;  β = a/D
//     M = Rb·Ab·r·[ (2/3π)·sin³φ + (1/π)·α(1−2β)·sinφ + α·φs(1−2β)·min(0,2 + 1,3ξ; 1) ]
//     N = Rb·Ab·[ ξ(1 + α) − (1/2π)·sin2φ − α·φs ]
//   Ngoại lực: M = Mz max (tải ngang), N = Pmax và Pmin (mục B).
//   Excel chỉ vẽ biểu đồ, không kiểm tra. App BỔ SUNG kiểm tra: |M| ≤ M giới hạn tại cùng N (nội suy trên đường bao).
(function (MCT) {
  'use strict';
  MCT.calc = MCT.calc || {};

  function tinhTuongTac(v, kq) {
    var S = kq.SCT, B = kq.B, TN = kq.TN;
    if (!S || !S.hopLe) return { hopLe: false, loi: ['Sức chịu tải cọc chưa hợp lệ.'] };
    var c = S.coc, vl = S.vatLieu;
    var D = c.D, r = D / 2, Ab = Math.PI * D * D / 4;
    var a = Number(v.a);
    var nThanh = c.thep.reduce(function (s, t) { return s + t.n; }, 0);
    var dMax = Math.max.apply(null, c.thep.map(function (t) { return t.d; }));
    var Rb = vl.Rb, Rbt = vl.Rbt, Rs = vl.Rs, Rsc = vl.Rsc;
    var beta = a / 1000 / D;
    var alpha = Rs * c.As / (Rb * Ab * 1e6);
    var delta = 1.5 + 6 * Rs * 1e-4;
    var diem = [];
    for (var i = 0; i <= 30; i++) {
      var phi = Math.PI / 30 * i, xi = phi / Math.PI, phis = Math.max(1 - delta * xi, 0);
      var M = Rb * 1e3 * Ab * r * (2 / 3 / Math.PI * Math.pow(Math.sin(phi), 3) + 1 / Math.PI * alpha * (1 - 2 * beta) * Math.sin(phi) +
        alpha * phis * (1 - 2 * beta) * Math.min(0.2 + 1.3 * xi, 1));
      var N = Rb * 1e3 * Ab * (xi * (1 + alpha) - 1 / 2 / Math.PI * Math.sin(2 * phi) - alpha * phis);
      diem.push({ phi: phi, xi: xi, phis: phis, M: M, N: N });
    }
    // Ô D80: TREND(N hai điểm đầu, M hai điểm đầu, 0) – điểm đóng biểu đồ tại M = 0 phía chịu kéo
    var p0 = diem[0], p1 = diem[1];
    var NTrend = p0.N + (0 - p0.M) * (p1.N - p0.N) / (p1.M - p0.M);

    // Đường bao (theo N tăng dần): điểm TREND rồi 31 điểm
    var bao = [{ M: 0, N: NTrend }].concat(diem);
    function Mgh(N) {
      if (N < bao[0].N || N > bao[bao.length - 1].N) return 0;
      for (var k = 0; k < bao.length - 1; k++) {
        var A = bao[k], C = bao[k + 1];
        if (N >= Math.min(A.N, C.N) && N <= Math.max(A.N, C.N)) {
          return C.N === A.N ? Math.max(A.M, C.M) : A.M + (N - A.N) * (C.M - A.M) / (C.N - A.N);
        }
      }
      return 0;
    }
    var Mtt = TN && TN.bang ? TN.Mmax : 0;
    var diemNoiLuc = [];
    if (B && B.hopLe) {
      diemNoiLuc = [{ ten: 'Nén (P_max)', M: Mtt, N: B.Pmax }, { ten: 'Kéo (P_min)', M: Mtt, N: B.Pmin }].map(function (p) {
        var gh = Mgh(p.N);
        return Object.assign(p, { Mgh: gh, ok: Math.abs(p.M) <= gh, heSo: p.M ? gh / Math.abs(p.M) : Infinity });
      });
    }
    return {
      hopLe: true, loi: [],
      D: D, r: r, a: a, Ab: Ab, n: nThanh, d: dMax, As: c.As,
      beTong: vl.beTong, cotThep: vl.cotThep, Rb: Rb, Rb2: Rb * vl.gammaCb * vl.gammaCb2, Rbt: Rbt, Rbt2: Rbt * vl.gammaCb * vl.gammaCb2,
      Rs: Rs, Rsc: Rsc, gammaCb: vl.gammaCb, gammaCb2: vl.gammaCb2,
      beta: beta, alpha: alpha, delta: delta, diem: diem, NTrend: NTrend,
      diemNoiLuc: diemNoiLuc, tatCaOk: diemNoiLuc.length > 0 && diemNoiLuc.every(function (p) { return p.ok; })
    };
  }

  MCT.calc.tinhTuongTac = tinhTuongTac;
})(globalThis.MCT = globalThis.MCT || {});
