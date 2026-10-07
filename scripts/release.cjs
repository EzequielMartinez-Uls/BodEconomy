const { execSync, spawnSync } = require('child_process');
const https = require('https');

console.log('🚀 Iniciando pipeline de publicación automatizada a GitHub Releases...');

// 1. Obtener token de GitHub desde Git Credential Manager
let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  try {
    const credOutput = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf-8',
    });
    const match = credOutput.match(/password=(.+)/);
    if (match) {
      token = match[1].trim();
      console.log('🔑 Credencial de GitHub recuperada exitosamente.');
    }
  } catch (e) {
    console.warn('No se pudo extraer credencial de Git Credential Manager:', e.message);
  }
}

if (!token) {
  console.error('❌ Error: No se encontró token de GitHub. Configure GH_TOKEN.');
  process.exit(1);
}

process.env.GH_TOKEN = token;
process.env.GITHUB_TOKEN = token;

// 2. Compilar aplicación
console.log('📦 Compilando frontend...');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
execSync(`${npmCmd} run build`, { stdio: 'inherit', shell: true });

// 3. Ejecutar electron-builder
console.log('⚡ Empaquetando ejecutables para Windows...');
spawnSync(npxCmd, ['electron-builder', '--win', '--publish', 'always'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

// 4. Publicar la release en GitHub si quedó en draft
console.log('📡 Verificando estado y publicando release en GitHub...');

// 5. Publicar el borrador en GitHub si quedó en draft
try {
  const pkg = require('../package.json');
  const tag = `v${pkg.version}`;
  console.log(`📡 Verificando estado de la release ${tag} en GitHub...`);

  const req = https.request(
    {
      hostname: 'api.github.com',
      path: '/repos/EzequielMartinez-Uls/BodEconomy/releases',
      method: 'GET',
      headers: {
        'User-Agent': 'NodeJS',
        Authorization: `token ${token}`,
      },
    },
    (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const draftRel = list.find((r) => r.tag_name === tag && r.draft);
          if (draftRel) {
            console.log(`📢 Publicando release borrador #${draftRel.id}...`);
            const patchData = JSON.stringify({
              tag_name: tag,
              name: `Bodegón Control ${tag}`,
              draft: false,
            });
            const patchReq = https.request(
              {
                hostname: 'api.github.com',
                path: `/repos/EzequielMartinez-Uls/BodEconomy/releases/${draftRel.id}`,
                method: 'PATCH',
                headers: {
                  'User-Agent': 'NodeJS',
                  Authorization: `token ${token}`,
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(patchData),
                },
              },
              (pres) => {
                console.log(`✅ ¡Release ${tag} publicada oficialmente en GitHub con éxito!`);
              }
            );
            patchReq.write(patchData);
            patchReq.end();
          } else {
            console.log(`✅ Release ${tag} ya está activa y publicada.`);
          }

          // Asegurar siempre que latest.yml y el .exe estén presentes
          try {
            console.log('🛡️ Verificando y asegurando assets completos (latest.yml y .exe)...');
            execSync('node scripts/upload-release-assets.cjs', { stdio: 'inherit' });
          } catch (eAsset) {
            console.warn('Advertencia en verificación de assets:', eAsset.message);
          }
        } catch (err) {
          console.error('Error parseando respuesta de GitHub:', err);
        }
      });
    }
  );
  req.end();
} catch (e) {
  console.warn('Error al verificar publicación final:', e.message);
}
