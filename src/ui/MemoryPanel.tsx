import type { AnalysisSnapshot, DomainAnalysis } from '../model/project';
import { messages } from '../i18n/messages.en';

interface MemoryPanelProps {
  analysisSnapshot: AnalysisSnapshot;
  activeDomainAnalysis?: DomainAnalysis;
}

export function MemoryPanel({
  analysisSnapshot,
  activeDomainAnalysis
}: MemoryPanelProps) {
  const profile = analysisSnapshot.memory_profile;
  const maxBytes = Math.max(profile.capacity_bytes ?? 0, profile.peak_bytes, 1);
  const bars = profile.series.slice(0, 24);
  const coreSeries =
    activeDomainAnalysis?.cores.filter(
      (core) => core.stack_occupancy_series !== undefined
    ) ?? [];

  return (
    <article className="panel metric-panel">
      <p className="eyebrow">{messages.panels.memory.eyebrow}</p>
      <h2>Profile</h2>
      <div
        className="memory-wave"
        aria-label={messages.panels.memory.waveformLabel}
      >
        {bars.map((bytes, index) => (
          <span
            key={`${bytes}-${index}`}
            style={{ height: `${Math.max(6, (bytes / maxBytes) * 100)}%` }}
          />
        ))}
      </div>
      <strong>{profile.peak_bytes} bytes peak</strong>
      {profile.capacity_bytes !== undefined ? (
        <p>{profile.capacity_bytes} bytes capacity</p>
      ) : null}
      {coreSeries.length > 0 ? (
        <div className="memory-core-list">
          <p className="eyebrow">Per-core occupancy</p>
          <ul>
            {coreSeries.map((core) => (
              <li
                key={core.core_index}
                data-testid={`memory-core-series-${core.core_index}`}
              >
                Core {core.core_index}: {core.stack_peak_bytes ?? 0} bytes peak
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
