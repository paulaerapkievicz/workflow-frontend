// import styles from "../styles/search.module.scss";
// import Head from "next/head";
// import HeaderAuth from "../src/components/common/headerAuth";
// import { useRouter } from "next/router";
// import { useEffect, useState } from "react";
// import courseService, { CourseType } from "@/src/services/courseService";
// import PageSpinner from "@/src/components/common/spinner";
// import SearchCard from "@/src/components/searchCard";
// import { Container } from 'reactstrap';
// import Footer from "@/src/components/common/footer";

// const Search = function () {
//   const router = useRouter();
//   const searchName = router.query.name;
//   const [searchResult, setSearchResult] = useState<CourseType[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [authChecked, setAuthChecked] = useState(false);

//   useEffect(() => {
//     const token = sessionStorage.getItem("onebitflix-token");
    
//     if (!token) {
//       router.push("/login");
//     } else {
//       setAuthChecked(true);
//     }
//   }, [router]);

//   const searchCourses = async () => {
//     if (typeof searchName === 'string' && searchName.trim() !== '') {
//       setLoading(true);
//       try {
//         const res = await courseService.getSearch(searchName);
//         setSearchResult(res.data.courses);
//       } catch (error) {
//         console.error("Erro ao buscar cursos", error);
//         setSearchResult([]);
//       } finally {
//         setLoading(false);
//       }
//     } else {
//       setSearchResult([]);
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (authChecked && searchName) {
//       searchCourses();
//     }
//   }, [searchName, authChecked]);

//   if (!authChecked || loading) {
//     return <PageSpinner />;
//   }

//   return (
//     <>
//       <Head>
//         <title>Onebitflix - {searchName}</title>
//         <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
//       </Head>
//       <main className={styles.main}>
//         <div className={styles.headerFooterBg}>
//           <HeaderAuth/>
//         </div>
//         <div className={styles.searchContainer}>
//           {searchResult.length > 0 ? (
//             <Container className="d-flex flex-wrap justify-content-center gap-5 py-4">
//               {searchResult?.map((course) => (
//                 <SearchCard key={course.id} course={course} />
//               ))}
//             </Container>
//           ) : (
//             <div className={styles.searchContainer}>
//               <p className={styles.noSearchResult}>Nenhum resultado encontrado!</p>
//             </div>
//           )}
//         </div>
//         <div className={styles.headerFooterBg}>
//           <Footer/>
//         </div>
//       </main>
//     </>
//   );
// };

// export default Search;