/**
 * Send transactional email via Brevo's HTTP API.
 *
 * Replaces Airo's local email gateway (127.0.0.1:2525), which only
 * existed inside GoDaddy's hosting containers and isn't available here.
 *
 * Requires two environment variables (set in Railway):
 *   BREVO_API_KEY     — from Brevo dashboard → Settings → SMTP & API → API Keys
 *   BREVO_SENDER_EMAIL — a sender address verified in your Brevo account
 * Optional:
 *   BREVO_SENDER_NAME  — display name (defaults to "TRICCI")
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 30_000;

export type EmailAttachment = {
	filename: string;
	content: Buffer | Uint8Array;
	contentType?: string;
};

export type SendEmailInput = {
	to: string | string[];
	cc?: string | string[];
	bcc?: string | string[];
	subject: string;
	text?: string;
	html?: string;
	replyTo?: string;
	from?: string;
	attachments?: EmailAttachment[];
};

export type SendEmailResult = {
	messageId: string;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
	const apiKey = process.env.BREVO_API_KEY;
	const senderEmail = process.env.BREVO_SENDER_EMAIL;
	const senderName = process.env.BREVO_SENDER_NAME || "TRICCI";

	if (!apiKey || !senderEmail) {
		throw new Error(
			"Email not configured: set BREVO_API_KEY and BREVO_SENDER_EMAIL in environment variables."
		);
	}

	const payload: Record<string, unknown> = {
		sender: { email: input.from || senderEmail, name: senderName },
		to: toRecipients(input.to),
		subject: input.subject,
	};

	const cc = toRecipients(input.cc);
	if (cc.length > 0) payload.cc = cc;
	const bcc = toRecipients(input.bcc);
	if (bcc.length > 0) payload.bcc = bcc;
	if (input.html) payload.htmlContent = input.html;
	if (input.text) payload.textContent = input.text;
	if (input.replyTo) payload.replyTo = { email: input.replyTo };
	if (input.attachments && input.attachments.length > 0) {
		payload.attachment = input.attachments.map((att) => ({
			name: att.filename,
			content: Buffer.from(att.content).toString("base64"),
		}));
	}

	let response: Response;
	let body: { messageId?: string; message?: string };
	try {
		response = await fetch(BREVO_API_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json",
				"api-key": apiKey,
			},
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
		body = await response.json().catch(() => ({}));
	} catch (err) {
		throw new Error(`Brevo email send failed: ${describeError(err)}`);
	}

	if (!response.ok) {
		throw new Error(`Brevo email send failed: ${body.message || `HTTP ${response.status}`}`);
	}

	return { messageId: body.messageId || "sent" };
}

function toRecipients(value: string | string[] | undefined): { email: string }[] {
	if (value === undefined) return [];
	const arr = Array.isArray(value) ? value : [value];
	return arr.map((email) => ({ email }));
}

function describeError(err: unknown): string {
	if (err instanceof Error) {
		if (err.name === "AbortError" || err.name === "TimeoutError") {
			return `timed out after ${REQUEST_TIMEOUT_MS}ms`;
		}
		return err.message;
	}
	return String(err);
}
