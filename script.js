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
        <td><input type="number" class="qty" value="${data.Qty || data.Quantity || 1}" min="1" step="1" oninput="calculateInvoice()" required></td>
        <td><input type="number" class="mrp" value="${data.MRP || 0}" min="0" step="0.01"></td>
        <td><input type="number" class="margin" value="${data.Margin || 0}" min="0" max="100" step="0.01"></td>
        <td><input type="number" class="rate" value="${data.Rate || data['Unit Price'] || 0}" min="0" step="0.01" oninput="calculateInvoice()" required></td>
        <td class="taxableAmt">0.00</td>
        <td><button onclick="removeRow(this)" class="no-print">×</button></td>
    `;
    tbody.appendChild(row);

    // Auto-calculate Unit Price from MRP & Margin
    const mrpInput = row.querySelector('.mrp');
    const marginInput = row.querySelector('.margin');
    const rateInput = row.querySelector('.rate');

    const updateRate = () => {
        const mrp = parseFloat(mrpInput.value) || 0;
        const margin = parseFloat(marginInput.value) || 0;
        if (mrp > 0) {
            const calculated = mrp * (100 - margin) / 100;
            rateInput.value = calculated.toFixed(2);
            calculateInvoice();
        }
    };

    mrpInput.addEventListener('input', updateRate);
    marginInput.addEventListener('input', updateRate);

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
        row.cells[0].innerText = index + 1;
    });
    rowCount = rows.length;
}

function numberToWords(num) {
    if (num === 0) return 'Zero';
    const ones = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
        'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const tens = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

    const inWords = (n) => {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + ones[n % 10];
        if (n < 1000) return ones[Math.floor(n / 100)] + 'Hundred ' + (n % 100 === 0 ? '' : inWords(n % 100));
        return '';
    };

    let str = '';
    if (num >= 10000000) { str += inWords(Math.floor(num / 10000000)) + 'Crore '; num %= 10000000; }
    if (num >= 100000) { str += inWords(Math.floor(num / 100000)) + 'Lakh '; num %= 100000; }
    if (num >= 1000) { str += inWords(Math.floor(num / 1000)) + 'Thousand '; num %= 1000; }
    str += inWords(num);
    return str.trim();
}

function calculateInvoice() {
    const rows = document.querySelectorAll('#tableBody tr');
    const buyerGstin = document.getElementById('buyerGstin').value.trim().toUpperCase();
    const isInterState = buyerGstin.length >= 2 && buyerGstin.substring(0, 2) !== "36";

    let totalQty = 0;
    let totalTaxable = 0;
    let gstGroups = {};

    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.qty').value) || 0;
        const rate = parseFloat(row.querySelector('.rate').value) || 0;
        const gstRate = parseFloat(row.querySelector('.gstRate').value) || 0;

        const taxable = Number((qty * rate).toFixed(2));
        row.querySelector('.taxableAmt').innerText = taxable.toFixed(2);

        totalQty += qty;
        totalTaxable += taxable;

        if (!gstGroups[gstRate]) gstGroups[gstRate] = 0;
        gstGroups[gstRate] += taxable;
    });

    let totalGstAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    let breakdownHtml = `<strong>GST Breakdown:</strong>
    <table class="gst-summary">
        <thead>
            <tr>
                <th>GST Rate (%)</th>
                <th>Taxable Value (₹)</th>
                <th>CGST Amount (₹)</th>
                <th>SGST Amount (₹)</th>
                <th>IGST Amount (₹)</th>
                <th>Total GST (₹)</th>
            </tr>
        </thead>
        <tbody>`;

    for (let rateStr in gstGroups) {
        const rate = parseFloat(rateStr);
        const amt = gstGroups[rateStr];
        const tax = Number((amt * rate / 100).toFixed(2));
        totalGstAmount += tax;

        const cgst = isInterState ? 0 : Number((tax / 2).toFixed(2));
        const sgst = isInterState ? 0 : Number((tax / 2).toFixed(2));
        const igst = isInterState ? tax : 0;

        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;

        breakdownHtml += `
            <tr>
                <td>${rate.toFixed(1)}</td>
                <td>${amt.toFixed(2)}</td>
                <td>${cgst.toFixed(2)}</td>
                <td>${sgst.toFixed(2)}</td>
                <td>${igst.toFixed(2)}</td>
                <td>${tax.toFixed(2)}</td>
            </tr>`;
    }

    const grandTotal = Number((totalTaxable + totalGstAmount).toFixed(2));

    breakdownHtml += `
        <tr class="total-row">
            <td><strong>Total</strong></td>
            <td><strong>${totalTaxable.toFixed(2)}</strong></td>
            <td><strong>${totalCgst.toFixed(2)}</strong></td>
            <td><strong>${totalSgst.toFixed(2)}</strong></td>
            <td><strong>${totalIgst.toFixed(2)}</strong></td>
            <td><strong>${totalGstAmount.toFixed(2)}</strong></td>
        </tr>
    </tbody></table>`;

    // Amount in words with paise
    const rupees = Math.floor(grandTotal);
    const paiseNum = Math.round((grandTotal - rupees) * 100);
    let words = rupees > 0 ? numberToWords(rupees) : 'Zero';
    if (paiseNum > 0) {
        words += ' and ' + numberToWords(paiseNum) + ' Paise';
    }
    words += ' Only';

    document.getElementById('totalQty').innerText = totalQty;
    document.getElementById('totalTaxable').innerText = totalTaxable.toFixed(2);
    document.getElementById('totalGst').innerText = totalGstAmount.toFixed(2);
    document.getElementById('grandTotal').innerText = grandTotal.toFixed(2);
    document.getElementById('grandTotalWords').innerText = `Amount in Words: ${words}`;
    document.getElementById('gstBreakdown').innerHTML = breakdownHtml;
}

function validateFields() {
    const required = document.querySelectorAll('[required]');
    let valid = true;
    required.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'red';
            valid = false;
        } else {
            field.style.borderColor = '';
        }
    });
    if (!valid) alert('Please fill all required fields.');
    return valid;
}

function validateAndPrint() {
    if (!validateFields()) return;
    window.print();
}

function downloadPDF() {
    if (!validateFields()) return;
    document.body.classList.add('pdf-mode');
    const element = document.querySelector('.container');
    const invNo = document.getElementById('invNo').value || 'invoice';
    html2pdf()
        .from(element)
        .set({
            margin: [0.4, 0.4, 0.4, 0.4],
            filename: `${invNo}.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        })
        .save()
        .then(() => {
            document.body.classList.remove('pdf-mode');
        });
}

function downloadExcel() {
    if (!validateFields()) return;
    const wb = XLSX.utils.book_new();
    const data = [];

    data.push(["TAX INVOICE"]);
    data.push(["JMD Enterprises"]);
    data.push(["Sai Tower, Rukhminipuri, Hyderabad, Telangana - 500062"]);
    data.push(["Phone: +91 7095460374 | Email: jmdenterprises1985.108@gmail.com"]);
    data.push(["GSTIN: 36CRUPS1658B1ZD"]);
    data.push([]);

    const invNo = document.getElementById('invNo').value;
    const invDate = document.getElementById('invDate').value;
    const poNo = document.getElementById('poNo').value || '-';
    data.push(["Invoice No: " + invNo, "", "Date: " + invDate]);
    data.push(["PO No: " + poNo]);
    data.push([]);

    data.push(["Ship To / Bill To:"]);
    data.push([document.getElementById('shipTo').value.replace(/\n/g, ' | ')]);
    data.push(["Buyer GSTIN: " + document.getElementById('buyerGstin').value]);
    data.push([]);

    data.push(["S.No", "Item Description", "HSN/SAC Code", "GST Rate (%)", "Quantity", "MRP", "Margin (%)", "Unit Price", "Taxable Value"]);
    document.querySelectorAll('#tableBody tr').forEach((row, idx) => {
        data.push([
            idx + 1,
            row.querySelector('.pName').value,
            row.querySelector('.hsn').value,
            row.querySelector('.gstRate').value,
            row.querySelector('.qty').value,
            row.querySelector('.mrp').value,
            row.querySelector('.margin').value,
            row.querySelector('.rate').value,
            row.querySelector('.taxableAmt').innerText
        ]);
    });

    data.push([]);
    data.push(["Total Quantity", document.getElementById('totalQty').innerText]);
    data.push(["Total Taxable Value (₹)", document.getElementById('totalTaxable').innerText]);
    data.push(["Total GST Amount (₹)", document.getElementById('totalGst').innerText]);
    data.push(["Grand Total (₹)", document.getElementById('grandTotal').innerText]);
    data.push(["Amount in Words", document.getElementById('grandTotalWords').innerText]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{wch: 8}, {wch: 35}, {wch: 15}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 18}];

    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(wb, `${invNo}.xlsx`);
}

function downloadWord() {
    if (!validateFields()) return;
    let preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Invoice</title></head><body>";
    let postHtml = "</body></html>";
    let htmlContent = preHtml + document.querySelector('.container').innerHTML + postHtml;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.getElementById('invNo').value || 'invoice'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
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
            Rate: row.querySelector('.rate').value
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
        li.innerText = `${inv.invNo} - ${inv.invDate || 'No Date'}`;
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
