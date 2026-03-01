import { useNavigate } from 'react-router-dom'
import { RoleSelect } from '../pages/common/RoleSelect'
import '../user.css'

export function UserRolePage() {
  const navigate = useNavigate()

  return (
    <div className="user-app">
      <RoleSelect
        onBack={() => navigate('/user/language')}
        onSelect={(role) => {
          if (role === 'user') {
            navigate('/user/login')
          } else {
            navigate('/admin/login')
          }
        }}
      />
    </div>
  )
}

