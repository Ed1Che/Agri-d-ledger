import { useState } from "react";
import { useWallet } from "../hooks/useWallet";

export default function ProductTrace() {
  const { contracts, address, loading, error, connect } = useWallet();
  const [productId, setProductId] = useState("");
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [certified, setCertified] = useState(null);
  const [status, setStatus] = useState("");

  async function traceProduct() {
    if (!contracts || !productId) return;
    setStatus("Tracing product...");
    try {
      const p = await contracts.productRegistry.getProduct(productId);
      setProduct(p);
      const h = await contracts.chainOfCustody.getCustodyHistory(productId);
      setHistory(h);
      const cert = await contracts.qualityVerification.isProductCertified(productId);
      setCertified(cert);
      setStatus("");
    } catch (err) {
      setStatus(`❌ Product not found or error: ${err.message}`);
    }
  }

  if (!address) return (
    <div className="dash-container">
      <h2>🔍 Trace a Product</h2>
      {error && <p style={{color:"red"}}>{error}</p>}
      <button className="btn-primary" onClick={connect} disabled={loading}>
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
    </div>
  );

  return (
    <div className="dash-container">
      <h2>🔍 Trace a Product</h2>
      <p className="address-tag">Connected: {address.slice(0,6)}...{address.slice(-4)}</p>

      <div className="card">
        <h3>Enter Product ID</h3>
        <input className="inp" placeholder="Product ID (0x...)" value={productId}
          onChange={e => setProductId(e.target.value)} />
        <button className="btn-primary" onClick={traceProduct}>Trace</button>
        {status && <p className="status-box">{status}</p>}
      </div>

      {product && (
        <div className="card">
          <h3>Product Details</h3>
          <p><strong>Type:</strong> {product[2]}</p>
          <p><strong>Quantity:</strong> {product[3]?.toString()} kg</p>
          <p><strong>Farm GPS:</strong> {product[5]}</p>
          <p><strong>Farmer:</strong> {product[1]?.slice(0,10)}...</p>
          <p><strong>Certified:</strong>
            <span style={{color: certified ? "#4caf50" : "#f44336", marginLeft: 8}}>
              {certified ? "✅ Yes" : "❌ Not certified"}
            </span>
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h3>Chain of Custody ({history.length} transfers)</h3>
          {history.map((h, i) => (
            <div key={i} className="history-item">
              <p><strong>Step {i + 1}</strong></p>
              <p>From: {h[0]?.slice(0,10)}...</p>
              <p>To: {h[1]?.slice(0,10)}...</p>
              <p>Location: {h[2]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
