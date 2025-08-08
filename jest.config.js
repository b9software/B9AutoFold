/** @type {import('jest').Config} */
module.exports = {
	collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
	globals: {
		DEBUG: true,
	},
	preset: 'ts-jest',
	roots: ['<rootDir>/tests'],
	testEnvironment: 'node',
	testMatch: ['**/*.test.ts'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
};
