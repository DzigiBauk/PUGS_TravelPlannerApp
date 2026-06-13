import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeProps {
  value: string;
}

export default function QrCode({ value }: QrCodeProps) {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(value, {
      width: 180,
      margin: 1,
      color: { dark: '#172033', light: '#ffffff' },
    }).then(url => {
      if (!cancelled) setImageUrl(url);
    }).catch(() => {
      if (!cancelled) setImageUrl('');
    });

    return () => {
      cancelled = true;
    };
  }, [value]);

  return imageUrl ? <img className="share-qr" src={imageUrl} alt="QR code for the shared plan" /> : null;
}
