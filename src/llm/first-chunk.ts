import { LlmUnavailableError } from "../services/errors.js";

/** The subset of the AI SDK `fullStream` part this module reads. */
export interface StreamPart {
  type: string;
  text?: string;
}

/**
 * `streamText` reports provider failures inside the stream, not as a throw. This waits for the
 * first text delta (or an error part) so the caller can fail before it answers the client.
 * The returned stream starts with the buffered first chunk. `onDone` runs when the stream ends.
 */
export async function firstChunk(
  parts: AsyncIterable<StreamPart>,
  onDone?: () => void,
): Promise<ReadableStream<string>> {
  const iterator = parts[Symbol.asyncIterator]();

  let first: string | undefined;
  while (first === undefined) {
    let step: IteratorResult<StreamPart>;
    try {
      step = await iterator.next();
    } catch {
      throw new LlmUnavailableError();
    }
    if (step.done || step.value.type === "error") throw new LlmUnavailableError();
    if (step.value.type === "text-delta" && step.value.text) first = step.value.text;
  }

  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(first);
    },
    async pull(controller) {
      for (;;) {
        let step: IteratorResult<StreamPart>;
        try {
          step = await iterator.next();
        } catch {
          controller.error(new LlmUnavailableError());
          return;
        }
        if (step.done) {
          controller.close();
          onDone?.();
          return;
        }
        if (step.value.type === "error") {
          controller.error(new LlmUnavailableError());
          return;
        }
        if (step.value.type === "text-delta" && step.value.text) {
          controller.enqueue(step.value.text);
          return;
        }
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}
