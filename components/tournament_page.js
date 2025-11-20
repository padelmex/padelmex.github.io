import { Tournament } from '../tournament.js';
import { store } from '../store.js';

export default {
    template: `
        <div class="tournament-page">
            <div class="tournament-page__header">
                <h1>Tournament</h1>
                <a
                    class="link-danger"
                    @click="confirmReset"
                    href="#"
                >
                    Reset Tournament
                </a>
            </div>

            <div v-if="showLeaderboard" class="leaderboard">
                <div class="leaderboard__header">
                    <h2>Leaderboard</h2>
                    <button class="button-with-border" @click="closeLeaderboard">Close</button>
                </div>
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
                        <tr v-for="(player, index) in leaderboard" :key="player.name">
                            <td>{{ index + 1 }}</td>
                            <td class="leaderboard__name">{{ player.name }}</td>
                            <td class="leaderboard__points">{{ player.points }}</td>
                            <td>{{ player.gamesPlayed }}</td>
                            <td>{{ player.wins }}/{{ player.losses }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-else-if="tournament" class="rounds-container">
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

                    <div class="round__games">
                        <div
                            v-for="(game, gameIndex) in round.games"
                            :key="gameIndex"
                            class="game"
                        >
                            <div class="game__court">{{ game.court }}</div>

                            <div class="game__teams">
                                <div class="game__team game__team--1">
                                    <div class="game__players">
                                        <span>{{ game.team1[0] }}</span>
                                        <span>{{ game.team1[1] }}</span>
                                    </div>
                                    <input
                                        type="number"
                                        class="game__score"
                                        v-model.number="game.score1"
                                        @blur="onScore1Change(roundIndex, gameIndex)"
                                        @input="onScoreInput(roundIndex, gameIndex)"
                                        :disabled="isRoundFrozen(roundIndex)"
                                        min="0"
                                        placeholder="0"
                                        inputmode="numeric"
                                    />
                                </div>

                                <div class="game__vs">vs</div>

                                <div class="game__team game__team--2">
                                    <input
                                        type="number"
                                        class="game__score"
                                        v-model.number="game.score2"
                                        @blur="onScore2Change(roundIndex, gameIndex)"
                                        @input="onScoreInput(roundIndex, gameIndex)"
                                        :disabled="isRoundFrozen(roundIndex)"
                                        min="0"
                                        placeholder="0"
                                        inputmode="numeric"
                                    />
                                    <div class="game__players">
                                        <span>{{ game.team2[0] }}</span>
                                        <span>{{ game.team2[1] }}</span>
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
                    </div>

                    <div
                        v-if="getBenchPlayers(roundIndex).length > 0"
                        class="section-note"
                    >
                        On bench: {{ getBenchPlayers(roundIndex).join(', ') }}
                    </div>

                    <button
                        v-if="roundIndex === tournament.rounds.length - 1"
                        class="button-primary button-large round__save-button"
                        @click="createNextRound"
                        :disabled="!canCreateNextRound"
                    >
                        Save Round
                    </button>
                </div>

                <div class="tournament-actions">
                    <button
                        class="button-with-border button-large"
                        @click="showLeaderboard = true"
                    >
                        Show Leaderboard
                    </button>
                </div>
            </div>
        </div>
    `,

    data() {
        return {
            store,
            tournament: null,
            scoreErrors: {},
            scoreWarnings: {},
            showLeaderboard: false,
            leaderboard: []
        };
    },

    computed: {
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
            const allScoresEntered = lastRound.games.every(game => {
                // Require explicit values (including 0) - empty string, null, undefined, or NaN not allowed
                const score1Valid = game.score1 !== null && game.score1 !== '' &&
                                   game.score1 !== undefined && !isNaN(game.score1);
                const score2Valid = game.score2 !== null && game.score2 !== '' &&
                                   game.score2 !== undefined && !isNaN(game.score2);
                return score1Valid && score2Valid;
            });

            return allScoresEntered;
        }
    },

    methods: {
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

        initTournament() {
            // Check if we have saved tournament data
            const savedData = localStorage.getItem('tournament-data');

            if (savedData) {
                try {
                    const data = JSON.parse(savedData);
                    this.tournament = Tournament.fromJSON(data);
                } catch (e) {
                    console.error('Failed to restore tournament:', e);
                    this.createNewTournament();
                }
            } else {
                this.createNewTournament();
            }
        },

        createNewTournament() {
            this.tournament = new Tournament({
                players: store.state.players,
                courts: store.state.courts,
                pointsPerMatch: store.state.pointsPerMatch,
                randomize: store.state.randomize
            });
            this.saveTournament();
        },

        saveTournament() {
            if (this.tournament) {
                localStorage.setItem('tournament-data', JSON.stringify(this.tournament.toJSON()));
            }
        },

        onScoreInput(roundIndex, gameIndex) {
            const key = roundIndex + '-' + gameIndex;
            // Clear messages while typing
            delete this.scoreErrors[key];
            delete this.scoreWarnings[key];
        },

        onScore1Change(roundIndex, gameIndex) {
            const game = this.tournament.rounds[roundIndex].games[gameIndex];
            const key = roundIndex + '-' + gameIndex;

            // Clear previous messages
            delete this.scoreErrors[key];
            delete this.scoreWarnings[key];

            // Auto-calculate score2 if it's empty and score1 has a value
            if ((game.score1 !== null && game.score1 !== '') && (game.score2 === null || game.score2 === '')) {
                const score1 = Number(game.score1);
                if (score1 >= 0 && score1 <= this.store.state.pointsPerMatch) {
                    game.score2 = this.store.state.pointsPerMatch - score1;
                }
            }

            this.validateAndSaveScore(roundIndex, gameIndex);
        },

        onScore2Change(roundIndex, gameIndex) {
            const game = this.tournament.rounds[roundIndex].games[gameIndex];
            const key = roundIndex + '-' + gameIndex;

            // Clear previous messages
            delete this.scoreErrors[key];
            delete this.scoreWarnings[key];

            // Auto-calculate score1 if it's empty and score2 has a value
            if ((game.score2 !== null && game.score2 !== '') && (game.score1 === null || game.score1 === '')) {
                const score2 = Number(game.score2);
                if (score2 >= 0 && score2 <= this.store.state.pointsPerMatch) {
                    game.score1 = this.store.state.pointsPerMatch - score2;
                }
            }

            this.validateAndSaveScore(roundIndex, gameIndex);
        },

        validateAndSaveScore(roundIndex, gameIndex) {
            const game = this.tournament.rounds[roundIndex].games[gameIndex];
            const key = roundIndex + '-' + gameIndex;

            // Only validate if both scores are entered
            if (game.score1 !== null && game.score1 !== '' && game.score2 !== null && game.score2 !== '') {
                const score1 = Number(game.score1);
                const score2 = Number(game.score2);

                // Error: negative scores
                if (score1 < 0 || score2 < 0) {
                    this.scoreErrors[key] = 'Scores cannot be negative';
                    return;
                }

                // Error: scores add up to more than pointsPerMatch
                if (score1 + score2 > this.store.state.pointsPerMatch) {
                    this.scoreErrors[key] = `Scores cannot add up to more than ${this.store.state.pointsPerMatch}`;
                    return;
                }

                // Warning: scores add up to less than pointsPerMatch
                if (score1 + score2 < this.store.state.pointsPerMatch) {
                    this.scoreWarnings[key] = `Scores add up to ${score1 + score2} (expected ${this.store.state.pointsPerMatch})`;
                }

                // Valid score - update tournament
                try {
                    this.tournament.updateScore(roundIndex, gameIndex, score1, score2);
                    this.saveTournament();
                } catch (e) {
                    this.scoreErrors[key] = e.message;
                }
            }
        },

        isRoundComplete(roundIndex) {
            return this.tournament.isRoundComplete(roundIndex);
        },

        getBenchPlayers(roundIndex) {
            return this.tournament.getBenchPlayers(roundIndex);
        },

        createNextRound() {
            if (!this.canCreateNextRound) return;

            try {
                this.tournament.createNextRound();
                this.saveTournament();

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
            if (!confirm('Are you sure you want to undo Round ' + this.tournament.rounds.length + '? This cannot be undone.')) {
                return;
            }

            try {
                this.tournament.undoLastRound();
                this.saveTournament();

                // Clear any errors for the removed round
                const keysToRemove = Object.keys(this.scoreErrors).filter(key =>
                    key.startsWith(this.tournament.rounds.length + '-')
                );
                keysToRemove.forEach(key => delete this.scoreErrors[key]);
            } catch (e) {
                alert('Failed to undo round: ' + e.message);
            }
        },

        closeLeaderboard() {
            this.showLeaderboard = false;
        },

        updateLeaderboard() {
            if (this.tournament) {
                this.leaderboard = this.tournament.getLeaderboard(true);
            }
        },

        confirmReset() {
            if (!confirm(
                'Are you sure you want to COMPLETELY RESET the tournament?\n\n' +
                'This will delete ALL rounds, scores, and data.\n' +
                'This action CANNOT be undone!'
            )) {
                return;
            }

            this.resetTournament();
        },

        resetTournament() {
            localStorage.removeItem('tournament-data');
            localStorage.removeItem('tournament-config');
            store.resetTournament();
        }
    },

    watch: {
        showLeaderboard(newVal) {
            if (newVal) {
                this.updateLeaderboard();
            }
        }
    },

    mounted() {
        this.initTournament();

        // Auto-update leaderboard data periodically
        this.leaderboardInterval = setInterval(() => {
            if (this.showLeaderboard) {
                this.updateLeaderboard();
            }
        }, 1000);
    },

    beforeUnmount() {
        if (this.leaderboardInterval) {
            clearInterval(this.leaderboardInterval);
        }
    }
};
