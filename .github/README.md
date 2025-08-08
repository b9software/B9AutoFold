# B9AutoFold

A VS Code extension that automatically folds code blocks when opening files to display the main structure within one screen (~40 lines), helping users quickly understand code.

The extension intelligently calculates folding ranges based on symbol information provided by the editor, supporting all languages that provide symbol information. When symbol information is unavailable, it defaults to Fold Level 2.

## Tech Stack

- **TypeScript** - Main development language
- **pnpm** - Package management
- **Jest** - Unit testing framework
- **esbuild** - Build tool

## Project Structure

```text
src/
├── core.ts                 # Main processing logic, symbol retrieval and folding execution
├── editor-engine.ts        # VS Code method wrappers (symbol parsing, folding range execution)
├── extension.ts            # VS Code extension entry point, plugin initialization and command registration
├── folding-algorithm.ts    # Core folding algorithm implementation
└── task.ts                 # Async task management, file tracking

tests/
├── folding-algorithm.test.ts  # Algorithm unit tests
└── ...                       # Other test files
```

## Development Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run checks (linting, compilation, testing):

   ```bash
   pnpm check
   ```

3. Development and testing:
   - Tests are located in the `tests/` directory
   - Main test file: `tests/folding-algorithm.test.ts`

## Contributing

1. Make sure `pnpm check` passes before submitting changes
2. Add tests for new functionality
3. Follow the existing code style

## Commands

- **B9AutoFold: Export Symbols for Debugging** - Export symbol information for debugging folding issues
