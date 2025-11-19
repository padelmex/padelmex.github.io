# Paddle Mexican Tournament - Code Style and Architecture Guide

## Project Overview

This is a Progressive Web App (PWA) for organizing and managing Mexican paddle tournaments. It's a client-side only application built with Vue.js 3, requiring no server or build steps.

## Architecture

### Technology Stack

- **Framework**: Vue 3 (vendored, no npm dependencies)
- **Module System**: ES modules with importmap
- **State Management**: Vue reactive store pattern
- **Persistence**: localStorage
- **Styling**: Plain CSS with CSS variables
- **Build**: None required - runs directly in browser

### Project Structure

```
paddle-mexican/
├── index.html          # Entry point
├── app.js              # Main app initialization
├── store.js            # Centralized state management
├── style.css           # Global styles
├── components/         # Vue components
├── lib/                # Vendored libraries (Vue)
├── assets/             # Static assets (images, icons)
└── README.md
```

### Key Principles

1. **No Build Step**: The app runs directly in browsers supporting ES modules
2. **Client-Side Only**: No server required, everything runs in the browser
3. **localStorage for Persistence**: All data stored locally in browser
4. **Progressive Enhancement**: Mobile-first responsive design
5. **Simplicity First**: Minimal dependencies, straightforward code

## Code Style Guide

### Vue Components

- Components are defined as ES module default exports
- Use inline template strings (template literals)
- Follow Vue 3 Composition API patterns
- Export components without names (use default export)

**Example:**
```javascript
import {watch} from "vue";
import ChildComponent from "./child.js";

export default {
    template: `
      <div class="component-class">
        <h1>{{ title }}</h1>
        <ChildComponent />
      </div>
    `,
    components: {
        ChildComponent,
    },
    props: {
        title: {
            type: String,
            required: true
        }
    },
    emits: ['event-name'],
    data() {
        return {
            localState: null
        }
    },
    computed: {
        computedValue() {
            return this.localState + 1;
        }
    },
    methods: {
        handleAction() {
            this.$emit('event-name', data);
        }
    },
    created() {
        // Initialization logic
    },
    mounted() {
        // DOM-related logic
    }
}
```

### State Management

- Use Vue's `reactive()` for creating reactive state
- Export a store object with state and methods
- Keep state flat and simple
- Use JSDoc type annotations for better IDE support

**Example:**
```javascript
import {reactive} from 'vue';

const state = reactive({
    /**
     * @type {Array<{id: number, name: string}>}
     */
    items: [],
});

export const store = {
    state,

    updateItems(items) {
        state.items = items;
    },

    resetState(defaultState) {
        if (defaultState === null) {
            state.items = [];
        } else {
            Object.assign(state, defaultState);
        }
    },
};
```

### localStorage Usage

- Use component lifecycle hooks for loading/saving
- Watch store state for automatic persistence
- Store data as JSON strings
- Use descriptive keys (e.g., `tournament-${id}`)

**Pattern:**
```javascript
created() {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    store.resetState(data);
},
mounted() {
    watch(
        () => store.state,
        (newState) => {
            localStorage.setItem(this.storageKey, JSON.stringify(newState));
        },
        {deep: true}
    );
}
```

### CSS Conventions

- Use BEM-like naming: `block__element--modifier`
- Define CSS variables in `:root`
- Mobile-first responsive design
- Use semantic class names

**Naming pattern:**
```css
.component-name { }
.component-name__element { }
.component-name__element--modifier { }
```

**CSS Variables:**
```css
:root {
    --font-family: "Lato", Sans-Serif;
    --font-size: 20px;
    --light-grey: #d1d5db;
}
```

### File Naming

- Use snake_case for component files: `my_component.js`
- Use kebab-case for CSS classes: `my-component`
- Use camelCase for JavaScript variables and functions

## HTML Structure

- Include proper meta tags for PWA
- Use importmap for module resolution
- Add version query strings to bust cache: `style.css?v=1`
- Include critical CSS inline to prevent FOUC
- Add noscript fallback

## JavaScript Patterns

### Event Handling

- Use Vue's event modifiers: `@keydown.enter.prevent`
- Emit events from child components
- Handle events in parent components

### DOM Manipulation

- Use Vue refs for direct DOM access
- Use `$nextTick()` for DOM updates
- Minimize direct DOM manipulation

### Data Flow

- Props down, events up
- Use store for shared state
- Keep component state local when possible

## Browser Support

- Modern browsers with ES module support
- No transpilation or polyfills
- Uses native JavaScript features

## Routing

- Hash-based routing for simplicity
- Use History API for state management
- Handle popstate events for browser navigation

**Example:**
```javascript
window.addEventListener("popstate", (event) => {
    if (event.state) {
        this.currentView = event.state.view
    }
});

// Navigate
window.history.pushState({view: 'name'}, "", `#${name}`)
```

## Performance Considerations

- Keep bundle size minimal (single Vue library)
- Lazy load components if needed
- Use Vue's built-in optimizations
- Cache static assets with version strings

## Development Workflow

1. Edit files directly
2. Refresh browser to see changes
3. No build step required
4. Use browser DevTools for debugging

## Testing

- Manual testing in browser
- Test on mobile devices
- Verify localStorage persistence
- Check responsive design

## Assumptions

1. **Target Users**: Players and organizers of paddle tournaments
2. **Device**: Primary use on mobile devices
3. **Network**: Can work offline after initial load
4. **Data Size**: Small to medium tournaments (localStorage limits)
5. **Browser**: Modern evergreen browsers
6. **Privacy**: All data stays local, no server communication

## Future Considerations

- Add manifest.json for full PWA support
- Add service worker for offline functionality
- Consider IndexedDB for larger data sets
- Add export/import functionality for data backup
- Consider print-friendly styles for tournament brackets

## Development Guidelines

1. **Keep it Simple**: Favor simplicity over complexity
2. **No Dependencies**: Avoid adding npm packages unless absolutely necessary
3. **Readable Code**: Write clear, self-documenting code
4. **Consistent Style**: Follow existing patterns
5. **Mobile First**: Design for mobile, enhance for desktop
6. **User Privacy**: Never send data to external servers
7. **Progressive Enhancement**: Core functionality works without JS where possible
8. **Semantic HTML**: Use proper HTML5 elements

## Common Patterns

### Form Handling
```javascript
<form @submit.prevent="handleSubmit">
    <input v-model="formData" required />
    <button class="button-with-border">Submit</button>
</form>
```

### List Rendering
```javascript
<ul class="list">
    <li v-for="item in items" :key="item.id">
        {{ item.name }}
    </li>
</ul>
```

### Conditional Rendering
```javascript
<div v-if="condition">Shown when true</div>
<div v-else>Shown when false</div>
```

### Component Communication
```javascript
// Child emits
this.$emit('event-name', data);

// Parent handles
<ChildComponent @event-name="handleEvent" />
```

## Notes

- This document should be updated as the project evolves
- When in doubt, refer to the last-mile project for examples
- Consistency with existing patterns is more important than personal preference
