import QRCode from 'qrcode';

export async function generateQRCode(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    return '';
  }

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return dataUrl;
  } catch (error) {
    console.warn('Failed to generate QR code:', error);
    return '';
  }
}