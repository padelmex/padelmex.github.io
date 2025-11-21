/**
 * Seeded random number generator for deterministic behavior
 */
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
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

        // Validate benchingMode
        if (config.benchingMode !== undefined) {
            if (typeof config.benchingMode !== 'string') {
                throw new Error('Benching mode must be a string');
            }
            if (!['round-robin', 'random'].includes(config.benchingMode)) {
                throw new Error('Benching mode must be either "round-robin" or "random"');
            }
        }
    }

    /**
     * @param {Object} config
     * @param {Array<string>} config.players - Player names
     * @param {Array<string>} config.courts - Court names
     * @param {number} config.pointsPerMatch - Total points per match
     * @param {boolean} config.randomize - Whether to randomize teams
     * @param {string} config.benchingMode - Benching mode: 'round-robin' or 'random' (default: 'round-robin')
     */
    constructor(config) {
        // Validate configuration
        this.validateConfig(config);

        this.players = [...config.players];
        this.courts = [...config.courts];
        this.pointsPerMatch = config.pointsPerMatch;
        this.randomize = config.randomize;
        this.benchingMode = config.benchingMode || 'round-robin';

        // Calculate seed for deterministic behavior
        this.seed = this.calculateSeed();

        // Create bench rotation order for round-robin benching
        this.benchRotation = [...this.players];

        /**
         * @type {Array<{games: Array<{court: string, team1: Array<string>, team2: Array<string>, score1: number|null, score2: number|null}>}>}
         */
        this.rounds = [];

        // Create first round
        this.createNextRound();
    }

    calculateSeed() {
        // Create deterministic seed from players and courts
        let seed = 0;
        const str = this.players.join(',') + '|' + this.courts.join(',');
        for (let i = 0; i < str.length; i++) {
            seed = ((seed << 5) - seed) + str.charCodeAt(i);
            seed = seed & seed; // Convert to 32bit integer
        }
        return Math.abs(seed);
    }

    /**
     * Get players who should play next based on benching mode
     */
    getPlayersForNextRound() {
        const currentRound = this.rounds.length;
        const playersPerRound = this.courts.length * 4; // 4 players per court

        // If we have enough players for all courts, everyone plays
        if (this.players.length <= playersPerRound) {
            return [...this.players];
        }

        if (this.benchingMode === 'round-robin') {
            // Round-robin: Fixed rotation order
            return this.getRoundRobinPlayers(currentRound, playersPerRound);
        } else {
            // Random: Seeded random selection
            return this.getRandomPlayers(currentRound, playersPerRound);
        }
    }

    /**
     * Get players for round-robin benching (fixed order rotation)
     */
    getRoundRobinPlayers(currentRound, playersPerRound) {
        const numBenched = this.players.length - playersPerRound;
        const benchStartIndex = (currentRound * numBenched) % this.players.length;

        // Determine which players are benched this round
        const benchedIndices = new Set();
        for (let i = 0; i < numBenched; i++) {
            benchedIndices.add((benchStartIndex + i) % this.players.length);
        }

        // Return players not benched (in bench rotation order)
        return this.benchRotation.filter((player, index) => !benchedIndices.has(index));
    }

    /**
     * Get players for random benching (seeded random selection)
     */
    getRandomPlayers(currentRound, playersPerRound) {
        // Create a round-specific RNG for deterministic benching
        const roundRng = new SeededRandom(this.seed + currentRound);
        const shuffled = roundRng.shuffle(this.players);
        return shuffled.slice(0, playersPerRound);
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
        const playersPerRound = this.courts.length * 4;
        const activePlayers = this.getPlayersForNextRound();

        // Sort active players by their position in sortedPlayers (leaderboard)
        const rankedActivePlayers = activePlayers.sort((a, b) => {
            return sortedPlayers.indexOf(a) - sortedPlayers.indexOf(b);
        });

        // Apply randomization if enabled
        let pairedPlayers;
        if (this.randomize && currentRound > 0) {
            // For randomization, slightly shuffle the middle pairs to avoid repetition
            // but keep top players mostly together
            pairedPlayers = this.applySmartRandomization(rankedActivePlayers, currentRound);
        } else {
            pairedPlayers = rankedActivePlayers;
        }

        // Create games for each court
        const games = [];
        for (let i = 0; i < this.courts.length && i * 4 < pairedPlayers.length; i++) {
            const courtPlayers = pairedPlayers.slice(i * 4, (i + 1) * 4);

            // Need exactly 4 players for a game
            if (courtPlayers.length === 4) {
                const game = {
                    court: this.courts[i],
                    team1: [courtPlayers[0], courtPlayers[2]],  // Players 1 & 3
                    team2: [courtPlayers[1], courtPlayers[3]],  // Players 2 & 4
                    score1: null,
                    score2: null
                };
                games.push(game);
            }
        }

        this.rounds.push({ games });
    }

    /**
     * Apply smart randomization to prevent repetitive pairings
     * while maintaining competitive balance
     */
    applySmartRandomization(rankedPlayers, currentRound) {
        // Create round-specific RNG for deterministic behavior
        const roundRng = new SeededRandom(this.seed + currentRound + 1000);

        const result = [...rankedPlayers];
        const numCourts = Math.floor(rankedPlayers.length / 4);

        // For each court (group of 4 players), apply small swaps
        for (let court = 0; court < numCourts; court++) {
            const startIdx = court * 4;
            const courtGroup = result.slice(startIdx, startIdx + 4);

            // Randomly swap within pairs to create variety
            // Swap positions 0 and 1 (team 1)
            if (roundRng.next() > 0.5) {
                [result[startIdx], result[startIdx + 1]] = [result[startIdx + 1], result[startIdx]];
            }

            // Swap positions 2 and 3 (team 2)
            if (roundRng.next() > 0.5) {
                [result[startIdx + 2], result[startIdx + 3]] = [result[startIdx + 3], result[startIdx + 2]];
            }

            // Occasionally swap between teams (creates more variety)
            if (roundRng.next() > 0.7) {
                const pos1 = startIdx + (roundRng.next() > 0.5 ? 0 : 1);
                const pos2 = startIdx + (roundRng.next() > 0.5 ? 2 : 3);
                [result[pos1], result[pos2]] = [result[pos2], result[pos1]];
            }
        }

        return result;
    }

    /**
     * Check if all games in a round are complete
     */
    isRoundComplete(roundIndex) {
        const round = this.rounds[roundIndex];
        if (!round) return false;

        return round.games.every(game =>
            game.score1 !== null &&
            game.score2 !== null
        );
    }

    /**
     * Update game score
     */
    updateScore(roundIndex, gameIndex, score1, score2) {
        if (!this.rounds[roundIndex] || !this.rounds[roundIndex].games[gameIndex]) {
            throw new Error('Invalid round or game index');
        }

        // Validate scores
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
     * Calculate leaderboard
     * @param {boolean} excludeLastRound - Whether to exclude the last (unsaved) round from the leaderboard
     */
    getLeaderboard(excludeLastRound = false) {
        const scores = {};

        // Initialize all players
        this.players.forEach(player => {
            scores[player] = {
                name: player,
                points: 0,
                gamesPlayed: 0,
                wins: 0,
                losses: 0
            };
        });

        // Determine which rounds to include
        // When excludeLastRound=true: exclude the last (unsaved) round for display purposes
        // When excludeLastRound=false: include all rounds for internal pairing logic
        const roundsToInclude = excludeLastRound && this.rounds.length > 0
            ? this.rounds.slice(0, -1)
            : this.rounds;

        roundsToInclude.forEach(round => {
            round.games.forEach(game => {
                if (game.score1 !== null && game.score2 !== null) {
                    // Team 1
                    game.team1.forEach(player => {
                        scores[player].points += game.score1;
                        scores[player].gamesPlayed++;
                        if (game.score1 > game.score2) {
                            scores[player].wins++;
                        } else if (game.score1 < game.score2) {
                            scores[player].losses++;
                        }
                    });

                    // Team 2
                    game.team2.forEach(player => {
                        scores[player].points += game.score2;
                        scores[player].gamesPlayed++;
                        if (game.score2 > game.score1) {
                            scores[player].wins++;
                        } else if (game.score2 < game.score1) {
                            scores[player].losses++;
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
     * Get players on the bench for a specific round
     * @param {number} roundIndex - The round index (0-based)
     * @returns {Array<string>} Array of player names on the bench
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

        // Return players not playing
        return this.players.filter(player => !playingPlayers.has(player));
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
            benchingMode: this.benchingMode,
            benchRotation: this.benchRotation,
            rounds: this.rounds
        };
    }

    /**
     * Restore tournament from JSON
     */
    static fromJSON(data) {
        const tournament = new Tournament({
            players: data.players,
            courts: data.courts,
            pointsPerMatch: data.pointsPerMatch,
            randomize: data.randomize,
            benchingMode: data.benchingMode || 'round-robin'
        });

        // Clear the auto-generated first round
        tournament.rounds = [];

        // Restore rounds and bench rotation
        tournament.rounds = data.rounds;

        // Restore benchRotation if available (for backward compatibility)
        if (data.benchRotation) {
            tournament.benchRotation = data.benchRotation;
        }

        return tournament;
    }
}
