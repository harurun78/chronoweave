import type { Problem } from '../model/project';

interface ProblemsPanelProps {
  problems: Problem[];
  onSelectTask: (taskId: string) => void;
  onFocusProperty?: () => void;
}

export function ProblemsPanel({
  problems,
  onSelectTask,
  onFocusProperty
}: ProblemsPanelProps) {
  return (
    <section className="panel problems-panel" aria-labelledby="problems-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Validation</p>
          <h2 id="problems-title">Problems</h2>
        </div>
      </div>
      <ul>
        {problems.map((problem) => (
          <li className={`problem-${problem.level}`} key={problem.id}>
            <button
              type="button"
              disabled={problem.task_id === undefined}
              onClick={() => {
                if (problem.task_id === undefined) {
                  return;
                }
                onSelectTask(problem.task_id);
                onFocusProperty?.();
              }}
            >
              {problem.level}
            </button>
            {problem.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
