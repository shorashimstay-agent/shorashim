import { CANCELLATION_POLICY } from '../data/booking';
export default function PolicyDetails() {
  return <details className="policy-details"><summary>תשלום, ביטולים ואישור הבקשה</summary><p className="mt-3 leading-relaxed">{CANCELLATION_POLICY}</p></details>;
}
