import express from 'express';
import lt from 'localtunnel';
import fs from 'fs';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

const SUPPORTED_TUNNELS = [
    { long: 'localtunnel', short: 'lt' },
    { long: 'pinggy', short: 'pg' },
];

const args = process.argv.slice(2);

const argMap = [
    {
        long: '--port',
        short: '-p',
        type: 'number',
        description: 'Port to run the server on',
        default: 3000,
    },
    {
        long: '--tunnel',
        short: '-t',
        type: 'string',
        values: SUPPORTED_TUNNELS,
        description: 'Local tunnel service'
    },
    {
        long: '--tunnel-subdomain',
        short: '-s',
        type: 'string',
        description: 'Subdomain for the tunnel',
    },
    {
        long: '--help',
        short: '-h',
        description: 'Show help',
    },
];

const parsedArgs = args.reduce((acc, arg, index) => {
    const argDef = argMap.find(a => a.long === arg || a.short === arg);
    const nextArg = args[index + 1];
    let previousArg: string | undefined;
    try { previousArg = args[index - 1] } catch (e) { }

    if (argDef) {
        if (argDef.type === 'boolean') {
            acc[argDef.long] = true;
        } else if (argDef.type === 'number') {
            acc[argDef.long] = parseInt(nextArg, 10);
        } else {
            acc[argDef.long] = nextArg;
        }

        if (argDef.values) {
            const nextArgValue = argDef.values.find(v => v.long === nextArg || v.short === nextArg);
            if (!nextArgValue) {
                console.error(`Invalid value for ${argDef.long}: ${nextArg}`);
                process.exit(1);
            } else {
                acc[argDef.long] = nextArgValue.long;
            }
        }
    } else {
        // If previousArg is not a flag, append to path:
        if (!arg.startsWith('-') && !previousArg?.startsWith('-')) {
            acc['path'] = (acc['path'] || '') + args[index];
        }
    }

    return acc;
}, {});

// Show help if requested
if (parsedArgs['-h']) {
    console.log('Usage: tsx-serve [options] [path]');
    console.log('Options:');
    argMap.forEach(arg => {
        console.log(`  ${arg.short}, ${arg.long.padEnd(20)} ${arg.description}`);
    });
    console.log('\nExamples:');
    console.log('  tsx-serve -p 8080');
    console.log('  tsx-serve -t pinggy .');
    console.log('  tsx-serve -p 80 -t localtunnel -s mysubdomain /var/www');
    process.exit(0);
}

const port = parsedArgs['--port'] || 3000;

// Validate port
if (port < 1 || port > 65535) {
    console.error('Invalid port number. Please choose a number between 1 and 65535.');
    process.exit(1);
}

// Validate path
if (parsedArgs['path'] && !fs.existsSync(parsedArgs['path'])) {
    console.error(`Path does not exist: ${parsedArgs['path']}`);
    process.exit(1);
}

const tunnelConfig = SUPPORTED_TUNNELS.find(t => t.long === parsedArgs['--tunnel']);
if (tunnelConfig && !SUPPORTED_TUNNELS.some(t => t.long === tunnelConfig.long)) {
    console.error(`Unsupported tunnel service: ${tunnelConfig.long}`);
    process.exit(1);
}


const app = express();

const path = fs.realpathSync(parsedArgs['path']);
if (fs.lstatSync(path).isFile()) {
    app.get('/', (req, res) => {
        res.sendFile(path);
    });
} else {
    app.use(express.static(parsedArgs['path']));
}

const waitToExit = (childProcess?: ChildProcessWithoutNullStreams) => {
    console.log(`Press \x1b[1mCtrl+C\x1b[0m or \x1b[1mQ\x1b[0m twice to stop the server`);
    let exitCount = 0;
    let exitTimeout: NodeJS.Timeout;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key: Buffer) => {
        if (key.toString() === 'q' || key.toString() === 'Q') {
            exitCount++;
            if (exitCount === 2) {
                if (childProcess) {
                    console.log('Closing tunnel...');
                    childProcess.kill('SIGKILL');
                }
                console.log('Exiting...');
                process.exit(0);
            } else {
                console.log('Press \x1b[1mQ\x1b[0m again to exit');
                clearTimeout(exitTimeout);
                exitTimeout = setTimeout(() => {
                    console.log('Exit action cancelled');   
                    exitCount = 0;
                }, 1000);
            }
        } else {
            exitCount = 0;
        }
    });
};


app.listen(port, async () => {
    console.log('');
    console.log(`Serving path: \x1b[1m${path}\x1b[0m`);
    console.log('');
    console.log(`Local server listening on \x1b[1mhttp://localhost:${port}\x1b[0m`);
    console.log('');

    if (tunnelConfig) {
        try {
            switch (tunnelConfig.long) {
                case 'localtunnel':
                    console.log('Creating localtunnel...');
                    console.log('');
                    const tunnelInstance = await lt({ port });
                    console.log(`Tunnel started on ${tunnelInstance.url}`);
                    console.log('');
                    waitToExit();
                    break;
                case 'pinggy':
                    console.log('Creating \x1b[1mPinggy\x1b[0m tunnel...');
                    console.log('');

                    const pinggyTunnel = spawn('ssh', ['-T', '-p', '443', '-R0:localhost:' + port, '-L4300:localhost:4300', 'qr@a.pinggy.io'], {
                        stdio: ['pipe', 'pipe', 'pipe'],
                    });

                    pinggyTunnel.stdout.on('data', (data) => {
                        const lines = data.toString().split('\n');
                        const tunnelHttpUrl = lines.find(l => l.includes('.free.pinggy.lin'))?.trim();
                        const tunnelHttpsUrl = lines.find(l => l.includes('.free.pinggy.lin'))?.trim();

                        if (tunnelHttpUrl) console.log('Http URL:\t\x1b[1m', tunnelHttpUrl, '\x1b[0m');
                        if (tunnelHttpsUrl) {
                            console.log('Https URL:\t\x1b[1m', tunnelHttpsUrl, '\x1b[0m');
                            console.log('');
                            waitToExit(pinggyTunnel);
                        }
                    });

                    pinggyTunnel.stderr.on('data', (data) => {
                        const message = data.toString();
                        if (message.includes('Allocated port')) {
                            // Ignore
                        } else {
                            console.error('Pinggy error:', message);
                        }
                    });

                    pinggyTunnel.on('close', (code) => {
                        const exitCode = [0, 255].includes(code ?? 255) ? 0 : 1;
                        console.log('Pinggy tunnel closed with code:', code);
                        process.exit(exitCode);
                    });

                    pinggyTunnel.on('exit', (code) => {
                        const exitCode = [0, 255].includes(code ?? 255) ? 0 : 1;
                        console.log('Pinggy tunnel exited with code:', code);
                        process.exit(exitCode);
                    });

                    break;
            }
        } catch (err) {
            console.error('Error creating tunnel:', err);
            process.exit(1);
        }
    } else {
        console.log('');
        waitToExit();
    }
});
