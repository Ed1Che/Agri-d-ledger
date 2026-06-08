import { useState } from "react";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "../hooks/useWallet";

export default function FarmerDashboard() {
  const { contracts, address, loading, error, connect } = useWallet();
  const [form, setForm] = useState({
    productType: "",
    quantity: "",
    gps: ""
  });
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("");
  const [qrData, setQrData] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  async function registerProduct() {
    if (!contracts) return;
    if (!form.productType || !form.quantity || !form.gps) {
      setStatus("❌ Please fill in all fields.");
      return;
    }
    setStatus("⏳ Submitting to blockchain...");
    try {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(
        JSON.stringify({
          type: form.productType,
          gps: form.gps,
          date: Date.now()
        })
      ));

      const tx = await contracts.productRegistry.registerProduct(
        form.productType,
        parseInt(form.quantity),
        Math.floor(Date.now() / 1000),
        form.gps,
        metadataHash
      );

      setStatus("⏳ Waiting for blockchain confirmation...");
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        l => l.fragment?.name === "ProductRegistered"
      );
      const productId = event?.args?.productId;

      setStatus(`✅ Product registered successfully!`);
      setQrData(productId);
      setForm({ productType: "", quantity: "", gps: "" });
      await loadProducts();
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    }
  }

  async function loadProducts() {
    if (!contracts || !address) return;
    try {
      const ids = await contracts.productRegistry.getFarmerProducts(address);
      const details = await Promise.all(
        ids.map(id => contracts.productRegistry.getProduct(id))
      );
      setProducts(details.map((p, i) => ({
        id: ids[i],
        productType: p[2],
        quantity: p[3]?.toString(),
        harvestDate: new Date(Number(p[4]) * 1000).toLocaleDateString(),
        gps: p[5],
        farmer: p[1],
      })));
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  }

  async function initializeCustody(productId) {
    if (!contracts) return;
    setStatus("⏳ Initializing custody on blockchain...");
    try {
      const tx = await contracts.chainOfCustody.initializeCustody(productId);
      await tx.wait();
      setStatus("✅ Custody initialized. You can now transfer this product.");
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  async function transferCustody(productId) {
    const recipient = prompt("Enter recipient cooperative address (0x...):");
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

  // Not connected screen
  if (!address) return (
    <div className="dash-container">
      <h2>🌱 Farmer Dashboard</h2>
      <p style={{ marginBottom: 16, color: "#aaa" }}>
        Connect your MetaMask wallet to register harvests and manage your products.
      </p>
      {error && <p style={{ color: "red", marginBottom: 10 }}>{error}</p>}
      <button className="btn-primary" onClick={connect} disabled={loading}>
        {loading ? "Connecting..." : "🦊 Connect Wallet"}
      </button>
    </div>
  );

  return (
    <div className="dash-container">
      <h2>🌱 Farmer Dashboard</h2>
      <p className="address-tag">
        Connected: {address.slice(0, 6)}...{address.slice(-4)}
      </p>

      {/* Register Harvest Form */}
      <div className="card">
        <h3>Register New Harvest</h3>
        <label style={styles.label}>Product Type</label>
        <input
          className="inp"
          placeholder="e.g. Coffee, Maize, Tea"
          value={form.productType}
          onChange={e => setForm({ ...form, productType: e.target.value })}
        />
        <label style={styles.label}>Quantity (kg)</label>
        <input
          className="inp"
          placeholder="e.g. 500"
          type="number"
          value={form.quantity}
          onChange={e => setForm({ ...form, quantity: e.target.value })}
        />
        <label style={styles.label}>Farm GPS Coordinates</label>
        <input
          className="inp"
          placeholder="e.g. -0.416,36.948"
          value={form.gps}
          onChange={e => setForm({ ...form, gps: e.target.value })}
        />
        <button className="btn-primary" onClick={registerProduct}>
          📝 Register Product
        </button>

        {status && <p className="status-box">{status}</p>}
      </div>

      {/* QR Code — shown after successful registration */}
      {qrData && (
        <div className="card" style={{ textAlign: "center" }}>
          <h3>📦 Product QR Code</h3>
          <p style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>
            Print this and attach it to the physical product batch.
            Cooperative staff scan this to verify and transfer custody.
          </p>
          <div style={styles.qrWrapper}>
            <QRCodeSVG value={qrData} size={200} bgColor="#fff" fgColor="#000" />
          </div>
          <p style={styles.productIdText}>{qrData}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
            <button className="btn-primary" onClick={() => window.print()}>
              🖨️ Print QR
            </button>
            <button className="btn-secondary" onClick={() => setQrData(null)}>
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* My Products List */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3>My Registered Products</h3>
          <button className="btn-secondary" onClick={loadProducts}>
            🔄 Refresh
          </button>
        </div>

        {products.length === 0 && (
          <p style={{ color: "#aaa", fontSize: 14 }}>
            No products registered yet. Register your first harvest above.
          </p>
        )}

        {products.map((p, i) => (
          <div key={i} className="history-item">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ color: "#81c784" }}>{p.productType}</strong>
              <span style={{ fontSize: 12, color: "#aaa" }}>{p.harvestDate}</span>
            </div>
            <p>Quantity: {p.quantity} kg</p>
            <p>GPS: {p.gps}</p>
            <p style={{ fontSize: 12, color: "#aaa", wordBreak: "break-all" }}>
              ID: {p.id?.slice(0, 20)}...
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn-secondary" onClick={() => setQrData(p.id)}>
                📱 Show QR
              </button>
              <button className="btn-secondary" onClick={() => initializeCustody(p.id)}>
                🔐 Init Custody
              </button>
              <button className="btn-primary" onClick={() => transferCustody(p.id)}>
                🚚 Transfer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  label: {
    display: "block",
    fontSize: 13,
    color: "#81c784",
    marginBottom: 4,
  },
  qrWrapper: {
    display: "inline-block",
    background: "#fff",
    padding: 16,
    borderRadius: 8,
  },
  productIdText: {
    fontSize: 11,
    color: "#aaa",
    wordBreak: "break-all",
    marginTop: 8,
    padding: "0 20px",
  },
};
