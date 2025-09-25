import { APP_NAME } from './config';
import { debugDescription, logDebug, logError, logInfo } from './utils';
import {
	commands,
	createOutputChannel,
	type DocumentSymbol,
	type FoldingRange,
	type OutputChannel,
	type TextEditor,
	window,
} from './vscode';

// MARK: Alerts

export function alertInfo(message: string) {
	window.showInformationMessage(message);
}
export function alertWarning(message: string) {
	window.showWarningMessage(message);
}
export function alertError(message: string, error: unknown) {
	window.showErrorMessage(message + formatArg(error));
}

// MARK: Output Channel

let _outputChannel: OutputChannel | undefined;
function getOutputChannel(): OutputChannel {
	if (!_outputChannel) {
		_outputChannel = createOutputChannel(APP_NAME);
	}
	return _outputChannel;
}

export function outputLine(message: string, ...args: unknown[]) {
	getOutputChannel().appendLine(message + (args.length > 0 ? ` ${args.map((arg) => formatArg(arg)).join(' ')}` : ''));
}

export function releaseOutputChannel() {
	if (_outputChannel) {
		_outputChannel.dispose();
		_outputChannel = undefined;
	}
}

function formatArg(arg: unknown): string {
	if (typeof arg === 'string') {
		return arg;
	}
	if (arg instanceof Error) {
		return `${arg.name}: ${arg.message}`;
	}
	try {
		return JSON.stringify(arg, null, 2);
	} catch {
		return String(arg);
	}
}

// MARK: Commands

/**
 * Get document symbols
 * @returns Returns undefined when failed
 * @throws NEVER
 */
export async function getSymbols(editor: TextEditor): Promise<DocumentSymbol[] | undefined> {
	return executeCommand('vscode.executeDocumentSymbolProvider', editor.document.uri);
}

/**
 * Get folding ranges provided by the language folding provider
 */
export async function getFoldingRanges(editor: TextEditor): Promise<FoldingRange[] | undefined> {
	return executeCommand('vscode.executeFoldingRangeProvider', editor.document.uri);
}

/**
 * Fold planned ranges safely by snapping to actual foldable starts from provider.
 * This avoids folding the wrong (parent) region when the symbol start line doesn't
 * match the provider's folding start (e.g., brace on next line).
 */
export async function foldRanges(editor: TextEditor, planned: FoldingRange[]): Promise<void> {
	const providerRanges = (await getFoldingRanges(editor)) || [];
	let selectionLines: number[];
	if (providerRanges.length) {
		const starts = new Set<number>();
		for (const p of planned) {
			// Prefer exact match on [start, end]
			const exact = providerRanges.find((fr) => fr.start === p.start && fr.end === p.end);
			if (exact) {
				starts.add(exact.start);
				continue;
			}
			// Otherwise, find the smallest provider start within [p.start, p.end]
			let candidate: number | undefined;
			for (const fr of providerRanges) {
				if (fr.start >= p.start && fr.start <= p.end) {
					if (candidate === undefined || fr.start < candidate) candidate = fr.start;
				}
			}
			starts.add(candidate ?? p.start);
		}
		selectionLines = Array.from(starts).sort((a, b) => b - a);
	} else {
		// Fallback to previous behavior with bottom-up order
		selectionLines = Array.from(new Set(planned.map((r) => r.start))).sort((a, b) => b - a);
	}
	logInfo(`Fold Lines: ${selectionLines.join(', ')}`);
	await executeCommand('editor.fold', { selectionLines });
}

/**
 * Get the current active text editor, ensuring it matches the expected document
 */
export function getCurrentEditor(editor: TextEditor): TextEditor | undefined {
	const currentEditor = window.activeTextEditor;
	if (!currentEditor) {
		return undefined;
	}
	if (editor.document.uri.toString() !== currentEditor.document.uri.toString()) {
		return undefined;
	}
	return currentEditor;
}

export async function unfoldAll(): Promise<void> {
	await executeCommand('editor.unfoldAll');
}

export async function foldLevel2(): Promise<void> {
	await executeCommand('editor.foldLevel2');
}

export async function executeCommand<T>(command: string, ...args: unknown[]): Promise<T | undefined> {
	try {
		return await commands.executeCommand<T>(command, ...args);
	} catch (error) {
		logError(`Execute ${command}:`, error);
		return undefined;
	}
}
