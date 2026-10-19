import { useEffect, useState } from 'react';

// Chrome/Edge/Android fire this event when the site can be installed.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

/**
 * "Install TRICCI" button. Browsers do not allow a website to set itself as the
 * home page or add a bookmark, but they do allow installing it as an app, which
 * puts a TRICCI icon on the home screen / desktop and opens it like an app.
 *
 * - Chrome, Edge, Android: triggers the browser's own install prompt.
 * - iPhone/iPad (Safari): shows the three steps to "Add to Home Screen".
 * - Already installed or unsupported browser: renders nothing.
 */
export default function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferred && !isIOS()) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setDeferred(null);
      return;
    }
    setShowIOSSteps((v) => !v);
  };

  return (
    <div className="relative inline-block">
      <style>{`
        @keyframes tricci-install-pulse {
          0%, 100% { transform: translateY(0); box-shadow: 0 0 0 0 rgba(232, 71, 10, 0.45); }
          50% { transform: translateY(-2px); box-shadow: 0 0 0 8px rgba(232, 71, 10, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tricci-install-btn { animation: none !important; }
        }
      `}</style>
      <button
        type="button"
        onClick={handleClick}
        className="tricci-install-btn inline-flex items-center gap-2 rounded-lg bg-[#E8470A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff6a3d] focus:outline-none focus:ring-2 focus:ring-[#E8470A] focus:ring-offset-2"
        style={{ animation: 'tricci-install-pulse 2.4s ease-in-out infinite' }}
      >
        <span aria-hidden="true">📲</span>
        Install TRICCI app
      </button>

      {showIOSSteps && !deferred && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800 shadow-lg">
          <p className="mb-2 font-semibold">Add TRICCI to your home screen</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Tap the Share button at the bottom of Safari.</li>
            <li>Scroll down and tap “Add to Home Screen”.</li>
            <li>Tap “Add”. TRICCI will open like an app.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
