export function getInitials(nombre) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export const ROL_COLORS = {
  Admin: '#0F6E56',
  Editor: '#006B70',
  Viewer: '#854F0B',
};

// Firebase RTDB keys can't contain '.', '#', '$', '[', ']' — encode the email
export function emailKey(email) {
  return email.toLowerCase().replace(/[.#$[\]]/g, ',');
}
