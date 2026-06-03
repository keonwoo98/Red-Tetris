import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Controls } from './Controls';

describe('<Controls>', () => {
  it('lists the control hints', () => {
    const { getByText } = render(<Controls />);
    expect(getByText('CONTROLS')).toBeInTheDocument();
    expect(getByText('rotate')).toBeInTheDocument();
    expect(getByText('hard drop')).toBeInTheDocument();
  });
});
