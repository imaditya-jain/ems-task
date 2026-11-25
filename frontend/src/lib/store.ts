import { configureStore } from '@reduxjs/toolkit'
import authReducer, { sessionExpired } from '@/lib/slices/auth.slice'
import departmentReducer from '@/lib/slices/department.slice'
import employeeReducer from '@/lib/slices/employee.slice'
import { setSessionExpiredHandler } from '@/lib/auth-fetch'

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      department: departmentReducer,
      employee: employeeReducer,
    },
  })

  setSessionExpiredHandler(() => store.dispatch(sessionExpired()))

  return store
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
