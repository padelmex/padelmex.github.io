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

### Design Guidelines

#### Component and Style Reuse

- **Reuse existing components**: Before creating a new component, check if an existing component can be adapted or extended
- **Reuse existing styles**: Look for similar styling patterns in the codebase before adding new CSS classes
- **Refactor when introducing new styles**: When adding a new CSS class, identify recurring patterns in the codebase and refactor old code to use common styles
- **Create utility classes**: For commonly repeated patterns (spacing, colors, typography), create reusable utility classes

**Example - Before refactoring:**
```css
.button-primary { padding: 12px 24px; border-radius: 8px; }
.button-secondary { padding: 12px 24px; border-radius: 8px; }
.card { padding: 12px 24px; border-radius: 8px; }
```

**After refactoring:**
```css
.padding-standard { padding: 12px 24px; }
.rounded-standard { border-radius: 8px; }
.button-primary { /* extends: padding-standard rounded-standard */ }
.button-secondary { /* extends: padding-standard rounded-standard */ }
.card { /* extends: padding-standard rounded-standard */ }
```

#### Code Cleanup and Removal

- **Remove unused code**: When removing features or refactoring, always clean up associated code
- **Delete unused CSS classes**: Remove CSS rules that are no longer referenced in any component
- **Remove unused components**: Delete component files that are no longer imported or used
- **Clean up unused imports**: Remove import statements for components or modules that are no longer needed
- **Delete unused assets**: Remove images, icons, or other assets that are no longer referenced
- **Keep it minimal**: A smaller, cleaner codebase is easier to maintain and understand

**When making changes:**
1. Remove the feature from the template/HTML
2. Remove associated CSS classes
3. Remove any JavaScript functions or data related to the feature
4. Remove unused imports
5. Verify no other parts of the codebase reference the removed code


### File Naming

- Use snake_case for component files: `my_component.js`
- Use kebab-case for CSS classes: `my-component`
- Use camelCase for JavaScript variables and functions

## HTML Structure

- Include proper meta tags for PWA
- Use importmap for module resolution
- Add version query strings to bust cache: `style.css?v=20251119204632
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

## Debugging with Chrome MCP

Chrome MCP (Model Context Protocol) provides powerful browser automation and debugging capabilities through Chrome DevTools integration.

### When to Use Chrome MCP

Use Chrome MCP for debugging when:
- **User reports unexpected behavior**: "Button doesn't work", "Page doesn't load", etc.
- **Navigation issues**: Routes not working, pages not switching
- **State management problems**: Data not persisting, views not updating
- **JavaScript errors**: Need to check console for errors
- **UI/UX verification**: Confirming visual elements render correctly
- **Integration testing**: Testing full user workflows end-to-end

### Chrome MCP Workflow

1. **Start Local Server** (required for ES modules):
   ```bash
   python3 -m http.server 8000
   ```
   Never use `file://` protocol - ES modules require HTTP/HTTPS

2. **Navigate to App**:
   - Use clean URLs without hashes (for state-based navigation)
   - Example: `http://localhost:8000/` or `http://localhost:8000/index.html`

3. **Take Snapshots** (prefer over screenshots):
   - Snapshots show accessibility tree with UIDs for interaction
   - Faster and more efficient than screenshots
   - Shows element states (disabled, focused, etc.)

4. **Check Console Messages**:
   - Always check for JavaScript errors first
   - CORS errors indicate `file://` protocol usage
   - Look for 404s, failed imports, or runtime errors

5. **Interact with Elements**:
   - Use UIDs from snapshots to click, fill, or interact
   - Test user workflows: fill forms, click buttons, navigate
   - Verify state changes after interactions

6. **Verify State**:
   - Use `evaluate_script` to check localStorage, store state, or DOM
   - Confirm data persistence across page reloads
   - Check that reactive state updates correctly

### Common Debugging Patterns

**Check for CORS Issues:**
```javascript
// If you see: "Cross origin requests are only supported for protocol schemes: http, https..."
// Solution: Start HTTP server, don't use file:// protocol
```

**Verify Navigation:**
```javascript
// Check current view state
evaluate_script: () => {
  return {
    currentView: store.state.currentView,
    url: window.location.href,
    hasLocalStorage: !!localStorage.getItem('tournament-data')
  };
}
```

**Debug Button States:**
```javascript
// Take snapshot to see if button is disabled and why
// Look for disabled attribute and nearby error messages
```

**Test Full Workflow:**
1. Take snapshot of initial state
2. Fill form fields using UIDs
3. Click submit button
4. Take snapshot to verify new state
5. Reload page to test persistence
6. Verify state restored correctly

### Best Practices

- **Always start with console errors**: Check `list_console_messages` first
- **Use snapshots over screenshots**: More efficient and actionable
- **Test on clean state**: Clear localStorage when testing from scratch
- **Verify persistence**: Always test page reloads to ensure data persists
- **Test edge cases**: Empty states, validation, error handling
- **Follow user paths**: Test the actual user workflow, not just individual functions

### Limitations

- Cannot test on mobile devices directly (desktop Chrome only)
- Requires running local server for ES modules
- Async operations may need wait time
- Dialogs (alert, confirm, prompt) require special handling with `handle_dialog`

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
