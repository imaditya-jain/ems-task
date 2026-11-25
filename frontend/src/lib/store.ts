import { configureStore } from '@reduxjs/toolkit'
import authReducer, { sessionExpired } from '@/lib/slices/auth.slice'
import { setSessionExpiredHandler } from '@/lib/auth-fetch'

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
  })

  setSessionExpiredHandler(() => store.dispatch(sessionExpired()))

  return store
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
