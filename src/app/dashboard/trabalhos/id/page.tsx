// "use client";

// import { useEffect, useState } from "react";
// import { useParams } from "next/navigation";
// import { getJobDetails } from "@/services/jobService";

// export default function JobDetailsPage() {
//   const { id } = useParams();
//   const [job, setJob] = useState(null);

//   useEffect(() => {
//     async function fetchJob() {
//       try {
//         const data = await getJobDetails(id);
//         setJob(data);
//       } catch (error) {
//         console.error("Erro ao buscar detalhes do trabalho:", error);
//       }
//     }
//     fetchJob();
//   }, [id]);

//   if (!job) return <p>Carregando...</p>;

//   return (
//     <div>
//       <h1 className="text-2xl font-bold">{job.title}</h1>
//       <p className="text-gray-600">{job.description}</p>
//       <p className="mt-4 font-semibold">Status: {job.status}</p>
//     </div>
//   );
// }
