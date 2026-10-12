import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UpdateRequired } from './UpdateRequired.jsx';

describe('UpdateRequired', () => {
  it('explica el bloqueo y ofrece recargar o descargar los datos', () => {
    render(<UpdateRequired />);
    expect(screen.getByRole('heading', { name: 'Actualiza Reps' })).toBeTruthy();
    expect(screen.getByText('Tus datos son de una versión más nueva de Reps. Recarga para actualizar la app.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descargar datos' })).toBeTruthy();
  });
});
