import sharp from "sharp";
const src = "C:/Users/manoa/AppData/Local/Temp/claude/C--Users-manoa/ce72e78b-1776-4ef6-804b-e8bcf2f2925e/images/2.png";
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
console.log("dimensions", info.width + "x" + info.height);
const px = (x, y) => {
  const i = (y * info.width + x) * 4;
  return "#" + [data[i],data[i+1],data[i+2]].map(v=>v.toString(16).padStart(2,"0")).join("");
};
console.log("\n--- diagonale du coin bas-gauche ---");
for (let k = 0; k <= 12; k++) {
  const x = Math.round((info.width - 1) * k / 24);
  const y = info.height - 1 - Math.round((info.height - 1) * k / 24);
  console.log(("x" + x + ",y" + y).padEnd(12), px(x, y));
}
console.log("\n--- teintes distinctes présentes (top 12) ---");
const comptes = new Map();
for (let i = 0; i < data.length; i += 4) {
  const hex = "#" + [data[i],data[i+1],data[i+2]].map(v=>v.toString(16).padStart(2,"0")).join("");
  comptes.set(hex, (comptes.get(hex) ?? 0) + 1);
}
[...comptes.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12)
  .forEach(([h,n]) => console.log(h, String(n).padStart(6), "px"));
