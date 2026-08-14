"use client";

import { createContext, useContext, type ReactNode } from "react";

const PayPalClientIdContext = createContext("");

export function PayPalClientIdProvider({
  children,
  clientId,
}: {
  children: ReactNode;
  clientId: string;
}) {
  return (
    <PayPalClientIdContext.Provider value={clientId}>
      {children}
    </PayPalClientIdContext.Provider>
  );
}

export function usePayPalClientId() {
  return useContext(PayPalClientIdContext);
}
