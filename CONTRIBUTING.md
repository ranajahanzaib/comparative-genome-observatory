# Contributing

Contributions that improve scientific correctness, accessibility, security, documentation, and usability are welcome.

## Development setup

The current project uses Python's standard library and browser APIs; no dependency installation is required. Python 3.10 or newer and Node.js are needed for the local checks.

```bash
git clone https://github.com/ranajahanzaib/comparative-genome-observatory.git
cd comparative-genome-observatory
python3 server.py
```

Open <http://127.0.0.1:8000> to use the application. In a second terminal, run:

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
