import * as vscode from 'vscode';
import { copyDebugSymbols, refoldCurrentFile } from './core';
import { Engine } from './editor-engine';
import { TaskManager } from './task';
import { logInfo } from './utils';

export function activate(context: vscode.ExtensionContext) {
	logInfo('Auto Fold extension is activating...');

	const debugSymbolsCommand = vscode.commands.registerCommand('B9AutoFold.debugSymbols', copyDebugSymbols);

	const refoldCommand = vscode.commands.registerCommand('B9AutoFold.refold', refoldCurrentFile);

	const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(async () => {
		TaskManager.shared.setActiveEditorMayChanged();
	});

	const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
		TaskManager.shared.setActiveEditor(editor);
	});

	const onDidCloseTextDocument = vscode.workspace.onDidCloseTextDocument((document) => {
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
	logInfo('Auto Fold extension is deactivating...');
	Engine.shared.deactivate();
}
