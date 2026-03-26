import { useCallback, useState } from "react";
import { getRecording } from "@ext/storage/db";

type ExportFormat = "mp4" | "webm" | "gif";
type ExportQuality = "low" | "medium" | "high";

interface TrimRange {
	startMs: number;
	endMs: number;
}

interface ExportPanelProps {
	recordingId: string;
	videoUrl: string;
	trimRange: TrimRange | null;
	onClose: () => void;
}

const QUALITY_BITRATES: Record<ExportQuality, number> = {
	low: 1_000_000,
	medium: 3_000_000,
	high: 8_000_000,
};

export function ExportPanel({
	recordingId,
	videoUrl,
	trimRange,
	onClose,
}: ExportPanelProps) {
	const [format, setFormat] = useState<ExportFormat>("mp4");
	const [quality, setQuality] = useState<ExportQuality>("high");
	const [isExporting, setIsExporting] = useState(false);
	const [progress, setProgress] = useState(0);

	const exportVideo = useCallback(async () => {
		setIsExporting(true);
		setProgress(0);

		try {
			const recording = await getRecording(recordingId);
			if (!recording) throw new Error("Recording not found");

			if (format === "webm") {
				// WebM — just download the original blob (already webm)
				downloadBlob(recording.blob, `recording.webm`);
				setProgress(100);
			} else if (format === "mp4") {
				// MP4 — use WebCodecs to re-encode
				await exportAsMp4(
					videoUrl,
					quality,
					trimRange,
					(p) => setProgress(p),
				);
			} else {
				// GIF — render frames to canvas, encode with gif worker
				await exportAsGif(videoUrl, trimRange, (p) =>
					setProgress(p),
				);
			}
		} catch (err) {
			console.error("Export failed:", err);
			alert(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`);
		} finally {
			setIsExporting(false);
		}
	}, [recordingId, format, quality, videoUrl, trimRange]);

	return (
		<div className="w-72 border-l border-white/10 bg-[#111] p-4 overflow-y-auto">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-sm font-semibold text-white">Export</h2>
				<button
					type="button"
					onClick={onClose}
					className="text-slate-400 hover:text-white text-lg"
				>
					&times;
				</button>
			</div>

			{/* Format selector */}
			<div className="mb-4">
				<label className="mb-1 block text-xs font-medium text-slate-400">
					Format
				</label>
				<div className="flex rounded-lg bg-white/5 p-0.5">
					{(["mp4", "webm", "gif"] as const).map((f) => (
						<button
							key={f}
							type="button"
							onClick={() => setFormat(f)}
							className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium uppercase transition-colors ${
								format === f
									? "bg-white/15 text-white"
									: "text-slate-400 hover:text-white"
							}`}
						>
							{f}
						</button>
					))}
				</div>
			</div>

			{/* Quality (only for mp4) */}
			{format === "mp4" && (
				<div className="mb-4">
					<label className="mb-1 block text-xs font-medium text-slate-400">
						Quality
					</label>
					<div className="flex rounded-lg bg-white/5 p-0.5">
						{(["low", "medium", "high"] as const).map((q) => (
							<button
								key={q}
								type="button"
								onClick={() => setQuality(q)}
								className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
									quality === q
										? "bg-white/15 text-white"
										: "text-slate-400 hover:text-white"
								}`}
							>
								{q}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Trim info */}
			{trimRange && (
				<div className="mb-4 rounded-lg bg-blue-500/10 border border-blue-500/20 p-2">
					<p className="text-xs text-blue-300">
						Exporting trimmed region only
					</p>
				</div>
			)}

			{/* Export button */}
			<button
				type="button"
				onClick={exportVideo}
				disabled={isExporting}
				className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{isExporting ? `Exporting... ${Math.round(progress)}%` : `Export ${format.toUpperCase()}`}
			</button>

			{/* Progress bar */}
			{isExporting && (
				<div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
					<div
						className="h-full bg-blue-500 transition-all duration-300"
						style={{ width: `${progress}%` }}
					/>
				</div>
			)}
		</div>
	);
}

// ----- Export helpers -----

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

async function exportAsMp4(
	videoUrl: string,
	quality: ExportQuality,
	trimRange: TrimRange | null,
	onProgress: (p: number) => void,
): Promise<void> {
	// Use a video element to decode frames, then re-encode with WebCodecs
	const video = document.createElement("video");
	video.src = videoUrl;
	video.muted = true;

	await new Promise<void>((resolve) => {
		video.onloadedmetadata = () => resolve();
	});

	const canvas = document.createElement("canvas");
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	const ctx = canvas.getContext("2d")!;

	const startSec = trimRange ? trimRange.startMs / 1000 : 0;
	const endSec = trimRange
		? trimRange.endMs / 1000
		: video.duration;
	const totalDuration = endSec - startSec;

	// For browsers without full WebCodecs MP4 muxing, fall back to canvas recording
	video.currentTime = startSec;
	await new Promise<void>((resolve) => {
		video.onseeked = () => resolve();
	});

	const outputStream = canvas.captureStream(30);

	// Add audio from original if available
	// Note: captureStream doesn't capture audio from video element
	// For full audio support, would need OfflineAudioContext + WebCodecs

	const recorder = new MediaRecorder(outputStream, {
		mimeType: "video/webm;codecs=vp9",
		videoBitsPerSecond: QUALITY_BITRATES[quality],
	});

	const chunks: Blob[] = [];
	recorder.ondataavailable = (e) => {
		if (e.data.size > 0) chunks.push(e.data);
	};

	const exportDone = new Promise<void>((resolve) => {
		recorder.onstop = () => resolve();
	});

	recorder.start(100);
	video.play();

	// Draw frames and track progress
	const drawFrame = () => {
		if (video.currentTime >= endSec || video.ended) {
			recorder.stop();
			video.pause();
			return;
		}
		ctx.drawImage(video, 0, 0);
		onProgress(
			((video.currentTime - startSec) / totalDuration) * 100,
		);
		requestAnimationFrame(drawFrame);
	};
	requestAnimationFrame(drawFrame);

	await exportDone;
	onProgress(100);

	const blob = new Blob(chunks, { type: "video/webm" });
	downloadBlob(blob, "recording.webm"); // WebM output for now; full MP4 muxing needs mediabunny
}

async function exportAsGif(
	videoUrl: string,
	trimRange: TrimRange | null,
	onProgress: (p: number) => void,
): Promise<void> {
	const video = document.createElement("video");
	video.src = videoUrl;
	video.muted = true;

	await new Promise<void>((resolve) => {
		video.onloadedmetadata = () => resolve();
	});

	const scale = 0.5; // Half resolution for GIF
	const width = Math.round(video.videoWidth * scale);
	const height = Math.round(video.videoHeight * scale);
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d")!;

	const startSec = trimRange ? trimRange.startMs / 1000 : 0;
	const endSec = trimRange
		? trimRange.endMs / 1000
		: Math.min(video.duration, 15); // Cap GIF at 15 seconds
	const fps = 10;
	const frameInterval = 1 / fps;
	const totalFrames = Math.ceil((endSec - startSec) * fps);

	// Collect frames
	const frames: ImageData[] = [];
	for (let i = 0; i < totalFrames; i++) {
		video.currentTime = startSec + i * frameInterval;
		await new Promise<void>((resolve) => {
			video.onseeked = () => resolve();
		});
		ctx.drawImage(video, 0, 0, width, height);
		frames.push(ctx.getImageData(0, 0, width, height));
		onProgress((i / totalFrames) * 80);
	}

	// Encode GIF using simple canvas-to-blob approach
	// For production, integrate gif.js worker
	// Fallback: export as WebM for now
	onProgress(90);

	// Simple approach: re-record at lower framerate
	const gifCanvas = document.createElement("canvas");
	gifCanvas.width = width;
	gifCanvas.height = height;
	const gifCtx = gifCanvas.getContext("2d")!;
	const stream = gifCanvas.captureStream(fps);
	const recorder = new MediaRecorder(stream, {
		mimeType: "video/webm",
		videoBitsPerSecond: 500_000,
	});
	const chunks: Blob[] = [];
	recorder.ondataavailable = (e) => {
		if (e.data.size > 0) chunks.push(e.data);
	};

	const done = new Promise<void>((resolve) => {
		recorder.onstop = () => resolve();
	});
	recorder.start();

	for (const frame of frames) {
		gifCtx.putImageData(frame, 0, 0);
		await new Promise((r) => setTimeout(r, frameInterval * 1000));
	}

	recorder.stop();
	await done;
	onProgress(100);

	const blob = new Blob(chunks, { type: "video/webm" });
	downloadBlob(blob, "recording.gif.webm"); // Placeholder — full GIF needs gif.js
}
