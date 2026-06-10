import { useState } from "react";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "../hooks/useWallet";

export default function FarmerDashboard() {
  const { contracts, address, loading, error, connect } = useWallet();
  const [form, setForm] = useState({ productType: "", quantity: "", gps: "" });
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("");
  const [qrData, setQrData] = useState(null);
  const [escrowBalance, setEscrowBalance] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  async function registerProduct() {
    if (!contracts) return;
    if (!form.productType || !form.quantity || !form.gps) {
      setStatus("❌ Please fill in all fields.");
      return;
    }
    setStatus("⏳ Submitting to blockchain...");
    try {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(
        JSON.stringify({ type: form.productType, gps: form.gps, date: Date.now() })
      ));
      const tx = await contracts.productRegistry.registerProduct(
        form.productType,
        parseInt(form.quantity),
        Math.floor(Date.now() / 1000),
        form.gps,
        metadataHash
      );
      setStatus("⏳ Waiting for confirmation...");
      const receipt = await tx.wait();

      // Extract productId from logs
      let productId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contracts.productRegistry.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          if (parsed && parsed.name === "ProductRegistered") {
            productId = parsed.args.productId;
            break;
          }
        } catch {}
      }

      // Fallback: get from getFarmerProducts
      if (!productId) {
        const ids = await contracts.productRegistry.getFarmerProducts(address);
        if (ids.length > 0) productId = ids[ids.length - 1];
      }

      if (productId) {
        setQrData(productId);
        setStatus("✅ Product registered successfully!");
      } else {
        setStatus("✅ Registered! Click Refresh to see product.");
      }

      setForm({ productType: "", quantity: "", gps: "" });
      await loadProducts();
    } catch (err) {
      console.error(err);
      setStatus(`❌ Error: ${err.message}`);
    }
  }

  async function loadProducts() {
    if (!contracts || !address) return;
    try {
      const ids = await contracts.productRegistry.getFarmerProducts(address);
      if (ids.length === 0) { setProducts([]); return; }
      const details = await Promise.all(
        ids.map(id => contracts.productRegistry.getProduct(id))
      );
      setProducts(details.map((p, i) => ({
        id: ids[i],
        productType: p[2],
        quantity: p[3]?.toString(),
        harvestDate: new Date(Number(p[4]) * 1000).toLocaleDateString(),
        gps: p[5],
      })));
    } catch (err) {
      console.error("Load products error:", err);
    }
  }

  async function checkBalance() {
    if (!contracts) return;
    try {
      const balance = await contracts.paymentEscrow.balances(address);
      setEscrowBalance(ethers.formatEther(balance));
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  async function withdrawPayment() {
    if (!contracts) return;
    setWithdrawing(true);
    try {
      const tx = await contracts.paymentEscrow.withdraw();
      await tx.wait();
      setStatus("✅ Payment withdrawn to your wallet!");
      await checkBalance();
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setWithdrawing(false);
    }
  }

  async function initializeCustody(productId) {
    setStatus("⏳ Initializing custody...");
    try {
      const tx = await contracts.chainOfCustody.initializeCustody(productId);
      await tx.wait();
      setStatus("✅ Custody initialized!");
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  async function transferCustody(productId) {
    const recipient = prompt("Enter cooperative address (0x...):");
    if (!recipient) return;
    setStatus("⏳ Initiating transfer...");
    try {
      const tx = await contracts.chainOfCustody.initiateTransfer(productId, recipient);
      await tx.wait();
      setStatus(`✅ Transfer initiated to ${recipient.slice(0,10)}...`);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus("❌ Geolocation not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setForm({...form, gps: `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`}),
      () => setStatus("❌ Could not get location.")
    );
  }

  if (!address) return (
    <div className="dash-container">
      <h2>🌱 Farmer Dashboard</h2>
      <p style={{marginBottom:16, color:"#aaa"}}>Connect your wallet to get started.</p>
      {error && <p style={{color:"red", marginBottom:10}}>{error}</p>}
      <button className="btn-primary" onClick={connect} disabled={loading}>
        {loading ? "Connecting..." : "🦊 Connect Wallet"}
      </button>
    </div>
  );

  return (
    <div className="dash-container">
      <h2>🌱 Farmer Dashboard</h2>
      <p className="address-tag">Connected: {address.slice(0,6)}...{address.slice(-4)}</p>

      {/* Register Harvest */}
      <div className="card">
        <h3>Register New Harvest</h3>
        <label style={s.label}>Product Type</label>
        <input className="inp" placeholder="e.g. Coffee, Maize, Tea"
          value={form.productType}
          onChange={e => setForm({...form, productType: e.target.value})} />
        <label style={s.label}>Quantity (kg)</label>
        <input className="inp" placeholder="e.g. 500" type="number"
          value={form.quantity}
          onChange={e => setForm({...form, quantity: e.target.value})} />
        <label style={s.label}>Farm GPS Coordinates</label>
        <input className="inp" placeholder="e.g. -0.416,36.948"
          value={form.gps}
          onChange={e => setForm({...form, gps: e.target.value})} />
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button className="btn-primary" onClick={registerProduct}>
            📝 Register Product
          </button>
          <button className="btn-secondary" onClick={useMyLocation}>
            📍 Use My Location
          </button>
        </div>
        {status && <p className="status-box">{status}</p>}
      </div>

      {/* QR Code — only shown after successful registration */}
      {qrData && (
        <div className="card" style={{textAlign:"center"}}>
          <h3>📦 Product QR Code</h3>
          <p style={{fontSize:13, color:"#aaa", marginBottom:16}}>
            Print and attach to the physical product batch. Cooperative
            staff scan this to verify and transfer custody.
          </p>
          <div style={s.qrBox}>
            <QRCodeSVG value={qrData} size={220} bgColor="#fff" fgColor="#000" />
          </div>
          <p style={s.qrId}>{qrData}</p>
          <div style={{display:"flex", gap:8, justifyContent:"center", marginTop:12}}>
            <button className="btn-primary" onClick={() => window.print()}>
              🖨️ Print QR
            </button>
            <button className="btn-secondary"
              onClick={() => { navigator.clipboard.writeText(qrData); setStatus("✅ Product ID copied!"); }}>
              📋 Copy ID
            </button>
            <button className="btn-secondary" onClick={() => setQrData(null)}>
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* Payment Balance */}
      <div className="card">
        <h3>💰 Payment Balance</h3>
        <p style={{fontSize:13, color:"#aaa", marginBottom:12}}>
          Payments from cooperatives or buyers are held in the escrow
          contract until delivery is confirmed. Withdraw them here.
        </p>

        {escrowBalance !== null && (
          <div style={s.balanceBox}>
            <div style={s.balanceAmount}>{escrowBalance} ETH</div>
            <div style={s.balanceLabel}>available to withdraw</div>
          </div>
        )}

        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button className="btn-secondary" onClick={checkBalance}>
            🔍 Check Balance
          </button>
          {escrowBalance && parseFloat(escrowBalance) > 0 && (
            <button className="btn-primary" onClick={withdrawPayment} disabled={withdrawing}>
              {withdrawing ? "⏳ Withdrawing..." : `💸 Withdraw ${escrowBalance} ETH`}
            </button>
          )}
        </div>
      </div>

      {/* My Products */}
      <div className="card">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <h3 style={{marginBottom:0}}>My Registered Products</h3>
          <button className="btn-secondary" onClick={loadProducts}>🔄 Refresh</button>
        </div>

        {products.length === 0 && (
          <p style={{color:"#aaa", fontSize:14}}>
            No products yet. Register a harvest above then click Refresh.
          </p>
        )}

        {products.map((p, i) => (
          <div key={i} className="history-item">
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
              <strong style={{color:"#81c784"}}>{p.productType}</strong>
              <span style={{fontSize:12, color:"#aaa"}}>{p.harvestDate}</span>
            </div>
            <p style={{fontSize:13}}>Quantity: {p.quantity} kg</p>
            <p style={{fontSize:13}}>GPS: {p.gps}</p>
            <p style={{fontSize:11, color:"#555", wordBreak:"break-all", margin:"6px 0", fontFamily:"monospace"}}>
              {p.id}
            </p>
            <div style={{display:"flex", gap:6, flexWrap:"wrap", marginTop:8}}>
              <button className="btn-secondary" style={{fontSize:12, padding:"5px 10px"}}
                onClick={() => setQrData(p.id)}>
                📱 Show QR
              </button>
              <button className="btn-secondary" style={{fontSize:12, padding:"5px 10px"}}
                onClick={() => initializeCustody(p.id)}>
                🔐 Init Custody
              </button>
              <button className="btn-primary" style={{fontSize:12, padding:"5px 10px"}}
                onClick={() => transferCustody(p.id)}>
                🚚 Transfer
              </button>
              <button className="btn-secondary" style={{fontSize:12, padding:"5px 10px"}}
                onClick={() => { navigator.clipboard.writeText(p.id); setStatus("✅ Copied!"); }}>
                📋 Copy ID
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  label: { display:"block", fontSize:13, color:"#81c784", marginBottom:4 },
  qrBox: { display:"inline-block", background:"#fff", padding:16, borderRadius:8 },
  qrId: { fontSize:10, color:"#555", wordBreak:"break-all", marginTop:8, padding:"0 16px", fontFamily:"monospace" },
  balanceBox: { background:"#0f1a0f", border:"1px solid #2d5a2d", borderRadius:8, padding:"14px 20px", marginBottom:12, textAlign:"center" },
  balanceAmount: { fontSize:28, fontWeight:500, color:"#81c784" },
  balanceLabel: { fontSize:12, color:"#555", marginTop:2 },
};
