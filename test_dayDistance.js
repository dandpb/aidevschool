const d1 = new Date('2026-07-25T23:30:00-03:00');
const d2 = new Date('2026-07-26T08:00:00-03:00');

function toLocalDateKey(date) {
  // Use a stable formatting approach that respects the local time,
  // but we must format it as YYYY-MM-DD.
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
console.log(toLocalDateKey(d1));
console.log(toLocalDateKey(d2));
