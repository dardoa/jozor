import fs from 'fs';
import path from 'path';

const filesToDelete = [
  'logo.webp',
  'Logo.svg',
  'logo.png',
  'Logo_optimized.svg'
];

filesToDelete.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`🗑️ Deleted: ${file}`);
  }
});
