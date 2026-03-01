import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserLogin } from '../pages/user/UserLogin'
import '../user.css'

export function UserLoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (token) {
      navigate('/user/dashboard', { replace: true })
    }
  }, [navigate])

  return (
    <UserLogin
      onSwitchToRegister={() => navigate('/user/register')}
      onSuccess={() => navigate('/user/dashboard')}
    />
  )
}

