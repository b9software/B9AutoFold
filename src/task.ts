import { type TextEditor, window } from 'vscode';
import { processAutoFold } from './core';
import { fileNameFromUri, logDebug, logError, logInfo } from './utils';

export class TaskManager {
	static get shared(): TaskManager {
		if (!TaskManager._shared) {
			TaskManager._shared = new TaskManager();
		}
		return TaskManager._shared;
	}
	private static _shared: TaskManager;

	private activeEditor: TextEditor | undefined;
	private currentTask: Task | undefined;
	private processedFiles = new Set<string>(); // Track processed file URIs
	private editorMayChanged = false;

	setActiveEditorMayChanged() {
		if (this.editorMayChanged) return;
		this.editorMayChanged = true;
		setTimeout(() => {
			if (!this.editorMayChanged) return;
			this.editorMayChanged = false;
			this.setActiveEditor(window.activeTextEditor);
		}, 100);
	}

	setActiveEditor(editor: TextEditor | undefined) {
		if (this.activeEditor === editor) return;
		if (!editor) {
			this.activeEditor = undefined;
			this.stopCurrentTask();
			return;
		}

		// Check if file has already been processed
		const documentUri = editor.document.uri.toString();
		if (this.processedFiles.has(documentUri)) {
			logDebug(`Skip processed: ${fileNameFromUri(editor.document.uri)}`);
			this.activeEditor = editor;
			return;
		}

		this.activeEditor = editor;
		this.stopCurrentTask();
		this.currentTask = new Task(editor);
		this.start(this.currentTask);
	}

	/**
	 * Remove processed file record (called when file is closed)
	 */
	removeProcessedFile(documentUri: string) {
		this.processedFiles.delete(documentUri);
		logDebug(`Remove processed: ${documentUri}`);
	}

	private async start(task: Task) {
		try {
			await task.run();
			const documentUri = task.editor.document.uri.toString();
			this.processedFiles.add(documentUri);
			logDebug(`Mark processed: ${fileNameFromUri(task.editor.document.uri)}`);
		} catch (error) {
			logError(`${task} failed:`, error);
		} finally {
			if (this.currentTask === task) {
				this.currentTask = undefined;
			}
		}
	}

	private stopCurrentTask() {
		if (!this.currentTask) return;
		this.currentTask.cancel();
		this.currentTask = undefined;
	}
}

/** Execute processing task asynchronously */
class Task {
	private cancelled = false;

	constructor(readonly editor: TextEditor) {}

	toString(): string {
		return `<AutoFoldTask: ${fileNameFromUri(this.editor.document.uri)}>`;
	}

	cancel() {
		if (this.cancelled) return;
		this.cancelled = true;
		logInfo(`${this} cancelled`);
	}

	// No try-catch needed
	async run() {
		const editor = this.editor;
		logDebug(`Running ${this}...`);
		await processAutoFold(editor, {
			isEnd: () => this.cancelled,
		});
		logInfo(`${this} completed`);
	}
}
