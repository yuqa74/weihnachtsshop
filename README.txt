APL Beleg – Weihnachtsgeschenke-Shop (Vue 3 SPA + PHP + MariaDB + Stripe)
Gruppe: G10
Mitglieder: Kevin Fiek, Michele Leon Locke

Diese Abgabe setzt die geforderten Seiten/IDs/data-testid um:
- /aplbeleg/index.html   (Katalog)   -> <div id="page-catalog"></div>
- /aplbeleg/cart.html    (Warenkorb) -> <div id="page-cart"></div>
- /aplbeleg/login.html   (Login)     -> <div id="page-login"></div>
- /aplbeleg/admin.html   (Admin)     -> <div id="page-admin"></div>

Wichtig:
- Produkte werden über fetch() aus php/products_json.php geladen (reines JSON, UTF-8).
- Suche ist clientseitig in Vue (computed filter).
- Warenkorb in localStorage.
- MwSt 7% wird berechnet und ausgewiesen.
- Zentrale Message-Leiste unten auf jeder Seite.
- Stripe Checkout im Testmodus (serverseitige Session-Erstellung).
- Adminbereich: Bestellungen + Lagerbestand ändern.

Setup (kurz):
1) Ordner /aplbeleg/ auf den Webserver kopieren.
2) DB einrichten: schema.sql importieren.
3) DB-Zugang in php/db.php anpassen.
4) Stripe: composer require stripe/stripe-php (im php/ Ordner) + Secret Key in php/stripe_checkout.php setzen.
5) Öffnen: http://localhost/aplbeleg/index.html

Hinweis Bilder:
Die enthaltenen Produktbilder wurden als eigene, einfache Weihnachtsgrafiken generiert (keine Fremdbilder).


## DB-Mapping (eure Spalten)
Die API mappt: ProduktID->id, Produkttitel->title, PreisBrutto->price, Lagerbestand->stock, LinkGrafikdatei->image, Kurzinahlt->description.


## Wichtig: Seite NICHT per file:/// öffnen
Wenn du index.html per Doppelklick öffnest (file:///...), funktionieren fetch() und PHP nicht.
Starte immer über einen Webserver (XAMPP/WAMP/MAMP oder php -S) und öffne z.B.:
http://localhost/aplbeleg/index.html
