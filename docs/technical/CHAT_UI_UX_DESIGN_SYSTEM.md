# Modern Chat Application UI/UX Design System
**Comprehensive Design Guidelines for Feathur - SvelteKit Implementation**

---

## Executive Summary

This document provides comprehensive UI/UX patterns and design system recommendations for Feathur, a lightweight, self-hostable Discord alternative. Based on analysis of successful chat applications (Discord, Slack, Element, Signal) and modern design principles, we outline best practices for creating an intuitive, accessible, and performant chat interface using SvelteKit.

**Key Principles:**
- **Performance First**: <2s load time, <50MB bundle size
- **Accessibility**: WCAG 2.1 AA compliance
- **Responsive**: Mobile-first approach with desktop optimization
- **Modern**: Clean, minimal design that doesn't clone Discord
- **Themeable**: Dark/light modes with custom branding options

---

## Table of Contents

1. [Chat Interface Design Patterns](#chat-interface-design-patterns)
2. [Accessibility Standards](#accessibility-standards)
3. [Dark Mode Implementation](#dark-mode-implementation)
4. [Responsive Design](#responsive-design)
5. [Animation & Micro-interactions](#animation--micro-interactions)
6. [Typography & Readability](#typography--readability)
7. [Color Theory & Contrast](#color-theory--contrast)
8. [Icon Systems & Visual Language](#icon-systems--visual-language)
9. [User Onboarding & Tutorials](#user-onboarding--tutorials)
10. [Error Handling & User Feedback](#error-handling--user-feedback)
11. [SvelteKit Component Library Strategy](#sveltekit-component-library-strategy)
12. [Implementation Roadmap](#implementation-roadmap)

---

## Chat Interface Design Patterns

### Layout Architecture

#### Three-Panel Layout (Desktop)
```
┌─────────────────────────────────────────────────────────┐
│                      Header Bar                         │
├────────┬─────────────────────┬──────────────────────────┤
│        │                     │                          │
│ Server │  Channel List       │    Chat Area            │
│  List  │                     │                          │
│ (72px) │  (240px)           │    (flex: 1)            │
│        │                     │                          │
│        │                     ├──────────────────────────┤
│        │                     │    Message Input         │
└────────┴─────────────────────┴──────────────────────────┘
```

#### Mobile-First Approach
- **Navigation**: Bottom tab bar for primary actions
- **Swipe Gestures**: Navigate between servers/channels
- **Collapsible Panels**: Hide server/channel lists when viewing messages
- **Floating Action Button**: Quick access to compose/voice

### Message Component Design

#### Structure
```svelte
<Message>
  <Avatar />
  <MessageContent>
    <Header>
      <Username />
      <Timestamp />
      <Actions /> <!-- Reply, Edit, Delete -->
    </Header>
    <Body>
      <Text />
      <Attachments />
      <Reactions />
    </Body>
  </MessageContent>
</Message>
```

#### Visual Hierarchy
- **Grouped Messages**: Same author within 5 minutes
- **Hover States**: Reveal message actions
- **Timestamps**: Relative (5m ago) with absolute on hover
- **Threading**: Indented replies with visual connector

### Input Field Best Practices

```svelte
<MessageInput>
  <AttachButton />
  <TextArea 
    placeholder="Message #channel-name"
    autoResize={true}
    maxHeight="50vh"
  />
  <EmojiPicker />
  <SendButton />
  <TypingIndicator />
</MessageInput>
```

**Features:**
- Auto-resize up to 50% viewport height
- Markdown preview toggle
- @mention autocomplete
- Emoji shortcode support (:smile:)
- File paste/drag support
- Typing indicator (debounced 3s)

---

## Accessibility Standards

### WCAG 2.1 AA Compliance

#### Keyboard Navigation
```javascript
// Focus management for chat
const focusableElements = [
  'button',
  'a[href]',
  'input:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
];

// Keyboard shortcuts
const shortcuts = {
  'Ctrl+K': 'Quick switcher',
  'Alt+↑/↓': 'Navigate channels',
  'Ctrl+Enter': 'Send message',
  'Escape': 'Close modal/cancel action',
  'Tab': 'Navigate UI elements',
  'Shift+Tab': 'Reverse navigation'
};
```

#### Screen Reader Support
```svelte
<!-- Semantic HTML structure -->
<main role="main" aria-label="Chat messages">
  <section role="log" aria-live="polite" aria-relevant="additions">
    <article role="article" aria-label="Message from {author}">
      <time datetime={isoDate}>{relativeTime}</time>
      <div role="text">{messageContent}</div>
    </article>
  </section>
</main>

<!-- Status announcements -->
<div role="status" aria-live="polite" class="sr-only">
  {#if typing}
    {user} is typing...
  {/if}
</div>
```

#### Color Contrast Requirements
- **Normal Text**: 4.5:1 contrast ratio
- **Large Text** (18pt+): 3:1 contrast ratio
- **UI Components**: 3:1 contrast ratio
- **Focus Indicators**: 3:1 contrast with adjacent colors

### Accessibility Features Checklist
- [ ] Keyboard-only navigation
- [ ] Screen reader compatibility
- [ ] High contrast mode support
- [ ] Reduced motion preferences
- [ ] Focus visible indicators
- [ ] ARIA labels and descriptions
- [ ] Semantic HTML elements
- [ ] Skip links for navigation
- [ ] Error messages associated with inputs
- [ ] Alternative text for images/media

---

## Dark Mode Implementation

### CSS Custom Properties Strategy
```css
/* Base theme variables */
:root {
  /* Light mode (default) */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;
  --color-accent: #0ea5e9;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Dark mode */
[data-theme="dark"] {
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #64748b;
  --color-border: #334155;
  --color-accent: #38bdf8;
  
  /* Adjusted shadows for dark mode */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
}
```

### Theme Implementation in SvelteKit
```typescript
// stores/theme.ts
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark' | 'system';

function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>('system');
  
  return {
    subscribe,
    set: (theme: Theme) => {
      if (browser) {
        localStorage.setItem('theme', theme);
        applyTheme(theme);
      }
      set(theme);
    },
    init: () => {
      if (browser) {
        const stored = localStorage.getItem('theme') as Theme;
        const theme = stored || 'system';
        applyTheme(theme);
        set(theme);
      }
    }
  };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    root.dataset.theme = theme;
  }
}

export const theme = createThemeStore();
```

### Smooth Theme Transitions
```css
/* Prevent flash during theme switch */
html {
  color-scheme: light dark;
}

/* Smooth transitions for theme changes */
* {
  transition: background-color 200ms ease-in-out,
              color 200ms ease-in-out,
              border-color 200ms ease-in-out;
}

/* Disable transitions on page load */
html.no-transitions * {
  transition: none !important;
}
```

---

## Responsive Design

### Breakpoint System
```javascript
// tailwind.config.js extension
module.exports = {
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Custom breakpoints for chat UI
      'chat-mobile': { 'max': '767px' },
      'chat-tablet': { 'min': '768px', 'max': '1023px' },
      'chat-desktop': { 'min': '1024px' }
    }
  }
}
```

### Mobile-First Component Strategy
```svelte
<!-- Responsive Navigation Component -->
<script>
  import { createMediaQuery } from '$lib/utils/media';
  
  const isMobile = createMediaQuery('(max-width: 767px)');
  const isTablet = createMediaQuery('(min-width: 768px) and (max-width: 1023px)');
</script>

{#if $isMobile}
  <MobileNav />
{:else if $isTablet}
  <TabletNav />
{:else}
  <DesktopNav />
{/if}
```

### Responsive Layout Patterns
```css
/* Chat container responsive grid */
.chat-container {
  display: grid;
  height: 100vh;
  
  /* Mobile: Stack vertically */
  @media (max-width: 767px) {
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      "header"
      "messages"
      "input";
  }
  
  /* Tablet: Two column */
  @media (min-width: 768px) and (max-width: 1023px) {
    grid-template-columns: 280px 1fr;
    grid-template-areas:
      "sidebar header"
      "sidebar messages"
      "sidebar input";
  }
  
  /* Desktop: Three column */
  @media (min-width: 1024px) {
    grid-template-columns: 72px 240px 1fr;
    grid-template-areas:
      "servers channels header"
      "servers channels messages"
      "servers channels input";
  }
}
```

### Touch-Optimized Interactions
- **Minimum Touch Target**: 44x44px (WCAG recommendation)
- **Swipe Gestures**: 
  - Left/Right: Navigate channels
  - Down: Refresh messages
  - Up: Load more history
- **Long Press**: Message context menu
- **Pinch to Zoom**: Image/video previews

---

## Animation & Micro-interactions

### Performance-First Animations
```css
/* Use CSS transforms for smooth 60fps animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Svelte Animation Patterns
```svelte
<script>
  import { fly, fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  
  // Message entrance animation
  const messageTransition = {
    y: 20,
    duration: 300,
    easing: cubicOut
  };
  
  // Typing indicator
  let typingDots = ['·', '··', '···'];
  let typingIndex = 0;
  
  setInterval(() => {
    typingIndex = (typingIndex + 1) % typingDots.length;
  }, 500);
</script>

<!-- Animated message list -->
<div class="message-list">
  {#each messages as message (message.id)}
    <div 
      in:fly={messageTransition}
      out:fade={{ duration: 200 }}
      class="message"
    >
      <MessageComponent {message} />
    </div>
  {/each}
</div>

<!-- Typing indicator -->
{#if someoneTyping}
  <div class="typing-indicator" in:scale={{ duration: 200 }}>
    <span>{typingDots[typingIndex]}</span>
  </div>
{/if}
```

### Micro-interaction Library
```javascript
// lib/interactions.js
export const interactions = {
  // Button hover effect
  buttonHover: {
    scale: 1.05,
    transition: 'transform 150ms ease-out'
  },
  
  // Message reaction animation
  reaction: {
    keyframes: [
      { transform: 'scale(0)', opacity: 0 },
      { transform: 'scale(1.2)', opacity: 1 },
      { transform: 'scale(1)', opacity: 1 }
    ],
    duration: 300,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },
  
  // Notification pulse
  notification: {
    animation: 'pulse 2s infinite',
    color: 'var(--color-accent)'
  },
  
  // Loading states
  skeleton: {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'loading 1.5s infinite'
  }
};
```

---

## Typography & Readability

### Font Stack Recommendations
```css
:root {
  /* Primary font for UI and messages */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  
  /* Monospace for code blocks */
  --font-mono: 'JetBrains Mono', 'Fira Code', Monaco, Consolas, 
               'Liberation Mono', 'Courier New', monospace;
  
  /* Display font for headings (optional) */
  --font-display: 'Inter Display', var(--font-sans);
}
```

### Typography Scale
```css
/* Modular scale: 1.25 (Major Third) */
.text-xs    { font-size: 0.75rem; line-height: 1rem; }      /* 12px */
.text-sm    { font-size: 0.875rem; line-height: 1.25rem; }  /* 14px */
.text-base  { font-size: 1rem; line-height: 1.5rem; }       /* 16px */
.text-lg    { font-size: 1.125rem; line-height: 1.75rem; }  /* 18px */
.text-xl    { font-size: 1.25rem; line-height: 1.75rem; }   /* 20px */
.text-2xl   { font-size: 1.5rem; line-height: 2rem; }       /* 24px */
.text-3xl   { font-size: 1.875rem; line-height: 2.25rem; }  /* 30px */

/* Message-specific typography */
.message-text {
  font-size: 0.9375rem;  /* 15px - optimal for reading */
  line-height: 1.375rem; /* 22px - 147% line height */
  letter-spacing: -0.003em;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

### Readability Optimization
```css
/* Maximum line length for readability */
.prose {
  max-width: 65ch; /* ~65 characters per line */
}

/* Improve readability with subtle adjustments */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'kern' 1, 'liga' 1;
}

/* Code block styling */
pre, code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  tab-size: 2;
}

/* Link styling for accessibility */
a {
  color: var(--color-accent);
  text-decoration: underline;
  text-decoration-skip-ink: auto;
  text-underline-offset: 0.2em;
}

a:hover {
  text-decoration-thickness: 2px;
}

/* Focus styles for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 2px;
}
```

---

## Color Theory & Contrast

### Color Palette System
```javascript
// lib/colors.js
export const colors = {
  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main brand color
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  },
  
  // Semantic colors
  success: {
    light: '#86efac',
    DEFAULT: '#22c55e',
    dark: '#16a34a'
  },
  
  warning: {
    light: '#fcd34d',
    DEFAULT: '#f59e0b',
    dark: '#d97706'
  },
  
  error: {
    light: '#fca5a5',
    DEFAULT: '#ef4444',
    dark: '#dc2626'
  },
  
  // Neutral grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};
```

### Contrast Ratio Guidelines
```javascript
// lib/utils/contrast.js
export function getContrastRatio(color1, color2) {
  // Implementation of WCAG contrast ratio calculation
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Ensure minimum contrast ratios
export const contrastRequirements = {
  normalText: 4.5,     // WCAG AA
  largeText: 3,        // WCAG AA for 18pt+
  uiComponents: 3,     // WCAG 2.1
  enhancedText: 7,     // WCAG AAA
  enhancedLarge: 4.5   // WCAG AAA for 18pt+
};
```

### Accessible Color Combinations
```css
/* High contrast color pairs */
.high-contrast {
  /* Light mode */
  --text-on-primary: #ffffff;      /* on primary-500 */
  --text-on-secondary: #1e293b;    /* on gray-200 */
  --text-on-success: #ffffff;      /* on success */
  --text-on-warning: #000000;      /* on warning */
  --text-on-error: #ffffff;        /* on error */
  
  /* Dark mode */
  --dark-text-on-primary: #000000;  /* on primary-400 */
  --dark-text-on-surface: #f1f5f9;  /* on gray-800 */
}
```

---

## Icon Systems & Visual Language

### Icon Library Strategy
```javascript
// lib/icons/index.js
// Using Feather Icons as base with custom additions

export { default as Send } from './Send.svelte';
export { default as Attachment } from './Attachment.svelte';
export { default as Emoji } from './Emoji.svelte';
export { default as Settings } from './Settings.svelte';
export { default as Voice } from './Voice.svelte';
export { default as Screen } from './Screen.svelte';
export { default as Hash } from './Hash.svelte';
export { default as Lock } from './Lock.svelte';
export { default as At } from './At.svelte';
```

### Icon Component Template
```svelte
<!-- lib/icons/Send.svelte -->
<script>
  export let size = 20;
  export let color = 'currentColor';
  export let strokeWidth = 2;
  export let className = '';
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class="icon icon-send {className}"
  aria-hidden="true"
>
  <line x1="22" y1="2" x2="11" y2="13"></line>
  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
</svg>
```

### Visual Language Guidelines
```css
/* Icon sizing system */
.icon-xs { width: 12px; height: 12px; }
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 20px; height: 20px; } /* Default */
.icon-lg { width: 24px; height: 24px; }
.icon-xl { width: 32px; height: 32px; }

/* Icon states */
.icon-interactive {
  transition: all 150ms ease-out;
  cursor: pointer;
}

.icon-interactive:hover {
  transform: scale(1.1);
  color: var(--color-accent);
}

.icon-interactive:active {
  transform: scale(0.95);
}

/* Channel type indicators */
.channel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  color: var(--color-text-muted);
}

.channel-text::before { content: '#'; }
.channel-voice::before { content: '🔊'; }
.channel-private::before { content: '🔒'; }
```

---

## User Onboarding & Tutorials

### Progressive Disclosure Strategy
```svelte
<!-- components/Onboarding/Welcome.svelte -->
<script>
  import { onboarding } from '$lib/stores/onboarding';
  import { fade, fly } from 'svelte/transition';
  
  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Feathur',
      description: 'A lightweight, self-hosted chat platform',
      action: 'Get Started'
    },
    {
      id: 'create-server',
      title: 'Create Your First Server',
      description: 'Servers are spaces for your community',
      action: 'Create Server'
    },
    {
      id: 'invite-friends',
      title: 'Invite Your Friends',
      description: 'Share the invite link to grow your community',
      action: 'Copy Invite Link'
    }
  ];
  
  let currentStep = 0;
</script>

<div class="onboarding-overlay" transition:fade>
  <div class="onboarding-modal" in:fly={{ y: 20 }}>
    <div class="step-indicators">
      {#each steps as step, i}
        <div 
          class="indicator" 
          class:active={i === currentStep}
          class:completed={i < currentStep}
        />
      {/each}
    </div>
    
    <div class="step-content">
      <h2>{steps[currentStep].title}</h2>
      <p>{steps[currentStep].description}</p>
      
      <button on:click={() => currentStep++}>
        {steps[currentStep].action}
      </button>
    </div>
  </div>
</div>
```

### Interactive Tooltips
```svelte
<!-- components/Tooltip.svelte -->
<script>
  import { createPopper } from '@popperjs/core';
  
  export let content = '';
  export let placement = 'top';
  export let delay = 500;
  
  let reference;
  let tooltip;
  let visible = false;
  let timeout;
  
  function show() {
    timeout = setTimeout(() => {
      visible = true;
      createPopper(reference, tooltip, { placement });
    }, delay);
  }
  
  function hide() {
    clearTimeout(timeout);
    visible = false;
  }
</script>

<div 
  bind:this={reference}
  on:mouseenter={show}
  on:mouseleave={hide}
  on:focus={show}
  on:blur={hide}
>
  <slot />
</div>

{#if visible}
  <div bind:this={tooltip} class="tooltip" role="tooltip">
    {content}
    <div class="arrow" data-popper-arrow></div>
  </div>
{/if}
```

### Feature Discovery
```javascript
// stores/features.js
import { writable, derived } from 'svelte/store';

export const discoveredFeatures = writable(new Set());

export function discoverFeature(featureId) {
  discoveredFeatures.update(features => {
    features.add(featureId);
    localStorage.setItem('discovered_features', JSON.stringify([...features]));
    return features;
  });
}

// Highlight new features
export const newFeatures = derived(discoveredFeatures, $discovered => {
  const allFeatures = ['voice-chat', 'screen-share', 'reactions', 'threads'];
  return allFeatures.filter(f => !$discovered.has(f));
});
```

---

## Error Handling & User Feedback

### Error State Components
```svelte
<!-- components/ErrorBoundary.svelte -->
<script>
  import { onMount } from 'svelte';
  export let fallback = null;
  
  let hasError = false;
  let error = null;
  
  onMount(() => {
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  });
  
  function handleError(event) {
    hasError = true;
    error = event.error;
  }
  
  function handleRejection(event) {
    hasError = true;
    error = event.reason;
  }
</script>

{#if hasError}
  {#if fallback}
    <svelte:component this={fallback} {error} />
  {:else}
    <div class="error-boundary">
      <h2>Something went wrong</h2>
      <p>{error?.message || 'An unexpected error occurred'}</p>
      <button on:click={() => location.reload()}>Reload</button>
    </div>
  {/if}
{:else}
  <slot />
{/if}
```

### Toast Notification System
```svelte
<!-- components/Toast.svelte -->
<script context="module">
  import { writable } from 'svelte/store';
  
  const toasts = writable([]);
  let id = 0;
  
  export function showToast(message, type = 'info', duration = 3000) {
    const toast = { id: id++, message, type, duration };
    
    toasts.update(t => [...t, toast]);
    
    if (duration > 0) {
      setTimeout(() => {
        toasts.update(t => t.filter(item => item.id !== toast.id));
      }, duration);
    }
    
    return toast.id;
  }
</script>

<script>
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'i'
  };
</script>

<div class="toast-container" aria-live="polite" aria-atomic="true">
  {#each $toasts as toast (toast.id)}
    <div 
      class="toast toast-{toast.type}"
      animate:flip={{ duration: 300 }}
      in:fly={{ x: 100 }}
      out:fly={{ x: 100 }}
    >
      <span class="toast-icon">{icons[toast.type]}</span>
      <span class="toast-message">{toast.message}</span>
      <button 
        class="toast-close"
        on:click={() => toasts.update(t => t.filter(item => item.id !== toast.id))}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  {/each}
</div>
```

### Form Validation Feedback
```svelte
<!-- components/FormField.svelte -->
<script>
  export let label = '';
  export let error = '';
  export let hint = '';
  export let required = false;
  
  let fieldId = `field-${Math.random().toString(36).substr(2, 9)}`;
  let errorId = `${fieldId}-error`;
  let hintId = `${fieldId}-hint`;
</script>

<div class="form-field" class:has-error={error}>
  <label for={fieldId}>
    {label}
    {#if required}
      <span class="required" aria-label="required">*</span>
    {/if}
  </label>
  
  <slot {fieldId} {errorId} {hintId} />
  
  {#if hint && !error}
    <span id={hintId} class="field-hint">{hint}</span>
  {/if}
  
  {#if error}
    <span id={errorId} class="field-error" role="alert">
      {error}
    </span>
  {/if}
</div>

<style>
  .has-error input,
  .has-error textarea {
    border-color: var(--color-error);
  }
  
  .field-error {
    color: var(--color-error);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
  
  .field-hint {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
</style>
```

---

## SvelteKit Component Library Strategy

### Component Architecture
```
src/lib/components/
├── primitives/          # Base UI components
│   ├── Button.svelte
│   ├── Input.svelte
│   ├── Card.svelte
│   └── Modal.svelte
├── chat/               # Chat-specific components
│   ├── Message.svelte
│   ├── MessageList.svelte
│   ├── MessageInput.svelte
│   └── TypingIndicator.svelte
├── layout/             # Layout components
│   ├── Sidebar.svelte
│   ├── Header.svelte
│   └── Navigation.svelte
├── feedback/           # User feedback components
│   ├── Toast.svelte
│   ├── Loading.svelte
│   └── ErrorBoundary.svelte
└── utils/              # Utility components
    ├── Portal.svelte
    ├── ClickOutside.svelte
    └── IntersectionObserver.svelte
```

### Base Component Template
```svelte
<!-- lib/components/primitives/Button.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { cn } from '$lib/utils';
  
  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
  type Size = 'sm' | 'md' | 'lg';
  
  export let variant: Variant = 'primary';
  export let size: Size = 'md';
  export let disabled = false;
  export let loading = false;
  export let fullWidth = false;
  export let href: string | undefined = undefined;
  
  let className = '';
  export { className as class };
  
  const dispatch = createEventDispatcher();
  
  $: classes = cn(
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'w-full',
    (disabled || loading) && 'opacity-50 cursor-not-allowed',
    className
  );
  
  function handleClick(event: MouseEvent) {
    if (!disabled && !loading) {
      dispatch('click', event);
    }
  }
</script>

{#if href && !disabled}
  <a 
    {href} 
    class={classes}
    on:click={handleClick}
  >
    {#if loading}
      <Spinner class="mr-2" />
    {/if}
    <slot />
  </a>
{:else}
  <button
    type="button"
    {disabled}
    class={classes}
    on:click={handleClick}
    {...$$restProps}
  >
    {#if loading}
      <Spinner class="mr-2" />
    {/if}
    <slot />
  </button>
{/if}

<style>
  /* Base button styles */
  .btn {
    @apply inline-flex items-center justify-center font-medium rounded-lg
           transition-all duration-150 focus-visible:outline-none 
           focus-visible:ring-2 focus-visible:ring-offset-2;
  }
  
  /* Variants */
  .btn-primary {
    @apply bg-primary-500 text-white hover:bg-primary-600 
           focus-visible:ring-primary-500;
  }
  
  .btn-secondary {
    @apply bg-secondary-200 text-secondary-900 hover:bg-secondary-300
           focus-visible:ring-secondary-500 dark:bg-secondary-700 
           dark:text-secondary-100 dark:hover:bg-secondary-600;
  }
  
  .btn-ghost {
    @apply bg-transparent text-secondary-600 hover:bg-secondary-100
           focus-visible:ring-secondary-500 dark:text-secondary-400
           dark:hover:bg-secondary-800;
  }
  
  .btn-danger {
    @apply bg-error text-white hover:bg-error-dark
           focus-visible:ring-error;
  }
  
  /* Sizes */
  .btn-sm { @apply px-3 py-1.5 text-sm; }
  .btn-md { @apply px-4 py-2 text-base; }
  .btn-lg { @apply px-6 py-3 text-lg; }
</style>
```

### Composable Patterns
```typescript
// lib/composables/useTheme.ts
import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

const THEME_KEY = Symbol('theme');

export interface ThemeContext {
  theme: Writable<'light' | 'dark' | 'system'>;
  toggle: () => void;
}

export function createThemeContext(): ThemeContext {
  const theme = writable<'light' | 'dark' | 'system'>('system');
  
  return {
    theme,
    toggle: () => {
      theme.update(t => t === 'light' ? 'dark' : 'light');
    }
  };
}

export function setThemeContext(context: ThemeContext) {
  setContext(THEME_KEY, context);
}

export function getThemeContext(): ThemeContext {
  return getContext<ThemeContext>(THEME_KEY);
}
```

### Testing Strategy
```typescript
// tests/components/Button.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import { expect, test, describe } from 'vitest';
import Button from '$lib/components/primitives/Button.svelte';

describe('Button Component', () => {
  test('renders with default props', () => {
    const { getByRole } = render(Button, {
      props: { children: 'Click me' }
    });
    
    const button = getByRole('button');
    expect(button).toHaveTextContent('Click me');
    expect(button).toHaveClass('btn-primary', 'btn-md');
  });
  
  test('handles click events', async () => {
    let clicked = false;
    const { getByRole } = render(Button, {
      props: {
        children: 'Click me',
        onClick: () => clicked = true
      }
    });
    
    await fireEvent.click(getByRole('button'));
    expect(clicked).toBe(true);
  });
  
  test('disables when loading', () => {
    const { getByRole } = render(Button, {
      props: { loading: true, children: 'Loading...' }
    });
    
    expect(getByRole('button')).toBeDisabled();
    expect(getByRole('button')).toHaveClass('opacity-50');
  });
});
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal: Establish design system and core components**

- [ ] Set up Tailwind CSS with custom configuration
- [ ] Create color palette with dark mode support
- [ ] Implement typography scale
- [ ] Build primitive components (Button, Input, Card)
- [ ] Set up theme switching mechanism
- [ ] Create base layout structure

### Phase 2: Chat Components (Week 3-4)
**Goal: Build chat-specific UI components**

- [ ] Message component with variants
- [ ] Message list with virtualization
- [ ] Message input with rich features
- [ ] Channel sidebar
- [ ] User presence indicators
- [ ] Typing indicators

### Phase 3: Interactivity (Week 5-6)
**Goal: Add animations and micro-interactions**

- [ ] Page transitions
- [ ] Message animations
- [ ] Loading states
- [ ] Hover effects
- [ ] Gesture support
- [ ] Keyboard shortcuts

### Phase 4: Accessibility (Week 7)
**Goal: Ensure WCAG 2.1 AA compliance**

- [ ] Keyboard navigation testing
- [ ] Screen reader optimization
- [ ] Color contrast audit
- [ ] Focus management
- [ ] ARIA implementation
- [ ] Accessibility testing

### Phase 5: Responsive Design (Week 8)
**Goal: Optimize for all devices**

- [ ] Mobile layout implementation
- [ ] Touch gesture support
- [ ] Responsive typography
- [ ] Adaptive components
- [ ] Performance optimization
- [ ] PWA features

### Phase 6: Polish & Documentation (Week 9-10)
**Goal: Finalize design system**

- [ ] Component documentation
- [ ] Storybook setup
- [ ] Design tokens
- [ ] Usage guidelines
- [ ] Performance benchmarks
- [ ] Launch preparation

---

## Performance Metrics

### Target Metrics
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <2.5s
- **Bundle Size**: <100KB (initial)
- **Lighthouse Score**: 95+
- **Accessibility Score**: 100

### Optimization Strategies
1. **Code Splitting**: Route-based chunks
2. **Tree Shaking**: Remove unused code
3. **Image Optimization**: WebP with fallbacks
4. **Font Loading**: FOIT prevention
5. **CSS Purging**: Remove unused styles
6. **Compression**: Brotli for assets
7. **Caching**: Service worker strategy

---

## Conclusion

This comprehensive design system provides Feathur with a modern, accessible, and performant UI foundation. By following these guidelines and implementing the recommended patterns, Feathur will deliver an exceptional user experience that rivals established platforms while maintaining its lightweight, self-hostable nature.

The modular approach ensures scalability, while the focus on accessibility and performance aligns with the project's core values. With SvelteKit's capabilities and these design principles, Feathur is positioned to become the preferred open-source chat platform for privacy-conscious communities.

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Next Review: March 2025*