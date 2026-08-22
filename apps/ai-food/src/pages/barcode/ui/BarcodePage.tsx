import { Navigate } from 'react-router-dom';

/** Legacy route — unified camera lives at `/scan`. */
export function BarcodePage() {
  return <Navigate to="/scan?mode=barcode&barcodeOnly=1" replace />;
}
