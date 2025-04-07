import Head from "next/head";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Link from "next/link";

export default function HomePage() {
  useEffect(() => {
    AOS.init();
  }, []);

  return (
    <>
      <Head>
        <title>WorkFlow - Gestão Inteligente de Vagas e Pagamentos</title>
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <meta property="og:title" content="WorkFlow - Plataforma de Gestão de Vagas e Pagamentos" />
        <meta name="description" content="Gerencie vagas, pagamentos e operações do seu supermercado de forma eficiente com o WorkFlow." />
      </Head>

      <main className="bg-gray-100 min-h-screen flex flex-col items-center text-center px-4">
        {/* Hero Section */}
        <section className="w-full max-w-4xl mt-20" data-aos="fade-up" data-aos-duration="1600">
          <h1 className="text-4xl font-bold text-gray-800">
            Gerencie vagas e pagamentos da sua rede de supermercados
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Controle a abertura de vagas, acompanhe pagamentos para agências e monitore a gestão de suas filiais de forma simples.
          </p>
        </section>

        {/* Seção de Perfis */}
        <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mt-16" data-aos="fade-up" data-aos-duration="1200">
          {/* Card 1: Supermercado */}
          <div className="p-6 bg-white shadow-lg rounded-lg text-center">
            <h3 className="text-xl font-semibold text-gray-800">Supermercado</h3>
            <p className="mt-2 text-gray-600">Gerencie vagas, controle pagamentos para agências e acompanhe a performance das suas filiais.</p>
            <Link href="/login/supermarket">
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Entrar</button>
            </Link>
          </div>

          {/* Card 2: Agência */}
          <div className="p-6 bg-white shadow-lg rounded-lg text-center">
            <h3 className="text-xl font-semibold text-gray-800">Agência</h3>
            <p className="mt-2 text-gray-600">Receba vagas dos supermercados, gerencie freelancers e distribua trabalhos de forma eficiente.</p>
            <Link href="/login/agency">
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Entrar</button>
            </Link>
          </div>

          {/* Card 3: Freelancer */}
          <div className="p-6 bg-white shadow-lg rounded-lg text-center">
            <h3 className="text-xl font-semibold text-gray-800">Freelancer</h3>
            <p className="mt-2 text-gray-600">Acesse sua conta, visualize vagas disponíveis e gerencie seus pagamentos.</p>
            <Link href="/login/freelancer">
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Entrar</button>
            </Link>
          </div>
        </section>

        {/* Rodapé */}
        <footer className="mt-20 py-6 text-gray-600">
          <p>&copy; {new Date().getFullYear()} WorkFlow. Todos os direitos reservados.</p>
        </footer>
      </main>
    </>
  );
}
