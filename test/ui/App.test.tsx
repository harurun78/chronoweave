import { render, screen } from '@testing-library/react';
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

describe('App shell', () => {
  it('renders the Phase 1 workspace panels', () => {
    renderApp();

    expect(
      screen.getByRole('heading', { name: 'Chronoweave' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Task List' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gantt' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Property Panel' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Problems' })
    ).toBeInTheDocument();
  });

  it('duplicates MotorCtrl_X and updates derived panels', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Duplicate' }));

    expect(screen.getAllByDisplayValue('MotorCtrl_Y')).toHaveLength(2);
    expect(screen.getByText(/Aperiodic capacity reference/)).toHaveTextContent(
      '0.95 ms'
    );
  });

  it('imports invalid YAML as Problems without replacing current state', async () => {
    const user = userEvent.setup();
    renderApp();

    const file = new File(['not a project file'], 'broken.yaml', {
      type: 'application/x-yaml'
    });
    Object.defineProperty(file, 'text', {
      value: async () => 'not a project file'
    });
    await user.upload(screen.getByTestId('project-file-input'), file);

    expect(
      await screen.findByText(/Required|Expected object|global/)
    ).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('MotorCtrl_X')).toHaveLength(2);
  });

  it('updates task list and property panel fields through ProjectState', async () => {
    const user = userEvent.setup();
    renderApp();

    const wcetInput = screen.getByLabelText('MotorCtrl_X wcet');
    await user.clear(wcetInput);
    await user.type(wcetInput, '4');

    expect(screen.getByLabelText('WCET ms')).toHaveValue(4);

    await user.click(screen.getByLabelText('SensorFusion name'));
    const propertyNameInput = screen.getByLabelText('Name');
    await user.clear(propertyNameInput);
    await user.type(propertyNameInput, 'SensorFusionFast');

    expect(screen.getByLabelText('SensorFusionFast name')).toBeInTheDocument();
  });

  it('focuses the related task when a Problem is clicked', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByLabelText('SensorFusion name'));
    const deadlineInput = screen.getByLabelText('Deadline ms');
    await user.clear(deadlineInput);
    await user.type(deadlineInput, '1');

    await user.click(screen.getByLabelText('ISR_Timer name'));
    expect(screen.getByLabelText('Name')).toHaveValue('ISR_Timer');

    await user.click(screen.getByRole('button', { name: 'error' }));

    expect(screen.getByLabelText('Name')).toHaveValue('SensorFusion');
  });
});
