import { TARGET_LINE } from './config';
import {
	alertError,
	alertInfo,
	alertWarning,
	foldLevel2,
	foldRanges,
	getCurrentEditor,
	getSymbols,
	outputLine,
	unfoldAll,
} from './editor-engine';
import { generateFoldingPlan } from './folding-algorithm';
import { debugDescription, debugTextEditor, delay, logDebug, logInfo } from './utils';
import { type DocumentSymbol, env, SymbolKind, type TextEditor, window } from './vscode';

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
	let symbols = await getSymbols(editor);

	if (!symbols) {
		if (isEnd()) return;
		await delay(100);

		if (isEnd()) return;
		logDebug('First retry to get symbols');
		symbols = await getSymbols(editor);
	}

	if (!symbols) {
		if (isEnd()) return;
		await delay(200);

		if (isEnd()) return;
		logDebug('Second retry to get symbols');
		symbols = await getSymbols(editor);
	}

	if (!symbols) {
		if (isEnd()) return;
		await delay(500);

		if (isEnd()) return;
		logDebug('Third retry to get symbols');
		symbols = await getSymbols(editor);
	}

	const activeEditor = getCurrentEditor(editor);
	if (!activeEditor) {
		logDebug('Editor changed, abort folding');
		return;
	}
	if (activeEditor.visibleRanges.length > 1) {
		// Wait for symbols to be available before checking ranges
		logDebug('Skip folded file');
		return;
	}

	if (!symbols || !symbols.length) {
		if (isEnd()) return;
		logInfo('Fallback: no symbols');
		await foldLevel2();
		return;
	}

	if (isEnd()) return;
	await delay(300);
	if (isEnd()) return;

	if (await foldBySymbols(activeEditor, symbols)) {
		return;
	}

	if (isEnd()) return;
	logInfo('Fallback: symbols folding failure');
	await foldLevel2();
}

export async function copyDebugSymbols() {
	const editor = window.activeTextEditor;
	if (!editor) {
		alertWarning('No active editor found');
		return;
	}

	try {
		const symbols = await getSymbols(editor);
		if (!symbols || symbols.length === 0) {
			alertInfo('No symbols found in current document');
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
		alertInfo('Symbols exported to clipboard');
	} catch (error) {
		alertError('Failed to export symbols: ', error);
	}
}

/**
 * Refold the current active editor
 */
export async function refoldCurrentFile() {
	const editor = window.activeTextEditor;
	if (!editor) {
		alertWarning('No active editor found');
		return;
	}
	DEBUG && outputLine(`>>>> ${debugTextEditor(editor)}`);

	try {
		await unfoldAll();
		await processAutoFold(editor, {
			isEnd: () => editor !== window.activeTextEditor,
		});
	} catch (error) {
		alertError('Refold failed: ', error);
	}
}

async function foldBySymbols(editor: TextEditor, symbols: DocumentSymbol[]): Promise<boolean> {
	DEBUG && outputLine(`>>>> foldBySymbols enter: ${debugTextEditor(editor)}`);
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
	await unfoldAll();
	await foldRanges(editor, foldingRanges);
	logDebug(`Completed folding ${foldingRanges.length} ranges`);
	DEBUG && outputLine(`>>>> foldBySymbols exit: ${debugTextEditor(editor)}`);
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
