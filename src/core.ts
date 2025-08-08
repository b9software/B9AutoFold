import { commands, type DocumentSymbol, env, SymbolKind, type TextEditor, window } from 'vscode';
import { TARGET_LINE } from './config';
import { Engine } from './editor-engine';
import { generateFoldingPlan } from './folding-algorithm';
import { delay, logDebug, logError, logInfo } from './utils';

export async function processAutoFold(editor: TextEditor, isEnd: () => boolean): Promise<void> {
	const totalLines = editor.document.lineCount;
	if (totalLines < TARGET_LINE) {
		logDebug('Skip short file');
		return;
	}

	// Check if task is cancelled before each await
	if (isEnd()) return;
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

	// Wait for symbols to be available before checking ranges
	if (editor.visibleRanges.length > 1) {
		logDebug('Skip folded file');
		return;
	}

	if (!symbols || !symbols.length) {
		if (isEnd()) return;
		await foldFallback();
		return;
	}

	if (isEnd()) return;
	if (await foldBySymbols(editor, symbols)) {
		return;
	}

	if (isEnd()) return;
	await foldFallback();
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
		const foldingRanges = generateFoldingPlan(editor, symbols);
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
check('${fileName}', ${lineCount}, symbols, [${foldRangesStr}]);
`;

		await env.clipboard.writeText(output);
		Engine.alertInfo('Symbols exported to clipboard');
	} catch (error) {
		Engine.alertError('Failed to export symbols: ', error);
	}
}

async function foldBySymbols(editor: TextEditor, symbols: DocumentSymbol[]): Promise<boolean> {
	const foldingRanges = generateFoldingPlan(editor, symbols);
	if (foldingRanges.length === 0) {
		logDebug('No folding ranges generated');
		return false;
	}
	await Engine.foldRanges(foldingRanges);
	logDebug(`Completed folding ${foldingRanges.length} ranges`);
	return true;
}

/** @throws NEVER */
async function foldFallback() {
	try {
		logInfo('Fold using fallback method');
		await commands.executeCommand('editor.foldLevel2');
	} catch (error) {
		logError('Execute editor.foldLevel2', error);
	}
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
