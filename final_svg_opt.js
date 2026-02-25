const fs = require('fs');
const svgFile = 'Logo_optimized.svg';
const outFile = 'Logo_clean.svg';

try {
    const content = fs.readFileSync(svgFile, 'utf8');
    const parts = content.split('<path');
    console.log('Total parts:', parts.length);

    let filtered = [parts[0]];
    let removed = 0;

    parts.slice(1).forEach(p => {
        // Match both casing
        const isBackground = p.toLowerCase().includes('#efece1');
        const isVeryLarge = p.length > 2000;

        if (isBackground && isVeryLarge) {
            filtered.push(' <rect fill="#EFECE1" width="1024" height="1024" />');
            removed++;
        } else if (p.length < 1000 || !isBackground) {
            filtered.push('<path' + p);
        } else {
            removed++;
        }
    });

    fs.writeFileSync(outFile, filtered.join(''));
    console.log(`Success! Removed ${removed} paths. New size: ${fs.statSync(outFile).size}`);
} catch (e) {
    console.error(e);
}
