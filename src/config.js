/**
 * Application Configuration
 *
 * Change ENABLE_CACHE to false during local development/debugging
 * to disable service worker caching.
 */

export const config = {
    /**
     * Enable or disable service worker caching
     * Set to false for local development to avoid cache issues
     * @type {boolean}
     */
    ENABLE_CACHE: false,

    /**
     * Show or hide debug menu in tournament configuration
     * Set to false in production to hide debug tools
     * @type {boolean}
     */
    SHOW_DEBUG_MENU: true,
};
