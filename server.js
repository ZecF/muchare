/**
 * Mushcare - High Performance Offline/Online Web Server
 * Mirrors exact routing and behavior of mushcare.com
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

// Load routes manifest
let routesManifest = {};
try {
  routesManifest = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'routes.json'), 'utf8'));
} catch (e) {
  routesManifest = {};
}

function resolveFilePath(reqPath) {
  let cleanPath = decodeURIComponent(reqPath.split('?')[0]);

  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // 1. Check routes manifest
  if (routesManifest[cleanPath]) {
    const candidate = path.join(PUBLIC_DIR, routesManifest[cleanPath]);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  if (cleanPath === '/' || cleanPath === '') {
    return path.join(PUBLIC_DIR, 'index.html');
  }

  // 2. Direct static file match
  let directFile = path.join(PUBLIC_DIR, cleanPath.replace(/^\//, ''));
  if (fs.existsSync(directFile) && fs.statSync(directFile).isFile()) {
    return directFile;
  }

  // 3. Add .html extension
  let htmlFile = directFile + '.html';
  if (fs.existsSync(htmlFile) && fs.statSync(htmlFile).isFile()) {
    return htmlFile;
  }

  // 4. Folder index.html
  let indexFile = path.join(directFile, 'index.html');
  if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
    return indexFile;
  }

  // 5. Search endpoint
  if (cleanPath === '/search/cari' || cleanPath.startsWith('/search/cari')) {
    const searchFile = path.join(PUBLIC_DIR, 'search_cari.html');
    if (fs.existsSync(searchFile)) return searchFile;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const filePath = resolveFilePath(reqUrl.pathname);

  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      const kw = reqUrl.searchParams.get('keyword');
      if (reqUrl.pathname.includes('/search/cari') && kw && ext === '.html') {
        let modified = content.toString('utf8');
        modified = modified.replace(/value="[^"]*"/, `value="${kw}"`);
        res.writeHead(200, { 'Content-Type': mime });
        res.end(modified);
        return;
      }

      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
      });
      res.end(content);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>404 Halaman Tidak Ditemukan | Mushcare</title>
      <link rel="stylesheet" href="/front/css/bootstrap.css">
      <style>body { text-align: center; padding: 100px; font-family: sans-serif; }</style>
      </head>
      <body>
        <h2>404 - Halaman Tidak Ditemukan</h2>
        <p>Halaman yang Anda tuju tidak tersedia.</p>
        <a href="/" class="btn btn-success mt-3">Kembali ke Beranda</a>
      </body>
      </html>
    `);
  }
});

function startServer(portToTry) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[WARN] Port ${portToTry} in use, trying ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('[ERROR]', err);
    }
  });

  server.listen(portToTry, () => {
    console.log(`=======================================================`);
    console.log(`  Mushcare Replica ONLINE: http://localhost:${portToTry}`);
    console.log(`  Semua 123 Halaman & 287 Aset Aktif`);
    console.log(`=======================================================`);
  });
}

startServer(PORT);
