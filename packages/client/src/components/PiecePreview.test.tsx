import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PiecePreview } from './PiecePreview';

describe('<PiecePreview>', () => {
  it('renders exactly 4 blocks for a piece', () => {
    const { container } = render(<PiecePreview type="L" />);
    expect(container.querySelectorAll('[style*="grid-column-start"]')).toHaveLength(4);
  });

  it('renders nothing drawable for a null hold', () => {
    const { container } = render(<PiecePreview type={null} />);
    expect(container.querySelectorAll('[style*="grid-column-start"]')).toHaveLength(0);
  });
});
