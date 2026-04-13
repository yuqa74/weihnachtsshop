// Urheberschaft: Gruppe G10 – Kevin Fiek, Michele Leon Locke
console.log("AUTH JS WIRD GELADEN");
console.log("Vue ist:", Vue);

const { createApp } = Vue;

createApp({
  data() {
    return {
      login: { username: '', password: '' },
      register: { username: '', password: '', password2: '' },
      session: window.authStore.load()
    };
  },
  computed: { isLoggedIn() { return !!this.session; } },
  methods: {
    async doLogin() {
      try {
        const r = await fetch('php/login.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', ...this.login })
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j && j.error ? j.error : ('HTTP ' + r.status));
        this.session = j.session;
        window.authStore.save(this.session);
        window.appMsg.show('🎅 Login erfolgreich', 'info');
      } catch (e) {
        window.appMsg.show('Login fehlgeschlagen: ' + e.message, 'error', 0);
      }
    },
    async doRegister() {
      const username = this.register.username.trim();

      if (!username) return window.appMsg.show('Bitte Benutzername angeben', 'warn');

      // Prüfe ob Benutzername nur aus Zahlen besteht
      if (/^\d+$/.test(username)) {
        return window.appMsg.show('❌ Benutzername darf nicht nur aus Zahlen bestehen', 'error');
      }

      // Zähle Buchstaben im Benutzernamen
      const letterCount = (username.match(/[a-zA-ZäöüÄÖÜß]/g) || []).length;
      if (letterCount < 3) {
        return window.appMsg.show('❌ Benutzername muss mindestens 3 Buchstaben enthalten', 'error');
      }

      if (this.register.password.length < 4) return window.appMsg.show('Passwort zu kurz (>=4)', 'warn');
      if (this.register.password !== this.register.password2) return window.appMsg.show('Passwörter stimmen nicht überein', 'warn');

      try {
        const r = await fetch('php/login.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'register', username: username, password: this.register.password })
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j && j.error ? j.error : ('HTTP ' + r.status));
        window.appMsg.show('Registrierung ok – jetzt einloggen 🎄', 'info');
      } catch (e) {
        window.appMsg.show('Registrierung fehlgeschlagen: ' + e.message, 'error', 0);
      }
    },
    logout() {
      this.session = null;
      window.authStore.clear();
      window.appMsg.show('Logout', 'info');
    },
    async seedAdmin() {
      try {
        const r = await fetch('php/seed_admin.php', { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) throw new Error(j && j.error ? j.error : ('HTTP ' + r.status));
        window.appMsg.show(j.message || 'Admin angelegt', 'info');
      } catch (e) {
        window.appMsg.show('Admin-Seed fehlgeschlagen: ' + e.message, 'error', 0);
      }
    }
  },
  template: `
  <main>
    <section class="card">
      <div class="card-body">
        <h2 style="margin-top:0;">🔐 Login</h2>
        <div v-if="isLoggedIn">
          <p>Angemeldet als <strong>{{ session.username }}</strong> <span class="badge">{{ session.role }}</span></p>
          <button class="secondary" @click="logout" data-testid="logout">Logout</button>
        </div>
        <div v-else>
          <input v-model="login.username" placeholder="Benutzername" data-testid="login-username">
          <input v-model="login.password" type="password" placeholder="Passwort" data-testid="login-password" style="margin-top:8px;">
          <button @click="doLogin" style="margin-top:10px;" data-testid="login-submit">Einloggen</button>
          <p style="margin-top:10px;"><small class="muted">Admin: <strong>admin / adm24</strong></small></p>
          <button class="secondary" @click="seedAdmin" style="margin-top:8px;" data-testid="seed-admin">Admin anlegen</button>
        </div>
      </div>
    </section>

    <aside class="card">
      <div class="card-body">
        <h3 style="margin-top:0;">🧾 Registrierung</h3>
        <input v-model="register.username" placeholder="Benutzername" data-testid="register-username">
        <input v-model="register.password" type="password" placeholder="Passwort" data-testid="register-password" style="margin-top:8px;">
        <input v-model="register.password2" type="password" placeholder="Passwort wiederholen" data-testid="register-password2" style="margin-top:8px;">
        <button @click="doRegister" style="margin-top:10px;" data-testid="register-submit">Registrieren</button>

        <hr>
        <small class="muted">
          Tipp: Nach Login als Admin kannst du im Adminbereich Bestellungen & Lagerbestand sehen.
        </small>
      </div>
    </aside>
  </main>
  `
}).mount('#page-login');
