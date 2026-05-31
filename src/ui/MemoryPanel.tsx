import type { AnalysisSnapshot } from '../model/project';

interface MemoryPanelProps {
  analysisSnapshot: AnalysisSnapshot;
}

export function MemoryPanel({ analysisSnapshot }: MemoryPanelProps) {
  const profile = analysisSnapshot.memory_profile;
  const maxBytes = Math.max(profile.capacity_bytes ?? 0, profile.peak_bytes, 1);
  const bars = profile.series.slice(0, 24);

  return (
    <article className="panel metric-panel">
      <p className="eyebrow">Memory</p>
      <h2>Profile</h2>
      <div className="memory-wave" aria-label="Memory profile waveform">
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
    </article>
  );
}
