import { window, workspace } from 'vscode';

export {
	commands,
	type DocumentSymbol,
	ExtensionContext,
	env,
	FoldingRange,
	languages,
	OutputChannel,
	Range,
	Selection,
	SymbolKind,
	type TextEditor,
	type Uri,
	window,
	workspace,
} from 'vscode';

export const createOutputChannel = window.createOutputChannel;
export const getConfiguration = workspace.getConfiguration;
export const TabGroups = window.tabGroups;
