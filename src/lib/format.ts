export function formatNaira(amount: number | null | undefined) {
  const v = Number(amount ?? 0);
  return `₦${v.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}
export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}
