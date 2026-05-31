import { useMemo, useState } from 'react';

import type {
  Channel,
  ChannelTransport,
  NormalizedTaskModel
} from '../model/project';

interface ChannelPanelProps {
  channels: Channel[];
  tasks: NormalizedTaskModel[];
  onCreateChannel: (draft: {
    producer_task_id: string;
    consumer_task_id: string;
    transport: ChannelTransport;
    latency_budget_ms: number;
  }) => void;
  onDeleteChannel: (channelId: string) => void;
}

export function ChannelPanel({
  channels,
  tasks,
  onCreateChannel,
  onDeleteChannel
}: ChannelPanelProps) {
  const [producerTaskId, setProducerTaskId] = useState('');
  const [consumerTaskId, setConsumerTaskId] = useState('');
  const [transport, setTransport] = useState<ChannelTransport>('mailbox');
  const [latencyBudgetMs, setLatencyBudgetMs] = useState('1');
  const [validationError, setValidationError] = useState<string | undefined>();

  const taskNameById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task.name] as const)),
    [tasks]
  );

  function createChannel() {
    if (producerTaskId.trim() === '' || consumerTaskId.trim() === '') {
      setValidationError('Producer and consumer are required.');
      return;
    }

    const latency = Number(latencyBudgetMs);
    if (!Number.isFinite(latency) || latency <= 0) {
      setValidationError('Latency budget must be greater than 0.');
      return;
    }

    setValidationError(undefined);
    onCreateChannel({
      producer_task_id: producerTaskId,
      consumer_task_id: consumerTaskId,
      transport,
      latency_budget_ms: latency
    });
  }

  return (
    <section
      className="panel channel-panel"
      aria-labelledby="channel-panel-title"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Phase 4</p>
          <h2 id="channel-panel-title">Channels</h2>
        </div>
        <span className="count-pill">{channels.length} channels</span>
      </div>

      <div className="channel-form-grid">
        <label>
          Producer
          <select
            aria-label="Channel producer"
            value={producerTaskId}
            onChange={(event) => setProducerTaskId(event.currentTarget.value)}
          >
            <option value="">Select producer</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Consumer
          <select
            aria-label="Channel consumer"
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
        <label>
          Transport
          <select
            aria-label="Channel transport"
            value={transport}
            onChange={(event) =>
              setTransport(event.currentTarget.value as ChannelTransport)
            }
          >
            <option value="shared_memory">shared_memory</option>
            <option value="mailbox">mailbox</option>
            <option value="queue">queue</option>
          </select>
        </label>
        <label>
          Latency budget (ms)
          <input
            aria-label="Channel latency budget"
            type="number"
            min="0.01"
            step="0.01"
            value={latencyBudgetMs}
            onChange={(event) => setLatencyBudgetMs(event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="panel-actions">
        <button type="button" onClick={createChannel}>
          Add channel
        </button>
      </div>

      {validationError !== undefined ? (
        <p role="alert" className="field-error">
          {validationError}
        </p>
      ) : null}

      <ul className="channel-list">
        {channels.map((channel) => (
          <li key={channel.id}>
            <div>
              <strong>{channel.id}</strong>
              <p>
                {taskNameById.get(channel.producer_task_id) ??
                  channel.producer_task_id}{' '}
                -&gt;{' '}
                {taskNameById.get(channel.consumer_task_id) ??
                  channel.consumer_task_id}
              </p>
              <small>
                {channel.transport} · {channel.latency_budget_ms} ms
              </small>
            </div>
            <button
              type="button"
              onClick={() => onDeleteChannel(channel.id)}
              aria-label={`Delete channel ${channel.id}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
