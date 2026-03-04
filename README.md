```
REDACTOR
```

**Redact sensitive text before pasting into ChatGPT or other AI. Nothing is stored.**

Paste in your draft or note, redact with one click, then copy the anonymized text into any AI tool. Redactor detects and redacts personal identifiers (names, emails, phones, addresses), sensitive numbers (SSNs, credit card numbers), URLs, IPv4 addresses, and custom dictionary terms you add. All processing is in memory. Input is NOT stored.

**Who it’s for:** Lawyers, healthcare, accountants, and anyone who needs to share context with AI without exposing real names, numbers, or confidential text.

## Tech stack

Ruby on Rails

## Getting started

**Prerequisites:** Ruby 3.3.4 ([.ruby-version](.ruby-version))

```bash
git clone https://github.com/pjfamig/redactor.git
cd redactor
bin/setup
Open http://localhost:3000
```
## Contributing

Contributions are welcome. Good targets: new detectors (e.g. medical IDs, jurisdiction-specific formats), better name/entity detection, UX/accessibility, docs, and tests in [app/services/redaction/](app/services/redaction/).

1. Open an issue to discuss.
2. Fork, branch, make changes.
3. Open a PR with a short description.

Keep the scope to paste → redact → copy and no storage of user content.

## License

MIT — see [LICENSE](LICENSE).
