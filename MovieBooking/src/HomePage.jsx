import React from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import NowShowing from "./NowShowing";
import ComingSoon from "./ComingSoon";
import Offers from "./Offers";
import Footer from "./Footer";

export default function HomePage() {
  return (
    <div className="page">
      <Navbar />
      <Hero />
      <NowShowing />
      <ComingSoon />
      <Offers />
      <Footer />
    </div>
  );
}