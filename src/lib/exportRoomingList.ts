/**
 * exportBoardingListXlsx
 * Exporta a lista de embarque (boarding cards) em Excel (.xlsx) ou CSV.
 */

export interface BoardingExportCard {
  pnr?: string | null;
  airline?: string | null;
  departure_date?: string | null;
  passengers_count?: number | null;
  trip_title?: string;
  trip_destination?: string;
  status: string;
  hotel_name?: string | null;
  hotel_checkin?: string | null;
  hotel_checkout?: string | null;
  guide_name?: string | null;
  guide_phone?: string | null;
  flight_number?: string | null;
  departure_airport?: string | null;
  arrival_airport?: string | null;
  checklist?: Array<{ label: string; done: boolean }>;
  alerts?: string[];
  notes?: string | null;
}

const BOARDING_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  action_needed: "Atenção",
  checked_in: "Check-in Emitido",
  completed: "Embarcado",
};

export async function exportBoardingListXlsx(
  cards: BoardingExportCard[],
  options: { filename?: string; agencyName?: string } = {}
): Promise<void> {
  const { filename = "lista-embarque", agencyName = "TravelOS" } = options;

  const rows = cards.map((card) => {
    const checklistTotal = card.checklist?.length ?? 0;
    const checklistDone = card.checklist?.filter((c) => c.done).length ?? 0;
    const checklistStr = checklistTotal > 0
      ? `${checklistDone}/${checklistTotal} (${Math.round((checklistDone / checklistTotal) * 100)}%)`
      : "—";

    return {
      "Localizador (PNR)": card.pnr ?? "—",
      "Cia Aérea": card.airline ?? "—",
      "Voo": card.flight_number ?? "—",
      "Origem": card.departure_airport ?? "—",
      "Destino": card.arrival_airport ?? "—",
      "Data de Embarque": card.departure_date
        ? new Date(card.departure_date).toLocaleDateString("pt-BR")
        : "—",
      "Passageiros": card.passengers_count ?? "—",
      "Viagem": card.trip_title ?? "—",
      "Destino da Viagem": card.trip_destination ?? "—",
      "Hotel": card.hotel_name ?? "—",
      "Check-in Hotel": card.hotel_checkin
        ? new Date(card.hotel_checkin).toLocaleDateString("pt-BR")
        : "—",
      "Check-out Hotel": card.hotel_checkout
        ? new Date(card.hotel_checkout).toLocaleDateString("pt-BR")
        : "—",
      "Guia": card.guide_name ?? "—",
      "Telefone Guia": card.guide_phone ?? "—",
      "Checklist": checklistStr,
      "Status": BOARDING_STATUS_LABEL[card.status] ?? card.status,
      "Alertas": (card.alerts ?? []).join("; ") || "—",
      "Observações": card.notes ?? "—",
    };
  });

  try {
    const XLSX = await import("xlsx");

    const headerRows = [
      [`Lista de Embarque — ${agencyName}`],
      [`Exportado em: ${new Date().toLocaleString("pt-BR")}`],
      [`Total de localizadores: ${cards.length}`],
      [],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headerRows);
    XLSX.utils.sheet_add_json(ws, rows, { origin: `A${headerRows.length + 1}` });

    ws["!cols"] = [
      { wch: 18 }, // PNR
      { wch: 14 }, // Cia Aérea
      { wch: 10 }, // Voo
      { wch: 10 }, // Origem
      { wch: 10 }, // Destino
      { wch: 16 }, // Data Embarque
      { wch: 12 }, // Passageiros
      { wch: 28 }, // Viagem
      { wch: 20 }, // Destino Viagem
      { wch: 24 }, // Hotel
      { wch: 14 }, // Check-in
      { wch: 14 }, // Check-out
      { wch: 20 }, // Guia
      { wch: 16 }, // Tel Guia
      { wch: 16 }, // Checklist
      { wch: 16 }, // Status
      { wch: 28 }, // Alertas
      { wch: 30 }, // Observações
    ];

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 17 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Lista de Embarque");
    XLSX.writeFile(wb, `${filename}.xlsx`);

  } catch (xlsxError) {
    console.warn("[exportBoardingList] xlsx não disponível, usando CSV:", xlsxError);
    const headers = Object.keys(rows[0] ?? {});
    const escape = (v: string | number) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = "\uFEFF" + [
      `# Lista de Embarque — ${agencyName}`,
      `# ${new Date().toLocaleString("pt-BR")}`,
      "",
      headers.map(escape).join(","),
      ...rows.map((r) => headers.map((h) => escape(r[h as keyof typeof r] ?? "")).join(",")),
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * exportRoomingList.ts
 * Utilitário para exportação da Rooming List em Excel (.xlsx) ou CSV de fallback.
 *
 * Usa a biblioteca `xlsx` (SheetJS) que deve estar instalada via npm.
 * Em caso de falha, realiza exportação CSV como fallback.
 */

export interface RoomingExportRoom {
  room_number: string;
  room_type: string;
  hotel_name?: string | null;
  checkin_date?: string | null;
  checkout_date?: string | null;
  notes?: string | null;
  is_confirmed?: boolean;
  passengers?: Array<{ name: string; passenger_id?: string }>;
}

export interface RoomingExportOptions {
  /** Nome do arquivo sem extensão */
  filename?: string;
  /** Título do grupo/excursão */
  tourTitle?: string;
  /** Data de saída da excursão */
  departureDate?: string | null;
}

/**
 * Mapas de labels internos → legíveis para humanos
 */
const ROOM_TYPE_LABEL: Record<string, string> = {
  single: "Single (1 pax)",
  double: "Double (2 pax)",
  triple: "Triple (3 pax)",
  quadruple: "Quádruplo (4 pax)",
  suite: "Suite",
  family: "Familiar",
};

/**
 * Exporta a Rooming List completa para Excel (.xlsx).
 * Se a biblioteca `xlsx` não puder ser carregada, exporta CSV.
 */
export async function exportRoomingListXlsx(
  rooms: RoomingExportRoom[],
  options: RoomingExportOptions = {}
): Promise<void> {
  const {
    filename = "rooming-list",
    tourTitle = "Excursão",
    departureDate,
  } = options;

  // ── Preparar os dados ──────────────────────────────────────────────────────
  // Expandir: uma linha por quarto + uma linha por passageiro do quarto
  const rows: Record<string, string | number>[] = [];

  for (const room of rooms) {
    const paxList = room.passengers ?? [];
    const roomTypeLabel = ROOM_TYPE_LABEL[room.room_type] ?? room.room_type;
    const status = room.is_confirmed ? "Confirmado" : "Pendente";

    if (paxList.length === 0) {
      // Quarto vazio — linha única
      rows.push({
        "Quarto / Apto": room.room_number,
        "Tipo": roomTypeLabel,
        "Hotel / Pousada": room.hotel_name ?? "",
        "Check-in": room.checkin_date ?? "",
        "Check-out": room.checkout_date ?? "",
        "Passageiro": "(sem alocação)",
        "Observações": room.notes ?? "",
        "Status": status,
      });
    } else {
      paxList.forEach((pax, idx) => {
        rows.push({
          "Quarto / Apto": idx === 0 ? room.room_number : "",
          "Tipo": idx === 0 ? roomTypeLabel : "",
          "Hotel / Pousada": idx === 0 ? (room.hotel_name ?? "") : "",
          "Check-in": idx === 0 ? (room.checkin_date ?? "") : "",
          "Check-out": idx === 0 ? (room.checkout_date ?? "") : "",
          "Passageiro": pax.name,
          "Observações": idx === 0 ? (room.notes ?? "") : "",
          "Status": idx === 0 ? status : "",
        });
      });
    }
  }

  try {
    // ── Tentar usar xlsx (SheetJS) ────────────────────────────────────────────
    const XLSX = await import("xlsx");

    // Cabeçalho de metadados acima da tabela
    const headerRows = [
      ["Rooming List — " + tourTitle],
      [departureDate ? "Data de saída: " + new Date(departureDate).toLocaleDateString("pt-BR") : ""],
      ["Exportado em: " + new Date().toLocaleString("pt-BR")],
      [], // linha em branco
    ];

    const wb = XLSX.utils.book_new();

    // Criar worksheet com dados
    const ws = XLSX.utils.aoa_to_sheet(headerRows);

    // Adicionar as linhas de dados a partir da linha 5
    XLSX.utils.sheet_add_json(ws, rows, { origin: `A${headerRows.length + 1}` });

    // Aplicar larguras de colunas automáticas
    const colWidths = [
      { wch: 16 }, // Quarto
      { wch: 20 }, // Tipo
      { wch: 24 }, // Hotel
      { wch: 12 }, // Check-in
      { wch: 12 }, // Check-out
      { wch: 32 }, // Passageiro
      { wch: 28 }, // Observações
      { wch: 12 }, // Status
    ];
    ws["!cols"] = colWidths;

    // Mesclar células da linha de título (A1:H1)
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Rooming List");

    // Download do arquivo
    XLSX.writeFile(wb, `${filename}.xlsx`);

  } catch (xlsxError) {
    // ── Fallback: CSV ─────────────────────────────────────────────────────────
    console.warn("[exportRoomingList] xlsx não disponível, usando CSV como fallback:", xlsxError);
    exportRoomingListCsv(rows, filename, tourTitle, departureDate);
  }
}

/**
 * Exportação CSV de fallback — funciona sem dependências externas.
 */
function exportRoomingListCsv(
  rows: Record<string, string | number>[],
  filename: string,
  tourTitle: string,
  departureDate?: string | null
): void {
  if (rows.length === 0) {
    console.warn("[exportRoomingList] Nenhum dado para exportar.");
    return;
  }

  const headers = Object.keys(rows[0]);
  const escapeCsv = (val: string | number): string => {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [
    `# Rooming List — ${tourTitle}`,
    departureDate ? `# Saída: ${new Date(departureDate).toLocaleDateString("pt-BR")}` : "",
    `# Exportado: ${new Date().toLocaleString("pt-BR")}`,
    "",
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h] ?? "")).join(",")),
  ].filter((line, i) => i !== 1 || !!departureDate);

  const csvContent = "\uFEFF" + lines.join("\r\n"); // BOM para Excel reconhecer UTF-8
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta a Rooming List completa para Word (.doc) contendo uma tabela formatada.
 */
export async function exportRoomingListDocx(
  rooms: RoomingExportRoom[],
  options: RoomingExportOptions = {}
): Promise<void> {
  const {
    filename = "rooming-list",
    tourTitle = "Excursão",
    departureDate,
  } = options;

  const dateStr = departureDate
    ? new Date(departureDate).toLocaleDateString("pt-BR")
    : "Não informada";

  let html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>Rooming List</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body {
          font-family: 'Arial', sans-serif;
          font-size: 11pt;
          color: #333333;
        }
        h1 {
          font-size: 18pt;
          font-weight: bold;
          color: #0f172a;
          margin-bottom: 5px;
        }
        .meta {
          font-size: 9pt;
          color: #64748b;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: bold;
          text-align: left;
          padding: 8px;
          border: 1px solid #cbd5e1;
        }
        td {
          padding: 8px;
          border: 1px solid #cbd5e1;
          vertical-align: top;
        }
        .room-row {
          background-color: #f8fafc;
          font-weight: bold;
        }
        .pax-name {
          padding-left: 15px;
        }
      </style>
    </head>
    <body>
      <h1>Rooming List — ${tourTitle}</h1>
      <div class="meta">
        <strong>Data de saída:</strong> ${dateStr} <br/>
        <strong>Exportado em:</strong> ${new Date().toLocaleString("pt-BR")}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 15%;">Quarto / Apto</th>
            <th style="width: 20%;">Tipo</th>
            <th style="width: 25%;">Hotel / Pousada</th>
            <th style="width: 15%;">Check-in / Check-out</th>
            <th style="width: 25%;">Passageiros</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const room of rooms) {
    const roomTypeLabel = ROOM_TYPE_LABEL[room.room_type] || room.room_type;
    const paxList = room.passengers || [];
    const checkinStr = room.checkin_date ? new Date(room.checkin_date).toLocaleDateString("pt-BR") : "—";
    const checkoutStr = room.checkout_date ? new Date(room.checkout_date).toLocaleDateString("pt-BR") : "—";

    html += `
      <tr class="room-row">
        <td>Quarto ${room.room_number}</td>
        <td>${roomTypeLabel}</td>
        <td>${room.hotel_name || "—"}</td>
        <td>${checkinStr} até ${checkoutStr}</td>
        <td>${paxList.length} passageiro(s)</td>
      </tr>
    `;

    if (paxList.length > 0) {
      for (const pax of paxList) {
        html += `
          <tr>
            <td colspan="4" style="color: #64748b; font-size: 10pt; text-align: right; padding-right: 20px;">Passageiro:</td>
            <td class="pax-name"><strong>${pax.name}</strong></td>
          </tr>
        `;
      }
    } else {
      html += `
        <tr>
          <td colspan="4"></td>
          <td style="color: #94a3b8; font-style: italic; padding-left: 15px;">Sem passageiros alocados</td>
        </tr>
      `;
    }
  }

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const docBlob = new Blob([html], { type: "application/msword" });
  const docUrl = URL.createObjectURL(docBlob);
  const docLink = document.createElement("a");
  docLink.href = docUrl;
  docLink.download = `${filename}.doc`;
  document.body.appendChild(docLink);
  docLink.click();
  document.body.removeChild(docLink);
  URL.revokeObjectURL(docUrl);
}
