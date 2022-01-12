# virtual-host-proxy

A DNS and HTTP proxy to forward virtual hosts to ports on your local machine.
(OS X only at the moment, PRs welcome.)

If you've developed any larger web applications, you're probably used to having
half a dozen different services on different ports, so for example your main
React application might be at http://localhost:8000/ and your API might be at
http://localhost:3000. Once you start to add more services it starts to become
harder to remember the ports, and then you'll have to trawl through
configuration files to figure out what port you're aiming for.

Wouldn't it be nice if you could just have your application at e.g.
http://app.localhost and your api at http://api.localhost and some bit of
software would figure it all out for you?

You can already use `dnsmasq` to
[point domains to your local machine](https://passingcuriosity.com/2013/dnsmasq-dev-osx/),
but you would also have to install something like nginx to forward the HTTP
requests to the correct service.

This utility, `virtual-host-proxy`, handles both parts for you from one set of
simple configuration.

## Setting up

You can install the utility globally:

```
npm install -g virtual-host-proxy
```

You can then run the `init` command to set up the resolver config:

```
virtual-host-proxy init
```

This basically sets up some config that tells OS X to forward all DNS requests
for the TLD `localhost` (by default) to a local DNS server (which will be this
utility if running).

If it doesn't have permission to do this, it will print the command you should
run in order to set it up yourself.

You can then run the `run` command to start the server, or the `start` command
to start it as a daemon:

```
virtual-host-proxy start
```

If you are running it inline, `Ctrl+C` will quit, while the `stop` command will
stop the daemon.

You can also `kill`, `restart` or check the `status` of the daemon:

```
virtual-host-proxy kill
virtual-host-proxy restart
virtual-host-proxy status
```

If you want it to start automatically when you log in, you can use the
`autolaunch` commands:

```
virtual-host-proxy autolaunch status
virtual-host-proxy autolaunch enable
virtual-host-proxy autolaunch disable
```

These check the autolaunch status, enable and disable it respectively.

## Configuring virtual hosts

Each virtual host is represented by a file in the config directory (default
`~/.virtual-host-proxy`) with the file name being the full domain name
represented (e.g. `app.localhost`). The file consists simply of the port number
to forward to.

Note all subdomains of any domains you have defined will also map to the same
service. The matching algorithm compares the incoming host name in an HTTP
request with the defined virtual hosts and chooses the longest. Therefore, if
you have two files, `app.localhost` with contents `8000` and
`secure.app.locahost` with contents `8001`, an HTTP request for
`secure.app.localhost` will connect to `8001`, and a request for
`other.app.localhost` will connect to `8000`.

You can either create these files manually, or use the `add` and `remove`
commands:

```
virtual-host-proxy add app.localhost 8000
virtual-host-proxy remove app.localhost
```

Of course, the following code will do it too:

```js
const { writeFileSync } = require('fs');
const { homedir } = require('os');
const { join } = require('path');
const hostname = 'app.localhost';
const port = '80';

writeFileSync(join(homedir, '.virtual-host-proxy', hostname), port);
```

## Usage from virtual machines

The utility should be able to figure out if a DNS request is coming from a
specific interface, such as a VM, and respond appropriately so that the VM
connects to the correct IP address (i.e., it won't be `127.0.0.1` in the case of
a VM).

## OS X only for now

It shouldn't be too hard to adjust this for other platforms, I just haven't yet.
