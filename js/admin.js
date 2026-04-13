/* Urheberschaft: Gruppe G10 – Kevin Fiek, Michele Leon Locke */
const { createApp } = Vue;

createApp({
  data() {
    return {
      session: window.authStore.load(),
      orders: [],
      stock: [],
      loading: true,
      orderFilter: 'all' // 'all', 'paid', 'unpaid'
    };
  },
  computed: {
    isAdmin() {
      return this.session && this.session.role === 'admin';
    },
    filteredOrders() {
      if (this.orderFilter === 'paid') {
        return this.orders.filter(o => o.paid == 1);
      } else if (this.orderFilter === 'unpaid') {
        return this.orders.filter(o => o.paid == 0);
      }
      return this.orders;
    }
  },
  methods: {
    authHeader() {
      return this.session ? { 'X-Auth-Token': this.session.token } : {};
    },
    async loadAll() {
      if (!this.isAdmin) {
        this.loading = false;
        return;
      }
      this.loading = true;
      try {
        const [o, s] = await Promise.all([
          fetch('php/admin_orders.php', { headers: this.authHeader(), cache: 'no-store' }),
          fetch('php/admin_stock.php', { headers: this.authHeader(), cache: 'no-store' })
        ]);

        const oj = await o.json();
        const sj = await s.json();

        if (!o.ok) throw new Error(oj?.error || 'Orders HTTP ' + o.status);
        if (!s.ok) throw new Error(sj?.error || 'Stock HTTP ' + s.status);

        this.orders = oj.orders || [];
        this.stock = sj.stock || [];
      } catch (e) {
        window.appMsg.show('Admin-Laden fehlgeschlagen: ' + e.message, 'error', 0);
      } finally {
        this.loading = false;
      }
    },
    async updateStock() {
      try {
        const r = await fetch('php/admin_stock_update.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.authHeader()
          },
          body: JSON.stringify({
            stock: this.stock.map(p => ({
              ProduktID: p.ProduktID,
              Lagerbestand: p.Lagerbestand
            }))
          })
        });

        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'HTTP ' + r.status);

        window.appMsg.show('✅ Bestand gespeichert', 'info');
        await this.loadAll();
      } catch (e) {
        window.appMsg.show('Bestand-Update fehlgeschlagen: ' + e.message, 'error', 0);
      }
    },
    async deleteOrder(orderId) {
      if (!confirm('Möchtest du diese Bestellung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        return;
      }

      try {
        const r = await fetch('php/admin_delete_order.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.authHeader()
          },
          body: JSON.stringify({ order_id: orderId })
        });

        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'HTTP ' + r.status);

        window.appMsg.show('✅ Bestellung gelöscht', 'info');
        await this.loadAll();
      } catch (e) {
        window.appMsg.show('Löschen fehlgeschlagen: ' + e.message, 'error', 0);
      }
    }
  },
  mounted() {
    this.loadAll();
  },
  template: `
  <main>
    <section class="card" style="grid-column:1 / -1;">
      <div class="card-body">
        <h2 style="margin-top:0;">🧰 Adminbereich</h2>

        <div v-if="!isAdmin">
          <p><small class="muted">
            Nicht als Admin eingeloggt. Bitte unter <a href="login.html">Login</a> anmelden.
          </small></p>
        </div>

        <div v-else>
          <div class="row" style="margin-bottom:12px;">
            <div>
              Angemeldet als <strong>{{ session.username }}</strong>
              <span class="badge">ADMIN</span>
            </div>
            <button class="secondary" @click="loadAll">Neu laden</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0;">Bestellungen ({{ filteredOrders.length }})</h3>
            <div style="display:flex; gap:8px;">
              <button :class="orderFilter === 'all' ? '' : 'secondary'" @click="orderFilter = 'all'">Alle</button>
              <button :class="orderFilter === 'paid' ? '' : 'secondary'" @click="orderFilter = 'paid'">Bezahlt</button>
              <button :class="orderFilter === 'unpaid' ? '' : 'secondary'" @click="orderFilter = 'unpaid'">Nicht bezahlt</button>
            </div>
          </div>
          <table data-testid="admin-orders-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Kunde</th>
                <th>Summe</th>
                <th>MwSt</th>
                <th>Status</th>
                <th>Datum</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in filteredOrders" :key="o.id">
                <td>{{ o.id }}</td>
                <td>
                  {{ o.customer_name }}<br>
                  <small class="muted">{{ o.customer_email }}</small>
                </td>
                <td>{{ o.total_price }}</td>
                <td>{{ o.vat_sum }}</td>
                <td>
                  <span v-if="o.paid == 1" style="padding:4px 8px; background:#d1fae5; color:#065f46; border-radius:6px; font-size:12px; font-weight:600;">✅ Bezahlt</span>
                  <span v-else style="padding:4px 8px; background:#fef3c7; color:#92400e; border-radius:6px; font-size:12px; font-weight:600;">⏳ Nicht bezahlt</span>
                </td>
                <td><small class="muted">{{ o.created_at }}</small></td>
                <td>
                  <button class="danger" @click="deleteOrder(o.id)" style="padding:6px 12px; font-size:13px;">🗑️ Löschen</button>
                </td>
              </tr>
              <tr v-if="filteredOrders.length === 0">
                <td colspan="7"><small class="muted">Keine Bestellungen.</small></td>
              </tr>
            </tbody>
          </table>

          <h3 style="margin-top:18px;">Lagerbestand</h3>
          <table data-testid="admin-stock-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Titel</th>
                <th>Preis</th>
                <th>Bestand</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in stock" :key="p.ProduktID">
                <td>{{ p.ProduktID }}</td>
                <td>{{ p.Produkttitel }}</td>
                <td>{{ p.PreisBrutto }}</td>
                <td>
                  <input type="number"
                         v-model.number="p.Lagerbestand"
                         min="0">
                </td>
              </tr>
            </tbody>
          </table>

          <button @click="updateStock" style="margin-top:12px;" data-testid="admin-update-stock">
            Bestand speichern
          </button>
        </div>
      </div>
    </section>
  </main>
  `
}).mount('#page-admin');
