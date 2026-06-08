import { useState } from "react";
import { useWallet } from "../hooks/useWallet";

export default function CooperativeDashboard() {
  const { contracts, address, loading, error, connect } = useWallet();
  const [productId, setProductId] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [acceptId, setAcceptId] = useState("");
  const [gps, setGps] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState([]);

  async function initiateTransfer() {
    if (!contracts) return;
    setStatus("Initiating transfer...");
    try {
      const tx = await contracts.chainOfCustody.initiateTransfer(productId, transferTo);
      await tx.wait();
      setStatus("✅ Transfer initiated. Waiting for recipient to accept.");
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  async function acceptTransfer() {
    if (!contracts) return;
    setStatus("Accepting transfer...");
    try {
      const tx = await contracts.chainOfCustody.acceptTransfer(acceptId, gps, notes);
      await tx.wait();
      setStatus("✅ Transfer accepted. You now hold custody.");
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  async function viewHistory() {
    if (!contracts || !productId) return;
    try {
      const h = await contracts.chainOfCustody.getCustodyHistory(productId);
      setHistory(h);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  if (!address) return (
    <div className="dash-container">
      <h2>Cooperative Dashboard</h2>
      {error && <p style={{color:"red"}}>{error}</p>}
      <button className="btn-primary" onClick={connect} disabled={loading}>
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
    </div>
  );

  return (
    <div className="dash-container">
      <h2>Cooperative Dashboard</h2>
      <p className="address-tag">Connected: {address.slice(0,6)}...{address.slice(-4)}</p>

      <div className="card">
        <h3>Initiate Transfer</h3>
        <input className="inp" placeholder="Product ID (bytes32)" value={productId}
          onChange={e => setProductId(e.target.value)} />
        <input className="inp" placeholder="Recipient address (0x...)" value={transferTo}
          onChange={e => setTransferTo(e.target.value)} />
        <div style={{display:"flex", gap:8}}>
          <button className="btn-primary" onClick={initiateTransfer}>Initiate Transfer</button>
          <button className="btn-secondary" onClick={viewHistory}>View History</button>
        </div>
      </div>

      <div className="card">
        <h3>Accept Incoming Transfer</h3>
        <input className="inp" placeholder="Product ID (bytes32)" value={acceptId}
          onChange={e => setAcceptId(e.target.value)} />
        <input className="inp" placeholder="Your GPS location" value={gps}
          onChange={e => setGps(e.target.value)} />
        <input className="inp" placeholder="Notes (e.g. Received in good condition)" value={notes}
          onChange={e => setNotes(e.target.value)} />
        <button className="btn-primary" onClick={acceptTransfer}>Accept Transfer</button>
      </div>

      {status && <p className="status-box">{status}</p>}

      {history.length > 0 && (
        <div className="card">
          <h3>Custody History</h3>
          {history.map((h, i) => (
            <div key={i} className="history-item">
              <p>From: {h[0]?.slice(0,10)}...</p>
              <p>To: {h[1]?.slice(0,10)}...</p>
              <p>Location: {h[2]}</p>
              <p>Notes: {h[4]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
