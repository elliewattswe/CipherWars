import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <span className="header-flag">FHE encrypted</span>
            <h1 className="header-title">CipherWars</h1>
            <p className="header-tagline">
              Join the encrypted skirmish, claim your gold, and construct hidden fortresses without revealing your plan.
            </p>
          </div>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </div>
    </header>
  );
}
