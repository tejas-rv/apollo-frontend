import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import PublicNav from "../components/PublicNav";
import AppLogo from "../components/AppLogo";
import "../components/AppLogo.css";
import "./HomePage.css";

const STATS = [
  { value: "15+", label: "Years experience" },
  { value: "500+", label: "Projects delivered" },
  { value: "40+", label: "Engineers on ground" },
  { value: "24/7", label: "Support & service" },
];

const PRODUCTS = [
  { title: "Passenger Elevators", copy: "Traction elevators for commercial and residential buildings, with car enclosures customised in mild steel, stainless steel or glass.", image: "/liftImages/passenger-elevator.jpg" },
  { title: "Home Lifts", copy: "Compact lifts built for bungalows and villas, fitted to an existing staircase or a new build without disturbing the front elevation.", image: "/liftImages/home-lift.jpg" },
  { title: "Capsule Lifts", copy: "3-side and 5-side panoramic glass cars for malls, jewellery showrooms and supermarkets, built around visibility into the lobby.", image: "/liftImages/capsule-lift.jpg" },
  { title: "MRL Elevators", copy: "Machine-room-less cars using a gearless permanent-magnet synchronous drive, saving shaft space and running on lower energy.", image: "/liftImages/mrl-elevator.jpg" },
  { title: "Glass Door Lifts", copy: "Tempered laminated glass fronts for showrooms, skywalks and malls, sourced to EN-81 glazing standards.", image: "/liftImages/glass-door-lift.jpg" },
  { title: "Hospital & Freight Lifts", copy: "Wide-door cars sized for stretchers and bulk loads, up to 5,000 kg, with reinforced car and lift-well dimensions.", image: "/liftImages/hospital-freight-lift.jpg" },
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

const GALLERY = [
  { caption: "Residential home-lift installation", image: "/liftImages/gallery-residential.jpg" },
  { caption: "Commercial capsule lift, mall lobby", image: "/liftImages/gallery-capsule-mall.jpg" },
  { caption: "Machine room retrofit", image: "/liftImages/gallery-machine-room.jpg" },
  { caption: "High-rise passenger elevator bank", image: "/liftImages/gallery-highrise.jpg" },
  { caption: "Hospital freight lift commissioning", image: "/liftImages/gallery-hospital-freight.jpg" },
  { caption: "Annual maintenance service visit", image: "/liftImages/gallery-amc-service.jpg" },
];

const ENGINEERING = [
  { title: "Controllers", copy: "Program Logic Control systems that read upward and downward traffic and select the right car across a bank of elevators." },
  { title: "Inverters", copy: "V3F drives — Fuji for gearless machines, Yaskawa for traction elevators — chosen to protect the winding unit through voltage spikes and phase reversal." },
  { title: "Auto Rescue Device", copy: "ARD units configured to bring a trapped car to the nearest floor during a blackout or minor fault, so passengers are never left stranded." },
];

export default function HomePage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash || location.hash === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.pathname, location.hash]);

  return (
    <div className="ap-home">
      <PublicNav />

      <section id="top" className="ap-hero">
        <div className="ap-hero__media" />
        <div className="ap-hero__scrim" />
        <div className="ap-hero__content">
          <div className="ap-hero__grid">
            <div className="ap-hero__copy">
              <h1>Vertical transportation,<br />engineered and serviced end to end.</h1>
              <p>Apollo Elevator designs, installs and maintains passenger, home, capsule and freight elevators across Bangalore — and handles AMC contracts, billing, and service visits through this platform.</p>
              <div className="ap-hero__ctas">
                <Link to="/contact" className="ap-btn ap-btn--primary">Get a quote</Link>
                <a href="#products" className="ap-btn ap-btn--ghost">View products</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ap-stats">
        <div className="ap-stats__inner">
          {STATS.map((s) => (
            <div className="ap-stat" key={s.label}>
              <span>{s.value}</span>
              <small>{s.label}</small>
            </div>
          ))}
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
              <div className="ap-about__photo">
                <img src="/liftImages/engineers-inspection.jpg" alt="Apollo Elevator engineers inspecting a lift installation" loading="lazy" />
              </div>
            </div>
          </section>

          <section id="products" className="ap-section">
            <span className="ap-section__eyebrow">Products</span>
            <h2>One vendor for the full spectrum of lifts.</h2>
            <div className="ap-products">
              {PRODUCTS.map((p) => (
                <div className="ap-product" key={p.title}>
                  <div className="ap-product__media"><img src={p.image} alt={p.title} loading="lazy" /></div>
                  <h3>{p.title}</h3>
                  <p>{p.copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="why" className="ap-section">
            <span className="ap-section__eyebrow">Why Apollo</span>
            <h2>Why Choose Apollo — what a service contract actually gets you.</h2>
            <div className="ap-why">
              {WHY_APOLLO.map((item) => (
                <div className="ap-why__item" key={item}>
                  <CheckCircle2 size={20} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="gallery" className="ap-section">
            <span className="ap-section__eyebrow">Gallery</span>
            <h2>Recent installations and service visits.</h2>
            <div className="ap-gallery">
              {GALLERY.map((g) => (
                <figure className="ap-gallery__item" key={g.caption}>
                  <img src={g.image} alt={g.caption} loading="lazy" />
                  <figcaption>{g.caption}</figcaption>
                </figure>
              ))}
            </div>
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

        </div>
      </div>

      <section className="ap-cta">
        <div className="ap-cta__inner">
          <div>
            <h2>Ready to get moving?</h2>
            <p>Tell us about your building and we’ll call you back within one business day.</p>
          </div>
          <Link className="ap-btn ap-btn--primary" to="/contact">Contact us</Link>
        </div>
      </section>

      <footer className="ap-footer">
        <AppLogo size={28} rounded={false} />
        <div className="ap-footer__contact">
          <a href="tel:+918971974009">8971974009</a>
          <a href="mailto:apolloelevators1@gmail.com">apolloelevators1@gmail.com</a>
        </div>
        <span>© {new Date().getFullYear()} Apollo Elevator. All rights reserved.</span>
      </footer>
    </div>
  );
}
