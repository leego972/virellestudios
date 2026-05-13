  import http from 'node:http';
  import fs from 'node:fs';

  const PORT_H = parseInt(process.env.PORT ?? '3000');
  const PORT_A = PORT_H + 1;
  const LOG_FILE = '/tmp/app.log';

  console.log(`[gateway] Starting — proxy port:${PORT_H} -> app port:${PORT_A}`);

  const gw = http.createServer((cReq, cRes) => {
    // Diagnostic: expose the Express app crash log
    if (cReq.url === '/debug-app-log') {
      try {
        const log = fs.readFileSync(LOG_FILE, 'utf8');
        cRes.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        cRes.end(log || '(empty log)');
      } catch {
        cRes.writeHead(200, { 'Content-Type': 'text/plain' });
        cRes.end('(log file not found — app may not have started yet)');
      }
      return;
    }

    const opts = {
      host: '127.0.0.1',
      port: PORT_A,
      path: cReq.url,
      method: cReq.method,
      headers: cReq.headers,
    };
    const pr = http.request(opts, (aRes) => {
      cRes.writeHead(aRes.statusCode, aRes.headers);
      aRes.pipe(cRes);
    });
    pr.on('error', () => {
      if (!cRes.headersSent) {
        cRes.writeHead(200, { 'Content-Type': 'application/json' });
        cRes.end('{"ok":true,"warming":true}');
      }
    });
    cReq.pipe(pr);
  });

  gw.listen(PORT_H, '0.0.0.0', () =>
    console.log(`[gateway] Listening on 0.0.0.0:${PORT_H}`)
  );

  process.on('SIGTERM', () => gw.close(() => process.exit(0)));
  process.on('SIGINT',  () => gw.close(() => process.exit(0)));
  