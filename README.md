# tsx-serve

**tsx-serve** is a lightweight, TypeScript-based static file server CLI built on top of [Express.js](https://expressjs.com/). It allows you to quickly serve static files from any directory with customizable options, making it perfect for local development or simple hosting solutions.

## Features

- 📦 **Simple CLI** to serve static files.
- ⚡ Built with **TypeScript** for a smooth development experience.
- 🌐 **Express.js** under the hood, offering robust and scalable serving.
- 🔧 Flexible options for defining port and directory.

## Installation

To use `tsx-serve`, first install it globally using [npm](https://www.npmjs.com/):

```bash
npm install -g tsx-serve
```

## Usage

Once installed, you can serve static files by specifying the directory and port:

```bash
tsx-serve --port 8080 --dir ./public
```

### Available CLI Options

- `--port` or `-p`: Specify the port number (default: 3000).
- `--dir` or `-d`: Specify the directory to serve files from (default: current directory `.`).
- `--help` or `-h`: Show the usage guide.

### Example

Serve files from the `./dist` directory on port `4000`:

```bash
tsx-serve --port 4000 --dir ./dist
```

Access your files via [http://localhost:4000](http://localhost:4000).

## Development

If you want to modify or contribute to this project, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/tsx-serve.git
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
```

### Key Sections:
- **Features**: Highlights the simplicity and purpose of the tool.
- **Installation & Usage**: Clear instructions on how to install and use it.
- **Development**: Steps for contributing to the project.
- **Contributing & License**: Basic information for open-source collaboration.

Feel free to customize the `GitHub` URL and any other specific details to match your project!