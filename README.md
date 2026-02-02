# B9AutoFold

A lightweight VS Code extension that automatically folds code when you open a file, so the main structure fits on one screen (~40 lines). Originally designed to boost efficiency for handwritten code, it is now also a powerful assistant for reviewing code in Vibe Coding.

English | [中文说明](./README.zh-CN.md)

## Quick Start

- Install B9AutoFold from the Marketplace
- Open any file – the extension will auto-fold deeper blocks to show the high-level structure
- If needed, run "B9AutoFold: Refold Current File" from the Command Palette to reapply folding

## Features

- Out-of-the-box: no settings required
- Great Helper for Reviewing AI-Generated Code: Automatically keeps uncommitted changes (git diff) unfolded. When AI agents modify your code, you see exactly what changed while the rest remains folded—perfect for efficient reviews.
- Uses the editor's Document Symbols (Outline) to plan folding for any language that provides them
- Fallback to "Fold Level 2" when symbols are not available
- Respects your current selection: selected regions are avoided during folding
- Skips short files (under ~40 lines) to prevent unnecessary folding
- Special handling for test files: keeps `describe` blocks visible while folding individual tests when space is tight

## Commands

- B9AutoFold: Refold Current File – Unfolds everything, then reapplies the folding plan for the current editor
- B9AutoFold: Export Symbols for Debugging – Copies symbol info and the computed folding plan to the clipboard to help investigate unexpected folding

## Configuration

B9AutoFold works out-of-the-box, but you can customize the uncommitted changes behavior:

- `B9AutoFold.uncommittedChanges.enable`: Enable/disable "do not fold uncommitted changes" (default: `true`).

## How It Works

- The extension retrieves Document Symbols and computes a folding plan starting from deeper symbols first, aiming to reduce visible lines to about 40
- When a language does not provide symbols, it falls back to VS Code's "Fold Level 2"
- Folding avoids regions you have selected in the editor
- It only triggers on file open/activation and when you manually run the refold command

## Limitations and Notes

- Works best for languages that support Document Symbols (Outline view). For others, it uses a simple level-based fold
- When reapplying folding, the extension may unfold all first to ensure clean results
- Very large files or unusual symbol providers may lead to conservative folding

## Privacy & Performance

- No telemetry, no network calls – all logic runs locally using VS Code APIs
- Minimal performance impact: folding is calculated once on open/activation and on manual refold

## Feedback

Seeing unexpected folding? Run "B9AutoFold: Export Symbols for Debugging", paste the copied output, and share your expectation in a new issue: https://github.com/b9software/B9AutoFold/issues/new
