import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary.jsx';

const Broken = () => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  it('muestra cómo rescatar los datos si la app falla', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Broken /></ErrorBoundary>);
    expect(screen.getByRole('button', { name: 'Descargar datos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeTruthy();
    vi.restoreAllMocks();
  });
});
