import { useCallback, useRef } from "react";

interface TrimRange {
	startMs: number;
	endMs: number;
}

interface TimelineProps {
	duration: number;
	currentTime: number;
	trimRange: TrimRange | null;
	onSeek: (timeMs: number) => void;
	onTrimChange: (range: TrimRange | null) => void;
}

export function Timeline({
	duration,
	currentTime,
	trimRange,
	onSeek,
	onTrimChange,
}: TimelineProps) {
	const trackRef = useRef<HTMLDivElement>(null);

	const getTimeFromPosition = useCallback(
		(clientX: number): number => {
			if (!trackRef.current || duration === 0) return 0;
			const rect = trackRef.current.getBoundingClientRect();
			const ratio = Math.max(
				0,
				Math.min(1, (clientX - rect.left) / rect.width),
			);
			return ratio * duration;
		},
		[duration],
	);

	const handleTrackClick = useCallback(
		(e: React.MouseEvent) => {
			const time = getTimeFromPosition(e.clientX);
			onSeek(time);
		},
		[getTimeFromPosition, onSeek],
	);

	const handleTrimStart = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			const startX = e.clientX;

			const handleMove = (moveE: MouseEvent) => {
				const start = getTimeFromPosition(startX);
				const end = getTimeFromPosition(moveE.clientX);
				const trimStart = Math.min(start, end);
				const trimEnd = Math.max(start, end);
				if (trimEnd - trimStart > 100) {
					onTrimChange({ startMs: trimStart, endMs: trimEnd });
				}
			};

			const handleUp = () => {
				document.removeEventListener("mousemove", handleMove);
				document.removeEventListener("mouseup", handleUp);
			};

			document.addEventListener("mousemove", handleMove);
			document.addEventListener("mouseup", handleUp);
		},
		[getTimeFromPosition, onTrimChange],
	);

	const playheadPosition =
		duration > 0 ? (currentTime / duration) * 100 : 0;
	const trimStartPct = trimRange
		? (trimRange.startMs / duration) * 100
		: 0;
	const trimWidthPct = trimRange
		? ((trimRange.endMs - trimRange.startMs) / duration) * 100
		: 0;

	return (
		<div className="px-4 pb-3">
			{/* Trim controls */}
			{trimRange && (
				<div className="mb-1 flex items-center justify-between">
					<span className="text-[10px] text-slate-500">
						Trim: {formatTime(trimRange.startMs)} -{" "}
						{formatTime(trimRange.endMs)}
					</span>
					<button
						type="button"
						onClick={() => onTrimChange(null)}
						className="text-[10px] text-red-400 hover:text-red-300"
					>
						Clear trim
					</button>
				</div>
			)}

			{/* Track */}
			<div
				ref={trackRef}
				className="relative h-10 cursor-pointer rounded-lg bg-white/5 overflow-hidden"
				onClick={handleTrackClick}
				onMouseDown={handleTrimStart}
			>
				{/* Waveform placeholder */}
				<div className="absolute inset-0 flex items-center px-1">
					{Array.from({ length: 80 }, (_, i) => (
						<div
							key={i}
							className="mx-px flex-1 rounded-full bg-white/10"
							style={{
								height: `${20 + Math.sin(i * 0.7) * 15 + Math.random() * 10}%`,
							}}
						/>
					))}
				</div>

				{/* Trim region highlight */}
				{trimRange && (
					<div
						className="absolute top-0 bottom-0 bg-blue-500/20 border-x-2 border-blue-400"
						style={{
							left: `${trimStartPct}%`,
							width: `${trimWidthPct}%`,
						}}
					/>
				)}

				{/* Playhead */}
				<div
					className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg shadow-white/30 z-10"
					style={{ left: `${playheadPosition}%` }}
				>
					<div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-white" />
				</div>
			</div>
		</div>
	);
}

function formatTime(ms: number): string {
	const secs = Math.floor(ms / 1000);
	const mm = String(Math.floor(secs / 60)).padStart(2, "0");
	const ss = String(secs % 60).padStart(2, "0");
	return `${mm}:${ss}`;
}
