import fs from 'fs';
import path from 'path';

const imgDir = 'C:\\Users\\galea\\.gemini\\antigravity-ide\\brain\\7a432902-057f-4530-9933-b546f0581359\\scratch\\pdf_images';
const files = fs.readdirSync(imgDir);

for (const file of files) {
  const filePath = path.join(imgDir, file);
  const stat = fs.statSync(filePath);
  console.log(`${file}: ${(stat.size / 1024).toFixed(1)} KB`);
}
