let rowCount = 0;

function addRow(data = {}) {
    rowCount++;
    const tbody = document.getElementById('tableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${rowCount}</td>
        <td><input type="text" class="pName" value="${data.ProductName || data['Product Name'] || data.productName || ''}"></td>
        <td><input type="text" class="hsn" value="${data.HSN || data['HSN Code'] || ''}"></td>
        <td><input type="number" class="gstRate" value="${data.GSTRate || data['GST Rate'] || data['GST %'] || 18}" oninput="calculateInvoice()"></td>
        <td><input type="number" class="qty" value="${data.Qty || data.Quantity || 1}" oninput="calculateInvoice()"></td>
        <td><input type="number" class="mrp" value="${data.MRP || 0}"></td>
        <td><input type="number" class="margin" value="${data.Margin || 0}"></td>
        <td><input type="number" class="rate" value="${data.Rate || 0}" oninput="calculateInvoice()"></td>
        <td class="taxableAmt">0.00</td>
        <td><button onclick="this.parentElement.parentElement.remove(); rowCount--; calculateInvoice();" class="no-print">×</button></td>
    `;
    tbody.appendChild(row);
    calculateInvoice();
}

function calculateInvoice() {
    const rows = document.querySelectorAll('#tableBody tr');
    const buyerGstin = document.getElementById('buyerGstin').value.trim();
    const isInterState = buyerGstin.length >= 2 && buyerGstin.substring(0, 2) !== "36";

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

        if (!gstGroups[gstRate]) gstGroups[gstRate] = 0;
        gstGroups[gstRate] += taxable;
    });

    let totalGstAmount = 0;
    let breakdownHtml = "<strong>GST Summary:</strong><br>";

    for (let rate in gstGroups) {
        const amt = gstGroups[rate];
        const tax = amt * (rate / 100);
        totalGstAmount += tax;

        if (isInterState) {
            breakdownHtml += `IGST @${rate}%: ₹${tax.toFixed(2)}<br>`;
        } else {
            const half = (tax / 2).toFixed(2);
            breakdownHtml += `CGST @${rate/2}%: ₹${half} | SGST @${rate/2}%: ₹${half}<br>`;
        }
    }

    document.getElementById('totalQty').innerText = totalQty;
    document.getElementById('totalTaxable').innerText = totalTaxable.toFixed(2);
    document.getElementById('totalGst').innerText = totalGstAmount.toFixed(2);
    document.getElementById('grandTotal').innerText = (totalTaxable + totalGstAmount).toFixed(2);
    document.getElementById('gstBreakdown').innerHTML = breakdownHtml;
}

// Excel Import - Fixed for different column names
document.getElementById('excelImport').addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
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

// Initial row
addRow();
