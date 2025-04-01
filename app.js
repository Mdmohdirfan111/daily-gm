let userAddress;
const contractAddress = "0xa1E5b475815a84F10b1E5Dc05Cf2Faf5FE0bb8c0";
const abi = [{"inputs":[],"name":"gm","outputs":[],"stateMutability":"nonpayable","type":"function"}];

// Elements
const connectBtn = document.getElementById("connectWallet");
const gmBtn = document.getElementById("gmButton");
const statusEl = document.getElementById("status");
const walletEl = document.getElementById("walletAddress");

// Connect Wallet
connectBtn.onclick = async () => {
    if (window.ethereum) {
        try {
            statusEl.innerHTML = '<div class="loader"></div> Connecting...';
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            userAddress = accounts[0];
            
            connectBtn.disabled = true;
            gmBtn.disabled = false;
            
            walletEl.textContent = userAddress;
            walletEl.style.display = "block";
            statusEl.textContent = "✅ Wallet connected!";
            
        } catch (error) {
            statusEl.textContent = `❌ Error: ${error.message}`;
        }
    } else {
        statusEl.textContent = "❌ MetaMask not installed!";
    }
};

// Sign GM
gmBtn.onclick = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider.getSigner());
    
    try {
        gmBtn.disabled = true;
        statusEl.innerHTML = '<div class="loader"></div> Signing GM...';
        
        const tx = await contract.gm();
        statusEl.innerHTML = '<div class="loader"></div> Waiting for confirmation...';
        
        await tx.wait();
        statusEl.textContent = "🎉 GM signed! Come back tomorrow.";
        gmBtn.disabled = true;
        
    } catch (error) {
        statusEl.textContent = `❌ Error: ${error.message}`;
        gmBtn.disabled = false;
    }
};
