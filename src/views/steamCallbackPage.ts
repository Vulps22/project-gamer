import { Urls } from '../config/urls';

/** The page a user sees in their browser after signing in with Steam. Self-contained: no external assets. */
export function steamCallbackPage(outcome: { ok: boolean; message: string }): string {
    const title = outcome.ok ? 'Steam account linked' : 'Steam account not linked';
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LFGameSync: ${title}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0f172a; color: #cbd5e1; font: 16px/1.5 system-ui, sans-serif; padding: 16px; box-sizing: border-box; }
  main { max-width: 32rem; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; text-align: center; }
  h1 { color: #fff; margin: 0 0 12px; font-size: 1.5rem; }
  .mark { font-size: 2.5rem; margin-bottom: 8px; }
  a { color: #93c5fd; }
</style>
</head>
<body>
<main>
  <div class="mark">${outcome.ok ? '✅' : '⚠️'}</div>
  <h1>${title}</h1>
  <p>${escapeHtml(outcome.message)}</p>
  <p>Need help? Ask in the <a href="${Urls.OFFICIAL_SERVER}">Vulps Community Hub</a>.</p>
</main>
</body>
</html>`;
}

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[char] as string);
}
