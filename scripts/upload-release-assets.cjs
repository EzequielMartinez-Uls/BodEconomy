const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function getGitHubToken() {
  let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    const credOutput = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf-8',
    });
    const match = credOutput.match(/password=(.+)/);
    if (match) token = match[1].trim();
  }
  return token;
}

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

const { spawnSync } = require('child_process');

function uploadFile(uploadUrl, filePath, assetName, token, contentType = 'application/octet-stream') {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    console.log(`📤 Subiendo ${assetName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

    const cleanUploadUrl = uploadUrl.replace(/\{.*?\}$/, '') + '?name=' + encodeURIComponent(assetName);

    const args = [
      '-L',
      '--ssl-no-revoke',
      '--fail-with-body',
      '--retry', '3',
      '--retry-delay', '5',
      '-X', 'POST',
      '-H', `Authorization: token ${token}`,
      '-H', `Content-Type: ${contentType}`,
      '--data-binary', `@${filePath}`,
      cleanUploadUrl
    ];

    const result = spawnSync('curl.exe', args, {
      stdio: ['ignore', 'pipe', 'inherit'],
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    });

    if (result.status === 0) {
      console.log(`✅ ${assetName} subido exitosamente a GitHub.`);
      try {
        resolve(JSON.parse(result.stdout));
      } catch {
        resolve({ ok: true });
      }
    } else {
      reject(new Error(`curl falló con código ${result.status}: ${result.stdout || ''}`));
    }
  });
}

async function main() {
  const token = await getGitHubToken();
  if (!token) {
    console.error('No se pudo obtener el token de GitHub.');
    process.exit(1);
  }

  const pkg = require('../package.json');
  const tag = `v${pkg.version}`;
  console.log(`🔍 Buscando release ${tag}...`);

  // Buscar en la lista general de releases para encontrar drafts también
  const allReleasesRes = await fetchJson(
    `https://api.github.com/repos/EzequielMartinez-Uls/BodEconomy/releases`,
    {
      headers: {
        'User-Agent': 'NodeJS',
        Authorization: `token ${token}`,
      },
    }
  );

  let release = Array.isArray(allReleasesRes.data)
    ? allReleasesRes.data.find((r) => r.tag_name === tag)
    : null;

  if (release && release.draft) {
    console.log(`📝 Publicando release draft existente #${release.id}...`);
    await new Promise((resolve) => {
      const payload = JSON.stringify({ draft: false });
      const req = https.request(
        {
          hostname: 'api.github.com',
          path: `/repos/EzequielMartinez-Uls/BodEconomy/releases/${release.id}`,
          method: 'PATCH',
          headers: {
            'User-Agent': 'NodeJS',
            Authorization: `token ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            try { release = JSON.parse(d); } catch {}
            resolve();
          });
        }
      );
      req.on('error', resolve);
      req.write(payload);
      req.end();
    });
  }

  if (!release || !release.id) {
    console.log(`✨ La release ${tag} no existía. Creándola en GitHub...`);
    release = await new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        tag_name: tag,
        name: `Bodegón Control ${tag}`,
        draft: false,
        prerelease: false,
        generate_release_notes: true,
      });
      const req = https.request(
        {
          hostname: 'api.github.com',
          path: '/repos/EzequielMartinez-Uls/BodEconomy/releases',
          method: 'POST',
          headers: {
            'User-Agent': 'NodeJS',
            Authorization: `token ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(d));
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  if (!release || !release.id) {
    console.error('No se pudo crear o encontrar la release:', release);
    process.exit(1);
  }
  console.log(`Release encontrada: #${release.id} (${release.tag_name})`);

  const existingAssets = (release.assets || []).map((a) => a.name);
  console.log('Archivos ya presentes en la release:', existingAssets);

  const distDir = path.join(__dirname, '..', 'dist-electron');
  const filesToUpload = [
    {
      local: path.join(distDir, `BodegonControl Setup ${pkg.version}.exe`),
      name: `BodegonControl-Setup-${pkg.version}.exe`,
      type: 'application/vnd.microsoft.portable-executable',
    },
    {
      local: path.join(distDir, `BodegonControl ${pkg.version}.exe`),
      name: `BodegonControl-${pkg.version}.exe`,
      type: 'application/vnd.microsoft.portable-executable',
    },
    {
      local: path.join(distDir, `BodegonControl Setup ${pkg.version}.exe.blockmap`),
      name: `BodegonControl-Setup-${pkg.version}.exe.blockmap`,
      type: 'application/octet-stream',
    },
    {
      local: path.join(distDir, 'latest.yml'),
      name: 'latest.yml',
      type: 'application/x-yaml',
    },
  ];

  for (const item of filesToUpload) {
    if (existingAssets.includes(item.name)) {
      console.log(`⏭️ ${item.name} ya existe en la release, saltando.`);
      continue;
    }
    if (!fs.existsSync(item.local)) {
      console.warn(`⚠️ Archivo local no encontrado: ${item.local}`);
      continue;
    }

    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await uploadFile(release.upload_url, item.local, item.name, token, item.type);
        success = true;
        break;
      } catch (err) {
        console.warn(`⚠️ Intento ${attempt}/3 falló para ${item.name}:`, err.message);
        if (attempt < 3) {
          console.log('Esperando 3s antes de reintentar...');
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }
    if (!success) {
      console.error(`❌ Fallaron todos los intentos para subir ${item.name}`);
    }
  }

  console.log('\n🎉 ¡Todos los ejecutables fueron verificados y procesados para GitHub Releases!');
}

main().catch(console.error);
