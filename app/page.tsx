import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">Agri-D-Ledger</div>
          <div className="flex gap-4">
            <Link href="/auth/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Fair Pricing for African Farmers
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Agri-D-Ledger empowers small-scale farmers in Africa with transparent, 
            competitive pricing through blockchain-based regional bidding. Eliminate middlemen. 
            Get fair value for your produce.
          </p>
          <div className="flex gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="px-8">
                Get Started as Farmer
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="lg" variant="outline" className="px-8">
                Register as Buyer
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-secondary/30 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-foreground mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground">Farmers Register Produce</h3>
              <p className="text-muted-foreground">
                Farmers list their produce with quantity, quality grade, and asking price on the platform via USSD or web interface.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground">Regional Bids Created</h3>
              <p className="text-muted-foreground">
                Our system aggregates farmer data by region and creates transparent regional bids with market-based average pricing.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground">Buyers Place Bids</h3>
              <p className="text-muted-foreground">
                Bulk buyers view regional offers and place competitive bids with negotiation flexibility within acceptable thresholds.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">
                4
              </div>
              <h3 className="text-xl font-semibold text-foreground">Farmer Confirmation</h3>
              <p className="text-muted-foreground">
                Farmers receive bid notifications via SMS/USSD and confirm participation. At 80% acceptance, bid is approved.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">
                5
              </div>
              <h3 className="text-xl font-semibold text-foreground">Smart Contract Execution</h3>
              <p className="text-muted-foreground">
                Blockchain smart contracts ensure transparent, automated transaction management and commitment from both parties.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">
                6
              </div>
              <h3 className="text-xl font-semibold text-foreground">Fair Deals Completed</h3>
              <p className="text-muted-foreground">
                Farmers get fair market prices directly from buyers. No middlemen. Full transparency. Real value for produce.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-foreground mb-12">Benefits</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-semibold text-foreground mb-6">For Farmers</h3>
            <ul className="space-y-4 text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Access to competitive market prices without middlemen</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Transparent pricing based on regional demand data</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Direct connection with bulk buyers</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Secure transactions via blockchain smart contracts</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Easy USSD access for farmers without internet</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-foreground mb-6">For Buyers</h3>
            <ul className="space-y-4 text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Access to aggregated supply from multiple farmers</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Regional pricing insights and trend analysis</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Competitive bidding with qualified farmers</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Guaranteed commitment with smart contracts</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span>Reduced transaction costs and supply chain risks</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Agricultural Trade?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of farmers and buyers creating fair, transparent, and profitable agricultural markets across Africa.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/sign-up">
              <Button size="lg" variant="secondary" className="px-8">
                Start Now
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="px-8 bg-primary text-primary-foreground border-primary-foreground hover:bg-primary/90">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary border-t py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-foreground mb-4">About</h3>
              <p className="text-sm text-muted-foreground">
                Agri-D-Ledger is a blockchain-powered marketplace improving market access and pricing fairness for small-scale farmers.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Agri-D-Ledger. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
