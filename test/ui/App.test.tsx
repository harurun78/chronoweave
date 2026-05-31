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

  it('keeps task editing scoped to the active domain', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Add domain' }));

    expect(screen.getByRole('tab', { name: /Domain 2/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByLabelText('WCET ms')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByLabelText('Task_4 wcet')).toBeInTheDocument();
    expect(screen.getByLabelText('WCET ms')).toHaveValue(1);
  });

  it('blocks placement save when domain is missing', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.selectOptions(screen.getByLabelText('Domain'), '');
    await user.click(screen.getByRole('button', { name: 'Save placement' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Domain is required.');
    expect(screen.getByLabelText('Name')).toHaveValue('MotorCtrl_X');
  });

  it('surfaces a Problem when imported core_index is outside domain core_count', async () => {
    const user = userEvent.setup();
    renderApp();

    const invalidCoreProject = `version: '0.3'
global:
  tick_ms: 1
  stack_presets:
    low: 512
    mid: 2048
    high: 4096
domains:
  - id: default
    name: Default RTOS
    kind: rtos
    core_count: 1
tasks:
  - id: task_a
    name: TaskA
    period_ms: 10
    wcet_ms: 1
    stack: low
    domain_id: default
    core_index: 2
`;
    const file = new File([invalidCoreProject], 'invalid-core.yaml', {
      type: 'application/x-yaml'
    });
    Object.defineProperty(file, 'text', {
      value: async () => invalidCoreProject
    });

    await user.upload(screen.getByTestId('project-file-input'), file);

    expect(
      await screen.findByText(/Core index 2 must be within 0-0/)
    ).toBeInTheDocument();
  });

  it('renders one Gantt row per core and shows per-core stack occupancy', async () => {
    const user = userEvent.setup();
    renderApp();

    const multicoreProject = `version: '0.3'
global:
  tick_ms: 1
  stack_presets:
    low: 512
    mid: 2048
    high: 4096
  ram_capacity: 65536
domains:
  - id: rtos
    name: RTOS
    kind: rtos
    core_count: 2
  - id: linux
    name: Linux
    kind: linux
    core_count: 1
tasks:
  - id: task_core0
    name: TaskCore0
    period_ms: 10
    wcet_ms: 2
    stack: low
    domain_id: rtos
    core_index: 0
  - id: task_core1
    name: TaskCore1
    period_ms: 10
    wcet_ms: 3
    stack: mid
    domain_id: rtos
    core_index: 1
`;
    const file = new File([multicoreProject], 'multicore.yaml', {
      type: 'application/x-yaml'
    });
    Object.defineProperty(file, 'text', {
      value: async () => multicoreProject
    });

    await user.upload(screen.getByTestId('project-file-input'), file);

    expect(await screen.findByTestId('gantt-core-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-core-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('memory-core-series-0')).toHaveTextContent(
      'Core 0: 512 bytes peak'
    );
    expect(screen.getByTestId('memory-core-series-1')).toHaveTextContent(
      'Core 1: 2048 bytes peak'
    );
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

    await user.click(screen.getAllByRole('button', { name: 'error' })[0]);

    expect(screen.getByLabelText('Name')).toHaveValue('SensorFusion');
  });

  it('loads Phase 2 sample and generates FreeRTOS preview', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(
      screen.getByRole('button', { name: 'Motor Control + Aperiodic' })
    );

    expect(
      screen.getByRole('heading', { name: 'Iterative RTA' })
    ).toBeInTheDocument();
    expect(screen.getByText('1 aperiodic tasks')).toBeInTheDocument();
    expect(screen.getByText('Server 75%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Generate FreeRTOS' }));

    expect(
      screen.getByRole('heading', { name: 'FreeRTOS Preview' })
    ).toBeInTheDocument();
    expect(screen.getByText('MotorDemo_tasks.c')).toBeInTheDocument();
    expect(screen.getByText(/MotorDemoSporadicServerTask/)).toBeInTheDocument();
  });

  it('imports trace CSV and displays observation Problems', async () => {
    const user = userEvent.setup();
    renderApp();

    const traceText = `task,start_ms,end_ms
ISR_Timer,0,0.05
ISR_Timer,1,1.05
MotorCtrl_X,0,3.2
MotorCtrl_X,10,13.1
SensorFusion,0,6.1
SensorFusion,24,30
ExtraMonitor,5,5.5
ExtraMonitor,15,15.5
`;
    const file = new File([traceText], 'trace.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', {
      value: async () => traceText
    });

    await user.upload(screen.getByTestId('trace-file-input'), file);

    expect(
      screen.getByRole('heading', { name: 'Observation' })
    ).toBeInTheDocument();
    expect(screen.getByText('ExtraMonitor')).toBeInTheDocument();
    expect(
      screen.getByText(/observed max execution 3.2 ms exceeds design WCET 3 ms/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/observed period 24 ms differs from design period 20 ms/)
    ).toBeInTheDocument();
  });

  it('shows invalid trace import Problems without replacing the design state', async () => {
    const user = userEvent.setup();
    renderApp();

    const traceText = `end_ms,task,start_ms
0.2,ISR_Timer,0.3
bad,MotorCtrl_X,1
`;
    const file = new File([traceText], 'invalid-trace.csv', {
      type: 'text/csv'
    });
    Object.defineProperty(file, 'text', {
      value: async () => traceText
    });

    await user.upload(screen.getByTestId('trace-file-input'), file);

    expect(
      screen.getByText(/end_ms must be greater than start_ms/)
    ).toBeInTheDocument();
    expect(screen.getByText(/non-numeric timestamps/)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Observation' })
    ).not.toBeInTheDocument();
    expect(screen.getAllByDisplayValue('MotorCtrl_X')).toHaveLength(2);
  });
});
