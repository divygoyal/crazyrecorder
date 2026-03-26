import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRecording } from "@ext/storage/db";
import { ExportPanel } from "./ExportPanel";
import { Timeline } from "./Timeline";

interface TrimRange {
	startMs: number;
	endMs: number;
}

export function Editor() {
	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [trimRange, setTrimRange] = useState<TrimRange | null>(null);
	const [showExport, setShowExport] = useState(false);
	const [recordingId, setRecordingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	// Load recording from IndexedDB
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const id = params.get("id");
		if (!id) {
			setError("No recording ID specified");
			return;
		}
		setRecordingId(id);

		getRecording(id).then((entry) => {
			if (!entry) {
				setError("Recording not found");
				return;
			}
			const url = URL.createObjectURL(entry.blob);
			setVideoUrl(url);
			setDuration(entry.duration);
		});

		return () => {
			if (videoUrl) URL.revokeObjectURL(videoUrl);
		};
	}, []);

	const handleLoadedMetadata = useCallback(() => {
		if (videoRef.current) {
			setDuration(videoRef.current.duration * 1000);
		}
	}, []);

	const handleTimeUpdate = useCallback(() => {
		if (videoRef.current) {
			setCurrentTime(videoRef.current.currentTime * 1000);
		}
	}, []);

	const togglePlayback = useCallback(() => {
		if (!videoRef.current) return;
		if (isPlaying) {
			videoRef.current.pause();
		} else {
			videoRef.current.play();
		}
		setIsPlaying(!isPlaying);
	}, [isPlaying]);

	const seek = useCallback(
		(timeMs: number) => {
			if (!videoRef.current) return;
			videoRef.current.currentTime = timeMs / 1000;
			setCurrentTime(timeMs);
		},
		[],
	);

	const formattedTime = useMemo(() => {
		const secs = Math.floor(currentTime / 1000);
		const mm = String(Math.floor(secs / 60)).padStart(2, "0");
		const ss = String(secs % 60).padStart(2, "0");
		return `${mm}:${ss}`;
	}, [currentTime]);

	const formattedDuration = useMemo(() => {
		const secs = Math.floor(duration / 1000);
		const mm = String(Math.floor(secs / 60)).padStart(2, "0");
		const ss = String(secs % 60).padStart(2, "0");
		return `${mm}:${ss}`;
	}, [duration]);

	if (error) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-center">
					<h2 className="text-lg font-semibold text-white mb-2">
						Error
					</h2>
					<p className="text-sm text-slate-400">{error}</p>
				</div>
			</div>
		);
	}

	if (!videoUrl) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-sm text-slate-400">
					Loading recording...
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen flex-col bg-[#0a0a0a]">
			{/* Header */}
			<header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
				<div>
					<h1 className="text-sm font-semibold text-white">
						YourBrand Editor
					</h1>
					<span className="text-xs text-slate-500">
						{formattedTime} / {formattedDuration}
					</span>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setShowExport(!showExport)}
						className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
					>
						Export
					</button>
				</div>
			</header>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden">
				{/* Video preview */}
				<div className="flex flex-1 items-center justify-center bg-black p-4">
					<video
						ref={videoRef}
						src={videoUrl}
						className="max-h-full max-w-full rounded-lg shadow-2xl"
						onLoadedMetadata={handleLoadedMetadata}
						onTimeUpdate={handleTimeUpdate}
						onEnded={() => setIsPlaying(false)}
						onClick={togglePlayback}
					/>
				</div>

				{/* Export panel (slide-in) */}
				{showExport && recordingId && (
					<ExportPanel
						recordingId={recordingId}
						videoUrl={videoUrl}
						trimRange={trimRange}
						onClose={() => setShowExport(false)}
					/>
				)}
			</div>

			{/* Timeline and controls */}
			<div className="border-t border-white/10 bg-[#111]">
				{/* Playback controls */}
				<div className="flex items-center gap-3 px-4 py-2">
					<button
						type="button"
						onClick={togglePlayback}
						className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
					>
						{isPlaying ? (
							<svg
								width="14"
								height="14"
								viewBox="0 0 14 14"
								fill="currentColor"
							>
								<rect x="2" y="1" width="4" height="12" rx="1" />
								<rect x="8" y="1" width="4" height="12" rx="1" />
							</svg>
						) : (
							<svg
								width="14"
								height="14"
								viewBox="0 0 14 14"
								fill="currentColor"
							>
								<path d="M3 1.5v11l9-5.5L3 1.5z" />
							</svg>
						)}
					</button>

					<span className="font-mono text-xs text-slate-400">
						{formattedTime}
					</span>
				</div>

				{/* Timeline */}
				<Timeline
					duration={duration}
					currentTime={currentTime}
					trimRange={trimRange}
					onSeek={seek}
					onTrimChange={setTrimRange}
				/>
			</div>
		</div>
	);
}
