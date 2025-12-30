import * as child_process from 'node:child_process';
import { getUncommittedChanges } from '../src/git-utils';

// Mock child_process
jest.mock('node:child_process');

// Mock utils logger to avoid console spam
jest.mock('../src/utils', () => ({
	logDebug: jest.fn(),
	logError: jest.fn(),
}));

describe('git-utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getUncommittedChanges', () => {
		it('should return empty array if git diff fails (error)', async () => {
			(child_process.exec as unknown as jest.Mock).mockImplementation((_cmd, _opts, callback) => {
				callback(new Error('git not found'), '', 'error message');
			});

			const changes = await getUncommittedChanges('/path/to/file.ts');
			expect(changes).toEqual([]);
		});

		it('should return empty array if git diff returns empty string', async () => {
			(child_process.exec as unknown as jest.Mock).mockImplementation((_cmd, _opts, callback) => {
				callback(null, '', '');
			});

			const changes = await getUncommittedChanges('/path/to/file.ts');
			expect(changes).toEqual([]);
		});

		it('should parse git diff output correctly for modifications', async () => {
			const stdout = `
@@ -10,2 +10,2 @@
 code
@@ -20,1 +20,3 @@
 code
`;
			(child_process.exec as unknown as jest.Mock).mockImplementation((_cmd, _opts, callback) => {
				callback(null, stdout, '');
			});

			const changes = await getUncommittedChanges('/path/to/file.ts');
			// @@ -10,2 +10,2 @@ -> start 10, count 2. Range(9, 10).
			// @@ -20,1 +20,3 @@ -> start 20, count 3. Range(19, 21).

			expect(changes).toHaveLength(2);
			expect(changes[0].start.line).toBe(9);
			expect(changes[0].end.line).toBe(10);
			expect(changes[1].start.line).toBe(19);
			expect(changes[1].end.line).toBe(21);
		});

		it('should parse git diff output correctly for deletions', async () => {
			const stdout = `@@ -10,1 +10,0 @@`;
			(child_process.exec as unknown as jest.Mock).mockImplementation((_cmd, _opts, callback) => {
				callback(null, stdout, '');
			});

			const changes = await getUncommittedChanges('/path/to/file.ts');
			// start 10, count 0. Range(9, 9).
			expect(changes).toHaveLength(1);
			expect(changes[0].start.line).toBe(9);
			expect(changes[0].end.line).toBe(9);
		});

		it('should parse git diff output correctly for additions', async () => {
			const stdout = `@@ -10,0 +11,1 @@`;
			// startLine=11, count=1.
			// Range(10, 10).

			(child_process.exec as unknown as jest.Mock).mockImplementation((_cmd, _opts, callback) => {
				callback(null, stdout, '');
			});

			const changes = await getUncommittedChanges('/path/to/file.ts');
			expect(changes).toHaveLength(1);
			expect(changes[0].start.line).toBe(10);
			expect(changes[0].end.line).toBe(10);
		});
	});
});
