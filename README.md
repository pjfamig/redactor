```
  ____  _____  ____   _    ____ _____ ___  _____ ___
 |  _ \| ____|/ ___| / \  |_ _|_   _/ _ \| ____|_ _|
 | |_) |  _|  | |   / _ \  | | | || | | |  _|  | |
 |  _ <| |___ | |___/ ___ \ | | | || |_| | |___ | |
 |_| \_\_____| \____/_/   \_\___| |_| \___/|_____|___|
```

**Redact sensitive text before pasting into ChatGPT or other AI. Nothing is stored.**

Paste in your draft or note, redact with one click, then copy the anonymized text into any AI tool. Redactor detects and redacts personal identifiers (names, emails, phones, addresses), sensitive numbers (SSNs, credit card numbers), URLs, IPv4 addresses, and custom dictionary terms you add. All processing is in memory—your input is not stored.

**Who it’s for:** Lawyers, healthcare, accountants, and anyone who needs to share context with AI without exposing real names, numbers, or confidential text.

## Tech stack

Ruby 3.3, Rails 8, PostgreSQL (Solid Cache/Queue/Cable), Tailwind CSS, Stimulus, Turbo. Docker & Kamal for deployment.

## Getting started

**Prerequisites:** Ruby 3.3.4 ([.ruby-version](.ruby-version)), PostgreSQL, Bundler.

```bash
git clone https://github.com/YOUR_USERNAME/redactor.git
cd redactor
bin/setup
```

`bin/setup` installs dependencies, runs `bin/rails db:prepare`, clears logs and tmp, then starts the dev server. Open http://localhost:3000. To skip starting the server: `bin/setup --skip-server`.

**Tests and linting:**

```bash
bin/rails db:test:prepare   # once, or when migrations change
bin/rails test test:system # unit, integration, and system tests
bin/rubocop                 # Ruby style (CI: -f github)
bin/brakeman --no-pager     # security scan
bin/importmap audit         # JS dependency audit
```

CI runs the above on push and PRs ([.github/workflows/ci.yml](.github/workflows/ci.yml)). Deploy via Docker/Kamal (see `.kamal/` and `config/deploy.yml`).

## Contributing

Contributions are welcome. Good targets: new detectors (e.g. medical IDs, jurisdiction-specific formats), better name/entity detection, UX/accessibility, docs, and tests in [app/services/redaction/](app/services/redaction/).

1. Open an issue to discuss.
2. Fork, branch, make changes. Run `bin/rails db:test:prepare test test:system`, `bin/rubocop`, and `bin/brakeman`.
3. Open a PR with a short description.

Keep the scope to paste → redact → copy and no storage of user content.

## License

MIT — see [LICENSE](LICENSE).
