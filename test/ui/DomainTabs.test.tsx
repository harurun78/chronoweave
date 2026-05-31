import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import { createStore } from 'jotai/vanilla';

import { DomainTabs } from '../../src/ui/DomainTabs';
import {
  activeDomainIdAtom,
  projectHistoryAtom,
  projectStateAtom
} from '../../src/state/projectState';

function renderDomainTabs() {
  const store = createStore();
  const view = render(
    <Provider store={store}>
      <DomainTabs />
    </Provider>
  );

  return { store, ...view };
}

describe('DomainTabs', () => {
  it('creates, selects, and deletes domains through ProjectState', async () => {
    const user = userEvent.setup();
    const { store } = renderDomainTabs();

    expect(screen.getByRole('tab', { name: /Default RTOS/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await user.click(screen.getByRole('button', { name: 'Add domain' }));

    expect(
      store.get(projectStateAtom).domains.map((domain) => domain.id)
    ).toEqual(['default', 'domain-2']);
    expect(store.get(activeDomainIdAtom)).toBe('domain-2');
    expect(screen.getByRole('tab', { name: /Domain 2/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await user.click(screen.getByRole('tab', { name: /Default RTOS/ }));

    expect(store.get(activeDomainIdAtom)).toBe('default');
    expect(store.get(projectStateAtom).selectedTaskId).toBe('isr-timer');
    expect(store.get(projectHistoryAtom).past).toHaveLength(1);

    await user.click(screen.getByRole('tab', { name: /Domain 2/ }));
    expect(store.get(projectHistoryAtom).past).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Delete domain' }));

    expect(
      store.get(projectStateAtom).domains.map((domain) => domain.id)
    ).toEqual(['default']);
    expect(store.get(activeDomainIdAtom)).toBe('default');
    expect(
      store
        .get(projectStateAtom)
        .tasks.every((task) => task.domain_id === 'default')
    ).toBe(true);
  });
});
