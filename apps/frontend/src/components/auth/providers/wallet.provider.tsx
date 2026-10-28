'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConnectionProvider,
  useWallet,
  WalletProvider as WalletProviderWrapper,
} from '@solana/wallet-adapter-react';
import { useWalletMultiButton } from '@solana/wallet-adapter-base-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  WalletModalProvider,
  useWalletModal,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';
import { useFetch } from '@postmill-ai/helpers/utils/custom.fetch';
import { markSsoFullPage } from '@postmill-ai/frontend/components/auth/sso-popup';
import { WalletUiProvider } from '@postmill-ai/frontend/components/auth/providers/placeholder/wallet.ui.provider';

const NETWORK = WalletAdapterNetwork.Mainnet;
const ENDPOINT = clusterApiUrl(NETWORK);

const WalletProvider = () => {
  const gotoLogin = useCallback(async (code: string) => {
    window.location.href = `/auth?provider=FARCASTER&code=${code}`;
  }, []);
  return <ButtonCaster login={gotoLogin} />;
};
export const ButtonCaster: FC<{
  login: (code: string) => void;
}> = (props) => {
  // Modern wallets (Phantom, Solflare, Backpack, etc.) auto-register via the Solana Wallet Standard.
  const wallets = useMemo(() => [], []);
  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProviderWrapper wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <DisabledAutoConnect />
        </WalletModalProvider>
      </WalletProviderWrapper>
    </ConnectionProvider>
  );
};
const DisabledAutoConnect = () => {
  const [connect, setConnect] = useState(false);
  const wallet = useWallet();
  const toConnect = useCallback(async () => {
    try {
      wallet.select(null);
    } catch (err) {
      /** empty */
    }
    try {
      await wallet.disconnect();
    } catch (err) {
      /** empty */
    }
    setConnect(true);
  }, [wallet]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void toConnect();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [toConnect]);
  if (connect) {
    return <InnerWallet />;
  }
  return <WalletUiProvider />;
};
const InnerWallet = () => {
  const walletModal = useWalletModal();
  const wallet = useWallet();
  const fetch = useFetch();
  const { buttonState } = useWalletMultiButton({
    onSelectWallet: () => {
      return;
    },
  });
  const connect = useCallback(async () => {
    if (buttonState !== 'connected') {
      return;
    }
    try {
      const challenge = await (
        await fetch(
          `/auth/oauth/WALLET?publicKey=${wallet?.publicKey?.toString()}`
        )
      ).text();
      const encoded = new TextEncoder().encode(challenge);
      const signed = await wallet?.signMessage?.(encoded)!;
      const info = Buffer.from(
        JSON.stringify({
          // @ts-ignore
          signature: Buffer.from(signed).toString('hex'),
          challenge,
          publicKey: wallet?.publicKey?.toString(),
        })
      ).toString('base64');
      // In-tab flow: the callback must not treat this tab as a sign-in popup.
      markSsoFullPage();
      window.location.href = `/auth?provider=WALLET&code=${info}`;
    } catch (err) {
      walletModal.setVisible(false);
      wallet.select(null);
      wallet.disconnect().catch(() => {
        /** empty */
      });
    }
  }, [buttonState, fetch, wallet, walletModal]);
  useEffect(() => {
    if (buttonState === 'has-wallet') {
      wallet
        .connect()
        .then(() => {
          /** empty */
        })
        .catch(() => {
          wallet.select(null);
          wallet.disconnect();
        });
    }
    if (buttonState === 'connected') {
      connect();
    }
  }, [buttonState, connect, wallet]);
  return (
    <div onClick={() => walletModal.setVisible(true)} className="flex-1">
      <WalletUiProvider />
    </div>
  );
};
export default WalletProvider;
