const dns = require('native-node-dns');
const { isInSubnet } = require('is-in-subnet');
const { getInterfaces, getNameserver } = require('./config');
const { getAvailableDomains } = require('./http');

function createDnsServer(configDir) {
  const dnsServer = dns.createServer();

  dnsServer.on('request', (request, response) => {
    getAvailableDomains(configDir).then(
      async (domains) => {
        const [ourQuestions, theirQuestions] = partition(
          request.question,
          (x) =>
            domains.find((domain) => x.name.endsWith(domain)) && x.type === 1,
        );

        const interfaces = getInterfaces();
        const authority = await getNameserver();

        const answers = ourQuestions.flatMap((question) => {
          if (request.address.address === '127.0.0.1') {
            return dns.A({
              name: question.name,
              address: '127.0.0.1',
              ttl: 1800,
            });
          } else {
            return interfaces
              .filter((interface) =>
                isInSubnet(request.address.address, interface.cidr),
              )
              .map((interface) =>
                dns.A({
                  name: question.name,
                  address: interface.address,
                  ttl: 1800,
                }),
              );
          }
        });

        answers.push(
          ...(
            await Promise.all(
              theirQuestions.map((question) => proxyDns(question, authority)),
            )
          ).flat(),
        );

        response.answer = answers;
        response.send();
      },
      () => {
        response.answer = [];
        response.send();
      },
    );
  });

  return dnsServer;
}

function partition(array, predicate) {
  const arr1 = [];
  const arr2 = [];

  for (const element of array) {
    const arr = predicate(element) ? arr1 : arr2;
    arr.push(element);
  }

  return [arr1, arr2];
}

function proxyDns(question, server) {
  return new Promise((resolve, reject) => {
    const request = dns.Request({
      question,
      server,
      timeout: 1000,
    });

    const answers = [];

    request.on('message', (err, msg) => {
      if (err) reject(err);
      answers.push(...msg.answer);
    });

    request.on('end', () => {
      resolve(answers);
    });

    request.on('error', reject);
    request.send();
  });
}

exports.createDnsServer = createDnsServer;
