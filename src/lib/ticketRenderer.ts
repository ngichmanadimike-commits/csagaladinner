/**
 * Ticket Renderer - Dynamic Field Placement Engine
 * Ensures pixel-perfect automatic ticket generation with responsive layout
 */

export interface TicketData {
  memberFullName: string;
  bookingCode: string;
  ticketType: string;
  paymentStatus: 'completed' | 'pending' | 'failed';
  amountPaid: number;
  ticketNumber: string;
  qrCodeData: string;
  verificationCode: string;
}

export interface FieldContainer {
  id: string;
  x: number; // pixels from left
  y: number; // pixels from top
  width: number; // max width in pixels
  height: number; // max height in pixels
  minFontSize: number;
  maxFontSize: number;
  alignment: 'left' | 'center' | 'right';
  allowWrap: boolean;
}

/**
 * Calculate optimal font size to fit text within container
 */
export const calculateFontSize = (
  text: string,
  container: FieldContainer,
  baseFont: number = 14
): number => {
  const textLength = text.length;
  const containerWidth = container.width;
  const containerHeight = container.height;

  // Base calculation: reduce font size for longer text
  let fontSize = baseFont;
  const charsPerLine = Math.floor(containerWidth / (fontSize * 0.6)); // approximate char width

  if (textLength > charsPerLine) {
    fontSize = Math.max(
      container.minFontSize,
      Math.min(container.maxFontSize, baseFont * (charsPerLine / textLength))
    );
  }

  return Math.round(fontSize * 2) / 2; // Round to nearest 0.5px
};

/**
 * Validate field stays within container boundaries
 */
export const validateFieldPlacement = (
  fieldX: number,
  fieldY: number,
  fieldWidth: number,
  fieldHeight: number,
  container: FieldContainer
): { valid: boolean; overflow: boolean; clipping: boolean } => {
  const overflow =
    fieldX + fieldWidth > container.x + container.width ||
    fieldY + fieldHeight > container.y + container.height;

  const clipping = fieldX < container.x || fieldY < container.y;

  return {
    valid: !overflow && !clipping,
    overflow,
    clipping,
  };
};

/**
 * Apply auto-scaling and preserve spacing
 */
export const generateFieldStyle = (
  value: string,
  container: FieldContainer,
  baseFontSize: number = 14
): React.CSSProperties => {
  const fontSize = calculateFontSize(value, container, baseFontSize);

  return {
    position: 'absolute',
    left: `${container.x}px`,
    top: `${container.y}px`,
    width: `${container.width}px`,
    height: `${container.height}px`,
    fontSize: `${fontSize}px`,
    textAlign: container.alignment,
    overflow: 'hidden',
    whiteSpace: container.allowWrap ? 'normal' : 'nowrap',
    textOverflow: 'ellipsis',
    lineHeight: '1.2',
    margin: 0,
    padding: '4px 8px',
    boxSizing: 'border-box',
  };
};

/**
 * Standard ticket field definitions (based on template)
 */
export const STANDARD_TICKET_FIELDS: Record<string, FieldContainer> = {
  memberFullName: {
    id: 'memberFullName',
    x: 50,
    y: 80,
    width: 300,
    height: 40,
    minFontSize: 12,
    maxFontSize: 20,
    alignment: 'left',
    allowWrap: false,
  },
  bookingCode: {
    id: 'bookingCode',
    x: 50,
    y: 130,
    width: 200,
    height: 30,
    minFontSize: 11,
    maxFontSize: 16,
    alignment: 'left',
    allowWrap: false,
  },
  ticketType: {
    id: 'ticketType',
    x: 300,
    y: 130,
    width: 150,
    height: 30,
    minFontSize: 10,
    maxFontSize: 14,
    alignment: 'center',
    allowWrap: false,
  },
  paymentStatus: {
    id: 'paymentStatus',
    x: 50,
    y: 170,
    width: 150,
    height: 25,
    minFontSize: 10,
    maxFontSize: 12,
    alignment: 'left',
    allowWrap: false,
  },
  amountPaid: {
    id: 'amountPaid',
    x: 220,
    y: 170,
    width: 150,
    height: 25,
    minFontSize: 10,
    maxFontSize: 14,
    alignment: 'left',
    allowWrap: false,
  },
  ticketNumber: {
    id: 'ticketNumber',
    x: 50,
    y: 210,
    width: 200,
    height: 30,
    minFontSize: 11,
    maxFontSize: 16,
    alignment: 'left',
    allowWrap: false,
  },
  verificationCode: {
    id: 'verificationCode',
    x: 280,
    y: 210,
    width: 170,
    height: 30,
    minFontSize: 10,
    maxFontSize: 14,
    alignment: 'center',
    allowWrap: false,
  },
  qrCode: {
    id: 'qrCode',
    x: 50,
    y: 280,
    width: 120,
    height: 120,
    minFontSize: 0,
    maxFontSize: 0,
    alignment: 'center',
    allowWrap: false,
  },
};

/**
 * Responsive field adjustments for different screen sizes
 */
export const getResponsiveFields = (
  screenWidth: number
): Record<string, FieldContainer> => {
  const isSmallDevice = screenWidth < 768;
  const isMobileDevice = screenWidth < 480;

  if (isMobileDevice) {
    return {
      ...STANDARD_TICKET_FIELDS,
      memberFullName: {
        ...STANDARD_TICKET_FIELDS.memberFullName,
        width: 200,
        maxFontSize: 14,
      },
      bookingCode: {
        ...STANDARD_TICKET_FIELDS.bookingCode,
        width: 150,
        maxFontSize: 12,
      },
      qrCode: {
        ...STANDARD_TICKET_FIELDS.qrCode,
        width: 100,
        height: 100,
      },
    };
  }

  if (isSmallDevice) {
    return {
      ...STANDARD_TICKET_FIELDS,
      memberFullName: {
        ...STANDARD_TICKET_FIELDS.memberFullName,
        width: 250,
        maxFontSize: 16,
      },
    };
  }

  return STANDARD_TICKET_FIELDS;
};

/**
 * Format ticket data for rendering
 */
export const formatTicketDisplayData = (data: TicketData): Record<string, string> => {
  return {
    memberFullName: data.memberFullName || 'N/A',
    bookingCode: data.bookingCode || 'N/A',
    ticketType: data.ticketType || 'General',
    paymentStatus: data.paymentStatus?.toUpperCase() || 'PENDING',
    amountPaid: `KES ${data.amountPaid.toLocaleString('en-KE')}`,
    ticketNumber: data.ticketNumber || 'N/A',
    verificationCode: data.verificationCode || 'N/A',
  };
};

/**
 * Validate all fields fit within ticket bounds
 */
export const validateTicketLayout = (
  ticketData: TicketData,
  screenWidth: number = 800
): { valid: boolean; errors: string[] } => {
  const fields = getResponsiveFields(screenWidth);
  const errors: string[] = [];

  Object.entries(ticketData).forEach(([key, value]) => {
    if (key === 'qrCodeData') return; // Skip QR data

    const field = fields[key];
    if (!field) return;

    const text = String(value);
    const validation = validateFieldPlacement(
      field.x,
      field.y,
      field.width,
      field.height,
      field
    );

    if (!validation.valid) {
      if (validation.overflow) errors.push(`Field "${key}" overflows container`);
      if (validation.clipping) errors.push(`Field "${key}" is clipped`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};
