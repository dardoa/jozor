import fs from 'fs';
import path from 'path';

const desktop = 'C:\\Users\\dardoa\\Desktop';
const pub = './public';

const files = [
    'logo-bilingual-white.svg',
    'favicon.png',
    'jozor-icon.svg',
    'logo-bilingual-dark.svg'
];

for (const file of files) {
    const srcPath = path.join(desktop, file);
    const destPath = path.join(pub, file);
    if (fs.existsSync(srcPath)) {
        let content = fs.readFileSync(srcPath);
        
        // Clean basic SVG metadata to optimize size
        if (file.endsWith('.svg')) {
            let str = content.toString('utf8');
            // Remove metadata
            str = str.replace(/<\?xml.*?\?>/gi, '');
            str = str.replace(/<!DOCTYPE.*?>/gi, '');
            str = str.replace(/<!--.*?-->/gs, '');
            str = str.replace(/\sxmlns:(inkscape|sodipodi|illustrator)=".*?"/g, '');
            content = Buffer.from(str.trim());
        }

        fs.writeFileSync(destPath, content);
        console.log(`✅ Copied & Cleaned: ${file}`);
    } else {
        console.log(`❌ File Not Found: ${srcPath}`);
    }
}

// Delete old logos
const oldFiles = ['logo.svg', 'Logo_optimized.svg'];
for (const old of oldFiles) {
    const oldPathPub = path.join(pub, old);
    if (fs.existsSync(oldPathPub)) {
        fs.unlinkSync(oldPathPub);
        console.log(`🗑️ Deleted old logo: ${oldPathPub}`);
    }
    const oldPathSrc = path.join('./src/assets', old);
    if (fs.existsSync(oldPathSrc)) {
        fs.unlinkSync(oldPathSrc);
        console.log(`🗑️ Deleted old logo: ${oldPathSrc}`);
    }
}
