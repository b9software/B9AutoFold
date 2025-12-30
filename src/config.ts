import { getConfiguration } from './vscode';

export const TARGET_LINE = 40;

export const APP_NAME = 'B9AutoFold';

export function getUncommittedChangesConfig() {
	const config = getConfiguration(APP_NAME);
	return {
		contextLines: config.get<number>('uncommittedChanges.contextLines', 3),
		enable: config.get<boolean>('uncommittedChanges.enable', true),
	};
}
