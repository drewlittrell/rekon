# Security

Rekon capabilities may read source files, read and write artifacts, execute commands, access the network, or write source only when permissions allow it. Treat capability manifests and permission checks as security-sensitive code.

## Reporting

Do not open a public issue for a suspected vulnerability. Send a private report to the maintainers once a security contact is published for the project.

## Current Scope

The alpha repository currently contains scaffolding only. Future runtime work must keep source writes, command execution, and outbound network access denied unless explicitly approved by configuration.
