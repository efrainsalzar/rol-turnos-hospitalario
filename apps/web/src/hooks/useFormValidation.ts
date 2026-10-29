import { useRef, useState } from 'react';

export type ValidationRules<TValues> = Record<string, (values: TValues) => string | undefined>;

export function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

export function requiredMessage(label: string): string {
  return `${label} es obligatorio.`;
}

interface FieldProps {
  error: boolean;
  helperText: string | undefined;
  onBlur: () => void;
  inputRef: (element: HTMLElement | null) => void;
}

// Capa ligera de validacion por campo sobre el patron useState ya usado en
// todos los formularios reales del proyecto ("validacion clara antes de enviar"
// como alternativa valida a un form-library).
// No reemplaza al toast; agrega feedback visual por campo (borde/helperText/foco).
export function useFormValidation<TValues>(rules: ValidationRules<TValues>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  function markTouched(field: string) {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }

  function validate(values: TValues): boolean {
    const nextErrors: Record<string, string> = {};

    for (const field of Object.keys(rules)) {
      const message = rules[field](values);
      if (message) {
        nextErrors[field] = message;
      }
    }

    setErrors(nextErrors);
    setSubmitAttempted(true);

    const firstInvalidField = Object.keys(rules).find((field) => nextErrors[field]);
    if (firstInvalidField) {
      requestAnimationFrame(() => fieldRefs.current[firstInvalidField]?.focus());
    }

    return Object.keys(nextErrors).length === 0;
  }

  function reset() {
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
  }

  function fieldProps(field: string, fallbackHelperText?: string): FieldProps {
    const showError = Boolean(errors[field]) && (touched[field] || submitAttempted);
    return {
      error: showError,
      helperText: showError ? errors[field] : fallbackHelperText,
      onBlur: () => markTouched(field),
      inputRef: (element: HTMLElement | null) => {
        fieldRefs.current[field] = element;
      }
    };
  }

  return { errors, touched, submitAttempted, validate, reset, fieldProps };
}
