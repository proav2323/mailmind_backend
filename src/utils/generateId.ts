export function generateId(length: number) {
  let id: string = '';
  const chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return id;
}
