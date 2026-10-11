import type { ReactNode } from 'react';

export const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#141414] px-4 py-3 text-white placeholder-white/30 transition focus:border-[#E8470A] focus:outline-none focus:ring-2 focus:ring-[#E8470A]/30';

export const labelClass = 'mb-2 block text-sm font-medium text-white/80';

export const primaryButtonClass =
  'w-full rounded-lg bg-gradient-to-r from-[#6B4FBB] to-[#E8470A] py-3 font-semibold text-white shadow-lg shadow-[#E8470A]/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40';

export const linkClass = 'font-medium text-[#E8470A] hover:text-[#ff6a3d]';

// Reads a fetch response safely. Returns the parsed JSON, or a readable error message
// when the server sends an empty or non-JSON body (e.g. rate limiting or an outage).
export async function readResponse(res: Response): Promise<{ data: any; error: string | null }> {
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (res.ok) return { data, error: null };
  if (res.status === 429) {
    return { data, error: 'Too many attempts. Please wait a few minutes and try again.' };
  }
  if (data?.message) return { data, error: data.message };
  return { data, error: `Request failed (${res.status}). Please try again.` };
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-4 py-10 text-white">
      <a href="/" className="mb-8">
        <img src="/assets/tricci-logo.png" alt="TRICCI" className="h-14 w-auto object-contain" />
      </a>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-2xl">
        <div className="h-1 w-full bg-gradient-to-r from-[#6B4FBB] to-[#E8470A]" />
        <div className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-white/60">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="mt-6 text-center text-sm text-white/60">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
      <p className="text-sm text-red-200">{message}</p>
    </div>
  );
}
