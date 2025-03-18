import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 sm:px-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <h1 className="text-4xl sm:text-6xl font-bold mb-6">Bem-vindo ao WorkFlow</h1>
        <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-6">
          Conectando supermercados, agências e freelancers para um trabalho eficiente e organizado.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard/supermarket">
            <button className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold shadow-md hover:bg-gray-200 transition">
              Acessar como Supermercado
            </button>
          </Link>
          <Link href="/dashboard/agency">
            <button className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold shadow-md hover:bg-gray-200 transition">
              Acessar como Agência
            </button>
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="mt-12"
      >
        <Image src="/workflow-logo.svg" alt="WorkFlow Logo" width={200} height={200} />
      </motion.div>
    </div>
  );
}