import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    const origin = new URL(baseURL).origin;
    const external = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('http') && !url.startsWith(origin)) external.push(url);
    });
    await use(page);
    expect(external, 'peticiones a terceros').toEqual([]);
  },
});

export { expect };
