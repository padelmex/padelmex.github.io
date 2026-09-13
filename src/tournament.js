/**
 * Mulberry32 - High-quality seeded random number generator
 * Much better statistical properties than LCG, no correlation between consecutive seeds
 */
class Mulberry32 {
    constructor(seed) {
        // Mix the seed using a hash function to avoid correlation with consecutive seeds
        seed = seed >>> 0; // Ensure unsigned 32-bit integer
        seed = seed ^ (seed >>> 16);
        seed = Math.imul(seed, 0x7feb352d);
        seed = seed ^ (seed >>> 15);
        seed = Math.imul(seed, 0x846ca68b);
        seed = seed ^ (seed >>> 16);
        this.seed = seed >>> 0;
    }

    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

/**
 * Smallest playable court: one player against two
 */
export const MIN_PLAYERS = 3;

/**
 * Seed used for tournaments saved before the seed was persisted, so that
 * upgrading mid-session does not reshuffle a draw that is already in progress.
 */
const LEGACY_SEED = 1;

/**
 * Work out how to seat players on courts for one round.
 *
 * Courts of four are preferred; courts of three (one player against two) are used
 * whenever that lets more people play. Anyone who cannot be seated rests.
 *
 * See docs/player-counts.md for the reasoning and the full tables.
 *
 * @param {number} playerCount - Players available this round
 * @param {number} courtCount - Courts available
 * @returns {{seated: number, courtsUsed: number, quads: number, trios: number}}
 */
export function computeSeating(playerCount, courtCount) {
    const empty = {seated: 0, courtsUsed: 0, quads: 0, trios: 0};
    if (!(playerCount > 0) || !(courtCount > 0)) {
        return empty;
    }

    // Take the largest number of players that actually fits, seated on as few
    // courts as possible - which is the same as using as few trios as possible.
    const capacity = Math.min(playerCount, courtCount * 4);
    for (let seated = capacity; seated >= MIN_PLAYERS; seated--) {
        const courtsUsed = Math.ceil(seated / 4);
        if (courtsUsed <= courtCount && courtsUsed * 3 <= seated) {
            const trios = courtsUsed * 4 - seated;
            return {seated, courtsUsed, quads: courtsUsed - trios, trios};
        }
    }
    return empty;
}

/**
 * Whether a score field holds an actual value (0 counts, empty does not)
 */
function hasScore(value) {
    return value !== null && value !== undefined && value !== '';
}

/**
 * Tournament class for managing Padel Mexicano tournaments
 */
export class Tournament {
    /**
     * Validate tournament configuration
     * @param {Object} config - Tournament configuration
     * @throws {Error} If configuration is invalid
     */
    validateConfig(config) {
        // Check if config exists
        if (!config) {
            throw new Error('Configuration is required');
        }

        // Validate players
        if (!Array.isArray(config.players)) {
            throw new Error('Players must be an array');
        }
        if (config.players.length === 0) {
            throw new Error('At least one player is required');
        }
        if (config.players.length < MIN_PLAYERS) {
            throw new Error('At least ' + MIN_PLAYERS + ' players are required');
        }
        // Check for empty player names
        const emptyPlayers = config.players.filter(p => !p || typeof p !== 'string' || p.trim() === '');
        if (emptyPlayers.length > 0) {
            throw new Error('All players must have non-empty names');
        }
        // Check for duplicate player names (case-insensitive)
        const playerNames = config.players.map(p => p.trim().toLowerCase());
        if (new Set(playerNames).size !== playerNames.length) {
            throw new Error('Player names must be unique');
        }

        // Validate courts
        if (!Array.isArray(config.courts)) {
            throw new Error('Courts must be an array');
        }
        if (config.courts.length === 0) {
            throw new Error('At least one court is required');
        }
        // Check for empty court names
        const emptyCourts = config.courts.filter(c => !c || typeof c !== 'string' || c.trim() === '');
        if (emptyCourts.length > 0) {
            throw new Error('All courts must have non-empty names');
        }
        // Check for duplicate court names (case-insensitive)
        const courtNames = config.courts.map(c => c.trim().toLowerCase());
        if (new Set(courtNames).size !== courtNames.length) {
            throw new Error('Court names must be unique');
        }

        // Validate pointsPerMatch
        if (typeof config.pointsPerMatch !== 'number') {
            throw new Error('Points per match must be a number');
        }
        if (config.pointsPerMatch <= 0) {
            throw new Error('Points per match must be greater than 0');
        }
        if (!Number.isInteger(config.pointsPerMatch)) {
            throw new Error('Points per match must be an integer');
        }

        // Validate randomize
        if (typeof config.randomize !== 'boolean') {
            throw new Error('Randomize must be a boolean');
        }
    }

    /**
     * @param {Object} config
     * @param {Array<string>} config.players - Player names
     * @param {Array<string>} config.courts - Court names
     * @param {number} config.pointsPerMatch - Total points per match
     * @param {boolean} config.randomize - Whether to randomize teams
     * @param {number} [config.seed] - Random seed; drawn once and then kept forever
     * @param {Array} [config.rounds] - Existing rounds, when restoring a saved tournament
     */
    constructor(config) {
        // Validate configuration
        this.validateConfig(config);

        this.players = [...config.players];
        this.courts = [...config.courts];
        this.pointsPerMatch = config.pointsPerMatch;
        this.randomize = config.randomize;

        // The seed is drawn once and never recomputed, so that every draw stays
        // reproducible even after the roster is edited. See docs/design-decisions.md.
        this.seed = Number.isInteger(config.seed)
            ? config.seed
            : Math.floor(Math.random() * 4294967296);

        /**
         * @type {Array<{pointsPerMatch: number, players: Array<string>, games: Array<{court: string, team1: Array<string>, team2: Array<string>, score1: number|null, score2: number|null}>}>}
         */
        this.rounds = [];

        if (Array.isArray(config.rounds)) {
            this.rounds = config.rounds;
        } else {
            // Create first round
            this.createNextRound();
        }
    }

    /**
     * How this round's players fit on the available courts
     * @param {number} playerCount
     */
    computeSeating(playerCount) {
        return computeSeating(playerCount, this.courts.length);
    }

    /**
     * Points target a round was drawn with, falling back to the tournament's
     * current setting for rounds saved before targets were recorded.
     * @param {number} roundIndex
     */
    getPointsTarget(roundIndex) {
        const round = this.rounds[roundIndex];
        if (round && typeof round.pointsPerMatch === 'number') {
            return round.pointsPerMatch;
        }
        return this.pointsPerMatch;
    }

    /**
     * How many games each player has been scheduled into, scores or not.
     * Distinct from the leaderboard's gamesPlayed, which only counts scored games.
     * @returns {Object<string, number>}
     */
    getScheduledGameCounts() {
        const counts = {};
        this.players.forEach(player => {
            counts[player] = 0;
        });

        this.rounds.forEach(round => {
            round.games.forEach(game => {
                [...game.team1, ...game.team2].forEach(player => {
                    counts[player] = (counts[player] || 0) + 1;
                });
            });
        });

        return counts;
    }

    /**
     * How many times each player has played alone against two opponents
     * @returns {Object<string, number>}
     */
    getSoloCounts() {
        const counts = {};
        this.players.forEach(player => {
            counts[player] = 0;
        });

        this.rounds.forEach(round => {
            round.games.forEach(game => {
                [game.team1, game.team2].forEach(team => {
                    if (team.length === 1) {
                        counts[team[0]] = (counts[team[0]] || 0) + 1;
                    }
                });
            });
        });

        return counts;
    }

    /**
     * The round each player last played alone in, or -1 if they never have
     * @returns {Object<string, number>}
     */
    getLastSoloRounds() {
        const lastRound = {};
        this.players.forEach(player => {
            lastRound[player] = -1;
        });

        this.rounds.forEach((round, roundIndex) => {
            round.games.forEach(game => {
                [game.team1, game.team2].forEach(team => {
                    if (team.length === 1) {
                        lastRound[team[0]] = roundIndex;
                    }
                });
            });
        });

        return lastRound;
    }

    /**
     * Pick who plays alone on a court of three: whoever has done it least often,
     * and of those, whoever did it longest ago. Courts are drawn independently, so
     * the second criterion is what stops the role drifting towards one player.
     * @param {Array<string>} courtPlayers
     * @returns {string}
     */
    pickSoloPlayer(courtPlayers) {
        const soloCounts = this.getSoloCounts();
        const lastSolo = this.getLastSoloRounds();

        return courtPlayers.reduce((best, player) => {
            const byCount = (soloCounts[player] || 0) - (soloCounts[best] || 0);
            if (byCount !== 0) {
                return byCount < 0 ? player : best;
            }
            const lastPlayer = lastSolo[player] === undefined ? -1 : lastSolo[player];
            const lastBest = lastSolo[best] === undefined ? -1 : lastSolo[best];
            return lastPlayer < lastBest ? player : best;
        }, courtPlayers[0]);
    }

    /**
     * Get players who should play next. Whoever has played the most games rests,
     * so games played stays within one across the field.
     */
    getPlayersForNextRound() {
        const {seated} = this.computeSeating(this.players.length);

        // Everyone fits
        if (this.players.length <= seated) {
            return [...this.players];
        }

        const played = this.getScheduledGameCounts();
        // Rotate the tie-break with the round number so the same player does not
        // keep losing it.
        const rotation = this.rounds.length;

        return this.players
            .map((player, index) => ({
                player,
                played: played[player] || 0,
                tie: (index + rotation) % this.players.length
            }))
            .sort((a, b) => a.played - b.played || a.tie - b.tie)
            .slice(0, seated)
            .map(entry => entry.player);
    }

    /**
     * Players per court for one round, in ladder order. Courts of four lead, but the
     * pattern rotates each round so the solo role travels through the whole field.
     * @param {number} courtsUsed
     * @param {number} quads - Courts of four
     * @param {number} trios - Courts of three
     * @param {number} currentRound
     * @returns {Array<number>}
     */
    getGroupSizes(courtsUsed, quads, trios, currentRound) {
        const sizes = [];
        for (let i = 0; i < quads; i++) sizes.push(4);
        for (let i = 0; i < trios; i++) sizes.push(3);

        if (quads === 0 || trios === 0) {
            return sizes;
        }

        const offset = currentRound % courtsUsed;
        return sizes.map((_, i) => sizes[(i - offset + courtsUsed) % courtsUsed]);
    }

    /**
     * Create games for the next round
     */
    createNextRound() {
        const currentRound = this.rounds.length;

        // For first round, use original player order
        // For subsequent rounds, sort by leaderboard
        let sortedPlayers;
        if (currentRound === 0) {
            sortedPlayers = [...this.players];
        } else {
            // Get leaderboard and extract player names in ranking order
            const leaderboard = this.getLeaderboard();
            sortedPlayers = leaderboard.map(entry => entry.name);
        }

        // Filter to players who should play this round
        const activePlayers = this.getPlayersForNextRound();

        // Sort active players by their position in sortedPlayers (leaderboard)
        const rankedActivePlayers = activePlayers.sort((a, b) => {
            return sortedPlayers.indexOf(a) - sortedPlayers.indexOf(b);
        });

        // Fill courts in rank order, so the leaders play the leaders. Which court gets
        // the four rotates with the round, otherwise the top of the ladder would never
        // take a turn playing alone.
        const {courtsUsed, quads, trios} = this.computeSeating(rankedActivePlayers.length);
        const groupSizes = this.getGroupSizes(courtsUsed, quads, trios, currentRound);

        // Apply randomization if enabled
        let pairedPlayers;
        if (this.randomize && currentRound > 0) {
            // For randomization, slightly shuffle the middle pairs to avoid repetition
            // but keep top players mostly together
            pairedPlayers = this.applySmartRandomization(rankedActivePlayers, currentRound, groupSizes);
        } else {
            pairedPlayers = rankedActivePlayers;
        }

        // Create games for each court
        const games = [];
        let cursor = 0;
        for (let i = 0; i < courtsUsed; i++) {
            const size = groupSizes[i];
            const courtPlayers = pairedPlayers.slice(cursor, cursor + size);
            cursor += size;

            if (size === 4) {
                games.push({
                    court: this.courts[i],
                    team1: [courtPlayers[0], courtPlayers[2]],  // Players 1 & 3
                    team2: [courtPlayers[1], courtPlayers[3]],  // Players 2 & 4
                    score1: null,
                    score2: null
                });
            } else {
                // One player against two. The solo player is always team1.
                const solo = this.pickSoloPlayer(courtPlayers);
                games.push({
                    court: this.courts[i],
                    team1: [solo],
                    team2: courtPlayers.filter(player => player !== solo),
                    score1: null,
                    score2: null
                });
            }
        }

        // Record the roster too, so a past round's rest list never names someone who
        // had not joined yet.
        this.rounds.push({
            pointsPerMatch: this.pointsPerMatch,
            players: [...this.players],
            games
        });
    }

    /**
     * Apply smart randomization to prevent repetitive pairings
     * while maintaining competitive balance
     * @param {Array<string>} rankedPlayers
     * @param {number} currentRound
     * @param {Array<number>} groupSizes - Players on each court, 4 or 3
     */
    applySmartRandomization(rankedPlayers, currentRound, groupSizes) {
        // Create round-specific RNG for deterministic behavior
        const roundRng = new Mulberry32(this.seed + currentRound + 1000);

        const result = [...rankedPlayers];
        let startIdx = 0;

        for (const size of groupSizes) {
            if (size === 4) {
                // Teams are taken as positions 0 & 2 against 1 & 3, so there are only
                // three ways to split a court: 1&3 v 2&4, 1&4 v 2&3, and 1&2 v 3&4.
                // These two independent swaps pick evenly between the first two and
                // never produce the third.
                //
                // That is deliberate. 1&4 v 2&3 is the *most* even split of a court -
                // on an evenly spaced ladder the two sides are exactly equal - while
                // 1&2 v 3&4 stacks the top two against the bottom two and is the most
                // lopsided. Mixing the two balanced splits halves the average gap
                // between sides compared with the strict ranking, and still reaches
                // every partnership as the ladder moves underneath it.
                //
                // See docs/randomization.md for the measurements behind this.
                if (roundRng.next() > 0.5) {
                    [result[startIdx], result[startIdx + 1]] = [result[startIdx + 1], result[startIdx]];
                }

                if (roundRng.next() > 0.5) {
                    [result[startIdx + 2], result[startIdx + 3]] = [result[startIdx + 3], result[startIdx + 2]];
                }
            } else {
                // On a court of three the other two are partners either way, so the
                // shuffle only varies who wins the solo tie-break.
                const shuffled = roundRng.shuffle(result.slice(startIdx, startIdx + size));
                for (let i = 0; i < size; i++) {
                    result[startIdx + i] = shuffled[i];
                }
            }

            startIdx += size;
        }

        return result;
    }

    /**
     * Check if all games in a round are complete
     */
    isRoundComplete(roundIndex) {
        const round = this.rounds[roundIndex];
        if (!round) return false;

        // Must match what getLeaderboard() is willing to count. Checking only for
        // null let undefined and NaN through, so a round could report itself
        // complete while a game silently contributed nothing to anyone's total.
        return round.games.every(game =>
            Number.isFinite(game.score1) &&
            Number.isFinite(game.score2)
        );
    }

    /**
     * Whether any score has been entered into a round
     */
    roundHasScores(roundIndex) {
        const round = this.rounds[roundIndex];
        if (!round) return false;

        return round.games.some(game => hasScore(game.score1) || hasScore(game.score2));
    }

    /**
     * Update game score.
     *
     * Deliberately does not check the total against the points target: games do end
     * early, and whoever was on court is the authority. The UI flags an odd total
     * instead. See docs/design-decisions.md.
     */
    updateScore(roundIndex, gameIndex, score1, score2) {
        if (!this.rounds[roundIndex] || !this.rounds[roundIndex].games[gameIndex]) {
            throw new Error('Invalid round or game index');
        }

        // Validate scores. Design decision 8: a total that misses the target is the
        // UI's business to flag, but a value that is not a whole count of points is
        // refused here, so nothing that the leaderboard cannot add ever reaches a
        // stored round.
        if (!Number.isFinite(score1) || !Number.isFinite(score2)) {
            throw new Error('Scores must be numbers');
        }
        if (!Number.isInteger(score1) || !Number.isInteger(score2)) {
            throw new Error('Scores must be whole numbers');
        }
        if (score1 < 0 || score2 < 0) {
            throw new Error('Scores cannot be negative');
        }

        const game = this.rounds[roundIndex].games[gameIndex];
        game.score1 = score1;
        game.score2 = score2;
    }

    /**
     * Undo the last round
     */
    undoLastRound() {
        if (this.rounds.length === 0) {
            throw new Error('No rounds to undo');
        }

        // Remove the last round
        this.rounds.pop();
    }

    /**
     * Change players, courts, points or randomization part-way through.
     *
     * Rounds already played keep their games and scores untouched. The current round
     * is re-drawn only while it holds no entered score.
     *
     * @param {Object} config - players, courts, pointsPerMatch, randomize
     * @returns {{currentRoundRedrawn: boolean}}
     */
    applyConfig(config) {
        this.validateConfig(config);

        this.players = [...config.players];
        this.courts = [...config.courts];
        this.pointsPerMatch = config.pointsPerMatch;
        this.randomize = config.randomize;
        // this.seed is never recomputed

        const lastRoundIndex = this.rounds.length - 1;

        if (lastRoundIndex < 0) {
            this.createNextRound();
            return {currentRoundRedrawn: true};
        }

        // Never throw away a score someone has already typed
        if (this.roundHasScores(lastRoundIndex)) {
            return {currentRoundRedrawn: false};
        }

        this.rounds.pop();
        this.createNextRound();
        return {currentRoundRedrawn: true};
    }

    /**
     * Calculate leaderboard
     * @param {boolean} excludeLastRound - Whether to exclude the last (unsaved) round from the leaderboard
     */
    getLeaderboard(excludeLastRound = false) {
        const scores = {};

        // Initialize the current roster
        this.players.forEach(player => {
            scores[player] = {
                name: player,
                points: 0,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                active: true
            };
        });

        // Players removed part-way through keep the points they earned
        const entryFor = (player) => {
            if (!scores[player]) {
                scores[player] = {
                    name: player,
                    points: 0,
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    active: false
                };
            }
            return scores[player];
        };

        // Determine which rounds to include
        // When excludeLastRound=true: exclude the last (unsaved) round for display purposes
        // When excludeLastRound=false: include all rounds for internal pairing logic
        const roundsToInclude = excludeLastRound && this.rounds.length > 0
            ? this.rounds.slice(0, -1)
            : this.rounds;

        roundsToInclude.forEach(round => {
            round.games.forEach(game => {
                // Only fully scored games count. Guard against anything non-numeric
                // reaching the totals from older saved data.
                if (Number.isFinite(game.score1) && Number.isFinite(game.score2)) {
                    // Team 1
                    game.team1.forEach(player => {
                        const entry = entryFor(player);
                        entry.points += game.score1;
                        entry.gamesPlayed++;
                        if (game.score1 > game.score2) {
                            entry.wins++;
                        } else if (game.score1 < game.score2) {
                            entry.losses++;
                        }
                    });

                    // Team 2
                    game.team2.forEach(player => {
                        const entry = entryFor(player);
                        entry.points += game.score2;
                        entry.gamesPlayed++;
                        if (game.score2 > game.score1) {
                            entry.wins++;
                        } else if (game.score2 < game.score1) {
                            entry.losses++;
                        }
                    });
                }
            });
        });

        // Sort by points (desc), then by games played (asc), then by name
        return Object.values(scores).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Get players resting for a specific round
     * @param {number} roundIndex - The round index (0-based)
     * @returns {Array<string>} Array of player names who are not playing
     */
    getBenchPlayers(roundIndex) {
        if (roundIndex < 0 || roundIndex >= this.rounds.length) {
            return [];
        }

        const round = this.rounds[roundIndex];
        const playingPlayers = new Set();

        // Collect all players playing in this round
        round.games.forEach(game => {
            game.team1.forEach(player => playingPlayers.add(player));
            game.team2.forEach(player => playingPlayers.add(player));
        });

        // Who was in the tournament when this round was drawn
        const roster = Array.isArray(round.players) ? round.players : this.players;

        // Return players not playing
        return roster.filter(player => !playingPlayers.has(player));
    }

    /**
     * Serialize tournament to JSON
     */
    toJSON() {
        return {
            players: this.players,
            courts: this.courts,
            pointsPerMatch: this.pointsPerMatch,
            randomize: this.randomize,
            seed: this.seed,
            rounds: this.rounds
        };
    }

    /**
     * Restore tournament from JSON
     */
    static fromJSON(data) {
        return new Tournament({
            players: data.players,
            courts: data.courts,
            pointsPerMatch: data.pointsPerMatch,
            randomize: data.randomize,
            seed: Number.isInteger(data.seed) ? data.seed : LEGACY_SEED,
            rounds: Array.isArray(data.rounds) ? data.rounds : undefined
        });
    }
}

// Export for testing
export { Mulberry32 };
