// Spread onto every field. None of them is a login, address or card field, so ask the browser and
// the common password managers (1Password, LastPass, Bitwarden, Dashlane) not to offer to fill them.
export const NOFILL = {
  autoComplete: 'off',
  'data-1p-ignore': true,
  'data-lpignore': 'true',
  'data-bwignore': true,
  'data-form-type': 'other',
} as const;
