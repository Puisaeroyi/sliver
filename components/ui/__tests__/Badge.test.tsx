import React from 'react';
import { render, screen } from '@testing-library/react';
import Badge from '../Badge';

describe('Badge Component', () => {
  it('renders badge with children', () => {
    render(<Badge>Badge Text</Badge>);
    expect(screen.getByText('Badge Text')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<Badge variant="primary">Primary</Badge>);
    expect(screen.getByText('Primary')).toHaveClass('bg-primary', 'text-primary-foreground');

    rerender(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('bg-emerald-500', 'text-white');

    rerender(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning')).toHaveClass('bg-amber-500', 'text-white');

    rerender(<Badge variant="error">Error</Badge>);
    expect(screen.getByText('Error')).toHaveClass('bg-destructive', 'text-destructive-foreground');
  });

  it('applies base styles', () => {
    const { container } = render(<Badge>Base</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>Ref Badge</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('renders as span element', () => {
    const { container } = render(<Badge>Span Badge</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.tagName).toBe('SPAN');
  });

  it('supports additional HTML attributes', () => {
    render(
      <Badge data-testid="custom-badge" aria-label="Custom Badge">
        Test
      </Badge>
    );
    const badge = screen.getByTestId('custom-badge');
    expect(badge).toHaveAttribute('aria-label', 'Custom Badge');
  });
});
