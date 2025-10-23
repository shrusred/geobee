import { useEffect, useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { setAuthToken } from "../api";
import logo from "../assets/mylogogeobee.svg";
import "./header.css";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = localStorage.getItem("email") || "";
  const [open, setOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem("email");
    navigate("/login");
  };

  return (
    <header className="navbar" role="banner">
      <nav className="nav-container" aria-label="Primary">
        <div className="brand-row">
          <NavLink
            to="/home"
            className={({ isActive }) =>
              isActive ? "logo-link active" : "logo-link"
            }
            aria-label="GeoBee Home"
          >
            <img src={logo} alt="" aria-hidden="true" />
            <span className="brand-text">GeoBee</span>
          </NavLink>

          <button
            className="menu-toggle"
            aria-label="Toggle menu"
            aria-controls="primary-menu"
            aria-expanded={open ? "true" : "false"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="menu-bars" />
          </button>
        </div>

        <div
          id="primary-menu"
          className={open ? "menu open" : "menu"}
          data-state={open ? "open" : "closed"}
        >
          <div className="nav-links" role="menubar">
            <NavLink
              to="/favorites"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              role="menuitem"
            >
              Favorites
            </NavLink>
            <NavLink
              to="/compare"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              role="menuitem"
            >
              Compare countries
            </NavLink>
          </div>

          <div className="account-actions">
            {email && (
              <span className="user-email" title={email}>
                {email}
              </span>
            )}
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
