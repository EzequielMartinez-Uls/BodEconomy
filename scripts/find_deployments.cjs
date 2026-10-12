const fs = require('fs');
const path = require('path');
const tempPath = path.join(process.env.TEMP, 'BraveHistoryCopy');
const buf = fs.readFileSync(tempPath, 'latin1');
const urls = buf.match(/https?:\/\/[a-zA-Z0-9_\-\.]+\.(vercel\.app|netlify\.app|supabase\.co)[^\x00\s\"'<>]*/g) || [];
console.log('Unique deployment URLs:');
const unique = Array.from(new Set(urls));
unique.forEach(u => console.log('  ', u));
