/**
 * Detecting an in-app browser (webview)
 *
 * Telegram, Instagram, Facebook and the rest open links in an embedded webview
 * rather than the real browser. Those webviews often keep localStorage only for as
 * long as the view is open, so a tournament in progress can vanish on a reload -
 * and "Add to Home Screen" is not offered there either.
 *
 * There is no API that answers "will you keep my storage?". Everything below is a
 * heuristic, which is why the banner says the data *might* be lost rather than
 * promising it will be. See docs/webview-storage.md.
 */

const UA = navigator.userAgent || '';

/**
 * Apps that name themselves in the user agent. Telegram is deliberately absent:
 * it adds no token of its own and is only caught by the generic webview checks.
 * @type {Array<[RegExp, string]>}
 */
const NAMED_APPS = [
    [/FBAN|FBAV|FB_IAB/, 'Facebook'],
    [/Instagram/, 'Instagram'],
    [/MicroMessenger/, 'WeChat'],
    [/\bLine\//, 'LINE'],
    [/Snapchat/, 'Snapchat'],
    [/Twitter/, 'X'],
    [/BytedanceWebview|musical_ly/, 'TikTok'],
    [/\bGSA\//, 'the Google app'],
];

/**
 * A home-screen PWA on iOS runs in a webview too, and shares its user agent, but it
 * is a normal persistent context - so it must not trip the iOS check below.
 */
function isStandalone() {
    if (window.navigator.standalone === true) return true;
    return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
}

function isIOS() {
    // iPadOS reports itself as a Mac, and is only told apart by having a touchscreen.
    return /iPhone|iPad|iPod/.test(UA)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * The one check that is not guesswork: can this page write to localStorage at all?
 * Private modes and blocked storage throw here, or silently drop the value.
 */
export function isStorageWritable() {
    const probe = '__storage_probe__';
    try {
        localStorage.setItem(probe, probe);
        const ok = localStorage.getItem(probe) === probe;
        localStorage.removeItem(probe);
        return ok;
    } catch (e) {
        return false;
    }
}

/**
 * @returns {{inAppBrowser: boolean, storageWritable: boolean, appName: string|null}}
 */
export function detectEnvironment() {
    const storageWritable = isStorageWritable();

    let appName = null;
    for (const [pattern, name] of NAMED_APPS) {
        if (pattern.test(UA)) {
            appName = name;
            break;
        }
    }

    // Telegram injects this bridge into the pages it hosts. Present for Mini Apps,
    // and worth checking for the in-app browser, but not something to rely on alone.
    const telegram = !!(window.Telegram && window.Telegram.WebApp) || !!window.TelegramWebviewProxy;
    if (telegram) appName = 'Telegram';

    // Android's WebView has carried the "wv" token since Android 5.
    const androidWebView = /Android/.test(UA) && /;\s*wv\)/.test(UA);

    // On iOS every browser is WebKit, but real Safari and the third-party browsers
    // (Chrome, Firefox, Edge) all end their user agent with a "Safari/" token.
    // A WKWebView embedded in another app does not.
    const iosWebView = isIOS() && /AppleWebKit/.test(UA) && !/Safari\//.test(UA) && !isStandalone();

    return {
        inAppBrowser: !!appName || androidWebView || iosWebView,
        storageWritable,
        appName,
    };
}
