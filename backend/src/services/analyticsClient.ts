import { env } from '../config/env';
import { BadRequestError, UpstreamError } from '../lib/errors';
import { logger } from '../lib/logger';

/** Forwards an uploaded CSV to the Flask analytics microservice. */
export async function analyzeCsv(file: { buffer: Buffer; originalname: string }, includePng: boolean) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(file.buffer)], { type: 'text/csv' }), file.originalname);
  let res: Response;
  try {
    res = await fetch(`${env.ANALYTICS_URL}/analyze${includePng ? '?png=true' : ''}`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    logger.error({ err }, 'analytics service unreachable');
    throw new UpstreamError('Analytics service is unavailable');
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 400 || res.status === 413 || res.status === 422) throw new BadRequestError(json.error ?? 'Invalid CSV');
  if (!res.ok) throw new UpstreamError('Analytics service failed to process the file');
  return json;
}
