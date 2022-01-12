const { createServer } = require('http');
const { createProxyServer } = require('http-proxy');
const { readFile, readdir } = require('fs/promises');
const { join } = require('path');

function createHttpProxyServer(configDir, domain) {
  const proxy = createProxyServer({});

  const server = createServer((req, res) =>
    (async () => {
      const config = await getHostConfigIfProxyable(configDir, domain, req);

      if (config) {
        proxy.web(
          req,
          res,
          { target: `http://127.0.0.1:${config.port}` },
          (err) => {
            if (err.code === 'ECONNREFUSED') {
              sendHtml(
                res,
                `<h1>Service not started</h1>
                <p>${config.domain} expects a listener on port ${config.port}</p>
                <a href="http://localhost">Available services</a>`,
                503,
              );
            } else {
              sendHtml(res, `<h1>Error</h1><pre>${err.stack}</pre>`, 500);
            }
          },
        );
      } else {
        sendHtml(res, await getServiceListPage(configDir));
      }
    })().then(null, (err) => {
      sendHtml(res, `<h1>Error</h1><pre>${err.stack}</pre>`, 500);
    }),
  );

  return server;
}

async function getHostConfigIfProxyable(configDir, domain, req) {
  // make sure we've got all the required info
  if (
    !req.headers.host ||
    !req.headers.host.endsWith(domain) ||
    !req.socket.remoteAddress
  ) {
    return null;
  }

  // make sure we can get the config
  const config = await readHostConfig(configDir, req.headers.host);
  if (!config) return null;

  return config;
}

async function readHostConfig(configDir, host) {
  try {
    const domains = (await getAvailableDomains(configDir)).sort(
      (a, b) => b.length - a.length,
    );

    const domain = domains.find((x) => host === x || host.endsWith('.' + x));
    if (!domain) return null;

    const config = await readFile(join(configDir, domain), 'utf8');
    const port = parseInt(config);
    return isNaN(port) ? null : { domain, port };
  } catch {
    return null;
  }
}

async function getAvailableDomains(configDir) {
  try {
    const files = await readdir(configDir);
    return files.filter((x) => !x.startsWith('.'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    } else throw err;
  }
}

async function getServiceListPage(configDir) {
  const domains = await getAvailableDomains(configDir);

  const domainList = domains.map(
    (domain) => `<li><a href="http://${domain}">${domain}</a></li>`,
  );

  return domainList.length
    ? `<h1>Available services</h1><ul>${domainList.join('')}</ul>`
    : `<h1>No available services</h1><p>Define some services in <code>${configDir}</code> to get started.</p>`;
}

function sendHtml(res, contents, status = 200) {
  if (!res.headersSent) {
    res.writeHead(status, { 'Content-Type': 'text/html' });
  }
  res.end(getHtmlDoc(contents));
}

function getHtmlDoc(contents) {
  return `<!DOCTYPE html>
<html>
<head>
<title>Proxy</title>
<style>
body { font-family: sans-serif; }
</style>
<body>
${contents}
</body>
</html>`;
}

module.exports.createHttpProxyServer = createHttpProxyServer;
module.exports.getAvailableDomains = getAvailableDomains;
