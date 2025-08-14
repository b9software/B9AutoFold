import { DocumentSymbol, Position, Range, SymbolKind } from 'vscode';
import { TARGET_LINE } from '../src/config';
import { generateFoldingPlan } from '../src/folding-algorithm';

type UTSymbol = [name: string, kind: SymbolKind, from: number, to: number, children: UTSymbol[]];

function makeSymbol(info: UTSymbol): DocumentSymbol {
	const result = new DocumentSymbol(
		info[0],
		'',
		info[1],
		new Range(new Position(info[2], 0), new Position(info[3], 0)),
		new Range(new Position(info[2], 0), new Position(info[3], 0)),
	);
	result.children = info[4].map(makeSymbol);
	return result;
}

function check(
	fileName: string,
	lineCount: number,
	symbols: UTSymbol[],
	skip: [start: number, end: number][],
	foldRanges: [start: number, end: number][],
): void {
	const foldingRanges = generateFoldingPlan({
		fileName,
		foldedRanges: [],
		skipRanges: skip.map(([start, end]) => new Range(start, 0, end, 0)),
		symbols: symbols.map(makeSymbol),
		targetLines: TARGET_LINE,
		topLevelContainer: symbols.length,
		visibleLines: lineCount,
	});
	const result = foldingRanges.map((r) => [r.start, r.end]);
	expect(result).toEqual(foldRanges);
}

describe('Folding Algorithm Tests', () => {
	it('should not fold when file is small', () => {
		const symbols: UTSymbol[] = [
			[
				'TestClass',
				SymbolKind.Class,
				1,
				20,
				[
					['m1', SymbolKind.Method, 5, 10, []],
					['m2', SymbolKind.Method, 12, 18, []],
				],
			],
		];
		check('test.ts', 30, symbols, [], []);
	});

	it('should fold methods in a class when file is large', () => {
		const symbols: UTSymbol[] = [
			[
				'Manager',
				SymbolKind.Class,
				13,
				116,
				[
					['m1', SymbolKind.Method, 33, 41, []],
					['p1', SymbolKind.Property, 15, 15, []],
					['m4', SymbolKind.Method, 77, 85, []],
					['m2', SymbolKind.Method, 18, 23, []],
					['m3', SymbolKind.Method, 48, 62, []],
				],
			],
		];
		// All methods should be folded
		check(
			'manager.ts',
			120,
			symbols,
			[],
			[
				[18, 23],
				[33, 41],
				[48, 62],
				[77, 85],
			],
		);
	});

	it('should fold interfaces and enums when space is limited', () => {
		const symbols: UTSymbol[] = [
			[
				'interface 1',
				SymbolKind.Interface,
				9,
				54,
				[
					['p1', SymbolKind.Property, 11, 11, []],
					['m1', SymbolKind.Method, 53, 53, []],
					['m2', SymbolKind.Method, 43, 43, []],
				],
			],
			['interface 2', SymbolKind.Interface, 56, 61, [['hide', SymbolKind.Method, 60, 60, []]]],
			[
				'enum1',
				SymbolKind.Enum,
				64,
				69,
				[
					['enum v1', SymbolKind.Variable, 66, 66, []],
					['enum v2', SymbolKind.Variable, 68, 68, []],
				],
			],
		];
		check(
			'interfaces.ts',
			180,
			symbols,
			[],
			[
				[9, 54],
				[56, 61],
				[64, 69],
			],
		);
	});

	it('should handle test files specially - fold containers but not describe blocks', () => {
		const symbols: UTSymbol[] = [
			[
				'some tests',
				SymbolKind.Function,
				17,
				125,
				[
					['describe 1', SymbolKind.Function, 18, 64, []],
					['describe 2', SymbolKind.Function, 66, 124, []],
				],
			],
		];
		// In test files, describe blocks shouldn't be folded, but outer containers should be
		check('some.test.ts', 130, symbols, [], [[17, 125]]);
	});

	it('should fold large variables but not small ones', () => {
		const symbols: UTSymbol[] = [
			['array', SymbolKind.Variable, 1, 24, []],
			[
				'class',
				SymbolKind.Class,
				26,
				100,
				[
					['m1', SymbolKind.Method, 31, 49, []],
					['m2', SymbolKind.Method, 74, 99, []],
				],
			],
			['smallVar', SymbolKind.Variable, 102, 105, []],
		];
		check(
			'data.ts',
			110,
			symbols,
			[],
			[
				[1, 24],
				[31, 49],
				[74, 99],
			],
		);
	});

	it('should respect size thresholds based on remaining space', () => {
		const symbols: UTSymbol[] = [
			['SmallMethod', SymbolKind.Method, 1, 4, []], // 4 lines
			['MediumMethod', SymbolKind.Method, 6, 15, []], // 10 lines
			['LargeMethod', SymbolKind.Method, 17, 50, []], // 34 lines
		];
		// Should prioritize folding large methods, may fold medium methods based on remaining space, generally don't fold small methods
		check('methods.ts', 60, symbols, [], [[17, 50]]);
	});

	it('should fold all top-level symbols in large files', () => {
		const symbols: UTSymbol[] = [
			['f1', SymbolKind.Function, 2, 5, []],
			['db', SymbolKind.Struct, 7, 10, []],
			['c1', SymbolKind.Class, 15, 51, []],
			['c2', SymbolKind.Class, 55, 67, []],
			['e1', SymbolKind.Enum, 69, 75, []],
			['c3', SymbolKind.Class, 78, 92, []],
			['c4', SymbolKind.Class, 97, 125, []],
			['c5', SymbolKind.Class, 127, 135, []],
			['c6', SymbolKind.Class, 137, 147, []],
			['e2', SymbolKind.Enum, 149, 152, []],
			['c7', SymbolKind.Class, 155, 191, []],
			['c8', SymbolKind.Class, 194, 208, []],
			['e3', SymbolKind.Enum, 210, 217, []],
			['c9', SymbolKind.Class, 220, 238, []],
		];
		check(
			'schema file',
			418,
			symbols,
			[],
			[
				[2, 5],
				[7, 10],
				[15, 51],
				[55, 67],
				[69, 75],
				[78, 92],
				[97, 125],
				[127, 135],
				[137, 147],
				[149, 152],
				[155, 191],
				[194, 208],
				[210, 217],
				[220, 238],
			],
		);
	});

	it('should correctly fold nested symbols with multi-level children', () => {
		const symbols: UTSymbol[] = [
			['root var', SymbolKind.Variable, 17, 17, []],
			[
				'root func',
				SymbolKind.Function,
				19,
				57,
				[
					[
						'v1',
						SymbolKind.Property,
						21,
						24,
						[
							['v1-1', SymbolKind.Property, 22, 22, []],
							['v1-2', SymbolKind.Property, 23, 23, []],
						],
					],
					['v5', SymbolKind.Variable, 49, 49, []],
					['v4', SymbolKind.Variable, 36, 44, []],
					['v3', SymbolKind.Variable, 33, 33, []],
					['v2', SymbolKind.Variable, 31, 31, []],
				],
			],
		];
		check(
			'big-func.ts',
			59,
			symbols,
			[],
			[
				[19, 57],
				[21, 24],
				[36, 44],
			],
		);
	});

	it('should fold deeply nested properties', () => {
		const symbols: UTSymbol[] = [
			[
				'p1',
				SymbolKind.Variable,
				10,
				58,
				[
					[
						'p2',
						SymbolKind.Property,
						11,
						57,
						[
							[
								'p3-1',
								SymbolKind.Property,
								45,
								50,
								[
									['center', SymbolKind.Property, 47, 47, []],
									['end', SymbolKind.Property, 48, 48, []],
									['justify', SymbolKind.Property, 49, 49, []],
									['start', SymbolKind.Property, 46, 46, []],
								],
							],
							[
								'p3-2',
								SymbolKind.Property,
								37,
								44,
								[
									['bold', SymbolKind.Property, 42, 42, []],
									['extrabold', SymbolKind.Property, 43, 43, []],
									['inherit', SymbolKind.Property, 38, 38, []],
									['medium', SymbolKind.Property, 40, 40, []],
									['regular', SymbolKind.Property, 39, 39, []],
									['semibold', SymbolKind.Property, 41, 41, []],
								],
							],
							[
								'p3-3',
								SymbolKind.Property,
								26,
								36,
								[
									['base', SymbolKind.Property, 27, 27, []],
									['caution', SymbolKind.Property, 34, 34, []],
									['critical', SymbolKind.Property, 35, 35, []],
									['info', SymbolKind.Property, 32, 32, []],
									['link', SymbolKind.Property, 29, 29, []],
									['muted', SymbolKind.Property, 28, 28, []],
									['primary', SymbolKind.Property, 30, 30, []],
									['secondary', SymbolKind.Property, 31, 31, []],
									['success', SymbolKind.Property, 33, 33, []],
								],
							],
							['p3-4', SymbolKind.Property, 51, 53, [['true', SymbolKind.Property, 52, 52, []]]],
							['p3-5', SymbolKind.Property, 54, 56, [['true', SymbolKind.Property, 55, 55, []]]],
							[
								'p3-6',
								SymbolKind.Property,
								12,
								25,
								[
									['body-2xs', SymbolKind.Property, 20, 20, []],
									['body-3xs', SymbolKind.Property, 19, 19, []],
									['body-lg', SymbolKind.Property, 24, 24, []],
									['body-md', SymbolKind.Property, 23, 23, []],
									['body-sm', SymbolKind.Property, 22, 22, []],
									['body-xs', SymbolKind.Property, 21, 21, []],
									['heading-2xl', SymbolKind.Property, 18, 18, []],
									['heading-lg', SymbolKind.Property, 16, 16, []],
									['heading-md', SymbolKind.Property, 15, 15, []],
									['heading-sm', SymbolKind.Property, 14, 14, []],
									['heading-xl', SymbolKind.Property, 17, 17, []],
									['heading-xs', SymbolKind.Property, 13, 13, []],
								],
							],
						],
					],
				],
			],
			[
				'p2',
				SymbolKind.Variable,
				60,
				73,
				[
					['body-2xs', SymbolKind.Property, 68, 68, []],
					['body-3xs', SymbolKind.Property, 67, 67, []],
					['body-lg', SymbolKind.Property, 72, 72, []],
					['body-md', SymbolKind.Property, 71, 71, []],
					['body-sm', SymbolKind.Property, 70, 70, []],
					['body-xs', SymbolKind.Property, 69, 69, []],
					['heading-2xl', SymbolKind.Property, 66, 66, []],
					['heading-lg', SymbolKind.Property, 64, 64, []],
					['heading-md', SymbolKind.Property, 63, 63, []],
					['heading-sm', SymbolKind.Property, 62, 62, []],
					['heading-xl', SymbolKind.Property, 65, 65, []],
					['heading-xs', SymbolKind.Property, 61, 61, []],
				],
			],
			[
				'TextProps',
				SymbolKind.Interface,
				75,
				80,
				[
					['as', SymbolKind.Property, 77, 77, []],
					['asChild', SymbolKind.Property, 78, 78, []],
					['className', SymbolKind.Property, 79, 79, []],
				],
			],
			[
				'Text',
				SymbolKind.Variable,
				82,
				120,
				[
					[
						'forwardRef() callback',
						SymbolKind.Function,
						83,
						119,
						[
							['align', SymbolKind.Property, 109, 109, []],
							['className', SymbolKind.Property, 112, 112, []],
							['fontWeight', SymbolKind.Property, 108, 108, []],
							['Tag', SymbolKind.Variable, 98, 100, []],
							['tone', SymbolKind.Property, 107, 107, []],
							['truncate', SymbolKind.Property, 110, 110, []],
							['uppercase', SymbolKind.Property, 111, 111, []],
							['variant', SymbolKind.Property, 106, 106, []],
						],
					],
				],
			],
		];
		check(
			'Text.tsx',
			123,
			symbols,
			[],
			[
				[11, 57],
				[12, 25],
				[26, 36],
				[37, 44],
				[45, 50],
				[51, 53],
				[54, 56],
				[83, 119],
			],
		);
	});

	it('should handle empty symbols gracefully', () => {
		const symbols: UTSymbol[] = [];
		check('empty.ts', 10, symbols, [], []);
	});

	it('should respect skip ranges and not fold overlapping symbols', () => {
		const symbols: UTSymbol[] = [
			['method1', SymbolKind.Method, 12, 15, []],
			['method2', SymbolKind.Method, 25, 30, []],
			['method3', SymbolKind.Method, 35, 45, []],
		];
		check(
			'test-skip.ts',
			50,
			symbols,
			[[40, 41]],
			[
				[12, 15],
				[25, 30],
			],
		);
	});
});
