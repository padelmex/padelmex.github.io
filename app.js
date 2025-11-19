import {createApp} from "vue";

const app = createApp({
    template: `
      <div class="page">
        <header class="header">
          <h1>Paddle Mexican Tournament</h1>
        </header>
        <main>
          <p>App initialization - coming soon</p>
        </main>
      </div>
    `,
    mounted() {
        document.getElementById("app").classList.add("mounted");
    },
    data() {
        return {}
    },
});
app.mount('#app')
