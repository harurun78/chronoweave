import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import type { Domain } from '../model/project';
import {
  activeDomainIdAtom,
  projectStateAtom,
  updateProjectStateAtom
} from '../state/projectState';

function createNextDomain(domains: Domain[]): Domain {
  let index = domains.length + 1;
  let id = `domain-${index}`;

  while (domains.some((domain) => domain.id === id)) {
    index += 1;
    id = `domain-${index}`;
  }

  return {
    id,
    name: `Domain ${index}`,
    kind: 'rtos',
    core_count: 1
  };
}

export function DomainTabs() {
  const projectState = useAtomValue(projectStateAtom);
  const [activeDomainId, setActiveDomainId] = useAtom(activeDomainIdAtom);
  const setProjectState = useSetAtom(projectStateAtom);
  const updateProjectState = useSetAtom(updateProjectStateAtom);

  function selectDomain(domainId: string) {
    setActiveDomainId(domainId);
    setProjectState((current) => ({
      ...current,
      selectedTaskId:
        current.tasks.find((task) => task.domain_id === domainId)?.id ??
        current.selectedTaskId
    }));
  }

  function addDomain() {
    const domain = createNextDomain(projectState.domains);
    setActiveDomainId(domain.id);
    updateProjectState((current) => ({
      ...current,
      version: '0.3',
      domains: [...current.domains, domain],
      selectedTaskId:
        current.tasks.find((task) => task.domain_id === domain.id)?.id ??
        current.selectedTaskId
    }));
  }

  function deleteActiveDomain() {
    if (projectState.domains.length <= 1) {
      return;
    }

    const domainToDelete = activeDomainId;
    const fallbackDomain =
      projectState.domains.find((domain) => domain.id !== domainToDelete) ??
      projectState.domains[0];

    if (fallbackDomain === undefined) {
      return;
    }

    setActiveDomainId(fallbackDomain.id);
    updateProjectState((current) => {
      const sporadicServer = current.sporadic_server;
      const domains = current.domains.filter(
        (domain) => domain.id !== domainToDelete
      );
      const tasks = current.tasks.map((task) =>
        task.domain_id === domainToDelete
          ? { ...task, domain_id: fallbackDomain.id }
          : task
      );

      return {
        ...current,
        domains,
        tasks,
        aperiodic_tasks: current.aperiodic_tasks.map((task) =>
          task.domain_id === domainToDelete
            ? { ...task, domain_id: fallbackDomain.id }
            : task
        ),
        sporadic_server:
          sporadicServer === undefined
            ? undefined
            : sporadicServer.domain_id === domainToDelete
              ? { ...sporadicServer, domain_id: fallbackDomain.id }
              : sporadicServer,
        stochastic_events: current.stochastic_events.map((event) =>
          event.domain_id === domainToDelete
            ? { ...event, domain_id: fallbackDomain.id }
            : event
        ),
        selectedTaskId:
          tasks.find((task) => task.domain_id === fallbackDomain.id)?.id ??
          current.selectedTaskId
      };
    });
  }

  return (
    <div className="domain-tabs" aria-label="Execution domains">
      <div className="domain-tab-list" role="tablist" aria-label="Domains">
        {projectState.domains.map((domain) => (
          <button
            key={domain.id}
            type="button"
            role="tab"
            aria-selected={domain.id === activeDomainId}
            className="domain-tab"
            onClick={() => selectDomain(domain.id)}
          >
            <span>{domain.name}</span>
            <small>
              {domain.kind} · {domain.core_count}c
            </small>
          </button>
        ))}
      </div>
      <div className="domain-tab-actions">
        <button type="button" onClick={addDomain}>
          Add domain
        </button>
        <button
          type="button"
          onClick={deleteActiveDomain}
          disabled={projectState.domains.length <= 1}
        >
          Delete domain
        </button>
      </div>
    </div>
  );
}
