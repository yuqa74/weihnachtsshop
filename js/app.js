/* Urheberschaft: Gruppe G10 – Kevin Fiek, Michele Leon Locke */
const { createApp } = Vue;

createApp({
  data() {
    return {
      products: [],
      search: '',
      cart: window.cartStore.load(),
      draftQty: {},           // <- Menge vormerken (noch NICHT im Warenkorb)
      loading: true,
      error: ''
    };
  },

  computed: {
    filtered() {
      const s = this.search.trim().toLowerCase();
      if (!s) return this.products;
      return this.products.filter(p =>
        String(p.title || '').toLowerCase().includes(s)
      );
    },

    totalItems() {
      return Object.values(this.cart).reduce((a, b) => a + Number(b || 0), 0);
    },

    positions() {
      return Object.keys(this.cart).filter(k => Number(this.cart[k]) > 0).length;
    },

    totalPrice() {
      const map = new Map(this.products.map(p => [String(p.id), p]));
      let sum = 0;
      for (const [id, qty] of Object.entries(this.cart)) {
        const p = map.get(String(id));
        if (!p) continue;
        sum += Number(qty || 0) * Number(p.price || 0);
      }
      return sum;
    },

    vatSum() {
      return this.totalPrice * 0.07;
    }
  },

  methods: {
    fmtEUR,

    qtyInCart(p) {
      return Number(this.cart[String(p.id)] || 0);
    },

    // --------- Draft (Vormerkung) ---------
    draftValue(p) {
      const id = String(p.id);
      const v = this.draftQty[id];
      return (v === undefined) ? this.qtyInCart(p) : v;
    },

    onDraftInput(p, ev) {
      const raw = ev.target.value;

      // nur Zahlen erlauben
      const cleaned = String(raw).replace(/[^\d]/g, '');
      if (raw !== cleaned) ev.target.value = cleaned;

      const id = String(p.id);
      const qty = cleaned === '' ? 0 : parseInt(cleaned, 10);

      this.draftQty[id] = Number.isNaN(qty) ? 0 : Math.max(0, Math.floor(qty));
    },

    incDraft(p) {
      const stock = Number(p.stock || 0);
      const next = Math.min(stock, (this.draftValue(p) || 0) + 1);
      this.draftQty[String(p.id)] = next;
    },

    decDraft(p) {
      const next = Math.max(0, (this.draftValue(p) || 0) - 1);
      this.draftQty[String(p.id)] = next;
    },

    // Erst hier wird wirklich in den Warenkorb geschrieben
    commitDraft(p) {
      const id = String(p.id);

      const draft = this.draftQty[id];
      const qty = (draft === undefined) ? this.qtyInCart(p) : draft;

      const stock = Number(p.stock || 0);

      // Prüfe ob Produkt ausverkauft ist
      if (stock <= 0) {
        window.appMsg.show('❌ Dieses Produkt ist momentan leider ausverkauft', 'error');
        return;
      }

      const finalQty = Math.min(Math.max(0, Math.floor(qty)), stock);

      if (finalQty <= 0) {
        window.appMsg.show('⚠️ Bitte wähle eine Menge größer als 0', 'warn');
        return;
      }

      this.cart[id] = finalQty;
      window.cartStore.save(this.cart);
      window.appMsg.show(`✅ In den Warenkorb gelegt: ${finalQty}x ${p.title}`, 'ok');
    },

    goCart() {
      location.href = 'cart.html';
    },

    async loadProducts() {
      this.loading = true;
      this.error = '';
      try {
        const r = await fetch('php/products_json.php', { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const data = await r.json();
        this.products = Array.isArray(data) ? data : [];
      } catch (e) {
        this.error = 'Produkte konnten nicht geladen werden: ' + e.message;
        window.appMsg.show(this.error, 'error', 0);
      } finally {
        this.loading = false;
      }
    }
  },

  mounted() {
    this.loadProducts();
  },

  template: `
  <main>
    <section class="card">
      <div class="hero">
        <img src="img/hero.jpg" alt="Weihnachtsbanner">
        <div class="hero-bar">
          <div>
            <div style="font-weight:900;">🎄 Geschenkekatalog</div>
            <small>Suche im Vue-Client · Daten aus MariaDB via PHP/JSON</small>
          </div>
          <div class="badge">MwSt. 7% ✓</div>
        </div>
      </div>

      <div class="card-body">
        <div class="row" style="margin-bottom:12px;">
          <input
            data-testid="search-input"
            v-model="search"
            placeholder="Suche nach Titel … (z. B. Socken, Kakao, Lebkuchen)"
          >
          <button class="secondary" @click="search='';" data-testid="search-clear">Reset</button>
        </div>

        <div v-if="loading"><small class="muted">Lade Produkte …</small></div>
        <div v-else-if="error"><small class="muted">{{ error }}</small></div>
      </div>

      <div class="grid">
        <div class="product" v-for="p in filtered" :key="p.id" data-testid="product">
          <img :src="p.image || 'img/placeholder.jpg'" :alt="p.title" data-testid="product-image">
          <div class="p-body">
            <h3 data-testid="product-title">{{ p.title }}</h3>
            <small class="muted">{{ p.description || '' }}</small>

            <div class="row">
              <span data-testid="product-price"><strong>{{ fmtEUR(p.price) }}</strong></span>
              <span class="badge" data-testid="product-stock">Bestand: {{ p.stock }}</span>
            </div>

            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button class="secondary" @click="decDraft(p)" data-testid="product-minus">-</button>

              <input
                class="qty-input"
                inputmode="numeric"
                pattern="[0-9]*"
                :value="draftValue(p)"
                @input="onDraftInput(p, $event)"
                aria-label="Menge"
              >

              <button class="secondary" @click="incDraft(p)" data-testid="product-plus">+</button>

              <button @click="commitDraft(p)" data-testid="product-addcart">In den Warenkorb</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <aside class="card">
      <div class="card-body">
        <h3 style="margin-top:0;">🛒 Warenkorb</h3>

        <div id="cart-summary">
          <div class="row"><span>Bestellpositionen</span><span data-testid="cart-total-positions">{{ positions }}</span></div>
          <div class="row"><span>Bücher gesamt</span><span data-testid="cart-total-items">{{ totalItems }}</span></div>
          <div class="row"><span>Zwischensumme</span><span data-testid="cart-total-price">{{ fmtEUR(totalPrice) }}</span></div>
          <div class="row"><span>MwSt. (7%)</span><span data-testid="cart-vat-sum">{{ fmtEUR(vatSum) }}</span></div>
        </div>

        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <button @click="goCart" :disabled="totalItems===0" data-testid="goto-cart">Zum Warenkorb</button>
          <button class="secondary" @click="loadProducts" data-testid="reload-products">Neu laden</button>
        </div>

        <hr>
      </div>
    </aside>
  </main>
  `
}).mount('#page-catalog');