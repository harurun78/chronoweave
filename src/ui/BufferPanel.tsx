import type { NormalizedTaskModel, TaskAnalysis } from '../model/project';
import { messages } from '../i18n/messages.en';

interface BufferPanelProps {
  analyses: TaskAnalysis[];
  tasks: NormalizedTaskModel[];
}

export function BufferPanel({ analyses, tasks }: BufferPanelProps) {
  const lowestRemaining = Math.min(
    ...analyses.map((analysis) => analysis.buffer_remaining_ms)
  );
  return (
    <article className="panel metric-panel">
      <p className="eyebrow">{messages.panels.buffer.eyebrow}</p>
      <h2>Gauges</h2>
      <div className="gauge-list">
        {analyses.map((analysis) => {
          const task = tasks.find(
            (candidate) => candidate.id === analysis.task_id
          );
          const percent =
            task === undefined
              ? 0
              : Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      (analysis.buffer_remaining_ms / task.period_ms) * 100
                    )
                  )
                );
          return (
            <div className="mini-gauge" key={analysis.task_id}>
              <span>{task?.name ?? analysis.task_id}</span>
              <div className="gauge">
                <span style={{ width: `${percent}%` }} />
              </div>
              <strong>{analysis.buffer_remaining_ms} ms</strong>
            </div>
          );
        })}
      </div>
      <strong>
        Aperiodic capacity reference:{' '}
        {Number.isFinite(lowestRemaining) ? lowestRemaining : 0} ms
      </strong>
    </article>
  );
}
