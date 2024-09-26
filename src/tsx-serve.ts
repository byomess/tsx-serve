#!/usr/env/bin tsx

import express from 'express';

// CLI arguments:
// --port | -p: Port number to serve the files on
// --dir | -d: Directory to serve the files from
// --help | -h: Show help

const args = process.argv.slice(2);
const argMap = {
  '--port': '-p',
  '--dir': '-d',
  '--help': '-h',
};

const parsedArgs = args.reduce((acc, arg, index) => {
  const key = argMap[arg] || arg;
  acc[key] = args[index + 1];
  return acc;
}, {});

if (parsedArgs['-h']) {
  console.log(`Usage: tsx-serve.ts --port <port> --dir <directory>`);
  process.exit(0);
}

const port = parsedArgs['-p'] || 3000;

const app = express();

app.use(express.static(parsedArgs['-d'] || '.'));

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});