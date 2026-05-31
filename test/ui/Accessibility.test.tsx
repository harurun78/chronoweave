import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import { createStore } from 'jotai/vanilla';

import { App } from '../../src/app/App';

function renderApp() {
  return render(
    <Provider store={createStore()}>
      <App />
    </Provider>
  );
}

describe('Gantt WCET handle a11y', () => {
  it('exposes slider semantics on the WCET handle', () => {
    renderApp();

    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
    const first = sliders[0]!;
    expect(first).toHaveAttribute('aria-valuemin');
    expect(first).toHaveAttribute('aria-valuemax');
    expect(first).toHaveAttribute('aria-valuenow');
    expect(first.getAttribute('aria-label')).toMatch(/WCET handle for /);
    expect(first).toHaveAttribute('tabindex', '0');
  });

  it('updates aria-valuenow when ArrowRight / ArrowLeft is pressed', async () => {
    renderApp();

    const slider = screen.getAllByRole('slider')[0]!;
    const initial = Number(slider.getAttribute('aria-valuenow'));
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    const afterRight = Number(
      screen.getAllByRole('slider')[0]!.getAttribute('aria-valuenow')
    );
    expect(afterRight).toBeGreaterThan(initial);
    fireEvent.keyDown(screen.getAllByRole('slider')[0]!, {
      key: 'ArrowLeft'
    });
    const afterLeft = Number(
      screen.getAllByRole('slider')[0]!.getAttribute('aria-valuenow')
    );
    expect(afterLeft).toBeCloseTo(initial, 5);
  });
});

describe('Problems → Property focus move', () => {
  it('moves focus to Property Panel name input when a problem is activated', async () => {
    const user = userEvent.setup();
    renderApp();

    // Drive WCET above period via the Property Panel WCET input to force an
    // unschedulable result and surface an actionable problem entry.
    const propertyAside = screen
      .getByRole('heading', { name: 'Property Panel' })
      .closest('aside') as HTMLElement;
    const wcetInput = propertyAside.querySelectorAll(
      'input'
    )[2] as HTMLInputElement;
    fireEvent.change(wcetInput, { target: { value: '99' } });

    const problemButtons = await screen.findAllByRole('button', {
      name: /error|warn|info/i
    });
    const actionable = problemButtons.find(
      (button) => !(button as HTMLButtonElement).disabled
    );
    expect(actionable).toBeDefined();
    await user.click(actionable!);

    const nameInput = propertyAside.querySelector('input');
    expect(nameInput).not.toBeNull();
    expect(document.activeElement).toBe(nameInput);
  });
});
