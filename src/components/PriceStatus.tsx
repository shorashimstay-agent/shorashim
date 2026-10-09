import { useEffect, useState } from 'react';
import { loadLivePrices, usePrices } from '../lib/prices';
export default function PriceStatus() {
  const prices = usePrices();
  const [settled, setSettled] = useState(false);
  useEffect(() => { let live = true; void loadLivePrices().then(() => { if (live) setSettled(true); }); return () => { live = false; }; }, []);
  if (prices) return null;
  return <div className="price-status" role="status">
    <p>{settled ? 'לא ניתן להציג מחיר כרגע. אפשר להמשיך ולבקש הצעה מהמארחים.' : 'טוענים את המחירים העדכניים…'}</p>
  </div>;
}
