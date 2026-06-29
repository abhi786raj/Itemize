# Itemize

A mobile-first Progressive Web App for analyzing, validating, and saving receipt data offline. Copy an AI prompt, paste extracted JSON from your assistant, review the details, and store receipts locally — no backend, no build step, no frameworks.

Built with plain HTML, vanilla JavaScript (ES modules), Tailwind CSS, IndexedDB, and a Service Worker.

---

## Features

### Receipt workflow
- **Home** — Copy or expand a receipt analysis prompt to use with any AI assistant
- **JSON Input** — Paste, format, and validate receipt JSON in real time
- **Review** — Edit all receipt fields inline (order info, items, pricing, fees, discounts, payment)
- **Success** — Confirmation after save with quick links to History or a new receipt
- **History** — Search, view, edit, and delete saved receipts
- **Settings** — App info, export/import backup, and clear all data

### Data & validation
- Receipts stored locally in **IndexedDB** (`ItemizeDB`)
- **Unique order IDs** — duplicate bills are rejected with a clear message (*"Bill already uploaded. Edit in History."*)
- **Item rules** — every item must have a non-empty name; quantity must be a natural number ≥ 1
- JSON schema validation on paste, review save, and import

### Backup & restore
- **Export Data** — download all receipts as a JSON backup file
- **Import Data** — merge with existing data, replace all, or cancel (ESC / backdrop also cancels)

### PWA
- Installable on Android and iOS (Add to Home Screen)
- Fully offline after first load (cache-first Service Worker)
- Light, mobile-first UI (max 480px centered on desktop)
- Sticky bottom navigation with safe-area support
- Apple Touch Icons and iOS splash screens

### Tech
- No Node.js, npm, React, or build tools
- Tailwind CSS via local browser runtime (`tailwind.min.js`)
- Optional Chrome side-panel extension support (`manifest.json`)

---

## How It Works

1. **Copy the prompt** on the Home screen and paste it into your preferred AI assistant with a receipt image or text.
2. **Paste the JSON** the assistant returns into the JSON Input page.
3. **Review and edit** fields on the Verify Details screen.
4. **Confirm & Save** — the receipt is stored in IndexedDB.
5. **View or edit** saved receipts anytime from History.

To update an existing bill, open it from **History → Receipt Details → Edit**.

---

## Project Structure

```text
.
├── index.html              # SPA shell (all views + bottom nav)
├── script.js               # App entry point + Service Worker registration
├── sw.js                   # Offline asset caching
├── manifest.webmanifest    # PWA manifest
├── manifest.json           # Chrome extension manifest (optional)
├── background.js           # Chrome extension background worker
├── tailwind.min.js         # Tailwind CSS v4 browser runtime
├── js/
│   ├── state.js            # Shared app state
│   ├── db.js               # IndexedDB (ItemizeDB / receipts)
│   ├── validation.js       # JSON + receipt + item validation
│   ├── prompt.js           # AI receipt analysis prompt
│   ├── router.js           # SPA view switching
│   └── views/
│       ├── home.js
│       ├── json-input.js
│       ├── review.js
│       ├── history.js
│       └── settings.js
└── assets/
    ├── icon.svg
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-512-maskable.png
    └── splash/             # iOS splash screens
```

---

## Getting Started

### Local development

Serve the project with any static file server:

```bash
python3 -m http.server 5500
```

Open:

```text
http://localhost:5500
```

### HTTPS for device testing

PWAs require HTTPS on physical devices. Expose your local server with ngrok:

```bash
ngrok http 5500
```

Open the generated HTTPS URL on your phone.

---

## Installation

### Android

1. Open the app URL in Chrome.
2. Tap **Install App** when prompted (or use the browser menu).
3. Launch from the home screen.

### iOS

1. Open the app in Safari.
2. Tap **Share → Add to Home Screen**.
3. Launch from the home screen.

---

## Receipt JSON Schema

Receipts follow a fixed structure with these top-level fields:

`order_id`, `platform`, `status`, `order_date`, `currency`, `items`, `pricing`, `fees`, `discounts`, `payment`

Each item requires:

| Field | Rule |
|-------|------|
| `name` | Non-empty string |
| `quantity.count` | Natural number (integer ≥ 1) |
| `quantity.unit` | String |
| `price`, `original_price` | Numbers |

The analysis prompt on the Home screen instructs the AI to return JSON matching this schema.

---

## Settings

| Action | Description |
|--------|-------------|
| **Export Data** | Downloads `itemize-export-YYYY-MM-DD.json` with all saved receipts |
| **Import Data** | Restore from a backup — choose merge, replace all, or cancel |
| **Clear All Receipts** | Permanently deletes all local receipt data |

---

## PWA Configuration

### Manifest — `manifest.webmanifest`

Defines app name (**Itemize**), icons, theme colors, display mode, and start URL.

### Service Worker — `sw.js`

- Pre-caches HTML, JS modules, Tailwind, icons, and splash screens
- Cache-first strategy for full offline use after install
- Bump the cache version in `sw.js` when deploying updates

After PWA changes, hard-refresh or unregister the old Service Worker in DevTools → Application.

---

## Customization

### App name & branding

Update `index.html` (`<title>`), `manifest.webmanifest` (`name`, `short_name`), and replace files in `assets/`.

### Chrome extension

`manifest.json` and `background.js` enable side-panel mode in Chrome. The extension shares `index.html` with the PWA.

---

## Notes

- PWAs require HTTPS outside of localhost.
- Clipboard (copy/paste) requires a secure context (localhost or HTTPS).
- Receipt data lives only in the browser's IndexedDB — export regularly if you need backups.
- Clear browser cache and unregister old Service Workers when testing PWA updates.

---

## License

Use this project for personal, educational, or commercial purposes.
