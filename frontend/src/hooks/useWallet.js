import { useState, useEffect } from "react";
import { getContracts } from "../services/contracts";

export function useWallet() {
  const [contracts, setContracts] = useState(null);
  const [address, setAddress]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  async function connect() {
    setLoading(true);
    setError(null);
    try {
      const result = await getContracts();
      setContracts(result);
      setAddress(result.address);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-reconnect if already connected
  useEffect(() => {
    if (window.ethereum) connect();
  }, []);

  return { contracts, address, loading, error, connect };
}
