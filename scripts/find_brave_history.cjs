const fs = require('fs');
const path = require('path');
const historyPath = path.join(process.env.LOCALAPPDATA, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'History');
const tempPath = path.join(process.env.TEMP, 'BraveHistoryCopy');
try {
  fs.copyFileSync(historyPath, tempPath);
  const buf = fs.readFileSync(tempPath, 'latin1');
  const urls = buf.match(/https?:\/\/[a-zA-Z0-9_\-\.\:\/\?\#\=\&]+/g) || [];
  console.log('Total URLs in Brave:', urls.length);
  const bodegon = urls.filter(u => 
    u.includes('bodegon') || 
    u.includes('vercel') || 
    u.includes('supabase') || 
    u.includes('netlify') || 
    u.includes('github') || 
    u.includes('app') || 
    u.includes('onrender') ||
    u.includes('localhost') ||
    u.includes('firebase')
  );
  console.log('Relevant URLs:');
  Array.from(new Set(bodegon)).forEach(u => console.log('  ', u));
} catch(e) {
  console.error('Error:', e.message);
}
