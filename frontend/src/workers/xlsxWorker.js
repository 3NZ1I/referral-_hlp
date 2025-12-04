// Simple Web Worker for XLSX parsing to isolate processing
// Main thread should post { arrayBuffer, options } and receive { success, data, error }

// Worker uses `self` global; eslint rule not necessary here and may not be activated in the current config

let XLSX;

self.onmessage = async (evt) => {
  try {
    const { arrayBuffer, options } = evt.data || {};
    if (!arrayBuffer) throw new Error('No data provided');

    if (!XLSX) {
      // Dynamically import to keep worker lightweight until first use
      XLSX = await import('xlsx');
    }

    const uint8 = new Uint8Array(arrayBuffer);
    const wb = XLSX.read(uint8, { type: 'array', ...options });
    // By default, parse only the first sheet to limit exposure
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: null });

    self.postMessage({ success: true, data: { sheetName, rows: json } });
  } catch (err) {
    self.postMessage({ success: false, error: String(err?.message || err) });
  }
};
