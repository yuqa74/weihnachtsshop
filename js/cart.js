/* Urheberschaft: Gruppe G10 – Kevin Fiek, Michele Leon Locke */
const { createApp } = Vue;

createApp({
  data() {
    return {
      products: [],
      cart: window.cartStore.load(),
      loading: true,
      customer: { name: '', email: '', address: '' },
      checkoutInProgress: false,
      isLoggedIn: false,
      currentUser: null
    };
  },
  computed: {
    items() {
      const map = new Map(this.products.map(p => [String(p.id), p]));
      const rows = [];
      for (const [id, qty] of Object.entries(this.cart)) {
        const p = map.get(String(id));
        if (!p) continue;
        const q = Number(qty || 0);
        if (q <= 0) continue;
        rows.push({
          id: String(p.id),
          title: p.title,
          unit_price: Number(p.price || 0),
          qty: q,
          stock: Number(p.stock || 0),
          image: p.image || 'placeholder.jpg'
        });
      }
      return rows;
    },
    totalItems() { return this.items.reduce((a, it) => a + it.qty, 0); },
    positions() { return this.items.length; },
    totalPrice() { return this.items.reduce((a, it) => a + it.qty * it.unit_price, 0); },
    vatSum() { return this.totalPrice * 0.07; }
  },
  methods: {
    fmtEUR,

    // Hole den gespeicherten Auth-Token aus localStorage
    getAuthToken() {
      const session = window.authStore.load();
      return session ? session.token : null;
    },

    // Prüft ob Nutzer eingeloggt ist
    async checkLoginStatus() {
      const token = this.getAuthToken();

      if (!token) {
        this.isLoggedIn = false;
        this.currentUser = null;
        return;
      }

      try {
        const r = await fetch('php/check_login.php', {
          cache: 'no-store',
          headers: {
            'X-Auth-Token': token
          }
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const data = await r.json();
        this.isLoggedIn = data.loggedIn || false;
        this.currentUser = data.user || null;
      } catch (e) {
        console.error('Login-Status konnte nicht geprüft werden:', e);
        this.isLoggedIn = false;
        this.currentUser = null;
      }
    },

    // Validiert Email-Format
    isValidEmail(email) {
      if (!email || !email.trim()) return false;
      const atIndex = email.indexOf('@');
      // Prüfe ob @ vorhanden ist UND ob nach dem @ noch etwas kommt
      return atIndex > 0 && atIndex < email.length - 1;
    },

    // Validiert Name (nur Buchstaben, Leerzeichen, Bindestriche, Apostrophe)
    validateName(name) {
      if (!name || !name.trim()) return false;
      // Erlaubt: Buchstaben (auch Umlaute), Leerzeichen, Bindestriche, Apostrophe
      const nameRegex = /^[a-zA-ZäöüÄÖÜß\s\-']+$/;
      return nameRegex.test(name.trim());
    },

    // Validiert Kundendaten
    validateCustomerData() {
      if (!this.customer.name.trim()) {
        alert('Bitte gib deinen Namen ein.');
        return false;
      }

      if (!this.validateName(this.customer.name)) {
        alert('Bitte gib einen gültigen Namen ein (nur Buchstaben).');
        return false;
      }

      if (!this.customer.email.trim()) {
        alert('Bitte gib deine E-Mail-Adresse ein.');
        return false;
      }

      if (!this.customer.address.trim()) {
        alert('Bitte gib deine Adresse ein.');
        return false;
      }

      if (!this.isValidEmail(this.customer.email)) {
        alert('Bitte gib eine gültige E-Mail-Adresse ein (z.B. name@gmail.com).');
        return false;
      }

      return true;
    },

    setQty(id, qty) {
      qty = Math.max(0, Math.floor(Number(qty || 0)));
      if (qty <= 0) delete this.cart[id];
      else this.cart[id] = qty;
      window.cartStore.save(this.cart);
    },
    inc(it) {
      if (it.qty + 1 > it.stock) {
        window.appMsg.show('Nicht genug Bestand für ' + it.title, 'warn');
        return;
      }
      this.setQty(it.id, it.qty + 1);
    },
    dec(it) { this.setQty(it.id, it.qty - 1); },
    clearCart() {
      this.cart = {};
      window.cartStore.clear();
      window.appMsg.show('Warenkorb geleert', 'info');
    },
    async loadProducts() {
      this.loading = true;
      try {
        const r = await fetch('php/products_json.php', { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        this.products = await r.json();
      } catch (e) {
        window.appMsg.show('Produkte konnten nicht geladen werden: ' + e.message, 'error', 0);
      } finally {
        this.loading = false;
      }
    },
    async startStripeCheckout() {
      // 1. Prüfe ob Warenkorb leer ist
      if (this.totalItems <= 0) {
        window.appMsg.show('⚠️ Warenkorb ist leer', 'warn');
        return;
      }

      // 2. Prüfe ob Nutzer eingeloggt ist
      if (!this.isLoggedIn) {
        window.appMsg.show('❌ Bitte melde dich an, um eine Bestellung aufzugeben.', 'error');
        return;
      }

      // 3. Validiere Kundendaten
      if (!this.validateCustomerData()) {
        return;
      }

      // Verhindere mehrfaches Klicken
      if (this.checkoutInProgress) {
        return;
      }
      this.checkoutInProgress = true;

      window.appMsg.show('⏳ Weiterleitung zu Stripe wird vorbereitet...', 'info');

      const payload = {
        customer: this.customer,
        cart: this.items.map(it => ({
          book_id: Number(it.id),
          title: it.title,
          unit_price: it.unit_price,
          quantity: it.qty
        }))
      };

      try {
        const r = await fetch('php/stripe_checkout.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await r.json();
        if (!r.ok) {
          throw new Error((j && j.error) ? j.error : ('HTTP ' + r.status));
        }

        // Demo-nahe Weiterleitung: Stripe.js redirectToCheckout(sessionId)
        if (j && j.sessionId && j.publishableKey && window.Stripe) {
          const stripe = Stripe(j.publishableKey);
          const result = await stripe.redirectToCheckout({ sessionId: j.sessionId });
          if (result && result.error) {
            throw new Error(result.error.message || 'Stripe redirect error');
          }
          return;
        }

        // Fallback: direkte URL (falls Server eine URL liefert)
        if (j && j.url) {
          window.location.href = j.url;
          return;
        }

        throw new Error('Ungültige Stripe-Antwort (kein sessionId/url)');
      } catch (e) {
        window.appMsg.show('Stripe Checkout fehlgeschlagen: ' + e.message, 'error', 0);
      } finally {
        this.checkoutInProgress = false;
      }
    }
  },
  mounted() {
    this.loadProducts();
    this.checkLoginStatus();
  },
  template: `
  <main>
    <section class="card">
      <div class="card-body">
        <h2 style="margin:0 0 6px 0;">🛒 Dein Warenkorb</h2>
        <small class="muted">Hier kannst du Mengen anpassen und anschließend im Stripe-Testmodus bezahlen.</small>
        
        <!-- Login-Warnung wenn nicht eingeloggt -->
        <div v-if="!isLoggedIn" style="margin-top:12px; padding:10px; background:#fef3c7; border:1px solid #f59e0b; border-radius:8px;">
          <small style="color:#92400e;">⚠️ Du bist nicht angemeldet. Bitte <a href="login.html">logge dich ein</a>, um eine Bestellung aufzugeben.</small>
        </div>
        
        <!-- Angemeldet als... -->
        <div v-else style="margin-top:12px; padding:10px; background:#d1fae5; border:1px solid #10b981; border-radius:8px;">
          <small style="color:#065f46;">✅ Angemeldet als <strong>{{ currentUser.name }}</strong></small>
        </div>
      </div>

      <div class="card-body" v-if="loading"><small class="muted">Lade …</small></div>

      <div class="card-body" v-if="items.length===0 && !loading">
        <p><small class="muted">Warenkorb ist leer. Zurück zum <a href="index.html">Katalog</a>.</small></p>
      </div>

      <div v-else>
        <table data-testid="cart-table">
          <thead>
            <tr><th>Artikel</th><th>Menge</th><th>Preis</th></tr>
          </thead>
          <tbody>
            <tr v-for="it in items" :key="it.id" data-testid="cart-row">
              <td>
                <div style="display:flex; gap:10px; align-items:center;">
                  <img :src="'' + it.image" alt="" style="width:58px; height:58px; object-fit:cover; border-radius:14px; border:1px solid rgba(15,23,42,.12);">
                  <div>
                    <div><strong data-testid="cart-item-title">{{ it.title }}</strong></div>
                    <small class="muted">Bestand: {{ it.stock }}</small>
                  </div>
                </div>
              </td>
              <td>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                  <button class="secondary" @click="dec(it)" data-testid="cart-minus">-</button>
                  <input style="width:80px;" :value="it.qty" @input="setQty(it.id, $event.target.value)" data-testid="cart-qty">
                  <button @click="inc(it)" data-testid="cart-plus">+</button>
                </div>
              </td>
              <td>
                <div><span data-testid="cart-item-price">{{ fmtEUR(it.qty * it.unit_price) }}</span></div>
                <small class="muted">à {{ fmtEUR(it.unit_price) }}</small>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="card-body" style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="secondary" @click="clearCart" data-testid="cart-clear">Warenkorb leeren</button>
          <button class="secondary" @click="loadProducts" data-testid="cart-reload">Neu laden</button>
        </div>
      </div>
    </section>

    <aside class="card">
      <div class="card-body">
        <h3 style="margin-top:0;">🎁 Zusammenfassung</h3>
        <div id="cart-summary">
          <div class="row"><span>Bestellpositionen</span><span data-testid="cart-total-positions">{{ positions }}</span></div>
          <div class="row"><span>Bücher gesamt</span><span data-testid="cart-total-items">{{ totalItems }}</span></div>
          <div class="row"><span>Zwischensumme</span><span data-testid="cart-total-price">{{ fmtEUR(totalPrice) }}</span></div>
          <div class="row"><span>MwSt. (7%)</span><span data-testid="cart-vat-sum">{{ fmtEUR(vatSum) }}</span></div>
          <hr>
          <div class="row"><span><strong>Gesamt</strong></span><span data-testid="cart-grand-total"><strong>{{ fmtEUR(totalPrice) }}</strong></span></div>
        </div>

        <h4 style="margin:14px 0 8px 0;">Kundendaten</h4>
        <input v-model="customer.name" placeholder="Name" data-testid="customer-name" :disabled="!isLoggedIn">
        <input v-model="customer.email" placeholder="E-Mail" data-testid="customer-email" style="margin-top:8px;" :disabled="!isLoggedIn">
        <textarea v-model="customer.address" placeholder="Adresse" rows="3" data-testid="customer-address" style="margin-top:8px;" :disabled="!isLoggedIn"></textarea>

        <button @click="startStripeCheckout" :disabled="totalItems===0 || checkoutInProgress || !isLoggedIn" style="margin-top:12px;" data-testid="stripe-checkout">
         {{ checkoutInProgress ? '⏳ Lädt...' : (isLoggedIn ? 'Mit Stripe bezahlen (Testmodus)' : '🔒 Bitte zuerst anmelden') }}
        </button>

        <p style="margin-top:12px;"><small class="muted">
          Testkarte: 4242 4242 4242 4242 · Ablaufdatum Zukunft · CVC beliebig
        </small></p>
      </div>
    </aside>
  </main>
  `
}).mount('#page-cart');