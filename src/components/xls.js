// xlsWorker.js
self.importScripts("https://unpkg.com/xlsx/dist/xlsx.full.min.js");

self.onmessage = async (e) => {
	try {
		const data = e.data;
		const workbook = XLSX.read(data, { type: "buffer" });

		// Assuming the data is in the first sheet
		const firstSheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[firstSheetName];

		// Convert sheet to JSON
		const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

		// Post the 'communes' data back to the main thread
		self.postMessage(json);
	} catch (error) {
		// Handle any errors here
		self.postMessage({ error: error.message });
	}
};
