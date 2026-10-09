import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareOrDownload } from './share.js';

const file = new File(['{}'], 'reps.json', { type: 'application/json' });

const touchDevice = (share) => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('navigator', { canShare: () => true, share });
};

beforeEach(() => {
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shareOrDownload', () => {
  it('comparte en móvil', async () => {
    touchDevice(vi.fn(() => Promise.resolve()));
    expect(await shareOrDownload(file)).toBe('shared');
  });

  it('no descarga si el usuario cancela', async () => {
    touchDevice(vi.fn(() => Promise.reject(new DOMException('x', 'AbortError'))));
    expect(await shareOrDownload(file)).toBe('cancelled');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('descarga el archivo si compartir falla', async () => {
    touchDevice(vi.fn(() => Promise.reject(new DOMException('x', 'NotAllowedError'))));
    expect(await shareOrDownload(file)).toBe('downloaded');
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
  });
});
