// Vẽ icon.svg ra PNG nhiều cỡ rồi ghép thành icon.ico (ICO chứa ảnh PNG). Dùng: node tools/tao-icon.js desktop  (cần Playwright)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const dir = process.argv[2];
  const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
  const b = await chromium.launch(); const pg = await b.newPage();
  const sizes = [16, 24, 32, 48, 64, 128, 256], pngs = [];
  for (const s of sizes) {
    await pg.setViewportSize({ width: s, height: s });
    await pg.setContent(`<style>html,body{margin:0;background:transparent}</style>` + svg.replace('width="256" height="256"', `width="${s}" height="${s}"`));
    pngs.push(await pg.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: s, height: s } }));
  }
  await b.close();
  fs.writeFileSync(path.join(dir, 'icon.png'), pngs[pngs.length - 1]);
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = 6 + 16 * sizes.length; const ent = [];
  sizes.forEach((s, i) => {
    const e = Buffer.alloc(16); e.writeUInt8(s >= 256 ? 0 : s, 0); e.writeUInt8(s >= 256 ? 0 : s, 1);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(off, 12);
    off += pngs[i].length; ent.push(e);
  });
  fs.writeFileSync(path.join(dir, 'icon.ico'), Buffer.concat([head, ...ent, ...pngs]));
  console.log('icon.ico', fs.statSync(path.join(dir, 'icon.ico')).size, 'bytes');
})();
