import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { logDebug } from './utils';
import { Range } from './vscode';

/**
 * Get lines with uncommitted changes in the specified file
 */
export async function getUncommittedChanges(fileName: string): Promise<Range[]> {
	const dir = path.dirname(fileName);
	const baseName = path.basename(fileName);

	return new Promise((resolve) => {
		// Use --unified=0 to get minimal context diffs
		// Use HEAD to compare against the last commit
		execFile('git', ['diff', '--unified=0', 'HEAD', '--', baseName], { cwd: dir }, (error, stdout, stderr) => {
			if (error) {
				// git returns 1 if there are differences? No, usually 0.
				// If error is present, it might be a real error (e.g. not a git repo).
				if (stderr) {
					logDebug(`Git diff error for ${fileName}: ${stderr}`);
				}
				resolve([]);
				return;
			}

			if (!stdout) {
				resolve([]);
				return;
			}

			const ranges: Range[] = [];
			const lines = stdout.split('\n');
			// Match @@ -oldStart,oldCount +newStart,newCount @@
			// newCount is optional, defaults to 1
			const hunkHeaderRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

			for (const line of lines) {
				const match = line.match(hunkHeaderRegex);
				if (match) {
					const startLine = parseInt(match[1], 10);
					const lineCount = match[2] ? parseInt(match[2], 10) : 1;

					// Git diff lines are 1-based
					// VS Code ranges are 0-based

					if (lineCount === 0) {
						// Pure deletion
						// We mark the line where it was deleted so it doesn't get hidden if it's right at a fold boundary?
						// Actually, if it's deleted, it's not in the file.
						// But the context around it might be important.
						// Let's mark the line before/at the deletion point.
						const line = Math.max(0, startLine - 1);
						ranges.push(new Range(line, 0, line, 0));
					} else {
						// Modification/Addition
						// range: [startLine-1, startLine + lineCount - 2]

						const start = Math.max(0, startLine - 1);
						const end = Math.max(0, startLine + lineCount - 2);
						ranges.push(new Range(start, 0, end, 0));
					}
				}
			}

			resolve(ranges);
		});
	});
}
