import { useState, useEffect } from 'react';
import { validatePhoneNumber, extractPhoneDigits } from '../utils/phoneValidation';

/**
 * Reusable Phone Input Component with validation
 * Shows Indian flag and +91 country code
 */
export function PhoneInput({
    value,
    onChange,
    onValidation,
    placeholder = 'Mobile',
    className = '',
    required = false,
    disabled = false,
    autoFocus = false,
    name = 'phone',
    id,
}) {
    const [error, setError] = useState('');
    const [touched, setTouched] = useState(false);

    // Extract just digits for display (without +91)
    const displayValue = extractPhoneDigits(value);

    // Validate on value change
    useEffect(() => {
        if (touched && value) {
            const validation = validatePhoneNumber('+91' + displayValue);
            setError(validation.error);

            if (onValidation) {
                onValidation(validation);
            }
        }
    }, [value, touched, displayValue, onValidation]);

    const handleChange = (e) => {
        // Only allow digits
        const digitsOnly = e.target.value.replace(/\D/g, '');
        // Limit to 10 digits (without country code)
        const limited = digitsOnly.substring(0, 10);
        onChange({ target: { name, value: limited } });
    };

    const handleBlur = () => {
        setTouched(true);

        if (value) {
            const validation = validatePhoneNumber('+91' + displayValue);
            setError(validation.error);

            if (onValidation) {
                onValidation(validation);
            }
        }
    };

    return (
        <div className="phone-input-wrapper w-full">
            <div className={`phone-input-container flex items-center border rounded-2xl px-4 py-3.5 bg-white transition-all ${touched && error ? 'border-red-500' : 'border-gray-200 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20'
                } ${className}`}>
                {/* Indian Flag */}
                <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
                    <svg className="w-6 h-6" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#FF9933" d="M0 9.059h36v5.294H0z" />
                        <path fill="#FFF" d="M0 14.353h36v5.294H0z" />
                        <path fill="#138808" d="M0 19.647h36v5.294H0z" />
                        <circle fill="#000080" cx="18" cy="17" r="3.176" />
                        <circle fill="#FFF" cx="18" cy="17" r="2.647" />
                        <circle fill="#000080" cx="18" cy="17" r="0.882" />
                        {[...Array(24)].map((_, i) => {
                            const angle = (i * 15 - 90) * Math.PI / 180;
                            const x1 = 18 + 2.2 * Math.cos(angle);
                            const y1 = 17 + 2.2 * Math.sin(angle);
                            const x2 = 18 + 2.8 * Math.cos(angle);
                            const y2 = 17 + 2.8 * Math.sin(angle);
                            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000080" strokeWidth="0.175" />;
                        })}
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">+91</span>
                </div>

                {/* Phone Input */}
                <input
                    type="tel"
                    id={id || name}
                    name={name}
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    className="flex-1 ml-3 text-sm outline-none bg-transparent"
                    required={required}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    autoComplete="tel"
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[0-9]*"
                />

                {/* Clear button */}
                {value && !disabled && (
                    <button
                        type="button"
                        onClick={() => onChange({ target: { name, value: '' } })}
                        className="ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Clear"
                    >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {touched && error && (
                <p className="text-xs text-red-600 mt-1 ml-1">{error}</p>
            )}
        </div>
    );
}
