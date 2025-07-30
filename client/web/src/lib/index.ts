// Export all library modules for easy access
// Export auth store and actions
export { authStore, authActions, currentUser, isAuthenticated, isLoading as authLoading, authError } from './stores/auth';

// Export app store and actions
export { appStore, appActions, chatActions } from './stores/app';

// Export API client
export { apiClient } from './api/client';

// Export WebSocket client
export { wsClient } from './api/websocket';

// Export types
export * from './types';

// Export utilities
export * from './utils';

// Export UI components individually to avoid conflicts
// Temporarily commented out to fix startup issues
// export { default as Button } from './components/ui/Button.svelte';
// export { default as Input } from './components/ui/Input.svelte';
// export { default as Modal } from './components/ui/Modal.svelte';
// export { default as LoadingSpinner } from './components/ui/LoadingSpinner.svelte';
// export { default as ServerList } from './components/ui/ServerList.svelte';
// export { default as ChannelList } from './components/ui/ChannelList.svelte';
// export { default as ChatArea } from './components/ui/ChatArea.svelte';
// export { default as MessageInput } from './components/ui/MessageInput.svelte';
// export { default as UserList } from './components/ui/UserList.svelte';
// export { default as VoiceControls } from './components/ui/VoiceControls.svelte';
