import { useState } from 'react'
import { UserLogin } from './UserLogin'
import { UserRegister } from './UserRegister'

export function UserAuth({ onSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'

  return mode === 'login' ? (
    <UserLogin
      onSuccess={onSuccess}
      onSwitchToRegister={() => setMode('register')}
    />
  ) : (
    <UserRegister
      onSuccess={onSuccess}
      onSwitchToLogin={() => setMode('login')}
    />
  )
}

