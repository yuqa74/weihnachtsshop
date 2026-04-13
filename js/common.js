// Urheberschaft: Gruppe G10 – Kevin Fiek, Michele Leon Locke
// Gemeinsame Utils + zentrale Message Bar

window.appMsg = {
  _timeout: null,
  show(msg, level='info', ms=6500){
    const el = document.getElementById('message-text');
    const badge = document.getElementById('message-level');
    if(!el) return;

    el.textContent = msg;
    if(badge) badge.textContent = level.toUpperCase();

    if(this._timeout) clearTimeout(this._timeout);
    if(ms>0){
      this._timeout = setTimeout(()=>{ this.clear(); }, ms);
    }
  },
  clear(){
    const el = document.getElementById('message-text');
    const badge = document.getElementById('message-level');
    if(el) el.textContent='';
    if(badge) badge.textContent='';
  }
};

window.cartStore = {
  key: 'aplbeleg_cart_v1',
  load(){
    try{ return JSON.parse(localStorage.getItem(this.key) || '{}'); }
    catch(e){ return {}; }
  },
  save(cart){ localStorage.setItem(this.key, JSON.stringify(cart || {})); },
  clear(){ localStorage.removeItem(this.key); }
};

window.authStore = {
  key: 'aplbeleg_auth_v1',
  load(){
    try{ return JSON.parse(localStorage.getItem(this.key) || 'null'); } catch(e){ return null; }
  },
  save(session){ localStorage.setItem(this.key, JSON.stringify(session)); },
  clear(){ localStorage.removeItem(this.key); }
};

function fmtEUR(n){
  const x = Number(n || 0);
  return x.toFixed(2).replace('.', ',') + ' €';
}
