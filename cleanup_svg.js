const fs = require('fs');
const content = fs.readFileSync('Logo_optimized.svg', 'utf8');

// The grunge texture usually has lots of small paths or paths with specific colors.
// In our case, the first path is #EFECE1 and it's likely the textured background.
// Let's replace the first complex path of color #EFECE1 with a simple rectangle.

const optimizedContent = content.replace(/<path fill="#EFECE1"[^>]+d="[^"]+"[^>]*>/, '<rect fill="#EFECE1" width="1024" height="1024" />');

fs.writeFileSync('Logo_clean.svg', optimizedContent);
console.log('Original size:', content.length);
console.log('Clean size:', optimizedContent.length);
