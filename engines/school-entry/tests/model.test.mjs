import test from "node:test";
import assert from "node:assert/strict";
import { createRanker } from "../server/model.mjs";
test("C14 provider HTTP contract validates complete typed judgments", async () => {
  let payload;
  let body = {
    model: "jev-1.13.0",
    answers: {
      fit: { type: "noul", noul: 1 },
      e0: {
        type: "score",
        score: 3,
        confidence: 1,
        probabilities: { 0: 0, 1: 0, 2: 0, 3: 1 },
      },
    },
    usage: { input_tokens: 10, output_tokens: 5 },
  };
  const rank = createRanker({
    key: "test",
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.typesafe.ai/v1/systemone");
      assert.equal(options.headers.Authorization, "Bearer test");
      payload = JSON.parse(options.body);
      return { ok: true, json: async () => body };
    },
  });
  const engines = [{ id: "one", name: "One", description: "Games" }];
  assert.deepEqual((await rank("Learn", engines)).scores, { one: 3 });
  assert.equal(payload.questions.fit.type, "noul");
  assert.equal(payload.questions.e0.criteria.length, 4);
  body.answers.e0.score = 4;
  await assert.rejects(rank("Learn", engines));
  delete body.answers.e0;
  await assert.rejects(rank("Learn", engines));
});
