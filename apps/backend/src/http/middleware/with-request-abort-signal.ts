type RequestAbortSource = Readonly<{
  off: (event: "aborted", listener: () => void) => unknown;
  once: (event: "aborted", listener: () => void) => unknown;
}>;

type ResponseCloseSource = Readonly<{
  off: (event: "close", listener: () => void) => unknown;
  once: (event: "close", listener: () => void) => unknown;
  writableEnded: boolean;
}>;

export async function withRequestAbortSignal<Result>(
  request: RequestAbortSource,
  response: ResponseCloseSource,
  operation: (signal: AbortSignal) => Promise<Result>,
): Promise<Result> {
  const abortController = new AbortController();
  const abortRequest = () => {
    abortController.abort();
  };
  const abortIncompleteResponse = () => {
    if (!response.writableEnded) {
      abortController.abort();
    }
  };

  request.once("aborted", abortRequest);
  response.once("close", abortIncompleteResponse);
  try {
    return await operation(abortController.signal);
  } finally {
    request.off("aborted", abortRequest);
    response.off("close", abortIncompleteResponse);
  }
}
