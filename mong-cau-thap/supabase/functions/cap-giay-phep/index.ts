// Edge Function "cap-giay-phep": nhận JWT đăng nhập + mã máy (đã băm) → kiểm tra đơn vị, người dùng, số máy → ký token Ed25519.
// Triển khai: supabase functions deploy cap-giay-phep   (đặt secret: supabase secrets set MCT_KHOA_KY="<PKCS8 base64 từ tao-khoa.js>" MCT_KID="k1")
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const HAN_TOKEN_GIO = 12;   // token sống 12 giờ; phần mềm bắt buộc kết nối lại mỗi lần mở
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey", "Content-Type": "application/json" };
const tra = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: CORS });
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const tuB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function ky(payload: Record<string, unknown>): Promise<string> {
  const khoa = await crypto.subtle.importKey("pkcs8", tuB64(Deno.env.get("MCT_KHOA_KY")!), { name: "Ed25519" }, false, ["sign"]);
  const dau = b64u(new TextEncoder().encode(JSON.stringify(payload)));
  const cks = new Uint8Array(await crypto.subtle.sign("Ed25519", khoa, new TextEncoder().encode(dau)));
  return dau + "." + b64u(cks);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return tra(405, { loi: "phuong-thuc" });
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  let vao: { maMay?: string; tenMay?: string };
  try { vao = await req.json(); } catch { return tra(400, { loi: "du-lieu" }); }
  const maMay = String(vao.maMay || "");
  if (!/^[0-9a-f]{32,128}$/.test(maMay)) return tra(400, { loi: "ma-may" });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: nd, error: eNd } = await sb.auth.getUser(jwt);
  if (eNd || !nd.user) return tra(401, { loi: "chua-dang-nhap" });
  const uid = nd.user.id;

  const { data: hs } = await sb.from("ho_so").select("ho_ten,bat,don_vi_id").eq("id", uid).maybeSingle();
  if (!hs || !hs.don_vi_id) return tra(403, { loi: "chua-co-ho-so", thongBao: "Tài khoản chưa được cấp quyền. Liên hệ CC1." });
  if (!hs.bat) return tra(403, { loi: "tai-khoan-khoa", thongBao: "Tài khoản đã bị khoá. Liên hệ CC1." });
  const { data: dv } = await sb.from("don_vi").select("id,ten,loai,bat,het_han,so_may_toi_da").eq("id", hs.don_vi_id).maybeSingle();
  if (!dv || !dv.bat) return tra(403, { loi: "don-vi-khoa", thongBao: "Đơn vị đã bị khoá. Liên hệ CC1." });

  // Máy: đã có thì cập nhật; máy mới thì kiểm tra số máy tối đa của người dùng
  const { data: dsMay } = await sb.from("may").select("id,ma_may,thu_hoi").eq("user_id", uid);
  const may = (dsMay || []).find((m) => m.ma_may === maMay);
  if (may && may.thu_hoi) return tra(403, { loi: "may-bi-thu-hoi", thongBao: "Máy này đã bị thu hồi. Liên hệ CC1." });
  if (!may) {
    const dangDung = (dsMay || []).filter((m) => !m.thu_hoi).length;
    if (dangDung >= dv.so_may_toi_da) return tra(403, { loi: "vuot-so-may", thongBao: `Đã đăng ký đủ ${dv.so_may_toi_da} máy. Liên hệ CC1 để thu hồi máy cũ.` });
    if (dv.loai === "dung-thu") {   // mỗi máy chỉ dùng thử một lần: máy đã đăng ký cho người dùng thử khác thì từ chối
      const { data: khac } = await sb.from("may").select("user_id").eq("ma_may", maMay).neq("user_id", uid).limit(1);
      if (khac && khac.length) return tra(403, { loi: "may-da-dung-thu", thongBao: "Máy này đã được dùng thử bằng tài khoản khác." });
    }
    await sb.from("may").insert({ user_id: uid, ma_may: maMay, ten_may: String(vao.tenMay || "").slice(0, 80) });
  } else {
    await sb.from("may").update({ lan_cuoi: new Date().toISOString() }).eq("id", may.id);
  }
  await sb.from("ho_so").update({ lan_dang_nhap_cuoi: new Date().toISOString() }).eq("id", uid);

  const bay = Math.floor(Date.now() / 1000);
  const hetHanDv = dv.het_han ? Math.floor(new Date(dv.het_han + "T23:59:59+07:00").getTime() / 1000) : null;
  const hetHan = hetHanDv !== null && hetHanDv < bay;             // đơn vị / gói dùng thử đã hết hạn: vẫn cấp token để xem dự án, khoá tính toán + xuất
  const exp = Math.min(bay + HAN_TOKEN_GIO * 3600, hetHanDv !== null && !hetHan ? hetHanDv : Infinity);
  const token = await ky({
    kid: Deno.env.get("MCT_KID") || "k1", sub: uid, ten: hs.ho_ten || nd.user.email, email: nd.user.email,
    donVi: dv.ten, loai: dv.loai, did: maMay, iat: bay, exp,
    khoaTinhToan: hetHan,                                          // true: hết hạn – app chỉ cho xem dự án
    dauTen: dv.loai !== "noi-bo",                                   // chèn tên người dùng + đơn vị vào chân trang thuyết minh
    dungThu: dv.loai === "dung-thu", hetHanDv,
  });
  return tra(200, { token });
});
