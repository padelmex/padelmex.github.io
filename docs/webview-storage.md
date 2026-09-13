# In-app browsers and lost tournaments

## The problem

Everything this app knows lives in `localStorage` under `tournament-data` and
`tournament-config`. That is fine in a real browser, where storage survives reloads,
tab closes and restarts.

It is not fine when someone taps a link in Telegram, WhatsApp, Instagram or Facebook.
Those apps do not hand the link to the browser; they open it in an embedded webview
they control. Depending on the app, the platform and the version, that webview may
use a storage area that is thrown away when the view closes — sometimes sooner. A
tournament three rounds in can disappear on a pull-to-refresh, and the organiser has
no way to know that was a risk.

The webview also has no "Add to Home Screen", so the usual escape route is invisible
too.

## Why detection cannot be exact

There is no API that answers the question we actually care about: *will you keep
what I write?* `navigator.storage.persisted()` is about eviction under disk
pressure, not about an app wiping its own webview data, and it is not implemented
consistently on mobile anyway.

So `src/environment.js` combines three signals of decreasing quality:

| Signal | Reliability | What it catches |
|---|---|---|
| A write/read/remove round-trip through `localStorage`, in a `try/catch` | Exact | Storage that is **already** blocked or broken. Not storage that works now and is wiped later. |
| `;\s*wv\)` in the user agent (Android), or WebKit-on-iOS with no `Safari/` token | Good | Generic embedded webviews, including Telegram, which announces itself nowhere else. |
| App-specific user agent tokens — `FBAN`/`FB_IAB`, `Instagram`, `MicroMessenger`, `Line/`, `Snapchat`, `Twitter`, `BytedanceWebview` | Good, but only for apps on the list | Lets the banner name the app instead of saying "another app". |

Known limits:

- **Telegram adds no token of its own.** It is caught only by the generic checks
  above, plus the `TelegramWebviewProxy` bridge it injects into pages it hosts.
- **The iOS check needs a standalone guard.** A home-screen PWA on iOS is a webview
  and shares the token-less user agent, but its storage is perfectly persistent, so
  `isStandalone()` excludes it. Without that guard, installed users would see the
  warning forever.
- **User agents are guesses.** Any of these strings can change, and an in-app
  browser that mimics Safari exactly is undetectable by design.

Both directions of error are possible, and they are not symmetrical: a false
negative loses someone's tournament, a false positive shows a banner that did not
need to be there. The checks lean towards showing it.

## What the app does about it

`src/components/storage_warning.js` renders a dismissible banner above every screen
when either the storage probe fails or a webview is detected. Because detection is a
heuristic, the wording is hedged — *might not be saved*, not *will be lost* — and it
points at the fix that always works: open the link in a real browser.

The exception is a failed storage probe. That is a measurement rather than a guess,
so the banner drops the hedging and says plainly that nothing will be saved.

Dismissal is kept in `sessionStorage`, not `localStorage`: the warning should come
back after the reload it is warning about.
