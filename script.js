let rowCount = 0;

function addRow(data = {}) {
    rowCount++;
    const tbody = document.getElementById('tableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${rowCount}</td>
        <td><input type="text" class="pName" value="${data.ProductName || ''}"></td>
        <td><input type="text" class="hsn" value="${data.HSN || ''}"></td>
        <td><input type="number" class="gstRate" value="${data.GSTRate || 18}" oninput="calculateInvoice()"></td>
        <td><input type="number" class="qty" value="${data.Qty || 1}" oninput="calculateInvoice()"></td>
        <td><input type="number" class="mrp" value="${data.MRP || 0}"></td>
        <td><input type="number" class="rate" value="${data.Rate || 0}" oninput="calculateInvoice()"></td>
        <td class="taxableAmt">0.00</td>
        <td><button onclick="this.parentElement.parentElement.remove(); calculateInvoice();" class="no-print">×</button></td>
    `;
    tbody.appendChild(row);
    calculateInvoice();
}

function calculateInvoice() {
    const rows = document.querySelectorAll('#tableBody tr');
    const buyerGstin = document.getElementById('buyerGstin').value;
    const isInterState = buyerGstin.length >= 2 && buyerGstin.substring(0, 2) !== "36";
    
    document.getElementById('gstType').innerText = isInterState ? "Type: Inter-State (IGST)" : "Type: Intra-State (CGST/SGST)";

    let totalQty = 0;
    let totalTaxable = 0;
    let gstGroups = {};

    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.qty').value) || 0;
        const rate = parseFloat(row.querySelector('.rate').value) || 0;
        const gstRate = parseFloat(row.querySelector('.gstRate').value) || 0;
        
        const taxable = qty * rate;
        row.querySelector('.taxableAmt').innerText = taxable.toFixed(2);

        totalQty += qty;
        totalTaxable += taxable;

        // Group GST for summary
        if (!gstGroups[gstRate]) gstGroups[gstRate] = 0;
        gstGroups[gstRate] += taxable;
    });

    let totalGstAmount = 0;
    let breakdownHtml = "";

    for (let rate in gstGroups) {
        const amt = gstGroups[rate];
        const tax = amt * (rate / 100);
        totalGstAmount += tax;

        if (isInterState) {
            breakdownHtml += `<div>IGST @${rate}%: ₹${tax.toFixed(2)}</div>`;
        } else {
            breakdownHtml += `<div>CGST @${rate/2}%: ₹${(tax/2).toFixed(2)} | SGST @${rate/2}%: ₹${(tax/2).toFixed(2)}</div>`;
        }
    }

    document.getElementById('totalQty').innerText = totalQty;
    document.getElementById('totalTaxable').innerText = totalTaxable.toFixed(2);
    document.getElementById('totalGst').innerText = totalGstAmount.toFixed(2);
    document.getElementById('grandTotal').innerText = (totalTaxable + totalGstAmount).toFixed(2);
    document.getElementById('gstBreakdown').innerHTML = breakdownHtml;
}

// Excel Import Logic
document.getElementById('excelImport').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        document.getElementById('tableBody').innerHTML = "";
        rowCount = 0;
        json.forEach(item => addRow(item));
    };
    reader.readAsArrayBuffer(e.target.files[0]);
});

function downloadPDF() {
    const element = document.querySelector('.container');
    const opt = {
        margin: 0.2,
        filename: `Invoice_${document.getElementById('invNo').value}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// Initial Row
addRow();
