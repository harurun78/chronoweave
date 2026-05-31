# Security Policy

## Supported versions

Chronoweave is in active development. Only the latest commit on `main` and the
active feature branches are supported with security fixes.

## Reporting a vulnerability

If you discover a security issue, please **do not** open a public GitHub
Issue. Instead, send a private report via GitHub Security Advisories:

1. Visit https://github.com/harurun78/chronoweave/security/advisories/new
2. Provide a short description, reproduction steps, and impact assessment.

We aim to acknowledge reports within 5 business days and to publish a fix
plan within 30 days.

## Scope

Chronoweave is a static client-side React application without a backend.
Reports about the following are in scope:

- Cross-site scripting via imported ProjectFile or trace CSV
- Prototype pollution or unsafe deserialization in YAML/JSON parsing
- Vulnerabilities in production npm dependencies (see `npm audit --omit=dev`)

Reports about dev-only dependencies, browser configuration, or third-party
hosting are out of scope.
