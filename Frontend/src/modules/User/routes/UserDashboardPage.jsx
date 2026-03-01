import { useNavigate } from 'react-router-dom'
import { UserDashboard } from '../pages/user/UserDashboard'
import '../user.css'

export function UserDashboardPage() {
  const navigate = useNavigate()

  return (
    <UserDashboard
      onLogout={() => {
        localStorage.removeItem('user_token')
        navigate('/user/login')
      }}
    />
  )
}

