// Log in with Discord, on every page. Discord sends people back to buy.html (the one address registered with Discord),
// which finishes the login and returns them where they were. A login lasts as long as Discord's token (7 days).
// We only ever read who you are, whether you're in our server, and your keys.
// Clean addresses (/bios-tuner, not /bios-tuner.html): Discord's login return and old links still arrive with .html
if (/\.html$/.test(location.pathname)) history.replaceState(history.state, '', location.pathname.replace(/(index)?\.html$/, '') + location.search + location.hash);
const Vanta = (() => {
  const API = 'https://mjahaomibcazhjbtwksy.supabase.co/functions/v1/license';
  const CLIENT_ID = '1562575028829167646';   // the Vanta Helper Discord app
  const read = (store, k) => { try { return JSON.parse(store.getItem(k)); } catch { return null; } };
  const write = (store, k, v) => { try { v == null ? store.removeItem(k) : store.setItem(k, JSON.stringify(v)); } catch {} };

  const session = () => { const s = read(localStorage, 'vanta-session'); return s && s.exp > Date.now() ? s : null; };

  // next: { after: page to come back to } or { sku: what to buy right after }
  function login(next) {
    const state = crypto.getRandomValues(new Uint32Array(4)).join('-');
    write(sessionStorage, 'vanta-login', { ...next, state });
    location.href = 'https://discord.com/oauth2/authorize?' + new URLSearchParams({ client_id: CLIENT_ID, response_type: 'token',
      scope: 'identify guilds', redirect_uri: location.origin + '/buy.html', state });
  }

  // On buy.html after Discord: null when this isn't a login coming back, else { ok, token, expiresIn, next }
  function callback() {
    const back = new URLSearchParams(location.hash.slice(1));
    if (!back.get('access_token') && !back.get('error')) return null;
    history.replaceState(null, '', location.pathname);   // don't leave the token in the address bar
    const saved = read(sessionStorage, 'vanta-login') || {};
    const ok = !back.get('error') && back.get('state') === saved.state;
    return { ok, token: back.get('access_token'), expiresIn: +back.get('expires_in') || 604800, next: saved };
  }

  // Who a login is, with their keys; null when Discord no longer accepts it
  async function me(token) {
    try {
      const r = await (await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' },
                                          body: JSON.stringify({ action: 'discord', access_token: token }) })).json();
      if (r.error === 'discord_login' && session()?.token === token) write(localStorage, 'vanta-session', null);   // Discord stopped accepting it
      return r.ok ? r : null;
    } catch { return null; }
  }

  function save(token, expiresIn, r) {
    write(localStorage, 'vanta-session', { token, exp: Date.now() + (expiresIn - 60) * 1000, id: r.id, name: r.name, avatar: r.avatar });
  }
  const logout = () => { write(localStorage, 'vanta-session', null); location.reload(); };
  const avatar = s => s.avatar ? `https://cdn.discordapp.com/avatars/${s.id}/${s.avatar}.png?size=64`
                               : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(s.id) >> 22n) % 6n)}.png`;

  // Header: "Log in", or your name with a small menu
  const who = document.querySelector('[data-who]');
  const s = session();
  if (who && s) {
    who.innerHTML = `<button class="me" type="button" aria-expanded="false" aria-haspopup="true"><img alt="" width="28" height="28"><span></span></button>
      <div class="menu" hidden><a href="/account">My keys</a><a href="https://discord.gg/vantatweaks">Our Discord</a><button type="button">Log out</button></div>`;
    const [btn, menu] = who.children;
    btn.querySelector('img').src = avatar(s);
    btn.querySelector('span').textContent = s.name;
    const open = v => { menu.hidden = !v; btn.setAttribute('aria-expanded', v); };
    btn.addEventListener('click', () => open(menu.hidden));
    document.addEventListener('click', e => { if (!who.contains(e.target)) open(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
    menu.querySelector('button').addEventListener('click', logout);
  } else if (who) {
    who.querySelector('[data-login]').addEventListener('click', () => login({ after: location.pathname + location.search + location.hash }));
  }

  return { session, login, callback, me, save, avatar };
})();
