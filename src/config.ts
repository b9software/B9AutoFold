import { getConfiguration } from './vscode';

export const TARGET_LINE = 40;

export const APP_NAME = 'B9AutoFold';

export function isUncommittedChangesEnabled(): boolean {
	const config = getConfiguration(APP_NAME);
	return config.get<boolean>('uncommittedChanges.enable', true);
}
