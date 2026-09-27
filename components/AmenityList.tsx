import {
  Accessibility,
  AirVent,
  Baby,
  BellRing,
  ConciergeBell,
  ShieldCheck,
  SquareParking,
  UtensilsCrossed,
  WashingMachine,
  Wifi,
} from "lucide-react";

export const amenities = [
  { label: "WiFi Gratis", icon: Wifi },
  { label: "Seguridad 24/7", icon: ShieldCheck },
  { label: "Estacionamiento Incluido", icon: SquareParking },
  { label: "Servicio a la habitación", icon: ConciergeBell },
  { label: "Aire Acondicionado", icon: AirVent },
  { label: "Recepción 24/7", icon: BellRing },
  { label: "Accesible para personas en silla de ruedas", icon: Accessibility },
  { label: "Servicio Completo de Lavandería", icon: WashingMachine },
  { label: "Adecuado para niños", icon: Baby },
  { label: "Comedor / Restaurante", icon: UtensilsCrossed },
];

export default function AmenityList() {
  return (
    <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {amenities.map(({ label, icon: Icon }) => (
        <li key={label} className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-light text-teal">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold">{label}</span>
        </li>
      ))}
    </ul>
  );
}
