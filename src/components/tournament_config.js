import {store} from "../store.js";
import {config} from "../config.js";
import {computeSeating, MIN_PLAYERS} from "../tournament.js";

export default {
    template: `
      <div class="page">
        <header class="header">
          <h1>{{ isEditing ? 'Edit Tournament' : 'Tournament Setup' }}</h1>
          <button
            v-if="isEditing"
            type="button"
            class="link-action"
            @click="backToTournament"
          >
            Back
          </button>
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
            </div>
            <div class="config__list">
              <div v-for="(player, index) in players" :key="index" class="config__list-item">
                <input
                  v-model="players[index]"
                  type="text"
                  class="config__input"
                  placeholder="Player name"
                  @keydown.enter.prevent="addPlayer(true)"
                >
                <button @click="removePlayer(index)" class="config__remove-btn">×</button>
              </div>
              <div class="config__list-item">
                <input
                  v-model="newPlayer"
                  type="text"
                  class="config__input config__input--new"
                  placeholder="Add player..."
                  @keydown.enter.prevent="addPlayer(true)"
                  @blur="addPlayer(false)"
                  ref="playerInput"
                >
              </div>
            </div>
            <div class="section-note">
              Any number from {{ minPlayers }} up works. Too many for the courts and the
              extras rest in turn; not a multiple of four and a court plays one against two.
            </div>
          </section>

          <!-- Courts -->
          <section class="config__section">
            <div class="config__section-header">
              <h2 class="config__section-title">Court Names</h2>
            </div>
            <div class="config__list">
              <div v-for="(court, index) in courts" :key="index" class="config__list-item">
                <input
                  v-model="courts[index]"
                  type="text"
                  class="config__input"
                  placeholder="Court name"
                  @keydown.enter.prevent="addCourt(true)"
                >
                <button @click="removeCourt(index)" class="config__remove-btn">×</button>
              </div>
              <div class="config__list-item">
                <input
                  v-model="newCourt"
                  type="text"
                  class="config__input config__input--new"
                  placeholder="Add court..."
                  @keydown.enter.prevent="addCourt(true)"
                  @blur="addCourt(false)"
                  ref="courtInput"
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
                Swap partners within each court between rounds
                <small>(Recommended)</small>
              </span>
            </label>
          </section>

          <!-- Create / Save Button -->
          <div class="config__actions">
            <button
              @mousedown.prevent
              @click="submit"
              class="button-primary button-large"
              :disabled="!canCreate"
            >
              {{ isEditing ? 'Save changes' : 'Create Tournament' }}
            </button>
            <div v-if="validationError" class="button-hint">
              {{ validationError }}
            </div>
            <div v-else-if="seatingSummary" class="button-info">
              {{ seatingSummary }}
              <span v-if="tooManyWaiting" class="button-info--warning">
                Consider adding more courts.
              </span>
            </div>
            <div v-if="isEditing" class="section-note">
              Rounds already played keep their scores. Changes apply to the current round
              only while no score has been entered into it.
            </div>
          </div>

          <!-- Info About Padel Mexicano Tournament -->
          <section class="config__section config__info-section">
            <h3 class="config__info-title">What is a Padel Mexicano Tournament?</h3>

            <div class="config__info-block">
              <h4 class="config__info-subtitle">Overview</h4>
              <p class="config__info-text">
                Nobody has a fixed partner. You play a short game, your points go on your own
                tally, and the next round is drawn from the standings — so you end up playing
                with and against people of roughly your own level, and the table stays tight
                to the last round.
              </p>
            </div>

            <div class="config__info-block">
              <h4 class="config__info-subtitle">How It Works</h4>
              <ul class="config__info-list">
                <li><strong>Round 1:</strong> uses the order you entered players in</li>
                <li><strong>Later rounds:</strong> everyone is ranked by total points scored</li>
                <li><strong>Pairing:</strong> courts fill from the top of the ranking, so the leaders play the leaders</li>
                <li><strong>Partner rotation:</strong> you get a different partner and different opponents each round</li>
              </ul>
            </div>

            <div class="config__info-block">
              <h4 class="config__info-subtitle">Pairing Algorithm</h4>
              <p class="config__info-text">
                After each round players are sorted by their cumulative score, then walked
                from the top filling one court at a time:
              </p>
              <ul class="config__info-list">
                <li>Ranks #1 and #3 vs. #2 and #4 on the first court</li>
                <li>Ranks #5 and #7 vs. #6 and #8 on the second court</li>
                <li>And so on for all available courts</li>
              </ul>
              <p class="config__info-text">
                Splitting each court 1 &amp; 3 against 2 &amp; 4 makes the individual game as
                even as it can be. With randomization on, partners vary within a court without
                disturbing the ladder.
              </p>
            </div>

            <div class="config__info-block">
              <h4 class="config__info-subtitle">Scoring &amp; Winning</h4>
              <ul class="config__info-list">
                <li>Each game is played to the configured total (16 or 32 is usual)</li>
                <li>You score the points your side scored, win or lose</li>
                <li>Your score accumulates across all rounds</li>
                <li>The winner is the player with the highest total</li>
              </ul>
            </div>

            <div class="config__info-block">
              <h4 class="config__info-subtitle">Any Number of Players</h4>
              <ul class="config__info-list">
                <li><strong>More players than seats:</strong> whoever has played most rests, so games played stay within one of each other</li>
                <li><strong>Not a multiple of four:</strong> a court plays one against two, and who plays alone rotates</li>
                <li><strong>Five players:</strong> the one number that never fits, so one always rests</li>
                <li><strong>Spare courts</strong> simply go unused</li>
              </ul>
            </div>
          </section>

          <!-- Debug Footer -->
          <footer v-if="showDebugMenu" class="config__debug-footer">
            <button @click="fillDummyData" class="config__debug-link">
              Fill Dummy Data
            </button>
          </footer>
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
            randomize: true,
            minPlayers: MIN_PLAYERS,
        };
    },
    created() {
        // Seed the form from the store, which is restored from localStorage at startup.
        // Edits stay local until Save, so leaving without saving discards them.
        const saved = store.getConfig();
        this.players = [...saved.players];
        this.courts = [...saved.courts];
        this.randomize = saved.randomize;

        if (saved.pointsPerMatch === 16 || saved.pointsPerMatch === 32) {
            this.pointsPerMatch = saved.pointsPerMatch;
        } else if (saved.pointsPerMatch > 0) {
            this.pointsPerMatch = 0;
            this.customPoints = saved.pointsPerMatch;
        }
    },
    computed: {
        showDebugMenu() {
            return config.SHOW_DEBUG_MENU;
        },
        isEditing() {
            return store.state.tournamentCreated;
        },
        /**
         * A name still sitting in the add box has been typed in, so everything the
         * user is shown - the summary, the validation, the button - counts it. It is
         * committed to the list on submit or on blur.
         */
        effectivePlayers() {
            return this.withPending(this.players, this.newPlayer);
        },
        effectiveCourts() {
            return this.withPending(this.courts, this.newCourt);
        },
        seating() {
            return computeSeating(this.effectivePlayers.length, this.effectiveCourts.length);
        },
        waitingCount() {
            return this.effectivePlayers.length - this.seating.seated;
        },
        tooManyWaiting() {
            return this.waitingCount > this.seating.seated;
        },
        seatingSummary() {
            const {seated, courtsUsed, trios} = this.seating;
            const courtCount = this.effectiveCourts.length;
            if (seated === 0) return null;

            const courtWord = courtsUsed === 1 ? 'court' : 'courts';
            let summary = `${seated} playing on ${courtsUsed} ${courtWord}`;

            if (this.waitingCount > 0) {
                summary += `, ${this.waitingCount} resting each round`;
            }
            if (trios > 0) {
                const gameWord = trios === 1 ? 'game' : 'games';
                summary += ` · ${trios} ${gameWord} with 3 players (1 vs 2)`;
            }

            const idleCourts = courtCount - courtsUsed;
            if (idleCourts > 0) {
                summary += ` · ${idleCourts} ${idleCourts === 1 ? 'court' : 'courts'} idle`;
            }

            return summary + '.';
        },
        validationError() {
            const players = this.effectivePlayers;
            const courts = this.effectiveCourts;

            if (players.length === 0) {
                return "No players entered. Add at least one player to start.";
            }
            if (courts.length === 0) {
                return "No courts created. Add at least one court to start.";
            }
            if (players.length < MIN_PLAYERS) {
                const missing = MIN_PLAYERS - players.length;
                return `Not enough players. You need at least ${MIN_PLAYERS} for a game (${missing} more needed).`;
            }
            if (this.pointsPerMatch === 0 && (!this.customPoints || this.customPoints < 1)) {
                return "Enter valid points per match (must be greater than 0).";
            }
            // Check for empty player names
            if (players.some(p => !p.trim())) {
                return "All players must have names. Remove empty entries or add names.";
            }
            // Check for duplicate player names
            const duplicatePlayer = this.firstDuplicate(players);
            if (duplicatePlayer) {
                return `Two players are both called "${duplicatePlayer}". Names must be unique.`;
            }
            // Check for empty court names
            if (courts.some(c => !c.trim())) {
                return "All courts must have names. Remove empty entries or add names.";
            }
            // Check for duplicate court names
            const duplicateCourt = this.firstDuplicate(courts);
            if (duplicateCourt) {
                return `Two courts are both called "${duplicateCourt}". Names must be unique.`;
            }
            return null;
        },
        canCreate() {
            return !this.validationError;
        }
    },
    methods: {
        /**
         * The first name that appears twice, compared the way the tournament does it
         * @param {Array<string>} names
         * @returns {string|null}
         */
        withPending(committed, pending) {
            const extra = pending.trim();
            return extra ? [...committed, extra] : committed;
        },

        firstDuplicate(names) {
            const seen = new Set();
            for (const name of names) {
                const key = name.trim().toLowerCase();
                if (seen.has(key)) return name.trim();
                seen.add(key);
            }
            return null;
        },

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
        /**
         * @param {boolean} keepFocus - true when Enter asked for another name. A name
         *   committed on blur must not pull the focus back: the user tapped away, and
         *   on a phone that means their next keystrokes land in the wrong field.
         */
        addPlayer(keepFocus = false) {
            if (this.newPlayer.trim()) {
                this.players.push(this.newPlayer.trim());
                this.newPlayer = "";
                if (keepFocus) {
                    this.$nextTick(() => {
                        this.$refs.playerInput.focus();
                    });
                }
            }
        },
        removePlayer(index) {
            this.players.splice(index, 1);
        },
        addCourt(keepFocus = false) {
            if (this.newCourt.trim()) {
                this.courts.push(this.newCourt.trim());
                this.newCourt = "";
                if (keepFocus) {
                    this.$nextTick(() => {
                        this.$refs.courtInput.focus();
                    });
                }
            }
        },
        removeCourt(index) {
            this.courts.splice(index, 1);
        },
        backToTournament() {
            // Local edits were never committed, so this discards them
            store.goToTournament();
        },
        submit() {
            // A name still sitting in the add box counts as typed in - the tap that
            // gets here is the user saying they are done.
            this.addPlayer();
            this.addCourt();

            if (!this.canCreate) return;
            if (!this.confirmRosterChange()) return;

            const finalPoints = this.pointsPerMatch === 0 ? this.customPoints : this.pointsPerMatch;

            store.updateConfig({
                pointsPerMatch: finalPoints,
                players: this.players.map(p => p.trim()),
                courts: this.courts.map(c => c.trim()),
                randomize: this.randomize,
            });
            store.persistConfig();
            store.markConfigDirty();
            store.goToTournament();
        },
        /**
         * A roster edit that takes exactly one name out and puts one name in is almost
         * always a spelling correction - and that is the one edit the app cannot read
         * as such: points are held against the name, so the old name keeps them and
         * the new one starts at zero. Ask before letting that happen silently.
         *
         * @returns {boolean} whether to go ahead with the save
         */
        confirmRosterChange() {
            if (!this.isEditing) return true;

            const before = store.state.players.map(p => p.trim());
            const after = this.players.map(p => p.trim());

            const removed = before.filter(name => !after.includes(name));
            const added = after.filter(name => !before.includes(name));

            if (removed.length !== 1 || added.length !== 1) return true;

            return confirm(
                `"${removed[0]}" is leaving the tournament and "${added[0]}" is joining it.\n\n` +
                `If you meant to correct a spelling, cancel: points belong to the name that ` +
                `scored them, so "${removed[0]}" would keep every point and "${added[0]}" ` +
                `would start from zero.`
            );
        },

        fillDummyData() {
            this.players = [
                'Nikita',
                'Slava',
                'Sasha',
                'Pasha',
                'Artem',
                'Nikolay',
                'Stephen',
                'Sergei'
            ];
            this.courts = [
                'First court',
                'Second court'
            ];
            this.pointsPerMatch = 16;
            this.randomize = true;
        }
    }
};
