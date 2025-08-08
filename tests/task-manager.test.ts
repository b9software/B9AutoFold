import type { TextEditor } from 'vscode';
import { TaskManager } from '../src/task';

// Mock the core module to avoid real async processing
jest.mock('../src/core', () => ({
	processAutoFold: jest.fn().mockResolvedValue(undefined),
}));

// Mock a simple TextEditor
function createMockEditor(fileName: string, uri: string): TextEditor {
	return {
		document: {
			fileName,
			lineCount: 100,
			uri: { toString: () => uri },
		},
		visibleRanges: [
			{
				end: { character: 0, line: 99 },
				start: { character: 0, line: 0 },
			},
		],
	} as unknown as TextEditor;
}

describe('TaskManager', () => {
	// biome-ignore lint/suspicious/noExplicitAny: access private
	let sut: any;

	beforeEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: access private
		(TaskManager as any)._shared = undefined;
		sut = TaskManager.shared;
	});

	afterEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: access private
		(TaskManager as any)._shared = undefined;
	});

	describe('processed files tracking', () => {
		it('should skip already processed files', async () => {
			const editor = createMockEditor('test.ts', 'file:///test.ts');
			const editor2 = createMockEditor('test.ts', 'file:///test.ts');

			// First call should process the file
			sut.setActiveEditor(editor);
			expect(sut.activeEditor).toBe(editor);

			// Simulate successful processing by manually marking as processed
			sut.processedFiles.add('file:///test.ts');

			// Second call with same file should skip processing
			const logSpy = jest.spyOn(console, 'info');
			sut.setActiveEditor(editor2);

			// Should still set the active editor but skip processing
			expect(sut.activeEditor).toBe(editor2);
			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Skip processed'));

			logSpy.mockRestore();
		});

		it('should remove processed file record when requested', () => {
			const uri = 'file:///test.ts';

			// Add a processed file
			sut.processedFiles.add(uri);
			expect(sut.processedFiles.has(uri)).toBe(true);

			// Remove it
			sut.removeProcessedFile(uri);
			expect(sut.processedFiles.has(uri)).toBe(false);
		});

		it('should process different files normally', () => {
			const editor1 = createMockEditor('test1.ts', 'file:///test1.ts');
			const editor2 = createMockEditor('test2.ts', 'file:///test2.ts');

			// Process first file
			sut.setActiveEditor(editor1);
			expect(sut.activeEditor).toBe(editor1);

			// Process second file (different URI)
			sut.setActiveEditor(editor2);
			expect(sut.activeEditor).toBe(editor2);
		});
	});
});
