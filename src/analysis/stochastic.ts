import type {
  NormalizedAperiodicTaskModel,
  NormalizedTaskModel,
  Problem,
  StochasticEventAnalysis,
  StochasticEventSource
} from '../model/project';

export interface StochasticAdapterResult {
  syntheticAperiodicTasks: NormalizedAperiodicTaskModel[];
  analyses: StochasticEventAnalysis[];
  problems: Problem[];
}

export function stochasticToAperiodic(
  events: StochasticEventSource[],
  tasks: NormalizedTaskModel[]
): StochasticAdapterResult {
  const taskById = new Map(tasks.map((task) => [task.id, task] as const));
  const syntheticAperiodicTasks: NormalizedAperiodicTaskModel[] = [];
  const analyses: StochasticEventAnalysis[] = [];
  const problems: Problem[] = [];

  events.forEach((event) => {
    const consumer = taskById.get(event.consumer_task_id);
    if (consumer === undefined) {
      problems.push({
        id: `analysis-stochastic-${event.id}-missing-consumer`,
        level: 'error',
        message: `Stochastic event '${event.id}' references missing consumer task '${event.consumer_task_id}'.`,
        source: 'analysis'
      });
      return;
    }

    syntheticAperiodicTasks.push({
      id: `stochastic-${event.id}`,
      name: `${event.name} -> ${consumer.name}`,
      wcet_ms: consumer.wcet_ms,
      deadline_ms: consumer.deadline_ms,
      stack: consumer.stack,
      domain_id: consumer.domain_id,
      description: `Synthetic aperiodic load adapted from Linux stochastic event '${event.id}'.`
    });

    analyses.push({
      event_id: event.id,
      consumer_task_id: consumer.id,
      synthetic_min_interarrival_ms: event.mean_interarrival_ms
    });

    problems.push({
      id: `analysis-stochastic-${event.id}-mean-as-min-interarrival`,
      level: 'info',
      message: `${consumer.name}: aperiodic load synthesized from Linux event '${event.id}' (mean_interarrival used as min_interarrival).`,
      task_id: consumer.id,
      domain_id: consumer.domain_id,
      source: 'analysis'
    });
  });

  return {
    syntheticAperiodicTasks,
    analyses,
    problems
  };
}
