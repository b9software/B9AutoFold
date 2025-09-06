import * as path from 'node:path';
import { inspect } from 'node:util';
import { outputLine } from './editor-engine';
import { FoldingRange, Range, Selection, type TextEditor, type Uri } from './vscode';

export async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function fileNameFromUri(uri: Uri): string {
	if (!uri.fsPath) {
		return uri.toString();
	}
	return path.basename(uri.fsPath);
}

// MARK: Logging

export function logDebug(message: string, ...args: unknown[]) {
	if (DEBUG) {
		const logMessage = `${timestamp()}🔵 ${message}`;
		console.info(logMessage, ...args);
		outputLine(logMessage, ...args);
	}
}

export function logInfo(message: string, ...args: unknown[]) {
	const logMessage = `${timestamp()}${message}`;
	console.info(logMessage, ...args);
	outputLine(logMessage, ...args);
}

export function logWarn(message: string, ...args: unknown[]) {
	const logMessage = `${timestamp()}🟡 ${message}`;
	console.warn(logMessage, ...args);
	outputLine(logMessage, ...args);
}

export function logError(title: string, error: unknown) {
	const logMessage = `${timestamp()}🔴 ${title}`;
	console.error(logMessage, error);
	outputLine(logMessage, error);
}

function timestamp() {
	if (DEBUG) {
		const now = new Date();
		return `[${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}] `;
	} else {
		return '';
	}
}

export function debugDescription(selection: Selection): string;
export function debugDescription(foldingRange: FoldingRange): string;
export function debugDescription(range: Range): string;
export function debugDescription(value: FoldingRange | Range | Selection): string {
	if (DEBUG) {
		if (value instanceof FoldingRange) {
			return `<FoldingRange L${value.start}-${value.end}>`;
		} else if (value instanceof Selection) {
			return `<Selection anchor: ${value.anchor.line}, active: ${value.active.line}, L${value.start.line}-${value.end.line}>`;
		} else if (value instanceof Range) {
			return `<Range L${value.start.line}-${value.end.line}>`;
		} else {
			return inspect(value);
		}
	}
	return '';
}

export function debugTextEditor(editor: TextEditor): string {
	return `<TextEditor: ${editor.document.fileName}
  selection: ${debugDescription(editor.selection)}
  visibleRanges: [${editor.visibleRanges.map(debugDescription).join(', ')}]
  lineCount: ${editor.document.lineCount}
>`;
}
