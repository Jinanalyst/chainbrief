export function formatRelativeKo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export function formatClockKo(d: Date = new Date()): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const period = h < 12 ? "오전" : "오후";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${pad(hh)}:${pad(m)}`;
}
