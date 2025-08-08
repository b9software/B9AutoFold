import { DocumentSymbol, env, Position, Range, SymbolKind, type TextEditor, window } from 'vscode';
import { copyDebugSymbols } from '../src/core';
import { Engine } from '../src/editor-engine';

// Mock Engine module
jest.mock('../src/editor-engine');

// Helper function to set activeTextEditor
function setActiveTextEditor(editor: Partial<TextEditor> | null) {
	Object.defineProperty(window, 'activeTextEditor', {
		configurable: true,
		value: editor,
		writable: true,
	});
}

describe('Command Tests', () => {
	describe('copyDebugSymbols', () => {
		let mockEditor: Partial<TextEditor>;
		let mockSymbols: DocumentSymbol[];

		beforeEach(() => {
			// Reset all mocks
			jest.clearAllMocks();

			// Setup mock editor
			mockEditor = {
				document: {
					fileName: '/path/to/test.ts',
					lineCount: 100,
				} as TextEditor['document'],
			};

			// Setup mock symbols
			mockSymbols = [
				new DocumentSymbol(
					'TestClass',
					'',
					SymbolKind.Class,
					new Range(new Position(1, 0), new Position(20, 0)),
					new Range(new Position(1, 0), new Position(20, 0)),
				),
				new DocumentSymbol(
					'TestFunction',
					'',
					SymbolKind.Function,
					new Range(new Position(25, 0), new Position(35, 0)),
					new Range(new Position(25, 0), new Position(35, 0)),
				),
			];

			// Add children to first symbol
			mockSymbols[0].children = [
				new DocumentSymbol(
					'method1',
					'',
					SymbolKind.Method,
					new Range(new Position(5, 0), new Position(10, 0)),
					new Range(new Position(5, 0), new Position(10, 0)),
				),
			];

			// Mock clipboard
			jest.spyOn(env.clipboard, 'writeText').mockResolvedValue();
		});

		it('should copy symbols to clipboard when editor and symbols exist', async () => {
			// Arrange
			setActiveTextEditor(mockEditor);
			(Engine.getSymbols as jest.Mock).mockResolvedValue(mockSymbols);
			(Engine.alertInfo as jest.Mock) = jest.fn();

			// Act
			await copyDebugSymbols();

			// Assert
			expect(Engine.getSymbols).toHaveBeenCalledWith(mockEditor);
			expect(env.clipboard.writeText).toHaveBeenCalledWith(`
const symbols: UTSymbol[] = [
    ['TestClass', SymbolKind.Class, 1, 20, [
    ['method1', SymbolKind.Method, 5, 10, []]
  ]],
  ['TestFunction', SymbolKind.Function, 25, 35, []]
];
check('test.ts', 100, symbols, [
  [1, 20],
  [5, 10],
  [25, 35],
]);
`);
			expect(Engine.alertInfo).toHaveBeenCalledWith('Symbols exported to clipboard');
		});

		it('should show warning when no active editor', async () => {
			// Arrange
			setActiveTextEditor(null);
			(Engine.alertWarning as jest.Mock) = jest.fn();

			// Act
			await copyDebugSymbols();

			// Assert
			expect(Engine.alertWarning).toHaveBeenCalledWith('No active editor found');
			expect(Engine.getSymbols).not.toHaveBeenCalled();
			expect(env.clipboard.writeText).not.toHaveBeenCalled();
		});

		it('should show info when no symbols found', async () => {
			// Arrange
			setActiveTextEditor(mockEditor);
			(Engine.getSymbols as jest.Mock).mockResolvedValue([]);
			(Engine.alertInfo as jest.Mock) = jest.fn();

			// Act
			await copyDebugSymbols();

			// Assert
			expect(Engine.getSymbols).toHaveBeenCalledWith(mockEditor);
			expect(Engine.alertInfo).toHaveBeenCalledWith('No symbols found in current document');
			expect(env.clipboard.writeText).not.toHaveBeenCalled();
		});

		it('should show info when symbols is null', async () => {
			// Arrange
			setActiveTextEditor(mockEditor);
			(Engine.getSymbols as jest.Mock).mockResolvedValue(null);
			(Engine.alertInfo as jest.Mock) = jest.fn();

			// Act
			await copyDebugSymbols();

			// Assert
			expect(Engine.getSymbols).toHaveBeenCalledWith(mockEditor);
			expect(Engine.alertInfo).toHaveBeenCalledWith('No symbols found in current document');
			expect(env.clipboard.writeText).not.toHaveBeenCalled();
		});

		it('should handle errors gracefully', async () => {
			// Arrange
			setActiveTextEditor(mockEditor);
			const error = new Error('Test error');
			(Engine.getSymbols as jest.Mock).mockRejectedValue(error);
			(Engine.alertError as jest.Mock) = jest.fn();

			// Act
			await copyDebugSymbols();

			// Assert
			expect(Engine.alertError).toHaveBeenCalledWith('Failed to export symbols: ', error);
			expect(env.clipboard.writeText).not.toHaveBeenCalled();
		});

		it('should extract filename correctly from path', async () => {
			// Arrange
			const editorWithComplexPath = {
				document: {
					fileName: '/very/long/path/to/my-component.tsx',
					lineCount: 150,
				} as TextEditor['document'],
			};
			setActiveTextEditor(editorWithComplexPath);
			(Engine.getSymbols as jest.Mock).mockResolvedValue(mockSymbols);
			(Engine.alertInfo as jest.Mock) = jest.fn();

			// Act
			await copyDebugSymbols();

			// Assert
			const clipboardCall = (env.clipboard.writeText as jest.Mock).mock.calls[0][0];
			expect(clipboardCall).toContain("check('my-component.tsx', 150, symbols, [");
		});

		it('should handle filename edge cases', async () => {
			// Arrange
			const editorWithoutExtension = {
				document: {
					fileName: '',
					lineCount: 50,
				} as TextEditor['document'],
			};
			setActiveTextEditor(editorWithoutExtension);
			(Engine.getSymbols as jest.Mock).mockResolvedValue(mockSymbols);
			(Engine.alertInfo as jest.Mock) = jest.fn();

			// Act
			await copyDebugSymbols();

			// Assert
			const clipboardCall = (env.clipboard.writeText as jest.Mock).mock.calls[0][0];
			expect(clipboardCall).toContain("check('unknown.ts', 50, symbols, [");
		});
	});
});
