import {detectEnvironment} from "../environment.js";

const DISMISS_KEY = 'storage-warning-dismissed';

/**
 * Warns that the tournament may not survive a reload when the app is opened inside
 * another app's browser. Detection is a heuristic, so the wording stays hedged and
 * the banner can be dismissed. See src/environment.js.
 */
export default {
    template: `
      <div v-if="visible" class="storage-warning" role="status">
        <div class="storage-warning__text">
          <strong class="storage-warning__title">{{ title }}</strong>
          {{ body }}
        </div>
        <button
          type="button"
          class="storage-warning__dismiss"
          aria-label="Dismiss warning"
          @click="dismiss"
        >×</button>
      </div>
    `,
    data() {
        return {
            environment: {inAppBrowser: false, storageWritable: true, appName: null},
            dismissed: false,
        }
    },
    computed: {
        visible() {
            if (this.dismissed) return false;
            return !this.environment.storageWritable || this.environment.inAppBrowser;
        },
        // Storage that is already failing is a fact, not a guess, so it gets the
        // blunter message of the two.
        isCertain() {
            return !this.environment.storageWritable;
        },
        title() {
            return this.isCertain ? 'Nothing will be saved' : 'Your tournament might not be saved';
        },
        body() {
            if (this.isCertain) {
                return 'This browser is not letting the app store anything, so the tournament '
                    + 'will be gone as soon as you leave or reload this page.';
            }
            const where = this.environment.appName
                ? `inside ${this.environment.appName}`
                : 'inside another app';
            return `You opened this ${where}, and its built-in browser may forget the `
                + 'tournament when the page reloads. Open the link in your normal browser to be safe.';
        },
    },
    created() {
        this.environment = detectEnvironment();
        try {
            this.dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
        } catch (e) {
            // Storage being unavailable is exactly what this banner is about.
        }
    },
    methods: {
        dismiss() {
            this.dismissed = true;
            try {
                sessionStorage.setItem(DISMISS_KEY, '1');
            } catch (e) {
                // Dismissal just does not survive the reload, which is acceptable.
            }
        },
    },
}
