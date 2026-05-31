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

describe('ChannelPanel', () => {
  it('creates and deletes channels from ProjectState', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.selectOptions(screen.getByLabelText('Channel producer'), [
      'motorctrl-x'
    ]);
    await user.selectOptions(screen.getByLabelText('Channel consumer'), [
      'sensor-fusion'
    ]);
    await user.selectOptions(screen.getByLabelText('Channel transport'), [
      'queue'
    ]);
    await user.clear(screen.getByLabelText('Channel latency budget'));
    await user.type(screen.getByLabelText('Channel latency budget'), '2.5');

    await user.click(screen.getByRole('button', { name: 'Add channel' }));

    expect(screen.getByText('channel-1')).toBeInTheDocument();
    expect(
      screen.getByText(/MotorCtrl_X\s*->\s*SensorFusion/)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Delete channel channel-1' })
    );

    expect(screen.queryByText('channel-1')).not.toBeInTheDocument();
  });

  it('surfaces validation errors for incomplete channel drafts', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Add channel' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Producer and consumer are required.'
    );
  });

  it('creates and deletes stochastic events from ProjectState', async () => {
    const user = userEvent.setup();
    renderApp();

    const stochasticProject = `version: '0.3'
global:
  tick_ms: 1
  stack_presets:
    low: 512
    mid: 2048
    high: 4096
domains:
  - id: rtos
    name: RTOS
    kind: rtos
    core_count: 1
  - id: linux
    name: Linux
    kind: linux
    core_count: 1
tasks:
  - id: consumer
    name: Consumer
    period_ms: 20
    wcet_ms: 2
    stack: low
    domain_id: rtos
  - id: linux-producer
    name: LinuxProducer
    period_ms: 50
    wcet_ms: 2
    stack: low
    domain_id: linux
`;
    const file = new File([stochasticProject], 'stochastic.yaml', {
      type: 'application/x-yaml'
    });
    Object.defineProperty(file, 'text', {
      value: async () => stochasticProject
    });
    await user.upload(screen.getByTestId('project-file-input'), file);

    await user.clear(screen.getByLabelText('Stochastic event name'));
    await user.type(
      screen.getByLabelText('Stochastic event name'),
      'Linux IRQ'
    );
    await user.selectOptions(
      screen.getByLabelText('Stochastic source domain'),
      ['linux']
    );
    await user.selectOptions(
      screen.getByLabelText('Stochastic consumer task'),
      ['consumer']
    );
    await user.clear(screen.getByLabelText('Stochastic mean inter-arrival'));
    await user.type(
      screen.getByLabelText('Stochastic mean inter-arrival'),
      '40'
    );

    await user.click(
      screen.getByRole('button', { name: 'Add stochastic event' })
    );

    expect(screen.getByText('stochastic-1')).toBeInTheDocument();
    expect(screen.getByText('Linux IRQ')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Delete stochastic event stochastic-1'
      })
    );

    expect(screen.queryByText('stochastic-1')).not.toBeInTheDocument();
  });

  it('validates linux-domain and non-linux consumer constraints', async () => {
    const user = userEvent.setup();
    renderApp();

    const stochasticProject = `version: '0.3'
global:
  tick_ms: 1
  stack_presets:
    low: 512
    mid: 2048
    high: 4096
domains:
  - id: rtos
    name: RTOS
    kind: rtos
    core_count: 1
  - id: linux
    name: Linux
    kind: linux
    core_count: 1
tasks:
  - id: linux-consumer
    name: LinuxConsumer
    period_ms: 20
    wcet_ms: 2
    stack: low
    domain_id: linux
`;
    const file = new File([stochasticProject], 'stochastic-invalid.yaml', {
      type: 'application/x-yaml'
    });
    Object.defineProperty(file, 'text', {
      value: async () => stochasticProject
    });
    await user.upload(screen.getByTestId('project-file-input'), file);

    await user.type(screen.getByLabelText('Stochastic event name'), 'BadEvent');
    await user.selectOptions(
      screen.getByLabelText('Stochastic source domain'),
      ['rtos']
    );
    await user.selectOptions(
      screen.getByLabelText('Stochastic consumer task'),
      ['linux-consumer']
    );
    await user.click(
      screen.getByRole('button', { name: 'Add stochastic event' })
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Source domain must be linux.'
    );

    await user.selectOptions(
      screen.getByLabelText('Stochastic source domain'),
      ['linux']
    );
    await user.click(
      screen.getByRole('button', { name: 'Add stochastic event' })
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Consumer task must belong to a non-linux domain.'
    );
  });
});
