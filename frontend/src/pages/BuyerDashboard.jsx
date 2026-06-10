import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";

export default function BuyerDashboard() {
  const { contracts, address, loading, error, connect } = useWallet();
  const [productId, setProductId] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [requiresCert, setRequiresCert] = useState(false);
  const [escrowId, setEscrowId] = useState("");
  const [status, setStatus] = useState("");
  const [escrowDetails, setEscrowDetails] = useState(null);

  async function createEscrow() {
    if (!contracts) return;
    setStatus("⏳ Locking payment in escrow...");
    try {
      const tx = await contracts.paymentEscrow.createEscrow(
        productId,
        sellerAddress,
        86400,        // 24 hour deadline
        requiresCert,
        { value: ethers.parseEther(amount) }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(l => {
        try {
          return contracts.paymentEscrow.interface.parseLog(l)?.name === "EscrowCreated";
        } catch { return false; }
      });
      const parsed = contracts.paymentEscrow.interface.parseLog(event);
      const id = parsed.args.escrowId;
      setEscrowId(id);
      setStatus(`✅ Payment locked! Escrow ID: ${id.slice(0,16)}...`);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  async function releasePayment() {
    if (!contracts || !escrowId) return;
    setStatus("⏳ Releasing payment...");
    try {
      const tx = await contracts.paymentEscrow.releasePayment(escrowId);
      await tx.wait();
      setStatus("✅ Payment released to seller!");
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  async function viewEscrow() {
    if (!contracts || !escrowId) return;
    try {
      const e = await contracts.paymentEscrow.getEscrow(escrowId);
      setEscrowDetails({
        amount: ethers.formatEther(e[3]),
        deadline: new Date(Number(e[4]) * 1000).toLocaleString(),
        requiresCert: e[5],
        status: ["Active","Released","Refunded","Disputed"][e[6]],
      });
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  if (!address) return (
    <div className="dash-container">
      <h2>🛒 Buyer Dashboard</h2>
      <p style={{marginBottom:16, color:"#aaa"}}>Connect wallet to create and manage escrow payments.</p>
      {error && <p style={{color:"red"}}>{error}</p>}
      <button className="btn-primary" onClick={connect} disabled={loading}>
        {loading ? "Connecting..." : "🦊 Connect Wallet"}
      </button>
    </div>
  );

  return (
    <div className="dash-container">
      <h2>🛒 Buyer Dashboard</h2>
      <p className="address-tag">Connected: {address.slice(0,6)}...{address.slice(-4)}</p>

      <div className="card">
        <h3>💳 Create Payment Escrow</h3>
        <p style={{fontSize:13, color:"#aaa", marginBottom:12}}>
          Lock payment in a smart contract. It releases automatically
          when the seller delivers the product.
        </p>
        <label style={{fontSize:13, color:"#81c784", display:"block", marginBottom:4}}>Product ID</label>
        <input className="inp" placeholder="0x... (from QR code or Trace page)"
          value={productId} onChange={e => setProductId(e.target.value)} />
        <label style={{fontSize:13, color:"#81c784", display:"block", marginBottom:4}}>Seller Address</label>
        <input className="inp" placeholder="0x... cooperative or farmer address"
          value={sellerAddress} onChange={e => setSellerAddress(e.target.value)} />
        <label style={{fontSize:13, color:"#81c784", display:"block", marginBottom:4}}>Payment Amount (ETH)</label>
        <input className="inp" placeholder="e.g. 0.1" type="number" step="0.01"
          value={amount} onChange={e => setAmount(e.target.value)} />
        <label style={{display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#aaa", marginBottom:12}}>
          <input type="checkbox" checked={requiresCert}
            onChange={e => setRequiresCert(e.target.checked)} />
          Require organic certification before releasing payment
        </label>
        <button className="btn-primary" onClick={createEscrow}>
          🔒 Lock Payment in Escrow
        </button>
        {status && <p className="status-box">{status}</p>}
      </div>

      {escrowId && (
        <div className="card">
          <h3>📋 Manage Escrow</h3>
          <p style={{fontSize:11, color:"#555", wordBreak:"break-all", marginBottom:12, fontFamily:"monospace"}}>
            {escrowId}
          </p>
          <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:12}}>
            <button className="btn-secondary" onClick={viewEscrow}>🔍 View Status</button>
            <button className="btn-primary" onClick={releasePayment}>✅ Release Payment</button>
          </div>
          {escrowDetails && (
            <div style={{background:"#0f1a0f", borderRadius:6, padding:12, fontSize:13}}>
              <p>Amount: {escrowDetails.amount} ETH</p>
              <p>Deadline: {escrowDetails.deadline}</p>
              <p>Certification required: {escrowDetails.requiresCert ? "Yes" : "No"}</p>
              <p>Status: <strong style={{color:"#81c784"}}>{escrowDetails.status}</strong></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
