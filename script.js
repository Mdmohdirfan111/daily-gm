let rowCount = 0;
const invoices = JSON.parse(localStorage.getItem('invoices')) || [];

function generateInvoiceNumber() {
    const lastInv = invoices.length > 0 ? invoices[invoices.length - 1].invNo : 'INV-000';
    const num = parseInt(lastInv.split('-')[1]) + 1;
    return `INV-${num.toString().padStart(3, '0')}`;
}

function addRow(data = {}) {
    rowCount++;
    const tbody = document.getElementById('tableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${rowCount}</td>
        <td><input type="text" class="pName" value="${data.ProductName || data['Product Name'] || data['Item Description'] || ''}" required></td>
        <td><input type="text" class="hsn" value="${data.HSN || data['HSN/SAC Code'] || ''}" required></td>
        <td><input type="number" class="gstRate" value="${data.GSTRate || data['GST Rate'] || 18}" min="0" max="28" step="0.01" oninput="calculateInvoice()" required></td>
        <td><input type="number" class="qty" value="${data.Qty || data.Quantity || 1}" min="1" oninput="calculateInvoice()" required></td>
        <td><input type="number" class="mrp" value="${data.MRP || 0}" min="0" step="0.01"></td>
        <td><input type="number" class="margin" value="${data.Margin || 0}" min="0" max="100" step="0.01"></td>
        <td><input type="number" class="rate" value="${data.Rate || data['Unit Price'] || 0}" min="0" step="0.01" oninput="calculateInvoice()" required></td>
        <td class="taxableAmt">0.00</td>
        <td><button onclick="removeRow(this)" class="no-print">×</button></td>
    `;
    tbody.appendChild(row);
    calculateInvoice();
}

function removeRow(btn) {
    btn.parentElement.parentElement.remove();
    rowCount--;
    renumberRows();
    calculateInvoice();
}

function renumberRows() {
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach((row, index) => {
        row.querySelector('td:first-child').innerText = index + 1;
    });
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
    let breakdownHtml = "<strong>GST Breakdown:</strong><br>";

    for (let rate in gstGroups) {
        const amt = gstGroups[rate];
        const tax = amt * (rate / 100);
        totalGstAmount += tax;

        if (isInterState) {
            breakdownHtml += `IGST @ ${rate}% on ₹${amt.toFixed(2)}: ₹${tax.toFixed(2)}<br>`;
        } else {
            const halfRate = (rate / 2).toFixed(2);
            const halfTax = (tax / 2).toFixed(2);
            breakdownHtml += `CGST @ ${halfRate}%: ₹${halfTax} | SGST @ ${halfRate}%: ₹${halfTax}<br>`;
        }
    }

    const grandTotal = totalTaxable + totalGstAmount;

    document.getElementById('totalQty').innerText = totalQty;
    document.getElementById('totalTaxable').innerText = totalTaxable.toFixed(2);
    document.getElementById('totalGst').innerText = totalGstAmount.toFixed(2);
    document.getElementById('grandTotal').innerText = grandTotal.toFixed(2);
    document.getElementById('gstBreakdown').innerHTML = breakdownHtml;
    document.getElementById('grandTotalWords').innerText = `Amount in Words: ${numberToWords(grandTotal)} Rupees Only`;
}

function numberToWords(num) {
    const belowTwenty = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero';

    function helper(n) {
        if (n < 20) return belowTwenty[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + belowTwenty[n % 10] : '');
        if (n < 1000) return belowTwenty[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + helper(n % 100) : '');
        let str = '';
        let i = 0;
        while (n > 0) {
            if (i === 0 || i === 1) {
                str = helper(n % 100) + (str ? ' ' + str : '');
            } else {
                str = helper(n % 1000) + (str ? ' ' + str : '');
            }
            if (str && thousands[i]) str = str + ' ' + thousands[i];
            n = Math.floor(n / (i === 0 ? 1000 : 100));
            i++;
        }
        return str.trim();
    }

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let words = helper(integerPart);
    if (decimalPart > 0) words += ' and ' + helper(decimalPart) + ' Paise';
    return words;
}

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

function validateAndPrint() {
    const requiredFields = document.querySelectorAll('[required]');
    let valid = true;
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'red';
            valid = false;
        } else {
            field.style.borderColor = '';
        }
    });
    if (!valid) {
        alert('Please fill all required fields.');
        return;
    }
    window.print();
}

function saveInvoice() {
    const invoiceData = {
        invNo: document.getElementById('invNo').value,
        invDate: document.getElementById('invDate').value,
        poNo: document.getElementById('poNo').value,
        shipTo: document.getElementById('shipTo').value,
        buyerGstin: document.getElementById('buyerGstin').value,
        items: Array.from(document.querySelectorAll('#tableBody tr')).map(row => ({
            ProductName: row.querySelector('.pName').value,
            HSN: row.querySelector('.hsn').value,
            GSTRate: row.querySelector('.gstRate').value,
            Qty: row.querySelector('.qty').value,
            MRP: row.querySelector('.mrp').value,
            Margin: row.querySelector('.margin').value,
            Rate: row.querySelector('.rate').value,
            TaxableAmt: row.querySelector('.taxableAmt').innerText
        }))
    };
    invoices.push(invoiceData);
    localStorage.setItem('invoices', JSON.stringify(invoices));
    alert('Invoice saved successfully!');
}

function loadInvoices() {
    const list = document.getElementById('savedInvoices');
    list.innerHTML = '';
    invoices.forEach((inv, index) => {
        const li = document.createElement('li');
        li.innerText = `${inv.invNo} - ${inv.invDate}`;
        li.onclick = () => loadInvoice(index);
        list.appendChild(li);
    });
    document.getElementById('invoiceList').style.display = 'block';
}

function loadInvoice(index) {
    const inv = invoices[index];
    document.getElementById('invNo').value = inv.invNo;
    document.getElementById('invDate').value = inv.invDate;
    document.getElementById('poNo').value = inv.poNo;
    document.getElementById('shipTo').value = inv.shipTo;
    document.getElementById('buyerGstin').value = inv.buyerGstin;
    document.getElementById('tableBody').innerHTML = '';
    rowCount = 0;
    inv.items.forEach(item => addRow(item));
    document.getElementById('invoiceList').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('invNo').value = generateInvoiceNumber();
    document.getElementById('invDate').valueAsDate = new Date();
    addRow();
});
