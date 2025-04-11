// pages/login/[role].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { role } = router.query;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // Aqui você simularia uma autenticação real
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("userType", String(role));
    router.push(`/${role}/dashboard`);
  };

  return (
    <div className="login-container">
      <h1>Login - {role}</h1>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" />
      <button onClick={handleLogin}>Entrar</button>
    </div>
  );
}
