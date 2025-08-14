class Position {
	constructor(line, character) {
		this.line = line;
		this.character = character;
	}
}

// Mock VS Code API for testing
const vscode = {
	commands: {
		executeCommand: jest.fn(),
	},
	DocumentSymbol: class DocumentSymbol {
		constructor(name, detail, kind, range, selectionRange) {
			this.name = name;
			this.detail = detail;
			this.kind = kind;
			this.range = range;
			this.selectionRange = selectionRange;
			this.children = [];
		}
	},
	env: {
		clipboard: {
			writeText: jest.fn(),
		},
	},
	FoldingRange: class FoldingRange {
		constructor(start, end, kind) {
			this.start = start;
			this.end = end;
			this.kind = kind;
		}
	},
	FoldingRangeKind: {
		Comment: 1,
		Imports: 2,
		Region: 3,
	},
	Position: Position,
	Range: class Range {
		constructor(start, p2, p3, p4) {
			if (p3 === undefined && p4 === undefined) {
				this.start = start;
				this.end = p2;
			} else {
				this.start = new Position(start, p2);
				this.end = new Position(p3, p4);
			}
		}
	},
	SymbolKind: {
		0: 'File',
		1: 'Module',
		2: 'Namespace',
		3: 'Package',
		4: 'Class',
		5: 'Method',
		6: 'Property',
		7: 'Field',
		8: 'Constructor',
		9: 'Enum',
		10: 'Interface',
		11: 'Function',
		12: 'Variable',
		13: 'Constant',
		14: 'String',
		15: 'Number',
		16: 'Boolean',
		17: 'Array',
		18: 'Object',
		19: 'Key',
		20: 'Null',
		21: 'EnumMember',
		22: 'Struct',
		23: 'Event',
		24: 'Operator',
		25: 'TypeParameter',
		Array: 17,
		Boolean: 16,
		Class: 4,
		Constant: 13,
		Constructor: 8,
		Enum: 9,
		EnumMember: 21,
		Event: 23,
		Field: 7,
		File: 0,
		Function: 11,
		Interface: 10,
		Key: 19,
		Method: 5,
		Module: 1,
		Namespace: 2,
		Null: 20,
		Number: 15,
		Object: 18,
		Operator: 24,
		Package: 3,
		Property: 6,
		String: 14,
		Struct: 22,
		TypeParameter: 25,
		Variable: 12,
	},
	window: {
		activeTextEditor: null,
		createOutputChannel: jest.fn(() => ({
			appendLine: jest.fn(),
			clear: jest.fn(),
			dispose: jest.fn(),
			show: jest.fn(),
		})),
		showErrorMessage: jest.fn(),
		showInformationMessage: jest.fn(),
		visibleTextEditors: [],
	},
	workspace: {
		getConfiguration: jest.fn(() => ({
			get: jest.fn((_key, defaultValue) => defaultValue),
		})),
		onDidOpenTextDocument: jest.fn(),
	},
};

module.exports = vscode;
