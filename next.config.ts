import type { NextConfig } from "next";

// URLs heredadas del sitio en Wix → rutas nuevas.
// Las rutas con acento se registran codificadas (así llegan en la petición) y sin acento.
const legacy: Array<[string, string]> = [
  ["/habitaci%C3%B3n-sencilla", "/habitaciones/sencilla"],
  ["/habitacion-sencilla", "/habitaciones/sencilla"],
  ["/habitaci%C3%B3n-doble", "/habitaciones/doble"],
  ["/habitacion-doble", "/habitaciones/doble"],
  ["/habitaci%C3%B3n-triple", "/habitaciones/triple"],
  ["/habitacion-triple", "/habitaciones/triple"],
  ["/men%C3%BA", "/menu"],
  ["/booking-engine", "/reservar"],
  ["/habitaciones-1", "/habitaciones"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return legacy.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default nextConfig;
