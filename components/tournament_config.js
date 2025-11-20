import {store} from "../store.js";

export default {
    template: `
      <div class="page">
        <header class="header">
          <h1>Tournament Setup</h1>
        </header>
        <main class="config">

          <!-- Points per Match -->
          <section class="config__section">
            <h2 class="config__section-title">Points per Match</h2>
            <div class="config__radio-group">
              <label class="config__radio-label">
                <input
                  type="radio"
                  name="points"
                  :value="16"
                  v-model="pointsPerMatch"
                  class="config__radio"
                >
                <span class="config__radio-text">16 points</span>
              </label>
              <label class="config__radio-label">
                <input
                  type="radio"
                  name="points"
                  :value="32"
                  v-model="pointsPerMatch"
                  class="config__radio"
                >
                <span class="config__radio-text">32 points</span>
              </label>
              <label class="config__radio-label">
                <input
                  type="radio"
                  name="points"
                  :value="0"
                  v-model.number="pointsPerMatch"
                  @change="focusCustomInput"
                  class="config__radio"
                >
                <span class="config__radio-text">Custom:</span>
                <input
                  type="number"
                  v-model.number="customPoints"
                  @input="handleCustomPoints"
                  :disabled="pointsPerMatch !== 0"
                  min="1"
                  max="100"
                  class="config__custom-input"
                  placeholder="Enter"
                  inputmode="numeric"
                  ref="customPointsInput"
                >
              </label>
            </div>
          </section>

          <!-- Players -->
          <section class="config__section">
            <div class="config__section-header">
              <h2 class="config__section-title">Player Names</h2>
              <span class="config__counter">{{ players.length }}</span>
            </div>
            <div class="config__list">
              <div v-for="(player, index) in players" :key="index" class="config__list-item">
                <input
                  v-model="players[index]"
                  type="text"
                  class="config__input"
                  placeholder="Player name"
                  @keydown.enter.prevent="addPlayer"
                >
                <button @click="removePlayer(index)" class="config__remove-btn">×</button>
              </div>
              <div class="config__list-item">
                <input
                  v-model="newPlayer"
                  type="text"
                  class="config__input config__input--new"
                  placeholder="Add player..."
                  @keydown.enter.prevent="addPlayer"
                  @blur="addPlayer"
                  ref="playerInput"
                >
              </div>
            </div>
            <div class="section-note">
              Note: You can add more players than available seats.
            </div>
          </section>

          <!-- Courts -->
          <section class="config__section">
            <div class="config__section-header">
              <h2 class="config__section-title">Court Names</h2>
              <span class="config__counter">{{ courts.length }}</span>
            </div>
            <div class="config__list">
              <div v-for="(court, index) in courts" :key="index" class="config__list-item">
                <input
                  v-model="courts[index]"
                  type="text"
                  class="config__input"
                  placeholder="Court name"
                  @keydown.enter.prevent="addCourt"
                >
                <button @click="removeCourt(index)" class="config__remove-btn">×</button>
              </div>
              <div class="config__list-item">
                <input
                  v-model="newCourt"
                  type="text"
                  class="config__input config__input--new"
                  placeholder="Add court..."
                  @keydown.enter.prevent="addCourt"
                  @blur="addCourt"
                >
              </div>
            </div>
          </section>

          <!-- Randomize -->
          <section class="config__section">
            <h2 class="config__section-title">Randomization</h2>
            <label class="config__checkbox-label">
              <input
                type="checkbox"
                v-model="randomize"
                class="config__checkbox"
              >
              <span class="config__checkbox-text">
                Mix up pairings to make games less predictable
              </span>
            </label>
          </section>

          <!-- Benching Mode -->
          <section class="config__section">
            <h2 class="config__section-title">Benching Mode</h2>
            <div class="config__radio-group">
              <label class="config__radio-label">
                <input
                  type="radio"
                  name="benching"
                  value="round-robin"
                  v-model="benchingMode"
                  class="config__radio"
                  :disabled="waitingCount === 0"
                >
                <span class="config__radio-text">Round Robin - Players bench in fixed rotation order</span>
              </label>
              <label class="config__radio-label">
                <input
                  type="radio"
                  name="benching"
                  value="random"
                  v-model="benchingMode"
                  class="config__radio"
                  :disabled="waitingCount === 0"
                >
                <span class="config__radio-text">Random - Players selected randomly each round</span>
              </label>
            </div>
            <div v-if="waitingCount === 0" class="section-note">
              Benching mode is only needed when there are more players than seats.
            </div>
          </section>

          <!-- Debug Buttons -->
          <section class="config__section config__debug-section">
            <h3 class="config__debug-title">Debug Tools</h3>
            <div class="config__debug-buttons">
              <button @click="fillDummyData" class="button-with-border">
                Fill Dummy Data
              </button>
            </div>
          </section>

          <!-- Create Button -->
          <div class="config__actions">
            <button
              @click="createTournament"
              class="button-primary button-large"
              :disabled="!canCreate"
            >
              Create Tournament
            </button>
            <div v-if="validationError" class="config__button-hint">
              {{ validationError }}
            </div>
            <div v-if="!validationError && players.length > 0 && courts.length > 0 && playingCount > 0">
              <div v-if="waitingCount > 0" class="config__button-info">
                {{ playingCount }} player{{ playingCount !== 1 ? 's' : '' }} will play at the same time and {{ waitingCount }} will need to wait.
                <span v-if="waitingCount > playingCount" class="config__button-info--warning">
                  Consider adding more courts.
                </span>
              </div>
              <div v-else class="config__button-info">
                All {{ playingCount }} player{{ playingCount !== 1 ? 's' : '' }} will play at the same time.
              </div>
            </div>
          </div>

          <!-- Info About Mexican Tournament -->
          <section class="config__section config__info-section">
            <h3 class="config__info-title">What is a Mexican Tournament?</h3>

            <div class="config__info-block">
              <h4 class="config__info-subtitle">Overview</h4>
              <p class="config__info-text">
                A Mexican tournament is a dynamic format where players compete in multiple rounds,
                with pairings determined by current standings after each round. This ensures
                competitive balance throughout the event, as players face opponents of similar skill level.
              </p>
            </div>

            <div class="config__info-block">
              <h4 class="config__info-subtitle">How It Works</h4>
              <ul class="config__info-list">
                <li><strong>Round 1:</strong> Players are paired randomly (or by initial seeding)</li>
                <li><strong>Subsequent Rounds:</strong> Players are ranked by total points scored</li>
                <li><strong>Pairing:</strong> Top-ranked players compete against each other, ensuring balanced matches</li>
                <li><strong>Partner Rotation:</strong> You play with different partners and against different opponents each round</li>
              </ul>
            </div>

            <div class="config__info-block">
              <h4 class="config__info-subtitle">Pairing Algorithm</h4>
              <p class="config__info-text">
                After each round, players are sorted by their cumulative score. The algorithm pairs:
              </p>
              <ul class="config__info-list">
                <li>Players ranked #1 and #2 vs. #3 and #4 (on Court 1)</li>
                <li>Players ranked #5 and #6 vs. #7 and #8 (on Court 2)</li>
                <li>And so on for all available courts</li>
              </ul>
              <p class="config__info-text">
                This ensures that players with similar performance levels compete together, creating
                exciting, competitive matches. If randomization is enabled, slight variations are
                introduced to prevent predictable pairings.
              </p>
            </div>

            <div class="config__info-block">
              <h4 class="config__info-subtitle">Scoring & Winning</h4>
              <ul class="config__info-list">
                <li>Each match is played to the configured points (e.g., 16 or 32)</li>
                <li>Your individual score accumulates across all rounds</li>
                <li>The tournament winner is the player with the highest total points</li>
                <li>Players compete individually, even though matches are played in pairs</li>
              </ul>
            </div>

            <div class="config__info-block">
              <h4 class="config__info-subtitle">Why Play Mexican Style?</h4>
              <ul class="config__info-list">
                <li><strong>Fair Competition:</strong> Everyone plays against similarly skilled opponents</li>
                <li><strong>Social:</strong> You meet and play with all participants throughout the tournament</li>
                <li><strong>No Elimination:</strong> Everyone plays every round, regardless of performance</li>
                <li><strong>Engaging:</strong> Standings change dynamically, keeping all rounds exciting</li>
                <li><strong>Flexible:</strong> Works with any number of players (minimum 4 per court)</li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    `,
    data() {
        return {
            pointsPerMatch: 16,
            customPoints: null,
            players: [],
            newPlayer: "",
            courts: [],
            newCourt: "",
            randomize: false,
            benchingMode: 'round-robin',
        };
    },
    computed: {
        playingCount() {
            return Math.min(this.players.length, this.courts.length * 4);
        },
        waitingCount() {
            return Math.max(0, this.players.length - this.courts.length * 4);
        },
        validationError() {
            if (this.players.length === 0) {
                return "No players entered. Add at least one player to start.";
            }
            if (this.courts.length === 0) {
                return "No courts created. Add at least one court to start.";
            }
            if (this.players.length < this.courts.length * 4) {
                const needed = this.courts.length * 4;
                const missing = needed - this.players.length;
                return `Not enough players. For ${this.courts.length} court${this.courts.length > 1 ? 's' : ''} you need at least ${needed} players (${missing} more needed).`;
            }
            if (this.pointsPerMatch === 0 && (!this.customPoints || this.customPoints < 1)) {
                return "Enter valid points per match (must be greater than 0).";
            }
            // Check for empty player names
            if (this.players.some(p => !p.trim())) {
                return "All players must have names. Remove empty entries or add names.";
            }
            // Check for duplicate player names
            const playerNames = this.players.map(p => p.trim().toLowerCase());
            if (new Set(playerNames).size !== playerNames.length) {
                return "Player names must be unique. Some players have the same name.";
            }
            // Check for empty court names
            if (this.courts.some(c => !c.trim())) {
                return "All courts must have names. Remove empty entries or add names.";
            }
            // Check for duplicate court names
            const courtNames = this.courts.map(c => c.trim().toLowerCase());
            if (new Set(courtNames).size !== courtNames.length) {
                return "Court names must be unique. Some courts have the same name.";
            }
            return null;
        },
        canCreate() {
            return !this.validationError;
        }
    },
    methods: {
        handleCustomPoints() {
            if (this.customPoints !== null && this.customPoints !== "") {
                this.pointsPerMatch = 0;
            }
        },
        focusCustomInput() {
            this.$nextTick(() => {
                if (this.$refs.customPointsInput) {
                    this.$refs.customPointsInput.focus();
                }
            });
        },
        addPlayer() {
            if (this.newPlayer.trim()) {
                this.players.push(this.newPlayer.trim());
                this.newPlayer = "";
                this.$nextTick(() => {
                    this.$refs.playerInput.focus();
                });
            }
        },
        removePlayer(index) {
            this.players.splice(index, 1);
        },
        addCourt() {
            if (this.newCourt.trim()) {
                this.courts.push(this.newCourt.trim());
                this.newCourt = "";
            }
        },
        removeCourt(index) {
            this.courts.splice(index, 1);
        },
        createTournament() {
            if (!this.canCreate) return;

            const finalPoints = this.pointsPerMatch === 0 ? this.customPoints : this.pointsPerMatch;

            store.updateConfig({
                pointsPerMatch: finalPoints,
                players: [...this.players],
                courts: [...this.courts],
                randomize: this.randomize,
                benchingMode: this.benchingMode,
            });

            store.createTournament();

            // Save to localStorage
            localStorage.setItem('tournament-config', JSON.stringify({
                pointsPerMatch: finalPoints,
                players: this.players,
                courts: this.courts,
                randomize: this.randomize,
                benchingMode: this.benchingMode,
            }));

            // View change is handled by store.createTournament() above
        },
        fillDummyData() {
            this.players = [
                'Alice',
                'Bob',
                'Charlie',
                'Dave',
                'Eve',
                'Frank',
                'Grace',
                'Henry'
            ];
            this.courts = [
                'Court 1',
                'Court 2'
            ];
            this.pointsPerMatch = 16;
            this.randomize = false;
            this.benchingMode = 'round-robin';
        }
    }
};
