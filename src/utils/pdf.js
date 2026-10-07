/* ============================================================
   PDF export.
   jsPDF and html2canvas are heavy (~600 KB together), so they
   are imported dynamically — the bundle only pays for them when
   somebody actually clicks "Download PDF".
   ============================================================ */

export async function elementToPdf(elementId, filename) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Nothing to export — the document is not on screen.');

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(el, {
    scale: 2,              // 2x for crisp text on retina and in print
    useCORS: true,         // allow the Unsplash / QR images through
    backgroundColor: '#ffffff',
    logging: false,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;
  const img = canvas.toDataURL('image/png');

  if (imgH <= pageH - margin * 2) {
    // Fits on one page.
    pdf.addImage(img, 'PNG', margin, margin, imgW, imgH);
  } else {
    // Taller than A4 — slice it across pages.
    let remaining = imgH;
    let offset = 0;
    while (remaining > 0) {
      pdf.addImage(img, 'PNG', margin, margin - offset, imgW, imgH);
      remaining -= pageH - margin * 2;
      offset += pageH - margin * 2;
      if (remaining > 0) pdf.addPage();
    }
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/* Confetti is also lazy-loaded — only the fee success screen uses it. */
export async function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try {
    const { default: confetti } = await import('canvas-confetti');
    const shoot = (opts) => confetti({
      particleCount: 70,
      spread: 72,
      startVelocity: 42,
      ticks: 220,
      colors: ['#f59e0b', '#fbb420', '#19ae6d', '#18213c', '#fde088'],
      ...opts,
    });
    shoot({ origin: { x: 0.2, y: 0.7 }, angle: 60 });
    shoot({ origin: { x: 0.8, y: 0.7 }, angle: 120 });
    setTimeout(() => shoot({ origin: { x: 0.5, y: 0.6 }, spread: 100, particleCount: 50 }), 220);
  } catch {
    /* confetti is decoration — never let it break the receipt */
  }
}
