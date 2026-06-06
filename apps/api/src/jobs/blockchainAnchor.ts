// Polls for CONFIRMED transactions without an on-chain hash and anchors them.
// Start with startBlockchainAnchor() during API bootstrap.
// Requires: BLOCKCHAIN_RPC_URL, BLOCKCHAIN_PRIVATE_KEY, PAYMENT_ESCROW_ADDRESS

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const POLL_INTERVAL_MS = 30_000;

async function anchorPending() {
  const unanchored = await prisma.transaction.findMany({
    where: { status: 'CONFIRMED', onChainHash: null },
    take: 10,
  });

  if (unanchored.length === 0) return;

  let ethers: typeof import('ethers');
  try {
    ethers = await import('ethers');
  } catch {
    logger.warn({ event: 'blockchain_anchor_skip', reason: 'ethers not installed' });
    return;
  }

  const { JsonRpcProvider, Wallet, Contract } = ethers;
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  const escrowAddress = process.env.PAYMENT_ESCROW_ADDRESS;
  if (!rpcUrl || !privateKey || !escrowAddress) {
    logger.warn({ event: 'blockchain_anchor_skip', reason: 'env vars not set' });
    return;
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(privateKey, provider);
  const abi = [
    'function createEscrow(bytes32 txId, address farmer, uint256 amount) external payable returns (uint256)',
  ];
  const escrow = new Contract(escrowAddress, abi, signer);

  for (const tx of unanchored) {
    try {
      const txIdBytes = Buffer.alloc(32);
      txIdBytes.write(tx.id.replace(/-/g, ''), 'hex');
      const amountWei = BigInt(Math.round(Number(tx.totalAmount) * 100));

      const onChainTx = await (escrow as any).createEscrow(
        `0x${txIdBytes.toString('hex')}`,
        tx.buyerId,
        amountWei,
      );
      const receipt = await onChainTx.wait();

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          onChainHash: receipt.hash,
          blockNumber: String(receipt.blockNumber),
        },
      });

      // Update the associated ledger entry
      await prisma.ledgerEntry.updateMany({
        where: { transactionId: tx.id },
        data: { onChainHash: receipt.hash, blockNumber: String(receipt.blockNumber) },
      });

      logger.info({ event: 'anchored', txId: tx.id, onChainHash: receipt.hash });
    } catch (err) {
      logger.error({ event: 'anchor_failed', txId: tx.id, error: (err as Error).message });
    }
  }
}

export function startBlockchainAnchor() {
  setInterval(() => {
    anchorPending().catch((err) =>
      logger.error({ event: 'anchor_poll_error', error: err.message }),
    );
  }, POLL_INTERVAL_MS);

  logger.info({ event: 'blockchain_anchor_started', interval: POLL_INTERVAL_MS });
}
