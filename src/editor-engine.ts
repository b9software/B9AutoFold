import type { DocumentSymbol, FoldingRange, OutputChannel, TextEditor } from 'vscode';
import { commands, window } from 'vscode';
import { APP_NAME } from './config';
import { logError } from './utils';

export class Engine {
	static get shared(): Engine {
		if (!Engine._instance) {
			Engine._instance = new Engine();
		}
		return Engine._instance;
	}
	private static _instance: Engine;

	/**
	 * Get document symbols
	 * @returns Returns undefined when failed
	 * @throws NEVER
	 */
	static async getSymbols(editor: TextEditor): Promise<DocumentSymbol[] | undefined> {
		return Engine.shared.executeCommand('vscode.executeDocumentSymbolProvider', editor.document.uri);
	}

	static async foldRanges(ranges: FoldingRange[]): Promise<void> {
		Engine.shared.executeCommand('editor.fold', {
			selectionLines: ranges.map((range) => range.start),
		});
	}

	static async unfoldAll(): Promise<void> {
		await Engine.shared.executeCommand('editor.unfoldAll');
	}

	static async foldLevel2(): Promise<void> {
		await Engine.shared.executeCommand('editor.foldLevel2');
	}

	private async executeCommand<T>(command: string, ...args: unknown[]): Promise<T | undefined> {
		try {
			return await commands.executeCommand<T>(command, ...args);
		} catch (error) {
			logError(`Execute ${command}:`, error);
			return undefined;
		}
	}

	// MARK: Log

	static alertInfo(message: string) {
		window.showInformationMessage(message);
	}
	static alertWarning(message: string) {
		window.showWarningMessage(message);
	}
	static alertError(message: string, error: unknown) {
		window.showErrorMessage(message + formatArg(error));
	}

	static outputLine(message: string, ...args: unknown[]) {
		Engine.shared
			.getOutputChannel()
			.appendLine(message + (args.length > 0 ? ` ${args.map((arg) => formatArg(arg)).join(' ')}` : ''));
	}

	deactivate() {
		if (this._outputChannel) {
			this._outputChannel.dispose();
			this._outputChannel = undefined;
		}
	}

	private _outputChannel: OutputChannel | undefined;
	private getOutputChannel(): OutputChannel {
		if (!this._outputChannel) {
			this._outputChannel = window.createOutputChannel(APP_NAME);
		}
		return this._outputChannel;
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
