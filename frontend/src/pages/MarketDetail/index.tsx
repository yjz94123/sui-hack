import React from 'react';
import { useParams } from 'react-router-dom';

const MarketDetail: React.FC = () => {
  const { marketId } = useParams<{ marketId: string }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Market Detail</h1>
      <p>Viewing market ID: {marketId}</p>
    </div>
  );
};

export default MarketDetail;
