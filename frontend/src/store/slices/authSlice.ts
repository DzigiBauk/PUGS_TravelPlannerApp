import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User, RegisterRequest, LoginRequest, AuthResponse, UpdateUserRequest } from '../../models/User';
import type { AppServices } from '../../services/appServices';
import { getApiErrorMessage } from '../../utils/apiError';

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';

function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: getStoredUser(),
  token: localStorage.getItem(TOKEN_STORAGE_KEY),
  isAuthenticated: !!localStorage.getItem(TOKEN_STORAGE_KEY),
  loading: false,
  error: null,
};

interface AppThunkConfig {
  extra: AppServices;
  rejectValue: string;
}

export const register = createAsyncThunk<AuthResponse, RegisterRequest, AppThunkConfig>(
  'auth/register',
  async (data, { extra, rejectWithValue }) => {
    try {
      const response = await extra.authService.register(data);
      localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      return response;
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Registration failed'));
    }
  }
);

export const login = createAsyncThunk<AuthResponse, LoginRequest, AppThunkConfig>(
  'auth/login',
  async (data, { extra, rejectWithValue }) => {
    try {
      const response = await extra.authService.login(data);
      localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      return response;
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Sign in failed'));
    }
  }
);

export const fetchCurrentUser = createAsyncThunk<User, void, AppThunkConfig>(
  'auth/fetchCurrentUser',
  async (_, { extra, rejectWithValue }) => {
    try {
      const user = await extra.authService.getCurrentUser();
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Could not load the user'));
    }
  }
);

export const updateCurrentUser = createAsyncThunk<User, UpdateUserRequest, AppThunkConfig>(
  'auth/updateCurrentUser',
  async (data, { extra, rejectWithValue }) => {
    try {
      const user = await extra.authService.updateCurrentUser(data);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Could not update the profile'));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
