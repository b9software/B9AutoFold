const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[esbuild] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[esbuild] build finished');
		});
	},
};

async function main() {
	const ctx = await esbuild.context({
		bundle: true,
		define: {
			DEBUG: JSON.stringify(!production),
		},
		entryPoints: ['src/extension.ts'],
		external: ['vscode'],
		format: 'cjs',
		logLevel: 'warning',
		mangleProps: production ? /^_/ : undefined,
		mangleQuoted: production ? true : undefined,
		minify: production,
		outfile: 'dist/extension.js',
		platform: 'node',
		plugins: [esbuildProblemMatcherPlugin],
		sourcemap: !production,
		sourcesContent: false,
	});
	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
