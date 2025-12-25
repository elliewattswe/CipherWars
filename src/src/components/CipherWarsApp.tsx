import { useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, useReadContract } from 'wagmi';
import { Header } from './Header';
import { BUILDING_COSTS, CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import '../styles/CipherWars.css';

const BUILDINGS = [
  { id: 1, name: 'Obsidian Keep', description: 'Defensive core that shields your treasury.', cost: BUILDING_COSTS[1] },
  { id: 2, name: 'Flux Foundry', description: 'Doubles down on production efficiency.', cost: BUILDING_COSTS[2] },
  { id: 3, name: 'Specter Lab', description: 'Unlocks covert scouting over rivals.', cost: BUILDING_COSTS[3] },
  { id: 4, name: 'Aurora Gate', description: 'High-tier portal that secures late game.', cost: BUILDING_COSTS[4] },
];

export function CipherWarsApp() {
  const { address, isConnected } = useAccount();
  const signer = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [selectedBuilding, setSelectedBuilding] = useState<number>(1);
  const [decryptedBalance, setDecryptedBalance] = useState<string | null>(null);
  const [decryptedBuilding, setDecryptedBuilding] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isConstructing, setIsConstructing] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const contractConfigured =true;
  const [status, setStatus] = useState<string>(
    contractConfigured ? '' : 'Set the deployed CipherWars address to unlock encrypted actions.',
  );

  const { data: hasJoined, refetch: refetchJoined, isLoading: joinedLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'hasJoined',
    args: address ? [address] : undefined,
    query: { enabled: !!address && contractConfigured },
  });

  const {
    data: encryptedBalance,
    refetch: refetchBalance,
    isLoading: balanceLoading,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address && Boolean(hasJoined) && contractConfigured },
  });

  const {
    data: encryptedBuilding,
    refetch: refetchBuilding,
    isLoading: buildingLoading,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getBuilding',
    args: address ? [address] : undefined,
    query: { enabled: !!address && Boolean(hasJoined) && contractConfigured },
  });

  const joined = useMemo(() => Boolean(hasJoined), [hasJoined]);
  const buildingCipher = encryptedBuilding as string | undefined;
  const balanceCipher = encryptedBalance as string | undefined;

  const shortenCipher = (value?: string) => {
    if (!value) return '—';
    return value.length > 18 ? `${value.slice(0, 12)}...${value.slice(-4)}` : value;
  };

  const refreshGameState = async () => {
    await Promise.allSettled([refetchJoined?.(), refetchBalance?.(), refetchBuilding?.()]);
  };

  const handleJoin = async () => {
    if (!signer) {
      alert('Connect your wallet to join the game.');
      return;
    }
    if (!contractConfigured) {
      alert('Deploy CipherWars to Sepolia and set CONTRACT_ADDRESS before joining.');
      return;
    }

    try {
      setIsJoining(true);
      setStatus('Sending join transaction...');

      const resolvedSigner = await signer;
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, resolvedSigner);
      const tx = await contract.joinGame();
      await tx.wait();

      setStatus('Joined! Encrypted gold minted.');
      setDecryptedBalance(null);
      setDecryptedBuilding(null);
      await refreshGameState();
    } catch (error) {
      console.error('Join failed', error);
      setStatus('Failed to join. Please retry.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleConstruct = async () => {
    if (!instance || !address) {
      alert('Encryption service not ready.');
      return;
    }
    if (!signer) {
      alert('Connect your wallet to build.');
      return;
    }
    if (!contractConfigured) {
      alert('Deploy CipherWars to Sepolia and set CONTRACT_ADDRESS before building.');
      return;
    }

    try {
      setIsConstructing(true);
      setStatus('Encrypting building choice...');

      const encryptedInput = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      encryptedInput.add32(selectedBuilding);
      const encrypted = await encryptedInput.encrypt();

      const resolvedSigner = await signer;
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, resolvedSigner);
      const tx = await contract.constructBuilding(encrypted.handles[0], encrypted.inputProof);
      await tx.wait();

      setStatus(`Building ${selectedBuilding} constructed with encrypted cost deduction.`);
      setDecryptedBuilding(null);
      await refreshGameState();
    } catch (error) {
      console.error('Construct failed', error);
      setStatus('Construction failed. Check your balance or network.');
    } finally {
      setIsConstructing(false);
    }
  };

  const handleDecrypt = async () => {
    if (!instance || !address || !buildingCipher || !balanceCipher || !signer) {
      alert('Connect wallet and build first to decrypt.');
      return;
    }
    if (!contractConfigured) {
      alert('Deploy CipherWars to Sepolia and set CONTRACT_ADDRESS before decrypting.');
      return;
    }

    try {
      setIsDecrypting(true);
      setStatus('Preparing secure decryption...');

      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        { handle: balanceCipher, contractAddress: CONTRACT_ADDRESS },
        { handle: buildingCipher, contractAddress: CONTRACT_ADDRESS },
      ];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const resolvedSigner = await signer;
      const signature = await resolvedSigner.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const clearBalance = result[balanceCipher];
      const clearBuilding = result[buildingCipher];

      setDecryptedBalance(clearBalance);
      setDecryptedBuilding(Number(clearBuilding));
      setStatus('Decryption complete. Your stats are visible locally.');
    } catch (error) {
      console.error('Decrypt failed', error);
      setStatus('Decryption failed. Please retry.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const loadingState = zamaLoading || joinedLoading || balanceLoading || buildingLoading;

  return (
    <div className="game-wrapper">
      <Header />

      <section className="hero-panel">
        <div className="hero-top">
          <div>
            <div className="hero-meta">
              <span className="pill">10000 encrypted gold on entry</span>
              <span className="pill">4 encrypted building paths</span>
            </div>
            <h2 className="hero-title">Operate in ciphertext. Outsmart in daylight.</h2>
            <p className="hero-subtitle">
              Every choice stays encrypted on-chain. Mint gold, pick a building, and decrypt only when you decide to
              reveal it.
            </p>
          </div>
          <div className="chip-row">
            <span className="chip">Network: Sepolia</span>
            <span className="chip">{contractConfigured ? 'CipherWars configured' : 'Set contract address'}</span>
            <span className="chip">{zamaError ? 'Zama offline' : zamaLoading ? 'Zama loading' : 'Zama ready'}</span>
          </div>
        </div>
      </section>

      <main className="game-grid">
        <section className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Command</h3>
            <span className="info-chip">{isConnected ? 'Wallet linked' : 'Connect to start'}</span>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Encrypted Gold</div>
              <p className="stat-value">
                {!contractConfigured
                  ? 'Set contract address'
                  : balanceCipher
                    ? shortenCipher(balanceCipher)
                    : joined
                      ? 'Awaiting refresh'
                      : '—'}
              </p>
              <div className="status-row">
                <span className="status-dot" />
                <span>
                  {!contractConfigured
                    ? 'Contract not configured'
                    : joined
                      ? 'Stored privately'
                      : 'Join to mint'}
                </span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Encrypted Building</div>
              <p className="stat-value">
                {!contractConfigured
                  ? 'Set contract address'
                  : buildingCipher && buildingCipher !== '0x'
                    ? shortenCipher(buildingCipher)
                    : 'Hidden'}
              </p>
              <div className="status-row">
                <span className="status-dot" />
                <span>
                  {!contractConfigured
                    ? 'Contract not configured'
                    : joined
                      ? 'Encrypted choice'
                      : 'Select after joining'}
                </span>
              </div>
            </div>
          </div>

          <div className="controls">
            <button
              className="primary-btn"
              disabled={!isConnected || joined || loadingState || isJoining || !contractConfigured}
              onClick={handleJoin}
            >
              {isJoining ? 'Joining...' : joined ? 'Already joined' : 'Join & Mint Gold'}
            </button>
            <button
              className="ghost-btn"
              disabled={!joined || !isConnected || loadingState || isDecrypting || !buildingCipher || !contractConfigured}
              onClick={handleDecrypt}
            >
              {isDecrypting ? 'Decrypting...' : 'Decrypt My State'}
            </button>
          </div>

          <div className="stat-grid" style={{ marginTop: '0.75rem' }}>
            <div className="stat-card">
              <div className="stat-label">Clear Balance</div>
              <p className="stat-value">{decryptedBalance ?? 'Hidden until you decrypt'}</p>
            </div>
            <div className="stat-card">
              <div className="stat-label">Clear Building</div>
              <p className="stat-value">{decryptedBuilding ?? 'Hidden until you decrypt'}</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Build Orders</h3>
            <span className="info-chip">Spend encrypted balance to expand</span>
          </div>

          <div className="building-grid">
            {BUILDINGS.map((building) => (
              <div
                key={building.id}
                className={`building-card ${selectedBuilding === building.id ? 'selected' : ''}`}
                onClick={() => setSelectedBuilding(building.id)}
              >
                <h4 className="building-name">
                  #{building.id} {building.name}
                </h4>
                <div className="building-meta">
                  <span className="cost">{building.cost} gold</span>
                  <span>Encrypted choice</span>
                </div>
                <p className="building-desc">{building.description}</p>
              </div>
            ))}
          </div>

          <div className="controls">
            <button
              className="primary-btn"
              onClick={handleConstruct}
              disabled={!joined || !isConnected || zamaLoading || isConstructing || loadingState || !contractConfigured}
            >
              {isConstructing ? 'Signing...' : `Build #${selectedBuilding}`}
            </button>
          </div>
          <p className="warning">Gold costs: 1→100, 2→200, 3→400, 4→1000 (deducted inside ciphertext).</p>
        </section>
      </main>

      {status && (
        <div className="log">
          <strong>Status:</strong> {status}
        </div>
      )}
    </div>
  );
}
