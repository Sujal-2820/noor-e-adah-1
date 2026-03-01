import { cn } from '../../../lib/cn'
import { TransText } from '../../TransText'

export function CategoryCard({ category, onClick, className, isSelected = false }) {
    return (
        <div className={cn('category-card-wrapper', className)}>
            <button
                type="button"
                className={cn(
                    'category-card-btn',
                    isSelected && 'category-card-btn--selected'
                )}
                onClick={() => onClick?.(category.id)}
            >
                <div className="category-card-btn__icon">
                    {category.icon ? (
                        <img src={category.icon} alt={category.name} className="category-card-btn__icon-img" />
                    ) : (
                        <span className="category-card-btn__icon-text">{category.emoji || category.name.charAt(0)}</span>
                    )}
                </div>
                <span className="category-card-btn__label"><TransText>{category.name}</TransText></span>
            </button>
        </div>
    )
}
