const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  try {
    const credOutput = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf-8',
    });
    const match = credOutput.match(/password=(.+)/);
    if (match) token = match[1].trim();
  } catch (e) {
    console.warn('No se pudo extraer credencial:', e.message);
  }
}

if (!token) {
  console.error('❌ Falta token de GitHub');
  process.exit(1);
}

const pkg = require('../package.json');
const tag = `v${pkg.version}`;
const distDir = path.join(__dirname, '..', 'dist-electron');

async function getReleaseId() {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: `/repos/EzequielMartinez-Uls/BodEconomy/releases/tags/${tag}`,
        method: 'GET',
        headers: {
          'User-Agent': 'NodeJS',
          Authorization: `token ${token}`,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.id) resolve(data.id);
            else reject(new Error(`Release no encontrada: ${body}`));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function uploadAsset(releaseId, fileName, assetUploadName, contentType) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(distDir, fileName);
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`Archivo no encontrado: ${filePath}`));
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    console.log(`📤 Subiendo ${assetUploadName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

    const options = {
      hostname: 'uploads.github.com',
      path: `/repos/EzequielMartinez-Uls/BodEconomy/releases/${releaseId}/assets?name=${encodeURIComponent(assetUploadName)}`,
      method: 'POST',
      headers: {
        'User-Agent': 'NodeJS',
        'Authorization': `token ${token}`,
        'Content-Type': contentType,
        'Content-Length': fileSize,
      },
      timeout: 300000, // 5 minutos
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ ${assetUploadName} subido exitosamente (Status: ${res.statusCode})`);
          resolve(JSON.parse(body));
        } else {
          console.error(`❌ Error al subir ${assetUploadName} (Status: ${res.statusCode}):`, body);
          reject(new Error(`Upload failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Error en request de ${assetUploadName}:`, err);
      reject(err);
    });

    const fileStream = fs.createReadStream(filePath);
    let uploadedBytes = 0;
    let lastPercent = 0;

    fileStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const percent = Math.floor((uploadedBytes / fileSize) * 100);
      if (percent >= lastPercent + 10 || percent === 100) {
        lastPercent = percent;
        process.stdout.write(`⏳ Progreso ${assetUploadName}: ${percent}% (${(uploadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(fileSize / (1024 * 1024)).toFixed(1)} MB)\r`);
      }
    });

    fileStream.pipe(req);
  });
}

async function main() {
  try {
    const releaseId = await getReleaseId();
    console.log(`🎯 Release encontrada (ID: ${releaseId}) para versión ${tag}`);

    // 1. Subir latest.yml
    await uploadAsset(releaseId, 'latest.yml', 'latest.yml', 'text/yaml');

    // 2. Subir instalador .exe
    const exeFileName = `BodegonControl Setup ${pkg.version}.exe`;
    const exeUploadName = `BodegonControl-Setup-${pkg.version}.exe`;
    await uploadAsset(releaseId, exeFileName, exeUploadName, 'application/octet-stream');

    console.log(`\n🎉 ¡Todos los assets de la release ${tag} subidos y validados exitosamente en GitHub!`);
  } catch (err) {
    console.error('\n❌ Fallo en la subida de assets:', err);
    process.exit(1);
  }
}

main();
