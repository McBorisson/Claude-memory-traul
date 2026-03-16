# Contributing to Traul

Thanks for your interest in contributing to Traul!

## Developer Certificate of Origin (DCO)

By contributing to this project, you agree to the [Developer Certificate of Origin](https://developercertificate.org/). This means you certify that you wrote the contribution or otherwise have the right to submit it under the project's license.

All commits must be signed off. Add a `Signed-off-by` line to your commit messages:

```
git commit -s -m "feat: add new connector"
```

This adds a line like:

```
Signed-off-by: Your Name <your@email.com>
```

If you forget, you can amend the last commit:

```
git commit --amend -s
```

## Getting Started

1. Fork the repo
2. Clone your fork and install dependencies:
   ```sh
   git clone https://github.com/<your-username>/traul.git
   cd traul
   bun install
   ```
3. Create a feature branch: `git checkout -b feat/my-feature`
4. Make your changes
5. Run tests: `bun test`
6. Commit with sign-off: `git commit -s -m "feat: description"`
7. Push and open a PR

## Code Style

- TypeScript for all new code
- Type-check with Bun, not vanilla `tsc`
- Keep dependencies minimal — every new dependency is a maintenance burden

## Connectors

Adding a new connector? Follow the pattern in `src/connectors/`. Each connector exports:
- A sync function that fetches messages and upserts them into the database
- Configuration via environment variables and/or the config file

## Reporting Issues

Open an issue on GitHub. Include:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your OS and Bun version
