# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

### XLSX Import Hardening
- Validate files before parsing using `src/utils/xlsxGuard.js`:
	- Enforces `.xlsx` extension, max size (5MB), and MIME checks.
	- Example:
		```js
		import { validateXlsxFile } from './src/utils/xlsxGuard';
		// in your upload handler:
		validateXlsxFile(file);
		```
- Parse in a Web Worker (`src/workers/xlsxWorker.js`) to isolate processing:
	- Example:
		```js
		const worker = new Worker(new URL('./src/workers/xlsxWorker.js', import.meta.url), { type: 'module' });
		const buf = await file.arrayBuffer();
		worker.postMessage({ arrayBuffer: buf, options: { cellDates: true } });
		worker.onmessage = (e) => {
			const { success, data, error } = e.data;
			if (!success) {
				console.error('XLSX parse failed:', error);
				return;
			}
			console.log('Parsed rows:', data.rows);
		};
		```
 - Limit sheet parsing using `safeSheetSelection(workbook, allowedNames)` if needed.
