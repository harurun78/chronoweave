import type { AnalysisSnapshot, ProjectState } from '../model/project';
import { messages } from '../i18n/messages.en';

interface PhaseTwoPanelProps {
  analysisSnapshot: AnalysisSnapshot;
  projectState: ProjectState;
}

export function PhaseTwoPanel({
  analysisSnapshot,
  projectState
}: PhaseTwoPanelProps) {
  const server = analysisSnapshot.sporadic_server;

  return (
    <article className="panel metric-panel phase-two-panel">
      <p className="eyebrow">{messages.panels.phase.phaseTwo}</p>
      <h2>Iterative RTA</h2>
      <div className="analysis-list">
        {analysisSnapshot.tasks.map((taskAnalysis) => {
          const task = projectState.tasks.find(
            (candidate) => candidate.id === taskAnalysis.task_id
          );
          return (
            <div key={taskAnalysis.task_id}>
              <span>{task?.name ?? taskAnalysis.task_id}</span>
              <strong>{taskAnalysis.iterative_response_time_ms} ms</strong>
            </div>
          );
        })}
      </div>
      <div className="server-summary">
        <span>{projectState.aperiodic_tasks.length} aperiodic tasks</span>
        <strong>
          Server{' '}
          {server?.enabled === true
            ? `${server.capacity_utilization_percent}%`
            : 'off'}
        </strong>
      </div>
    </article>
  );
}
