import { Shipment } from '../types';

export function parseSpreadsheetText(text: string): {
  shipmentNumber: string;
  clientName: string;
  carrierName: string;
  volumes: number;
}[] {
  const result: {
    shipmentNumber: string;
    clientName: string;
    carrierName: string;
    volumes: number;
  }[] = [];

  if (!text || text.trim() === '') return result;

  // Split by line breaks
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return result;

  // Let's identify the header line or try to find columns
  // First, look for a header in the first few lines
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const trialLine = lines[i].trim();
    if (!trialLine) continue;

    // Split candidate columns by tab, semicolon, or comma
    let cols: string[] = [];
    if (trialLine.includes('\t')) {
      cols = trialLine.split('\t');
    } else if (trialLine.includes(';')) {
      cols = trialLine.split(';');
    } else if (trialLine.includes(',')) {
      cols = trialLine.split(',');
    } else {
      cols = [trialLine];
    }

    cols = cols.map(c => c.trim().toLowerCase());

    // Look for indicative headers
    const hasIndicative = cols.some(c => {
      const norm = c
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
      return (
        (norm.includes('embarque') && !norm.includes('valor') && !norm.includes('peso') && !norm.includes('volume')) ||
        norm.includes('shipment') ||
        norm.includes('cliente') ||
        norm.includes('client') ||
        norm.includes('transportadora') ||
        norm.includes('carrier') ||
        (norm.includes('volume') && !norm.includes('valor') && !norm.includes('peso')) ||
        norm.includes('qtd')
      );
    });

    if (hasIndicative) {
      headerIndex = i;
      headers = cols;
      break;
    }
  }

  // Column index maps
  let idxShipment = -1;
  let idxClient = -1;
  let idxCarrier = -1;
  let idxVolumes = -1;

  if (headerIndex !== -1) {
    headers.forEach((h, colIdx) => {
      const norm = h
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      const isCarrier = norm.includes('transportadora') || norm.includes('transp') || norm.includes('carrier') || norm.includes('motorista');
      const isClient = norm.includes('cliente') || norm.includes('client') || norm.includes('destinat') || norm.includes('nome') || norm.includes('razao');
      const isVolume = (norm.includes('volume') || norm.includes('vol') || norm.includes('qtd') || norm.includes('quant') || norm.includes('pecas') || norm.includes('unid')) 
         && !norm.includes('valor') && !norm.includes('peso') && !norm.includes('preco') && !norm.includes('palet') && !norm.includes('pallet') && !norm.includes('plt');
      const isShipment = (norm.includes('embarque') || norm.includes('shipment') || norm.includes('cod') || norm.includes('nº') || norm.includes('nro') || norm === 'emb')
         && !norm.includes('valor') && !norm.includes('peso') && !norm.includes('volume') && !norm.includes('ped') && !norm.includes('preco');

      if (isShipment) {
        idxShipment = colIdx;
      } else if (isClient) {
        idxClient = colIdx;
      } else if (isCarrier) {
        idxCarrier = colIdx;
      } else if (isVolume) {
        const existingHeader = idxVolumes !== -1 ? headers[idxVolumes]
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim() : '';
        const existingIsExact = existingHeader === 'volume' || existingHeader === 'volumes';
        if (!existingIsExact) {
          idxVolumes = colIdx;
        }
      }
    });
  }

  // If we couldn't find a structured header, fallback to guessing indices:
  // Col 0: Shipment Number, Col 1: Client Name, Col 2: Carrier, Col 3: Volumes
  const startRow = headerIndex !== -1 ? headerIndex + 1 : 0;

  for (let r = startRow; r < lines.length; r++) {
    const rowText = lines[r].trim();
    if (!rowText) continue;

    let cols: string[] = [];
    if (rowText.includes('\t')) {
      cols = rowText.split('\t');
    } else if (rowText.includes(';')) {
      cols = rowText.split(';');
    } else if (rowText.includes(',')) {
      cols = rowText.split(',');
    } else {
      // Just plain space or single column
      cols = [rowText];
    }

    cols = cols.map(c => c.trim());

    // We must have at least a shipment number to be a valid row
    let shipmentNumber = '';
    let clientName = 'Cliente Geral';
    let carrierName = 'Transportadora Geral';
    let volumes = 1;

    if (headerIndex !== -1) {
      if (idxShipment !== -1 && cols[idxShipment]) shipmentNumber = cols[idxShipment];
      if (idxClient !== -1 && cols[idxClient]) clientName = cols[idxClient];
      if (idxCarrier !== -1 && cols[idxCarrier]) carrierName = cols[idxCarrier];
      if (idxVolumes !== -1 && cols[idxVolumes]) {
        const rawClean = cols[idxVolumes].trim().split(',')[0].split('.')[0].replace(/\s/g, '');
        const parsedV = parseInt(rawClean, 10);
        if (!isNaN(parsedV)) volumes = parsedV;
      }
    } else {
      // Freeform parsing fallback
      if (cols[0]) shipmentNumber = cols[0];
      if (cols[1]) clientName = cols[1];
      if (cols[2]) carrierName = cols[2];
      if (cols[3]) {
        const rawClean = cols[3].trim().split(',')[0].split('.')[0].replace(/\s/g, '');
        const parsedV = parseInt(rawClean, 10);
        if (!isNaN(parsedV)) volumes = parsedV;
      }
    }

    // Clean up shipmentNumber (sometimes contains quotes or spaces)
    shipmentNumber = shipmentNumber.replace(/['"]/g, '').trim();

    if (shipmentNumber) {
      result.push({
        shipmentNumber,
        clientName,
        carrierName,
        volumes: volumes || 1
      });
    }
  }

  // If still empty and we parsed commas or tabs but it single line, try parsing columns directly
  return result;
}

/**
 * Converts a 2D array of cells (e.g., read from an Excel spreadsheet)
 * into a tab-separated text string, allowing the main parseSpreadsheetText
 * function to process it identically.
 */
export function convert2DArrayToText(data: any[][]): string {
  if (!data || data.length === 0) return '';
  return data
    .map(row => 
      row
        .map(cell => {
          if (cell === null || cell === undefined) return '';
          // Remove potential nested line breaks inside strings to prevent row splitting
          return String(cell).replace(/\r?\n/g, ' ');
        })
        .join('\t')
    )
    .join('\n');
}

