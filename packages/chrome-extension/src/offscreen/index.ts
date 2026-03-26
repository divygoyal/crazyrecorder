/**
 * Offscreen document — handles MediaRecorder sessions.
 * MV3 service workers can't access MediaRecorder/MediaStream,
 * so this offscreen document does the actual recording.
 */

import { saveRecording, type CursorPoint } from "@ext/storage/db";

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let cursorData: CursorPoint[] = [];
let recordingStartTime = 0;
let webcamStream: MediaStream | null = null;

function generateId(): string {
	return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function getMediaStream(
	streamId: string,
	mode: "tab" | "desktop",
	withMic: boolean,
): Promise<MediaStream> {
	let displayStream: MediaStream;

	if (mode === "tab") {
		// Tab capture — streamId from chrome.tabCapture.getMediaStreamId
		displayStream = await navigator.mediaDevices.getUserMedia({
			audio: {
				mandatory: {
					chromeMediaSource: "tab",
					chromeMediaSourceId: streamId,
				},
			} as MediaTrackConstraints,
			video: {
				mandatory: {
					chromeMediaSource: "tab",
					chromeMediaSourceId: streamId,
				},
			} as MediaTrackConstraints,
		});
	} else {
		// Desktop capture — streamId from chrome.desktopCapture
		displayStream = await navigator.mediaDevices.getUserMedia({
			audio: false,
			video: {
				mandatory: {
					chromeMediaSource: "desktop",
					chromeMediaSourceId: streamId,
				},
			} as MediaTrackConstraints,
		});
	}

	// Mix in microphone if requested
	if (withMic) {
		try {
			const micStream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false,
			});

			const audioContext = new AudioContext();
			const destination = audioContext.createMediaStreamDestination();

			// Add display audio tracks
			for (const track of displayStream.getAudioTracks()) {
				const source = audioContext.createMediaStreamSource(
					new MediaStream([track]),
				);
				source.connect(destination);
			}

			// Add microphone
			const micSource = audioContext.createMediaStreamSource(micStream);
			micSource.connect(destination);

			// Create combined stream: video from display + mixed audio
			const combinedStream = new MediaStream([
				...displayStream.getVideoTracks(),
				...destination.stream.getAudioTracks(),
			]);

			return combinedStream;
		} catch {
			// Mic failed, continue without it
			return displayStream;
		}
	}

	return displayStream;
}

function selectMimeType(): string {
	const candidates = [
		"video/webm;codecs=vp9,opus",
		"video/webm;codecs=vp8,opus",
		"video/webm;codecs=vp9",
		"video/webm;codecs=vp8",
		"video/webm",
	];
	for (const mime of candidates) {
		if (MediaRecorder.isTypeSupported(mime)) return mime;
	}
	return "video/webm";
}

async function startRecording(data: {
	streamId: string;
	mode: "tab" | "desktop";
	withMic: boolean;
	withWebcam: boolean;
}): Promise<void> {
	const stream = await getMediaStream(
		data.streamId,
		data.mode,
		data.withMic,
	);

	// Optionally capture webcam separately
	if (data.withWebcam) {
		try {
			webcamStream = await navigator.mediaDevices.getUserMedia({
				video: { width: 640, height: 480 },
				audio: false,
			});
		} catch {
			webcamStream = null;
		}
	}

	const mimeType = selectMimeType();
	recordedChunks = [];
	cursorData = [];
	recordingStartTime = Date.now();

	mediaRecorder = new MediaRecorder(stream, {
		mimeType,
		videoBitsPerSecond: 5_000_000, // 5 Mbps
	});

	mediaRecorder.ondataavailable = (event) => {
		if (event.data.size > 0) {
			recordedChunks.push(event.data);
		}
	};

	mediaRecorder.onstop = async () => {
		const blob = new Blob(recordedChunks, { type: mimeType });
		const id = generateId();
		const duration = Date.now() - recordingStartTime;

		// Save webcam blob if captured
		let webcamBlob: Blob | undefined;
		if (webcamStream) {
			// Webcam was captured alongside — for now just stop the stream
			// Full webcam recording would need its own MediaRecorder
			for (const track of webcamStream.getTracks()) track.stop();
			webcamStream = null;
		}

		await saveRecording({
			id,
			blob,
			mimeType,
			duration,
			createdAt: Date.now(),
			cursorData: cursorData.length > 0 ? cursorData : undefined,
			webcamBlob,
		});

		// Stop all tracks
		for (const track of stream.getTracks()) track.stop();

		// Notify service worker
		chrome.runtime.sendMessage({
			type: "recording-complete",
			data: { recordingId: id, duration },
		});
	};

	mediaRecorder.start(1000); // Collect data every second
}

function stopRecording(): void {
	if (mediaRecorder && mediaRecorder.state !== "inactive") {
		mediaRecorder.stop();
	}
}

function pauseRecording(): void {
	if (mediaRecorder && mediaRecorder.state === "recording") {
		mediaRecorder.pause();
	}
}

function resumeRecording(): void {
	if (mediaRecorder && mediaRecorder.state === "paused") {
		mediaRecorder.resume();
	}
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message) => {
	if (message.target !== "offscreen") return;

	switch (message.type) {
		case "start-recording":
			startRecording(message.data);
			break;
		case "stop-recording":
			stopRecording();
			break;
		case "pause-recording":
			pauseRecording();
			break;
		case "resume-recording":
			resumeRecording();
			break;
	}

	// Cursor telemetry forwarded from content script
	if (message.type === "cursor-data") {
		cursorData.push(message.data);
	}
});
