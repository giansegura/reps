import { test as base, expect } from '@playwright/test';

const isExternal = (url, origin) => {
  const target = new URL(url);
  return (target.protocol === 'http:' || target.protocol === 'https:') && target.origin !== origin;
};

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    const origin = new URL(baseURL).origin;
    const external = [];
    page.on('request', (request) => {
      if (isExternal(request.url(), origin)) external.push(request.url());
    });
    await use(page);
    expect(external, 'peticiones a terceros').toEqual([]);
  },
});

export { expect };
