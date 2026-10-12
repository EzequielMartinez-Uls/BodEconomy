const fs = require('fs');
const path = require('path');

const historyPath = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data', 'Default', 'History');
const tempPath = path.join(process.env.TEMP, 'EdgeHistoryCopy');

try {
  fs.copyFileSync(historyPath, tempPath);
  const buf = fs.readFileSync(tempPath, 'latin1');
  const urls = buf.match(/https?:\/\/[a-zA-Z0-9_\-\.\:\/]+/g) || [];
  const bodegonUrls = urls.filter(u => 
    u.includes('bodegon') || 
    u.includes('vercel') || 
    u.includes('netlify') || 
    u.includes('supabase') || 
    u.includes('5173') || 
    u.includes('3000') ||
    u.includes('8080')
  );
  console.log('Found URLs:');
  const unique = Array.from(new Set(bodegonUrls));
  unique.forEach(u => console.log('  ', u));
} catch(e) {
  console.error('Error:', e.message);
}
