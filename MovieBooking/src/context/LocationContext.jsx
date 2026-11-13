import React, { createContext, useContext, useState } from "react";
import { LOCATIONS } from "../utils/movieOptions";

const LocationContext = createContext(null);

const STORAGE_KEY = "selectedLocation";

const getInitialLocation = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && LOCATIONS.includes(stored) ? stored : LOCATIONS[0];
};

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(getInitialLocation);

  const setLocation = (next) => {
    setLocationState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <LocationContext.Provider value={{ location, setLocation, locations: LOCATIONS }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocationCity = () => useContext(LocationContext);
