import './App.css';

const taskRows = [
  { name: 'ISR_Timer', period: '1 ms', wcet: '0.05 ms', stack: 'low' },
  { name: 'MotorCtrl_X', period: '10 ms', wcet: '3 ms', stack: 'mid' },
  { name: 'SensorFusion', period: '20 ms', wcet: '4 ms', stack: 'high' }
];

const problemRows = [
  { level: 'Info', message: 'Approximate RTA may be optimistic in Phase 1.' },
  {
    level: 'Ready',
    message: 'ProjectFile v0.1 shell is waiting for schema wiring.'
  }
];

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">RTOS Task Design Kernel</p>
          <h1>Chronoweave</h1>
        </div>
        <div className="header-actions" aria-label="Project actions">
          <button type="button">Motor Control 1-axis</button>
          <button type="button">Import</button>
          <button type="button">Export</button>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel task-panel" aria-labelledby="task-list-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ProjectState</p>
              <h2 id="task-list-title">Task List</h2>
            </div>
            <span className="count-pill">3 tasks</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Period</th>
                <th>WCET</th>
                <th>Stack</th>
              </tr>
            </thead>
            <tbody>
              {taskRows.map((task) => (
                <tr key={task.name}>
                  <td>{task.name}</td>
                  <td>{task.period}</td>
                  <td>{task.wcet}</td>
                  <td>{task.stack}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="center-stack" aria-label="Analysis workspace">
          <section className="panel gantt-panel" aria-labelledby="gantt-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">AnalysisSnapshot</p>
                <h2 id="gantt-title">Gantt</h2>
              </div>
              <span className="count-pill">LCM 20 ms</span>
            </div>
            <div
              className="gantt-preview"
              aria-label="Periodic task timeline preview"
            >
              {taskRows.map((task, index) => (
                <div className="timeline-row" key={task.name}>
                  <span>{task.name}</span>
                  <div className="timeline-track">
                    <div
                      className="timeline-bar"
                      style={{
                        width: `${Math.max(8, Number.parseFloat(task.wcet) * 14)}%`,
                        marginLeft: `${index * 6}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="metric-grid" aria-label="Derived panels">
            <article className="panel metric-panel">
              <p className="eyebrow">Buffer</p>
              <h2>Gauges</h2>
              <div className="gauge">
                <span style={{ width: '68%' }} />
              </div>
              <strong>68% remaining</strong>
            </article>
            <article className="panel metric-panel">
              <p className="eyebrow">Memory</p>
              <h2>Profile</h2>
              <div className="memory-wave" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <strong>6.5 KB peak</strong>
            </article>
          </section>

          <section
            className="panel problems-panel"
            aria-labelledby="problems-title"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Validation</p>
                <h2 id="problems-title">Problems</h2>
              </div>
            </div>
            <ul>
              {problemRows.map((problem) => (
                <li key={problem.message}>
                  <span>{problem.level}</span>
                  {problem.message}
                </li>
              ))}
            </ul>
          </section>
        </section>

        <aside
          className="panel property-panel"
          aria-labelledby="property-title"
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Selection</p>
              <h2 id="property-title">Property Panel</h2>
            </div>
          </div>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>MotorCtrl_X</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>RMA auto</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>10 ms</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>Axis control task placeholder</dd>
            </div>
          </dl>
        </aside>
      </main>
    </div>
  );
}
