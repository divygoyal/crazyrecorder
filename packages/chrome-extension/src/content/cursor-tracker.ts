/**
 * Content script injected into the recorded tab.
 * Tracks mouse movement and clicks, sends data to service worker.
 * Only works for tab capture mode (not desktop capture).
 */

(() => {
	let lastSendTime = 0;
	const THROTTLE_MS = 16; // ~60fps

	function sendCursorData(
		x: number,
		y: number,
		type: "move" | "click" | "double-click" | "right-click",
	) {
		const now = performance.now();
		if (type === "move" && now - lastSendTime < THROTTLE_MS) return;
		lastSendTime = now;

		chrome.runtime.sendMessage({
			type: "cursor-telemetry",
			data: {
				x: x / window.innerWidth,
				y: y / window.innerHeight,
				timestamp: Date.now(),
				type,
			},
		});
	}

	document.addEventListener(
		"mousemove",
		(e) => sendCursorData(e.clientX, e.clientY, "move"),
		{ passive: true },
	);

	document.addEventListener("click", (e) =>
		sendCursorData(e.clientX, e.clientY, "click"),
	);

	document.addEventListener("dblclick", (e) =>
		sendCursorData(e.clientX, e.clientY, "double-click"),
	);

	document.addEventListener("contextmenu", (e) =>
		sendCursorData(e.clientX, e.clientY, "right-click"),
	);
})();
