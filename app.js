// Config
const CONTRACT_ADDRESS = "0xa1E5b475815a84F10b1E5Dc05Cf2Faf5FE0bb8c0";
const CONTRACT_ABI = [{"inputs":[],"name":"gm","outputs":[],"stateMutability":"nonpayable","type":"function"}];
const MONAD_TESTNET = {
    chainId: "0x4d8", // 1160 in decimal
    chainName: "Monad Testnet",
    nativeCurrency: { name: "Monad", symbol: "MONAD", decimals: 18 },
    rpcUrls: ["https://testnet-rpc.monad.xyz"],
    blockExplorerUrls: ["https://testnet-explorer.monad.xyz"]
};

// Elements
const connectBtn = document.getElementById("connectWalletBtn");
const disconnectBtn = document.getElementById("disconnectWalletBtn");
const signBtn = document.getElementById("signGreetBtn");
const statusEl = document.getElementById("statusEl");
const networkStatus = document.getElementById("networkStatus");
const networkName = document.getElementById("networkName");
const networkIndicator = document.getElementById("networkIndicator");
const switchNetworkBtn = document.getElementById("switchNetworkBtn");
const walletInfo = document.getElementById("walletInfo");
const gmBtn = document.getElementById("gmBtn");
const gnBtn = document.getElementById("gnBtn");

// State
let userAddress = null;
let isGM = true; // Default to GM
let provider, signer, contract;

// Initialize
init();

async function init() {
    // Greet type toggle
    gmBtn.addEventListener("click", () => setGreetType(true));
    gnBtn.addEventListener("click", () => setGreetType(false));

    // Connect/Disconnect
    connectBtn.addEventListener("click", connectWallet);
    disconnectBtn.addEventListener("click", disconnectWallet);

    // Sign greeting
    signBtn.addEventListener("click", signGreeting);

    // Check if wallet is already connected
    if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
            userAddress = accounts[0];
            setupProvider();
            updateUI();
        }
    }

    // Network change listener
    if (window.ethereum) {
        window.ethereum.on("chainChanged", () => window.location.reload());
        window.ethereum.on("accountsChanged", (accounts) => {
            if (accounts.length === 0) disconnectWallet();
            else window.location.reload();
        });
    }
}

function setGreetType(gmSelected) {
    isGM = gmSelected;
    gmBtn.classList.toggle("active", gmSelected);
    gnBtn.classList.toggle("active", !gmSelected);
    signBtn.textContent = `Sign ${gmSelected ? "GM" : "GN"}`;
}

async function connectWallet() {
    if (!window.ethereum) {
        showStatus("Please install MetaMask!", "error");
        return;
    }

    try {
        showStatus("Connecting...", "loading");
        
        // Request accounts
        const accounts = await window.ethereum.request({ 
            method: "eth_requestAccounts" 
        });
        userAddress = accounts[0];
        
        // Setup provider/signer
        await setupProvider();
        
        showStatus("Wallet connected!", "success");
        updateUI();
        
    } catch (error) {
        showStatus(`Connection failed: ${error.message}`, "error");
    }
}

async function setupProvider() {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    // Check network
    const network = await provider.getNetwork();
    checkNetwork(network.chainId);
}

function checkNetwork(chainId) {
    const isMonad = chainId === 1160; // Monad Testnet
    
    networkName.textContent = isMonad ? "Monad Testnet" : "Wrong Network";
    networkIndicator.className = `indicator ${isMonad ? "connected" : "disconnected"}`;
    
    switchNetworkBtn.style.display = isMonad ? "none" : "block";
    signBtn.disabled = !isMonad;
}

async function switchNetwork() {
    try {
        await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [MONAD_TESTNET]
        });
    } catch (error) {
        showStatus(`Failed to switch: ${error.message}`, "error");
    }
}

async function signGreeting() {
    try {
        showStatus("Signing...", "loading");
        signBtn.disabled = true;
        
        // In a real contract, you'd have separate gm() and gn() functions
        const tx = await contract.gm(); 
        showStatus("Waiting for confirmation...", "loading");
        
        await tx.wait();
        showStatus(`${isGM ? "GM" : "GN"} signed successfully!`, "success");
        
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
    } finally {
        signBtn.disabled = false;
    }
}

function disconnectWallet() {
    userAddress = null;
    updateUI();
    showStatus("Disconnected", "success");
}

function updateUI() {
    const isConnected = userAddress !== null;
    
    connectBtn.style.display = isConnected ? "none" : "block";
    disconnectBtn.style.display = isConnected ? "block" : "none";
    signBtn.disabled = !isConnected;
    
    if (isConnected) {
        walletInfo.textContent = `Connected: ${userAddress}`;
        walletInfo.style.display = "block";
    } else {
        walletInfo.style.display = "none";
    }
}

function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
}

// Event listeners
switchNetworkBtn.addEventListener("click", switchNetwork);
