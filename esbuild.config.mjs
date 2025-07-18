import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import fs from "fs";
import path from "path";

const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

// Caminho de saída do plugin
const pluginOutputDir = "/mnt/arquivos/Dropbox/Obsidian/.obsidian/plugins/obsisdian-spirits-book";

// Cria a pasta, se não existir
if (!fs.existsSync(pluginOutputDir)) {
	fs.mkdirSync(pluginOutputDir, { recursive: true });
	console.log(`[SpiritsBook] Pasta criada: ${pluginOutputDir}`);
}

const prod = (process.argv[2] === "production");

const context = await esbuild.context({
	banner: {
		js: banner,
	},
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins
	],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: path.join(pluginOutputDir, "main.js"),
	minify: prod,
});

// 🔁 Função para copiar arquivos extra
function copyFile(src, dest) {
	if (fs.existsSync(src)) {
		fs.copyFileSync(src, dest);
		console.log(`[SpiritsBook] Copiado: ${src} → ${dest}`);
	}
}

// 🔁 Cópia de arquivos adicionais
function copyAssets() {
	copyFile("manifest.json", path.join(pluginOutputDir, "manifest.json"));

	const dataDir = "data";
	const destDataDir = path.join(pluginOutputDir, "data");
	if (!fs.existsSync(destDataDir)) {
		fs.mkdirSync(destDataDir, { recursive: true });
	}

	for (const lang of ["pt-BR", "en", "es", "fr"]) {
		copyFile(`${dataDir}/${lang}.json`, path.join(destDataDir, `${lang}.json`));
	}
}

if (prod) {
	await context.rebuild();
	copyAssets();
	process.exit(0);
} else {
	await context.watch();
	console.log("[SpiritsBook] Modo watch ativo. Aguardando mudanças...");
}
