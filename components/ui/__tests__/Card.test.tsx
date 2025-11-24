import React from 'react';
import { render, screen } from '@testing-library/react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card';

describe('Card Component', () => {
  it('renders card with children', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    const { container } = render(<Card>Default Card</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-card');
    expect(card).toHaveClass('text-card-foreground');
    expect(card).toHaveClass('border-border');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Custom</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref Card</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('Card Sub-components', () => {
  it('renders CardHeader', () => {
    render(<CardHeader>Header Content</CardHeader>);
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('renders CardTitle', () => {
    render(<CardTitle>Card Title</CardTitle>);
    const title = screen.getByText('Card Title');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H3');
    expect(title).toHaveClass('font-semibold');
  });

  it('renders CardDescription', () => {
    render(<CardDescription>Card Description</CardDescription>);
    const description = screen.getByText('Card Description');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-sm', 'text-muted-foreground');
  });

  it('renders CardContent', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders CardFooter', () => {
    render(<CardFooter>Footer</CardFooter>);
    const footer = screen.getByText('Footer');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('flex', 'items-center');
  });

  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });
});
