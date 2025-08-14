import { type DocumentSymbol, FoldingRange, FoldingRangeKind, type Range, SymbolKind } from 'vscode';
import { debugDescription, logDebug } from './utils';

/**
 * This module implements a hierarchical folding algorithm for VS Code.
 *
 * The algorithm dynamically adjusts folding strategies to fit the main structure of a file
 * within a target screen line count. It prioritizes higher-level symbols
 * and uses a depth-first approach to evaluate folding from the deepest to the shallowest levels.
 *
 * Key features include:
 * - Dynamic threshold adjustment based on remaining visible lines.
 * - Special handling for test files to ensure structural visibility.
 * - Symbol-specific folding rules based on type, size, and context.
 * - Efficient calculation of folding ranges to optimize screen space usage.
 */

/** Folding context */
interface FoldingContext {
	fileName: string; // Filename (for special handling)
	/** Already folded ranges */
	foldedRanges: FoldingRange[];
	skipRanges: readonly Range[];
	symbols: DocumentSymbol[];
	/** Target lines after folding */
	targetLines: number;
	topLevelContainer: number;
	/** Current visible lines */
	visibleLines: number;
}

/** Symbol and its depth information */
interface SymbolWithDepth {
	symbol: DocumentSymbol;
	depth: number;
	parent?: SymbolWithDepth;
}

// const containerKinds = [SymbolKind.Class, SymbolKind.Namespace, SymbolKind.Module, SymbolKind.Interface];

/**
 * Main entry function for generating folding plan
 */
export function generateFoldingPlan(context: FoldingContext): FoldingRange[] {
	const { symbols } = context;
	// context.topLevelContainer = symbols.filter((s) => containerKinds.includes(s.kind)).length;

	// 1. Calculate total lines when not folded
	if (context.visibleLines <= context.targetLines) {
		logDebug('File already within target lines, no folding needed');
		return []; // Already within budget, no folding needed
	}

	// 2. Build symbol depth information
	const symbolsWithDepth = buildSymbolDepthInfo(symbols);

	// 3. Sort by depth from deep to shallow, same depth by size from large to small
	const symbolsByDepth = symbolsWithDepth.sort((a, b) => {
		// First sort by depth (deeper symbols first)
		if (a.depth !== b.depth) {
			return b.depth - a.depth;
		}
		// Same depth sort by size (larger symbols first)
		const sizeA = a.symbol.range.end.line - a.symbol.range.start.line;
		const sizeB = b.symbol.range.end.line - b.symbol.range.start.line;
		return sizeB - sizeA;
	});

	// 4. Evaluate folding from leaf nodes using depth-first approach
	const foldingPlan: FoldingRange[] = [];

	for (const symbolWithDepth of symbolsByDepth) {
		if (context.visibleLines <= context.targetLines) {
			break; // Reached target
		}

		const symbol = symbolWithDepth.symbol;
		if (shouldFold(symbol, context)) {
			const range = new FoldingRange(symbol.range.start.line, symbol.range.end.line, FoldingRangeKind.Region);

			foldingPlan.push(range);

			// Calculate actual saved lines, considering child symbols already folded
			const savedLines = calculateSavedLines(symbol, context.foldedRanges);
			context.foldedRanges.push(range);
			context.visibleLines -= savedLines;

			logDebug(
				`Folding ${symbol.name} (${SymbolKind[symbol.kind]}), saved ${savedLines} lines, remaining: ${context.visibleLines}`,
			);
		}
	}

	logDebug(
		`Generated ${foldingPlan.map(debugDescription)} folding ranges, estimated visible lines: ${context.visibleLines}`,
	);
	return foldingPlan.sort((a, b) => a.start - b.start);
}

/**
 * Build symbol depth information
 */
function buildSymbolDepthInfo(symbols: DocumentSymbol[], depth = 0, parent?: SymbolWithDepth): SymbolWithDepth[] {
	const result: SymbolWithDepth[] = [];

	for (const symbol of symbols) {
		const symbolWithDepth: SymbolWithDepth = {
			depth,
			parent,
			symbol,
		};

		result.push(symbolWithDepth);

		// Recursively process child symbols
		if (symbol.children && symbol.children.length > 0) {
			result.push(...buildSymbolDepthInfo(symbol.children, depth + 1, symbolWithDepth));
		}
	}

	return result;
}

/**
 * Folding decision rules
 */
function shouldFold(symbol: DocumentSymbol, context: FoldingContext): boolean {
	const size = symbol.range.end.line - symbol.range.start.line + 1;

	// Skip child symbols if parent symbol is already folded
	if (isSymbolInFolding(symbol, context.foldedRanges)) {
		return false;
	}

	if (isSymbolIntersectRanges(symbol, context.skipRanges)) {
		logDebug(`${symbol.name} in skip ranges`);
		return false;
	}

	// Calculate current remaining space budget
	const budget = context.targetLines - context.visibleLines;

	// Special handling for test files
	if (isTestFile(context.fileName)) {
		return handleTestFileFolding(symbol, budget);
	}

	// Folding strategy based on symbol type, size and remaining space
	switch (symbol.kind) {
		case SymbolKind.Method:
		case SymbolKind.Function:
		case SymbolKind.Constructor:
			// Methods/functions: fold if more than 3 lines, lower threshold when space is tight
			return size > (budget < 20 ? 2 : 3);

		case SymbolKind.Struct:
		case SymbolKind.Class: {
			// Classes rarely fold, unless file has many top-level symbols and space is tight
			return context.topLevelContainer > 5 && budget < 10;
		}

		case SymbolKind.Namespace:
		case SymbolKind.Module: {
			// Namespaces/modules similar to Classes
			return context.topLevelContainer > 5 && size > 15 && budget < 20;
		}

		case SymbolKind.Interface:
		case SymbolKind.Enum:
			// Interfaces/Enums fold by default, unless very short or space is sufficient
			return size > 3 || budget < 30;

		case SymbolKind.Object:
		case SymbolKind.Array:
		case SymbolKind.Variable:
			// Only fold long variable declarations (like large arrays)
			return size > (budget < 20 ? 5 : 10);

		case SymbolKind.Field:
		case SymbolKind.Property:
			// Single-line properties don't fold, multi-line properties based on space
			return size > 1 && (size > 8 || budget < 15);

		default:
			return size > 5;
	}
}

/**
 * Special folding logic for test files
 */
function handleTestFileFolding(symbol: DocumentSymbol, remainingBudget: number): boolean {
	// Special logic for test files
	if (symbol.name.includes('describe')) {
		// describe blocks don't fold to keep structure visible
		return false;
	}

	if (symbol.name.includes('it') || symbol.name.includes('test')) {
		// Specific test cases fold, more aggressive when space is tight
		return remainingBudget < 30 ? true : symbol.range.end.line - symbol.range.start.line > 5;
	}

	// Others follow regular rules
	const size = symbol.range.end.line - symbol.range.start.line + 1;
	return size > (remainingBudget < 20 ? 3 : 5);
}

/**
 * Check if symbol is a child of already folded symbol
 */
function isSymbolInFolding(symbol: DocumentSymbol, ranges: FoldingRange[]): boolean {
	const symbolStart = symbol.range.start.line;
	const symbolEnd = symbol.range.end.line;
	return ranges.some((fold) => fold.start <= symbolStart && fold.end >= symbolEnd);
}

function isSymbolIntersectRanges(symbol: DocumentSymbol, ranges: readonly Range[]): boolean {
	const symbolStart = symbol.range.start.line;
	const symbolEnd = symbol.range.end.line;

	return ranges.some((range) => {
		const rangeStart = range.start.line;
		const rangeEnd = range.end.line;
		return !(symbolEnd < rangeStart || symbolStart > rangeEnd);
	});
}

/**
 * Calculate actual lines saved when folding specified symbol
 * Need to consider child regions already folded within its range
 */
function calculateSavedLines(symbol: DocumentSymbol, alreadyFolded: FoldingRange[]): number {
	const symbolStart = symbol.range.start.line;
	const symbolEnd = symbol.range.end.line;

	// Calculate currently visible lines within symbol range
	let visibleLines = symbolEnd - symbolStart + 1; // Total lines

	for (const fold of alreadyFolded) {
		if (fold.start >= symbolStart && fold.end <= symbolEnd) {
			// This folded region is completely within current symbol
			const foldedLines = fold.end - fold.start; // Folded lines
			visibleLines = visibleLines - foldedLines + 1; // Subtract folded lines, add 1 for fold marker
		}
	}

	// Lines saved after folding = current visible lines - 1 (fold marker line)
	return Math.max(0, visibleLines - 1);
}

/**
 * Determine if it's a test file
 */
function isTestFile(fileName: string): boolean {
	const testPatterns = [/\.test\./, /\.spec\./, /test/i, /spec/i, /__tests__/, /\.stories\./];

	return testPatterns.some((pattern) => pattern.test(fileName));
}
