#!/usr/bin/env node
const daemonize = require('daemonize2');
const { configDir } = require('./config');
const { mkdirSync, writeFileSync, unlinkSync } = require('fs');
const AutoLaunch = require('auto-launch');
const { join, basename } = require('path');
const { ensureResolversConfig } = require('./config');

mkdirSync(configDir, { recursive: true });

const daemon = daemonize.setup({
  main: 'daemon.js',
  name: 'virtual-host-proxy',
  pidfile: configDir + '/.pid',
  silent: true,
});

daemon
  .on('starting', function () {
    console.log('Starting daemon...');
  })
  .on('started', function (pid) {
    console.log(`Daemon started (PID: ${pid})`);
  })
  .on('stopping', function () {
    console.log('Stopping daemon...');
  })
  .on('stopped', function (pid) {
    console.log('Daemon stopped');
  })
  .on('running', function (pid) {
    console.log(`Daemon already running (PID: ${pid})`);
  })
  .on('notrunning', function () {
    console.log('Daemon is not running');
  })
  .on('error', function (err) {
    console.log('Daemon failed to start:  ' + err.message);
  });

const autolauncher = new AutoLaunch({
  name: 'virtual-host-proxy',
  path: process.argv[1],
  mac: { useLaunchAgent: true },
});

switch (process.argv[2]) {
  case 'init':
    await ensureResolversConfig(rootDomain);
    break;

  case 'autolaunch':
    switch (process.argv[3]) {
      case 'enable':
        autolauncher.enable().then(
          () => console.log('Enabled'),
          (err) =>
            console.error(`Could not enable auto launch: ${err.message}`),
        );
        break;

      case 'disable':
        autolauncher.disable().then(
          () => console.log('Disabled'),
          (err) =>
            console.error(`Could not disable auto launch: ${err.message}`),
        );
        break;

      case undefined:
      case 'status':
        autolauncher.isEnabled().then(
          (enabled) => console.log(enabled ? 'Enabled' : 'Disabled'),
          (err) =>
            console.error(
              `Could not retrieve auto launch status: ${err.message}`,
            ),
        );
        break;

      default:
        console.log(
          'Usage: virtual-host-proxy autolaunch [enable|disable|status]',
        );
    }
    break;

  case 'start':
    daemon.start().once('started', () => {
      process.exit();
    });
    break;

  case 'stop':
    daemon.stop();
    break;

  case 'kill':
    daemon.kill();
    break;

  case 'restart':
    if (daemon.status()) {
      daemon.stop().once('stopped', () => {
        daemon.start().once('started', () => {
          process.exit();
        });
      });
    } else {
      daemon.start().once('started', () => {
        process.exit();
      });
    }
    break;

  case 'status':
    const pid = daemon.status();
    if (pid) console.log(`Running (PID: ${pid})`);
    else console.log('Stopped');
    break;

  case undefined:
  case 'run':
    require('./daemon');
    break;

  case 'add':
    if (!process.argv[3] || isNaN(parseInt(process.argv[4]))) {
      console.log('Usage virtual-host-proxy add <domain> <port>');
    } else {
      writeFileSync(join(configDir, process.argv[3]), process.argv[4]);
    }
    break;

  case 'remove':
    if (!process.argv[3]) {
      console.log('Usage virtual-host-proxy remove <domain>');
    } else {
      unlinkSync(join(configDir, basename(process.argv[3])));
    }
    break;

  default:
    console.log(
      'Usage: virtual-host-proxy [init|autolaunch|run|start|stop|kill|restart|reload|status|add|remove]',
    );
}
