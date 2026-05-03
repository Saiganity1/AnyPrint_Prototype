import { useState } from "react";
import "../styles/form-input.css";

export default function FormInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  minLength,
  maxLength,
  pattern,
  errorMessage,
  successMessage,
  helperText,
  disabled = false,
  autoComplete,
  inputMode,
  ...props
}) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = (inputValue) => {
    let validationError = "";

    if (required && !inputValue?.trim()) {
      validationError = "This field is required";
    } else if (minLength && inputValue?.length < minLength) {
      validationError = `Minimum ${minLength} characters required`;
    } else if (maxLength && inputValue?.length > maxLength) {
      validationError = `Maximum ${maxLength} characters allowed`;
    } else if (pattern && !new RegExp(pattern).test(inputValue)) {
      validationError = errorMessage || "Invalid format";
    } else if (type === "email" && inputValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inputValue)) {
        validationError = "Please enter a valid email address";
      }
    }

    return validationError;
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;
    onChange?.(e);

    if (touched) {
      const validationError = validate(inputValue);
      setError(validationError);
      setSuccess(!validationError && inputValue ? true : false);
    }
  };

  const handleBlur = (e) => {
    setTouched(true);
    const validationError = validate(e.target.value);
    setError(validationError);
    setSuccess(!validationError && e.target.value ? true : false);
    onBlur?.(e);
  };

  const isInvalid = touched && error;
  const isValid = touched && success && !error;

  return (
    <div className="form-input-wrapper">
      {label && (
        <label htmlFor={name} className="form-input-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}

      <div className="form-input-container">
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={`form-input ${isInvalid ? "error" : ""} ${isValid ? "success" : ""}`}
          aria-invalid={isInvalid}
          aria-describedby={`${name}-feedback`}
          {...props}
        />

        {isValid && <span className="form-input-icon success-icon">✓</span>}
        {isInvalid && <span className="form-input-icon error-icon">✕</span>}
      </div>

      {helperText && !isInvalid && (
        <p className="form-input-helper">{helperText}</p>
      )}

      {isInvalid && (
        <p className="form-input-error" id={`${name}-feedback`} role="alert">
          {error}
        </p>
      )}

      {isValid && successMessage && (
        <p className="form-input-success" id={`${name}-feedback`}>
          {successMessage}
        </p>
      )}
    </div>
  );
}
