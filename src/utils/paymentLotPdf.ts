import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TAX_MULTIPLIER = 0.88;
const COMMISSION_RATE = 0.5;

const BRAND = {
  primary: [185, 159, 126] as [number, number, number], // #b99f7e
  primaryDark: [154, 131, 102] as [number, number, number],
  accent: [22, 101, 52] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  surface: [250, 247, 243] as [number, number, number],
  border: [230, 222, 210] as [number, number, number],
};

const CLINIC = {
  name: "Essência Saúde",
  subtitle: "Psicologia Integrada",
  website: "essenciasaudeintegrada.com.br",
};

export interface PaymentLotAppointment {
  patient_name: string;
  date: string;
  insurance_type?: string;
  appointment_type?: string;
  value: number;
  commission: number;
}

export interface PaymentLotDetails {
  psychologist_name: string;
  status: string;
  total_value: number;
  payment_created_at: string;
  pix?: string;
  appointments: PaymentLotAppointment[];
}

const formatLotDate = (dateString: string) => dateString.split("-").reverse().join("/");

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getStatusLabel = (status: string) => {
  if (status === "payments_created") return "Pagamento Criado";
  if (status === "payments_finish") return "Pagamento Realizado";
  return status;
};

const drawHeader = (doc: jsPDF, pageWidth: number) => {
  const stripeHeight = 4;

  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageWidth, stripeHeight, "F");

  doc.setFillColor(...BRAND.primaryDark);
  doc.rect(0, stripeHeight, pageWidth, 0.8, "F");

  return stripeHeight + 8;
};

const PDF_MARGIN = 14;

const drawDocumentTitle = (
  doc: jsPDF,
  title: string,
  subtitle: string,
  y: number,
  pageWidth: number
) => {
  doc.setTextColor(...BRAND.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, PDF_MARGIN, y);

  doc.setTextColor(...BRAND.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, PDF_MARGIN, y + 7);

  const lineY = y + 11;
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.8);
  doc.line(PDF_MARGIN, lineY, pageWidth - PDF_MARGIN, lineY);

  return lineY + 8;
};

const drawInfoPanel = (
  doc: jsPDF,
  items: { label: string; value: string }[],
  y: number,
  margin: number,
  contentWidth: number
) => {
  const colWidth = (contentWidth - 4) / 2;
  const rowHeight = 14;
  const rows = Math.ceil(items.length / 2);
  const panelHeight = rows * rowHeight + rows * 2 + 8;

  doc.setFillColor(...BRAND.surface);
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, contentWidth, panelHeight, 2, 2, "FD");

  items.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + 6 + col * (colWidth + 4);
    const itemY = y + 8 + row * (rowHeight + 2);

    doc.setTextColor(...BRAND.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(item.label.toUpperCase(), x, itemY);

    doc.setTextColor(...BRAND.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(item.value, colWidth - 4);
    doc.text(lines, x, itemY + 5);
  });

  return y + panelHeight + 6;
};

const drawSectionTitle = (doc: jsPDF, title: string, y: number) => {
  doc.setFillColor(...BRAND.primary);
  doc.rect(PDF_MARGIN, y + 1, 3, 8, "F");

  doc.setTextColor(...BRAND.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, PDF_MARGIN + 6, y + 7);

  return y + 14;
};

const drawSummaryCard = (
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  highlight = false
) => {
  doc.setFillColor(...(highlight ? BRAND.accent : BRAND.white));
  doc.setDrawColor(...(highlight ? BRAND.accent : BRAND.border));
  doc.setLineWidth(highlight ? 0 : 0.2);
  doc.roundedRect(x, y, width, 22, 2, 2, "FD");

  doc.setTextColor(...(highlight ? BRAND.white : BRAND.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(label.toUpperCase(), x + 4, y + 7);

  doc.setTextColor(...(highlight ? BRAND.white : BRAND.text));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(highlight ? 12 : 11);
  doc.text(value, x + 4, y + 16);
};

const drawFooter = (
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  pageNumber: number,
  totalPages: number,
  generatedAt: string
) => {
  const footerY = pageHeight - 10;

  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.3);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

  doc.setTextColor(...BRAND.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`${CLINIC.name} · ${CLINIC.subtitle}`, 14, footerY);
  doc.text(`Gerado em ${generatedAt}`, pageWidth / 2, footerY, { align: "center" });
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 14, footerY, { align: "right" });
};

export const generatePaymentLotPdf = async (lotDetails: PaymentLotDetails): Promise<void> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  let y = drawHeader(doc, pageWidth);

  const statusLabel = getStatusLabel(lotDetails.status);
  const createdAt = format(new Date(lotDetails.payment_created_at), "dd/MM/yyyy 'às' HH:mm", {
    locale: ptBR,
  });

  y = drawDocumentTitle(
    doc,
    "Detalhes do Lote de Pagamento",
    `Relatório de repasse · ${lotDetails.psychologist_name}`,
    y,
    pageWidth
  );

  const netPayout = lotDetails.total_value * TAX_MULTIPLIER * COMMISSION_RATE;
  const cardWidth = (contentWidth - 4) / 2;

  drawSummaryCard(
    doc,
    "Repasse Líquido (-12%)",
    formatCurrency(netPayout),
    margin,
    y,
    cardWidth,
    true
  );
  drawSummaryCard(
    doc,
    "Total de Consultas",
    String(lotDetails.appointments.length),
    margin + cardWidth + 4,
    y,
    cardWidth
  );
  y += 28;

  y = drawInfoPanel(
    doc,
    [
      { label: "Profissional", value: lotDetails.psychologist_name },
      { label: "Status do Lote", value: statusLabel },
      { label: "Data de Criação", value: createdAt },
      { label: "Chave PIX", value: lotDetails.pix?.trim() || "Não informada" },
    ],
    y,
    margin,
    contentWidth
  );

  y = drawSectionTitle(doc, "Detalhamento das Consultas", y);

  const tableData = lotDetails.appointments.map((appointment) => [
    appointment.patient_name,
    formatLotDate(appointment.date),
    appointment.insurance_type || "Particular",
    appointment.appointment_type === "online" ? "Online" : "Presencial",
    formatCurrency(appointment.value),
    formatCurrency(appointment.commission),
    formatCurrency(appointment.commission * TAX_MULTIPLIER),
  ]);

  const totalGross = lotDetails.appointments.reduce((sum, a) => sum + a.value, 0);
  const totalCommission = lotDetails.appointments.reduce((sum, a) => sum + a.commission, 0);
  const totalNet = lotDetails.appointments.reduce((sum, a) => sum + a.commission * TAX_MULTIPLIER, 0);

  (doc as jsPDF & { autoTable: (options: Record<string, unknown>) => void }).autoTable({
    startY: y,
    margin: { left: margin, right: margin, bottom: 18 },
    head: [["Paciente", "Data", "Plano", "Tipo", "Valor Bruto", "Comissão", "Repasse (-12%)"]],
    body: tableData,
    foot: [[
      { content: "Totais", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
      formatCurrency(totalGross),
      formatCurrency(totalCommission),
      formatCurrency(totalNet),
    ]],
    theme: "plain",
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3,
    },
    footStyles: {
      fillColor: BRAND.surface,
      textColor: BRAND.text,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: BRAND.text,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [252, 250, 248],
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 28 },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 26, halign: "right" },
      5: { cellWidth: 26, halign: "right" },
      6: { cellWidth: 28, halign: "right", textColor: BRAND.accent, fontStyle: "bold" },
    },
    styles: {
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    didDrawPage: (data: { pageNumber: number }) => {
      const totalPages = doc.getNumberOfPages();
      drawFooter(doc, pageWidth, pageHeight, data.pageNumber, totalPages, generatedAt);
    },
  });

  const reportName = `repasse-${lotDetails.psychologist_name.replace(/\s+/g, "-").toLowerCase()}-${format(
    new Date(),
    "yyyyMMdd",
    { locale: ptBR }
  )}.pdf`;

  doc.save(reportName);
};
