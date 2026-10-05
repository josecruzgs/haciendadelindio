import "server-only";
import { expireHolds } from "./reservations";

/**
 * Cancela las reservaciones automáticas cuyo apartado venció sin pago y libera sus habitaciones.
 * Se llama al consultar disponibilidad, al reservar, en la página de pago y al abrir el panel.
 */
export async function sweepHolds() {
  return (await expireHolds()).length;
}
