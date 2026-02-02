# Change Log

<!-- https://keepachangelog.com -->

## [0.8.1] - 2026-02-02

- Removed: The `uncommittedChanges.contextLines` configuration option has been removed as it was unnecessary.
- Improved: Use safer `execFile` instead of `exec` for git commands to prevent potential shell injection issues.

## [0.8.0] - 2026-01-09

- New: Do not fold lines that have diagnostics (errors/warnings).

## [0.7.0] - 2025-12-30

- New: Do not fold lines with uncommitted changes (requires Git).
- New: Added configuration to control uncommitted changes folding behavior.

## [0.6.0] - 2025-11-03

- Optimize folding behavior after symbol navigation

## [0.5.0] - 2025-09-25

- Fix excessive folding bug.

## [0.4.0] - 2025-09-06

- Improve folding behavior

## [0.3.0] - 2025-08-16

- Add command to reapply folding

## [0.2.0] - 2025-08-15

- Do not fold symbols nested more than 2 levels deep

## [0.1.1] - 2025-08-14

- Avoid folding target lines when jumping to files

## [0.1.0] - 2025-08-13

- Initial Beta release.
