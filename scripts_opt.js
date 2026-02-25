var fs = require('fs');
var content = fs.readFileSync('Logo_optimized.svg', 'utf8');
var parts = content.split('<path');
var filtered = [parts[0]];
for (var i = 1; i < parts.length; i++) {
    var p = parts[i];
    if (p.toLowerCase().indexOf('#efece1') !== -1 && p.length > 2000) {
        filtered.push(' <rect fill="#EFECE1" width="1024" height="1024" />');
    } else if (p.length < 1000 || p.toLowerCase().indexOf('#efece1') === -1) {
        filtered.push('<path' + p);
    }
}
fs.writeFileSync('Logo_clean.svg', filtered.join(''));
console.log('Done: ' + fs.statSync('Logo_clean.svg').size);
