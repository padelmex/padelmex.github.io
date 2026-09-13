import {createApp} from "vue";
import TournamentConfig from "./components/tournament_config.js";
import TournamentPage from "./components/tournament_page.js";
import StorageWarning from "./components/storage_warning.js";
import {store} from "./store.js";

const app = createApp({
    template: `
      <StorageWarning />
      <component :is="currentComponent"></component>
    `,
    components: {
        TournamentConfig,
        TournamentPage,
        StorageWarning,
    },
    computed: {
        currentView() {
            return store.state.currentView;
        },
        currentComponent() {
            // The leaderboard is a view of the tournament, rendered by the same component
            if (store.state.currentView === 'tournament' || store.state.currentView === 'leaderboard') {
                return 'tournament-page';
            }
            return 'tournament-config';
        }
    },
    watch: {
        // Each screen starts at the top; landing mid-page after a view change is
        // disorienting, especially on the long setup screen.
        currentView() {
            window.scrollTo(0, 0);
        }
    },
    mounted() {
        document.getElementById("app").classList.add("mounted");
    },
});

// Restore the setup form and seed the history stack before mounting: a child's
// created() hook runs before the root's mounted(), so this cannot wait until then.
store.loadConfig();
store.initNavigation();

app.mount('#app')
