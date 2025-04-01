// Replace existing code with this:
let userAddress;
const contractAddress = "0xa1E5b475815a84F10b1E5Dc05Cf2Faf5FE0bb8c0";
const abi = [{"inputs":[],"name":"gm","outputs":[],"stateMutability":"nonpayable","type":"function"}];

document.getElementById("connectWallet").onclick = async () => {
  if (window.ethereum && !window.ethereum._state) { // Safety check
    try {
      userAddress = await window.ethereum.request({ method: "eth_requestAccounts" });
      document.getElementById("gmButton").disabled = false;
    } catch (error) {
      console.error("User rejected connection:", error);
    }
  } else {
    alert("MetaMask not detected! Install it first.");
  }
};

document.getElementById("gmButton").onclick = async () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(contractAddress, abi, provider.getSigner());
  try {
    await contract.gm();
    alert("GM recorded!");
  } catch (error) {
    alert("Error: " + error.message);
  }
};
