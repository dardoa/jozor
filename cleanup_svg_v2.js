const fs = require('fs');

const svgFile = 'Logo_optimized.svg';
const outFile = 'Logo_clean.svg';

if (!fs.existsSync(svgFile)) {
    console.error('File not found:', svgFile);
    process.exit(1);
}

let content = fs.readFileSync(svgFile, 'utf8');

// The background path is likely the one with color #EFECE1 and huge 'd' attribute.
// Let's identify paths by their contents.
// Since it's all in one line, we can't easily use regex with . (it won't match across newlines unless flagged)
// But SVGO output IS usually one line.

const paths = content.split('<path');
console.log('Total path elements found:', paths.length - 1);

let newPaths = [paths[0]]; // Keep the start (svg tag)
let removedCount = 0;
let simplifiedCount = 0;

for (let i = 1; i < paths.length; i++) {
    let p = paths[i];
    // If a path contains #EFECE1 and its 'd' attribute is very long, it's the grunge.
    // Let's check for length of the 'd' attribute chunk.
    const dMatch = p.match(/d="([^"]+)"/);
    if (dMatch) {
        const dContent = dMatch[1];
        if (dContent.length > 5000 && p.includes('#EFECE1')) {
            console.log('Found massive background path (length ' + dContent.length + '). Replacing with rect.');
            newPaths.push(' rect fill="#EFECE1" width="1024" height="1024" />');
            removedCount++;
            continue;
        }

        // Remove other tiny paths that might be 'noise' (not human icons)
        // Most human icons are medium complexity. Grunge is either massive or thousands of tiny bits.
        if (dContent.length < 50 && p.includes('opacity="0.1"')) {
            removedCount++;
            continue;
        }
    }
    newPaths.push('<path' + p);
}

fs.writeFileSync(outFile, newPaths.join(''));
console.log('Finished. Removed/Modified ' + removedCount + ' paths.');
console.log('New file size:', fs.statSync(outFile).size);
