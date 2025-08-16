import { type DocumentSymbol, env, SymbolKind, type TextEditor, window } from 'vscode';
import { TARGET_LINE } from './config';
import { Engine } from './editor-engine';
import { generateFoldingPlan } from './folding-algorithm';
import { delay, logDebug, logInfo } from './utils';

export async function processAutoFold(
	editor: TextEditor,
	options: {
		isEnd: () => boolean;
	},
): Promise<void> {
	const { isEnd } = options;
	const totalLines = editor.document.lineCount;
	if (totalLines < TARGET_LINE) {
		logDebug('Skip short file');
		return;
	}

	if (isEnd())
		// Check if task is cancelled before each await
		return;
	let symbols = await Engine.getSymbols(editor);

	if (!symbols) {
		if (isEnd()) return;
		await delay(100);

		if (isEnd()) return;
		logDebug('First retry to get symbols');
		symbols = await Engine.getSymbols(editor);
	}

	if (!symbols) {
		if (isEnd()) return;
		await delay(200);

		if (isEnd()) return;
		logDebug('Second retry to get symbols');
		symbols = await Engine.getSymbols(editor);
	}

	if (!symbols) {
		if (isEnd()) return;
		await delay(500);

		if (isEnd()) return;
		logDebug('Third retry to get symbols');
		symbols = await Engine.getSymbols(editor);
	}

	if (editor.visibleRanges.length > 1) {
		// Wait for symbols to be available before checking ranges
		logDebug('Skip folded file');
		return;
	}

	if (!symbols || !symbols.length) {
		if (isEnd()) return;
		logInfo('Fallback: no symbols');
		await Engine.foldLevel2();
		return;
	}

	if (isEnd()) return;
	if (await foldBySymbols(editor, symbols)) {
		return;
	}

	if (isEnd()) return;
	logInfo('Fallback: symbols folding failure');
	await Engine.foldLevel2();
}

export async function copyDebugSymbols() {
	const editor = window.activeTextEditor;
	if (!editor) {
		Engine.alertWarning('No active editor found');
		return;
	}

	try {
		const symbols = await Engine.getSymbols(editor);
		if (!symbols || symbols.length === 0) {
			Engine.alertInfo('No symbols found in current document');
			return;
		}

		const fileName = editor.document.fileName.split('/').pop() || 'unknown.ts';
		const lineCount = editor.document.lineCount;
		const skips = editor.selections.map((s) => `[${s.start.line}, ${s.end.line}]`).join(', ');
		const foldingRanges = generateFoldingPlan({
			fileName: editor.document.fileName,
			foldedRanges: [],
			skipRanges: editor.selections,
			symbols: symbols,
			targetLines: TARGET_LINE,
			topLevelContainer: symbols.length,
			visibleLines: editor.document.lineCount,
		});
		let foldRangesStr = '';
		if (foldingRanges.length) {
			foldRangesStr += '\n  ';
			foldRangesStr += foldingRanges.map((r) => `[${r.start}, ${r.end}]`).join(',\n  ');
			foldRangesStr += ',\n';
		}

		const output = `
const symbols: UTSymbol[] = [
  ${documentSymbolToString(symbols)}
];
check('${fileName}', ${lineCount}, symbols, [${skips}], [${foldRangesStr}]);
`;

		await env.clipboard.writeText(output);
		Engine.alertInfo('Symbols exported to clipboard');
	} catch (error) {
		Engine.alertError('Failed to export symbols: ', error);
	}
}

/**
 * Refold the current active editor
 */
export async function refoldCurrentFile() {
	const editor = window.activeTextEditor;
	if (!editor) {
		Engine.alertWarning('No active editor found');
		return;
	}

	try {
		await Engine.unfoldAll();
		await processAutoFold(editor, {
			isEnd: () => editor !== window.activeTextEditor,
		});
	} catch (error) {
		Engine.alertError('Refold failed: ', error);
	}
}

async function foldBySymbols(editor: TextEditor, symbols: DocumentSymbol[]): Promise<boolean> {
	const foldingRanges = generateFoldingPlan({
		fileName: editor.document.fileName,
		foldedRanges: [],
		skipRanges: editor.selections,
		symbols: symbols,
		targetLines: TARGET_LINE,
		topLevelContainer: symbols.length,
		visibleLines: editor.document.lineCount,
	});
	if (foldingRanges.length === 0) {
		logDebug('No folding ranges generated');
		return false;
	}
	await Engine.foldRanges(foldingRanges);
	logDebug(`Completed folding ${foldingRanges.length} ranges`);
	return true;
}

function documentSymbolToString(symbols: DocumentSymbol[], indent = 1): string {
	const indentStr = '  '.repeat(indent);
	const items = symbols.map((symbol) => {
		const kindName = SymbolKind[symbol.kind];
		let result = `${indentStr}['${symbol.name}', SymbolKind.${kindName}, ${symbol.range.start.line}, ${symbol.range.end.line}, `;

		if (symbol.children.length > 0) {
			result += '[\n';
			result += documentSymbolToString(symbol.children, indent + 1);
			result += `${indentStr}]`;
		} else {
			result += '[]';
		}
		result += ']';
		return result;
	});
	return items.join(',\n') + (indent === 1 ? '' : '\n');
}
