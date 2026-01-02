import PocketBase from 'pocketbase';

const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090'
);

// Auto-refresh auth token
pb.autoCancellation(false);

export default pb;

// Helper to get auth headers
export const getAuthHeaders = () => ({
  'Authorization': `Bearer ${pb.authStore.token}`
});

// Check if user is authenticated
export const isAuthenticated = () => pb.authStore.isValid;

// Get current user
export const getCurrentUser = () => pb.authStore.model;
