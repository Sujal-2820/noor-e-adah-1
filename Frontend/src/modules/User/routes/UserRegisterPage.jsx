import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserRegister } from '../pages/UserRegister'

export function UserRegisterPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (token) {
      navigate('/user/dashboard', { replace: true })
    }
  }, [navigate])

  return (
    <UserRegister
      onSwitchToLogin={() => navigate('/user/login')}
      onSuccess={() => navigate('/user/dashboard')}
    />
  )
}

