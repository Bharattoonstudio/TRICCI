/**
 * Client Error Logging Endpoint
 *
 * Logs client-side errors to the server for debugging and monitoring.
 * Used by the error boundary and global error handler on the frontend.
 */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message, stack, url, timestamp } = req.body;

    // Log to console for now (can be extended to send to external service)
    console.error('[CLIENT_ERROR]', {
      message,
      stack,
      url,
      timestamp: new Date(timestamp).toISOString(),
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('logs.error.handler', error);
    return res.status(500).json({ message: 'Failed to log error' });
  }
}
