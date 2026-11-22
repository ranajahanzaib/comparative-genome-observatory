# Contributing

Contributions that improve scientific correctness, accessibility, security, documentation, and usability are welcome.

## Development setup

The API and scientific utilities use Python's standard library. The dashboard is a React application built with Vite, so running it in development requires Node.js, pnpm, and the locked frontend dependencies. Python 3.10 or newer is required for the API and tests.

```bash
git clone https://github.com/ranajahanzaib/comparative-genome-observatory.git
cd comparative-genome-observatory
pnpm install --frozen-lockfile
```

For the development dashboard, start the API and Vite in separate terminals:

```bash
python3 server.py
pnpm dev
```

Open <http://127.0.0.1:5173>. Vite forwards API requests to the local Python service. To build and serve the production frontend locally instead, run `make run` and open <http://127.0.0.1:8000>.

Run the checks with:

```bash
make test
make check
```

## Changes and pull requests

- Keep biological claims traceable to their data and methods. Label synthetic or user-provided evidence clearly.
- Preserve the documented 0-based, half-open internal coordinate convention and add tests for coordinate or mapping changes.
- Add or update tests when changing parsers, validation, or coordinate projection.
- Document data provenance, limitations, and external tool versions when adding a source or pipeline.
- Describe the user-visible change and verification performed in the pull request. Link related issues when applicable.

For bugs and feature proposals, use the repository's issue templates. Community participation follows the [Code of Conduct](CODE_OF_CONDUCT.md).
