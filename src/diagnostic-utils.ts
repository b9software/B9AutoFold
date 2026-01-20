import { logDebug } from './utils';
import { languages, Range, type TextEditor } from './vscode';

/**
 * Get lines with diagnostics (problems) in the specified file
 */
export function getDiagnosticRanges(editor: TextEditor): Range[] {
	try {
		const uri = editor.document.uri;
		const diagnostics = languages.getDiagnostics(uri);

		if (!diagnostics || diagnostics.length === 0) {
			return [];
		}

		const ranges: Range[] = [];
		for (const diagnostic of diagnostics) {
			// Convert diagnostic range to a line-based range
			// VS Code diagnostics already use 0-based indexing
			const start = diagnostic.range.start.line;
			const end = diagnostic.range.end.line;
			ranges.push(new Range(start, 0, end, 0));
		}

		logDebug(`Found ${diagnostics.length} diagnostics in ${uri.fsPath}`);
		return ranges;
	} catch (e) {
		logDebug('Failed to get diagnostics', e);
		return [];
	}
}
