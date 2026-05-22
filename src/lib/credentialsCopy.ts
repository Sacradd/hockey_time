export type CreatedCredentials = {
  phone_display: string
  password: string
}

export function buildCredentialsCopyText(c: CreatedCredentials): string {
  return `Логин - ${c.phone_display}\nПароль - ${c.password}`
}
