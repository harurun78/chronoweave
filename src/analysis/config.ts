/**
 * Centralized warning thresholds and analysis tuning constants.
 * Adjust these to retune analysis sensitivity without touching the engines themselves.
 */

/** Buffer fill ratio at or below which a buffer-low warning is emitted (default: 10%). */
export const BUFFER_WARNING_RATIO = 0.1;

/** RAM occupancy ratio at or above which a memory-high warning is emitted (default: 90%). */
export const RAM_WARNING_RATIO = 0.9;

/** Maximum iterations of the iterative response-time analysis fixed-point loop. */
export const ITERATIVE_RTA_MAX_ITERATIONS = 50;

/** LCM tick count above which the scheduling window is flagged as oversized. */
export const LCM_TICK_WARNING_THRESHOLD = 10_000;
