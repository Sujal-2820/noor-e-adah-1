import { Outlet } from 'react-router-dom'
import { UserProvider } from '..'
import { ToastProvider } from '../../Admin/components/ToastNotification'

export function UserRouteContainer() {
  return (
    <ToastProvider>
      <UserProvider>
        <Outlet />
      </UserProvider>
    </ToastProvider>
  )
}

