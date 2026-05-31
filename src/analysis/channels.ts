import type {
  ChannelAnalysis,
  NormalizedTaskModel,
  Problem,
  ProjectState
} from '../model/project';

interface ChannelValidationResult {
  channels: ChannelAnalysis[];
  problems: Problem[];
}

export function validateChannels(
  projectState: Pick<ProjectState, 'channels' | 'tasks'>
): ChannelValidationResult {
  const taskById = new Map(
    projectState.tasks.map((task) => [task.id, task] as const)
  );

  const channels = projectState.channels.map((channel) => ({
    channel_id: channel.id,
    valid: true,
    latency_budget_ms: channel.latency_budget_ms
  }));

  const problems = projectState.channels.flatMap((channel, index) => {
    const producer = taskById.get(channel.producer_task_id);
    const consumer = taskById.get(channel.consumer_task_id);
    const channelProblems = createChannelReferenceProblems(
      channel.id,
      producer,
      consumer,
      channel.producer_task_id,
      channel.consumer_task_id
    );

    if (
      producer !== undefined &&
      consumer !== undefined &&
      producer.domain_id === consumer.domain_id
    ) {
      channelProblems.push({
        id: `analysis-channel-${channel.id}-same-domain`,
        level: 'warning',
        message: `Channel ${channel.id}: producer and consumer are both in domain ${producer.domain_id}.`,
        source: 'analysis'
      });
    }

    if (channelProblems.some((problem) => problem.level === 'error')) {
      channels[index].valid = false;
    }

    return channelProblems;
  });

  return {
    channels,
    problems
  };
}

function createChannelReferenceProblems(
  channelId: string,
  producer: NormalizedTaskModel | undefined,
  consumer: NormalizedTaskModel | undefined,
  producerTaskId: string,
  consumerTaskId: string
): Problem[] {
  const problems: Problem[] = [];

  if (producer === undefined) {
    problems.push({
      id: `analysis-channel-${channelId}-missing-producer`,
      level: 'error',
      message: `Channel ${channelId}: producer task ${producerTaskId} does not exist.`,
      source: 'analysis'
    });
  }

  if (consumer === undefined) {
    problems.push({
      id: `analysis-channel-${channelId}-missing-consumer`,
      level: 'error',
      message: `Channel ${channelId}: consumer task ${consumerTaskId} does not exist.`,
      source: 'analysis'
    });
  }

  return problems;
}
