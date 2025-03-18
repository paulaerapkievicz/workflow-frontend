import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SupermarketJobsPage from "@/pages/supermarket/jobs";

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/supermarket/jobs" element={<SupermarketJobsPage />} />
      </Routes>
    </Router>
  );
}
