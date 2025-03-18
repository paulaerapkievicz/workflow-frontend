"use client";

import { useEffect, useState } from "react";
import { getSupermarketDashboard } from "@/services/dashboardService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getSupermarketDashboard();
        setDashboardData(data);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      }
    }
    fetchData();
  }, []);

  if (!dashboardData) return <p>Carregando...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard do Supermercado</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trabalhos Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashboardData.openJobs}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagamentos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">R$ {dashboardData.pendingPayments}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Freelancers Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashboardData.activeFreelancers}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Evolução dos Pagamentos</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dashboardData.paymentsEvolution}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#4F46E5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
