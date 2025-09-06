import { APP_NAME } from './config';
import { copyDebugSymbols, refoldCurrentFile } from './core';
import { releaseOutputChannel } from './editor-engine';
import { TaskManager } from './task';
import { logInfo } from './utils';
import { commands, type ExtensionContext, window, workspace } from './vscode';

export function activate(context: ExtensionContext) {
	logInfo(`${APP_NAME} is activating...`);

	const debugSymbolsCommand = commands.registerCommand('B9AutoFold.debugSymbols', copyDebugSymbols);

	const refoldCommand = commands.registerCommand('B9AutoFold.refold', refoldCurrentFile);

	const onDidOpenTextDocument = workspace.onDidOpenTextDocument(async () => {
		TaskManager.shared.setActiveEditorMayChanged();
	});

	const onDidChangeActiveTextEditor = window.onDidChangeActiveTextEditor(async (editor) => {
		TaskManager.shared.setActiveEditor(editor);
	});

	const onDidCloseTextDocument = workspace.onDidCloseTextDocument((document) => {
		TaskManager.shared.removeProcessedFile(document.uri.toString());
	});

	context.subscriptions.push(
		debugSymbolsCommand,
		refoldCommand,
		onDidOpenTextDocument,
		onDidChangeActiveTextEditor,
		onDidCloseTextDocument,
	);
	TaskManager.shared.setActiveEditorMayChanged();
}

export function deactivate() {
	logInfo(`${APP_NAME} is deactivating...`);
	releaseOutputChannel();
}
