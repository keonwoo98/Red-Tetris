import { describe, it, expect } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Landing } from './Landing';

describe('<Landing>', () => {
  it('keeps ENTER disabled until room and name are valid', () => {
    const { getByPlaceholderText, getByRole } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    const btn = getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.change(getByPlaceholderText('neon'), { target: { value: 'neon' } });
    fireEvent.change(getByPlaceholderText('alice'), { target: { value: 'alice' } });
    expect(btn).not.toBeDisabled();
  });
});
