import {reactive} from 'vue';

const state = reactive({
    /**
     * @type {number}
     */
    pointsPerMatch: 16,
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
    randomize: false,
    /**
     * @type {boolean}
     */
    tournamentCreated: false,
    /**
     * @type {Array}
     */
    matches: [],
    /**
     * @type {string}
     */
    currentView: 'setup',
});

export const store = {
    state,

    updateConfig(config) {
        Object.assign(state, config);
    },

    createTournament() {
        state.tournamentCreated = true;
        state.currentView = 'tournament';
    },

    resetTournament() {
        state.tournamentCreated = false;
        state.currentView = 'setup';
    },

    setView(view) {
        state.currentView = view;
    },

    resetState(defaultState) {
        if (defaultState === null) {
            state.pointsPerMatch = 16;
            state.players = [];
            state.courts = [];
            state.randomize = false;
            state.tournamentCreated = false;
            state.matches = [];
            state.currentView = 'setup';
        } else {
            Object.assign(state, defaultState);
        }
    },
};
