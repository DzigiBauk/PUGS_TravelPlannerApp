import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { TravelPlan } from '../../models/TravelPlan';
import { travelPlanService, type TravelPlanRequestDto } from '../../services/travelPlanService';
import { getApiErrorMessage } from '../../utils/apiError';

interface TravelPlanState {
  travelPlans: TravelPlan[];
  currentTravelPlan: TravelPlan | null;
  loading: boolean;
  error: string | null;
}

const initialState: TravelPlanState = {
  travelPlans: [],
  currentTravelPlan: null,
  loading: false,
  error: null,
};

export const fetchTravelPlans = createAsyncThunk(
  'travelPlans/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await travelPlanService.getAll();
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Could not load travel plans'));
    }
  }
);

export const fetchTravelPlanById = createAsyncThunk(
  'travelPlans/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await travelPlanService.getById(id);
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Could not load this travel plan'));
    }
  }
);

export const createTravelPlan = createAsyncThunk(
  'travelPlans/create',
  async (data: TravelPlanRequestDto, { rejectWithValue }) => {
    try {
      return await travelPlanService.create(data);
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Could not create this travel plan'));
    }
  }
);

export const updateTravelPlan = createAsyncThunk(
  'travelPlans/update',
  async ({ id, data }: { id: number; data: TravelPlanRequestDto }, { rejectWithValue }) => {
    try {
      await travelPlanService.update(id, data);
      return { id, ...data };
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Could not update this travel plan'));
    }
  }
);

export const deleteTravelPlan = createAsyncThunk(
  'travelPlans/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await travelPlanService.delete(id);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Could not delete this travel plan'));
    }
  }
);

const travelPlanSlice = createSlice({
  name: 'travelPlans',
  initialState,
  reducers: {
    clearCurrentTravelPlan: (state) => {
      state.currentTravelPlan = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTravelPlans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTravelPlans.fulfilled, (state, action: PayloadAction<TravelPlan[]>) => {
        state.loading = false;
        state.travelPlans = action.payload;
      })
      .addCase(fetchTravelPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTravelPlanById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTravelPlanById.fulfilled, (state, action: PayloadAction<TravelPlan>) => {
        state.loading = false;
        state.currentTravelPlan = action.payload;
      })
      .addCase(fetchTravelPlanById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createTravelPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTravelPlan.fulfilled, (state, action: PayloadAction<TravelPlan>) => {
        state.loading = false;
        state.travelPlans.unshift(action.payload);
      })
      .addCase(createTravelPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateTravelPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTravelPlan.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.travelPlans.findIndex(tp => tp.id === action.payload.id);
        if (index !== -1) {
          state.travelPlans[index] = { ...state.travelPlans[index], ...action.payload };
        }
        if (state.currentTravelPlan?.id === action.payload.id) {
          state.currentTravelPlan = { ...state.currentTravelPlan, ...action.payload };
        }
      })
      .addCase(updateTravelPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteTravelPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTravelPlan.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.travelPlans = state.travelPlans.filter(tp => tp.id !== action.payload);
        if (state.currentTravelPlan?.id === action.payload) {
          state.currentTravelPlan = null;
        }
      })
      .addCase(deleteTravelPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentTravelPlan, clearError } = travelPlanSlice.actions;
export default travelPlanSlice.reducer;
