// import { useState } from "react";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
// import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

// const jobsMock = [
//   { id: 1, title: "Reposição de Estoque", status: "Aberta" },
//   { id: 2, title: "Conferência de Mercadorias", status: "Em Andamento" },
//   { id: 3, title: "Organização de Prateleiras", status: "Concluída" },
// ];

// export default function SupermarketJobs() {
//   const [filter, setFilter] = useState("");
//   const filteredJobs = filter ? jobsMock.filter(job => job.status === filter) : jobsMock;

//   return (
//     <div className="p-6">
//       <h1 className="text-xl font-bold mb-4">Gerenciamento de Vagas</h1>
      
//       <div className="flex justify-between mb-4">
//         <Select onValueChange={setFilter}>
//           <SelectTrigger className="w-48">
//             <SelectValue placeholder="Filtrar por status" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="">Todas</SelectItem>
//             <SelectItem value="Aberta">Aberta</SelectItem>
//             <SelectItem value="Em Andamento">Em Andamento</SelectItem>
//             <SelectItem value="Concluída">Concluída</SelectItem>
//           </SelectContent>
//         </Select>
//         <Button className="bg-blue-600 text-white">+ Criar Nova Vaga</Button>
//       </div>
      
//       <Card>
//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>ID</TableHead>
//                 <TableHead>Título</TableHead>
//                 <TableHead>Status</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {filteredJobs.map(job => (
//                 <TableRow key={job.id}>
//                   <TableCell>{job.id}</TableCell>
//                   <TableCell>{job.title}</TableCell>
//                   <TableCell>{job.status}</TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
