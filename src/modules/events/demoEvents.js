export const demoEvents = [
  { id: "event-1", date: "2026-10-05", time: "11:00", client: "Sofía Benítez", packageName: "Spa Kids · 10 invitadas", total: 180000, paid: 18000, status: "confirmed" },
  { id: "event-2", date: "2026-10-05", time: "15:30", client: "Micaela López", packageName: "Pijamada · 8 invitadas", total: 145000, paid: 0, status: "pending_deposit" },
  { id: "event-3", date: "2026-10-05", time: "18:00", client: "Cumple de Juana", packageName: "Tarde de belleza · 12 invitadas", total: 220000, paid: 22000, status: "confirmed" },
];

export const eventStatusLabel = {
  pending_deposit: "Pendiente de seña",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  rescheduled: "Reprogramado",
  completed: "Realizado",
};
