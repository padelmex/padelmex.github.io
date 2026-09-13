import { Tournament } from '../tournament.js';
import { store, TOURNAMENT_DATA_KEY } from '../store.js';

/**
 * Where unreadable saved data is parked instead of being overwritten
 */
const CORRUPT_DATA_KEY = 'tournament-data-broken';

export default {
    template: `
        <div class="tournament-page">
            <template v-if="isLeaderboard">
                <div class="tournament-page__header">
                    <h1>Leaderboard</h1>
                    <button class="button-with-border button-small" @click="closeLeaderboard">Close</button>
                </div>
                <div class="leaderboard">
                    <table class="leaderboard__table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Player</th>
                                <th>Points</th>
                                <th>Games</th>
                                <th>W/L</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(player, index) in leaderboard"
                                :key="player.name"
                                :class="{ 'leaderboard__row--inactive': player.active === false }"
                            >
                                <td>{{ index + 1 }}</td>
                                <td class="leaderboard__name">{{ player.name }}</td>
                                <td class="leaderboard__points">{{ player.points }}</td>
                                <td>{{ player.gamesPlayed }}</td>
                                <td>{{ player.wins }}/{{ player.losses }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-if="hasDepartedPlayers" class="section-note">
                        Greyed out players have left the tournament and keep the points they earned.
                    </div>
                </div>
            </template>

            <template v-else>
                <div class="tournament-page__header">
                    <h1>Tournament</h1>
                    <div class="tournament-page__actions">
                        <button type="button" class="link-action" @click="goToSetup">
                            <span class="link-action__label">Edit</span>
                        </button>
                        <button type="button" class="link-action link-danger" @click="confirmReset">
                            <span class="link-action__label">Reset</span>
                        </button>
                    </div>
                </div>

                <div v-if="restoreNotice" class="button-hint">
                    {{ restoreNotice }}
                </div>

                <div v-if="tournament" class="rounds-container">
                    <div
                        v-for="(round, roundIndex) in tournament.rounds"
                        :key="roundIndex"
                        class="round"
                        :class="{ 'round--complete': isRoundFrozen(roundIndex) }"
                    >
                        <div class="round__header">
                            <h2 class="round__title">Round {{ roundIndex + 1 }}</h2>
                            <button
                                v-if="roundIndex === tournament.rounds.length - 1 && tournament.rounds.length > 1"
                                class="button-with-border button-small"
                                @click="undoLastRound"
                            >
                                Edit previous round
                            </button>
                        </div>

                        <form class="round__games" @submit.prevent="onRoundSubmit">
                            <div
                                v-for="(game, gameIndex) in round.games"
                                :key="gameIndex"
                                class="game"
                            >
                                <div class="game__court">{{ game.court }}</div>

                                <div class="game__teams">
                                    <div class="game__team game__team--1">
                                        <div class="game__players">
                                            <span v-for="name in game.team1" :key="name">{{ name }}</span>
                                            <span v-if="game.team1.length === 1" class="game__alone">alone</span>
                                        </div>
                                        <input
                                            type="number"
                                            class="game__score"
                                            :class="{ 'game__score--warning': !!getScoreWarning(roundIndex, gameIndex) }"
                                            v-model.number="game.score1"
                                            :aria-label="scoreLabel(game, 1)"
                                            @blur="onScoreBlur(roundIndex, gameIndex)"
                                            @input="onScoreInput(roundIndex, gameIndex)"
                                            @keydown.enter.prevent="focusNextScore"
                                            :disabled="isRoundFrozen(roundIndex)"
                                            min="0"
                                            step="1"
                                            placeholder="–"
                                            inputmode="numeric"
                                            autocomplete="off"
                                            enterkeyhint="next"
                                        />
                                    </div>

                                    <div class="game__vs">vs</div>

                                    <div class="game__team game__team--2">
                                        <input
                                            type="number"
                                            class="game__score"
                                            :class="{ 'game__score--warning': !!getScoreWarning(roundIndex, gameIndex) }"
                                            v-model.number="game.score2"
                                            :aria-label="scoreLabel(game, 2)"
                                            @blur="onScoreBlur(roundIndex, gameIndex)"
                                            @input="onScoreInput(roundIndex, gameIndex)"
                                            @keydown.enter.prevent="focusNextScore"
                                            :disabled="isRoundFrozen(roundIndex)"
                                            min="0"
                                            step="1"
                                            placeholder="–"
                                            inputmode="numeric"
                                            autocomplete="off"
                                            :enterkeyhint="isLastGame(round, gameIndex) ? 'done' : 'next'"
                                        />
                                        <div class="game__players">
                                            <span v-for="name in game.team2" :key="name">{{ name }}</span>
                                            <span v-if="game.team2.length === 1" class="game__alone">alone</span>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    v-if="getScoreError(roundIndex, gameIndex)"
                                    class="game__error"
                                >
                                    {{ getScoreError(roundIndex, gameIndex) }}
                                </div>
                                <div
                                    v-else-if="getScoreWarning(roundIndex, gameIndex)"
                                    class="game__warning"
                                >
                                    {{ getScoreWarning(roundIndex, gameIndex) }}
                                </div>
                            </div>

                            <div
                                v-if="getBenchPlayers(roundIndex).length > 0"
                                class="section-note"
                            >
                                Resting: {{ getBenchPlayers(roundIndex).join(', ') }}
                            </div>

                            <div
                                v-if="configNotice && roundIndex === tournament.rounds.length - 1"
                                class="button-info"
                            >
                                {{ configNotice }}
                            </div>

                            <template v-if="roundIndex === tournament.rounds.length - 1">
                                <button
                                    type="submit"
                                    class="button-primary button-large round__save-button"
                                    :disabled="!canCreateNextRound"
                                >
                                    Save Round
                                </button>
                                <div v-if="saveBlockedReason" class="button-info">
                                    {{ saveBlockedReason }}
                                </div>
                            </template>
                        </form>
                    </div>

                    <div class="tournament-actions">
                        <button
                            class="button-with-border button-large"
                            @click="showLeaderboard"
                        >
                            Show Leaderboard
                        </button>
                    </div>
                </div>
            </template>
        </div>
    `,

    data() {
        return {
            store,
            tournament: null,
            scoreErrors: {},
            scoreWarnings: {},
            leaderboard: [],
            configNotice: null,
            restoreNotice: null
        };
    },

    computed: {
        isLeaderboard() {
            return store.state.currentView === 'leaderboard';
        },

        hasDepartedPlayers() {
            return this.leaderboard.some(entry => entry.active === false);
        },

        canCreateNextRound() {
            if (!this.tournament) return false;
            // Allow creating first round if no rounds exist
            if (this.tournament.rounds.length === 0) return true;

            const lastRoundIndex = this.tournament.rounds.length - 1;
            const lastRound = this.tournament.rounds[lastRoundIndex];

            // Check if there are any score errors in the current round
            const hasErrors = Object.keys(this.scoreErrors).some(key =>
                key.startsWith(lastRoundIndex + '-')
            );
            if (hasErrors) return false;

            // Check if all scores are explicitly entered (not null or empty string)
            return lastRound.games.every(game =>
                this.hasScore(game.score1) && this.hasScore(game.score2)
            );
        },

        /**
         * A disabled button with no explanation is the commonest way to strand
         * someone, so the round says what it is still waiting for.
         */
        saveBlockedReason() {
            if (!this.tournament || this.canCreateNextRound) return null;

            const lastRoundIndex = this.tournament.rounds.length - 1;
            const hasErrors = Object.keys(this.scoreErrors).some(key =>
                key.startsWith(lastRoundIndex + '-')
            );
            if (hasErrors) {
                return 'Fix the score marked in red to save this round.';
            }

            const missing = this.tournament.rounds[lastRoundIndex].games.filter(game =>
                !this.hasScore(game.score1) || !this.hasScore(game.score2)
            ).length;
            if (missing === 0) return null;

            return missing === 1
                ? 'One game still needs both its scores before the round can be saved.'
                : `${missing} games still need their scores before the round can be saved.`;
        }
    },

    methods: {
        /**
         * Score boxes carry no visible label of their own - the names beside them do
         * the work visually, but a screen reader reads the box on its own.
         */
        scoreLabel(game, team) {
            const players = team === 1 ? game.team1 : game.team2;
            return `Score for ${players.join(' and ')} on ${game.court}`;
        },

        hasScore(value) {
            return value !== null && value !== undefined && value !== '' && !isNaN(value);
        },

        getScoreError(roundIndex, gameIndex) {
            return this.scoreErrors[roundIndex + '-' + gameIndex];
        },

        getScoreWarning(roundIndex, gameIndex) {
            return this.scoreWarnings[roundIndex + '-' + gameIndex];
        },

        isRoundFrozen(roundIndex) {
            // Only the last round is editable, all previous rounds are frozen
            if (!this.tournament) return false;
            return roundIndex < this.tournament.rounds.length - 1;
        },

        isLastGame(round, gameIndex) {
            return gameIndex === round.games.length - 1;
        },

        initTournament() {
            // Check if we have saved tournament data
            const savedData = localStorage.getItem(TOURNAMENT_DATA_KEY);

            if (savedData) {
                try {
                    this.tournament = Tournament.fromJSON(JSON.parse(savedData));
                } catch (e) {
                    console.error('Failed to restore tournament:', e);
                    // Starting over is the only option, but the unreadable data is the
                    // only copy of the session that exists - keep it and say so, rather
                    // than overwriting it with a fresh tournament in silence.
                    this.keepCorruptedData(savedData);
                    this.createNewTournament();
                    this.restoreNotice =
                        'The saved tournament could not be read, so a new one has been started. ' +
                        'The unreadable data has been kept in this browser under ' +
                        '"tournament-data-broken" in case it can be recovered.';
                }
            } else {
                this.createNewTournament();
            }
        },

        keepCorruptedData(raw) {
            try {
                localStorage.setItem(CORRUPT_DATA_KEY, raw);
            } catch (e) {
                console.error('Could not keep a copy of the unreadable tournament:', e);
            }
        },

        /**
         * Nothing playable to show - fall back to setup rather than leave an empty screen
         */
        abandonToSetup() {
            store.resetAll();
        },

        createNewTournament() {
            try {
                this.tournament = new Tournament(store.getConfig());
                this.saveTournament();
            } catch (e) {
                console.error('Cannot start a tournament from the saved setup:', e);
                this.abandonToSetup();
            }
        },

        saveTournament() {
            if (this.tournament) {
                localStorage.setItem(TOURNAMENT_DATA_KEY, JSON.stringify(this.tournament.toJSON()));
            }
        },

        /**
         * Apply a setup change the user just saved. Played rounds keep their scores;
         * the current round is re-drawn only while nothing has been entered into it.
         */
        applyStoreConfig() {
            store.clearConfigDirty();

            try {
                const result = this.tournament.applyConfig(store.getConfig());
                this.saveTournament();
                this.scoreErrors = {};
                this.scoreWarnings = {};

                if (!result.currentRoundRedrawn) {
                    const current = this.tournament.rounds.length;
                    this.configNotice = `Round ${current} already has scores, so it is unchanged. ` +
                        `Your changes apply from Round ${current + 1}.`;
                }
            } catch (e) {
                alert('Could not apply the changes: ' + e.message);
            }
        },

        /**
         * Keep the setup form in step with the tournament that is actually running,
         * so Edit always opens on the real roster.
         */
        syncStoreFromTournament() {
            store.updateConfig({
                pointsPerMatch: this.tournament.pointsPerMatch,
                players: [...this.tournament.players],
                courts: [...this.tournament.courts],
                randomize: this.tournament.randomize
            });
            store.persistConfig();
        },

        onScoreInput(roundIndex, gameIndex) {
            const key = roundIndex + '-' + gameIndex;
            // Clear messages while typing
            delete this.scoreErrors[key];
            delete this.scoreWarnings[key];
        },

        onScoreBlur(roundIndex, gameIndex) {
            const game = this.tournament.rounds[roundIndex].games[gameIndex];

            // An empty number input models as '', which must never reach the stored
            // round - the leaderboard would add it as a string.
            if (!this.hasScore(game.score1)) game.score1 = null;
            if (!this.hasScore(game.score2)) game.score2 = null;

            this.validateAndSaveScore(roundIndex, gameIndex);

            // Keep half-entered rounds too, so leaving the screen never loses a number
            this.saveTournament();
        },

        /**
         * Record the score. A total that misses the target is a warning, never a block:
         * games do end early and whoever was on court is the authority.
         */
        validateAndSaveScore(roundIndex, gameIndex) {
            const game = this.tournament.rounds[roundIndex].games[gameIndex];
            const key = roundIndex + '-' + gameIndex;

            delete this.scoreErrors[key];
            delete this.scoreWarnings[key];

            // Only validate once both scores are entered
            if (!this.hasScore(game.score1) || !this.hasScore(game.score2)) {
                return;
            }

            const score1 = Number(game.score1);
            const score2 = Number(game.score2);

            if (score1 < 0 || score2 < 0) {
                this.scoreErrors[key] = 'Scores cannot be negative';
                return;
            }

            if (!Number.isInteger(score1) || !Number.isInteger(score2)) {
                this.scoreErrors[key] = 'Scores must be whole numbers';
                return;
            }

            const target = this.tournament.getPointsTarget(roundIndex);
            const total = score1 + score2;
            if (total !== target) {
                this.scoreWarnings[key] = `Scores add up to ${total} (expected ${target})`;
            }

            try {
                this.tournament.updateScore(roundIndex, gameIndex, score1, score2);
                this.saveTournament();
            } catch (e) {
                this.scoreErrors[key] = e.message;
            }
        },

        /**
         * Re-derive the messages for every saved score, so a reload does not hide a
         * total that misses its target.
         */
        refreshScoreMessages() {
            if (!this.tournament) return;

            this.tournament.rounds.forEach((round, roundIndex) => {
                round.games.forEach((game, gameIndex) => {
                    if (this.hasScore(game.score1) && this.hasScore(game.score2)) {
                        this.validateAndSaveScore(roundIndex, gameIndex);
                    }
                });
            });
        },

        /**
         * Move through the score inputs in the order they appear, so the phone
         * keyboard's next button walks the round.
         */
        focusNextScore(event) {
            const form = event.target.closest('form');
            if (!form) return;

            const inputs = Array.from(form.querySelectorAll('input.game__score:not([disabled])'));
            const index = inputs.indexOf(event.target);

            if (index >= 0 && index < inputs.length - 1) {
                const next = inputs[index + 1];
                next.focus();
                next.select();
                return;
            }

            event.target.blur();
            this.onRoundSubmit();
        },

        onRoundSubmit() {
            if (!this.canCreateNextRound) return;
            this.createNextRound();
        },

        getBenchPlayers(roundIndex) {
            return this.tournament.getBenchPlayers(roundIndex);
        },

        createNextRound() {
            try {
                this.tournament.createNextRound();
                this.saveTournament();
                this.configNotice = null;

                // Scroll to bottom to show new round
                this.$nextTick(() => {
                    window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: 'smooth'
                    });
                });
            } catch (e) {
                alert('Failed to create next round: ' + e.message);
            }
        },

        undoLastRound() {
            const roundNumber = this.tournament.rounds.length;
            const scored = this.tournament.roundHasScores(roundNumber - 1);

            if (!confirm(
                'Remove Round ' + roundNumber + ' so that Round ' + (roundNumber - 1) + ' can be edited again?\n\n' +
                (scored
                    ? 'The scores already entered into Round ' + roundNumber + ' will be lost.\n'
                    : '') +
                'This cannot be undone.'
            )) {
                return;
            }

            try {
                const removedIndex = this.tournament.rounds.length - 1;
                this.tournament.undoLastRound();
                this.saveTournament();
                // The notice names a round that has just stopped existing
                this.configNotice = null;

                // Clear any messages for the removed round
                [this.scoreErrors, this.scoreWarnings].forEach(messages => {
                    Object.keys(messages)
                        .filter(key => key.startsWith(removedIndex + '-'))
                        .forEach(key => delete messages[key]);
                });
            } catch (e) {
                alert('Failed to undo round: ' + e.message);
            }
        },

        goToSetup() {
            store.goToSetup();
        },

        showLeaderboard() {
            store.goToLeaderboard();
        },

        closeLeaderboard() {
            store.closeLeaderboard();
        },

        updateLeaderboard() {
            if (this.tournament) {
                this.leaderboard = this.tournament.getLeaderboard(true);
            }
        },

        confirmReset() {
            if (!confirm(
                'Are you sure you want to COMPLETELY RESET the tournament?\n\n' +
                'This will delete ALL rounds, scores, players and courts.\n' +
                'This action CANNOT be undone!'
            )) {
                return;
            }

            store.resetAll();
        }
    },

    watch: {
        // The leaderboard can also be entered by the browser's forward button
        isLeaderboard(isOpen) {
            if (isOpen) {
                this.updateLeaderboard();
            }
        }
    },

    mounted() {
        this.initTournament();

        if (store.state.configDirty) {
            this.applyStoreConfig();
        } else {
            // The saved tournament is the authority on what is running
            this.syncStoreFromTournament();
        }

        this.refreshScoreMessages();

        // The leaderboard can be the opening view after a reload
        if (this.isLeaderboard) {
            this.updateLeaderboard();
        }
    }
};
