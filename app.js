let userAddress;
const contractAddress = "0xa1E5b475815a84F10b1E5Dc05Cf2Faf5FE0bb8c0";
const abi = [{"inputs":[],"name":"gm","outputs":[],"stateMutability":"nonpayable","type":"function"}];

document.getElementById("connectWallet").onclick = async () => {
    if (window.ethereum) {
        try {
            userAddress = await window.ethereum.request({ method: "eth_requestAccounts" });
            document.getElementById("gmButton").disabled = false;
            document.getElementById("status").textContent = `Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        } catch (error) {
            document.getElementById("status").textContent = "Error: " + error.message;
        }
    } else {
        document.getElementById("status").textContent = "MetaMask not installed!";
    }
};

document.getElementById("gmButton").onclick = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider.getSigner());
    try {
        document.getElementById("gmButton").disabled = true;
        document.getElementById("status").textContent = "Sending transaction...";
        const tx = await contract.gm();
        await tx.wait();
        document.getElementById("status").textContent = "✅ GM recorded! Come back tomorrow.";
    } catch (error) {
        document.getElementById("status").textContent = "Error: " + error.message;
        document.getElementById("gmButton").disabled = false;
    }
};
