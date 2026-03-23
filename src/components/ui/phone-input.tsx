"use client"

import PhoneInputPrimitive from "react-phone-number-input"
import "react-phone-number-input/style.css"

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  variant?: "amber" | "primary"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "+57 300 000 0000",
  variant = "amber",
  size = "md",
  disabled,
}: PhoneInputProps) {
  return (
    <PhoneInputPrimitive
      international
      defaultCountry="CO"
      value={value ? value.replace(/[\s\-().]/g, "") : ""}
      onChange={(v) => onChange(v ?? "")}
      placeholder={placeholder}
      disabled={disabled}
      className={`phone-input phone-input--${variant} phone-input--${size}`}
    />
  )
}
