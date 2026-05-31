import type { Problem } from '../model/project';

interface ProblemsPanelProps {
  problems: Problem[];
  onSelectTask: (taskId: string) => void;
}

export function ProblemsPanel({ problems, onSelectTask }: ProblemsPanelProps) {
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
              onClick={() => problem.task_id && onSelectTask(problem.task_id)}
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
