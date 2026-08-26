export interface CampaignShellInput {
  slug: string;
  publicUrl: string;
  title: string;
  description: string;
  supportCount: number;
  imageUrl?: string;
  nonce: string;
}

const escapeHtml = (value: unknown): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

export const renderCampaignPublicShell = (input: CampaignShellInput): string => {
  const path = `/campaigns/${encodeURIComponent(input.slug)}`;
  const publicUrl = input.publicUrl;
  const shareText = `${input.title} — ${input.description}`.trim();
  const data = safeJson({
    slug: input.slug,
    title: input.title,
    description: input.description,
    publicUrl,
    shareText,
    endpoint: `${path}/engagement`,
  });
  const imageMeta = /^https:\/\//i.test(input.imageUrl || '')
    ? `<meta property="og:image" content="${escapeHtml(input.imageUrl)}">`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(input.title)}</title>
  <meta name="description" content="${escapeHtml(input.description)}">
  <meta property="og:title" content="${escapeHtml(input.title)}">
  <meta property="og:description" content="${escapeHtml(input.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(publicUrl)}">
  ${imageMeta}
  <link rel="canonical" href="${escapeHtml(publicUrl)}">
  <style nonce="${escapeHtml(input.nonce)}">
    :root{--ink:#10211b;--green:#087c5b;--green-dark:#075c45;--mint:#dff7ed;--cream:#f7f4ec;--line:#d9e2dd;--muted:#68756f;--white:#fff}
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:#fff}
    button,a,input,textarea,select{font:inherit}.campaign-page{position:relative;width:100%;height:100%}.campaign-frame{display:block;width:100%;height:calc(100% - 76px);border:0;background:var(--cream)}
    .campaign-dock{height:76px;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px max(18px,calc((100vw - 1180px)/2));border-top:1px solid var(--line);background:rgba(255,255,255,.97);box-shadow:0 -16px 36px rgba(16,33,27,.08)}.dock-brand{min-width:0;display:grid;gap:2px}.dock-brand strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Georgia,serif;font-size:17px}.dock-brand span{color:var(--muted);font-size:11px}.dock-actions{display:flex;align-items:center;gap:8px}.dock-button{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 14px;border:1px solid var(--line);border-radius:999px;color:var(--ink);background:#fff;font-weight:800;cursor:pointer;text-decoration:none}.dock-button:hover{border-color:#9fcbbb;background:#f6fbf8}.dock-button--primary{color:#fff;border-color:var(--green);background:var(--green)}.dock-button--primary:hover{background:var(--green-dark)}.dock-button svg{width:17px;height:17px}.support-count{font-size:12px}
    .dialog-backdrop{position:fixed;z-index:10;inset:0;display:none;place-items:end center;padding:22px;background:rgba(7,26,20,.48);backdrop-filter:blur(5px)}.dialog-backdrop[data-open="true"]{display:grid}.dialog{width:min(560px,100%);max-height:min(720px,calc(100vh - 44px));overflow:auto;padding:24px;border:1px solid rgba(255,255,255,.5);border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(7,26,20,.28)}.dialog-head{display:flex;align-items:start;justify-content:space-between;gap:18px}.dialog-head p{margin:0 0 5px;color:var(--green);font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.dialog h2{margin:0;font-family:Georgia,serif;font-size:30px;font-weight:500;letter-spacing:-.03em}.dialog-close{width:38px;height:38px;border:1px solid var(--line);border-radius:50%;background:#fff;cursor:pointer}.dialog-copy{margin:12px 0 20px;color:var(--muted);font-size:14px;line-height:1.6}.share-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.share-link{min-height:50px;display:flex;align-items:center;gap:10px;padding:0 14px;border:1px solid var(--line);border-radius:13px;color:var(--ink);background:#fff;font-weight:750;text-decoration:none;cursor:pointer}.share-link:hover{border-color:#a4cdbf;background:#f5fbf8}.share-link--wide{grid-column:1/-1;color:#fff;border-color:var(--green);background:var(--green)}
    .field{display:grid;gap:7px;margin-top:14px}.field span{font-size:12px;font-weight:800}.field input,.field textarea,.field select{width:100%;padding:12px 13px;border:1px solid var(--line);border-radius:11px;color:var(--ink);background:#fff;outline:none}.field input:focus,.field textarea:focus,.field select:focus{border-color:#55ae91;box-shadow:0 0 0 3px rgba(8,124,91,.1)}.field textarea{min-height:120px;resize:vertical}.privacy{margin:12px 0;color:var(--muted);font-size:11px;line-height:1.5}.submit{width:100%;min-height:50px;border:0;border-radius:12px;color:#fff;background:var(--green);font-weight:850;cursor:pointer}.submit:disabled{opacity:.55;cursor:wait}.form-status{min-height:20px;margin:10px 0 0;color:var(--green);font-size:12px;font-weight:750}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:680px){.campaign-frame{height:calc(100% - 70px)}.campaign-dock{height:70px;padding:10px 12px}.dock-brand{display:none}.dock-actions{width:100%;justify-content:space-between}.dock-button{flex:1;padding:0 9px;font-size:12px}.dock-button span.label{display:none}.dialog-backdrop{padding:10px}.dialog{padding:20px;border-radius:20px}.share-grid{grid-template-columns:1fr}.share-link--wide{grid-column:auto}}
  </style>
</head>
<body>
  <main class="campaign-page">
    <iframe class="campaign-frame" src="${path}/content" title="${escapeHtml(input.title)} campaign website" sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    <footer class="campaign-dock" aria-label="Campaign actions">
      <div class="dock-brand"><strong>${escapeHtml(input.title)}</strong><span>Global Solutions Lab campaign</span></div>
      <div class="dock-actions">
        <button class="dock-button" id="support-button" type="button" aria-pressed="false" title="Support this solution">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6a5.5 5.5 0 0 0 1-8.8Z"/></svg>
          <span class="label">Support</span><span class="support-count" id="support-count">${Math.max(0, input.supportCount)}</span>
        </button>
        <button class="dock-button" id="share-button" type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg><span>Share</span>
        </button>
        <button class="dock-button dock-button--primary" id="connect-button" type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg><span>Connect</span>
        </button>
      </div>
    </footer>
  </main>

  <div class="dialog-backdrop" id="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title">
    <section class="dialog">
      <div class="dialog-head"><div><p>Share this campaign</p><h2 id="share-title">Help this solution travel further.</h2></div><button class="dialog-close" type="button" data-close aria-label="Close">×</button></div>
      <p class="dialog-copy">Choose where to share it. We’ll include the campaign title and public link.</p>
      <div class="share-grid">
        <button class="share-link share-link--wide" id="copy-link" type="button">Copy campaign link</button>
        <a class="share-link" data-channel="email" href="mailto:?subject=${encodeURIComponent(input.title)}&body=${encodeURIComponent(`${shareText}\n\n${publicUrl}`)}">Email a friend</a>
        <a class="share-link" data-channel="linkedin" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}">LinkedIn</a>
        <a class="share-link" data-channel="facebook" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}">Facebook</a>
        <a class="share-link" data-channel="x" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(publicUrl)}">X</a>
        <a class="share-link" data-channel="whatsapp" target="_blank" rel="noopener" href="https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${publicUrl}`)}">WhatsApp</a>
      </div>
    </section>
  </div>

  <div class="dialog-backdrop" id="connect-dialog" role="dialog" aria-modal="true" aria-labelledby="connect-title">
    <section class="dialog">
      <div class="dialog-head"><div><p>Connect with the team</p><h2 id="connect-title">Start a useful conversation.</h2></div><button class="dialog-close" type="button" data-close aria-label="Close">×</button></div>
      <p class="dialog-copy">Your message will be available privately to the solution team.</p>
      <form id="connect-form">
        <label class="field"><span>I’m interested in</span><select name="reason"><option value="partnership">Partnership</option><option value="funding">Funding or support</option><option value="volunteering">Volunteering</option><option value="pilot">Pilot or adoption</option><option value="feedback">Sharing feedback</option></select></label>
        <label class="field"><span>Name</span><input name="name" maxlength="100" autocomplete="name" required></label>
        <label class="field"><span>Email</span><input name="email" type="email" maxlength="200" autocomplete="email" required></label>
        <label class="field"><span>Message</span><textarea name="message" maxlength="1500" required placeholder="Tell the team how you would like to connect."></textarea></label>
        <p class="privacy">Your contact information is shared only with this solution’s team so they can respond.</p>
        <button class="submit" type="submit">Send message</button><p class="form-status" id="form-status" role="status"></p>
      </form>
    </section>
  </div>

  <script nonce="${escapeHtml(input.nonce)}">
    (() => {
      const campaign = ${data};
      const visitorKey = 'gsl-campaign-visitor';
      let visitorId = localStorage.getItem(visitorKey);
      if (!visitorId) { visitorId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(); localStorage.setItem(visitorKey, visitorId); }
      const post = async (action, payload = {}) => {
        const response = await fetch(campaign.endpoint + '/' + action, { method: 'POST', credentials: 'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...payload, visitorId}) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Please try again.');
        return data;
      };
      const shareDialog = document.getElementById('share-dialog');
      const connectDialog = document.getElementById('connect-dialog');
      const openDialog = (dialog) => { dialog.dataset.open = 'true'; dialog.querySelector('button, a, input, select')?.focus(); };
      const closeDialogs = () => { shareDialog.dataset.open = 'false'; connectDialog.dataset.open = 'false'; if (location.hash) history.replaceState(null, '', location.pathname); };
      document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', closeDialogs));
      [shareDialog, connectDialog].forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialogs(); }));
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDialogs(); });
      document.getElementById('share-button').addEventListener('click', () => openDialog(shareDialog));
      document.getElementById('connect-button').addEventListener('click', () => openDialog(connectDialog));
      const supportButton = document.getElementById('support-button');
      supportButton.addEventListener('click', async () => {
        supportButton.disabled = true;
        try { const result = await post('support'); supportButton.setAttribute('aria-pressed', String(result.supported)); document.getElementById('support-count').textContent = String(result.supportCount); }
        catch (error) { alert(error.message); } finally { supportButton.disabled = false; }
      });
      document.getElementById('copy-link').addEventListener('click', async (event) => {
        await navigator.clipboard.writeText(campaign.publicUrl); event.currentTarget.textContent = 'Link copied'; post('share', {channel:'copy'}).catch(() => {});
      });
      document.querySelectorAll('[data-channel]').forEach((link) => link.addEventListener('click', () => post('share', {channel:link.dataset.channel}).catch(() => {})));
      document.getElementById('connect-form').addEventListener('submit', async (event) => {
        event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type=submit]'); const status = document.getElementById('form-status'); button.disabled = true; status.textContent = 'Sending…';
        try { const values = Object.fromEntries(new FormData(form).entries()); await post('connect', values); form.reset(); status.textContent = 'Message sent. The solution team can now follow up.'; }
        catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
      });
      post('view').catch(() => {});
      if (location.hash === '#share') openDialog(shareDialog);
      if (location.hash === '#connect') openDialog(connectDialog);
    })();
  </script>
</body>
</html>`;
};
