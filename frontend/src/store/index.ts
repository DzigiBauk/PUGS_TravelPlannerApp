import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import type { AppServices } from '../services/appServices';

export function createAppStore(services: AppServices) {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware({
      thunk: {
        extraArgument: services,
      },
    }),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
