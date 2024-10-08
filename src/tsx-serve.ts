import express from 'express';
import lt from 'localtunnel';
import fs from 'fs';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

// Define types for supported tunnels and arguments
type Tunnel = {
    long: string;
    short: string;
    quickSubdomains?: boolean
};

type ArgMapItem = {
    long: string;
    short: string;
    type?: 'string' | 'number' | 'boolean';
    values?: Tunnel[];
    description: string;
    default?: number;
};

// Supported tunnel services
const SUPPORTED_TUNNELS: Tunnel[] = [
    { long: 'localtunnel', short: 'lt', quickSubdomains: true },
    { long: 'pinggy', short: 'pg' },
];

// Argument map with definitions
const argMap: ArgMapItem[] = [
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
        description: 'Local tunnel service',
    },
    {
        long: '--subdomain',
        short: '-s',
        type: 'string',
        description: 'Subdomain for the tunnel',
    },
    {
        long: '--help',
        short: '-h',
        description: 'Show help',
    },
    {
        long: '--version',
        short: '-v',
        description: 'Show version',
    }
];

// Check OS compatibility (Linux and macOS only)
if (process.platform === 'win32') {
    console.error('Windows is not supported (yet). A temporary solution is to use WSL.');
    process.exit(1);
}

// Parse CLI arguments
const parsedArgs = argsParser(process.argv.slice(2), argMap);

// Function to parse and map arguments
function argsParser(args: string[], argMap: ArgMapItem[]) {
    return args.reduce((acc: Record<string, any>, arg, index) => {
        const argDef = argMap.find(a => a.long === arg || a.short === arg);
        if (argDef) {
            const nextArg = args[index + 1];
            if (argDef.type === 'boolean') {
                acc[argDef.long] = true;
            } else if (argDef.type === 'number' && !isNaN(Number(nextArg))) {
                acc[argDef.long] = parseInt(nextArg, 10);
            } else if (argDef.type === 'string') {
                if (nextArg && !nextArg.startsWith('-')) {
                    acc[argDef.long] = nextArg;
                }
            } else {
                acc[argDef.long] = true;
            }
        } else if (!arg.startsWith('-')) {
            acc['path'] = arg;
        }
        return acc;
    }, {});
}

// Show help if requested
if (parsedArgs['--help']) {
    displayHelp(argMap);
    process.exit(0);
}

// Show version if requested
if (parsedArgs['--version']) {
    displayVersion();
    process.exit(0);
}

// Retrieve or set default port
const port: number = parsedArgs['--port'] || 3000;
validatePort(port);

// Validate path
const path = parsedArgs['path'] || '.';
validatePath(path);

// Find the tunnel configuration
let tunnelConfig = SUPPORTED_TUNNELS.find(t => t.long === parsedArgs['--tunnel'] || t.short === parsedArgs['--tunnel']);

// If subdomain is specified but tunnel option is not, default to localtunnel
if (!tunnelConfig) {
    if (parsedArgs['--subdomain']) {
        parsedArgs['--tunnel'] = 'localtunnel';
        tunnelConfig = SUPPORTED_TUNNELS.find(t => t.long === 'localtunnel');
    } else if (parsedArgs['--tunnel']) {
        console.error(`Unsupported tunnel service: ${parsedArgs['--tunnel']}`);
        console.error(`These are the supported tunnel services: ${SUPPORTED_TUNNELS.map(t => t.long).join(', ')}`);
        process.exit(1);
    }
}

// Check if selected tunneling service supports quick subdomains
if (parsedArgs['--subdomain'] && tunnelConfig && !tunnelConfig.quickSubdomains) {
    console.error(`Subdomains are not supported by ${tunnelConfig.long}`);
    console.error(`These are the supported tunnel services with subdomains: ${SUPPORTED_TUNNELS.filter(t => t.quickSubdomains).map(t => t.long).join(', ')}`);
    process.exit(1);
}

// Function to create tunnels based on the selected service
async function createTunnel(service: string, port: number) {
    try {
        switch (service) {
            case 'localtunnel':
                createLocalTunnel();
                break;
            case 'pinggy':
                createPinggyTunnel();
                break;
        }
    } catch (err) {
        console.error('Error creating tunnel:', err);
        process.exit(1);
    }
}

// Function to create localtunnel
async function createLocalTunnel() {
    console.log('Creating \x1b[1mlocaltunnel\x1b[0m tunnel...\n');
    const ltConfig = { port };
    if (parsedArgs['--subdomain']) ltConfig['subdomain'] = parsedArgs['--subdomain'];
    const tunnelInstance = await lt(ltConfig);
    console.log(`Tunnel started on ${tunnelInstance.url}\n`);
    waitToExit();
}

// Function to create Pinggy tunnel
function createPinggyTunnel() {
    console.log('Creating \x1b[1mPinggy\x1b[0m tunnel...\n');

    const pinggyTunnel = spawn('ssh', ['-T', '-p', '443', `-R0:localhost:${port}`, '-L4300:localhost:4300', 'qr@a.pinggy.io'], {
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    pinggyTunnel.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        const tunnelHttpUrl = lines.find(l => /^http:\/\/.*\.free\.pinggy\.lin/.test(l))?.trim();
        const tunnelHttpsUrl = lines.find(l => /^https:\/\/.*\.free\.pinggy\.lin/.test(l))?.trim();

        if (tunnelHttpUrl) console.log('Http URL:\t\x1b[1m', tunnelHttpUrl, '\x1b[0m');
        if (tunnelHttpsUrl) {
            console.log('Https URL:\t\x1b[1m', tunnelHttpsUrl, '\x1b[0m\n');
            waitToExit(pinggyTunnel);
        }
    });

    pinggyTunnel.stderr.on('data', (data) => {
        const message = data.toString();
        if (!message.includes('Allocated port')) {
            console.error('Pinggy error:', message);
        }
    });

    pinggyTunnel.on('close', (code) => {
        console.log('Pinggy tunnel closed with code:', code);
        process.exit(code === 0 || code === 255 ? 0 : 1);
    });

    pinggyTunnel.on('exit', (code) => {
        console.log('Pinggy tunnel exited with code:', code);
        process.exit(code === 0 || code === 255 ? 0 : 1);
    });
}

// Function to wait for exit signal
function waitToExit(childProcess?: ChildProcessWithoutNullStreams) {
    console.log('Press \x1b[1mCtrl+C\x1b[0m or \x1b[1mQ\x1b[0m twice to stop the server');
    let exitCount = 0;
    let exitTimeout: NodeJS.Timeout;

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key: Buffer) => {
        if (key.toString().toLowerCase() === 'q') {
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
}

// Helper function to display help
function displayHelp(argMap: ArgMapItem[]) {
    console.log('Usage: tsx-serve [options] [path]');
    console.log('Options:');
    argMap.forEach(arg => {
        console.log(`  ${arg.short}, ${arg.long.padEnd(20)} ${arg.description}`);
    });
    console.log('\nExamples:');
    console.log('  tsx-serve -p 8080');
    console.log('  tsx-serve -t pinggy .');
    console.log('  tsx-serve -p 80 -t localtunnel -s mysubdomain /var/www');
}

// Helper function to display version
function displayVersion() {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    console.log(packageJson.version);
}

// Helper function to validate port
function validatePort(port: number) {
    if (port < 1 || port > 65535) {
        console.error('Invalid port number. Please choose a number between 1 and 65535.');
        process.exit(1);
    }
}

// Helper function to validate path
function validatePath(path: string) {
    if (!fs.existsSync(path)) {
        console.error(`Path does not exist: ${path}`);
        process.exit(1);
    }
}

// Set up Express routes for serving static files or a single file
function setupExpress(app: express.Application, path: string) {
    const resolvedPath = fs.realpathSync(path);
    if (fs.lstatSync(resolvedPath).isFile()) {
        app.get('/', (req, res) => res.sendFile(resolvedPath));
    } else {
        app.use(express.static(path));
    }
}

const app = express();
setupExpress(app, path);

app.listen(port, async () => {
    console.log(`\nServing path: \x1b[1m${path}\x1b[0m`);
    console.log(`\nLocal server listening on \x1b[1mhttp://localhost:${port}\x1b[0m\n`);

    if (tunnelConfig) {
        createTunnel(tunnelConfig.long, port);
    } else {
        waitToExit();
    }
});
