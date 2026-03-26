/**
 * MV3 Service Worker — manages extension lifecycle, recording sessions,
 * and message routing between popup, offscreen doc, content scripts, and editor.
 */

interface AppRecordingState {
	isRecording: boolean;
	isPaused: boolean;
	mode: "tab" | "desktop" | null;
	tabId: number | null;
	startTime: number | null;
}

const state: AppRecordingState = {
	isRecording: false,
	isPaused: false,
	mode: null,
	tabId: null,
	startTime: null,
};

// Ensure offscreen document exists for recording
async function ensureOffscreenDocument(): Promise<void> {
	const existingContexts = await (chrome.runtime as any).getContexts({
		contextTypes: ["OFFSCREEN_DOCUMENT"],
	}) as unknown[];
	if (existingContexts.length > 0) return;

	await chrome.offscreen.createDocument({
		url: "offscreen.html",
		reasons: [chrome.offscreen.Reason.USER_MEDIA],
		justification: "Recording screen/tab audio and video",
	});
}

async function closeOffscreenDocument(): Promise<void> {
	try {
		await chrome.offscreen.closeDocument();
	} catch {
		// No offscreen document to close
	}
}

// Start tab capture recording
async function startTabCapture(
	tabId: number,
	withMic: boolean,
	withWebcam: boolean,
): Promise<void> {
	await ensureOffscreenDocument();

	const streamId = await (chrome.tabCapture as any).getMediaStreamId({
		targetTabId: tabId,
	}) as string;

	state.isRecording = true;
	state.mode = "tab";
	state.tabId = tabId;
	state.startTime = Date.now();

	await chrome.runtime.sendMessage({
		type: "start-recording",
		target: "offscreen",
		data: { streamId, mode: "tab", withMic, withWebcam },
	});

	// Inject cursor tracker into the recorded tab
	await chrome.scripting.executeScript({
		target: { tabId },
		files: ["cursor-tracker.js"],
	});
}

// Start desktop/window capture
function startDesktopCapture(
	withMic: boolean,
	withWebcam: boolean,
): void {
	chrome.desktopCapture.chooseDesktopMedia(
		["screen", "window"],
		(streamId) => {
			if (!streamId) return; // User cancelled

			ensureOffscreenDocument().then(() => {
				state.isRecording = true;
				state.mode = "desktop";
				state.tabId = null;
				state.startTime = Date.now();

				chrome.runtime.sendMessage({
					type: "start-recording",
					target: "offscreen",
					data: { streamId, mode: "desktop", withMic, withWebcam },
				});
			});
		},
	);
}

// Stop recording and open editor
async function stopRecording(): Promise<void> {
	state.isRecording = false;
	state.isPaused = false;
	state.mode = null;
	state.startTime = null;

	await chrome.runtime.sendMessage({
		type: "stop-recording",
		target: "offscreen",
	});
}

// Message handler
chrome.runtime.onMessage.addListener(
	(
		message: { type: string; data?: any },
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response?: any) => void,
	) => {
		switch (message.type) {
			case "get-state":
				sendResponse({
					isRecording: state.isRecording,
					isPaused: state.isPaused,
					mode: state.mode,
					tabId: state.tabId,
					startTime: state.startTime,
				});
				return true;

			case "start-tab-capture":
				startTabCapture(
					message.data.tabId,
					message.data.withMic,
					message.data.withWebcam,
				).then(() => sendResponse({ success: true }));
				return true;

			case "start-desktop-capture":
				startDesktopCapture(
					message.data.withMic,
					message.data.withWebcam,
				);
				sendResponse({ success: true });
				return true;

			case "stop-capture":
				stopRecording().then(() => sendResponse({ success: true }));
				return true;

			case "pause-capture":
				state.isPaused = true;
				chrome.runtime.sendMessage({
					type: "pause-recording",
					target: "offscreen",
				});
				sendResponse({ success: true });
				return true;

			case "resume-capture":
				state.isPaused = false;
				chrome.runtime.sendMessage({
					type: "resume-recording",
					target: "offscreen",
				});
				sendResponse({ success: true });
				return true;

			case "recording-complete": {
				// Offscreen doc finished — blob is stored in IndexedDB, open editor
				const recordingId = message.data.recordingId;
				chrome.tabs.create({
					url: `editor.html?id=${recordingId}`,
				});
				closeOffscreenDocument();
				sendResponse({ success: true });
				return true;
			}

			case "cursor-telemetry":
				// Forward cursor data to offscreen for embedding in recording metadata
				chrome.runtime.sendMessage({
					type: "cursor-data",
					target: "offscreen",
					data: message.data,
				});
				return false;
		}

		return false;
	},
);
