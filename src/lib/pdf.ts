import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfTableOptions {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  filename?: string;
  totals?: { label: string; value: string }[];
}

export function generatePdf(opts: PdfTableOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(20, 20, 24);
  doc.rect(0, 0, w, 60, "F");
  doc.setTextColor(255, 200, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("P.R.I.S.M", 32, 36);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Pathfinder Restaurant", 32, 50);

  doc.setTextColor(20, 20, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.title, 32, 90);
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(opts.subtitle, 32, 106);
  }
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleString("en-NG")}`, w - 32, 90, { align: "right" });

  autoTable(doc, {
    startY: 124,
    head: [opts.columns],
    body: opts.rows,
    theme: "striped",
    headStyles: { fillColor: [20, 20, 24], textColor: [255, 200, 80], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 6 },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    margin: { left: 32, right: 32 },
  });

  if (opts.totals && opts.totals.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 24);
    let y = finalY;
    opts.totals.forEach((t) => {
      doc.text(`${t.label}:`, w - 200, y);
      doc.text(t.value, w - 32, y, { align: "right" });
      y += 16;
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, w / 2, doc.internal.pageSize.getHeight() - 16, { align: "center" });
  }

  doc.save(opts.filename || `${opts.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

export function printPage() {
  window.print();
}
