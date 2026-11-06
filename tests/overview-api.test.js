import test from "node:test";
import assert from "node:assert/strict";
import { tinyGroup } from "./fixtures/tiny-group.js";
import { sessionOverviewData } from "../core/overview.js";
import { createOverviewHandler } from "../api/overview.js";

const data = () => sessionOverviewData(tinyGroup(), 1);
const request = (payload = data(), headers = {}) => new Request("https://connection.example/api/overview", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(payload),
});
const generated = () => Response.json({
  stop_reason: "end_turn",
  content: [{ type: "text", text: "Five of six people checked in.\n\nSome reports are missing.\n\nTry a partner activity." }],
});

test("unconfigured AI explicitly reports setup missing without calling Anthropic", async () => {
  const handler = createOverviewHandler({
    getApiKey: () => undefined,
    fetchImpl: () => { assert.fail("must not call Anthropic without a key"); },
  });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "not_configured");
});

test("wrong methods, content types, malformed or oversized JSON are rejected", async () => {
  const handler = createOverviewHandler({
    getApiKey: () => "test-key",
    fetchImpl: () => { assert.fail("invalid input must not reach Anthropic"); },
  });
  assert.equal((await handler(new Request("https://connection.example/api/overview"))).status, 405);
  assert.equal((await handler(request(data(), { "Content-Type": "text/plain" }))).status, 415);
  const broken = new Request("https://connection.example/api/overview", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
  });
  assert.equal((await handler(broken)).status, 400);
  assert.equal((await handler(request({ note: "x".repeat(9000) }))).status, 413);
  assert.equal((await handler(request({ ...data(), name: "private" }))).status, 400);
});

test("provider receives only validated aggregates and successful overviews are cached", async () => {
  let calls = 0;
  let time = Date.now();
  const handler = createOverviewHandler({
    getApiKey: () => "test-key",
    now: () => time,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, "https://api.anthropic.com/v1/messages");
      assert.equal(options.headers["x-api-key"], "test-key");
      const body = JSON.parse(options.body);
      assert.ok(body.max_tokens <= 1000);
      assert.equal(body.messages.length, 1);
      const supplied = JSON.parse(body.messages[0].content.split("\n").slice(1).join("\n"));
      assert.deepEqual(supplied, data());
      assert.ok(!options.body.includes("Ana"));
      return generated();
    },
  });
  const first = await handler(request());
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("cache-control"), "no-store");
  const firstBody = await first.json();
  assert.deepEqual(await (await handler(request())).json(), firstBody);
  assert.equal(calls, 1);
  time += 60 * 60 * 1000 + 1;
  assert.equal((await handler(request())).status, 200);
  assert.equal(calls, 2);
});

test("concurrent identical requests make one provider call and each response can be read", async () => {
  let finish;
  let calls = 0;
  const handler = createOverviewHandler({
    getApiKey: () => "test-key",
    fetchImpl: () => {
      calls++;
      return new Promise((resolve) => { finish = () => resolve(generated()); });
    },
  });
  const first = handler(request());
  const second = handler(request());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  finish();
  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(await a.json(), await b.json());
});

test("changed session numbers have separate cache entries", async () => {
  let calls = 0;
  const handler = createOverviewHandler({
    getApiKey: () => "test-key",
    fetchImpl: async () => { calls++; return generated(); },
  });
  const changed = data();
  changed.session.number = 2;
  await handler(request());
  await handler(request(changed));
  assert.equal(calls, 2);
});

test("upstream errors and truncated or empty responses are visible and not cached", async (t) => {
  t.mock.method(console, "error", () => {});
  for (const [provider, status] of [
    [() => Response.json({ error: { message: "PRIVATE PROVIDER DETAIL" } }, { status: 401 }), 502],
    [() => Response.json({}, { status: 429 }), 429],
    [() => Response.json({ stop_reason: "max_tokens", content: [{ type: "text", text: "cut off" }] }), 502],
    [() => Response.json({ stop_reason: "end_turn", content: [] }), 502],
    [() => { throw new DOMException("timed out", "TimeoutError"); }, 504],
    [() => { throw new TypeError("fetch failed"); }, 502],
  ]) {
    let calls = 0;
    const handler = createOverviewHandler({
      getApiKey: () => "test-key",
      fetchImpl: async () => { calls++; return provider(); },
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await handler(request());
      assert.equal(response.status, status);
      const result = await response.json();
      assert.equal(typeof result.error, "string");
      assert.ok(!Object.hasOwn(result, "text"));
      assert.ok(!JSON.stringify(result).includes("PRIVATE PROVIDER DETAIL"));
    }
    assert.equal(calls, 2);
  }
});

test("too many new requests return a visible retry response; cached ones still work", async () => {
  let time = Date.now();
  const handler = createOverviewHandler({
    getApiKey: () => "test-key",
    now: () => time,
    fetchImpl: async () => generated(),
  });
  for (let number = 1; number <= 10; number++) {
    const input = data();
    input.session.number = number;
    assert.equal((await handler(request(input))).status, 200);
  }
  assert.equal((await handler(request())).status, 200);
  const input = data();
  input.session.number = 11;
  const limited = await handler(request(input));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  time += 60_001;
  assert.equal((await handler(request(input))).status, 200);
});

test("a third different concurrent request is limited", async () => {
  const finishes = [];
  const handler = createOverviewHandler({
    getApiKey: () => "test-key",
    fetchImpl: () => new Promise((resolve) => finishes.push(() => resolve(generated()))),
  });
  const secondData = data();
  secondData.session.number = 2;
  const first = handler(request());
  const second = handler(request(secondData));
  await new Promise((resolve) => setImmediate(resolve));
  const thirdData = data();
  thirdData.session.number = 3;
  assert.equal((await handler(request(thirdData))).status, 429);
  finishes.forEach((finish) => finish());
  assert.equal((await first).status, 200);
  assert.equal((await second).status, 200);
});
