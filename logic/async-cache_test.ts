import { assertEquals } from "@std/assert/equals";
import { AsyncCache } from "./async-cache.ts";

Deno.test('basic async functionality', async () => {

  let counter = 1;
  const cache = new AsyncCache({
    loadFunc: async (delayMs: number) => {
      await new Promise(ok => setTimeout(ok, delayMs));
      return counter++;
    },
  });

  const ids = await Promise.all([
    cache.get(500),
    cache.get(500),
    cache.get(200),
    cache.get(250),
  ]);

  assertEquals(ids, [3, 3, 1, 2]);

});
