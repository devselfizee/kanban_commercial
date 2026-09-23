import sharp from "sharp";
const src = "C:/Users/manoa/AppData/Local/Temp/claude/C--Users-manoa/ce72e78b-1776-4ef6-804b-e8bcf2f2925e/images/1.png";
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

/** Couleur la plus fréquente dans une zone : évite de tomber sur un pixel de texte. */
function dominante(x, y, w, h) {
  const comptes = new Map();
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      const k = (j * info.width + i) * 4;
      const hex = "#" + [data[k], data[k+1], data[k+2]].map(v => v.toString(16).padStart(2,"0")).join("");
      comptes.set(hex, (comptes.get(hex) ?? 0) + 1);
    }
  }
  return [...comptes.entries()].sort((a,b) => b[1]-a[1])[0][0];
}

const zones = {
  "onglet actif":            [700, 28, 40, 10],
  "barre laterale fond":     [60, 550, 60, 30],
  "entree laterale active":  [60, 158, 30, 12],
  "en-tete colonne rose":    [300, 205, 60, 8],
  "en-tete colonne grise":   [1560, 205, 40, 8],
  "corps colonne":           [300, 650, 60, 30],
  "bandeau desc colonne":    [300, 240, 60, 8],
  "carte fond":              [560, 470, 60, 12],
  "bordure gauche carte":    [474, 430, 3, 40],
  "badge compat fond":       [500, 416, 60, 6],
  "badge alerte entete":     [1490, 128, 60, 8],
  "badge nb cartes":         [1390, 128, 40, 8],
  "fond page":               [880, 650, 60, 30],
  "badge priorite P3":       [664, 313, 18, 6],
  "badge transmis vert":     [1405, 388, 50, 6],
  "trait rose bas":          [400, 853, 100, 3],
  "logo rose vif":           [30, 30, 8, 8],
};
for (const [nom, [x,y,w,h]] of Object.entries(zones)) {
  console.log(dominante(x,y,w,h).padEnd(9), nom);
}
