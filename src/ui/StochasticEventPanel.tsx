import { useMemo, useState } from 'react';

import type {
  Domain,
  NormalizedTaskModel,
  StochasticEventSource
} from '../model/project';

interface StochasticEventPanelProps {
  domains: Domain[];
  events: StochasticEventSource[];
  tasks: NormalizedTaskModel[];
  onCreateEvent: (draft: {
    name: string;
    domain_id: string;
    mean_interarrival_ms: number;
    std_dev_ms?: number;
    consumer_task_id: string;
  }) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function StochasticEventPanel({
  domains,
  events,
  tasks,
  onCreateEvent,
  onDeleteEvent
}: StochasticEventPanelProps) {
  const [name, setName] = useState('');
  const [domainId, setDomainId] = useState('');
  const [meanInterarrivalMs, setMeanInterarrivalMs] = useState('50');
  const [stdDevMs, setStdDevMs] = useState('');
  const [consumerTaskId, setConsumerTaskId] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  const domainById = useMemo(
    () => new Map(domains.map((domain) => [domain.id, domain] as const)),
    [domains]
  );
  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task] as const)),
    [tasks]
  );

  function createEvent() {
    if (
      name.trim() === '' ||
      domainId.trim() === '' ||
      consumerTaskId.trim() === ''
    ) {
      setValidationError('Name, source domain, and consumer are required.');
      return;
    }

    const sourceDomain = domainById.get(domainId);
    if (sourceDomain?.kind !== 'linux') {
      setValidationError('Source domain must be linux.');
      return;
    }

    const consumer = taskById.get(consumerTaskId);
    if (consumer === undefined) {
      setValidationError('Consumer task does not exist.');
      return;
    }

    const consumerDomain = domainById.get(consumer.domain_id);
    if (consumerDomain?.kind === 'linux') {
      setValidationError('Consumer task must belong to a non-linux domain.');
      return;
    }

    const mean = Number(meanInterarrivalMs);
    if (!Number.isFinite(mean) || mean <= 0) {
      setValidationError('Mean inter-arrival must be greater than 0.');
      return;
    }

    const stdDev =
      stdDevMs.trim() === '' ? undefined : Number.parseFloat(stdDevMs);
    if (stdDev !== undefined && (!Number.isFinite(stdDev) || stdDev < 0)) {
      setValidationError('Std dev must be 0 or greater when provided.');
      return;
    }

    setValidationError(undefined);
    onCreateEvent({
      name: name.trim(),
      domain_id: domainId,
      mean_interarrival_ms: mean,
      std_dev_ms: stdDev,
      consumer_task_id: consumerTaskId
    });
  }

  return (
    <section className="panel channel-panel" aria-labelledby="stochastic-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Phase 4</p>
          <h2 id="stochastic-title">Stochastic Events</h2>
        </div>
        <span className="count-pill">{events.length} events</span>
      </div>

      <div className="channel-form-grid">
        <label>
          Event name
          <input
            aria-label="Stochastic event name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <label>
          Linux source domain
          <select
            aria-label="Stochastic source domain"
            value={domainId}
            onChange={(event) => setDomainId(event.currentTarget.value)}
          >
            <option value="">Select linux domain</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mean inter-arrival (ms)
          <input
            aria-label="Stochastic mean inter-arrival"
            type="number"
            min="0.01"
            step="0.01"
            value={meanInterarrivalMs}
            onChange={(event) =>
              setMeanInterarrivalMs(event.currentTarget.value)
            }
          />
        </label>
        <label>
          Std dev (ms)
          <input
            aria-label="Stochastic std dev"
            type="number"
            min="0"
            step="0.01"
            value={stdDevMs}
            onChange={(event) => setStdDevMs(event.currentTarget.value)}
          />
        </label>
        <label>
          Consumer task
          <select
            aria-label="Stochastic consumer task"
            value={consumerTaskId}
            onChange={(event) => setConsumerTaskId(event.currentTarget.value)}
          >
            <option value="">Select consumer</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="panel-actions">
        <button type="button" onClick={createEvent}>
          Add stochastic event
        </button>
      </div>

      {validationError !== undefined ? (
        <p role="alert" className="field-error">
          {validationError}
        </p>
      ) : null}

      <ul className="channel-list">
        {events.map((event) => (
          <li key={event.id}>
            <div>
              <strong>{event.id}</strong>
              <p>{event.name}</p>
              <small>
                mean {event.mean_interarrival_ms} ms · consumer{' '}
                {taskById.get(event.consumer_task_id)?.name ??
                  event.consumer_task_id}
              </small>
            </div>
            <button
              type="button"
              onClick={() => onDeleteEvent(event.id)}
              aria-label={`Delete stochastic event ${event.id}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
