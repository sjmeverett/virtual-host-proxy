#!/usr/bin/env node
const { createDnsServer } = require('./dns');
const { createHttpProxyServer } = require('./http');
const { configDir } = require('./config');

async function main() {
  const rootDomain = process.env.PROXY_ROOT_DOMAIN || 'localhost';

  const httpServer = createHttpProxyServer(configDir, '.' + rootDomain);
  httpServer.listen(80);

  httpServer.on('listening', () => {
    console.log('HTTP server listening');
  });

  const dnsServer = createDnsServer(configDir);
  dnsServer.serve(53);

  dnsServer.on('listening', () => {
    console.log('DNS server listening');
  });

  process.on('SIGINT', () => {
    console.log('Shutting down...');
    httpServer.close();
    dnsServer.close();
    process.exit(0);
  });
}

main().then(null, (err) => {
  console.error(err);
  process.exit(1);
});
