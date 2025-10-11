'use client';

import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

type RangeSliderProps = {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
};

export function RangeSlider({
  label,
  unit,
  min,
  max,
  value,
  onChange,
}: RangeSliderProps) {
  const [a, b] = value;

  return (
    <div className="p-4 border rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">{label}</h3>
        <div className="text-sm text-gray-600">
          {unit === '$' ? `$${a} — $${b}` : `${a}${unit} – ${b}${unit}`}
        </div>
      </div>
      <div className="px-2">
        <Slider
          range
          min={min}
          max={max}
          value={value}
          onChange={(val) => {
            if (Array.isArray(val) && val.length === 2) {
              onChange([val[0], val[1]]);
            }
          }}
          styles={{
            track: { backgroundColor: '#000' },
            handle: {
              borderColor: '#000',
              backgroundColor: '#fff',
              opacity: 1,
            },
            rail: { backgroundColor: '#e5e7eb' },
          }}
        />
      </div>
    </div>
  );
}
