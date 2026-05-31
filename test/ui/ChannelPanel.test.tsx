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
});
