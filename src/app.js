import {createApp} from "vue";
import TournamentConfig from "./components/tournament_config.js";
import TournamentPage from "./components/tournament_page.js";
import {store} from "./store.js";

const app = createApp({
    template: `
      <component :is="currentComponent"></component>
    `,
    components: {
        TournamentConfig,
        TournamentPage,
    },
    computed: {
        currentComponent() {
            if (store.state.currentView === 'tournament') {
                return 'tournament-page';
            }
            return 'tournament-config';
        }
    },
    mounted() {
        document.getElementById("app").classList.add("mounted");

        // Check if there's saved tournament data and set the appropriate view
        const hasTournamentData = localStorage.getItem('tournament-data') !== null;
        if (hasTournamentData) {
            store.setView('tournament');
        } else {
            store.setView('setup');
        }
    },
});

app.mount('#app')
