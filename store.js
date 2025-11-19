import {reactive} from 'vue';

const state = reactive({
    /**
     * @type {Array}
     */
    players: [],
    /**
     * @type {Array}
     */
    matches: [],
});

export const store = {
    state,

    updatePlayers(players) {
        state.players = players;
    },

    updateMatches(matches) {
        state.matches = matches;
    },

    resetState(defaultState) {
        if (defaultState === null) {
            state.players = [];
            state.matches = [];
        } else {
            Object.assign(state, defaultState);
        }
    },
};
