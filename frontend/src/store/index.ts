import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Auth State Slice
interface AuthState {
  token: string | null;
  email: string | null;
  role: string | null;
  subscriptionPlan: string | null;
}

const initialAuthState: AuthState = {
  token: localStorage.getItem('netflix_token'),
  email: localStorage.getItem('netflix_email'),
  role: localStorage.getItem('netflix_role') || 'USER',
  subscriptionPlan: localStorage.getItem('netflix_sub_plan') || 'None',
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ token: string; email: string; role: string; plan?: string }>
    ) {
      state.token = action.payload.token;
      state.email = action.payload.email;
      state.role = action.payload.role;
      state.subscriptionPlan = action.payload.plan || 'None';
      localStorage.setItem('netflix_token', action.payload.token);
      localStorage.setItem('netflix_email', action.payload.email);
      localStorage.setItem('netflix_role', action.payload.role);
      if (action.payload.plan) localStorage.setItem('netflix_sub_plan', action.payload.plan);
    },
    updateSubscription(state, action: PayloadAction<string>) {
      state.subscriptionPlan = action.payload;
      localStorage.setItem('netflix_sub_plan', action.payload);
    },
    clearCredentials(state) {
      state.token = null;
      state.email = null;
      state.role = null;
      state.subscriptionPlan = null;
      localStorage.removeItem('netflix_token');
      localStorage.removeItem('netflix_email');
      localStorage.removeItem('netflix_role');
      localStorage.removeItem('netflix_sub_plan');
    },
  },
});

// Profile State Slice
interface ActiveProfile {
  id: string;
  name: string;
  avatar: string;
  language: string;
  maturity: string;
}

interface ProfileState {
  activeProfile: ActiveProfile | null;
}

const initialProfileState: ProfileState = {
  activeProfile: localStorage.getItem('netflix_active_profile')
    ? JSON.parse(localStorage.getItem('netflix_active_profile')!)
    : null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState: initialProfileState,
  reducers: {
    setActiveProfile(state, action: PayloadAction<ActiveProfile>) {
      state.activeProfile = action.payload;
      localStorage.setItem('netflix_active_profile', JSON.stringify(action.payload));
    },
    clearActiveProfile(state) {
      state.activeProfile = null;
      localStorage.removeItem('netflix_active_profile');
    },
  },
});

// Create Store
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    profile: profileSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const { setCredentials, updateSubscription, clearCredentials } = authSlice.actions;
export const { setActiveProfile, clearActiveProfile } = profileSlice.actions;
export default store;
