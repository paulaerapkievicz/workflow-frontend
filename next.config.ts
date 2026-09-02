import type { NextConfig } from "next";

// Libera o carregamento de imagens (fotos de check-out em /uploads) tanto do
// backend local quanto do backend de produção definido em NEXT_PUBLIC_BASEURL.
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "http", hostname: "localhost", port: "3333", pathname: "/uploads/**" },
];

const backendUrl = process.env.NEXT_PUBLIC_BASEURL;
if (backendUrl) {
  try {
    const { protocol, hostname, port } = new URL(backendUrl);
    remotePatterns.push({
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      port: port || undefined,
      pathname: "/uploads/**",
    });
  } catch {
    // URL inválida — ignora e mantém apenas o padrão local.
  }
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
};

export default nextConfig;
