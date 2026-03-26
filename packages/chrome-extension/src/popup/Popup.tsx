import { useCallback, useEffect, useState } from "react";

type CaptureMode = "tab" | "desktop";

interface RecordingState {
	isRecording: boolean;
	isPaused: boolean;
	mode: CaptureMode | null;
	startTime: number | null;
}

export function Popup() {
	const [state, setState] = useState<RecordingState>({
		isRecording: false,
		isPaused: false,
		mode: null,
		startTime: null,
	});
	const [captureMode, setCaptureMode] = useState<CaptureMode>("tab");
	const [withMic, setWithMic] = useState(false);
	const [withWebcam, setWithWebcam] = useState(false);
	const [elapsed, setElapsed] = useState("00:00");

	// Sync state from service worker on open
	useEffect(() => {
		chrome.runtime.sendMessage({ type: "get-state" }, (response) => {
			if (response) setState(response);
		});
	}, []);

	// Timer
	useEffect(() => {
		if (!state.isRecording || !state.startTime) return;
		const interval = setInterval(() => {
			const secs = Math.floor((Date.now() - state.startTime!) / 1000);
			const mm = String(Math.floor(secs / 60)).padStart(2, "0");
			const ss = String(secs % 60).padStart(2, "0");
			setElapsed(`${mm}:${ss}`);
		}, 500);
		return () => clearInterval(interval);
	}, [state.isRecording, state.startTime]);

	const startRecording = useCallback(async () => {
		if (captureMode === "tab") {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			if (!tab?.id) return;
			chrome.runtime.sendMessage({
				type: "start-tab-capture",
				data: { tabId: tab.id, withMic, withWebcam },
			});
		} else {
			chrome.runtime.sendMessage({
				type: "start-desktop-capture",
				data: { withMic, withWebcam },
			});
		}
		setState((s) => ({
			...s,
			isRecording: true,
			mode: captureMode,
			startTime: Date.now(),
		}));
		// Close popup after starting — recording continues in offscreen doc
		window.close();
	}, [captureMode, withMic, withWebcam]);

	const stopRecording = useCallback(() => {
		chrome.runtime.sendMessage({ type: "stop-capture" });
		setState((s) => ({ ...s, isRecording: false, isPaused: false }));
	}, []);

	const pauseResume = useCallback(() => {
		if (state.isPaused) {
			chrome.runtime.sendMessage({ type: "resume-capture" });
			setState((s) => ({ ...s, isPaused: false }));
		} else {
			chrome.runtime.sendMessage({ type: "pause-capture" });
			setState((s) => ({ ...s, isPaused: true }));
		}
	}, [state.isPaused]);

	// Recording in progress view
	if (state.isRecording) {
		return (
			<div className="w-80 p-4">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
						<span className="text-sm font-medium text-white">
							{state.isPaused ? "Paused" : "Recording"}
						</span>
					</div>
					<span className="font-mono text-sm text-slate-400">
						{elapsed}
					</span>
				</div>

				<div className="flex gap-2">
					<button
						type="button"
						onClick={pauseResume}
						className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
					>
						{state.isPaused ? "Resume" : "Pause"}
					</button>
					<button
						type="button"
						onClick={stopRecording}
						className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
					>
						Stop
					</button>
				</div>
			</div>
		);
	}

	// Start recording view
	return (
		<div className="w-80 p-4">
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-white">YourBrand</h1>
				<p className="text-xs text-slate-400">
					Screen recording & editing
				</p>
			</div>

			{/* Capture mode */}
			<div className="mb-3">
				<label className="mb-1 block text-xs font-medium text-slate-400">
					Capture Mode
				</label>
				<div className="flex rounded-lg bg-white/5 p-0.5">
					<button
						type="button"
						onClick={() => setCaptureMode("tab")}
						className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
							captureMode === "tab"
								? "bg-white/15 text-white"
								: "text-slate-400 hover:text-white"
						}`}
					>
						Current Tab
					</button>
					<button
						type="button"
						onClick={() => setCaptureMode("desktop")}
						className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
							captureMode === "desktop"
								? "bg-white/15 text-white"
								: "text-slate-400 hover:text-white"
						}`}
					>
						Desktop
					</button>
				</div>
			</div>

			{/* Audio/Webcam toggles */}
			<div className="mb-4 space-y-2">
				<label className="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						checked={withMic}
						onChange={(e) => setWithMic(e.target.checked)}
						className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
					/>
					<span className="text-sm text-slate-300">Microphone</span>
				</label>
				<label className="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						checked={withWebcam}
						onChange={(e) => setWithWebcam(e.target.checked)}
						className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
					/>
					<span className="text-sm text-slate-300">
						Webcam overlay
					</span>
				</label>
			</div>

			{/* Record button */}
			<button
				type="button"
				onClick={startRecording}
				className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
			>
				Start Recording
			</button>
		</div>
	);
}
