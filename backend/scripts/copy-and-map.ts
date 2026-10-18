import fs from 'fs';
import path from 'path';

const srcDir = 'C:\\Users\\galea\\.gemini\\antigravity-ide\\brain\\7a432902-057f-4530-9933-b546f0581359\\scratch\\pdf_images';
const destDir = 'C:\\Users\\galea\\.gemini\\antigravity-ide\\brain\\7a432902-057f-4530-9933-b546f0581359\\.tempmediaStorage';

const imgs = ['img_18.jpg', 'img_19.jpg', 'img_23.jpg', 'img_24.jpg', 'img_25.jpg', 'img_26.jpg', 'img_27.jpg', 'img_28.jpg'];
for (const img of imgs) {
  const s = path.join(srcDir, img);
  const d = path.join(destDir, img);
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, d);
    console.log(`Copied ${img} to .tempmediaStorage`);
  }
}
