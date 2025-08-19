import React, { useEffect, useState, useRef } from "react";
import "./homepage.css";
import { useNavigate, Link } from "react-router-dom";
import { authenticateToken } from "../../utilities/fetchApi";
import { img, slidesData, plansData } from '../../utilities/consts';

// ------------ component -------------
const HomePage = () => {
  const navigate = useNavigate();

  // slider state
  const [slideIndex, setSlideIndex] = useState(0);
  const nextSlide = () => setSlideIndex((i) => (i + 1) % slidesData.length);
  const prevSlide = () =>
    setSlideIndex((i) => (i - 1 + slidesData.length) % slidesData.length);
  // pricing toggle state
  const [billing, setBilling] = useState("month");

  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef(null);


  const logOut = () => {
    localStorage.clear();
    setIsLoggedIn(false);
  }

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setIsLoggedIn(false);
          return;
        }
        const response = await authenticateToken();
        setIsLoggedIn(true);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };
    verifyToken();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the menu is open and the click is outside the menu container, close it.
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    // Add event listener when the menu is open
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    // Cleanup: remove the event listener when the component unmounts or the menu closes
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]); // This effect depends on the isMenuOpen state

  return (
    <div className="homepage">
      {/* ================= Header ================= */}
      <header className="header">
        <section className="flex">
          <div className="header-left">
            {isLoggedIn && (
              <button className="btn" onClick={logOut}>
                Logout
              </button>
            )}
          </div>
          <a href="#home" className="logo">
            <i className="fas fa-money-bill-trend-up"></i> E-Stock
          </a>
          <div className="header-right">
            {isLoggedIn ? (
              <div className="user-menu-container" ref={menuRef}>
                {/* Make the username clickable to toggle the menu */}
                <div className="userName" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  Welcome, {localStorage.getItem("username")}
                  {/* Add an icon to indicate it's a dropdown */}
                  <i className={`fas fa-chevron-down ${isMenuOpen ? 'open' : ''}`}></i>
                </div>

                {/* Conditionally render the dropdown menu */}
                {isMenuOpen && (
                  <div className="dropdown-menu">
                    {/* Add your navigation links here */}
                    <Link to="/interactive-graph" onClick={() => setIsMenuOpen(false)}>
                      <i className="fas fa-chart-line"></i> Interactive Graph
                    </Link>
                    <Link to="/invest" onClick={() => setIsMenuOpen(false)}>
                      <i className="fas fa-user-circle"></i> Investing Page
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/signup" className="btn">
                Sign Up Now
              </Link>
            )}
          </div>
        </section>
      </header>

      {/* ================= NavBar ================= */}
      <div className="navbar">
        <nav className="nav">
          <a href="#home">
            <i className="fas fa-home"></i> <span>home</span>
          </a>
          <a href="#about">
            <i className="fas fa-circle-info"></i> <span>about</span>
          </a>
          <a href="#download">
            <i className="fas fa-download"></i> <span>download</span>
          </a>
          <a href="#pricing">
            <i className="fas fa-comments-dollar"></i> <span>pricing</span>
          </a>
          {isLoggedIn ? null : (
            <Link to="/login">
              <i className="fas fa-user"></i>
              <span>login</span>
            </Link>
          )}
        </nav>
      </div>

      {/* ================= Home ================= */}
      <section className="home" id="home">
        <div className="flex">
          <div className="content">
            <h3>start your trading journey with us 👍</h3>
            <p>
              "Join a community of smart investors and gain access to real-time market insights, secure transactions, and powerful tools to grow your portfolio.
              Whether you're a beginner or a pro, we make trading simple, intuitive, and rewarding."
            </p>
            <a href="#download" className="btn">
              start trading
            </a>
          </div>
          <div className="image">
            <img src={img("top.png")} alt="home" />
          </div>
        </div>
      </section>

      {/* ================= Services ================= */}
      <section className="services">
        <div className="box-container">
          {[
            {
              icon: "fas fa-money-bill-trend-up",
              title: "extra income",
              description:
                "Maximize your earning potential with smart tools that help you build additional income streams effortlessly.",
            },
            {
              icon: "fas fa-coins",
              title: "financial advisory",
              description:
                "Receive expert guidance tailored to your financial goals, helping you make smarter decisions every step of the way.",
            },
            {
              icon: "fas fa-shield-halved",
              title: "account protection",
              description:
                "Keep your data and transactions secure with our state-of-the-art protection and real-time monitoring.",
            },
            {
              icon: "fas fa-credit-card",
              title: "easy payments",
              description:
                "Enjoy fast and seamless payment experiences with full transparency and zero hassle.",
            },
            {
              icon: "fas fa-money-bill-transfer",
              title: "easy withdraw",
              description:
                "Access your funds anytime with quick and easy withdrawal options, no waiting or delays.",
            },
            {
              icon: "fas fa-headset",
              title: "24/7 support",
              description:
                "We're here whenever you need us—our friendly support team is available around the clock to assist you.",
            },
          ].map(({ icon, title, description }) => (
            <div className="box" key={title}>
              <i className={icon}></i>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= About ================= */}
      <div className="about" id="about">
        <section className="flex">
          <div className="content">
            <h3>benefits we offer 😍</h3>
            <p>
              Discover a seamless trading experience with real-time market insights, powerful analytical tools, and a user-friendly interface. Whether you're just starting out or scaling your investments, we provide the tools and support to help you grow confidently. Enjoy low fees, top-tier security, and an all-in-one platform built for your success.
            </p>
            <p>
              Join a community of smart investors and gain access to real-time market insights, secure transactions, and powerful tools to grow your portfolio.
            </p>
            <a href="#" className="btn">
              learn trading
            </a>
          </div>
          <div className="image">
            <img src={img("stock.png")} alt="about" />
          </div>
        </section>
      </div>

      {/* ================= Reviews ================= */}
      <section className="reviews">
        <div className="flex">
          <div className="content">
            <h3>what our clients says 😊</h3>
            <p>
              Our customers love the experience we provide—personalized, reliable, and built for success.
              But don’t just take our word for it—see what they have to say!
            </p>
            <div className="controls">
              <div className="fas fa-angle-left" onClick={prevSlide}></div>
              <div className="fas fa-angle-right" onClick={nextSlide}></div>
            </div>
          </div>

          <div className="slides-container">
            {slidesData.map((slide, idx) => (
              <div
                className={`slide ${idx === slideIndex ? "active" : ""}`}
                key={idx}
              >
                <p className="text">{slide.text}</p>
                <div className="user">
                  <img src={slide.img} alt="client" />
                  <div>
                    <h3>{slide.user}</h3>
                    <div className="stars">
                      {[...Array(4)].map((_, i) => (
                        <i className="fas fa-star" key={i}></i>
                      ))}
                      <i className="fas fa-star-half-alt"></i>
                    </div>
                  </div>
                  <i className="fas fa-quote-right"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= Download ================= */}
      <div className="download" id="download">
        <section className="flex">
          <div className="image">
            <img src={img("news.png")} alt="download" />
          </div>
          <div className="content">
            <h3>OUR ACHIVMENTS</h3>
            <p>
              Since our launch, E-Stock has transformed the way people invest. With over 100,000 active users, a 98% satisfaction rate, and
              recognition as the Best Investment Platform of 2020–2025, we've helped users generate real profits, build strong portfolios, a
              nd gain confidence in the market. Our tools empower both beginners and pros to take control of their financial future with
              simplicity, speed, and security.


            </p>

          </div>
        </section>
      </div>

      {/* ================= Pricing ================= */}
      <section className="pricing" id="pricing">
        <div className="toggle-buttons">
          <div
            className={`button month-btn ${billing === "month" ? "active" : ""}`}
            onClick={() => setBilling("month")}
          >
            monthly
          </div>
          <div
            className={`button year-btn ${billing === "year" ? "active" : ""}`}
            onClick={() => setBilling("year")}
          >
            yearly
          </div>
        </div>

        <div className="box-container">
          {plansData.map((plan) => (
            <div className="box" key={plan.tier}>
              <h3>{plan.tier}</h3>
              <div className="price">
                {billing === "month" ? plan.monthly : plan.yearly}
              </div>
              <div className="list">
                {plan.features.map((f, idx) => (
                  <p key={f}>
                    <i
                      className={
                        plan.included[idx]
                          ? "fas fa-circle-check"
                          : "fas fa-circle-xmark"
                      }
                    ></i>{" "}
                    <span>{f}</span>
                  </p>
                ))}
              </div>
              <a href="#" className="btn">
                choose plan
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ================= Newsletter ================= */}
      <div className="newsletter">
        <section className="news">
          <h3>get latest news</h3>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Enim atque
            officiis veniam eos, maiores iure!
          </p>
          <form onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="your name"
              maxLength="30"
              className="input"
            />
            <input
              type="email"
              placeholder="your email"
              maxLength="50"
              className="input"
            />
            <input type="submit" value="subscribe now" className="btn" />
          </form>
        </section>
      </div>

      {/* ================= Brands ================= */}
      <section className="brands">
        {[1, 2].map((row) => (
          <div className="brands-container" key={row}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <img src={img(`brand-${n}.svg`)} alt={`brand-${n}`} key={n} />
            ))}
          </div>
        ))}
      </section>

      {/* ================= Footer ================= */}
      <footer className="footer">
        <section className="box-container">
          <div className="box">
            <h3>quick links</h3>
            <a href="#home">
              <i className="fas fa-angle-right"></i> home
            </a>
            <a href="#about">
              <i className="fas fa-angle-right"></i> about
            </a>
            <a href="#download">
              <i className="fas fa-angle-right"></i> download
            </a>
            <a href="#pricing">
              <i className="fas fa-angle-right"></i> pricing
            </a>
          </div>

          <div className="box">
            <h3>useful links</h3>
            <a href="#">
              <i className="fas fa-angle-right"></i> FAQ
            </a>
            <a href="#">
              <i className="fas fa-angle-right"></i> login / register
            </a>
            <a href="#">
              <i className="fas fa-angle-right"></i> privacy policy
            </a>
            <a href="#">
              <i className="fas fa-angle-right"></i> terms and conditions
            </a>
          </div>

          <div className="box">
            <h3>contact us</h3>
            <a href="tel:1234567890">
              <i className="fas fa-phone"></i> +123-456-7890
            </a>
            <a href="tel:1112223333">
              <i className="fas fa-phone"></i> +111-222-3333
            </a>
            <a href="mailto:example@gmail.com">
              <i className="fas fa-envelope"></i> example@gmail.com
            </a>
            <a href="mailto:info@gmail.com">
              <i className="fas fa-envelope"></i> info@gmail.com
            </a>
          </div>

          <div className="box">
            <h3>follow us</h3>
            <a href="#">
              <i className="fab fa-youtube"></i> youtube
            </a>
            <a href="#">
              <i className="fab fa-instagram"></i> instagram
            </a>
            <a href="#">
              <i className="fab fa-whatsapp"></i> whatsapp
            </a>
            <a href="#">
              <i className="fab fa-github"></i> github
            </a>
          </div>
        </section>
        <div className="credit">

        </div>
      </footer>
    </div>
  );
};

export default HomePage;
