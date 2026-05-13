// src/modules/ledger/ledger.service.ts — Polygon blockchain anchoring

import { ethers } from 'ethers';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { blockchainWriteDuration, transactionCounter } from '../../config/metrics.js';
import { AppError } from '../../middleware/error.middleware.js';
import LEDGER_ABI from '../../blockchain/abis/AgriLedger.json' assert { type: 'json' };

let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let ledgerContract: ethers.Contract;

function getContracts() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    wallet = new ethers.Wallet(process.env.LEDGER_WALLET_PRIVATE_KEY!, provider);
    ledgerContract = new ethers.Contract(
      process.env.LEDGER_CONTRACT_ADDRESS!,
      LEDGER_ABI,
      wallet
    );
  }
  return { provider, wallet, ledgerContract };
}

export async function anchorTransaction(
  transactionId: string,
  dataHash: string
): Promise<void> {
  const { ledgerContract } = getContracts();
  const end = blockchainWriteDuration.startTimer();

  try {
    logger.info('Anchoring transaction to Polygon', { transactionId });

    const txHashBytes = ethers.encodeBytes32String(transactionId.slice(0, 31));
    const tx = await ledgerContract.anchor(txHashBytes, `0x${dataHash}`);
    const receipt = await tx.wait(2); // wait for 2 block confirmations

    await prisma.$transaction([
      prisma.ledgerEntry.create({
        data: {
          transactionId,
          dataHash,
          onChainHash:     receipt.hash,
          blockNumber:     BigInt(receipt.blockNumber),
          contractAddress: process.env.LEDGER_CONTRACT_ADDRESS!,
        },
      }),
      prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status:       'CONFIRMED',
          onChainHash:  receipt.hash,
          blockNumber:  BigInt(receipt.blockNumber),
          confirmedAt:  new Date(),
        },
      }),
      prisma.produce.updateMany({
        where: { transactions: { some: { id: transactionId } } },
        data:  { status: 'SOLD' },
      }),
    ]);

    transactionCounter.inc({ status: 'confirmed' });
    logger.info('Transaction anchored', { transactionId, txHash: receipt.hash, block: receipt.blockNumber });
  } catch (err) {
    logger.error('Blockchain anchor failed', { transactionId, err });
    await prisma.transaction.update({
      where: { id: transactionId },
      data:  { status: 'FAILED' },
    });
    transactionCounter.inc({ status: 'failed' });
    throw err;
  } finally {
    end();
  }
}

export async function getLedgerEntry(transactionId: string) {
  return prisma.ledgerEntry.findUnique({ where: { transactionId } });
}

export async function verifyOnChain(transactionId: string): Promise<boolean> {
  const entry = await prisma.ledgerEntry.findUnique({ where: { transactionId } });
  if (!entry) return false;

  const { provider } = getContracts();
  const receipt = await provider.getTransactionReceipt(entry.onChainHash);
  return receipt !== null && receipt.status === 1;
}
