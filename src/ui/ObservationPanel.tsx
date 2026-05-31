import type { TaskObservationComparison } from '../trace/types';
import { formatOptionalMs } from './formatters';
import { messages } from '../i18n/messages.en';

interface ObservationPanelProps {
  comparisons: TaskObservationComparison[];
}

export function ObservationPanel({ comparisons }: ObservationPanelProps) {
  if (comparisons.length === 0) {
    return null;
  }

  return (
    <section
      className="panel observation-panel"
      aria-labelledby="observation-title"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Trace</p>
          <h2 id="observation-title">{messages.panels.observation.title}</h2>
        </div>
        <span className="count-pill">{comparisons.length} rows</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Design P</th>
            <th>Observed P</th>
            <th>Design WCET</th>
            <th>Observed Max</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((comparison) => (
            <tr key={`${comparison.task_name}-${comparison.status}`}>
              <td>{comparison.task_name}</td>
              <td>{comparison.status}</td>
              <td>{formatOptionalMs(comparison.design_period_ms)}</td>
              <td>{formatOptionalMs(comparison.observed_period_ms)}</td>
              <td>{formatOptionalMs(comparison.design_wcet_ms)}</td>
              <td>{formatOptionalMs(comparison.observed_max_execution_ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
