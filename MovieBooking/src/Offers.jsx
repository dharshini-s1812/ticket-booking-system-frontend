import React, { useEffect, useState } from "react";
import "./App.css";
import { getPublicOffers } from "./services/offerService";

export default function Offers() {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const data = await getPublicOffers();
      setOffers(data);
    } catch (error) {
      console.error("Failed to load offers:", error);
    }
  };

  return (
    <section className="offers">
      <div className="offers-inner">
        <div className="movies-header">
          <div>
            <span className="hero-eyebrow">Deals Worth Clipping</span>
            <h2 className="movies-title">Offers</h2>
          </div>
        </div>

        <div className="offers-grid">
          {offers.map((offer) => (
            <article className="offer-card" key={offer.id}>
              <div className="offer-stub">
                <span className="offer-percent">{offer.discountPercentage}%</span>
                <span className="offer-off">OFF</span>
              </div>

              <div className="offer-content">
                <h3 className="offer-title">{offer.offerName}</h3>
                <p className="offer-desc">{offer.description}</p>

                <div className="offer-footer">
                  <span className="offer-code">Valid till {offer.endDate}</span>
                  <button className="ticket-btn ticket-btn--outline offer-claim-btn">
                    Claim
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
