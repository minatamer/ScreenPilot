import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import { withRequestAbortSignal } from "./with-request-abort-signal.js";

class RequestAbortEmitter extends EventEmitter {}

class ResponseCloseEmitter extends EventEmitter {
  writableEnded = false;
}

describe("withRequestAbortSignal", () => {
  it("aborts the operation and removes listeners when the request aborts", async () => {
    const request = new RequestAbortEmitter();
    const response = new ResponseCloseEmitter();

    const aborted = await withRequestAbortSignal(
      request,
      response,
      (signal) => {
        request.emit("aborted");
        return Promise.resolve(signal.aborted);
      },
    );

    expect(aborted).toBe(true);
    expect(request.listenerCount("aborted")).toBe(0);
    expect(response.listenerCount("close")).toBe(0);
  });

  it("aborts only when a closed response is incomplete", async () => {
    const request = new RequestAbortEmitter();
    const response = new ResponseCloseEmitter();

    const completedResponseAborted = await withRequestAbortSignal(
      request,
      response,
      (signal) => {
        response.writableEnded = true;
        response.emit("close");
        return Promise.resolve(signal.aborted);
      },
    );
    expect(completedResponseAborted).toBe(false);

    const incompleteResponseAborted = await withRequestAbortSignal(
      request,
      response,
      (signal) => {
        response.writableEnded = false;
        response.emit("close");
        return Promise.resolve(signal.aborted);
      },
    );
    expect(incompleteResponseAborted).toBe(true);
  });

  it("removes listeners when the operation rejects", async () => {
    const request = new RequestAbortEmitter();
    const response = new ResponseCloseEmitter();

    await expect(
      withRequestAbortSignal(request, response, () =>
        Promise.reject(new Error("synthetic failure")),
      ),
    ).rejects.toThrow("synthetic failure");
    expect(request.listenerCount("aborted")).toBe(0);
    expect(response.listenerCount("close")).toBe(0);
  });
});
