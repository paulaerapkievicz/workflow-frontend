// "use client";

// import { useState } from "react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";

// export default function LoginPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   function handleLogin() {
//     console.log("Fazer login com:", { email, password });
//   }

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gray-100">
//       <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
//         <h2 className="mb-4 text-2xl font-bold text-center">Login</h2>
//         <Input
//           type="email"
//           placeholder="Digite seu e-mail"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           className="mb-3"
//         />
//         <Input
//           type="password"
//           placeholder="Digite sua senha"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           className="mb-4"
//         />
//         <Button onClick={handleLogin} className="w-full">
//           Entrar
//         </Button>
//       </div>
//     </div>
//   );
// }
