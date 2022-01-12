const { mkdir, readdir, writeFile, readFile } = require('fs/promises');
const { networkInterfaces } = require('os');
const { homedir } = require('os');
const { join } = require('path');

const configDir =
  process.env.PROXY_CONFIG_DIR || join(homedir(), '.virtual-host-proxy');

async function ensureResolversConfig(rootDomain) {
  try {
    const exists = await checkIfRootDomainResolverExists(rootDomain);

    if (!exists) {
      await writeFile(`/etc/resolver/${rootDomain}`, 'nameserver 127.0.0.1');
    }
  } catch (err) {
    if (err.code === 'EACCES') {
      console.log('Resolver config not found, add it yourself:');
      console.log(
        `sudo -- sh -c 'mkdir -p /etc/resolver && echo nameserver 127.0.0.1 > /etc/resolver/${rootDomain}'`,
      );
    } else throw err;
  }
}

async function checkIfRootDomainResolverExists(rootDomain) {
  try {
    const files = await readdir('/etc/resolver');
    return files.includes(rootDomain);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await mkdir('/etc/resolver', { recursive: true });
      return false;
    }
    throw err;
  }
}

function getInterfaces() {
  return Object.values(networkInterfaces()).flatMap((interfaces) => {
    return interfaces.filter((x) => x.family === 'IPv4' && !x.internal);
  });
}

async function getNameserver() {
  try {
    const resolvConf = await readFile('/etc/resolv.conf', 'utf8');
    const match = resolvConf.match(/nameserver\s([\d.]+)/);

    if (!match) {
      return '8.8.8.8';
    }

    return match[1];
  } catch (err) {
    if (err.code === 'ENOENT') {
      return '8.8.8.8';
    }
    throw err;
  }
}

exports.configDir = configDir;
exports.ensureResolversConfig = ensureResolversConfig;
exports.getInterfaces = getInterfaces;
exports.getNameserver = getNameserver;
