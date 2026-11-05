import { beforeAll,afterAll,afterEach } from 'vitest';
import { setupServer } from 'msw/node';
export const mock=setupServer();
beforeAll(()=>mock.listen({onUnhandledRequest:'error'}));
afterEach(()=>mock.resetHandlers());
afterAll(()=>mock.close());
