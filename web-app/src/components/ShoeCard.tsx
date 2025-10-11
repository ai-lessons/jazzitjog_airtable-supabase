import { Badge, UseBadge, SurfaceBadge } from './Badge';

type ShoeCardProps = {
  id: string;
  brand_name: string | null;
  model: string | null;
  primary_use: string | null;
  surface_type: string | null;
  heel_height: number | null;
  forefoot_height: number | null;
  drop: number | null;
  weight: number | null;
  price: number | null;
  carbon_plate: boolean | null;
  waterproof: boolean | null;
  cushioning_type: string | null;
  foot_width: string | null;
  upper_breathability: string | null;
  source_link: string | null;
};

export function ShoeCard(props: ShoeCardProps) {
  const {
    brand_name,
    model,
    primary_use,
    surface_type,
    drop,
    weight,
    price,
    carbon_plate,
    waterproof,
    cushioning_type,
    foot_width,
    upper_breathability,
    source_link,
  } = props;

  return (
    <div className="border rounded-2xl p-4 hover:shadow-lg transition-shadow bg-white">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {brand_name} {model}
        </h3>
        <div className="flex items-center gap-3 text-sm">
          {primary_use && <UseBadge use={primary_use} />}
          {surface_type && <SurfaceBadge surface={surface_type} />}
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Price</div>
          <div className="font-semibold text-gray-900">
            {typeof price === 'number' ? `$${price}` : '—'}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Weight</div>
          <div className="font-semibold text-gray-900 font-mono">
            {weight ? `${weight}g` : '—'}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Drop</div>
          <div className="font-semibold text-gray-900 font-mono">
            {drop !== null ? `${drop}mm` : '—'}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="flex flex-wrap gap-1 mb-3 min-h-[28px]">
        {carbon_plate && <Badge variant="carbon">⚡ Carbon</Badge>}
        {waterproof && <Badge variant="waterproof">💧 WR</Badge>}
        {cushioning_type && <Badge variant="cushioning" label="Cushion">{cushioning_type}</Badge>}
        {foot_width && <Badge variant="width" label="Width">{foot_width}</Badge>}
        {upper_breathability && <Badge variant="breathability" label="Breath">{upper_breathability}</Badge>}
      </div>

      {/* Footer */}
      {source_link && (
        <a
          href={source_link}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
        >
          View Details →
        </a>
      )}
    </div>
  );
}
