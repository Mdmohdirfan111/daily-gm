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
        <td><input type="number" class="margin" value="${data.Margin || 0}"></td>
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
    const source = document.querySelector('.container');
    const clone = source.cloneNode(true);
    
    // Add printing class for compact styles
    clone.classList.add('printing');
    
    // Hide controls and action column
    clone.querySelectorAll('.no-print, .controls').forEach(el => el.remove());
    clone.querySelectorAll('th:last-child, td:last-child').forEach(el => el.remove());

    const opt = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `Invoice_${document.getElementById('invNo').value || 'Draft'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(clone).save();
}

function downloadExcel() {
    const headerData = {
        'Invoice Number': document.getElementById('invNo').value,
        'Invoice Date': document.getElementById('invDate').value,
        'PO Number': document.getElementById('poNo').value,
        'Ship To': document.getElementById('shipTo').value,
        'Buyer GSTIN': document.getElementById('buyerGstin').value,
    };

    const rows = document.querySelectorAll('#tableBody tr');
    const tableData = [];
    rows.forEach((row, index) => {
        tableData.push({
            'S No.': index + 1,
            'Product Name': row.querySelector('.pName').value,
            'HSN': row.querySelector('.hsn').value,
            'GST Rate': row.querySelector('.gstRate').value,
            'Qty': row.querySelector('.qty').value,
            'MRP': row.querySelector('.mrp').value,
            'Margin': row.querySelector('.margin').value,
            'Rate': row.querySelector('.rate').value,
            'Taxable Amount': row.querySelector('.taxableAmt').innerText
        });
    });

    const totalsData = {
        'Total Qty': document.getElementById('totalQty').innerText,
        'Total Taxable': document.getElementById('totalTaxable').innerText,
        'Total GST': document.getElementById('totalGst').innerText,
        'Grand Total': document.getElementById('grandTotal').innerText
    };

    const wb = XLSX.utils.book_new();
    
    const headerWs = XLSX.utils.json_to_sheet([headerData]);
    XLSX.utils.book_append_sheet(wb, headerWs, "Header");

    const tableWs = XLSX.utils.json_to_sheet(tableData);
    XLSX.utils.book_append_sheet(wb, tableWs, "Items");

    const totalsWs = XLSX.utils.json_to_sheet([totalsData]);
    XLSX.utils.book_append_sheet(wb, totalsWs, "Totals");

    XLSX.writeFile(wb, `Invoice_${document.getElementById('invNo').value || 'unnamed'}.xlsx`);
}

function downloadWord() {
    const doc = new docx.Document({
        sections: [{
            properties: {},
            children: [
                new docx.Paragraph({
                    text: "TAX INVOICE",
                    heading: docx.HeadingLevel.HEADING_1,
                    alignment: docx.AlignmentType.CENTER
                }),
                new docx.Paragraph({
                    text: "JMD Enterprises",
                    heading: docx.HeadingLevel.HEADING_2
                }),
                new docx.Paragraph("Dispatch of goods from: Sai Tower, Rukhminipuri, Hyderabad, Telangana - 500062"),
                new docx.Paragraph("Phone: 7095460374 | Email: Jmdenterprises1985.108@gmail.com"),
                new docx.Paragraph("GSTIN: 36CRUPS1658B1ZD"),
                new docx.Paragraph(`Invoice Number: ${document.getElementById('invNo').value}`),
                new docx.Paragraph(`Invoice Date: ${document.getElementById('invDate').value}`),
                new docx.Paragraph(`PO Number: ${document.getElementById('poNo').value}`),
                new docx.Paragraph("Ship To / Bill To:"),
                new docx.Paragraph(document.getElementById('shipTo').value),
                new docx.Paragraph(`Buyer GSTIN: ${document.getElementById('buyerGstin').value}`),
                new docx.Paragraph(document.getElementById('gstType').innerText),
                new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    rows: [
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph("S.No")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Product Name")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("HSN")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("GST %")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Qty")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("MRP")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Margin")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Rate")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Taxable Amt")] }),
                            ],
                        }),
                        ...Array.from(document.querySelectorAll('#tableBody tr')).map((row, index) => 
                            new docx.TableRow({
                                children: [
                                    new docx.TableCell({ children: [new docx.Paragraph((index + 1).toString())] }),
                                    new docx.TableCell({ children: [new docx.Paragraph(row.querySelector('.pName').value)] }),
                                    new docx.TableCell({ children: [new docx.Paragraph(row.querySelector('.hsn').value)] }),
                                    new docx.TableCell({ children: [new docx.Paragraph(row.querySelector('.gstRate').value)] }),
                                    new docx.TableCell({ children: [new docx.Paragraph(row.querySelector('.qty').value)] }),
                                    new docx.TableCell({ children: [new docx.Paragraph(row.querySelector('.mrp').value)] }),
                                    new docx.TableCell({ children: [new docx.Paragraph(row.querySelector('.margin').value)] }),
                                    new docx.TableCell({ children: [new docx.Paragraph(row.querySelector('.rate').value)] }),
                                    new docx.TableCell({ children: [new docx.Paragraph(row.querySelector('.taxableAmt').innerText)] }),
                                ],
                            })
                        ),
                    ],
                }),
                new docx.Paragraph(document.getElementById('gstBreakdown').innerText),
                new docx.Paragraph(`Total Qty: ${document.getElementById('totalQty').innerText}`),
                new docx.Paragraph(`Total Taxable: ₹${document.getElementById('totalTaxable').innerText}`),
                new docx.Paragraph(`Total GST: ₹${document.getElementById('totalGst').innerText}`),
                new docx.Paragraph(`Grand Total: ₹${document.getElementById('grandTotal').innerText}`),
            ]
        }]
    });

    docx.Packer.toBlob(doc).then(blob => {
        saveAs(blob, `Invoice_${document.getElementById('invNo').value || 'unnamed'}.docx`);
    });
}

// Initial Row
addRow();
