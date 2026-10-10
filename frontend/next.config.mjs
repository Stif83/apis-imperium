/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serveur autonome embarquant ses dépendances : image Docker complète pour infra isolée
  output: 'standalone',
};

export default nextConfig;
