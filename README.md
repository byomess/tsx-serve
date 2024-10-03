# tsx-serve

**tsx-serve** is a lightweight, TypeScript-based static file server CLI built on top of [Express.js](https://expressjs.com/). It allows you to quickly serve static files from any directory with customizable options, making it perfect for local development, file sharing, or simple hosting solutions.

Has **built-in tunneling** support with custom sub-domains for easy sharing of your local server through the internet by simply using command arguments.

## Features

- 📦 **Simple CLI** to serve static files.
- 🌍 **Tunneling** support for sharing your local server through the internet, allowing custom sub-domains.
- 🌐 **Express.js** under the hood, offering robust and scalable serving.
- 🚀 **Lightweight** and easy to use for quick development setups or file sharing.

## Installation

To use `tsx-serve`, first install it globally using [npm](https://www.npmjs.com/):

```bash
npm i -g tsx-serve
```

Or with [yarn](https://yarnpkg.com/):

```bash
yarn global add tsx-serve
```

Without installing globally, you can also use `npx` to run the CLI:

```bash
npx tsx-serve ./public
```

Or with `yarn`:

```bash
yarn tsx-serve ./public
```

## Usage

Once installed, you can serve static files by specifying the directory/file path:

```bash
tsx-serve ./public
```

### Available CLI Options

- `--port` or `-p`: Specify the port number (default: 3000).
- `--tunnel` or `-t`: Enable tunneling support for sharing your local server through the internet.
- `--subdomain` or `-s`: Specify a custom sub-domain for the tunnel URL.
- `--help` or `-h`: Show the usage guide.

### Example

Serve files from the `./dist` directory on port `4000`:

```bash
tsx-serve -p 4000 ./dist
```

Access your files via [http://localhost:4000](http://localhost:4000).

### More Examples

- Serve files from the current directory on port `8080` using Pinggy as tunneler:
  ```bash
  tsx-serve -p 8080 -t pg .
  ```

- Serve files from the `./public` directory with a custom sub-domain using Localtunnel as tunneler:
  ```bash
   tsx-serve -t lt -s my-server ./public
  ```

## Development

If you want to modify or contribute to this project, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/byomess/tsx-serve.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Link the CLI for local development:
   ```bash
   npm link
   ```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests on the [GitHub repository](https://github.com/your-username/tsx-serve).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.