import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import AppLogo from "./AppLogo";
import "./AppLogo.css";
import "./PublicNav.css";

const LINKS = [
  { to: "/", hash: "#top", label: "Home" },
  { to: "/", hash: "#about", label: "About" },
  { to: "/", hash: "#products", label: "Products" },
  { to: "/", hash: "#why", label: "Why Apollo" },
  { to: "/", hash: "#gallery", label: "Gallery" },
  { to: "/contact", hash: null, label: "Contact" },
];

export default function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const closeMenu = () => setMenuOpen(false);

  const isActive = (link) => {
    if (link.to === "/contact") return location.pathname === "/contact";
    if (location.pathname !== "/") return false;
    const activeHash = window.location.hash || "#top";
    return activeHash === link.hash;
  };

  return (
    <header className="ap-nav">
      <div className="ap-nav__inner">
        <Link to="/" className="ap-nav__brand" onClick={closeMenu}>
          <AppLogo size={40} showText={false} />
          <div className="ap-nav__brandtext">
            <span className="ap-nav__name">Apollo Elevator</span>
            <span className="ap-nav__tag">Ride the wings of change</span>
          </div>
        </Link>
        <button className="ap-nav__toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={menuOpen ? "ap-nav__links open" : "ap-nav__links"} aria-label="Primary">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.hash ? `${link.to}${link.hash}` : link.to}
              onClick={closeMenu}
              className={isActive(link) ? "active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link to="/login" className="ap-nav__login" onClick={closeMenu}>Login</Link>
      </div>
      {menuOpen && <button type="button" className="ap-nav__backdrop" aria-label="Close menu" onClick={closeMenu} />}
    </header>
  );
}
