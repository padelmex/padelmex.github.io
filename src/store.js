import {reactive} from 'vue';

const DEFAULT_POINTS_PER_MATCH = 16;

/**
 * Mixing pairings is on by default: it produces more even games than the strict
 * ranking does, and it is the only thing that stops a four-player session
 * replaying the same two teams. See docs/randomization.md.
 */
const DEFAULT_RANDOMIZE = true;

export const TOURNAMENT_DATA_KEY = 'tournament-data';
export const TOURNAMENT_CONFIG_KEY = 'tournament-config';

/**
 * @type {Array<string>}
 */
const VIEWS = ['setup', 'tournament', 'leaderboard'];

const defaults = () => ({
    pointsPerMatch: DEFAULT_POINTS_PER_MATCH,
    players: [],
    courts: [],
    randomize: DEFAULT_RANDOMIZE,
    tournamentCreated: false,
    configDirty: false,
    currentView: 'setup',
});

const state = reactive({
    /**
     * @type {number}
     */
    pointsPerMatch: DEFAULT_POINTS_PER_MATCH,
    /**
     * @type {Array<string>}
     */
    players: [],
    /**
     * @type {Array<string>}
     */
    courts: [],
    /**
     * @type {boolean}
     */
    randomize: DEFAULT_RANDOMIZE,
    /**
     * Whether a tournament is currently running
     * @type {boolean}
     */
    tournamentCreated: false,
    /**
     * Set when the setup form has been saved and the change is not applied yet
     * @type {boolean}
     */
    configDirty: false,
    /**
     * One of VIEWS
     * @type {string}
     */
    currentView: 'setup',
});

/**
 * Setup, tournament and leaderboard are browser history entries, with setup pinned at
 * the bottom of the stack. That is what lets Edit and Close be plain history.back().
 * See docs/navigation-and-state.md.
 */
export const store = {
    state,

    updateConfig(config) {
        Object.assign(state, config);
    },

    /**
     * The slice of state that describes a tournament's setup
     */
    getConfig() {
        return {
            pointsPerMatch: state.pointsPerMatch,
            players: [...state.players],
            courts: [...state.courts],
            randomize: state.randomize,
        };
    },

    /**
     * Flag that the setup form was saved, so the tournament screen applies it.
     * An explicit flag rather than diffing: a cold load legitimately has a store
     * that does not match the restored tournament yet.
     */
    markConfigDirty() {
        state.configDirty = true;
    },

    clearConfigDirty() {
        state.configDirty = false;
    },

    persistConfig() {
        localStorage.setItem(TOURNAMENT_CONFIG_KEY, JSON.stringify(this.getConfig()));
    },

    loadConfig() {
        const saved = localStorage.getItem(TOURNAMENT_CONFIG_KEY);
        if (!saved) return;

        try {
            const config = JSON.parse(saved);
            state.pointsPerMatch = typeof config.pointsPerMatch === 'number'
                ? config.pointsPerMatch
                : DEFAULT_POINTS_PER_MATCH;
            state.players = Array.isArray(config.players) ? config.players : [];
            state.courts = Array.isArray(config.courts) ? config.courts : [];
            // A saved config from before this field existed has no opinion, so it
            // takes the current default rather than being forced off.
            state.randomize = typeof config.randomize === 'boolean'
                ? config.randomize
                : DEFAULT_RANDOMIZE;
        } catch (e) {
            console.error('Failed to restore tournament config:', e);
        }
    },

    hasTournamentData() {
        return localStorage.getItem(TOURNAMENT_DATA_KEY) !== null;
    },

    /**
     * Seed the history stack so that setup is always the entry underneath, even when
     * the app opens straight into a tournament in progress.
     */
    initNavigation() {
        const showTournament = this.hasTournamentData();
        state.tournamentCreated = showTournament;

        window.history.replaceState({view: 'setup'}, '', '#setup');
        if (showTournament) {
            window.history.pushState({view: 'tournament'}, '', '#tournament');
        }
        this.applyHistoryState(showTournament ? 'tournament' : 'setup');

        window.addEventListener('popstate', (event) => {
            this.applyHistoryState(event.state && event.state.view);
        });
    },

    /**
     * Show a view because history moved. The tournament and leaderboard views only
     * mean anything while a tournament exists, so anything else lands on setup -
     * which is what stops a forward button after a reset showing an empty shell.
     */
    applyHistoryState(view) {
        let next = VIEWS.includes(view) ? view : 'setup';

        if (next !== 'setup' && !state.tournamentCreated) {
            next = 'setup';
            window.history.replaceState({view: next}, '', '#' + next);
        }

        state.currentView = next;
    },

    goToSetup() {
        window.history.back();
    },

    goToTournament() {
        state.tournamentCreated = true;
        state.currentView = 'tournament';
        window.history.pushState({view: 'tournament'}, '', '#tournament');
    },

    goToLeaderboard() {
        state.currentView = 'leaderboard';
        window.history.pushState({view: 'leaderboard'}, '', '#leaderboard');
    },

    closeLeaderboard() {
        window.history.back();
    },

    /**
     * Wipe everything: the tournament, the setup form and both storage keys.
     */
    resetAll() {
        localStorage.removeItem(TOURNAMENT_DATA_KEY);
        localStorage.removeItem(TOURNAMENT_CONFIG_KEY);
        this.resetState(null);
        window.history.replaceState({view: 'setup'}, '', '#setup');
    },

    resetState(defaultState) {
        Object.assign(state, defaultState === null ? defaults() : defaultState);
    },
};
