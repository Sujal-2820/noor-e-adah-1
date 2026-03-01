import { useNavigate } from 'react-router-dom'
import { LanguageSelect } from '../pages/common/LanguageSelect'
import '../user.css'

export function UserLanguagePage() {
  const navigate = useNavigate()
  return (
    <div className="user-app">
      <LanguageSelect onContinue={() => navigate('/user/role')} />
    </div>
  )
}

