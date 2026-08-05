// Regla única de contraseña, compartida por registro de chef, cambio de
// contraseña (chef y cliente) y reset de contraseña. No duplicar estas
// reglas en los formularios: importar de acá.

export const PASSWORD_MIN_LENGTH = 8

export interface PasswordRequirement {
  id: 'minLength' | 'hasLetter' | 'hasNumber'
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'minLength',
    label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'hasLetter',
    label: 'Al menos una letra',
    test: (password) => /[a-zA-Z]/.test(password),
  },
  {
    id: 'hasNumber',
    label: 'Al menos un número',
    test: (password) => /[0-9]/.test(password),
  },
]

export function validatePassword(password: string): { valid: boolean; message: string } {
  const valid = PASSWORD_REQUIREMENTS.every((req) => req.test(password))
  return {
    valid,
    message: valid
      ? ''
      : `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres, con al menos una letra y un número.`,
  }
}
