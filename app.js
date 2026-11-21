// Suds Scout — V1
// Renders listing cards from listings.json and powers search / filters.
// Listings load from Supabase. Call taps are logged anonymously (listing + page
// only, no personal data) to Supabase call_clicks — that log is the proof of
// intent taps behind featured listings. No star ratings.
(function () {
  var grid = document.getElementById('listings');
  if (!grid) return;
  var searchInput = document.getElementById('search');
  var townSelect = document.getElementById('town-filter');
  var typeSelect = document.getElementById('type-filter');
  var brandSelect = document.getElementById('brand-filter');
  var emergencyBox = document.getElementById('emergency-filter');
  var countEl = document.getElementById('result-count');
  var pageTown = grid.getAttribute('data-town') || '';
  var pageRegion = grid.getAttribute('data-region') || '';
  var all = [];
  var SERVICE_TYPES = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function card(l) {
    var services = (l.services && l.services.length)
      ? '<p class="services">' + l.services.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</p>'
      : '<p class="no-services">Services not listed — call and ask.</p>';
    var area = (l.service_area && l.service_area.length) ? esc(l.service_area.join(', ')) : esc(l.town);
    var hours = l.hours ? '<p class="meta">Hours: ' + esc(l.hours) + '</p>' : '';
    var brands = (l.brands_serviced && l.brands_serviced.length)
      ? '<p class="meta brands"><strong>Brands serviced:</strong> ' + l.brands_serviced.map(esc).join(' · ') + '</p>' : '';
    var warranty = '';
    if (l.warranty_authorised) {
      var wkeys = Object.keys(l.warranty_authorised);
      if (wkeys.length) {
        warranty = wkeys.map(function (b) {
          return '<p class="meta warranty-line"><span class="badge warranty">Warranty-authorized: ' + esc(b) + '</span> <span class="warranty-note">' + esc(l.warranty_authorised[b]) + '</span></p>';
        }).join('');
      }
    }
    var plan = l.maintenance_plan ? '<p class="meta plan"><strong>Maintenance plan:</strong> ' + esc(l.maintenance_plan) + '</p>' : '';
    var lic = l.license_number ? '<p class="meta">Florida license: ' + esc(l.license_number) + ' <span class="lic-note">(as published by the business)</span></p>' : '';
    var badge = '';
    if (l.emergency_24_7) badge += ' <span class="badge emergency">24/7 emergency service</span>';
    if (l.services_other_installs) badge += ' <span class="badge takeover">Services units they didn\'t install</span>';
    var maps = l.google_maps_url ? '<a href="' + esc(l.google_maps_url) + '" target="_blank" rel="noopener">Google Maps</a>' : '';
    var web = l.website ? '<a href="' + esc(l.website) + '" target="_blank" rel="noopener">Website</a>' : '';
    var fb = l.facebook_url ? '<a href="' + esc(l.facebook_url) + '" target="_blank" rel="noopener">Facebook</a>' : '';
    var feat = l.is_featured === true;
    var featBadge = feat ? ' <span class="badge featured">&#9733; Featured — Paid Placement</span>' : '';
    return '<article class="card' + (feat ? ' featured' : '') + '"><h3>' + esc(l.name) + featBadge + badge + '</h3>' +
      '<p class="town">' + esc(l.town) + ' · Serves: ' + area + '</p>' +
      services + brands + warranty + plan + lic + hours +
      '<a class="phone" data-listing="' + esc(l.db_id || '') + '" href="tel:' + esc(l.phone_tel) + '">Call ' + esc(l.phone) + '</a>' +
      '<p class="links">' + maps + web + fb + '</p></article>';
  }

  function render() {
    var q = (searchInput ? searchInput.value : '').trim().toLowerCase();
    var town = townSelect ? townSelect.value : '';
    var type = typeSelect ? typeSelect.value : '';
    var brand = brandSelect ? brandSelect.value : '';
    var emergency = emergencyBox ? emergencyBox.checked : false;
    var list = all.filter(function (l) {
      if (pageTown && !(l.service_area || []).includes(pageTown) && l.town !== pageTown) return false;
      if (pageRegion && l.region !== pageRegion) return false;
      if (town && !(l.service_area || []).includes(town) && l.town !== town) return false;
      if (type && !(l.service_types || []).includes(type)) return false;
      if (brand && !(l.brands_serviced || []).includes(brand)) return false;
      if (emergency && l.emergency_24_7 !== true) return false;
      if (q) {
        var hay = [l.name, l.town, (l.service_area || []).join(' '), (l.services || []).join(' '), (l.brands_serviced || []).join(' ')].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    // Featured first — and the featured group is shuffled on every page load,
    // so no paying business is always #1 and no paying business is always last.
    // Non-featured listings keep their normal order after them.
    var featured = list.filter(function (l) { return l.is_featured === true; });
    var rest = list.filter(function (l) { return l.is_featured !== true; });
    for (var i = featured.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = featured[i]; featured[i] = featured[j]; featured[j] = tmp;
    }
    list = featured.concat(rest);
    grid.innerHTML = list.length
      ? list.map(card).join('')
      : '<p class="empty">No detailing companies match that search yet. Try a different town or service, or <a href="join.html">ask a company to join</a>.</p>';
    if (countEl) countEl.textContent = list.length + (list.length === 1 ? ' business' : ' businesses') + (pageTown ? ' serving ' + pageTown : (pageRegion ? ' in this region' : ''));
  }

  function populateFilters() {
    if (townSelect) {
      var towns = {};
      all.forEach(function (l) {
        towns[l.town] = true;
        (l.service_area || []).forEach(function (t) { towns[t] = true; });
      });
      Object.keys(towns).sort().forEach(function (t) {
        var o = document.createElement('option'); o.value = t; o.textContent = t; townSelect.appendChild(o);
      });
    }
    if (brandSelect) {
      var brands = {};
      all.forEach(function (l) { (l.brands_serviced || []).forEach(function (b) { brands[b] = true; }); });
      Object.keys(brands).sort().forEach(function (b) {
        var o = document.createElement('option'); o.value = b; o.textContent = b; brandSelect.appendChild(o);
      });
    }
  }

  // Listings come from Supabase (source of truth — the Stripe webhook flips
  // is_featured there, so a lapsed payment drops a business to free
  // automatically). listings.json is the fallback if Supabase is unreachable.
  // Generator-specific fields live in the niche_fields jsonb column when the
  // Phase 2 migration has run; brands also map from vehicle_types and the
  // maintenance plan from callout_fee, so the cards work either way.
  var SUPABASE_URL = 'https://kctnaksisybxpsikbonz.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG5ha3Npc3lieHBzaWtib256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMTcyOTYsImV4cCI6MjEwOTg5MzI5Nn0.j8_HfxnUkb8rsW5MgZWpGu5UWW64UiaAA5aS7814LOw';
  var GEN_DIRECTORY_ID = 'b75cdff0-2030-4e0b-a3f6-a088d5ca9f85';
  function fromSupabase(rows) {
    return rows.map(function (r) {
      var nf = r.niche_fields || {};
      var services = r.services || [];
      var types = SERVICE_TYPES.filter(function (t) { return services.indexOf(t) !== -1 || (nf.service_types || []).indexOf(t) !== -1; });
      return {
        id: r.source_slug || r.id, db_id: r.id, name: r.business_name, phone: r.phone,
        phone_tel: (function (p) { var d = (p || '').replace(/\D/g, ''); return d.length === 10 ? '+1' + d : (d ? '+' + d : ''); })(r.phone),
        town: r.town, service_area: r.service_area || [],
        services: services.filter(function (s) { return SERVICE_TYPES.indexOf(s) === -1; }),
        service_types: types,
        brands_serviced: nf.brands_serviced || r.vehicle_types || [],
        warranty_authorised: nf.warranty_authorised || {},
        license_number: nf.license_number || '',
        maintenance_plan: nf.maintenance_plan || r.callout_fee || '',
        services_other_installs: !!nf.services_other_installs,
        emergency_24_7: !!nf.emergency_24_7,
        hours: r.hours || '',
        is_featured: !!r.is_featured,
        website: r.website_url || '', google_maps_url: r.google_maps_url || '',
        facebook_url: r.facebook_url || '', source_url: r.source_url || '',
        region: r.region || '', category: r.category || 'mobile-detailing',
        status: r.status || 'published'
      };
    });
  }
  function loadFromJson() {
    return fetch('listings.json')
      .then(function (r) { if (!r.ok) throw new Error('listings.json not found'); return r.json(); })
      .then(function (data) { return data.listings || []; });
  }
  fetch(SUPABASE_URL + '/rest/v1/listings?select=*&status=eq.published&directory_id=eq.' + GEN_DIRECTORY_ID + '&order=business_name.asc&limit=500', {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
  })
    .then(function (r) { if (!r.ok) throw new Error('Supabase listings not available'); return r.json(); })
    .then(function (rows) {
      if (!rows || !rows.length) throw new Error('Supabase listings empty');
      return fromSupabase(rows);
    })
    .catch(function () { return loadFromJson(); })
    .then(function (list) {
      all = list;
      populateFilters();
      render();
      // AEO/SEO structured data: one ItemList of LocalBusiness entries built
      // from the live listings, so search and AI engines can quote the
      // directory's businesses (name, phone, town) accurately.
      try {
        var ld = {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Suds Scout — Mobile Auto Detailing Directory',
          numberOfItems: list.length,
          itemListElement: list.map(function (l, i) {
            return {
              '@type': 'ListItem', position: i + 1,
              item: {
                '@type': 'LocalBusiness', name: l.name, telephone: l.phone || undefined,
                areaServed: l.town, url: 'https://www.sudsscout.com/'
              }
            };
          })
        };
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.textContent = JSON.stringify(ld);
        document.head.appendChild(s);
      } catch (e) {}
      [searchInput, townSelect, typeSelect, brandSelect, emergencyBox].forEach(function (el) {
        if (el) el.addEventListener('input', render);
        if (el) el.addEventListener('change', render);
      });
    })
    .catch(function () {
      grid.innerHTML = '<p class="empty">Listings could not be loaded. Please refresh the page — if you opened this file directly from disk, serve it over http (for example, on Vercel) so listings.json can load.</p>';
    });

  // Click-to-call log: one anonymous row per Call tap (listing + page only).
  // Fire-and-forget — never blocks or delays the phone call itself.
  grid.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a.phone') : null;
    if (!a) return;
    var lid = a.getAttribute('data-listing');
    if (!lid) return;
    try {
      fetch(SUPABASE_URL + '/rest/v1/call_clicks', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ listing_id: lid, directory_id: GEN_DIRECTORY_ID, source_page: location.pathname }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  });
})();

// "Find generator service near me" — geolocation, done entirely in the
// visitor's browser. No location is sent to any server or stored anywhere.
(function () {
  var btn = document.getElementById('near-me');
  if (!btn) return;
  var result = document.getElementById('near-me-result');
  var TOWNS = [["Fort Myers", 26.64, -81.87, "fort-myers.html"], ["Jacksonville", 30.33, -81.66, "jacksonville-city.html"], ["Orlando", 28.54, -81.38, "orlando-city.html"], ["Tampa", 27.95, -82.46, "tampa.html"]];
  function distKm(lat1, lon1, lat2, lon2) {
    var R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  btn.addEventListener('click', function () {
    if (!navigator.geolocation) { result.textContent = 'Your browser does not support location — please pick your city from the list instead.'; return; }
    result.textContent = 'Finding your nearest city…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      var best = null, bestD = Infinity;
      TOWNS.forEach(function (tw) {
        var d = distKm(pos.coords.latitude, pos.coords.longitude, tw[1], tw[2]);
        if (d < bestD) { bestD = d; best = tw; }
      });
      if (!best) { result.textContent = 'Could not find a nearby city — please pick your city from the list instead.'; return; }
      var miles = Math.round(bestD * 0.621371);
      result.innerHTML = 'You are nearest to <strong>' + best[0] + '</strong> (about ' + miles + ' miles away). ' +
        '<a href="' + best[3] + '">Show mobile detailers near ' + best[0] + ' →</a>';
    }, function () {
      result.textContent = 'Location was not shared — no problem, just pick your city from the list instead.';
    }, { timeout: 10000 });
  });
})();
