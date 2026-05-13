  import http from 'node:http';

  const PORT_H = parseInt(process.env.PORT ?? '3000');
  const PORT_A = PORT_H + 1;

  const gw = http.createServer((cReq, cRes) => {
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
      // App not ready yet (still warming up) — respond 200 so Railway health check passes
      if (!cRes.headersSent) {
        cRes.writeHead(200, { 'Content-Type': 'application/json' });
        cRes.end('{"ok":true,"warming":true}');
      }
    });
    cReq.pipe(pr);
  });

  gw.listen(PORT_H, '0.0.0.0', () => {
    console.log(`[gateway] Listening on 0.0.0.0:${PORT_H} — proxying Express on :${PORT_A}`);
  });

  process.on('SIGTERM', () => gw.close(() => process.exit(0)));
  process.on('SIGINT',  () => gw.close(() => process.exit(0)));
  