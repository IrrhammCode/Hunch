import { CHAIN_ID } from "../config/chain";
import { MOCK_ADDRESS_CHECKSUM, mockHash } from "./fixtures";

/** Design-mode EIP-1193 — succeeds locally, never hits chain. */
export function createMockProvider() {
  let nonce = 0;
  return {
    isMock: true,
    request: async ({ method, params = [] }: { method: string; params?: any[] }) => {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return [MOCK_ADDRESS_CHECKSUM];
        case "eth_chainId":
          return `0x${CHAIN_ID.toString(16)}`;
        case "net_version":
          return String(CHAIN_ID);
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
          return null;
        case "eth_getBalance":
          return "0x1158e460913d0000"; // 1.25 MON
        case "eth_getTransactionCount":
          return `0x${(nonce++).toString(16)}`;
        case "eth_gasPrice":
          return "0x3b9aca00";
        case "eth_estimateGas":
          return "0x30d40";
        case "eth_call":
          return "0x";
        case "eth_getTransactionReceipt":
          return {
            transactionHash: params[0] || mockHash(),
            blockNumber: "0x1",
            status: "0x1",
            logs: [],
          };
        case "eth_sendTransaction":
          return mockHash();
        case "personal_sign":
        case "eth_sign":
          return `0xmocksig${Date.now().toString(16)}`;
        default:
          return null;
      }
    },
  };
}
