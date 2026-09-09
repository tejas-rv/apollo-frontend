import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import AppLogo from "../components/AppLogo";
import "../components/AppLogo.css";
import "./HomePage.css";

const SECTIONS = [
  { id: "top", title: "Home" },
  { id: "about", title: "About" },
  { id: "products", title: "Products" },
  { id: "why", title: "Why Apollo" },
  { id: "engineering", title: "Engineering" },
  { id: "contact", title: "Contact" },
];

const PRODUCTS = [
  { title: "Passenger Elevators", copy: "Traction elevators for commercial and residential buildings, with car enclosures customised in mild steel, stainless steel or glass.", image: "/passenger-icon.jpg" },
  { title: "Home Lifts", copy: "Compact lifts built for bungalows and villas, fitted to an existing staircase or a new build without disturbing the front elevation.", image: "/home-lift.jpg" },
  { title: "Capsule Lifts", copy: "3-side and 5-side panoramic glass cars for malls, jewellery showrooms and supermarkets, built around visibility into the lobby.", image: "/capsule-lift.jpg" },
  { title: "MRL Elevators", copy: "Machine-room-less cars using a gearless permanent-magnet synchronous drive, saving shaft space and running on lower energy.", image: null },
  { title: "Glass Door Lifts", copy: "Tempered laminated glass fronts for showrooms, skywalks and malls, sourced to EN-81 glazing standards.", image: null },
  { title: "Hospital & Freight Lifts", copy: "Wide-door cars sized for stretchers and bulk loads, up to 5,000 kg, with reinforced car and lift-well dimensions.", image: null },
];

const WHY_APOLLO = [
  "In-house R&D team",
  "High passenger safety",
  "Erection and maintenance staff with international exposure",
  "On-time delivery",
  "Prompt communication and service backup",
  "Competitive pricing with no compromise on quality",
  "Documented quality-control measures",
  "Adherence to EN-81 and IS specifications",
  "Established rapport with international vendors",
];

const ENGINEERING = [
  { title: "Controllers", copy: "Program Logic Control systems that read upward and downward traffic and select the right car across a bank of elevators." },
  { title: "Inverters", copy: "V3F drives — Fuji for gearless machines, Yaskawa for traction elevators — chosen to protect the winding unit through voltage spikes and phase reversal." },
  { title: "Auto Rescue Device", copy: "ARD units configured to bring a trapped car to the nearest floor during a blackout or minor fault, so passengers are never left stranded." },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const active = window.location.hash || "#top";

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="ap-home">
      <header className="ap-nav">
        <div className="ap-nav__inner">
          <a href="#top" className="ap-nav__brand">
            <AppLogo size={40} />
            <div className="ap-nav__brandtext">
              <span className="ap-nav__name">Apollo Elevator</span>
              <span className="ap-nav__tag">Ride the wings of change</span>
            </div>
          </a>
          <button className="ap-nav__toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={menuOpen ? "ap-nav__links open" : "ap-nav__links"} aria-label="Primary">
            {SECTIONS.map((f) => <a key={f.id} href={`#${f.id}`} onClick={closeMenu} className={active === `#${f.id}` ? "active" : ""}>{f.title}</a>)}
          </nav>
          <Link to="/login" className="ap-nav__login" onClick={closeMenu}>Login</Link>
        </div>
      </header>

      {menuOpen && <button type="button" className="ap-nav__backdrop" aria-label="Close menu" onClick={closeMenu} />}

      <section id="top" className="ap-hero">
        <div className="ap-hero__media" />
        <div className="ap-hero__scrim" />
        <div className="ap-hero__content">
          <div className="ap-hero__grid">
            <div className="ap-hero__copy">
              <h1>Vertical transportation,<br />engineered and serviced end to end.</h1>
              <p>Apollo Elevator designs, installs and maintains passenger, home, capsule and freight elevators across Bangalore — and handles AMC contracts, billing, and service visits through this platform.</p>
              <div className="ap-hero__ctas">
                <a href="#contact" className="ap-btn ap-btn--primary">Talk to us</a>
              </div>
            </div>
            <div className="ap-hero__panel">
              <div><span>24/7</span><small>Service response</small></div>
              <div><span>AMC</span><small>Billing + reports</small></div>
              <div><span>Support</span><small>Customer support</small></div>
            </div>
          </div>
        </div>
      </section>

      <div className="ap-shaft">
        <div className="ap-sections">
          <section id="about" className="ap-section">
            <span className="ap-section__eyebrow">About</span>
            <h2>Built by engineers who've spent 40 years in the shaft.</h2>
            <div className="ap-about">
              <div className="ap-about__copy">
                <p>Apollo Elevator was established in 2010 to bring dependable, internationally-benchmarked elevator systems to Indian buildings. Every installation is configured against EN-81 international norms and Indian standards for traction, hydraulic and MRL gearless elevators.</p>
                <p>The team is led by CEO T. Venkatesh, who brings over 40 years in the elevator industry, and a maintenance crew trained to keep drives and controls running with minimal downtime.</p>
              </div>
              <div className="ap-about__photos">
                <div className="ap-about__photo ap-about__photo--white">
                  <img src="/cabin-white.jpg" alt="Apollo elevator car interior, brushed steel finish" />
                </div>
                <div className="ap-about__photo ap-about__photo--blue">
                  <img src="/cabin-blue.jpg" alt="Apollo elevator car interior, blue laminate finish" />
                </div>
              </div>
            </div>
          </section>

          <section id="products" className="ap-section">
            <span className="ap-section__eyebrow">Products</span>
            <h2>One vendor for the full spectrum of lifts.</h2>
            <div className="ap-products">
              {PRODUCTS.map((p) => (
                <div className="ap-product" key={p.title}>
                  {p.image ? <div className="ap-product__media"><img src={p.image} alt={p.title} /></div> : <div className="ap-product__media ap-product__media--blank" />}
                  <h3>{p.title}</h3>
                  <p>{p.copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="why" className="ap-section">
            <span className="ap-section__eyebrow">Why Apollo</span>
            <h2>What a service contract with Apollo actually gets you.</h2>
            <ul className="ap-why">
              {WHY_APOLLO.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section id="engineering" className="ap-section">
            <span className="ap-section__eyebrow">Engineering</span>
            <h2>The systems behind every car.</h2>
            <div className="ap-engineering">
              {ENGINEERING.map((e) => (
                <div className="ap-engineering__card" key={e.title}>
                  <h3>{e.title}</h3>
                  <p>{e.copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="contact" className="ap-section ap-section--contact">
            <span className="ap-section__eyebrow">Contact</span>
            <h2>Need help? Contact us.</h2>
            <div className="ap-contact">
              <div className="ap-contact__details">
                <p className="ap-contact__addr">No. 14, Karihobana Halli, T.G. Palya,<br />Bangalore – 560 058</p>
                <p><a href="tel:+918971974009">8971974009</a> · <a href="tel:+919148328396">9148328396</a></p>
                <p><a href="mailto:apolloelevators1@gmail.com">apolloelevators1@gmail.com</a></p>
              </div>
              <div className="ap-contact__card">
                <h3>Customers can reach us here</h3>
                <p>For enquiries, calls, and service requests, please contact us directly. We’ll respond from the Apollo team and help you with the next steps.</p>
                <Link className="ap-btn ap-btn--primary" to="/contact">Enquiry form</Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="ap-footer">
        <AppLogo size={28} rounded={false} />
        <span>© {new Date().getFullYear()} Apollo Elevator. All rights reserved.</span>
      </footer>
    </div>
  );
}
