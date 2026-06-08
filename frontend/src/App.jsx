import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import FarmerDashboard from "./pages/FarmerDashboard";
import CooperativeDashboard from "./pages/CooperativeDashboard";
import ProductTrace from "./pages/ProductTrace";
import "./App.css";

function NavBar() {
  const location = useLocation();
  const links = [
    { path: "/", label: "🌱 Farmer" },
    { path: "/cooperative", label: "🏭 Cooperative" },
    { path: "/trace", label: "🔍 Trace Product" },
  ];
  return (
    <nav className="navbar">
      <div className="nav-brand">🌾 Agri-D-Ledger</div>
      <div className="nav-links">
        {links.map(l => (
          <Link key={l.path} to={l.path}
            className={location.pathname === l.path ? "nav-link active" : "nav-link"}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <div className="page-content">
        <Routes>
          <Route path="/" element={<FarmerDashboard />} />
          <Route path="/cooperative" element={<CooperativeDashboard />} />
          <Route path="/trace" element={<ProductTrace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
