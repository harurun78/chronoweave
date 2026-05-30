import { render, screen } from '@testing-library/react';

import { App } from '../../src/app/App';

describe('App shell', () => {
  it('renders the Phase 1 workspace panels', () => {
    render(<App />);

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
});
