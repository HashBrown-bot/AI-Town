export function isQuotaError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message || error);
  return /429|quota|RESOURCE_EXHAUSTED/i.test(message);
}

export function fallbackStatus(hasApiKey: boolean, isRateLimited: boolean) {
  return !hasApiKey ? 'procedural_fallback' : isRateLimited ? 'rate_limited_fallback' : 'api_error_fallback';
}

export function sequenceDialogueLines(
  lines: { a?: string; b?: string; ea?: string; eb?: string }[],
  agentA: { id: string; name: string },
  agentB: { id: string; name: string },
) {
  return lines.flatMap(line => [
    ...(line.a ? [{ speakerId: agentA.id, speakerName: agentA.name, text: line.a, emotion: line.ea || 'neutral' }] : []),
    ...(line.b ? [{ speakerId: agentB.id, speakerName: agentB.name, text: line.b, emotion: line.eb || 'neutral' }] : []),
  ]);
}
