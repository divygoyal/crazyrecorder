import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "dist",
		emptyDirFirst: true,
		rollupOptions: {
			input: {
				popup: resolve(__dirname, "popup.html"),
				editor: resolve(__dirname, "editor.html"),
				offscreen: resolve(__dirname, "offscreen.html"),
				"service-worker": resolve(
					__dirname,
					"src/background/service-worker.ts",
				),
				"cursor-tracker": resolve(
					__dirname,
					"src/content/cursor-tracker.ts",
				),
			},
			output: {
				entryFileNames: "[name].js",
				chunkFileNames: "chunks/[name]-[hash].js",
				assetFileNames: "assets/[name]-[hash][extname]",
			},
		},
	},
	resolve: {
		alias: {
			"@ext": resolve(__dirname, "src"),
		},
	},
});
