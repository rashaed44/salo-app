const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = path.join(__dirname, 'www');

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

// كاش في الذاكرة
const cache = new Map();
const CACHE_MAX_AGE = 3600000; // ساعة واحدة

function getCacheKey(filePath) {
    return filePath;
}

http.createServer((req, res) => {
    let cleanUrl = req.url.split('?')[0];
    let reqUrl = cleanUrl === '/' ? '/index.html' : cleanUrl;
    let filePath = path.join(PUBLIC_DIR, reqUrl);

    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    let ext = path.extname(filePath).toLowerCase();
    let contentType = mimeTypes[ext] || 'application/octet-stream';

    // فحص الكاش
    const cacheKey = getCacheKey(filePath);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_MAX_AGE) {
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
            'X-Cache': 'HIT'
        });
        res.end(cached.content);
        return;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (reqUrl !== '/index.html' && !reqUrl.includes('.')) {
                fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, content2) => {
                    if (err2) {
                        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('<h1>404 - File Not Found</h1>');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(content2);
                });
                return;
            }
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 - File Not Found</h1>');
            return;
        }

        // احفظ في الكاش
        cache.set(cacheKey, { content, time: Date.now() });

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
            'X-Cache': 'MISS'
        });
        res.end(content);
    });
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Caching enabled (1 hour)`);
});
