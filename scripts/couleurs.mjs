import sharp from "sharp";
const src = "C:/Users/manoa/AppData/Local/Temp/claude/C--Users-manoa/ce72e78b-1776-4ef6-804b-e8bcf2f2925e/images/1.png";
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => {
  const i = (y * info.width + x) * 4;
  return "#" + [data[i],data[i+1],data[i+2]].map(v=>v.toString(16).padStart(2,"0")).join("");
};
console.log("--- toute la largeur du trait, y=830 (tous les 40 px) ---");
for (let x = 220; x < info.width; x += 40) console.log(String(x).padStart(5), px(x, 830));
