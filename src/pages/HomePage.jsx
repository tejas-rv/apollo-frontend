import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Award,
  Users,
  HardHat,
  Clock,
  ShieldCheck,
  FileCheck2,
  Headphones,
  Wrench,
  PhoneCall,
  Zap,
  Star,
  ArrowRight,
} from "lucide-react";
import PublicNav from "../components/PublicNav";
import AppLogo from "../components/AppLogo";
import "../components/AppLogo.css";
import "./HomePage.css";

const STATS = [
  { icon: Award, value: "15+", label: "Years experience" },
  { icon: Users, value: "200+", label: "Projects completed" },
  { icon: HardHat, value: "40+", label: "Engineers experience" },
  { icon: Clock, value: "24/7", label: "Support available" },
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
  { icon: ShieldCheck, title: "Quality & Safety", copy: "International safety standards & high-quality components." },
  { icon: Users, title: "Experienced Team", copy: "Skilled engineers with years of domain experience." },
  { icon: Clock, title: "Timely Service", copy: "On-time delivery, installation and quick support." },
  { icon: FileCheck2, title: "AMC Plans", copy: "Comprehensive AMC plans to keep your lift running smoothly." },
  { icon: Headphones, title: "24/7 Support", copy: "Round-the-clock breakdown support across Bangalore." },
  { icon: Wrench, title: "Good Workmanship", copy: "Clean, precise installation with a neat finish on every job." },
];

const TRUST_BAR = [
  { icon: PhoneCall, title: "24/7 Support", copy: "Always here for you" },
  { icon: Zap, title: "Quick Response", copy: "Within 2–4 hours" },
  { icon: ShieldCheck, title: "Genuine Parts", copy: "100% original parts" },
  { icon: Star, title: "Trusted by 200+ Customers", copy: "Serving Bangalore since 2010" },
];

const GALLERY = [
  { caption: "Bhargava Customer House", image: "/liftImages/customerLift1.jpg" },
  { caption: "Chethan Customer House", image: "/liftImages/customerLift2.jpg" },
  { caption: "Manasa Customer House", image: "/liftImages/customerLift3.jpg" },
  { caption: "Ranganni Customer House", image: "/liftImages/customerLift4.jpg" },
  { caption: "Sheshadri Customer House", image: "/liftImages/customerLift5.jpg" },
  { caption: "Tejas Customer House", image: "/liftImages/customerLift6.jpg" },
];

const ENGINEERING = [
  { title: "Controllers", copy: "Program Logic Control systems intelligently manage upward and downward traffic, analyzing demand and dispatching the right car across a bank of elevators to deliver smooth, efficient, and reliable passenger movement every time." },
  { title: "Inverters", copy: "V3F drives — Fuji, Yasakawa, innovance, INVT, Toshiba, Monarch drive for gear and gearless machines for traction elevators and mories equipment for Hydraulic elevators — chosen to protect the winding unit through voltage spikes and phase reversal." },
  { title: "Auto Rescue Device", copy: "ARD units are designed to automatically guide a stalled car to the nearest floor during blackouts or minor faults, ensuring passengers are never stranded and that safety and convenience are consistently maintained." },
  { title: "Safety Equipments", copy: "Comprehensive safety systems including overspeed governors, buffers, door interlocks, emergency alarms, and limit switches — all designed to safeguard passengers and ensure reliable operation under every condition." },
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
              <h1>Vertical transportation,<br /><span className="ap-hero__hl">engineered and serviced</span> end to end.</h1>
              <p>Apollo Elevator designs, install and maintain passenger, home, capsule and freight elevators through this platform.</p>
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
              <s.icon size={22} />
              <div>
                <span>{s.value}</span>
                <small>{s.label}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="ap-shaft">
        <div className="ap-sections">
          <section id="about" className="ap-section">
            <div className="ap-about">
              <div className="ap-about__copy">
                <span className="ap-section__eyebrow">About</span>
                <h2>Built by engineers who have spent 40 years in the shaft.</h2>
                <p>Founded in 2010, Apollo Elevator delivers reliable, world-class elevator solutions tailored for Indian buildings. Every system is designed and installed in strict compliance with EN-81 international standards as well as Indian norms, covering traction, hydraulic, MR, and MRL gear and gearless elevators. Our commitment ensures safety, efficiency, and dependable performance in every installation.</p>
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
                  <a className="ap-product__link" href="#products">Learn More <ArrowRight size={14} /></a>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      <section id="why" className="ap-whyband">
        <div className="ap-whyband__inner">
          <span className="ap-section__eyebrow ap-section__eyebrow--light">Why Choose Apollo Elevators?</span>
          <h2>Experience | Quality | Trust | Workmanship</h2>
          <div className="ap-why">
            {WHY_APOLLO.map((item) => (
              <div className="ap-why__item" key={item.title}>
                <item.icon size={22} />
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="ap-shaft">
        <div className="ap-sections">
          <section id="gallery" className="ap-section">
            <span className="ap-section__eyebrow">Our Projects</span>
            <h2>Some of Our Recent Projects</h2>
            <div className="ap-gallery">
              <div className="ap-gallery__track">
                {[...GALLERY, ...GALLERY].map((g, i) => (
                  <figure className="ap-gallery__item" key={`${g.caption}-${i}`}>
                    <img src={g.image} alt={g.caption} loading="lazy" />
                  </figure>
                ))}
              </div>
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

      <section className="ap-trustbar">
        <div className="ap-trustbar__inner">
          {TRUST_BAR.map((t) => (
            <div className="ap-trustbar__item" key={t.title}>
              <t.icon size={20} />
              <div>
                <strong>{t.title}</strong>
                <small>{t.copy}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="ap-footer">
        <div className="ap-footer__inner">
          <AppLogo size={80} rounded={false} tone="light" />
          <div className="ap-footer__contact">
            <a href="tel:+918971974009">8971974009</a>
            <a href="mailto:apolloelevators1@gmail.com">apolloelevators1@gmail.com</a>
          </div>
          <span>© {new Date().getFullYear()} Apollo Elevator. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
