import { useNavigate, NavLink } from "react-router-dom";
import { setAuthToken } from "../api";
import logo from "../assets/mylogogeobee.svg";
import "./header.css";

export default function Header() {
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "";

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem("email");
    navigate("/login");
  };

  return (
    <header className="navbar">
      <nav className="nav-container">
        <div className="left-group">
          {/* Logo + Home (active pill when on /home) */}
          <NavLink
            to="/home"
            className={({ isActive }) =>
              isActive ? "logo-link active" : "logo-link"
            }
            aria-label="GeoBee Home"
          >
            <img src={logo} alt="GeoBee logo" />
            GeoBee
          </NavLink>

          {/* Nav links with active highlight */}
          <div className="nav-links">
            <NavLink
              to="/favorites"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Favorites
            </NavLink>
            <NavLink
              to="/compare"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Compare countries
            </NavLink>
          </div>
        </div>

        <div className="right-group">
          {email && (
            <span className="user-email" title={email}>
              {email}
            </span>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}
