/**
 * IndexedDB storage for video blobs and project metadata.
 * Uses idb-keyval for simple key-value access.
 */

const DB_NAME = "yourbrand-recordings";
const DB_VERSION = 1;

interface RecordingEntry {
	id: string;
	blob: Blob;
	mimeType: string;
	duration: number;
	createdAt: number;
	cursorData?: CursorPoint[];
	webcamBlob?: Blob;
}

interface ProjectEntry {
	id: string;
	recordingId: string;
	name: string;
	editorState: string; // JSON-serialized editor state
	thumbnail?: Blob;
	updatedAt: number;
}

export interface CursorPoint {
	x: number;
	y: number;
	timestamp: number;
	type: "move" | "click" | "double-click" | "right-click";
}

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains("recordings")) {
				db.createObjectStore("recordings", { keyPath: "id" });
			}
			if (!db.objectStoreNames.contains("projects")) {
				db.createObjectStore("projects", { keyPath: "id" });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function saveRecording(entry: RecordingEntry): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("recordings", "readwrite");
		tx.objectStore("recordings").put(entry);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getRecording(
	id: string,
): Promise<RecordingEntry | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("recordings", "readonly");
		const request = tx.objectStore("recordings").get(id);
		request.onsuccess = () => resolve(request.result as RecordingEntry | undefined);
		request.onerror = () => reject(request.error);
	});
}

export async function listRecordings(): Promise<RecordingEntry[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("recordings", "readonly");
		const request = tx.objectStore("recordings").getAll();
		request.onsuccess = () => resolve(request.result as RecordingEntry[]);
		request.onerror = () => reject(request.error);
	});
}

export async function deleteRecording(id: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("recordings", "readwrite");
		tx.objectStore("recordings").delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function saveProject(entry: ProjectEntry): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("projects", "readwrite");
		tx.objectStore("projects").put(entry);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getProject(
	id: string,
): Promise<ProjectEntry | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("projects", "readonly");
		const request = tx.objectStore("projects").get(id);
		request.onsuccess = () => resolve(request.result as ProjectEntry | undefined);
		request.onerror = () => reject(request.error);
	});
}

export async function listProjects(): Promise<ProjectEntry[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("projects", "readonly");
		const request = tx.objectStore("projects").getAll();
		request.onsuccess = () => resolve(request.result as ProjectEntry[]);
		request.onerror = () => reject(request.error);
	});
}

export async function deleteProject(id: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("projects", "readwrite");
		tx.objectStore("projects").delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
