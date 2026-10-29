// Vanta Tweaks home page: the phone bar, the phone sheet for "Check my PC", reviews and the plan picker.

// On phones: the "See plans" bar shows once the top is scrolled away, and hides again while the shop is on screen
const dock = document.querySelector('[data-dock]');
if (dock) {
  const seen = { hero: true, shop: false };
  const watch = new IntersectionObserver(entries => {
    entries.forEach(e => { seen[e.target.id === 'shop' ? 'shop' : 'hero'] = e.isIntersecting; });
    dock.classList.toggle('dock--on', !seen.hero && !seen.shop);
  });
  watch.observe(document.querySelector('.hero'));
  watch.observe(document.getElementById('shop'));
}

// The PC Check is a Windows app: anywhere else, explain that instead of starting a download that can't run.
const sheet = document.getElementById('on-pc');
const onWindows = /Windows/.test(navigator.userAgent) && !/Phone|Mobile/.test(navigator.userAgent);
document.querySelectorAll('[data-get-check]').forEach(a => a.addEventListener('click', e => {
  if (onWindows || !sheet.showModal) return;
  e.preventDefault();
  sheet.showModal();
}));
sheet.querySelector('[data-close]').addEventListener('click', () => sheet.close());
sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
sheet.querySelector('[data-copy]').addEventListener('click', async e => {
  try {
    await navigator.clipboard.writeText(location.origin + location.pathname);
    e.target.textContent = 'Link copied';
  } catch { e.target.textContent = location.host; }
});

// Reviews: approved ones from the license server. Everything a buyer wrote goes in as text, never as HTML.
const reviewsBox = document.querySelector('[data-reviews]');
if (reviewsBox) {
  fetch('https://mjahaomibcazhjbtwksy.supabase.co/functions/v1/license', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'reviews' }) })
    .then(r => r.json())
    .then(d => {
      if (!d.ok || !d.count) return;
      document.querySelector('[data-review-summary]').textContent =
        `${d.average} out of 5 from ${d.count} buyer${d.count === 1 ? '' : 's'}. Bought Vanta? Leave yours with /review in our Discord.`;
      reviewsBox.replaceChildren(...d.reviews.map(r => {
        const card = document.createElement('figure'), stars = document.createElement('div'),
              words = document.createElement('blockquote'), who = document.createElement('figcaption');
        card.className = 'box review';
        stars.className = 'review__stars';
        stars.textContent = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
        stars.setAttribute('aria-label', `${r.stars} out of 5 stars`);
        words.textContent = r.body;
        who.textContent = r.name;
        card.append(stars, words, who);
        return card;
      }));
      document.getElementById('reviews').hidden = false;
    })
    .catch(() => {});   // can't reach the server: the section just stays hidden
}

// Plan picker: the buy button follows the chosen plan
document.querySelectorAll('[data-plans]').forEach(form => {
  const buy = form.querySelector('[data-buy]');
  const total = buy.querySelector('[data-total]');
  const update = () => {
    const p = form.querySelector('input:checked');
    buy.href = '/buy?sku=' + p.value;
    total.textContent = '€' + p.dataset.price;
  };
  form.addEventListener('change', () => {
    update();
    total.classList.remove('pop');
    void total.offsetWidth;   // restart the little bounce
    total.classList.add('pop');
  });
  form.addEventListener('submit', e => e.preventDefault());
  update();
});

// Motion: sections rise in once as they come into view
{   // always: tweaked gaming PCs often have Windows animations off, which would hide this gentle motion
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
                                      { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}
