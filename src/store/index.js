import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import venueReducer from '../features/venue/venueSlice';
import bookingReducer from '../features/booking/bookingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    venue: venueReducer,
    booking: bookingReducer
  }
});
