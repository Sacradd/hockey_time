/** Правила как в api_validate_display_login (PHP). */
export function validateDisplayLogin(login: string): string | null {
  const trimmed = login.trim()
  if (trimmed === '' || trimmed.length < 2 || trimmed.length > 32) {
    return 'Ник: от 2 до 32 символов'
  }
  if (!/^[\p{L}\p{N}_\-.]+$/u.test(trimmed)) {
    return 'Ник: только буквы, цифры, _ - .'
  }
  return null
}
