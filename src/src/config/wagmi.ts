import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'CipherWars',
  projectId: '9c88998c0466db098dfb92aecd582668',
  chains: [sepolia],
  ssr: false,
});
