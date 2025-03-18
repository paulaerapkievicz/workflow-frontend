// "use client";

// import { useEffect, useState } from "react";
// import { getSupermarketJobs } from "@/services/jobService";
// import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
// import Link from "next/link";

// export default function TrabalhosPage() {
//   const [jobs, setJobs] = useState([]);

//   useEffect(() => {
//     async function fetchJobs() {
//       try {
//         const data = await getSupermarketJobs();
//         setJobs(data);
//       } catch (error) {
//         console.error("Erro ao buscar trabalhos:", error);
//       }
//     }
//     fetchJobs();
//   }, []);

//   return (
//     <div>
//       <h1 className="text-2xl font-bold mb-4">Trabalhos Abertos</h1>
//       <Table>
//         <TableHead>
//           <TableRow>
//             <TableCell>ID</TableCell>
//             <TableCell>Título</TableCell>
//             <TableCell>Status</TableCell>
//             <TableCell>Ações</TableCell>
//           </TableRow>
//         </TableHead>
//         <TableBody>
//           {jobs.map((job) => (
//             <TableRow key={job.id}>
//               <TableCell>{job.id}</TableCell>
//               <TableCell>{job.title}</TableCell>
//               <TableCell>{job.status}</TableCell>
//               <TableCell>
//                 <Link href={`/dashboard/trabalhos/${job.id}`} className="text-blue-500">
//                   Ver Detalhes
//                 </Link>
//               </TableCell>
//             </TableRow>
//           ))}
//         </TableBody>
//       </Table>
//     </div>
//   );
// }
