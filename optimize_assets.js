const fs = require('fs');
const path = require('path');

async function optimizeSVG() {
    const svgFile = 'Logo_optimized.svg';
    const outFile = 'Logo_clean.svg';

    if (!fs.existsSync(svgFile)) {
        console.error('SVG not found:', svgFile);
        return;
    }

    let content = fs.readFileSync(svgFile, 'utf8');
    // SVGO output is usually mostly one line.
    // Let's split by <path and process.
    const parts = content.split('<path');
    const newParts = [parts[0]];
    let removedCount = 0;

    for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        // The background texture is #EFECE1. If the path is massive, it's the texture.
        if (p.includes('#EFECE1') && p.length > 2000) {
            newParts.push(' rect fill="#EFECE1" width="1024" height="1024" />');
            removedCount++;
            continue;
        }
        // Also remove very small paths with low opacity (often noise)
        if (p.length < 100 && (p.includes('opacity="0.1"') || p.includes('opacity="0.2"'))) {
            removedCount++;
            continue;
        }
        newParts.push('<path' + p);
    }

    const finalContent = newParts.join('');
    fs.writeFileSync(outFile, finalContent);
    console.log(`SVG: Removed ${removedCount} paths. New size: ${Math.round(finalContent.length / 1024)} KB`);
}

async function optimizePNG() {
    // Since sharp installation failed, we might not have it.
    // We can try to use npx squoosh-cli or just report size if we can't compress.
    // Wait, let's try to use a simple node buffer if we don't have sharp.
    // Actually, I'll try to run npx via execSync.
    const { execSync } = require('child_process');
    try {
        console.log('Attempting PNG to WebP conversion...');
        // Try imagemin-webp via npx
        execSync('npx -y imagemin-cli logo.png --out-dir=. --plugin=webp', { stdio: 'inherit' });
        if (fs.existsSync('logo.webp')) {
            console.log(`PNG: Successfully converted to WebP. Size: ${Math.round(fs.statSync('logo.webp').size / 1024)} KB`);
        }
    } catch (e) {
        console.error('PNG optimization failed via imagemin. Trying alternatives...');
        try {
            // Try squoosh
            execSync('npx -y @squoosh/cli --webp "{}" logo.png -o logo.webp', { stdio: 'inherit' });
            console.log(`PNG: Successfully converted to WebP via squoosh. Size: ${Math.round(fs.statSync('logo.webp').size / 1024)} KB`);
        } catch (e2) {
            console.error('All PNG optimization attempts failed.');
        }
    }
}

async function run() {
    await optimizeSVG();
    await optimizePNG();
}

run();
